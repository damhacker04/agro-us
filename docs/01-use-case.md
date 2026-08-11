# AgroUs — Use Case Diagram (UML 2.5) — v2.3

> Aktor primer: Tenant/Penjual, Pembeli HORECA, Kurir Pihak Ketiga.
> Aktor sekunder & sistem eksternal: Operator AgroUs, Payment Gateway (Midtrans/Xendit), Copernicus Sentinel-2.
>
> **v2.1:** tambah **UC-9b Verifikasi Kode Antar** — `«include»` dari UC-9, sebelum UC-9a.
>
> **v2.2:** tambah **UC-4a Deklarasi Gagal/Panen Sebagian** dan **UC-4b Alokasi Shortfall**.
>
> **v2.3:**
> 1. **UC-4c Penilaian Kewajaran Hasil** — `«include»` dari UC-4 (FR-4.10). Inilah yang menutup celah
>    "satelit tidak bisa menghitung box" dan menggantikan ambang tetap 15%.
> 2. **UC-4b diperluas** menjadi *Senioritas + FIFO* (FR-7.13), bukan FIFO murni.
> 3. **UC-12 diperluas** mencakup tinjauan hasil `PERLU_DITINJAU` (FR-7.12a).
> 4. **UC-13 Rekomendasi Tanam** ditampilkan sebagai **[PASCA-MVP]** — didokumentasikan, tidak dibangun.
>
> **Catatan render:** label garis diringkas demi kerapian layout — kondisi lengkap tiap relasi ada di
> tabel **"Kondisi Relasi"** di bawah diagram.

```mermaid
---
title: "AgroUs — Use Case Diagram (UML 2.5) — v2.3"
---
flowchart LR
    %% ============ AKTOR PRIMER ============
    T["👤 Tenant / Penjual"]
    P["👤 Pembeli HORECA"]
    K["👤 Kurir Pihak Ketiga"]

    %% ============ AKTOR SEKUNDER & SISTEM EKSTERNAL ============
    OP["👤 Operator AgroUs"]
    PG["🏦 Payment Gateway<br/>Midtrans / Xendit"]
    CO["🛰️ Copernicus<br/>Sentinel-2"]

    subgraph SYS["SYSTEM BOUNDARY — Platform AgroUs"]
        direction TB
        UC0(["UC-0<br/>Autentikasi OTP"])

        subgraph MT["Modul Tenant"]
            UC1(["UC-1<br/>Onboarding dan Pemetaan<br/>Poligon Lahan"])
            UC2(["UC-2<br/>Kelola Katalog dan<br/>Buka Kuota PO"])
            UC3(["UC-3<br/>Catat Verified Timeline"])
            UC3a(["UC-3a<br/>Ajukan Node Ralat"])
            UC4(["UC-4<br/>Tandai Panen plus<br/>Jumlah Box Aktual"])
            UC4a(["UC-4a<br/>Deklarasi Gagal Panen<br/>atau Panen Sebagian"])
            UC4b(["UC-4b<br/>Alokasi Shortfall<br/>Senioritas lalu FIFO"])
            UC4c(["UC-4c<br/>Penilaian Kewajaran<br/>Hasil Panen"])
            UC4d(["UC-4d<br/>Cetak QR Box dan<br/>Terbitkan Kode Antar"])
        end

        subgraph MP["Modul Pembeli"]
            UC5(["UC-5<br/>Telusuri Katalog<br/>Terpadu per Kota"])
            UC6(["UC-6<br/>Checkout Keranjang<br/>Lintas-Tenant"])
            UC6a(["UC-6a<br/>Konsolidasi Rencana<br/>Pengiriman"])
            UC6b(["UC-6b<br/>Pembayaran dan<br/>Penahanan Escrow"])
            UC7(["UC-7<br/>Pantau Pesanan dan<br/>Verified Timeline"])
            UC7a(["UC-7a<br/>Pilih Opsi<br/>Harvest Assurance"])
            UC8(["UC-8<br/>Konfirmasi Penerimaan<br/>Dual-Signal"])
            UC8a(["UC-8a<br/>Ajukan Klaim Mutu"])
        end

        subgraph ML["Modul Logistik dan Verifikasi"]
            UC9(["UC-9<br/>Aktivasi Pelacakan<br/>via Scan QR"])
            UC9a(["UC-9a<br/>Pancarkan Posisi dan<br/>Deteksi Geofence"])
            UC9b(["UC-9b<br/>Verifikasi Kode Antar"])
            UC10(["UC-10<br/>Verifikasi Satelit<br/>Harian NDVI"])
            UC10a(["UC-10a<br/>Benchmark Realisasi<br/>Lintas-Tenant Sezona"])
            UC11(["UC-11<br/>Pencairan Escrow<br/>per Tenant"])
            UC12(["UC-12<br/>Tinjau Klaim, Legalitas,<br/>dan Kewajaran Hasil"])
        end

        UC13(["UC-13 PASCA-MVP<br/>Rekomendasi Tanam"])
    end

    %% ============ ASOSIASI AKTOR ============
    T --- UC1
    T --- UC2
    T --- UC3
    T --- UC4
    T --- UC4d
    P --- UC5
    P --- UC6
    P --- UC7
    P --- UC8
    K --- UC9
    OP --- UC12
    PG --- UC6b
    PG --- UC11
    CO --- UC10

    %% ============ RELASI INCLUDE / EXTEND ============
    %% Kondisi tiap relasi: lihat tabel "Kondisi Relasi" di bawah diagram.
    UC1 -.->|«include»| UC0
    UC6 -.->|«include»| UC0
    UC6 -.->|«include»| UC6a
    UC6 -.->|«include»| UC6b
    UC9 -.->|«include»| UC9b
    UC9 -.->|«include»| UC9a
    UC8 -.->|«include»| UC9a
    UC3a -.->|«extend»| UC3
    UC4 -.->|«include»| UC4c
    UC4 -.->|«include»| UC4b
    UC4c -.->|«include»| UC10
    UC4c -.->|«include»| UC10a
    UC4a -.->|«extend»| UC4
    UC4a -.->|«include»| UC3
    UC4d -.->|«extend»| UC4
    UC7a -.->|«extend»| UC7
    UC7a -.->|«include»| UC4c
    UC8a -.->|«extend»| UC8
    UC12 -.->|«extend»| UC8a
    UC12 -.->|«extend»| UC4c
    UC13 -.->|«extend» pasca-MVP| UC2

    %% ============ STYLING ============
    classDef actor fill:#1F2937,color:#ffffff,stroke:#111827,stroke-width:2px;
    classDef ext fill:#7C2D12,color:#ffffff,stroke:#431407,stroke-width:2px;
    classDef uc fill:#F0FDF4,stroke:#14532D,color:#14532D;
    classDef baru fill:#FFFBEB,stroke:#B45309,color:#B45309,stroke-width:2px;
    classDef nanti fill:#F3F4F6,stroke:#9CA3AF,color:#6B7280,stroke-dasharray:5 4;
    class T,P,K,OP actor;
    class PG,CO ext;
    class UC0,UC1,UC2,UC3,UC3a,UC4,UC4a,UC4d,UC5,UC6,UC6a,UC6b,UC7,UC7a,UC8,UC8a,UC9,UC9a,UC9b,UC10,UC11,UC12 uc;
    class UC4b,UC4c,UC10a baru;
    class UC13 nanti;
```

## Kondisi Relasi

| Relasi | Jenis | Kondisi / Keterangan | Ref |
|---|---|---|---|
| UC-1 → UC-0 | «include» | Onboarding selalu melalui autentikasi OTP | FR-1.3 |
| UC-6 → UC-0 | «include» | Checkout mensyaratkan login OTP | FR-1.3 |
| UC-6 → UC-6a | «include» | Checkout selalu mengonsolidasi rencana pengiriman | FR-2.4 |
| UC-6 → UC-6b | «include» | Checkout selalu berakhir di pembayaran + penahanan escrow | FR-2.8, FR-7.1 |
| UC-9 → UC-9b | «include» | Kode Antar diverifikasi **sebelum** sesi pelacakan aktif | FR-6.2 |
| UC-9 → UC-9a | «include» | Sesi aktif memancarkan posisi + deteksi geofence | §5.6.2 |
| UC-8 → UC-9a | «include» | **Sinyal-1** dual-signal PoD: geofence memicu notifikasi konfirmasi | §5.6.4 |
| UC-3a → UC-3 | «extend» | Hanya bila Tenant perlu mengoreksi node (node asli tetap tampil) | FR-4.2 |
| **UC-4 → UC-4c** | «include» | **Baru v2.3.** Menandai Panen **selalu** memicu penilaian kewajaran hasil terhadap pita NDVI | FR-4.10 |
| UC-4 → UC-4b | «include» | Menandai Panen selalu menjalankan alokasi ke PO terjual | FR-7.9 |
| **UC-4c → UC-10** | «include» | **Baru v2.3.** Pita kewajaran memerlukan puncak NDVI dari pipeline satelit | §6.2 poin 6 |
| **UC-4c → UC-10a** | «include» | **Baru v2.3.** Penilaian juga membandingkan terhadap benchmark realisasi zona | FR-7.12b |
| UC-4a → UC-4 | «extend» | Hanya bila hasil panen **kurang dari kuota terjual** | FR-7.8 |
| UC-4a → UC-3 | «include» | Deklarasi dicatat sebagai **node timeline `GAGAL_PANEN`** | FR-4.9 |
| UC-4d → UC-4 | «extend» | Hanya setelah status batch = Panen; QR + Kode Antar terbit bersamaan | FR-3.6, FR-6.1 |
| UC-7a → UC-7 | «extend» | Hanya bila **gagal panen atau shortfall** | FR-7.4 |
| **UC-7a → UC-4c** | «include» | **Baru v2.3.** Opsi substitusi yang ditampilkan **bergantung** pada hasil penilaian kewajaran: `TIDAK_WAJAR` menggugurkan cap 10% | FR-7.11 |
| UC-8a → UC-8 | «extend» | Hanya bila ada keberatan mutu dalam jendela klaim | FR-5.3 |
| UC-12 → UC-8a | «extend» | Hanya bila nilai klaim **> 10% nilai order** | FR-5.6 |
| **UC-12 → UC-4c** | «extend» | **Baru v2.3.** Hanya bila penilaian menghasilkan `PERLU_DITINJAU` | FR-7.12a |
| UC-13 → UC-2 | «extend» | **[PASCA-MVP]** Membuka kuota dari rekomendasi. Tidak dibangun di MVP — data dikumpulkan (FR-8.1), antarmuka ditunda | §5.8 |

## Poin Penting

**1. UC-4c adalah jawaban atas satu-satunya lubang moat yang diakui PRD.** Risiko 1b menyatakan satelit tidak dapat menghitung box. UC-4c tidak berpura-pura bisa — ia menilai **kewajaran**, dan itu terlihat dari relasinya: `«include»` ke UC-10 (NDVI individual) **dan** UC-10a (benchmark zona). Dua sumber, bukan satu.

**2. UC-4c di-`include`, bukan di-`extend`.** Penilaian kewajaran berjalan pada **setiap** deklarasi panen, bukan hanya saat mencurigakan. Kalau di-`extend`, artinya sistem baru memeriksa ketika sudah curiga — dan sistem tidak punya cara curiga tanpa memeriksa lebih dulu.

**3. Kurir tetap tidak memiliki garis ke UC-0.** Ini representasi formal dari zero-install: kurir menyentuh sistem tanpa pernah menjadi entitas di dalamnya. Satu-satunya gerbangnya adalah UC-9b.

**4. UC-13 sengaja digambar meski tidak dibangun.** Menghapusnya akan memutus ketertelusuran ke FR-8.2/8.3; menggambarnya penuh akan menyesatkan juri. Gaya abu-abu putus-putus menyatakan keduanya: ada di peta, tidak ada di MVP.

**5. UC-11 kini eksplisit "per Tenant".** Satu order lintas-Tenant menghasilkan beberapa pencairan terpisah — sebelumnya tersirat di ERD tetapi tidak terlihat di Use Case.
