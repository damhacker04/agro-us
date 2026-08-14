import React from "react";
import { desimal, tanggalPendek } from "@/lib/format-id";
import { DERET_NDVI, SERTIFIKAT } from "@/lib/sertifikat";

/**
 * Kurva NDVI lahan Pujon — grafik yang memikul sebagian besar penjelasan halaman ini.
 *
 * Satu gambar menunjukkan seluruh mekanismenya: tanah terbuka pada 0,14, tajuk menutup
 * sampai 0,81, lalu menua turun ke 0,31 menjelang panen. Tanggal panen yang DIKLAIM Tenant
 * berdiri sebagai garis tegak, dan bisa dibandingkan langsung dengan tempat kurva itu
 * benar-benar berbalik.
 *
 * Dua tanggal tidak punya titik sama sekali. Bukan nol, bukan interpolasi: awan menutup
 * 74% dan 88% scene-nya, jadi tidak ada yang bisa dikatakan. Celah itu dibiarkan terbuka
 * dan diberi label — inilah `TIDAK_DAPAT_DINILAI` dalam bentuk grafik.
 */

const L = 56;
const R = 20;
const A = 18;
const B = 44;
const W = 880;
const H = 300;

const hari = (t: string) => Math.round(new Date(t).getTime() / 86_400_000);
const AWAL = hari(DERET_NDVI[0]!.tanggal);
// Domain mencakup tanggal panen yang DIKLAIM, bukan berhenti di amatan terakhir: kalau
// klaimnya jatuh setelah amatan terakhir, penandanya terdorong keluar area gambar — padahal
// membandingkan keduanya persis alasan grafik ini ada.
const AKHIR = Math.max(
  hari(DERET_NDVI[DERET_NDVI.length - 1]!.tanggal),
  hari(SERTIFIKAT.panenKlaim),
);

const x = (t: string) => L + ((hari(t) - AWAL) / (AKHIR - AWAL)) * (W - L - R);
const y = (v: number) => A + (1 - v / 0.9) * (H - A - B);


export function KurvaNdvi({ className }: { className?: string }) {
  // Ruas dipecah di setiap lubang awan, jadi garisnya benar-benar putus alih-alih
  // melompati tanggal yang tidak pernah terukur.
  const ruas: { tanggal: string; ndvi: number }[][] = [];
  let berjalan: { tanggal: string; ndvi: number }[] = [];
  for (const d of DERET_NDVI) {
    if (d.ndvi === null) {
      if (berjalan.length) ruas.push(berjalan);
      berjalan = [];
    } else {
      berjalan.push({ tanggal: d.tanggal, ndvi: d.ndvi });
    }
  }
  if (berjalan.length) ruas.push(berjalan);

  const awan = DERET_NDVI.filter((d) => d.ndvi === null);
  const puncak = DERET_NDVI.reduce((a, d) => (d.ndvi && d.ndvi > (a.ndvi ?? 0) ? d : a), DERET_NDVI[0]!);

  return (
    <figure className={className}>
      {/* `aria-label`, bukan elemen `<title>`: React 19 mengangkat `<title>` ke `<head>`
          sebagai metadata dokumen, dan markup server pun berbeda dari markup klien. */}
      {/* Digulir mendatar di layar sempit, bukan diperkecil.
          SVG yang menyusut ikut mengecilkan tulisannya: pada 375px, label 13px tampil
          sebagai 4px dan grafik utama halaman ini berhenti terbaca. Menaikkan ukuran
          fontnya akan merusak tampilan desktop, jadi yang digeser lebarnya. Pola yang sama
          sudah dipakai tabel grade di halaman ini. */}
      <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[52rem] md:min-w-0"
        role="img"
        aria-label="Kurva NDVI lahan Pujon, 5 Mei sampai 3 Agustus 2026: naik dari 0,14 ke puncak 0,81 pada 24 Juni, lalu turun ke 0,31. Dua tanggal tidak terukur karena tertutup awan."
      >

        {[0.2, 0.4, 0.6, 0.8].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-kertas-garis" strokeWidth={1} />
            <text x={L - 10} y={y(v) + 4} textAnchor="end" className="fill-tinta-samar font-mono text-[13px]">
              {desimal(v, 1)}
            </text>
          </g>
        ))}

        {/* Ambang tutupan tajuk: di atas garis ini lahan dianggap bervegetasi penuh. */}
        <line
          x1={L}
          x2={W - R}
          y1={y(0.45)}
          y2={y(0.45)}
          className="stroke-tinta-lembut"
          strokeWidth={1}
          strokeDasharray="2 5"
        />
        <text x={W - R} y={y(0.45) - 8} textAnchor="end" className="fill-tinta-lembut text-[12px] font-medium">
          tutupan tajuk
        </text>

        {/* Lubang awan — pita tegak yang sengaja kosong. */}
        {awan.map((d) => (
          <g key={d.tanggal}>
            <rect
              x={x(d.tanggal) - 13}
              y={A}
              width={26}
              height={H - A - B}
              className="fill-tinta"
              opacity={0.07}
            />
            <text
              x={x(d.tanggal)}
              y={A + 13}
              textAnchor="middle"
              className="fill-tinta-lembut font-mono text-[11px]"
            >
              {d.awan}%
            </text>
          </g>
        ))}

        {ruas.map((r, i) => (
          <polyline
            key={i}
            points={r.map((d) => `${x(d.tanggal)},${y(d.ndvi)}`).join(" ")}
            // `polyline` mengisi dirinya sendiri secara bawaan; tanpa baris ini ruas yang
            // melengkung tampil sebagai baji hitam pekat di bawah kurva.
            fill="none"
            className="stroke-ungu"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {DERET_NDVI.filter((d) => d.ndvi !== null).map((d) => (
          <circle
            key={d.tanggal}
            cx={x(d.tanggal)}
            cy={y(d.ndvi as number)}
            r={3.5}
            className="fill-kertas-terang stroke-ungu"
            strokeWidth={2}
          />
        ))}

        {/* Puncak tajuk — angka yang menjadi masukan pita kewajaran. */}
        <g>
          <circle cx={x(puncak.tanggal)} cy={y(puncak.ndvi as number)} r={6} className="fill-ungu" />
          <line
            x1={x(puncak.tanggal)}
            x2={x(puncak.tanggal)}
            y1={y(puncak.ndvi as number) - 12}
            y2={A + 34}
            className="stroke-ungu"
            strokeWidth={1}
          />
          <text x={x(puncak.tanggal)} y={A + 26} textAnchor="middle" className="fill-ungu font-mono text-[14px] font-semibold">
            0,81
          </text>
        </g>

        {/* Tanggal panen yang DIKLAIM Tenant, berdiri sendiri untuk dibandingkan. */}
        <g>
          <line
            x1={x(SERTIFIKAT.panenKlaim)}
            x2={x(SERTIFIKAT.panenKlaim)}
            y1={A}
            y2={H - B}
            className="stroke-stempel"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <text
            x={x(SERTIFIKAT.panenKlaim) - 8}
            y={H - B - 10}
            textAnchor="end"
            className="fill-stempel text-[12px] font-semibold"
          >
            panen diklaim
          </text>
        </g>

        <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="stroke-tinta" strokeWidth={1.5} />
        {DERET_NDVI.filter((_, i) => i % 3 === 0).map((d) => (
          <text
            key={d.tanggal}
            x={x(d.tanggal)}
            y={H - B + 20}
            textAnchor="middle"
            className="fill-tinta-lembut font-mono text-[12px]"
          >
            {tanggalPendek(d.tanggal)}
          </text>
        ))}
      </svg>
      </div>

      <figcaption className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-tinta-lembut">
        Sembilan belas lintasan Sentinel-2 di atas lahan yang sama.{" "}
        <span className="text-tinta">Dua tanggal tidak punya titik</span> — awan menutup 74% dan
        88% scene-nya, dan menebak nilainya sama saja dengan mengarang bukti. Sistem mencatatnya
        sebagai tidak dapat dinilai, lalu melanjutkan tanpa menghukum siapa pun.
      </figcaption>
    </figure>
  );
}
