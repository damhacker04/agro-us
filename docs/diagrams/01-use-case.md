# AgroUs — Use Case Diagram (UML 2.5)

> Aktor primer: Tenant/Penjual, Pembeli HORECA, Kurir Pihak Ketiga.
> Aktor sekunder & sistem eksternal: Operator AgroUs, Payment Gateway (Midtrans/Xendit), Copernicus Sentinel-2.

```mermaid
---
title: "AgroUs — Use Case Diagram (UML 2.5)"
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
            UC4(["UC-4<br/>Tandai Panen dan<br/>Cetak QR Box"])
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
            UC10(["UC-10<br/>Verifikasi Satelit<br/>Harian NDVI"])
            UC11(["UC-11<br/>Pencairan Escrow<br/>ke Tenant"])
            UC12(["UC-12<br/>Tinjau Klaim dan<br/>Legalitas Tenant"])
        end
    end

    %% ============ ASOSIASI AKTOR ============
    T --- UC1
    T --- UC2
    T --- UC3
    T --- UC4
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
    UC1 -.->|«include»| UC0
    UC6 -.->|«include»| UC0
    UC6 -.->|«include»| UC6a
    UC6 -.->|«include»| UC6b
    UC9 -.->|«include»| UC9a
    UC8 -.->|«include» sinyal-1| UC9a
    UC3a -.->|«extend»| UC3
    UC7a -.->|«extend» jika gagal panen| UC7
    UC8a -.->|«extend» jika ada keberatan| UC8
    UC12 -.->|«extend» klaim di atas 10 persen| UC8a

    %% ============ STYLING ============
    classDef actor fill:#1F2937,color:#ffffff,stroke:#111827,stroke-width:2px;
    classDef ext fill:#7C2D12,color:#ffffff,stroke:#431407,stroke-width:2px;
    classDef uc fill:#F0FDF4,stroke:#14532D,color:#14532D;
    class T,P,K,OP actor;
    class PG,CO ext;
    class UC0,UC1,UC2,UC3,UC3a,UC4,UC5,UC6,UC6a,UC6b,UC7,UC7a,UC8,UC8a,UC9,UC9a,UC10,UC11,UC12 uc;
```
