import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { computeRootHash } from "./hash.util";

/**
 * Jangkar integritas harian (PRD §6.1 level 3).
 *
 * Basis data append-only yang servernya dikendalikan operator TETAP bisa dimodifikasi
 * lewat SQL langsung. Karena itu root hash tiap batch dipublikasikan harian ke penyimpanan
 * pihak ketiga yang hanya bisa ditulis sekali — mengubah klaim dari "percayalah kepada kami"
 * menjadi "silakan periksa sendiri".
 *
 * ⚠️ `externalRef` masih null: publikasi ke penyimpanan write-once eksternal BELUM
 * terpasang. Tanpa itu, jangkar ini baru catatan internal dan klaim integritas belum
 * bisa dipertahankan pada pemeriksaan teknis. Kandidat: OpenTimestamps, S3 Object Lock,
 * atau layanan notaris hash. Blockchain TIDAK diperlukan (§11.2).
 */
@Injectable()
export class AnchorService {
  private readonly logger = new Logger(AnchorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Jalankan harian via cron. Idempoten: satu jangkar per (batch, tanggal). */
  async anchorAll(anchorDate = new Date()) {
    const day = new Date(anchorDate.toISOString().slice(0, 10));

    const batches = await this.prisma.batch.findMany({
      where: { timelineNodes: { some: {} } },
      select: { id: true },
    });

    let created = 0;
    let skipped = 0;

    for (const b of batches) {
      const exists = await this.prisma.hashAnchor.findFirst({
        where: { batchId: b.id, anchorDate: day },
        select: { id: true },
      });
      if (exists) {
        skipped++;
        continue;
      }

      const nodes = await this.prisma.timelineNode.findMany({
        where: { batchId: b.id },
        orderBy: { seq: "asc" },
        select: { nodeHash: true },
      });
      // Saat menjangkar, rantai diasumsikan masih utuh sehingga hash tersimpan == hash
      // hitung ulang. Verifikasi (TimelineService.verifyChain) MENGHITUNG ULANG dari isi,
      // jadi begitu ada manipulasi, root-nya menyimpang dari nilai yang dijangkar di sini.
      const rootHash = computeRootHash(nodes.map((n) => n.nodeHash));

      // HASH_ANCHORS append-only (trigger DB) — tidak ada upsert di sini.
      await this.prisma.hashAnchor.create({
        data: { batchId: b.id, anchorDate: day, rootHash, externalRef: null, publishedAt: null },
      });
      created++;
    }

    this.logger.log(`Jangkar ${day.toISOString().slice(0, 10)}: ${created} dibuat, ${skipped} dilewati`);
    return { anchorDate: day.toISOString().slice(0, 10), created, skipped };
  }

  /** Riwayat jangkar sebuah batch — dipakai pembeli/auditor untuk verifikasi mandiri. */
  async listForBatch(batchId: string) {
    const rows = await this.prisma.hashAnchor.findMany({
      where: { batchId },
      orderBy: { anchorDate: "desc" },
    });
    return rows.map((a) => ({
      anchorDate: a.anchorDate.toISOString().slice(0, 10),
      rootHash: a.rootHash,
      externalRef: a.externalRef,
      publishedAt: a.publishedAt?.toISOString() ?? null,
    }));
  }
}
