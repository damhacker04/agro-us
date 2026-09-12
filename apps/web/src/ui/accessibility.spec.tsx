import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AreaTeks, Berkas, Centang, Masukan, Medan, Pilihan, Radio } from "./medan";
import { Tombol, TombolTaut, TautanKembali } from "./kendali";
import { Galat, Kosong, Memuat } from "./keadaan";

/** Semantic HTML checks. These do not replace keyboard, screen-reader or visual QA. */
describe("shared UI semantics", () => {
  it("connects a required field to its label, guidance and validation error", () => {
    const html = renderToStaticMarkup(<Medan label="Nama penerima" petunjuk="Nama lengkap" galat="Isi nama penerima" wajib>{(props) => <Masukan {...props} />}</Medan>);
    const inputId = html.match(/<input[^>]*\sid="([^"]+)"/)![1];
    const descriptions = html.match(/aria-describedby="([^"]+)"/)![1].split(" ");
    expect(html).toContain(`for="${inputId}"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('required=""');
    expect(descriptions).toHaveLength(2);
    for (const id of descriptions) expect(html).toContain(`id="${id}"`);
  });
  it("does not mark a valid optional field as erroneous or required", () => {
    const html = renderToStaticMarkup(<Medan label="Patokan">{(props) => <AreaTeks {...props} />}</Medan>);
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("aria-describedby");
    expect(html).not.toContain("required=");
    expect(html).toContain('rows="4"');
  });
  it("retains a native file input in keyboard order", () => {
    const empty = renderToStaticMarkup(<Berkas aria-label="Foto bukti" />);
    expect(empty).toContain('type="file"');
    expect(empty).toContain('class="sr-only"');
    expect(empty).not.toContain('tabindex="-1"');
    expect(empty).toContain("Pilih berkas");
    expect(renderToStaticMarkup(<Berkas nama="bukti.jpg" />)).toContain("bukti.jpg");
  });
  it("does not preselect the paid report checkbox", () => {
    expect(renderToStaticMarkup(<Centang judul="Laporan PDF" />)).not.toContain("checked=");
    expect(renderToStaticMarkup(<Centang judul="Laporan PDF">Rp25.000</Centang>)).toContain("Rp25.000");
  });
  it("explains a disabled choice and retains native radio semantics", () => {
    const html = renderToStaticMarkup(<Radio nama="resolution" nilai="substitute" terpilih={false} onPilih={() => {}} judul="Substitusi" nonaktif="Tidak ada pengganti">Pilih pengganti</Radio>);
    expect(html).toContain('type="radio"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("Tidak ada pengganti");
    expect(renderToStaticMarkup(<Radio nama="payment" nilai="VA" terpilih onPilih={() => {}} judul="VA" />)).toContain('checked=""');
    expect(renderToStaticMarkup(<Radio nama="payment" nilai="VA" terpilih={false} onPilih={() => {}} judul="VA" />)).not.toContain("disabled=");
  });
  it("prevents duplicate submission while communicating progress", () => {
    const html = renderToStaticMarkup(<Tombol type="submit" sibuk labelSibuk="Menyimpan…" penuh>Simpan</Tombol>);
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Menyimpan…");
    expect(html).not.toContain(">Simpan<");
    expect(renderToStaticMarkup(<Tombol sibuk>Simpan</Tombol>)).toContain(">Simpan<");
    expect(renderToStaticMarkup(<Tombol disabled rupa="bahaya" ukuran="sm">Batal</Tombol>)).toContain('disabled=""');
    expect(renderToStaticMarkup(<Tombol>Simpan</Tombol>)).not.toContain("disabled=");
  });
  it("renders navigation as links rather than nested interactive controls", () => {
    for (const component of [<TombolTaut key="taut-pesanan" href="/buyer/orders">Pesanan</TombolTaut>, <TombolTaut key="taut-beranda" href="/tenant" penuh ukuran="sm" rupa="kedua">Beranda</TombolTaut>, <TautanKembali key="taut-kembali" href="/">Kembali</TautanKembali>]) {
      const html = renderToStaticMarkup(component);
      expect(html).toContain("<a ");
      expect(html).not.toContain("<button");
    }
  });
  it("uses alert and polite loading announcements with readable next actions", () => {
    expect(renderToStaticMarkup(<Galat judul="Gagal" aksi={<button>Coba lagi</button>}>Periksa koneksi</Galat>)).toContain('role="alert"');
    expect(renderToStaticMarkup(<Galat>Periksa koneksi</Galat>)).toContain("Periksa koneksi");
    const loading = renderToStaticMarkup(<Memuat label="Memuat pesanan" baris={2} />);
    expect(loading).toContain('aria-live="polite"');
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Memuat pesanan");
    expect(renderToStaticMarkup(<Memuat />)).toContain("Memuat…");
    expect(renderToStaticMarkup(<Kosong judul="Tidak ada pesanan" />)).toContain("Tidak ada pesanan");
    expect(renderToStaticMarkup(<Kosong judul="Kosong" aksi={<button>Katalog</button>}>Pesan dahulu</Kosong>)).toContain("Pesan dahulu");
  });
  it("keeps selects native for standard keyboard behavior", () => {
    expect(renderToStaticMarkup(<Pilihan aria-label="Grade"><option>A</option></Pilihan>)).toContain('<select aria-label="Grade"');
  });
});
