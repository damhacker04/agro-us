import type { Metadata } from "next";
import { Archivo, Chivo_Mono, Fredoka, Poppins } from "next/font/google";
import "./global.css";

// Fredoka & Poppins DIPERTAHANKAN: 56 halaman lain masih memakainya. Migrasi tipografi
// mereka menyusul per kelompok peran, bukan sebagai efek samping halaman depan.
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Dunia Label Sertifikasi. Sumbu lebar dimuat karena judul sertifikat memakai lebar,
// bukan serif kontras tinggi, untuk mendapatkan suara display-nya.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// Hanya untuk data terukur: nomor seri, hash, koordinat, NDVI, tanggal akuisisi scene.
const chivoMono = Chivo_Mono({ subsets: ["latin"], variable: "--font-chivo-mono", display: "swap" });

export const metadata: Metadata = {
  title: "AgroUs — pasokan agrikultur yang diverifikasi sebelum dijanjikan",
  description:
    "Kuota pasokan dikunci sebelum tanam, lalu diuji terhadap kurva vegetasi Sentinel-2 dan rantai catatan lapangan yang tidak bisa disunting.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body
        className={`${poppins.variable} ${fredoka.variable} ${archivo.variable} ${chivoMono.variable} font-sans`}
      >
        {/*
          THESIS: Sertifikat mutu untuk panen yang belum ada. Menolak hero gradien hijau
          berfoto petani dengan tiga kartu fitur, dan menolak lawan-refleksnya: dashboard
          gelap ala luar angkasa.
          OWN-WORLD: Label sertifikasi benih Indonesia — ungu, biru, merah jambu, di atas
          kertas sekuriti dingin; tinta intaglio biru-hitam, cap vermilion, guilloche garis
          halus, Archivo untuk struktur dan Chivo Mono hanya untuk angka terukur.
          STORY: Pengunjung paham bahwa klaim panen diuji terhadap kurva satelit dan rantai
          hash, bahwa sistem menyatakan kapan ia tidak bisa menilai, lalu masuk mencoba.
          FIRST VIEWPORT: Baris penawaran memimpin ("Harga terkunci sebelum benihnya
          ditanam"), sertifikat batch nyata berdiri persis di bawahnya sebagai buktinya —
          DIUBAH dari urutan sertifikat-dulu setelah audiens dipastikan pembeli institusional,
          bukan penilai teknis. Guilloche digambar dari 17 amatan NDVI layak lahan itu (2
          tanggal tertutup awan sengaja meninggalkan celah); cap verifikasi dan aksi utama di
          blok tanda tangan.
          FORM: Label Sertifikasi, kandidat 5 dari daftar grounded, seed key 5fd9ab63.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
        */}
        {children}
      </body>
    </html>
  );
}
