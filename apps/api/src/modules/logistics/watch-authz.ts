import type { JwtPayload } from "../auth/auth.service";
import type { PrismaService } from "../../prisma/prisma.service";

/**
 * Siapa yang boleh melihat posisi satu pengiriman.
 *
 * Aturannya ditaruh di SATU tempat dan dipakai bersama oleh kanal WebSocket dan endpoint
 * REST. Sebelumnya hanya kanal WS yang mengotorisasi; `GET /shipments/:id/track`
 * mengembalikan posisi kurir ke siapa pun yang menyebut id pengiriman, dengan alasan
 * tertulis "UUID acak tidak bisa ditebak" — alasan yang berkas gateway di sebelahnya
 * sendiri sudah menolak: id pengiriman beredar di tautan, tangkapan layar, dan percakapan
 * dukungan pelanggan, dan sulit ditebak bukan kontrol akses. Selama dua jalur punya
 * aturannya masing-masing, menutup satu jalur tidak pernah menutup lubangnya.
 *
 * Dua jalan masuk yang sah, keduanya membuktikan hubungan dengan pengiriman ini:
 *   1. JWT — pembeli pemilik pesanan, Tenant pemilik barang, atau Operator.
 *   2. Sesi pelacakan yang MASIH terbuka untuk pengiriman itu — kurir tidak punya akun
 *      (§5.6.2), jadi kredensialnya adalah sesi yang lahir dari scan QR + Kode Antar.
 */
export async function bolehPantauPengiriman(
  prisma: Pick<PrismaService, "shipment" | "trackingSession">,
  shipmentId: string,
  pemanggil: { user?: JwtPayload | null; sessionId?: string },
): Promise<boolean> {
  const { user, sessionId } = pemanggil;

  if (user) {
    if (user.role === "OPERATOR") return true;
    const owned = await prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        OR: [
          { order: { buyer: { userId: user.sub } } },
          { items: { some: { batch: { product: { tenant: { userId: user.sub } } } } } },
        ],
      },
      select: { id: true },
    });
    return owned !== null;
  }

  if (!sessionId) return false;
  const session = await prisma.trackingSession.findFirst({
    // shipmentId ikut disyaratkan di dalam kueri: sesi kurir hanya membuka pengirimannya
    // sendiri, bukan pengiriman mana pun yang id-nya ia sebutkan.
    where: { id: sessionId, shipmentId, endedAt: null },
    select: { id: true },
  });
  return session !== null;
}

/**
 * Nama header tempat kurir membawa kredensial sesinya.
 *
 * Header, BUKAN bagian dari path URL. Alasannya sudah tertulis di `ws-auth.ts` untuk
 * kanal WebSocket dan berlaku sama persis di sini: URL tercatat utuh di access log,
 * log proxy, dan header `Referer`, sehingga kredensial yang diletakkan di path adalah
 * kredensial yang ikut tersimpan di setiap tempat yang mencatat lalu lintas. Sesi kurir
 * adalah satu-satunya kredensial yang ia punya — ia setara kata sandi, bukan nomor resi.
 */
export const HEADER_SESI_PELACAKAN = "x-tracking-session";
