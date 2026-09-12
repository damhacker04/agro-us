/** @type {import('next').NextConfig} */
const nextConfig = {
  // Kunci `eslint` DIHAPUS. Dua alasan, dan keduanya soal kejujuran konfigurasi:
  //
  // 1. Next 16 tidak lagi mengenalinya — `next dev` dan `next build` mencetak
  //    "Unrecognized key(s) in object: 'eslint'" dan mengabaikannya. Jadi ia tidak
  //    mengerjakan apa pun selain membuat orang percaya ada pengaturan yang berlaku.
  // 2. Nilainya `ignoreDuringBuilds: true` sementara komentarnya berbicara tentang
  //    PENGECEKAN TIPE yang "diaktifkan kembali" — dua hal yang berbeda. Komentar yang
  //    menjelaskan pengaturan lain adalah cara tercepat menyesatkan pembaca berikutnya.
  //
  // Lint sekarang berjalan sebagai tahapnya sendiri (`pnpm lint` → ESLint flat config di
  // `eslint.config.mjs`), dan pengecekan tipe di `pnpm type-check`. Keduanya lulus atau
  // gagal secara terpisah dan terlihat, bukan menyelinap di dalam build.

  // `images.remotePatterns` untuk images.unsplash.com DIHAPUS bersama tiga foto stok di
  // halaman rincian batch. Satu-satunya gambar yang tersisa di aplikasi ini adalah foto
  // bukti lapangan dari R2, yang disajikan lewat domain API — dan izin untuk host yang
  // tidak lagi dipakai adalah pintu yang tetap terbuka tanpa alasan.
};

export default nextConfig;
