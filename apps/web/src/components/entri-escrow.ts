import type { EscrowEntryType } from "@agro-os/shared";

/**
 * Tujuh jenis entri buku besar escrow dalam bahasa manusia, berikut arah uangnya.
 *
 * Sebelumnya rinciannya ditampilkan lewat `jenis.replace(/_/g, " ")`, yang menghasilkan
 * "BIAYA BATAL10" dan "RELEASE30" di tengah halaman keuangan. Itu bukan label melainkan
 * nama kolom basis data yang bocor ke layar — dan di dunia ini huruf besar hanya untuk
 * label 10px ber-`tracking-cap`, bukan untuk nilai.
 *
 * `arah` dipakai halaman keuangan untuk menyatakan mana yang menambah hak Tenant dan mana
 * yang menguranginya. Buku besar ini append-only: koreksi selalu entri baru, tidak pernah
 * menimpa yang lama, jadi angka yang saling meniadakan memang tampil berdampingan dan
 * harus bisa dibedakan arahnya.
 */
export const ENTRI_ESCROW: Record<
  EscrowEntryType,
  { label: string; jelas: string; arah: "masuk" | "keluar" }
> = {
  HOLD: {
    label: "Ditahan",
    jelas: "Pembayaran pembeli masuk escrow dan berhenti di sana sampai barangnya diterima.",
    arah: "masuk",
  },
  RELEASE30: {
    label: "Cair sebagian",
    jelas: "Pencairan bertahap setelah pengiriman berjalan.",
    arah: "keluar",
  },
  RELEASE: {
    label: "Cair penuh",
    jelas: "Sisa dana dilepas setelah jendela klaim mutu berakhir.",
    arah: "keluar",
  },
  POTONG_KLAIM: {
    label: "Potongan klaim mutu",
    jelas: "Bagian yang dibayarkan ke pembeli karena klaim mutu yang disetujui.",
    arah: "keluar",
  },
  REFUND: {
    label: "Dikembalikan ke pembeli",
    jelas: "Porsi yang tidak terpenuhi dan dipilih pembeli untuk dikembalikan.",
    arah: "keluar",
  },
  BIAYA_BATAL10: {
    label: "Denda pembatalan",
    jelas: "Denda pembatalan sepihak pembeli, diteruskan penuh kepada Anda.",
    arah: "masuk",
  },
  ALIH_SUBSTITUSI: {
    label: "Dialihkan ke Tenant pengganti",
    jelas: "Dana pindah ke Tenant yang menggantikan pasokan saat panen Anda kurang.",
    arah: "keluar",
  },
};

/** Server boleh mengirim kunci yang belum dikenal FE — dinyatakan apa adanya, bukan disembunyikan. */
export function entriEscrow(jenis: string) {
  return (
    ENTRI_ESCROW[jenis as EscrowEntryType] ?? {
      label: jenis,
      jelas: "Jenis entri ini belum punya keterangan di layar. Angkanya tetap ditampilkan apa adanya.",
      arah: "masuk" as const,
    }
  );
}
