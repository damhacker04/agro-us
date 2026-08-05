/**
 * Layout rute pemindaian QR.
 *
 * Sebelumnya KOSONG (0 byte) sehingga `next build` gagal — Next.js mewajibkan setiap
 * `layout.tsx` mengekspor komponen default. Sengaja dibiarkan telanjang: halaman
 * pemindaian dibuka kurir di ponsel tanpa login, jadi tidak boleh membawa navigasi
 * atau kerangka aplikasi apa pun.
 */
export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
