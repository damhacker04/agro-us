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

  images: {
    // Katalog mockup memakai gambar contoh dari Unsplash.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
