import Link from "next/link";

/**
 * Halaman pendaratan pemindaian QR box.
 *
 * Berkas ini sebelumnya KOSONG (0 byte) sehingga `next build` gagal — Next.js
 * mewajibkan tiap `page.tsx` mengekspor komponen default. Diisi placeholder agar
 * build lolos tanpa menghapus rute yang sudah dibuat tim FE.
 *
 * CATATAN RUTE: segmen `qrToken` di sini masih literal, jadi URL-nya persis
 * `/scan/qrToken`. Endpoint backend-nya `GET /scan/:token` menerima token berbeda
 * untuk tiap box, jadi rute ini kemungkinan perlu jadi `/scan/[qrToken]`.
 */
export default function ScanLandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-8">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-[#0a1c38] mb-3">Pindai QR Box</h1>
        <p className="text-gray-600 mb-6">
          Halaman ini dibuka dengan memindai QR yang tertempel pada box. Setiap box punya kode
          uniknya sendiri, jadi bukalah lewat pemindaian — bukan dari tautan langsung.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-lg bg-[#0a1c38] text-white font-semibold"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
