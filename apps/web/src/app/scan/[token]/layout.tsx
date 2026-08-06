/**
 * Layout rute pemindaian QR.
 *
 * Sengaja telanjang: halaman ini dibuka kurir di ponsel tanpa login, jadi tidak boleh
 * membawa navigasi atau kerangka aplikasi apa pun. Kurir tidak punya akun dan tidak
 * perlu tahu ada bagian aplikasi lain.
 */
export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
