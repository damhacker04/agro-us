# AgroUs — User Flow: Tiga Persona dan Titik Interkoneksi

> Alur Tenant (Desktop/Tablet), Pembeli (Mobile), dan Kurir (Zero-Install),
> beserta titik interkoneksi antar persona (garis putus-putus).

```mermaid
---
title: "AgroUs — User Flow: Tiga Persona dan Titik Interkoneksi"
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
        T10 --> T11{"Node = Panen?"}
        T11 -- "Belum" --> T10
        T11 -- "Ya" --> T12["Layar Cetak QR Box"]
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
        P9 --> P10["Checkout: penerima, titik peta,<br/>jam operasional terima"]
        P10 --> P11["Pilih QRIS / VA / E-Wallet"]
        P11 --> P12{"Bayar sebelum<br/>kedaluwarsa?"}
        P12 -- "Tidak" --> P13["Layar tagihan kedaluwarsa"] --> P11
        P12 -- "Ya" --> P14["Pesanan Saya<br/>status + timeline + peta live"]
        P14 --> PD1{"Notifikasi<br/>gagal panen?"}
        PD1 -- "Ya" --> PHA["Layar Harvest Assurance:<br/>substitusi / jadwal ulang / refund"]
        PHA -- "Substitusi atau jadwal ulang" --> P14
        PHA -- "Refund" --> PRF["Layar dana dikembalikan<br/>pesanan ditutup"]
        PD1 -- "Tidak" --> P15[["Push: Kurir Tiba di Lokasi"]]
        P15 --> P16{"Respons dalam<br/>60 menit?"}
        P16 -- "Tidak" --> P17["Diterima Otomatis<br/>jendela klaim 24 jam"]
        P16 -- "Ya" --> P18["Konfirmasi 1-Ketuk<br/>+ foto kondisi barang"]
        P17 --> P19{"Ajukan klaim mutu?"}
        P18 --> P19
        P19 -- "Ya" --> P20["Form Klaim:<br/>foto + berat timbang"] --> P21["Layar status klaim"]
        P19 -- "Tidak" --> P22["Layar Pesanan Selesai"]
        P21 --> P22
    end

    subgraph FK["🛵 ALUR KURIR — Zero-Install"]
        K1["Scan QR di box fisik<br/>kamera bawaan / Google Lens"]
        K1 --> K2{"Token valid?"}
        K2 -- "Tidak" --> K3["Halaman: QR tidak berlaku<br/>+ kontak Tenant"]
        K2 -- "Ya" --> K4["Browser: prompt izin lokasi"]
        K4 --> K5{"Izin diberikan?"}
        K5 -- "Tidak" --> K6["Halaman instruksi aktifkan lokasi<br/>atau lanjut tanpa live-track"]
        K5 -- "Ya" --> K7["Halaman pelacakan ringan<br/>di bawah 150KB, biarkan tab terbuka"]
        K7 --> K8[["Sesi berakhir otomatis<br/>setelah konfirmasi Pembeli"]]
    end

    %% ===== TITIK INTERKONEKSI ANTAR PERSONA =====
    T9 -.->|"kuota tampil di katalog"| P4
    T12 -.->|"QR ditempel di box"| K1
    K7 -.->|"geofence 100 m terpicu"| P15
    P18 -.->|"konfirmasi memutus sesi"| K8

    classDef error fill:#FEF2F2,color:#B91C1C,stroke:#B91C1C;
    classDef push fill:#FFFBEB,color:#B45309,stroke:#B45309;
    classDef done fill:#F0FDF4,color:#14532D,stroke:#14532D,stroke-width:2px;
    class P8,P13,K3,K6,T7 error;
    class P15,K8 push;
    class P22,PRF,T12 done;
```
