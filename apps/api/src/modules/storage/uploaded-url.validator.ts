import { registerDecorator, type ValidationOptions } from "class-validator";

/**
 * Validator URL berkas unggahan — hanya menerima berkas yang DIUNGGAH KE SINI.
 *
 * ---------------------------------------------------------------------------------
 * Yang diperbaiki. Aturan lama adalah satu regex:
 *
 *     /^(https?:\/\/\S+|\/uploads\/\S+\.(jpe?g|png|webp))$/i
 *
 * Cabang pertamanya menerima URL absolut APA PUN. Klien yang mengirimkan foto bukti PoD,
 * foto klaim mutu, atau dokumen legalitas cukup menuliskan `https://server-saya/foto.jpg`
 * dan sistem menerimanya sebagai bukti. Akibatnya bukan sekadar tautan rusak:
 *
 *   - isinya bisa berubah setelah diperiksa Operator, atau berbeda per pengunjung;
 *   - buktinya bisa dihapus pemiliknya sendiri tepat saat sengketa muncul;
 *   - hash yang kita simpan tidak menjamin apa-apa, karena berkasnya bukan milik kita.
 *
 * Selama penyimpanan masih disk lokal, cabang itu tidak terlalu terlihat karena unggahan
 * sah selalu berbentuk `/uploads/...`. Begitu pindah ke S3/R2, unggahan sah JUSTRU menjadi
 * URL absolut — dan tanpa perubahan ini satu-satunya cara menerimanya adalah menerima semua
 * URL absolut sekaligus. Perpindahan penyimpanan inilah yang mengubah lubang ini dari
 * "belum kepakai" menjadi "terbuka lebar".
 *
 * ---------------------------------------------------------------------------------
 * Dibaca SAAT VALIDASI, bukan saat modul diimpor.
 *
 * Dekorator dievaluasi ketika berkas DTO diimpor, dan itu terjadi sebelum `.env` dimuat.
 * Regex yang dirakit dari `S3_PUBLIC_URL` di tingkat modul akan selalu melihat env kosong
 * secara lokal, tetapi terisi di Render — dua lingkungan berperilaku berbeda tanpa ada yang
 * menyadarinya. Itu jebakan yang sama yang sudah dijelaskan di `storage.module.ts`.
 */

/** Bentuk path unggahan lokal: `/uploads/ab/<digest>.<ext>`. */
const PATH_LOKAL = /^\/uploads\/[0-9a-f]{2}\/[0-9a-f]{64}\.(jpe?g|png|webp)$/i;

export function urlUnggahanSah(nilai: unknown): boolean {
  if (typeof nilai !== "string" || nilai.length === 0 || nilai.length > 2048) return false;

  // Jalur disk lokal (pengembangan, dan baris lama sebelum pindah ke S3).
  if (PATH_LOKAL.test(nilai)) return true;

  const base = (process.env["S3_PUBLIC_URL"] ?? "").replace(/\/+$/, "");
  if (!base) return false;

  let url: URL;
  let asal: URL;
  try {
    url = new URL(nilai);
    asal = new URL(base);
  } catch {
    return false;
  }

  // Origin dibandingkan lewat URL yang sudah diurai, BUKAN `startsWith` pada string.
  // `https://bucket-kita.r2.dev.penyerang.com/...` lolos dari startsWith, dan
  // `https://bucket-kita.r2.dev@penyerang.com/...` lolos dari hampir semua pemeriksaan
  // string — keduanya gugur di sini karena origin-nya memang bukan origin kita.
  if (url.origin !== asal.origin) return false;

  // Path wajib berada di bawah prefix publik yang sama, dan berakhiran ekstensi gambar.
  const prefix = asal.pathname.replace(/\/+$/, "");
  if (!url.pathname.startsWith(`${prefix}/`)) return false;

  return /\.(jpe?g|png|webp)$/i.test(url.pathname);
}

/**
 * `@IsUrlUnggahan()` — URL wajib menunjuk berkas yang benar-benar diunggah ke penyimpanan
 * kita sendiri, bukan ke server mana pun yang kebetulan bisa diketik pengirimnya.
 */
export function IsUrlUnggahan(options?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: "isUrlUnggahan",
      target: target.constructor,
      propertyName,
      options: {
        message:
          "URL harus menunjuk berkas hasil unggahan ke AgroUs — kirim berkasnya lewat POST /uploads lebih dulu.",
        ...options,
      },
      validator: { validate: (value: unknown) => urlUnggahanSah(value) },
    });
  };
}
