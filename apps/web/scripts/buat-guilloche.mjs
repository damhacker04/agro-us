/**
 * Hitung jalur guilloche SEKALI, saat menyiapkan aset — bukan saat halaman dirender.
 *
 * Alasannya bukan performa. `Math.cos` dan `Math.sin` adalah fungsi transendental, dan
 * hasil bit terakhirnya boleh berbeda antar implementasi: V8 di Node yang merender di
 * server dan V8 di peramban yang menghidrasi tidak dijamin menghasilkan string yang sama
 * persis. Selisih satu bit cukup untuk membuat `toFixed(2)` membulatkan ke arah berbeda,
 * dan React membuang seluruh pohon dengan galat hydration.
 *
 * Deretnya tetap, jadi jalurnya memang konstanta. Diperlakukan sebagai konstanta.
 *
 *   node scripts/buat-guilloche.mjs
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));

/** Deret NDVI lahan Pujon — harus sama persis dengan `src/lib/sertifikat.ts`. */
const DERET = [
  0.14, 0.16, 0.21, null, 0.34, 0.46, 0.58, 0.67, 0.74, 0.79, 0.81, null, 0.78, 0.72, 0.64,
  0.55, 0.47, 0.39, 0.31,
];

const UKURAN = 400;

function cincin(jariJari, amplitudo, kelopak, pusat) {
  const titik = [];
  for (let sudut = 0; sudut <= 360; sudut += 2) {
    const t = (sudut * Math.PI) / 180;
    const r = jariJari + amplitudo * Math.cos(kelopak * t);
    titik.push(`${(pusat + r * Math.cos(t)).toFixed(2)},${(pusat + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${titik.join("L")}Z`;
}

const layak = DERET.filter((v) => v !== null);
const puncak = Math.max(...layak);
const kelopak = Math.max(6, Math.round(puncak * 30));
const pusat = UKURAN / 2;
const dalam = UKURAN * 0.11;
const luar = UKURAN * 0.46;
const jarak = (luar - dalam) / (DERET.length - 1);

const cincinCincin = DERET.map((v, i) =>
  v === null
    ? null
    : {
        d: cincin(dalam + i * jarak, (v / puncak) * jarak * 2.6, kelopak, pusat),
        opasitas: Number((0.28 + (v / puncak) * 0.62).toFixed(3)),
        tunda: Number((i * 0.075).toFixed(3)),
      },
);

const isi = `// DIBANGKITKAN oleh scripts/buat-guilloche.mjs — jangan disunting tangan.
//
// Jalur guilloche dihitung saat menyiapkan aset supaya server dan peramban memancarkan
// string yang identik. Menghitung trigonometri saat render membuat hasil bit terakhirnya
// bisa berbeda antar mesin V8, dan React membuang seluruh pohon dengan galat hydration.

export const GUILLOCHE_UKURAN = ${UKURAN};

/** Satu entri = satu amatan satelit. \`null\` = tanggal tertutup awan, sengaja tanpa garis. */
export const GUILLOCHE_CINCIN: ({ d: string; opasitas: number; tunda: number } | null)[] = ${JSON.stringify(
  cincinCincin,
  null,
  2,
)};
`;

const keluaran = join(DIR, "..", "src", "lib", "guilloche-paths.ts");
writeFileSync(keluaran, isi, "utf8");
console.log(
  `tulis ${keluaran} — ${cincinCincin.filter(Boolean).length} cincin, ${
    cincinCincin.length - cincinCincin.filter(Boolean).length
  } celah awan, ${kelopak} kelopak`,
);
