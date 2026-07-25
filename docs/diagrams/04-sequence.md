# AgroUs — Sequence Diagram: Zero-Install Tracking, Dual-Signal PoD, Pencairan Escrow — v2.1

> Alur runtime dari scan QR kurir → **verifikasi Kode Antar** → pelacakan posisi → geofence →
> konfirmasi pembeli (dual-signal PoD) → jendela klaim mutu → pencairan escrow ke Tenant.
>
> **v2.1:** blok `verifyPin` disisipkan setelah token valid. Perhatikan `Note`: token baru
> ditandai `consumed` **di titik kode benar**, bukan saat dipindai — sehingga pemindaian iseng
> tidak menghanguskan token.

```mermaid
---
title: "AgroUs — Sequence Diagram: Zero-Install Tracking, Dual-Signal PoD, Pencairan Escrow — v2.1"
---
sequenceDiagram
    autonumber
    actor K as Kurir
    participant UIK as PWA Kurir
    participant GW as API Gateway
    participant TRK as TrackingService
    participant ORD as OrderService
    participant ESC as EscrowService
    participant DB as PostgreSQL PostGIS
    participant PG as Payment Gateway
    participant UIP as PWA Pembeli
    actor P as Pembeli

    K->>UIK: Scan QR box dengan kamera bawaan
    UIK->>GW: GET /session/{qr_token}
    GW->>TRK: validateToken(qr_token)
    TRK->>DB: SELECT token sekali-pakai + status batch
    DB-->>TRK: record atau null

    alt Token tidak valid atau sudah terpakai
        TRK-->>GW: 403 INVALID_TOKEN
        GW-->>UIK: Halaman "QR tidak berlaku, hubungi Tenant"
    else Token valid
        TRK-->>GW: 200 halaman verifikasi
        GW-->>UIK: Tampilkan kolom Kode Antar 4 digit
        K->>UIK: Masukkan Kode Antar dari Tenant
        UIK->>GW: POST /session/verify-pin
        GW->>TRK: verifyPin(kode)
        TRK->>DB: Cocokkan hash + hitung percobaan
        alt Kode salah - maksimal 5x lalu token terkunci
            TRK-->>UIK: 401 sisa percobaan atau token terkunci
        else Kode benar
            Note over TRK,DB: Token baru terpakai di titik ini, bukan saat dipindai
            TRK->>DB: UPDATE token = consumed, buat sesi lacak
            TRK->>ORD: updateStatus(order, "Dikirim")
            ORD->>DB: UPDATE status + event log append-only
            ORD--)UIP: Push notif "Pesanan Dikirim"
            TRK-->>GW: 200 + session_id
            GW-->>UIK: Halaman pelacakan ringan
        end
    end

    opt Izin lokasi ditolak Kurir
        UIK->>GW: POST /session/no-gps
        GW->>TRK: flagNoLiveTracking()
        Note over TRK,UIP: Peta live nonaktif. Jalur konfirmasi manual Pembeli tetap berjalan.
    end

    loop Setiap 10 detik selama sesi aktif
        UIK->>GW: POST /session/position {lat, lng, ts}
        GW->>TRK: ingestPosition()
        TRK->>TRK: Cek kewajaran kecepatan dan lompatan posisi (anti-spoof)
        TRK->>DB: INSERT posisi (kolom geometry PostGIS)
        TRK--)UIP: Stream posisi via WebSocket
    end

    opt Sinyal terputus melebihi ambang
        TRK--)UIP: Tampilkan posisi terakhir + stempel waktu jujur
    end

    TRK->>DB: ST_DWithin(posisi_kurir, titik_tujuan, 100 m)
    DB-->>TRK: true
    TRK->>ORD: updateStatus(order, "Tiba di Lokasi")
    ORD->>DB: UPDATE status
    ORD--)UIP: Push "Kurir tiba. Konfirmasi penerimaan Anda"
    UIP->>P: Tampilkan tombol konfirmasi + kamera

    alt Sinyal-2 diterima. Pembeli konfirmasi dalam 60 menit
        P->>UIP: Konfirmasi 1-ketuk + foto kondisi barang
        UIP->>GW: POST /orders/{id}/receive + foto
        GW->>ORD: confirmReceipt()
        ORD->>DB: status = "Diterima", jendela klaim = 2 jam
        ORD->>TRK: closeSession() dan token dihanguskan
    else Timeout 60 menit tanpa respons Pembeli
        ORD->>ORD: Scheduler fallback terpicu
        ORD->>DB: status = "Diterima Otomatis", jendela klaim = 24 jam
        ORD--)UIP: Info jendela klaim diperpanjang
        ORD->>TRK: closeSession() dan token dihanguskan
    end

    alt Klaim mutu diajukan dalam jendela
        P->>UIP: Isi form klaim + foto + berat timbang
        UIP->>GW: POST /orders/{id}/claim
        GW->>ORD: fileClaim()
        ORD->>DB: Hitung selisih vs toleransi susut per komoditas
        alt Selisih masih dalam toleransi (5% daun, 3% buah-umbi)
            ORD-->>UIP: Klaim ditolak otomatis, dalam batas toleransi
        else Nilai klaim maksimal 10% nilai order
            ORD->>ESC: deductAndSettle(nilai_klaim)
        else Nilai klaim melebihi 10% nilai order
            ORD->>DB: Antrekan ke Operator, SLA 1 hari kerja
            Note over ORD,DB: Putusan Operator menyesuaikan nilai escrow
            ORD->>ESC: settleByDecision()
        end
    else Jendela klaim berakhir tanpa klaim
        ORD->>DB: status = "Selesai"
        ORD->>ESC: releaseFull()
    end

    ESC->>PG: Instruksi pencairan escrow ke rekening Tenant
    PG-->>ESC: Callback disbursement sukses
    ESC->>DB: Catat pencairan di ledger append-only
    Note over ESC,PG: Notifikasi pencairan tampil di dashboard Tenant
```
