"use client";

/**
 * Keranjang belanja — disimpan di peramban, BUKAN di server.
 *
 * Ini keputusan yang disengaja dan sejalan dengan backend: tidak ada tabel keranjang
 * sama sekali. Kuota baru direservasi saat checkout, secara atomik. Kalau keranjang
 * ikut mengunci kuota, satu orang yang menaruh 100 box lalu pergi akan menahan stok
 * yang sebenarnya masih bisa dijual ke pembeli lain.
 *
 * Konsekuensinya jujur: harga dan ketersediaan di keranjang bisa sudah berubah saat
 * checkout. Karena itu backend selalu menghitung ulang dan berhak menolak dengan
 * QUOTA_RACE_LOST — dan UI harus menampilkan penolakan itu apa adanya.
 */
import type { CartLine, CatalogItem } from "@agro-os/shared";

const KUNCI = "agrous.keranjang";

/** Baris keranjang menyimpan tampilan seadanya supaya halaman keranjang tidak perlu
 *  memanggil API sekali per item hanya untuk menampilkan nama. */
export interface BarisKeranjang extends CartLine {
  productName: string;
  tenantName: string;
  unitPriceLocked: number;
  qtyKgPerBox: number;
  claimedHarvestDate: string;
  zoneId: string;
}

/**
 * Satu baris keranjang yang masih bisa dipercaya.
 *
 * `JSON.parse` yang berhasil TIDAK berarti bentuknya benar: `{"oldVersion":1}` adalah
 * JSON yang sah dan dulu dikembalikan apa adanya, sehingga `.reduce` di `jumlahItem`
 * meledak dan seluruh cangkang pembeli ikut mati hanya karena satu kunci penyimpanan
 * tertinggal dari versi lama. Yang dibuang di sini hanya baris yang rusak, bukan seluruh
 * keranjang — pesanan yang masih utuh tidak perlu ikut hilang.
 */
function barisSah(nilai: unknown): nilai is BarisKeranjang {
  if (typeof nilai !== "object" || nilai === null) return false;
  const b = nilai as Record<string, unknown>;
  return (
    typeof b["batchId"] === "string" &&
    typeof b["qtyBox"] === "number" &&
    Number.isInteger(b["qtyBox"]) &&
    (b["qtyBox"] as number) > 0
  );
}

export function bacaKeranjang(): BarisKeranjang[] {
  if (typeof window === "undefined") return [];
  try {
    const isi: unknown = JSON.parse(localStorage.getItem(KUNCI) ?? "[]");
    if (!Array.isArray(isi)) return [];
    return isi.filter(barisSah);
  } catch {
    return [];
  }
}

function tulis(isi: BarisKeranjang[]) {
  localStorage.setItem(KUNCI, JSON.stringify(isi));
  // Komponen lain (mis. penanda jumlah di header) ikut menyegarkan diri.
  window.dispatchEvent(new Event("keranjang:ubah"));
}

export function tambahKeKeranjang(item: CatalogItem, zoneId: string, qtyBox = 1) {
  // `Math.min` saja tidak menjaga apa pun di sisi bawah: `Math.min(-2, 5)` adalah -2,
  // dan baris ber-qty negatif menempel di keranjang sampai checkout, tempat ia
  // MENGURANGI total yang harus dibayar. Jumlah yang tidak masuk akal bukan perintah
  // yang perlu ditafsirkan — ia diabaikan di pintu masuk.
  const diminta = Math.floor(qtyBox);
  if (!Number.isFinite(diminta) || diminta < 1) return;

  const isi = bacaKeranjang();
  const ada = isi.find((b) => b.batchId === item.batchId);
  if (ada) {
    ada.qtyBox = Math.min(ada.qtyBox + diminta, item.quotaBoxAvailable);
  } else {
    isi.push({
      batchId: item.batchId,
      qtyBox: Math.min(diminta, item.quotaBoxAvailable),
      productName: item.productName,
      tenantName: item.tenant.companyName,
      unitPriceLocked: item.lockedPrice,
      qtyKgPerBox: item.qtyKgPerBox,
      claimedHarvestDate: item.claimedHarvestDate,
      zoneId,
    });
  }
  tulis(isi);
}

export function ubahJumlah(batchId: string, qtyBox: number) {
  const isi = bacaKeranjang();
  const b = isi.find((x) => x.batchId === batchId);
  if (!b) return;
  if (qtyBox <= 0) return hapusDariKeranjang(batchId);
  b.qtyBox = qtyBox;
  tulis(isi);
}

export function hapusDariKeranjang(batchId: string) {
  tulis(bacaKeranjang().filter((b) => b.batchId !== batchId));
}

export function kosongkanKeranjang() {
  tulis([]);
}

export const jumlahItem = () => bacaKeranjang().reduce((s, b) => s + b.qtyBox, 0);
