"use client";

/**
 * Ke mana orang dibawa setelah kodenya diterima.
 *
 * Sebelumnya tujuan hanya dihitung dari peran (`berandaPeran`), dan peran selalu ada
 * sejak token pertama terbit. Akibatnya nomor baru yang belum punya profil usaha tetap
 * dikirim ke dasbor: dasbor Tenant memanggil `/tenant/batches` dan `/tenant/escrow`,
 * keduanya menjawab TENANT_NOT_FOUND, dan orang itu berhenti di layar galat — bukan di
 * onboarding yang halamannya sudah ada. Data peragaan menyembunyikan ini karena setiap
 * akun contoh sudah punya profil.
 *
 * `isNewUser` dari server juga tidak cukup: ia hanya menandai nomor yang BARU dibuat.
 * Orang yang berhenti di tengah onboarding lalu masuk lagi besok bukan pengguna baru,
 * tetapi profilnya tetap belum ada. Karena itu tujuannya dihitung dari KEADAAN PROFIL,
 * dan onboarding yang belum selesai dilanjutkan, bukan diulang dari nol.
 *
 * Gagal jaringan bukan alasan menahan orang di halaman OTP: tujuannya jatuh kembali ke
 * beranda peran, dan halaman tujuan menampilkan galatnya sendiri dengan tombol coba lagi.
 */
import type { AuthUser } from "@agro-os/shared";
import { GalatApi, ambilProfilPembeli, ambilProfilTenant } from "./api";
import { berandaPeran } from "./auth";

/** Benar hanya untuk "profilnya memang belum ada", bukan untuk semua kegagalan. */
function profilBelumAda(err: unknown, kode: string) {
  return err instanceof GalatApi && (err.kode === kode || err.status === 404);
}

export const RUTE_ONBOARDING_TENANT = "/tenant/onboarding/profile";
export const RUTE_ONBOARDING_PEMBELI = "/buyer/onboarding/profile";

export async function tujuanSetelahMasuk(user: AuthUser): Promise<string> {
  if (user.role === "TENANT") {
    try {
      const profil = await ambilProfilTenant();
      // Profil ada tetapi belum satu pun petak dipetakan: langkah 2 onboarding, bukan
      // dasbor. Tanpa lahan, tidak ada kuota yang bisa dibuka sama sekali.
      return profil.landPlotCount === 0 ? "/tenant/onboarding/mapping" : "/tenant";
    } catch (err) {
      if (profilBelumAda(err, "TENANT_NOT_FOUND")) return RUTE_ONBOARDING_TENANT;
      return berandaPeran(user.role);
    }
  }

  if (user.role === "BUYER") {
    try {
      await ambilProfilPembeli();
      return berandaPeran(user.role);
    } catch (err) {
      if (profilBelumAda(err, "BUYER_NOT_FOUND")) return RUTE_ONBOARDING_PEMBELI;
      return berandaPeran(user.role);
    }
  }

  return berandaPeran(user.role);
}
