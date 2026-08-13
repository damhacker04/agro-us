import { describe, expect, it } from "vitest";
import { buatHeaderTandaTangan, verifikasiTandaTangan } from "./webhook-signature";

const SECRET = "rahasia-uji-bukan-produksi";
const BODY = Buffer.from(JSON.stringify({ invoiceRef: "AGR-XYZ", status: "PAID" }), "utf8");
const SEKARANG = 1_760_000_000;

describe("verifikasiTandaTangan", () => {
  it("menerima tanda tangan yang dibuat pasangannya sendiri", () => {
    const header = buatHeaderTandaTangan(BODY, SECRET, SEKARANG);
    expect(verifikasiTandaTangan(BODY, header, SECRET, SEKARANG)).toEqual({ sah: true });
  });

  // Inti dari seluruh pagar ini: tanpa secret yang benar, tidak ada yang bisa mencetak
  // "LUNAS". Mengetahui nomor tagihan saja tidak cukup.
  it("menolak tanda tangan dari secret lain", () => {
    const header = buatHeaderTandaTangan(BODY, "secret-penyerang", SEKARANG);
    const hasil = verifikasiTandaTangan(BODY, header, SECRET, SEKARANG);
    expect(hasil.sah).toBe(false);
  });

  // Kasus yang paling penting dan paling mudah lolos dari pengujian dangkal: tanda tangan
  // SAH, tetapi isinya ditukar setelah ditandatangani.
  it("menolak body yang diubah setelah ditandatangani", () => {
    const header = buatHeaderTandaTangan(BODY, SECRET, SEKARANG);
    const diubah = Buffer.from(JSON.stringify({ invoiceRef: "AGR-LAIN", status: "PAID" }), "utf8");
    expect(verifikasiTandaTangan(diubah, header, SECRET, SEKARANG).sah).toBe(false);
  });

  it("menolak callback yang diputar ulang di luar toleransi", () => {
    const header = buatHeaderTandaTangan(BODY, SECRET, SEKARANG);
    const hasil = verifikasiTandaTangan(BODY, header, SECRET, SEKARANG + 3600);
    expect(hasil).toEqual({ sah: false, alasan: expect.stringContaining("Stempel waktu") });
  });

  it("menerima selisih jam server yang wajar", () => {
    const header = buatHeaderTandaTangan(BODY, SECRET, SEKARANG);
    expect(verifikasiTandaTangan(BODY, header, SECRET, SEKARANG + 120).sah).toBe(true);
    // Stempel dari "masa depan" juga wajar: jam mitra bisa lebih maju dari jam kita.
    expect(verifikasiTandaTangan(BODY, header, SECRET, SEKARANG - 120).sah).toBe(true);
  });

  it("menolak saat header hilang, tidak lengkap, atau body kosong", () => {
    expect(verifikasiTandaTangan(BODY, undefined, SECRET, SEKARANG).sah).toBe(false);
    expect(verifikasiTandaTangan(BODY, `t=${SEKARANG}`, SECRET, SEKARANG).sah).toBe(false);
    expect(verifikasiTandaTangan(BODY, "v1=abc", SECRET, SEKARANG).sah).toBe(false);
    expect(verifikasiTandaTangan(BODY, `t=bukan-angka,v1=abc`, SECRET, SEKARANG).sah).toBe(false);
    const header = buatHeaderTandaTangan(BODY, SECRET, SEKARANG);
    expect(verifikasiTandaTangan(undefined, header, SECRET, SEKARANG).sah).toBe(false);
    expect(verifikasiTandaTangan(Buffer.alloc(0), header, SECRET, SEKARANG).sah).toBe(false);
  });

  it("tidak peduli urutan maupun spasi di dalam header", () => {
    const rapi = buatHeaderTandaTangan(BODY, SECRET, SEKARANG);
    const v1 = rapi.split("v1=")[1]!;
    const terbalik = ` v1=${v1} , t=${SEKARANG} `;
    expect(verifikasiTandaTangan(BODY, terbalik, SECRET, SEKARANG).sah).toBe(true);
  });

  // Body mentah, bukan hasil parse yang di-stringify ulang. Payload di bawah punya isi
  // yang sama persis tetapi urutan kunci dan spasi berbeda — dan tanda tangannya memang
  // HARUS berbeda, karena yang ditandatangani mitra adalah byte yang ia kirim.
  it("terikat pada byte, bukan pada isi JSON yang setara", () => {
    const header = buatHeaderTandaTangan(BODY, SECRET, SEKARANG);
    const setaraTapiBedaByte = Buffer.from('{"status":"PAID","invoiceRef":"AGR-XYZ"}', "utf8");
    expect(verifikasiTandaTangan(setaraTapiBedaByte, header, SECRET, SEKARANG).sah).toBe(false);
  });
});
