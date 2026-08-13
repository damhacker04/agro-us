import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifikasi tanda tangan callback mitra pembayaran.
 *
 * Tanpa ini, `POST /payments/webhook` menerima perintah dari siapa pun: cukup tahu nomor
 * tagihan, kirim `{"status":"PAID"}`, dan kuota terkunci, escrow mencatat HOLD, alokasi
 * berjalan — atas uang yang tidak pernah masuk. Ini lubang paling mahal di sistem ini,
 * karena ia mencetak barang gratis, bukan sekadar membocorkan data.
 *
 * ---------------------------------------------------------------------------------
 * Skema: HMAC-SHA256, gaya Stripe/GitHub, sengaja BUKAN skema Midtrans.
 *
 * Midtrans menandatangani `order_id + status_code + gross_amount + server_key`, dan bentuk
 * payload kita bukan bentuk Midtrans. Menyalin rumusnya ke payload sendiri menghasilkan
 * ritual yang terlihat aman tanpa melindungi apa pun. Yang dipakai di sini adalah pola
 * umum yang berdiri sendiri; saat Midtrans/Xendit betul-betul disambungkan, verifikator
 * khususnya masuk lewat seam yang sama dan berkas ini yang berubah — bukan controller-nya.
 *
 * Header:  x-agro-signature: t=<detik unix>,v1=<hmac hex>
 * Ditandatangani: `${t}.${raw body}`
 *
 * Tiga hal yang membuat verifikasi seperti ini sering gagal diam-diam, dan ditangani di sini:
 *
 * 1. BODY MENTAH, bukan hasil parse yang di-JSON.stringify ulang. Urutan kunci dan spasi
 *    tidak dijamin bertahan, jadi tanda tangan yang sah pun akan tampak salah. Inilah
 *    sebabnya `main.ts` menyalakan `rawBody`.
 * 2. PERBANDINGAN WAKTU-TETAP. `===` pada string keluar lebih cepat saat byte pertama beda,
 *    dan selisih waktu itu cukup untuk menebak tanda tangan byte demi byte.
 * 3. STEMPEL WAKTU IKUT DITANDATANGANI. Tanpa itu, satu callback sah yang tertangkap bisa
 *    diputar ulang selamanya. Handler kita memang idempoten, tetapi mengandalkan
 *    idempotensi sebagai pengganti pagar berarti pagarnya hilang begitu ada jalur baru.
 */

/** Selisih waktu maksimum yang masih diterima. Cukup longgar untuk jam server yang meleset. */
export const TOLERANSI_STEMPEL_DETIK = 300;

export type HasilVerifikasi =
  | { sah: true }
  | { sah: false; alasan: string };

/** Baca `t=...,v1=...` tanpa mempercayai urutan maupun spasi di sekitarnya. */
function uraikanHeader(header: string): { t?: string; v1?: string } {
  const out: { t?: string; v1?: string } = {};
  for (const bagian of header.split(",")) {
    const [k, v] = bagian.split("=", 2);
    const kunci = k?.trim();
    if (kunci === "t") out.t = v?.trim();
    else if (kunci === "v1") out.v1 = v?.trim();
  }
  return out;
}

function samaAman(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual melempar bila panjangnya beda — dan panjang yang beda memang sudah
  // cukup untuk menyimpulkan tidak sama, tanpa membocorkan apa pun soal isinya.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifikasiTandaTangan(
  rawBody: Buffer | undefined,
  header: string | undefined,
  secret: string,
  sekarangDetik = Math.floor(Date.now() / 1000),
): HasilVerifikasi {
  if (!rawBody || rawBody.length === 0) {
    return { sah: false, alasan: "Body kosong — tanda tangan tidak dapat diperiksa." };
  }
  if (!header) {
    return { sah: false, alasan: "Header x-agro-signature tidak ada." };
  }

  const { t, v1 } = uraikanHeader(header);
  if (!t || !v1) {
    return { sah: false, alasan: "Header x-agro-signature tidak lengkap (butuh t dan v1)." };
  }

  const stempel = Number(t);
  if (!Number.isFinite(stempel)) {
    return { sah: false, alasan: "Stempel waktu bukan angka." };
  }
  if (Math.abs(sekarangDetik - stempel) > TOLERANSI_STEMPEL_DETIK) {
    return { sah: false, alasan: "Stempel waktu di luar toleransi — callback terlalu lama." };
  }

  const diharapkan = createHmac("sha256", secret)
    .update(`${t}.`)
    .update(rawBody)
    .digest("hex");

  if (!samaAman(diharapkan, v1)) {
    return { sah: false, alasan: "Tanda tangan tidak cocok." };
  }
  return { sah: true };
}

/**
 * Bentuk header yang sah — dipakai pengujian dan skrip integrasi mitra.
 *
 * Diekspor dengan sengaja: satu-satunya cara memastikan pembuat dan pemeriksa memakai
 * material yang sama adalah menaruh keduanya di berkas ini. Ketika dipisah, keduanya
 * pelan-pelan berbeda dan yang gagal adalah callback sungguhan di tengah malam.
 */
export function buatHeaderTandaTangan(
  rawBody: string | Buffer,
  secret: string,
  stempelDetik = Math.floor(Date.now() / 1000),
): string {
  const hmac = createHmac("sha256", secret)
    .update(`${stempelDetik}.`)
    .update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody)
    .digest("hex");
  return `t=${stempelDetik},v1=${hmac}`;
}
