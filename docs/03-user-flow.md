# AgroUs — User Flow: Tiga Persona dan Titik Interkoneksi — v2.3

> Alur Tenant (Desktop/Tablet), Pembeli (Mobile), dan Kurir (Zero-Install),
> beserta titik interkoneksi antar persona (garis putus-putus).
>
> **v2.1:** alur Kurir menyisipkan layar **input Kode Antar** (`KP`/`KPD`, kunci setelah 5x salah → `KPE`).
>
> **v2.2:** Tenant mendapat `TH1` Tandai Panen + jumlah aktual → `TH3` node GAGAL_PANEN → `TH4` pratinjau.
> Pembeli mendapat `PSB` pilihan terima sebagian dan `PSU` penyaringan opsi substitusi.
>
> **v2.3 — empat perubahan UX:**
> 1. **`THK` Peringatan Kewajaran** — muncul bila laporan hasil di luar pita NDVI, **sebelum** konfirmasi.
>    Tenant melihat konsekuensinya (cap 10% gugur) sebelum menekan, bukan sesudah.
> 2. **`TRP` Posisi Realisasi vs Zona** — menggantikan tampilan rasio shortfall bergaya "jarak menuju ambang".
>    Tidak menampilkan angka ambang (FR-7.12c).
> 3. **`PSN` Banner Senioritas** — pembeli yang dirugikan siklus lalu diberi tahu bahwa ia diprioritaskan (FR-7.13).
> 4. **Rekomendasi Tanam dihapus dari alur MVP** — modul ditunda ke pasca-MVP (§5.8).

```mermaid
---
title: "AgroUs — User Flow: Tiga Persona dan Titik Interkoneksi — v2.3"
---
flowchart TB
    subgraph FT["🧑‍🌾 ALUR TENANT — Desktop/Tablet"]
        T1["Landing Page"] -->|"CTA Mulai Menjual"| T2["Registrasi OTP"]
        T2 --> T3{"OTP benar?"}
        T3 -- "Salah, maksimal 3x" --> T2
        T3 -- "Ya" --> T4["Onboarding: profil bisnis + logo"]
        T4 --> T5["Petakan Poligon Lahan<br/>gambar di peta atau walk-around GPS"]
        T5 --> T6{"Luas minimal 0,1 ha?"}
        T6 -- "Tidak" --> T7["Label: Verifikasi Terbatas"] --> T8
        T6 -- "Ya" --> T8["Dashboard Tenant"]
        T8 --> T9["Buka Kuota PO<br/>harga terkunci + tanggal panen"]
        T8 --> T10["Input Node Timeline<br/>maksimal 3 ketukan + kamera"]
        T8 --> TRP["Reputasi: Posisi Realisasi<br/>vs rata-rata zona<br/>TANPA angka ambang"]
        T10 --> T11{"Node = Panen?"}
        T11 -- "Belum" --> T10
        T11 -- "Ya" --> TH1["Tandai Panen<br/>+ isi jumlah box AKTUAL"]
        TH1 --> THK{"Laporan dalam<br/>pita kewajaran NDVI?"}
        THK -- "Tidak, jauh di bawah" --> THW["Peringatan Kewajaran:<br/>hasil di luar pita, cap 10% akan gugur<br/>wajib konfirmasi eksplisit"]
        THK -- "Awan, tak dapat dinilai" --> THN["Info: tidak dapat dinilai<br/>tanpa konsekuensi penalti"]
        THK -- "Ya" --> TH2
        THW --> TH2
        THN --> TH2
        TH2{"Cukup untuk<br/>semua PO?"}
        TH2 -- "Ya" --> T12["Detail Pesanan Aktif:<br/>Cetak QR + Kode Antar"]
        TH2 -- "Kurang / nihil" --> TH3["Node GAGAL_PANEN:<br/>alasan + foto + GPS"]
        TH3 --> TH4["Pratinjau alokasi<br/>senioritas lalu FIFO<br/>sebelum konfirmasi"]
        TH4 --> T12
        TH4 -.->|"pesanan tak terpenuhi"| PHA
        T12 --> TQ{"Token Kode Antar<br/>terkunci 5x salah?"}
        TQ -- "Ya" --> TQ2["Terbitkan Kode Antar Baru"] --> T12
    end

    subgraph FP["🏪 ALUR PEMBELI — Mobile"]
        P1["Landing Page"] -->|"CTA Cari Produk"| P2["Registrasi / Login OTP"]
        P2 --> P3["Pilih Kota Layanan"]
        P3 --> P4["Katalog Terpadu<br/>filter komoditas + badge verifikasi"]
        P4 --> P5["Detail Produk<br/>timeline, grafik NDVI, grade mutu"]
        P5 --> P6["Keranjang Lintas-Tenant"]
        P6 --> P7{"Memenuhi minimum<br/>order zona?"}
        P7 -- "Tidak" --> P8["Banner: tambah item<br/>agar ongkir efisien"] --> P4
        P7 -- "Ya" --> P9["Rencana Pengiriman<br/>ongkir terkonsolidasi"]
        P9 --> P10["Checkout: penerima, titik peta,<br/>jam operasional + opsi Laporan PDF"]
        P10 --> P11["Pilih QRIS / VA / E-Wallet"]
        P11 --> P12{"Bayar sebelum<br/>kedaluwarsa?"}
        P12 -- "Tidak" --> P13["Layar tagihan kedaluwarsa"] --> P11
        P12 -- "Ya" --> P14["Pesanan Saya<br/>status + timeline + peta live"]
        P14 --> PSN[["Banner Senioritas:<br/>Anda diprioritaskan siklus ini"]]
        PSN --> P14
        P14 --> PD1{"Notifikasi gagal panen<br/>atau shortfall?"}
        PD1 -- "Shortfall, di perbatasan" --> PSB{"Terima sebagian?"}
        PSB -- "Ya" --> PSC["Terima porsi tersedia + refund sisa<br/>senioritas tercatat"] --> P14
        PSB -- "Tidak, tolak semua" --> PHA
        PD1 -- "Gagal total" --> PHA["Layar Harvest Assurance<br/>konteks parsial wajib tampil"]
        PHA --> PSU{"Substitusi tersedia?"}
        PSU -- "Tidak, selisih di atas 10%<br/>dan shortfall wajar" --> PHB["Hanya jadwal ulang<br/>atau refund"]
        PSU -- "Ya" --> PHC["Substitusi / jadwal ulang / refund"]
        PHC -- "Substitusi atau jadwal ulang" --> P14
        PHB -- "Jadwal ulang" --> P14
        PHC -- "Refund" --> PRF["Layar dana dikembalikan<br/>pesanan ditutup"]
        PHB -- "Refund" --> PRF
        PD1 -- "Tidak" --> P15[["Notif bertahap:<br/>1 Dikirim, 2 sekitar 1 km, 3 geofence 100 m"]]
        P15 --> P16{"Respons 60 menit<br/>sejak Notif-3?"}
        P16 -- "Tidak" --> P17["Diterima Otomatis<br/>jendela klaim 24 jam"]
        P16 -- "Ya" --> P18["Konfirmasi 1-Ketuk<br/>+ foto kondisi barang"]
        P17 --> P19{"Ajukan klaim mutu?"}
        P18 --> P19
        P19 -- "Ya" --> P20["Form Klaim:<br/>foto + berat timbang"] --> P21["Layar status klaim"]
        P19 -- "Tidak" --> P22["Layar Pesanan Selesai<br/>+ unduh Laporan Ketertelusuran"]
        P21 --> P22
    end

    subgraph FK["🛵 ALUR KURIR — Zero-Install"]
        K1["Scan QR di box fisik<br/>kamera bawaan / Google Lens"]
        K1 --> K2{"Token valid?"}
        K2 -- "Tidak" --> K3["Halaman: QR tidak berlaku<br/>+ kontak Tenant"]
        K2 -- "Ya" --> KP["Layar input Kode Antar<br/>4 digit dari Tenant"]
        KP --> KPD{"Kode benar?"}
        KPD -- "Salah, sisa percobaan" --> KP
        KPD -- "Terkunci setelah 5x" --> KPE["Layar token terkunci<br/>+ kontak Tenant"]
        KPD -- "Ya" --> K4["Browser: prompt izin lokasi"]
        K4 --> K5{"Izin diberikan?"}
        K5 -- "Tidak" --> K6["Halaman instruksi aktifkan lokasi<br/>atau lanjut tanpa live-track"]
        K5 -- "Ya" --> K7["Halaman pelacakan ringan<br/>di bawah 150KB, biarkan tab terbuka"]
        K7 --> K8[["Sesi berakhir otomatis<br/>setelah konfirmasi Pembeli"]]
    end

    %% ===== TITIK INTERKONEKSI ANTAR PERSONA =====
    T9 -.->|"kuota tampil di katalog"| P4
    T12 -.->|"QR ditempel + kode diberikan"| K1
    KPE -.->|"minta kode baru"| TQ2
    K7 -.->|"geofence 100 m terpicu"| P15
    P18 -.->|"konfirmasi memutus sesi"| K8
    PSC -.->|"senioritas berlaku siklus berikutnya"| PSN

    classDef error fill:#FEF2F2,color:#B91C1C,stroke:#B91C1C;
    classDef push fill:#FFFBEB,color:#B45309,stroke:#B45309;
    classDef done fill:#F0FDF4,color:#14532D,stroke:#14532D,stroke-width:2px;
    classDef baru fill:#FFFBEB,color:#B45309,stroke:#B45309,stroke-width:2px;
    class P8,P13,K3,K6,KPE,T7,TH3,THW error;
    class P15,K8,PSN push;
    class P22,PRF,T12,PSC done;
    class THK,THN,TRP,TH4 baru;
```

## Poin Penting

**1. `THW` adalah layar paling penting yang ditambahkan v2.3.** Tenant melihat *"hasil di luar pita, cap 10% akan gugur"* **sebelum** menekan konfirmasi, bukan menerima notifikasi penalti seminggu kemudian. Ini bukan sekadar UX yang sopan — sistem yang menghukum tanpa peringatan akan kehilangan sisi pasok, dan sisi pasok adalah bagian yang paling sulit diakuisisi.

**2. `THN` sengaja dibuat berbeda dari `THW`.** Keduanya sama-sama "tidak dalam pita", tetapi penyebabnya berbeda: `THW` karena laporannya janggal, `THN` karena langitnya mendung. Menggabungkan keduanya akan membuat Tenant merasa dituduh karena cuaca.

**3. `TRP` menampilkan posisi relatif, bukan jarak menuju hukuman.** Perbandingan langsung dengan v2.2: dulu halaman ini menampilkan rasio shortfall dan peringatan mendekati ambang 15%. Sekarang: *"realisasi Anda di bawah rata-rata zona untuk komoditas ini"*. Angka ambangnya tidak ada di layar mana pun (FR-7.12c).

**4. `PSN` membuat FR-7.13 terlihat oleh penerimanya.** Senioritas yang tidak diberitahukan tidak menghasilkan retensi — pembeli tetap merasa dirugikan dan tetap churn. Banner ini adalah setengah nilai dari mekanismenya.

**5. Interkoneksi `KPE → TQ2` menutup lingkaran yang menggantung di v2.2.** Dulu layar "token terkunci" hanya menyuruh kurir menghubungi Tenant, tanpa jalur balik di sisi Tenant. Sekarang jelas: kurir terkunci → Tenant terbitkan kode baru → kurir masuk lagi.

**6. Rekomendasi Tanam hilang dari alur Tenant.** Bukan karena terlupa — modulnya ditunda (§5.8). Menggambarnya sebagai layar aktif akan membuat desainer mengerjakan halaman yang tidak dibangun.

**7. Setiap cabang error punya layar tujuan.** Tidak ada `-- Tidak -->` yang berujung buntu: `P8`, `P13`, `K3`, `K6`, `KPE`, `T7`, `TH3`, `THW` semuanya adalah state nyata yang harus didesain, bukan sekadar penanda logika.
