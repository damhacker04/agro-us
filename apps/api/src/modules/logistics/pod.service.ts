import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  CLAIM_WINDOW_FALLBACK_MS,
  CLAIM_WINDOW_MS,
  POD_TIMEOUT_MS,
  SIGNAL_LOST_AFTER_MS,
  type ConfirmReceiptResponse,
  type TrackingSnapshot,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { TrackingGateway } from "./tracking.gateway";

/**
 * Dual-Signal Proof of Delivery (§5.6.4).
 *
 *   Sinyal-1 (geofence)          → membuktikan kargo tiba di lokasi
 *   Sinyal-2 (konfirmasi pembeli) → membuktikan SIAPA yang menerima, kapan, kondisi apa
 *
 * Beban konfirmasi sengaja ditaruh di pembeli, bukan kurir: pembelilah yang punya
 * insentif, karena konfirmasi itu yang membuka jendela klaim mutunya.
 */
@Injectable()
export class PodService {
  private readonly log = new Logger(PodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrackingGateway,
  ) {}

  /** Sinyal-2 — konfirmasi satu ketukan + foto kondisi barang. */
  async confirmReceipt(userId: string, shipmentId: string, photoUrl: string): Promise<ConfirmReceiptResponse> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, order: { buyer: { userId } } },
      select: { id: true, status: true },
    });
    if (!shipment) throw new NotFoundException("Pengiriman tidak ditemukan");

    if (shipment.status === "DITERIMA" || shipment.status === "SELESAI") {
      throw new ConflictException({ code: "ALREADY_RECEIVED", message: "Pengiriman sudah dikonfirmasi." });
    }
    // Boleh konfirmasi lebih awal saat kurir masih di jalan (mis. geofence gagal
    // terpicu karena galat GPS, §6.3 Batasan 2) — yang penting barangnya sudah di tangan.
    if (shipment.status !== "TIBA_DI_LOKASI" && shipment.status !== "DIKIRIM") {
      throw new BadRequestException({
        code: "NOT_IN_TRANSIT",
        message: `Pengiriman belum dalam perjalanan (status ${shipment.status}).`,
      });
    }

    const claimWindowEndsAt = new Date(Date.now() + CLAIM_WINDOW_MS);
    await this.settle(shipmentId, "BUYER_CONFIRM", claimWindowEndsAt, photoUrl);

    this.log.log(`Pengiriman ${shipmentId.slice(0, 8)} DITERIMA — jendela klaim 2 jam`);
    return {
      shipmentId,
      status: "DITERIMA",
      receivedMode: "BUYER_CONFIRM",
      claimWindowEndsAt: claimWindowEndsAt.toISOString(),
    };
  }

  /**
   * Fallback §5.6.4 — pembeli tak merespons 60 menit setelah geofence.
   *
   * Status menjadi "Diterima Otomatis" DAN jendela klaim diperpanjang menjadi 24 jam
   * sebagai kompensasi: pembeli kehilangan kesempatan memeriksa saat serah terima,
   * jadi tidak adil kalau jendelanya tetap 2 jam.
   *
   * Target cron; dipanggil berkala.
   */
  async autoAcceptStale() {
    const cutoff = new Date(Date.now() - POD_TIMEOUT_MS);
    const stale = await this.prisma.shipment.findMany({
      where: { status: "TIBA_DI_LOKASI", arrivedAt: { lt: cutoff } },
      select: { id: true },
    });

    for (const s of stale) {
      const claimWindowEndsAt = new Date(Date.now() + CLAIM_WINDOW_FALLBACK_MS);
      await this.settle(s.id, "AUTO_60MIN", claimWindowEndsAt, null);
      this.log.log(`Pengiriman ${s.id.slice(0, 8)} DITERIMA OTOMATIS — jendela klaim 24 jam`);
    }
    return { autoAccepted: stale.length };
  }

  /** Tutup sesi pelacakan + set status & jendela klaim, dalam satu transaksi. */
  private async settle(
    shipmentId: string,
    mode: "BUYER_CONFIRM" | "AUTO_60MIN",
    claimWindowEndsAt: Date,
    photoUrl: string | null,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: "DITERIMA",
          receivedMode: mode,
          claimWindowEndsAt,
          ...(photoUrl ? { podPhotoUrl: photoUrl } : {}),
        },
      });
      // Langkah 8 — sesi pelacakan berakhir, token sudah hangus sejak diverifikasi.
      await tx.trackingSession.updateMany({
        where: { shipmentId, endedAt: null },
        data: { endedAt: new Date(), endedReason: mode === "BUYER_CONFIRM" ? "BUYER_CONFIRM" : "EXPIRED" },
      });
    });
    this.gateway.emitStatus(shipmentId, "DITERIMA");
  }

  /** Data peta pembeli (BY-10a). Posisi lama tetap ditampilkan dengan waktu jujur. */
  async snapshot(shipmentId: string): Promise<TrackingSnapshot> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, status: true, arrivedAt: true },
    });
    if (!shipment) throw new NotFoundException("Pengiriman tidak ditemukan");

    const rows = await this.prisma.$queryRaw<
      Array<{ lat: number; lng: number; server_ts: Date; dist: number; no_gps: boolean }>
    >`
      SELECT ST_Y(tp.point) AS lat, ST_X(tp.point) AS lng, tp.server_ts,
             ST_Distance(tp.point::geography, s.dest_point::geography) AS dist,
             ts.no_gps_mode AS no_gps
      FROM tracking_positions tp
      JOIN tracking_sessions ts ON ts.id = tp.session_id
      JOIN shipments s ON s.id = ts.shipment_id
      WHERE ts.shipment_id = ${shipmentId}::uuid AND tp.is_plausible = true
      ORDER BY tp.server_ts DESC LIMIT 1
    `;

    const noGps = await this.prisma.trackingSession.findFirst({
      where: { shipmentId },
      orderBy: { startedAt: "desc" },
      select: { noGpsMode: true },
    });

    const last = rows[0];
    return {
      shipmentId,
      status: shipment.status,
      position: last ? { lat: last.lat, lng: last.lng } : null,
      positionAt: last?.server_ts.toISOString() ?? null,
      // Jangan sembunyikan sinyal yang hilang — tampilkan apa adanya (§6.3 Batasan 3).
      signalLost: last ? Date.now() - last.server_ts.getTime() > SIGNAL_LOST_AFTER_MS : false,
      distanceToDestM: last ? Math.round(Number(last.dist)) : null,
      arrivedAt: shipment.arrivedAt?.toISOString() ?? null,
      noGpsMode: noGps?.noGpsMode ?? false,
    };
  }
}
