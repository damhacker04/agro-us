import type { TimelineActivity } from "@agro-os/shared";

/**
 * Nama tujuh jenis kegiatan timeline dalam bahasa manusia.
 *
 * Ditaruh bersama karena dibaca dari DUA sisi meja: Tenant yang mencatatnya dan pembeli
 * yang memeriksanya. Dua salinan berarti dua kosakata untuk satu kejadian yang sama, dan
 * di produk ini kejadian itu adalah buktinya — "Pengendalian hama" pada satu layar dan
 * "PENGENDALIAN HAMA" pada layar berikutnya membuat orang bertanya apakah keduanya hal
 * yang sama.
 *
 * Sebelumnya `activityType.replace(/_/g, " ")` dipakai di dua tempat: hasilnya huruf besar
 * semua di tengah kalimat, dan itu bukan label — di dunia ini huruf besar hanya untuk label
 * 10px ber-`tracking-cap`.
 */
export const KEGIATAN: Record<TimelineActivity, string> = {
  PENYIAPAN_LAHAN: "Penyiapan lahan",
  PENANAMAN: "Penanaman",
  PEMUPUKAN: "Pemupukan",
  PENGENDALIAN_HAMA: "Pengendalian hama",
  PENGAIRAN: "Pengairan",
  PANEN: "Panen",
  GAGAL_PANEN: "Gagal panen",
};
