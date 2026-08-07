import { FormMasuk } from "@/components/FormMasuk";

/**
 * Pintu masuk Tenant dari halaman depan ("Mulai Menjual").
 *
 * Alasan penggantian sama dengan `auth/buyer/page.tsx`: formulir kata sandi di sini
 * tidak punya padanan di backend dan tidak pernah memanggil API. Autentikasi hanya
 * nomor telepon + OTP, dan akun terbentuk saat verifikasi pertama.
 *
 * Verifikasi legalitas tetap langkah terpisah SETELAH masuk (FR-1.7) — bukan syarat
 * untuk membuat akun.
 */
export default function TenantAuthPage() {
  return (
    <FormMasuk
      peran="TENANT"
      judul="Masuk atau Daftar sebagai Tenant"
      keterangan="Cukup nomor WhatsApp. Verifikasi legalitas dilakukan setelah masuk."
    />
  );
}
