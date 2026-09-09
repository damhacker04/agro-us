/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pengecekan tipe saat build DIAKTIFKAN kembali.
  //
  // Sempat dimatikan sementara saat halaman FE masih mockup dan menyimpan galat tipe
  // yang menggagalkan `next build`. Sekarang seluruh halaman memanggil API lewat
  // kontrak `@agro-os/shared`, dan justru di situlah pengecekan tipe paling berguna:
  // perubahan bentuk respons di backend harus menggagalkan build FE, bukan diam-diam
  // lolos lalu muncul sebagai layar kosong di hadapan pengguna.
  eslint: { ignoreDuringBuilds: true },

  // `images.remotePatterns` untuk images.unsplash.com DIHAPUS bersama tiga foto stok di
  // halaman rincian batch. Satu-satunya gambar yang tersisa di aplikasi ini adalah foto
  // bukti lapangan dari R2, yang disajikan lewat domain API — dan izin untuk host yang
  // tidak lagi dipakai adalah pintu yang tetap terbuka tanpa alasan.
};

export default nextConfig;
