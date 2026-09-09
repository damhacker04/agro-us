import React from "react";
import type { NdviSeries } from "@agro-os/shared";
import { desimal, tanggalPendek } from "@/lib/format-id";

/**
 * Kurva NDVI satu batch — versi yang digerakkan DATA, untuk halaman keputusan beli.
 *
 * Kembarannya di `kurva-ndvi.tsx` menggambar lahan Pujon dari konstanta halaman depan:
 * domainnya tetap, `aria-label`-nya menyebut tanggal dan nilai yang sudah diketahui saat
 * ditulis, dan keterangannya bersuara Persuade. Tidak ada yang bisa dipakai ulang di sini
 * tanpa membuat keduanya salah — yang ini menerima deret apa pun, termasuk deret pendek,
 * deret tanpa puncak, dan deret yang seluruhnya tertutup awan.
 *
 * Tiga hukum dunia ini yang ditegakkan gambar ini, dan ketiganya bukan gaya:
 *
 * 1. LUBANG AWAN DIBIARKAN TERBUKA. Garis benar-benar putus di tanggal tanpa nilai, bukan
 *    diinterpolasi dan bukan diturunkan ke nol. Kurva yang disambung melewati awan adalah
 *    bukti karangan; kurva yang jatuh ke nol menuduh tanaman mati padahal yang terjadi
 *    hanya mendung.
 * 2. KLAIM DAN DETEKSI BERDIRI TERPISAH. Tanggal panen yang DIKLAIM Tenant digambar dengan
 *    vermilion putus-putus — warna cap, karena ia klaim yang distempel, bukan hasil ukur.
 *    Tanggal yang TERDETEKSI dari citra digambar ungu penuh, warna mekanisme verifikasi.
 *    Pembeli membandingkan sendiri; halaman tidak menyimpulkan untuknya (FR-4.6).
 * 3. DIGULIR, TIDAK DIPERKECIL. SVG yang menyusut ikut mengecilkan tulisannya — pada 375px
 *    label 13px tampil 4px dan bukti utama halaman ini berhenti terbaca.
 */

const L = 56;
const R = 22;
const A = 20;
const B = 44;
const W = 880;
const H = 300;

const hari = (t: string) => Math.round(new Date(t).getTime() / 86_400_000);

export function KurvaNdviBatch({ deret, className }: { deret: NdviSeries; className?: string }) {
  const titik = deret.points;
  const terukur = titik.filter((p) => p.ndvi !== null);
  const awan = titik.filter((p) => p.ndvi === null);

  // Dua titik adalah minimum sebuah garis. Di bawah itu tidak ada kurva untuk digambar,
  // dan kanvas kosong bergaris sumbu terbaca sebagai kegagalan memuat — bukan sebagai
  // "belum ada yang bisa ditunjukkan". Halaman yang memanggil yang menyatakan itu.
  if (terukur.length < 2) return null;

  const penanda = [deret.claimedHarvestDate, deret.detectedHarvestDate, deret.detectedPlantDate]
    .filter((t): t is string => Boolean(t))
    .map(hari);
  const semuaHari = titik.map((p) => hari(p.date));
  const AWAL = Math.min(...semuaHari, ...penanda);
  // Domain mencakup penanda, tidak berhenti di amatan terakhir: penanda yang jatuh di luar
  // rentang amatan akan terdorong keluar bidang gambar — padahal membandingkannya dengan
  // kurva persis alasan gambar ini ada.
  const AKHIR = Math.max(...semuaHari, ...penanda);
  const rentang = AKHIR - AWAL || 1;

  const puncak = terukur.reduce((a, p) => ((p.ndvi as number) > (a.ndvi as number) ? p : a), terukur[0]!);
  const ATAS = Math.max(0.9, Math.ceil(((puncak.ndvi as number) + 0.08) * 10) / 10);

  const x = (t: string) => L + ((hari(t) - AWAL) / rentang) * (W - L - R);
  const y = (v: number) => A + (1 - v / ATAS) * (H - A - B);

  // Ruas dipecah di tiap lubang awan.
  const ruas: { date: string; ndvi: number }[][] = [];
  let berjalan: { date: string; ndvi: number }[] = [];
  for (const p of titik) {
    if (p.ndvi === null) {
      if (berjalan.length) ruas.push(berjalan);
      berjalan = [];
    } else {
      berjalan.push({ date: p.date, ndvi: p.ndvi });
    }
  }
  if (berjalan.length) ruas.push(berjalan);

  const langkah = Math.max(1, Math.ceil(titik.length / 6));
  const garisNilai = [0.2, 0.4, 0.6, 0.8].filter((v) => v < ATAS);

  const sisiKiri = (t: string) => x(t) > (W + L) / 2;

  return (
    <figure className={className}>
      {/* `aria-label`, bukan elemen `<title>`: React 19 mengangkat `<title>` ke `<head>`
          sebagai metadata dokumen, jadi markup server berbeda dari markup klien. */}
      <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[52rem] md:min-w-0"
          role="img"
          aria-label={`Kurva NDVI ${terukur.length} lintasan Sentinel-2, ${tanggalPendek(
            titik[0]!.date,
          )} sampai ${tanggalPendek(titik[titik.length - 1]!.date)}. Puncak ${desimal(
            puncak.ndvi as number,
          )} pada ${tanggalPendek(puncak.date)}. Panen diklaim ${tanggalPendek(
            deret.claimedHarvestDate,
          )}${
            deret.detectedHarvestDate
              ? `, panen terdeteksi citra ${tanggalPendek(deret.detectedHarvestDate)}`
              : ", panen belum terdeteksi dari citra"
          }.${awan.length ? ` ${awan.length} tanggal tidak terukur karena tertutup awan.` : ""}`}
        >
          {garisNilai.map((v) => (
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

          {/* Lubang awan — pita tegak yang sengaja kosong, berlabel tutupan awannya. */}
          {awan.map((p) => (
            <g key={`awan-${p.date}`}>
              <rect x={x(p.date) - 13} y={A} width={26} height={H - A - B} className="fill-tinta" opacity={0.07} />
              <text
                x={x(p.date)}
                y={A + 13}
                textAnchor="middle"
                className="fill-tinta-lembut font-mono text-[11px]"
              >
                {Math.round(p.cloudPct)}%
              </text>
            </g>
          ))}

          {ruas.map((r, i) => (
            <polyline
              key={i}
              points={r.map((p) => `${x(p.date)},${y(p.ndvi)}`).join(" ")}
              // `polyline` mengisi dirinya sendiri secara bawaan; tanpa ini ruas yang
              // melengkung tampil sebagai baji hitam pekat di bawah kurva.
              fill="none"
              className="stroke-ungu"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {terukur.map((p) => (
            <circle
              key={`titik-${p.date}`}
              cx={x(p.date)}
              cy={y(p.ndvi as number)}
              r={3.5}
              className="fill-kertas-terang stroke-ungu"
              strokeWidth={2}
            />
          ))}

          <g>
            <circle cx={x(puncak.date)} cy={y(puncak.ndvi as number)} r={6} className="fill-ungu" />
            <line
              x1={x(puncak.date)}
              x2={x(puncak.date)}
              y1={y(puncak.ndvi as number) - 12}
              y2={A + 34}
              className="stroke-ungu"
              strokeWidth={1}
            />
            <text
              x={x(puncak.date)}
              y={A + 26}
              textAnchor="middle"
              className="fill-ungu font-mono text-[14px] font-semibold"
            >
              {desimal(puncak.ndvi as number)}
            </text>
          </g>

          {/* Panen yang TERDETEKSI dari citra — ungu, warna mekanisme verifikasi. */}
          {deret.detectedHarvestDate ? (
            <g>
              <line
                x1={x(deret.detectedHarvestDate)}
                x2={x(deret.detectedHarvestDate)}
                y1={A}
                y2={H - B}
                className="stroke-ungu"
                strokeWidth={1.5}
              />
              <text
                x={x(deret.detectedHarvestDate) + (sisiKiri(deret.detectedHarvestDate) ? -8 : 8)}
                y={H - B - 30}
                textAnchor={sisiKiri(deret.detectedHarvestDate) ? "end" : "start"}
                className="fill-ungu text-[12px] font-semibold"
              >
                panen terdeteksi
              </text>
            </g>
          ) : null}

          {/* Panen yang DIKLAIM Tenant — vermilion putus-putus, warna cap. */}
          <g>
            <line
              x1={x(deret.claimedHarvestDate)}
              x2={x(deret.claimedHarvestDate)}
              y1={A}
              y2={H - B}
              className="stroke-stempel"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <text
              x={x(deret.claimedHarvestDate) + (sisiKiri(deret.claimedHarvestDate) ? -8 : 8)}
              y={H - B - 10}
              textAnchor={sisiKiri(deret.claimedHarvestDate) ? "end" : "start"}
              className="fill-stempel text-[12px] font-semibold"
            >
              panen diklaim
            </text>
          </g>

          <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="stroke-tinta" strokeWidth={1.5} />
          {titik
            .filter((_, i) => i % langkah === 0)
            .map((p) => (
              <text
                key={`sumbu-${p.date}`}
                x={x(p.date)}
                y={H - B + 20}
                textAnchor="middle"
                className="fill-tinta-lembut font-mono text-[12px]"
              >
                {tanggalPendek(p.date)}
              </text>
            ))}
        </svg>
      </div>

      <figcaption className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-tinta-lembut">
        {terukur.length} lintasan Sentinel-2 di atas lahan yang sama.{" "}
        {awan.length ? (
          <>
            <span className="text-tinta">
              {awan.length} tanggal tidak punya titik sama sekali
            </span>{" "}
            — awan menutup scene-nya, dan menebak nilainya sama saja dengan mengarang bukti.
            Sistem mencatatnya sebagai tidak dapat dinilai, lalu melanjutkan tanpa menghukum
            siapa pun.
          </>
        ) : (
          <>Tidak ada lintasan yang tertutup awan pada rentang ini, jadi kurvanya utuh.</>
        )}
      </figcaption>
    </figure>
  );
}
