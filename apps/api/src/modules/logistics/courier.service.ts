import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  COURIER_PIN_MAX_ATTEMPTS,
  GEOFENCE_RADIUS_M,
  MAX_PLAUSIBLE_JUMP_M,
  MAX_PLAUSIBLE_SPEED_KMH,
  POSITION_INTERVAL_MS,
  POD_TIMEOUT_MS,
  PRENOTIFY_RADIUS_M,
  type ReportPositionResponse,
  type ScanTokenResponse,
  type VerifyCourierCodeResponse,
} from "@agro-os/shared";
import { NotificationService } from "../notification/notification.service";
import { PrismaService } from "../../prisma/prisma.service";
import { QrService } from "./qr.service";
import { TrackingGateway } from "./tracking.gateway";

/**
 * Alur kurir tanpa instalasi & tanpa akun (§5.6.2).
 * Kredensial sesi = `sessionId` (UUID acak) — kurir tidak pernah login.
 */
@Injectable()
export class CourierService {
  private readonly log = new Logger(CourierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrService,
    private readonly gateway: TrackingGateway,
    private readonly notif: NotificationService,
  ) {}

  /**
   * Langkah 3 — halaman pertama setelah scan. SENGAJA tidak mengonsumsi token (FR-6.2):
   * pemindaian iseng oleh orang lewat tidak boleh menghanguskan QR sebelum kurir tiba.
   */
  async inspectToken(token: string): Promise<ScanTokenResponse> {
    const row = await this.prisma.boxQrToken.findUnique({
      where: { token },
      include: {
        orderItem: {
          include: {
            shipment: { include: { zone: { select: { name: true } } } },
            batch: { include: { product: { include: { tenant: { select: { companyName: true } } } } } },
          },
        },
      },
    });
    if (!row) {
      return { valid: false, code: "TOKEN_UNKNOWN", message: "QR tidak dikenal. Hubungi penjual." };
    }
    if (row.consumedAt) {
      return { valid: false, code: "TOKEN_CONSUMED", message: "QR sudah dipakai. Hubungi penjual." };
    }

    const shipment = row.orderItem.shipment;
    if (shipment.pinAttempts >= COURIER_PIN_MAX_ATTEMPTS) {
      return {
        valid: false,
        code: "TOKEN_LOCKED",
        message: "Kode salah 5 kali. Minta penjual menerbitkan kode baru.",
      };
    }

    return {
      valid: true,
      tenantName: row.orderItem.batch.product.tenant.companyName,
      destinationLabel: shipment.zone.name,
      remainingAttempts: COURIER_PIN_MAX_ATTEMPTS - shipment.pinAttempts,
    };
  }

  /**
   * Langkah 4 — verifikasi Kode Antar. Di titik INILAH token ditandai terpakai
   * dan status berubah menjadi Dikirim (FR-6.2, §5.6.1 status 3).
   */
  async verifyCode(token: string, code: string): Promise<VerifyCourierCodeResponse> {
    const row = await this.prisma.boxQrToken.findUnique({
      where: { token },
      include: { orderItem: { include: { shipment: true } } },
    });
    if (!row) throw new NotFoundException({ code: "TOKEN_UNKNOWN", message: "QR tidak dikenal." });
    if (row.consumedAt) {
      throw new BadRequestException({ code: "TOKEN_CONSUMED", message: "QR sudah dipakai." });
    }

    const shipment = row.orderItem.shipment;
    if (!shipment.courierPinHash) {
      throw new BadRequestException({ code: "QR_NOT_ISSUED", message: "Kode Antar belum diterbitkan penjual." });
    }
    if (shipment.pinAttempts >= COURIER_PIN_MAX_ATTEMPTS) {
      throw new BadRequestException({
        code: "TOKEN_LOCKED",
        message: "Kode salah 5 kali. Minta penjual menerbitkan kode baru.",
      });
    }

    if (this.qr.hashCode(shipment.id, code) !== shipment.courierPinHash) {
      const updated = await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: { pinAttempts: { increment: 1 } },
        select: { pinAttempts: true },
      });
      const remaining = Math.max(COURIER_PIN_MAX_ATTEMPTS - updated.pinAttempts, 0);
      throw new BadRequestException({
        code: "CODE_WRONG",
        message: remaining > 0 ? `Kode salah. Sisa ${remaining} percobaan.` : "Kode salah. Minta kode baru ke penjual.",
        remainingAttempts: remaining,
      });
    }

    // Kode benar → konsumsi token + buka sesi, dalam satu transaksi.
    const session = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.boxQrToken.updateMany({
        where: { id: row.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) {
        // Dua kurir memindai box yang sama nyaris bersamaan.
        throw new BadRequestException({ code: "TOKEN_CONSUMED", message: "QR baru saja dipakai." });
      }

      const s = await tx.trackingSession.create({
        data: { shipmentId: shipment.id, activationTokenId: row.id },
      });
      await tx.shipment.update({
        where: { id: shipment.id },
        data: { status: "DIKIRIM", pinAttempts: 0 },
      });
      return s;
    });

    // Notif-1 dari tiga tahap (FR-10.2). Jendela 60 menit BELUM dimulai di sini,
    // jadi notifikasinya sengaja TANPA countdownEndsAt.
    this.gateway.emitStatus(shipment.id, "DIKIRIM");
    void this.notif.kirimKePembeliPengiriman(
      shipment.id,
      "PENGIRIMAN_DIMULAI",
      "Pesanan Anda dalam perjalanan",
      "Kurir sudah memindai QR dan berangkat. Anda bisa memantau posisinya di peta.",
    );
    this.log.log(`Pengiriman ${shipment.id.slice(0, 8)} dikirim — sesi ${session.id.slice(0, 8)}`);

    const dest = await this.destinationOf(shipment.id);
    return {
      sessionId: session.id,
      shipmentId: shipment.id,
      destination: dest,
      destRadiusM: shipment.destRadiusM,
      positionIntervalMs: POSITION_INTERVAL_MS,
    };
  }

  /** Kurir menolak izin lokasi — peta live mati, jalur konfirmasi pembeli tetap jalan (§6.3). */
  async flagNoGps(sessionId: string) {
    const s = await this.requireActiveSession(sessionId);
    await this.prisma.trackingSession.update({ where: { id: s.id }, data: { noGpsMode: true } });
    this.log.warn(`Sesi ${sessionId.slice(0, 8)} tanpa GPS — konfirmasi manual pembeli`);
    return { noGpsMode: true };
  }

  /**
   * Langkah 5-6 — terima posisi tiap 10 detik, cek kewajaran, deteksi geofence.
   *
   * Posisi tidak wajar TETAP DISIMPAN (ditandai `is_plausible=false`), tidak dibuang:
   * jejaknya justru bukti saat terjadi sengketa. Yang dilakukan sistem adalah menolak
   * memicu geofence dari posisi semacam itu.
   */
  async reportPosition(sessionId: string, lat: number, lng: number, deviceTs: Date): Promise<ReportPositionResponse> {
    const session = await this.requireActiveSession(sessionId);

    // Pembanding HARUS posisi wajar terakhir, bukan posisi terakhir apa pun.
    // Kalau tidak, satu bacaan buruk meracuni seluruh rantai sesudahnya: posisi
    // asli yang datang berikutnya ikut dinilai "melompat" dari titik palsu itu,
    // sehingga geofence tidak pernah menyala walau kurir sudah sampai. Ini bukan
    // sekadar kasus serangan — gangguan GPS biasa (terowongan, pantulan gedung)
    // menghasilkan lompatan serupa.
    const prev = await this.prisma.$queryRaw<Array<{ lat: number; lng: number; device_ts: Date; server_ts: Date }>>`
      SELECT ST_Y(point) AS lat, ST_X(point) AS lng, device_ts, server_ts
      FROM tracking_positions
      WHERE session_id = ${sessionId}::uuid AND is_plausible = true
      ORDER BY server_ts DESC LIMIT 1
    `;

    let plausible = true;
    if (prev[0]) {
      const meters = haversineM(prev[0].lat, prev[0].lng, lat, lng);
      const nilai = nilaiKewajaran({
        meters,
        detikPerangkat: (deviceTs.getTime() - prev[0].device_ts.getTime()) / 1000,
        detikServer: (Date.now() - prev[0].server_ts.getTime()) / 1000,
      });
      plausible = nilai.plausible;
      if (!plausible) {
        this.log.warn(
          `Sesi ${sessionId.slice(0, 8)}: posisi tidak wajar (${nilai.kmh.toFixed(0)} km/j, ${meters.toFixed(0)} m, jeda diakui ${nilai.detikDiakui.toFixed(0)} dtk)`,
        );
      }
    }

    const rows = await this.prisma.$queryRaw<Array<{ dist: number }>>`
      WITH ins AS (
        INSERT INTO tracking_positions (session_id, point, device_ts, is_plausible)
        VALUES (${sessionId}::uuid, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), ${deviceTs}, ${plausible})
        RETURNING point
      )
      SELECT ST_Distance(ins.point::geography, s.dest_point::geography) AS dist
      FROM ins, shipments s WHERE s.id = ${session.shipmentId}::uuid
    `;
    const distance = Number(rows[0]?.dist ?? Number.POSITIVE_INFINITY);

    /**
     * HANYA posisi wajar yang disiarkan.
     *
     * Bacaan tidak wajar tetap DISIMPAN dengan `is_plausible = false` — ia bukti, dan
     * membuangnya berarti menghapus jejak gangguan GPS maupun percobaan pemalsuan. Tetapi
     * menyiarkannya adalah hal yang berbeda: peta langsung pembeli melompat ke titik yang
     * sudah dinilai tidak masuk akal, lalu terhenyak kembali saat bacaan berikutnya
     * datang. Padahal `snapshot()` — peta yang sama ketika dimuat ulang — sudah menyaring
     * ke posisi wajar terakhir. Jadi selama ini kedua tampilan itu menjawab berbeda untuk
     * pertanyaan yang sama, dan yang langsung justru yang lebih mudah dipercaya keliru.
     *
     * Yang dilihat pembeli saat GPS terganggu: penanda kurir diam di posisi wajar
     * terakhir. Itu jawaban jujur — kami memang tidak tahu posisinya sekarang (BUG-BE-06).
     */
    if (plausible) this.gateway.emitPosition(session.shipmentId, { lat, lng }, deviceTs, distance);

    let arrived = false;
    if (plausible && distance <= GEOFENCE_RADIUS_M) {
      arrived = await this.markArrived(session.shipmentId);
    } else if (plausible && distance <= PRENOTIFY_RADIUS_M) {
      // Notif-2 (FR-10.2): beri pembeli waktu bersiap SEBELUM jam 60 menit mulai.
      // Masih tanpa hitung mundur — memunculkannya di sini membuat pembeli terburu-buru
      // padahal kurirnya bisa saja masih 15 menit lagi.
      this.gateway.emitStatus(session.shipmentId, "MENDEKAT");
      void this.notifMendekatSekali(session.shipmentId, distance);
    }

    return { accepted: true, plausible, distanceToDestM: Math.round(distance), arrived };
  }

  /**
   * Geofence terpicu — HANYA mengubah status & mengirim notifikasi (§5.6.4 Sinyal-1).
   * Tidak menyelesaikan transaksi: koordinat GPS bukan bukti siapa yang menerima.
   */
  private async markArrived(shipmentId: string): Promise<boolean> {
    const res = await this.prisma.shipment.updateMany({
      where: { id: shipmentId, status: "DIKIRIM" },
      data: { status: "TIBA_DI_LOKASI", arrivedAt: new Date() },
    });
    if (res.count === 1) {
      // Notif-3 — jam 60 menit dimulai DI SINI (FR-10.2), dan HANYA di sini
      // countdownEndsAt ikut dikirim. Ini satu-satunya tahap yang kritis: kalau
      // pembeli melewatkannya, pesanan diterima otomatis tanpa dia sempat memeriksa.
      this.gateway.emitStatus(shipmentId, "TIBA_DI_LOKASI");
      void this.notif.kirimKePembeliPengiriman(
        shipmentId,
        "KURIR_TIBA",
        "Kurir sudah tiba — mohon konfirmasi",
        "Periksa kondisi barang lalu konfirmasi penerimaan. Tanpa konfirmasi dalam 60 menit, pesanan dianggap diterima otomatis.",
        { countdownEndsAt: new Date(Date.now() + POD_TIMEOUT_MS).toISOString() },
      );
      this.log.log(`Pengiriman ${shipmentId.slice(0, 8)} tiba — pembeli diminta konfirmasi`);
    }
    return true;
  }

  /**
   * Posisi dilaporkan tiap 10 detik, jadi tanpa penjaga ini pembeli akan dihujani
   * notifikasi "kurir mendekat" sepanjang kilometer terakhir. Satu kali per pengiriman
   * sudah cukup — tahap berikutnya (kurir tiba) yang benar-benar menuntut tindakan.
   *
   * Penandanya kolom `notified_1km_at`, BUKAN Set di memori seperti sebelumnya. Set itu
   * salah dalam tiga cara sekaligus: hilang setiap redeploy sehingga pembeli diberi tahu
   * dua kali, tidak dibagi antar instans sehingga tiap instans memberi tahu sendiri, dan
   * membuat kolomnya tetap NULL selamanya sehingga FR-10.2 tidak bisa diaudit — padahal
   * jendela 60 menit dihitung dari `arrived_at`, dan memisahkan keduanya justru alasan
   * kolom ini ada (ERD v2.3 poin 7).
   *
   * `updateMany` dengan syarat masih NULL bersifat atomik: hanya satu pemanggil yang
   * memperoleh count 1, sisanya keluar tanpa mengirim apa pun.
   */
  private async notifMendekatSekali(shipmentId: string, distanceM: number) {
    const klaim = await this.prisma.shipment.updateMany({
      where: { id: shipmentId, notified1kmAt: null },
      data: { notified1kmAt: new Date() },
    });
    if (klaim.count !== 1) return;

    await this.notif.kirimKePembeliPengiriman(
      shipmentId,
      "KURIR_MENDEKAT",
      "Kurir sekitar 1 km lagi",
      `Kurir tinggal ${Math.round(distanceM)} meter dari lokasi Anda. Siapkan penerimaan barang.`,
    );
  }

  private async destinationOf(shipmentId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ lat: number; lng: number }>>`
      SELECT ST_Y(dest_point) AS lat, ST_X(dest_point) AS lng FROM shipments WHERE id = ${shipmentId}::uuid
    `;
    return { lat: rows[0]!.lat, lng: rows[0]!.lng };
  }

  private async requireActiveSession(sessionId: string) {
    const s = await this.prisma.trackingSession.findUnique({ where: { id: sessionId } });
    if (!s) throw new NotFoundException({ code: "SESSION_UNKNOWN", message: "Sesi tidak dikenal." });
    if (s.endedAt) {
      throw new BadRequestException({ code: "SESSION_ENDED", message: "Sesi sudah berakhir." });
    }
    return s;
  }
}

/**
 * Toleransi selisih jam ponsel terhadap jam server, dalam detik. Jam ponsel murah memang
 * meleset beberapa detik, dan jaringan seluler menambah jeda kirim.
 */
const TOLERANSI_JAM_DETIK = 30;

/**
 * Batas lompatan absolut hanya berlaku untuk bacaan BERUNTUN — jeda sampai kira-kira enam
 * interval pelaporan. Di luar itu yang menilai adalah kecepatan.
 */
const JENDELA_BATAS_LOMPATAN_DETIK = 60;

/**
 * Apakah perpindahan dari posisi wajar terakhir masuk akal (§6.3 Batasan 4).
 *
 * ═══ Dua cacat yang diperbaiki di sini — keduanya DITEMUKAN DI API SUNGGUHAN ═══
 *
 * 1. KURIR JUJUR TERKUNCI SELAMANYA. Sebelumnya lompatan > 5 km selalu ditolak, berapa pun
 *    waktu yang lewat. Kurir yang masuk area tanpa sinyal 10 menit pada 36 km/jam muncul
 *    kembali 6 km dari titik wajar terakhirnya: bacaan jujur itu ditolak, lalu SETIAP
 *    bacaan berikutnya dibandingkan dengan titik beku yang sama — yang makin jauh. Uji
 *    lawan API hidup (`scripts/probe-gps-gap.ts`): 0 dari 41 bacaan sesudahnya wajar,
 *    termasuk 18 menit berdiri 20 m dari pintu pembeli. Geofence tidak pernah menyala,
 *    hitung mundur penerimaan tidak pernah mulai, dan peta pembeli membeku 19 km jauhnya.
 *    Pembanding "posisi wajar terakhir" dipilih justru untuk mencegah rantai teracuni;
 *    batas lompatan yang buta waktu memasukkan racun itu kembali lewat pintu lain.
 *
 * 2. JAM PONSEL DIPERCAYA PENUH. Kecepatan dihitung dari `deviceTs` — nilai yang dikirim
 *    ponsel dan tidak pernah diperiksa. Mengirim `deviceTs` sejam ke depan membuat
 *    lompatan 80 km terlihat seperti 80 km/jam; satu-satunya yang menghalanginya adalah
 *    batas 5 km tadi. Jadi batas itu tidak bisa sekadar dilonggarkan.
 *
 * Perbaikannya berpasangan: waktu tempuh yang diakui adalah yang LEBIH PENDEK antara jam
 * ponsel dan jam server (ditambah toleransi). Ponsel boleh mengaku lebih cepat — itu hanya
 * membuatnya lebih ketat — tetapi tidak bisa mengaku menempuh waktu lebih lama daripada
 * yang benar-benar lewat di server. Dengan waktu yang tidak bisa dipalsukan, aturan
 * kecepatan cukup untuk jeda panjang, dan batas lompatan absolut dipertahankan untuk
 * bacaan beruntun sebagai lapisan kedua terhadap pantulan GPS.
 *
 * Mengandalkan jam server aman karena halaman kurir mengirim posisi SAAT ITU JUGA, tanpa
 * antrean offline. Kalau kelak ada antrean offline, jeda server akan terlalu pendek untuk
 * bacaan yang dikirim beruntun — hasilnya lebih ketat, bukan lebih longgar, tetapi aturan
 * ini harus ditinjau ulang bersama perubahan itu.
 */
export function nilaiKewajaran(input: { meters: number; detikPerangkat: number; detikServer: number }): {
  plausible: boolean;
  detikDiakui: number;
  kmh: number;
} {
  const detikDiakui = Math.max(Math.min(input.detikPerangkat, input.detikServer + TOLERANSI_JAM_DETIK), 1);
  const kmh = (input.meters / detikDiakui) * 3.6;
  const beruntun = detikDiakui <= JENDELA_BATAS_LOMPATAN_DETIK;
  const plausible = kmh <= MAX_PLAUSIBLE_SPEED_KMH && (!beruntun || input.meters <= MAX_PLAUSIBLE_JUMP_M);
  return { plausible, detikDiakui, kmh };
}

/** Jarak dua koordinat dalam meter. Cukup untuk cek kewajaran; geofence tetap pakai PostGIS. */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
