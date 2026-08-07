import { FormMasuk } from "@/components/FormMasuk";

/**
 * Pintu masuk pembeli dari halaman depan ("Cari Produk").
 *
 * Sebelumnya berisi formulir PENDAFTARAN dengan kata sandi + konfirmasi kata sandi.
 * Tidak ada padanannya di backend: autentikasi hanya nomor telepon + OTP (FR-1.3),
 * dan akun dibuat otomatis saat kode diverifikasi pertama kali — tidak ada endpoint
 * pendaftaran, tidak ada kolom kata sandi di basis data. Formulir lama juga tidak
 * memanggil API sama sekali dan meneruskan ke `/auth/verify?type=buyer`, padahal
 * halaman itu membaca `phone` dan `peran`. Jadi tombol utama di halaman depan
 * berujung buntu.
 *
 * Karena mendaftar dan masuk memang satu alur yang sama, halaman ini kini memakai
 * formulir yang sama persis dengan halaman masuk.
 */
export default function BuyerAuthPage() {
  return (
    <FormMasuk
      peran="BUYER"
      judul="Masuk atau Daftar sebagai Pembeli"
      keterangan="Cukup nomor WhatsApp — akun dibuat otomatis saat kode pertama diverifikasi."
    />
  );
}
