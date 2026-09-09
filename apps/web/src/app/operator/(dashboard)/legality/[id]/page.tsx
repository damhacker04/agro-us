"use client";

import React, { useEffect, useState } from "react";
import type { LegalityQueueItem } from "@agro-os/shared";
import { GalatApi, ambilAntreanLegalitas, putuskanLegalitas, urlBerkas } from "@/lib/api";
import { angka, tanggalPanjang } from "@/lib/format-id";
import { PilLegalitas } from "@/components/status-legalitas";
import {
  AreaTeks,
  BarisData,
  Deret,
  Galat,
  Halaman,
  Label,
  Medan,
  Memuat,
  Panel,
  Prosa,
  Sunyi,
  TautanKembali,
  Tombol,
} from "@/ui";

/**
 * OP-03b — Putusan legalitas satu Tenant (FR-1.7, UC-12).
 *
 * MIGRASI DUNIA, dengan tiga hal yang bukan soal rupa:
 *
 * 1. SETUJUI DIKUNCI SELAMA DOKUMENNYA BELUM ADA. Menyetujui legalitas membuka kuota
 *    Pre-Order, dan Pre-Order berarti pembeli membayar di muka atas nama yang tertera di
 *    dokumen itu. Layar lama menawarkan "Setujui" dengan bobot yang sama persis walau tidak
 *    ada satu berkas pun untuk ditinjau — satu klik salah dan yang disetujui adalah nama
 *    yang belum pernah dibuktikan siapa pun.
 *
 * 2. STATUS BERHENTI DICETAK MENTAH. Keadaan "sudah diputus" memuat `{legalityStatus}` apa
 *    adanya, jadi layarnya berbunyi "sudah berstatus REJECTED". Kosakatanya kini di
 *    `@/components/status-legalitas`.
 *
 * 3. TANGGAL TIDAK LAGI LEWAT `toLocaleDateString`. ICU server dan peramban bisa berbeda,
 *    dan selisihnya muncul sebagai hydration mismatch — sama seperti di halaman lain.
 */
export default function OperatorLegalityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const [tenant, setTenant] = useState<LegalityQueueItem | null>(null);
  const [catatan, setCatatan] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState<"setuju" | "tolak" | null>(null);
  const [galat, setGalat] = useState("");
  const [galatCatatan, setGalatCatatan] = useState("");
  const [selesai, setSelesai] = useState<boolean | null>(null);

  useEffect(() => {
    // Tidak ada GET /operator/legality/:tenantId — hanya antrean per status, jadi
    // ketiganya ditelusuri sampai Tenant-nya ketemu.
    Promise.all([
      ambilAntreanLegalitas("PENDING"),
      ambilAntreanLegalitas("APPROVED"),
      ambilAntreanLegalitas("REJECTED"),
    ])
      .then((semua) => {
        const t = semua.flat().find((x) => x.tenantId === id) ?? null;
        setTenant(t);
        setGalat(t ? "" : "Tenant ini tidak ada di ketiga antrean legalitas.");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Tenant gagal dimuat"))
      .finally(() => setMemuat(false));
  }, [id]);

  async function putuskan(setuju: boolean) {
    if (!tenant) return;
    setGalatCatatan("");

    // Penolakan tanpa alasan tidak bisa ditindaklanjuti: Tenant hanya melihat statusnya
    // berubah jadi "ditolak" tanpa tahu apa yang harus diperbaiki sebelum mengajukan ulang.
    if (!setuju && catatan.trim().length === 0) {
      return setGalatCatatan(
        "Alasan penolakan wajib diisi — kalimat ini satu-satunya petunjuk yang diterima Tenant tentang apa yang harus diperbaiki.",
      );
    }

    setProses(setuju ? "setuju" : "tolak");
    setGalat("");
    try {
      await putuskanLegalitas(id, setuju, catatan.trim() || undefined);
      // Sengaja TIDAK langsung kembali ke antrean: putusan ini mengubah apa yang boleh
      // dilakukan sebuah usaha, dan operator berhak melihat bahwa yang tersimpan memang
      // yang ia maksud sebelum layarnya berganti.
      setSelesai(setuju);
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Putusan gagal disimpan.");
      setProses(null);
    }
  }

  const kembali = <TautanKembali href="/operator/legality">Antrean legalitas</TautanKembali>;

  if (memuat) {
    return (
      <Halaman judul="Verifikasi legalitas" kembali={kembali}>
        <Memuat baris={3} label="Memuat data Tenant" />
      </Halaman>
    );
  }

  if (!tenant) {
    return (
      <Halaman judul="Verifikasi legalitas" kembali={kembali}>
        <Galat judul="Tenant tidak ditemukan">
          {galat} Alamat ini mungkin salah ketik, atau pendaftarannya dihapus setelah tautan
          dibuka.
        </Galat>
      </Halaman>
    );
  }

  const dokUrl = tenant.legalityDocUrl ? urlBerkas(tenant.legalityDocUrl) : null;
  const sudahDiputus = tenant.legalityStatus !== "PENDING";

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul={tenant.companyName}
      pengantar={
        tenant.submittedAt
          ? `Mendaftar ${tanggalPanjang(tenant.submittedAt)}`
          : "Tanggal pendaftaran tidak tercatat"
      }
      aksi={<PilLegalitas status={tenant.legalityStatus} />}
    >
      <Panel label="Yang didaftarkan" judul="Cakupan usaha">
        <Deret kolom={2} as="dl">
          <BarisData label="Zona layanan" prosa>
            {tenant.zoneNames.length ? tenant.zoneNames.join(", ") : "Belum memilih zona"}
          </BarisData>
          <BarisData label="Petak lahan">{angka(tenant.landPlotCount)} petak</BarisData>
        </Deret>
      </Panel>

      {/* Satu region jambu per layar. Yang berhak memakainya di sini adalah kotak putusan —
          di situlah tombolnya. Dokumen yang belum ada dinyatakan dengan aturan jambu di dalam
          panel, cara yang sama dengan halaman antrean. */}
      <Panel label="Bahan tinjauan" judul="Dokumen legalitas" className="mt-8">
        {dokUrl ? (
          <>
            <a
              href={dokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[15px] font-semibold text-ungu underline underline-offset-4 transition-colors duration-150 hover:text-ungu-tua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              Buka dokumen (NIB / KTP pemilik)
            </a>
            <Sunyi className="mt-2 text-[13px]">Terbuka di tab baru.</Sunyi>
          </>
        ) : (
          /* Kalimatnya bergantung pada apakah masih ada yang bisa diputus. Menyarankan
             "tolak" di layar yang sudah tidak punya tombol tolak adalah saran yang tidak
             bisa dijalankan siapa pun yang membacanya. */
          <div className="border-t-2 border-jambu pt-3">
            <Label className="text-jambu">
              {sudahDiputus ? "Tidak ada dokumen terlampir" : "Belum ada yang bisa ditinjau"}
            </Label>
            <Prosa className="mt-1.5 text-[14px]">
              {sudahDiputus
                ? "Tidak ada berkas yang tersimpan pada pendaftaran ini, jadi putusannya diambil tanpa dokumen."
                : "Tenant ini belum mengunggah berkas apa pun. Menolak dengan alasan itu memberitahunya apa yang harus dilakukan; membiarkannya menunggu di antrean tidak."}
            </Prosa>
          </div>
        )}
      </Panel>

      {selesai !== null ? (
        /* Layar setelah putusan tersimpan. Bukan sekadar konfirmasi: yang dibaca adalah apa
           yang kini boleh — atau belum boleh — dilakukan Tenant. */
        <Panel
          nada={selesai ? "utama" : "awas"}
          label="Tersimpan"
          judul={selesai ? "Legalitas disetujui" : "Legalitas ditolak"}
          className="mt-8"
        >
          <Prosa className="text-[14px]">
            {selesai
              ? `${tenant.companyName} kini bisa membuka kuota Pre-Order, dan pembeli bisa membayar di muka kepadanya.`
              : `${tenant.companyName} belum bisa membuka kuota Pre-Order. Alasan yang Anda tulis dikirim kepadanya, dan ia bisa mengajukan ulang setelah memperbaikinya.`}
          </Prosa>
          <div className="mt-7">
            <TautanKembali href="/operator/legality">Kembali ke antrean</TautanKembali>
          </div>
        </Panel>
      ) : sudahDiputus ? (
        <Panel label="Sudah diputus" judul="Tidak ada yang perlu Anda lakukan" className="mt-8">
          <Prosa className="text-[14px]">
            Legalitas Tenant ini sudah ditinjau, jadi tidak ada putusan yang menunggu di sini.
            {dokUrl
              ? " Halaman ini tetap bisa dibuka untuk melihat dokumen yang menjadi dasarnya."
              : ""}
          </Prosa>
        </Panel>
      ) : (
        <Panel nada="awas" label="Putusan" judul="Apa yang dibuka oleh persetujuan" className="mt-8">
          <Prosa className="text-[14px]">
            Menyetujui membuka kuota Pre-Order untuk {tenant.companyName} — sejak saat itu
            pembeli bisa membayar di muka
            {dokUrl ? " atas nama yang tertera di dokumen di atas" : " kepadanya"}.
          </Prosa>

          <Medan
            label="Catatan"
            petunjuk="Wajib bila menolak; dibaca Tenant, dan hanya ini yang memberitahunya apa yang harus diperbaiki."
            galat={galatCatatan || undefined}
            className="mt-6"
          >
            {(alat) => (
              <AreaTeks
                {...alat}
                rows={3}
                maxLength={500}
                value={catatan}
                onChange={(e) => {
                  setCatatan(e.target.value);
                  setGalatCatatan("");
                }}
                placeholder="Nama di NIB berbeda dengan nama usaha yang didaftarkan; unggah ulang dokumen atas nama yang sama."
              />
            )}
          </Medan>
          <Sunyi className="mt-1.5 text-right font-mono text-[12px]">{catatan.length}/500</Sunyi>

          {galat ? (
            <Galat judul="Putusan belum tersimpan" className="mt-6">
              {galat}
            </Galat>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <Tombol
              className="flex-1 py-3.5 text-[15px]"
              sibuk={proses === "setuju"}
              labelSibuk="Menyimpan…"
              disabled={proses !== null || !dokUrl}
              onClick={() => putuskan(true)}
            >
              Setujui
            </Tombol>
            <Tombol
              rupa="bahaya"
              className="flex-1 py-3.5 text-[15px]"
              sibuk={proses === "tolak"}
              labelSibuk="Menyimpan…"
              disabled={proses !== null}
              onClick={() => putuskan(false)}
            >
              Tolak
            </Tombol>
          </div>

          {/* Tombol nonaktif tanpa sebab hanya membuat orang mengkliknya berulang kali.
              Sebabnya di sini juga sekaligus jalan keluarnya. */}
          {!dokUrl ? (
            <Sunyi className="mt-3 max-w-[68ch] text-[13px]">
              &ldquo;Setujui&rdquo; terkunci selama belum ada dokumen: yang akan disetujui
              adalah nama usaha yang belum dibuktikan apa pun, padahal pembeli membayar di
              muka kepadanya.
            </Sunyi>
          ) : null}
        </Panel>
      )}
    </Halaman>
  );
}
