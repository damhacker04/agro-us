/**
 * Kunci objek penyimpanan yang sah: `uploads/<2 hex>/<64 hex>.<ext gambar>`.
 *
 * Path dari URL TIDAK PERNAH diteruskan mentah ke penyimpanan. Ia dicocokkan ke pola ini
 * lebih dulu, sehingga `../`, kunci acak, dan percobaan menyusuri isi bucket gugur sebelum
 * menyentuh apa pun. Pola seketat ini tidak menutup satu pun berkas sah: nama berkas yang
 * kita tulis SELALU digest SHA-256 isinya, dengan ekstensi yang diturunkan dari byte awal
 * berkas — bukan dari nama kiriman klien.
 *
 * Dipisah ke berkasnya sendiri supaya dapat diuji tanpa memuat controller beserta seluruh
 * dekorator Nest-nya.
 */
const KUNCI = /^[0-9a-f]{2}\/[0-9a-f]{64}\.(jpe?g|png|webp)$/i;

/** `prefix/berkas` dari URL → kunci objek penuh, atau `null` bila bentuknya tidak sah. */
export function kunciObjekDariPath(prefix: string, berkas: string): string | null {
  const relatif = `${prefix}/${berkas}`;
  return KUNCI.test(relatif) ? `uploads/${relatif}` : null;
}
