import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { urlUnggahanSah } from "./uploaded-url.validator";

const DIGEST = "a".repeat(64);
const LOKAL = `/uploads/aa/${DIGEST}.jpg`;

describe("urlUnggahanSah", () => {
  const asli = process.env["S3_PUBLIC_URL"];
  afterEach(() => {
    if (asli === undefined) delete process.env["S3_PUBLIC_URL"];
    else process.env["S3_PUBLIC_URL"] = asli;
  });

  describe("tanpa S3 (disk lokal)", () => {
    beforeEach(() => {
      delete process.env["S3_PUBLIC_URL"];
    });

    it("menerima path unggahan lokal yang berbentuk benar", () => {
      expect(urlUnggahanSah(LOKAL)).toBe(true);
      expect(urlUnggahanSah(`/uploads/aa/${DIGEST}.png`)).toBe(true);
      expect(urlUnggahanSah(`/uploads/aa/${DIGEST}.webp`)).toBe(true);
    });

    // Inti perbaikan ini. Aturan lama menerima URL absolut apa pun, sehingga foto bukti
    // boleh menunjuk server milik pengirimnya sendiri — isinya bisa berubah setelah
    // diperiksa Operator, atau lenyap tepat saat sengketa muncul.
    it("MENOLAK URL absolut milik orang lain", () => {
      expect(urlUnggahanSah("https://server-penyerang.example/foto.jpg")).toBe(false);
      expect(urlUnggahanSah("http://localhost:9999/foto.jpg")).toBe(false);
    });

    it("menolak path yang tidak berbentuk hasil unggahan", () => {
      expect(urlUnggahanSah("/uploads/../../etc/passwd")).toBe(false);
      expect(urlUnggahanSah("/uploads/aa/bukan-digest.jpg")).toBe(false);
      expect(urlUnggahanSah(`/uploads/aa/${DIGEST}.html`)).toBe(false);
      expect(urlUnggahanSah(`/uploads/aa/${DIGEST}`)).toBe(false);
    });

    it("menolak yang bukan string atau kosong", () => {
      expect(urlUnggahanSah(undefined)).toBe(false);
      expect(urlUnggahanSah(null)).toBe(false);
      expect(urlUnggahanSah(123)).toBe(false);
      expect(urlUnggahanSah("")).toBe(false);
    });
  });

  describe("dengan S3/R2 aktif", () => {
    beforeEach(() => {
      process.env["S3_PUBLIC_URL"] = "https://bukti.agro-us.id";
    });

    it("menerima URL di bawah base publik kita", () => {
      expect(urlUnggahanSah(`https://bukti.agro-us.id/uploads/aa/${DIGEST}.jpg`)).toBe(true);
    });

    it("tetap menerima path lokal lama supaya baris lama tidak menjadi tidak sah", () => {
      expect(urlUnggahanSah(LOKAL)).toBe(true);
    });

    // Dua bentuk yang lolos dari pemeriksaan `startsWith` pada string — dan itulah
    // sebabnya origin dibandingkan lewat URL yang sudah diurai.
    it("menolak domain yang hanya BERAWALAN sama", () => {
      expect(urlUnggahanSah(`https://bukti.agro-us.id.penyerang.com/uploads/aa/${DIGEST}.jpg`)).toBe(
        false,
      );
    });

    it("menolak penyelundupan lewat userinfo", () => {
      expect(urlUnggahanSah(`https://bukti.agro-us.id@penyerang.com/uploads/aa/${DIGEST}.jpg`)).toBe(
        false,
      );
    });

    it("menolak skema dan port yang berbeda", () => {
      expect(urlUnggahanSah(`http://bukti.agro-us.id/uploads/aa/${DIGEST}.jpg`)).toBe(false);
      expect(urlUnggahanSah(`https://bukti.agro-us.id:8443/uploads/aa/${DIGEST}.jpg`)).toBe(false);
    });

    it("menolak berkas non-gambar walau berada di bucket kita", () => {
      expect(urlUnggahanSah("https://bukti.agro-us.id/uploads/aa/x.html")).toBe(false);
    });

    it("menghormati prefix path pada base publik", () => {
      process.env["S3_PUBLIC_URL"] = "https://cdn.example.com/agro/";
      expect(urlUnggahanSah(`https://cdn.example.com/agro/uploads/aa/${DIGEST}.jpg`)).toBe(true);
      // Di luar prefix — bucket yang sama, tetapi bukan wilayah kita.
      expect(urlUnggahanSah(`https://cdn.example.com/lain/uploads/aa/${DIGEST}.jpg`)).toBe(false);
    });
  });
});
