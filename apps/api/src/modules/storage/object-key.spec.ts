import { describe, expect, it } from "vitest";
import { kunciObjekDariPath } from "./object-key";

const D = "a".repeat(64);

describe("kunciObjekDariPath", () => {
  it("menerima bentuk kunci yang memang kita tulis", () => {
    expect(kunciObjekDariPath("aa", `${D}.jpg`)).toBe(`uploads/aa/${D}.jpg`);
    expect(kunciObjekDariPath("ff", `${D}.png`)).toBe(`uploads/ff/${D}.png`);
    expect(kunciObjekDariPath("00", `${D}.webp`)).toBe(`uploads/00/${D}.webp`);
    expect(kunciObjekDariPath("AA", `${D.toUpperCase()}.JPEG`)).not.toBeNull();
  });

  // Rute ini menerjemahkan potongan URL menjadi kunci penyimpanan. Tanpa pagar, potongan
  // itu bisa dipakai menyusuri isi bucket atau keluar dari direktori unggahan.
  it("menolak percobaan keluar dari direktori", () => {
    expect(kunciObjekDariPath("..", "..")).toBeNull();
    expect(kunciObjekDariPath("aa", "../../etc/passwd")).toBeNull();
    expect(kunciObjekDariPath("..%2f..", `${D}.jpg`)).toBeNull();
    expect(kunciObjekDariPath("aa", `..\${D}.jpg`)).toBeNull();
  });

  it("menolak kunci yang tidak berbentuk digest", () => {
    expect(kunciObjekDariPath("aa", "rahasia.jpg")).toBeNull();
    expect(kunciObjekDariPath("zz", `${D}.jpg`)).toBeNull();
    expect(kunciObjekDariPath("aaa", `${D}.jpg`)).toBeNull();
    expect(kunciObjekDariPath("aa", `${"a".repeat(63)}.jpg`)).toBeNull();
  });

  it("menolak ekstensi di luar format gambar yang kita simpan", () => {
    expect(kunciObjekDariPath("aa", `${D}.html`)).toBeNull();
    expect(kunciObjekDariPath("aa", `${D}.svg`)).toBeNull();
    expect(kunciObjekDariPath("aa", D)).toBeNull();
  });
});
