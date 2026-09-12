import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  POD_TIMEOUT_MS,
  SIGNAL_LOST_AFTER_MS,
  type ConfirmReceiptResponse,
  type ShipmentStatus,
  type TrackingSnapshot,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { ClaimWindowService } from "./claim-window.service";
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
/**
 * Status yang masih boleh berpindah ke DITERIMA lewat konfirmasi pembeli. Satu daftar
 * dipakai baik oleh pemeriksaan awal (untuk pesan galat yang enak dibaca) maupun oleh
 * syarat UPDATE (yang benar-benar menjaga): kalau keduanya ditulis terpisah, suatu saat
 * salah satunya berubah sendiri.
 */
const IN_TRANSIT: ShipmentStatus[] = ["TIBA_DI_LOKASI", "DIKIRIM"];

@Injectable()
export class PodService {
  private readonly log = new Logger(PodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrackingGateway,
    private readonly claimWindow: ClaimWindowService,
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
    if (!IN_TRANSIT.includes(shipment.status)) {
      throw new BadRequestException({
        code: "NOT_IN_TRANSIT",
        message: `Pengiriman belum dalam perjalanan (status ${shipment.status}).`,
      });
    }

    const claimWindowEndsAt = new Date(Date.now() + this.claimWindow.normalMs);
    const won = await this.settle(shipmentId, "BUYER_CONFIRM", IN_TRANSIT, claimWindowEndsAt, photoUrl);
    if (!won) return this.receiptAlreadyOnRecord(shipmentId);

    // Panjang jendela ikut dicetak, bukan ditulis "2 jam" mati: kalau nilainya
    // dipendekkan untuk demo, log yang menyebut angka lama justru menyesatkan.
    this.log.log(
      `Pengiriman ${shipmentId.slice(0, 8)} DITERIMA — jendela klaim ${this.claimWindow.normalLabel}`,
    );
    return {
      shipmentId,
      status: "DITERIMA",
      receivedMode: "BUYER_CONFIRM",
      claimWindowEndsAt: claimWindowEndsAt.toISOString(),
    };
  }

  /**
   * Jawaban untuk konfirmasi yang KALAH balapan (auto-terima atau ketukan kedua dari
   * tab lain menang duluan). Yang dikembalikan adalah penerimaan yang BENAR-BENAR
   * tersimpan, bukan yang barusan dihitung: dua tenggat klaim berbeda untuk satu
   * pengiriman adalah selisih yang nanti diperdebatkan saat klaim mutu masuk.
   */
  private async receiptAlreadyOnRecord(shipmentId: string): Promise<ConfirmReceiptResponse> {
    const current = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { status: true, receivedMode: true, claimWindowEndsAt: true },
    });
    if (current && (current.status === "DITERIMA" || current.status === "SELESAI") && current.claimWindowEndsAt) {
      return {
        shipmentId,
        status: current.status,
        receivedMode: current.receivedMode ?? "BUYER_CONFIRM",
        claimWindowEndsAt: current.claimWindowEndsAt.toISOString(),
      };
    }
    // Kalah tetapi bukan karena sudah diterima: status pindah ke arah lain di sela-sela
    // pemeriksaan dan penulisan. Jangan mengarang hasil — minta pemanggil memuat ulang.
    throw new ConflictException({
      code: "STATUS_BERUBAH",
      message: "Status pengiriman berubah saat konfirmasi diproses. Muat ulang halaman.",
    });
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

    let autoAccepted = 0;
    for (const s of stale) {
      const claimWindowEndsAt = new Date(Date.now() + this.claimWindow.fallbackMs);
      // Hanya dari TIBA_DI_LOKASI: fallback ini kompensasi untuk pembeli yang tidak
      // merespons setelah geofence, bukan jalan pintas menerima kiriman yang belum tiba.
      const won = await this.settle(s.id, "AUTO_60MIN", ["TIBA_DI_LOKASI"], claimWindowEndsAt, null);
      // Pembeli yang menekan "terima" tepat sebelum cron berjalan sudah menang; jangan
      // hitung dia sebagai penerimaan otomatis dan jangan timpa jendela klaimnya.
      if (!won) continue;
      autoAccepted += 1;
      this.log.log(
        `Pengiriman ${s.id.slice(0, 8)} DITERIMA OTOMATIS — jendela klaim ` +
          `${ClaimWindowService.humanize(this.claimWindow.fallbackMs)}`,
      );
    }
    return { autoAccepted };
  }

  /**
   * Tutup sesi pelacakan + set status & jendela klaim, dalam satu transaksi.
   *
   * Transisinya BERSYARAT: `updateMany … where status IN (…)` adalah satu UPDATE yang
   * hanya mengenai baris yang statusnya masih boleh berpindah. Bentuk sebelumnya
   * memeriksa status di luar transaksi lalu menulis tanpa syarat, sehingga konfirmasi
   * pembeli dan auto-terima yang berbarengan sama-sama menulis — menimpa mode
   * penerimaan, menggeser tenggat klaim, dan memancarkan status dua kali.
   *
   * @returns true bila panggilan inilah yang benar-benar memindahkan statusnya.
   */
  private async settle(
    shipmentId: string,
    mode: "BUYER_CONFIRM" | "AUTO_60MIN",
    from: ShipmentStatus[],
    claimWindowEndsAt: Date,
    photoUrl: string | null,
  ): Promise<boolean> {
    const won = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.shipment.updateMany({
        where: { id: shipmentId, status: { in: from } },
        data: {
          status: "DITERIMA",
          receivedMode: mode,
          claimWindowEndsAt,
          ...(photoUrl ? { podPhotoUrl: photoUrl } : {}),
        },
      });
      if (count !== 1) return false;
      // Langkah 8 — sesi pelacakan berakhir, token sudah hangus sejak diverifikasi.
      await tx.trackingSession.updateMany({
        where: { shipmentId, endedAt: null },
        data: { endedAt: new Date(), endedReason: mode === "BUYER_CONFIRM" ? "BUYER_CONFIRM" : "EXPIRED" },
      });
      return true;
    });
    // Pancaran hanya oleh pemenang: klien yang menerima dua `DITERIMA` untuk satu
    // pengiriman akan menampilkan dua notifikasi untuk satu kejadian.
    if (won) this.gateway.emitStatus(shipmentId, "DITERIMA");
    return won;
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
