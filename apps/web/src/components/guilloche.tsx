import React from "react";
import { GUILLOCHE_CINCIN, GUILLOCHE_UKURAN } from "@/lib/guilloche-paths";

/**
 * Rosette guilloche yang digambar DARI deret NDVI lahan.
 *
 * Guilloche ada di uang kertas dan sertifikat bukan karena indah, melainkan karena pola
 * yang dihasilkan mesin geometris sulit ditiru tangan. Alasannya sama persis dengan alasan
 * rantai hash dipakai di produk ini.
 *
 * Yang membuatnya bukan kostum: SATU GARIS DI SINI ADALAH SATU AMATAN SATELIT. Cincin
 * ke-i digambar dari nilai NDVI amatan ke-i, sehingga kedalaman gelombangnya naik saat
 * tajuk menutup dan menyusut saat tanaman menua. Tanggal yang tertutup awan TIDAK
 * digambar — ia meninggalkan celah yang terlihat di dalam pola.
 *
 * Itu sebabnya pola ini tidak bisa dipakai ulang untuk lahan lain: ia adalah datanya.
 *
 * Jalurnya dihitung saat menyiapkan aset (`scripts/buat-guilloche.mjs`), bukan saat
 * render — lihat berkas itu untuk alasannya.
 */

type Props = {
  className?: string;
  /** Warna garis; default mewarisi `currentColor`. */
  goresan?: string;
  /** Matikan animasi gores, untuk pola yang jadi latar dan tidak boleh menarik mata. */
  diam?: boolean;
  /**
   * Isi bila polanya perlu diumumkan ke pembaca layar. Dibiarkan kosong = ornamen, dan
   * ornamen memang tidak perlu dibacakan.
   *
   * Sengaja `aria-label`, BUKAN elemen `<title>` di dalam SVG: React 19 memperlakukan
   * `<title>` sebagai metadata dokumen dan mengangkatnya ke `<head>`, sehingga markup
   * server dan klien berbeda dan seluruh pohon dibuang dengan galat hydration.
   */
  label?: string;
};

export function Guilloche({ className, goresan = "currentColor", diam = false, label }: Props) {
  return (
    <svg
      viewBox={`0 0 ${GUILLOCHE_UKURAN} ${GUILLOCHE_UKURAN}`}
      className={className}
      fill="none"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: false })}
    >
      <g stroke={goresan} strokeWidth={0.64} vectorEffect="non-scaling-stroke">
        {GUILLOCHE_CINCIN.map((c, i) =>
          c === null ? null : (
            <path
              key={i}
              d={c.d}
              pathLength={1}
              opacity={c.opasitas}
              style={
                diam
                  ? undefined
                  : {
                      // Digores berurutan dari dalam ke luar: pola ini tumbuh seperti
                      // tanamannya, bukan muncul sekaligus.
                      strokeDasharray: 1,
                      strokeDashoffset: 1,
                      animation: `gores 2.8s cubic-bezier(0.16,1,0.3,1) ${c.tunda}s forwards`,
                    }
              }
            />
          ),
        )}
      </g>
    </svg>
  );
}
