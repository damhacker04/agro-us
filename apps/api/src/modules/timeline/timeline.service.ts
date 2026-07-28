import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import exifr from "exifr";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AllocationService } from "../assurance/allocation.service";
import { computeNodeHash, computeRootHash, sha256, type NodeHashInput } from "./hash.util";
import type { CreateNodeDto } from "./timeline.dto";

/** Node yang menyertakan bukti nota input pembelian (FR-4.7). */
const ALLOWS_INPUT_RECEIPT = ["PEMUPUKAN", "PENGENDALIAN_HAMA"] as const;

/**
 * Batas kelonggaran jam perangkat. Cukup longgar untuk ponsel yang jamnya meleset
 * atau salah zona waktu, tapi jauh lebih pendek daripada umur tanam komoditas
 * mana pun — jadi tidak bisa dipakai memotong masa tanam.
 */
const DEVICE_CLOCK_SKEW_TOLERANCE_MS = 24 * 60 * 60 * 1000;

export interface UploadedPhoto {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class TimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly allocation: AllocationService,
  ) {}

  /**
   * Tambah node timeline — SATU-SATUNYA cara menulis (FR-4.1: INSERT ONLY).
   * Tidak ada update/delete di seluruh service ini; trigger DB menjadi jaring pengaman.
   */
  async appendNode(tenantId: string, batchId: string, dto: CreateNodeDto, photos: UploadedPhoto[]) {
    if (!photos.length) {
      throw new BadRequestException({
        code: "PHOTO_REQUIRED",
        message: "Minimal satu foto bukti. Ambil langsung dengan kamera.",
      });
    }

    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, product: { tenantId } },
      include: { product: { include: { commodity: true } }, landPlot: { select: { id: true } } },
    });
    if (!batch) throw new NotFoundException("Batch tidak ditemukan");

    if (batch.productionStatus === "HARVESTED" || batch.productionStatus === "FAILED") {
      throw new ConflictException({
        code: "BATCH_CLOSED",
        message: `Batch sudah ${batch.productionStatus === "HARVESTED" ? "dipanen" : "dinyatakan gagal"} — timeline ditutup.`,
      });
    }

    const deviceTs = new Date(dto.deviceTs);

    // `deviceTs` datang dari perangkat Tenant, jadi tidak boleh dipercaya sebagai
    // penanda waktu ke DEPAN. Tanpa pagar ini, pagar umur tanam di bawah bisa
    // dilewati begitu saja: tanam hari ini, lalu kirim PANEN bertanggal tiga bulan
    // ke depan — persis skenario "panen fiktif" yang mau dicegah.
    // Toleransi disediakan untuk jam ponsel yang meleset/salah zona waktu.
    if (deviceTs.getTime() > Date.now() + DEVICE_CLOCK_SKEW_TOLERANCE_MS) {
      throw new BadRequestException({
        code: "DEVICE_TS_IN_FUTURE",
        message: "Waktu di perangkat Anda lebih maju dari waktu server. Perbaiki jam ponsel lalu coba lagi.",
      });
    }

    await this.validateActivityRules(batch, dto, deviceTs);

    // FR-4.3 — GPS wajib di dalam poligon lahan, kecuali ada alasan tertulis.
    const inside = await this.isInsidePlot(batch.landPlot.id, dto.lng, dto.lat);
    if (!inside && !dto.outsidePolygonReason) {
      throw new BadRequestException({
        code: "GPS_OUTSIDE_POLYGON",
        message:
          "Lokasi Anda di luar batas lahan yang terdaftar. Tulis alasannya — alasan ini akan ditampilkan kepada pembeli.",
      });
    }

    // Node "Ralat" wajib menunjuk node yang benar-benar ada di batch ini (FR-4.2).
    if (dto.ralatOfId) {
      const target = await this.prisma.timelineNode.findFirst({
        where: { id: dto.ralatOfId, batchId },
        select: { id: true },
      });
      if (!target) {
        throw new BadRequestException({ code: "RALAT_TARGET_INVALID", message: "Node yang diralat tidak ditemukan." });
      }
    }

    // Simpan foto DULU: hash-nya ikut dihitung ke dalam nodeHash supaya foto
    // tidak bisa ditukar belakangan tanpa memutus rantai.
    const stored = await Promise.all(
      photos.map(async (p) => {
        // EXIF diekstrak dari buffer ASLI, sebelum kompresi apa pun (PRD §6.4).
        const exif = await this.extractExif(p.buffer);
        const obj = await this.storage.put(p.buffer, p.originalname, p.mimetype);
        return { ...obj, exif };
      }),
    );

    const last = await this.prisma.timelineNode.findFirst({
      where: { batchId },
      orderBy: { seq: "desc" },
      select: { seq: true, nodeHash: true },
    });
    const seq = (last?.seq ?? 0) + 1;
    const prevHash = last?.nodeHash ?? null;

    const hashInput: NodeHashInput = {
      batchId,
      seq,
      activityType: dto.activityType,
      description: dto.description,
      lng: dto.lng,
      lat: dto.lat,
      deviceTs,
      photoHashes: stored.map((s) => s.sha256),
      ralatOfId: dto.ralatOfId ?? null,
    };
    const nodeHash = computeNodeHash(hashInput, prevHash);

    const nodeId = await this.prisma.$transaction(async (tx) => {
      // Kolom geometry → raw SQL.
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO timeline_nodes
          (batch_id, seq, activity_type, description, gps_point, device_ts, prev_hash, node_hash, ralat_of, outside_polygon_reason)
        VALUES (
          ${batchId}::uuid, ${seq}, ${dto.activityType}::"TimelineActivity", ${dto.description},
          ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326),
          ${deviceTs}, ${prevHash}, ${nodeHash},
          ${dto.ralatOfId ?? null}::uuid, ${inside ? null : dto.outsidePolygonReason}
        )
        RETURNING id::text
      `;
      const id = rows[0]!.id;

      for (const s of stored) {
        await tx.nodePhoto.create({
          data: {
            nodeId: id,
            objectUrl: s.url,
            photoType: dto.photoType ?? "KEGIATAN",
            // Sumber foto ditandai apa adanya: galeri menurunkan kepercayaan node (§5.4.1).
            captureSource: dto.captureSource,
            exifLat: s.exif.lat ?? null,
            exifLng: s.exif.lng ?? null,
            exifTs: s.exif.ts ?? null,
            sha256: s.sha256,
          },
        });
      }

      // Efek samping status batch — hanya untuk node penutup.
      if (dto.activityType === "PANEN") {
        // Hasil panen tidak boleh melebihi yang dijanjikan — CHECK di DB juga menjaganya.
        const fulfilled = Math.min(dto.fulfilledBox ?? batch.quotaBoxSold, batch.quotaBoxSold);
        await tx.batch.update({
          where: { id: batchId },
          data: { productionStatus: "HARVESTED", quotaBoxFulfilled: fulfilled },
        });
        // FR-7.9 — bagi hasil panen ke pesanan secara FIFO menurut waktu bayar.
        // Tanpa langkah ini, panen sebagian hanya tercatat di batch dan pesanan
        // pembeli tidak pernah tahu porsinya berkurang.
        await this.allocation.apply(tx, batchId, fulfilled);
      } else if (dto.activityType === "GAGAL_PANEN") {
        await tx.batch.update({
          where: { id: batchId },
          // CHECK di DB mewajibkan FAILED ⟹ fulfilled = 0.
          data: { productionStatus: "FAILED", quotaBoxFulfilled: 0 },
        });
        // Seluruh pesanan kehilangan porsinya → semuanya masuk Harvest Assurance.
        await this.allocation.apply(tx, batchId, 0);
      } else if (dto.activityType === "PENANAMAN" && batch.productionStatus === "PLANNING") {
        await tx.batch.update({
          where: { id: batchId },
          data: { productionStatus: "GROWING", claimedPlantDate: deviceTs },
        });
      }

      return id;
    });

    // FR-7.12 — penalti kuota dihitung ulang setelah siklus ditutup. Sengaja di luar
    // transaksi: kegagalan menghitung penalti tidak boleh membatalkan pencatatan panen.
    if (dto.activityType === "PANEN" || dto.activityType === "GAGAL_PANEN") {
      await this.allocation.applyShortfallPenalty(batch.product.tenantId);
    }

    return this.getNode(batchId, nodeId);
  }

  /** Aturan urutan & kewajaran aktivitas. */
  private async validateActivityRules(
    batch: { id: string; product: { commodity: { growingDaysMin: number; name: string } } },
    dto: CreateNodeDto,
    deviceTs: Date,
  ) {
    if (dto.activityType !== "PANEN") return;

    // FR-4.8 — panen wajib didahului minimal satu node penanaman.
    const planting = await this.prisma.timelineNode.findFirst({
      where: { batchId: batch.id, activityType: "PENANAMAN" },
      orderBy: { deviceTs: "asc" },
      select: { deviceTs: true },
    });
    if (!planting) {
      throw new BadRequestException({
        code: "HARVEST_WITHOUT_PLANTING",
        message: "Belum ada catatan penanaman. Catat penanaman dulu sebelum menandai panen.",
      });
    }

    const days = Math.floor((deviceTs.getTime() - planting.deviceTs.getTime()) / 86_400_000);
    const minDays = batch.product.commodity.growingDaysMin;
    if (days < minDays) {
      // Rentang tak masuk akal → tolak. Ini pagar terhadap "panen" fiktif yang
      // dipakai untuk mencairkan escrow lebih cepat.
      throw new BadRequestException({
        code: "HARVEST_TOO_EARLY",
        message: `${batch.product.commodity.name} umumnya butuh minimal ${minDays} hari sejak tanam. Baru ${days} hari.`,
        minDays,
        actualDays: days,
      });
    }
  }

  private async isInsidePlot(landPlotId: string, lng: number, lat: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ inside: boolean }>>`
      SELECT ST_Contains(polygon, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)) AS inside
      FROM land_plots WHERE id = ${landPlotId}::uuid
    `;
    return rows[0]?.inside ?? false;
  }

  /**
   * EXIF dibaca dari buffer ASLI, sebelum kompresi apa pun (PRD §6.4).
   * Gagal baca bukan error fatal — foto tanpa EXIF tetap diterima tapi tercatat kosong,
   * dan itu justru informasi: bukti tanpa metadata lebih lemah.
   *
   * CATATAN: JANGAN pakai opsi `pick` bersama `gps` — `pick` menyaring keluaran sehingga
   * `latitude`/`longitude` hasil hitung ikut terbuang (bug ini sempat lolos ke uji pertama).
   */
  private async extractExif(buffer: Buffer): Promise<{ lat?: number; lng?: number; ts?: Date }> {
    try {
      const d = await exifr.parse(buffer, { gps: true, exif: true });
      if (!d) return {};
      const ts = d.DateTimeOriginal ?? d.CreateDate;
      return {
        lat: typeof d.latitude === "number" ? d.latitude : undefined,
        lng: typeof d.longitude === "number" ? d.longitude : undefined,
        ts: ts instanceof Date ? ts : undefined,
      };
    } catch {
      return {};
    }
  }

  // ---------------- baca ----------------

  async listNodes(batchId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        seq: number;
        activity_type: string;
        description: string;
        lng: number;
        lat: number;
        device_ts: Date;
        server_ts: Date;
        prev_hash: string | null;
        node_hash: string;
        ralat_of: string | null;
        outside_polygon_reason: string | null;
      }>
    >`
      SELECT id::text, seq, activity_type::text, description,
             ST_X(gps_point) AS lng, ST_Y(gps_point) AS lat,
             device_ts, server_ts, prev_hash, node_hash,
             ralat_of::text, outside_polygon_reason
      FROM timeline_nodes WHERE batch_id = ${batchId}::uuid ORDER BY seq ASC
    `;
    if (!rows.length) return [];

    const photos = await this.prisma.nodePhoto.findMany({
      where: { nodeId: { in: rows.map((r) => r.id) } },
    });
    const byNode = new Map<string, typeof photos>();
    for (const p of photos) {
      byNode.set(p.nodeId, [...(byNode.get(p.nodeId) ?? []), p]);
    }

    return rows.map((r) => ({
      id: r.id,
      seq: r.seq,
      activityType: r.activity_type,
      description: r.description,
      gps: { lat: r.lat, lng: r.lng },
      deviceTs: r.device_ts.toISOString(),
      serverTs: r.server_ts.toISOString(),
      prevHash: r.prev_hash,
      nodeHash: r.node_hash,
      ralatOfId: r.ralat_of,
      /** Ditampilkan apa adanya ke pembeli — FR-4.3. */
      outsidePolygonReason: r.outside_polygon_reason,
      photos: (byNode.get(r.id) ?? []).map((p) => ({
        url: p.objectUrl,
        photoType: p.photoType,
        captureSource: p.captureSource,
        exif: { lat: p.exifLat ? Number(p.exifLat) : null, lng: p.exifLng ? Number(p.exifLng) : null, ts: p.exifTs?.toISOString() ?? null },
        sha256: p.sha256,
      })),
    })) as Array<Record<string, unknown> & { activityType: string }>;
  }

  private async getNode(batchId: string, nodeId: string) {
    const all = await this.listNodes(batchId);
    return all.find((n) => n.id === nodeId);
  }

  /**
   * Verifikasi ulang seluruh rantai (§6.1 "silakan periksa sendiri").
   * Menghitung ulang tiap nodeHash dari isinya dan membandingkan dengan yang tersimpan.
   */
  async verifyChain(batchId: string) {
    const nodes = await this.listNodes(batchId);
    const photoRows = await this.prisma.nodePhoto.findMany({
      where: { node: { batchId } },
      select: { nodeId: true, sha256: true, id: true },
      orderBy: { id: "asc" },
    });
    const photosByNode = new Map<string, string[]>();
    for (const p of photoRows) {
      photosByNode.set(p.nodeId, [...(photosByNode.get(p.nodeId) ?? []), p.sha256]);
    }

    let prevHash: string | null = null;
    const broken: Array<{ seq: number; reason: string }> = [];
    /**
     * Kumpulkan hash HASIL HITUNG ULANG, bukan yang tersimpan.
     *
     * Ini krusial: kalau root dihitung dari kolom `node_hash`, penyerang yang mengubah
     * ISI baris tapi membiarkan kolom hash akan menghasilkan root yang SAMA — jangkar
     * eksternal jadi terlihat cocok padahal data sudah dipalsukan. Dengan menghitung
     * ulang, root ikut bergeser dan ketidakcocokan terhadap jangkar menjadi bukti.
     */
    const recomputedHashes: string[] = [];

    for (const n of nodes as Array<any>) {
      const recomputed = computeNodeHash(
        {
          batchId,
          seq: n.seq,
          activityType: n.activityType,
          description: n.description,
          lng: n.gps.lng,
          lat: n.gps.lat,
          deviceTs: new Date(n.deviceTs),
          photoHashes: photosByNode.get(n.id) ?? [],
          ralatOfId: n.ralatOfId,
        },
        prevHash,
      );
      recomputedHashes.push(recomputed);

      if (n.prevHash !== prevHash) broken.push({ seq: n.seq, reason: "prevHash tidak menyambung ke node sebelumnya" });
      if (recomputed !== n.nodeHash) broken.push({ seq: n.seq, reason: "isi node tidak cocok dengan hash tersimpan" });
      // Rantai diteruskan memakai hash hitung ulang agar satu perubahan merusak
      // seluruh node sesudahnya — persis sifat yang dijanjikan §6.1.
      prevHash = recomputed;
    }

    const rootHash = computeRootHash(recomputedHashes);

    // Bandingkan dengan jangkar terakhir yang sudah dipublikasikan.
    const anchor = await this.prisma.hashAnchor.findFirst({
      where: { batchId },
      orderBy: { anchorDate: "desc" },
      select: { anchorDate: true, rootHash: true, externalRef: true },
    });

    return {
      batchId,
      nodeCount: nodes.length,
      intact: broken.length === 0,
      rootHash,
      broken,
      anchor: anchor
        ? {
            anchorDate: anchor.anchorDate.toISOString().slice(0, 10),
            rootHash: anchor.rootHash,
            matchesAnchor: anchor.rootHash === rootHash,
            externalRef: anchor.externalRef,
          }
        : null,
    };
  }

  /** Foto nota input hanya relevan untuk pemupukan & pengendalian hama (FR-4.7). */
  static allowsInputReceipt(activity: string) {
    return (ALLOWS_INPUT_RECEIPT as readonly string[]).includes(activity);
  }

  static hashOf = sha256;
}
