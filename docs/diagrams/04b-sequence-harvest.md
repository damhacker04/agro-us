# AgroUs — Sequence Diagram: Panen → Kewajaran → Alokasi → Assurance → Escrow — v2.3

> **Mengapa sequence ini baru.** Seluruh perubahan v2.3 (pita kewajaran, benchmark, senioritas shortfall)
> berada di alur **panen sampai penyelesaian**, yang pada dokumen v2.2 belum memiliki sequence sama sekali.
> Sequence logistik yang sudah ada — [`04-sequence.md`](04-sequence.md): scan QR → Kode Antar → tracking →
> Dual-Signal PoD — **tetap berlaku tanpa perubahan struktural** dan menjadi pendamping dokumen ini.
>
> Lapisan mengikuti Clean Architecture: **Actor → UI (PWA) → API Gateway → Service → Repository/DB**,
> ditambah dua sistem eksternal (Satellite Worker, Payment Gateway).
>
> **Edge case yang ditangani eksplisit:** puncak NDVI tidak tersedia (awan), benchmark belum cukup
> (< 5 batch pembanding), laporan di luar pita, penilaian marginal → antrean Operator, alokasi bersamaan
> (race condition), porsi terpenuhi di bawah minimum order zona, dan kegagalan disbursement gateway.

```mermaid
---
title: "AgroUs — Sequence: Panen, Kewajaran, Alokasi, Assurance, Escrow — v2.3"
---
sequenceDiagram
    autonumber
    actor T as Tenant
    participant UIT as PWA Tenant
    participant GW as API Gateway
    participant HRV as HarvestService
    participant VER as VerificationService
    participant ALO as AllocationService
    participant ESC as EscrowService
    participant DB as PostgreSQL PostGIS
    participant SAT as Satellite Worker
    participant PG as Payment Gateway
    participant UIP as PWA Pembeli
    actor P as Pembeli

    Note over SAT,DB: Job harian berjalan asinkron jauh sebelum panen dideklarasikan
    SAT->>DB: INSERT observasi NDVI/NDMI per poligon
    SAT->>DB: UPDATE puncak NDVI pada jendela pertumbuhan batch

    T->>UIT: Tandai Panen + isi jumlah box AKTUAL
    UIT->>GW: POST /batches/{id}/harvest {actual_box}
    GW->>HRV: declareHarvest()
    HRV->>DB: SELECT batch, kuota_terjual, poligon, komoditas

    rect rgb(255, 251, 235)
        Note over HRV,DB: FR-4.10 — Penilaian Kewajaran Hasil
        HRV->>VER: assessYieldPlausibility(batch, actual_box)
        VER->>DB: SELECT puncak_ndvi + baseline rendemen komoditas-musim

        alt Puncak NDVI tidak tersedia (awan berkepanjangan)
            VER-->>HRV: TIDAK_DAPAT_DINILAI
            Note over VER,HRV: Tanpa dasar penilaian, sistem TIDAK menghukum (FR-7.12e)
        else Puncak NDVI tersedia
            VER->>VER: Hitung pita = luas x rendemen x faktor_vigor
            VER->>DB: SELECT benchmark zona (komoditas + zona + jendela panen)

            alt Kurang dari 5 batch pembanding
                Note over VER,DB: Cold start — hanya pita individual, tanpa benchmark
                VER-->>HRV: WAJAR atau TIDAK_WAJAR (dasar tunggal)
            else Benchmark tersedia
                VER->>VER: Bandingkan deviasi terhadap rata-rata zona
                alt Dalam pita dan sejalan benchmark
                    VER-->>HRV: WAJAR
                else Marginal
                    VER->>DB: Antrekan tinjauan Operator, SLA 1 hari kerja
                    VER-->>HRV: PERLU_DITINJAU
                else Jauh di bawah pita padahal vegetasi normal
                    VER-->>HRV: TIDAK_WAJAR
                    Note over VER,HRV: Cap 10% akan gugur pada Harvest Assurance (FR-7.11)
                end
            end
        end
        HRV->>DB: Simpan nilai kewajaran + rentang pita pada batch
    end

    opt Nilai = TIDAK_WAJAR
        HRV-->>UIT: Peringatan kewajaran + konsekuensi cap gugur
        T->>UIT: Konfirmasi eksplisit untuk melanjutkan
    end

    rect rgb(240, 253, 244)
        Note over HRV,DB: FR-7.9 + FR-7.13 — Alokasi transaksional
        HRV->>ALO: allocate(batch, actual_box)
        ALO->>DB: BEGIN transaksi lalu SELECT order_items FOR UPDATE
        Note over ALO,DB: Lock mencegah alokasi ganda saat dua panen dideklarasikan bersamaan
        ALO->>DB: ORDER BY senioritas_shortfall DESC, PAYMENTS.paid_at ASC
        ALO->>ALO: Penuhi pesanan UTUH berurutan sampai stok habis
        ALO->>DB: UPDATE qty_box_fulfilled per item lalu COMMIT
        ALO-->>HRV: Ringkasan alokasi + daftar pesanan tidak terpenuhi
    end

    HRV-->>UIT: Pratinjau dampak sebelum konfirmasi
    Note over UIT,T: Contoh: 6 dari 10 pesanan penuh, 4 ditawari Harvest Assurance
    T->>UIT: Konfirmasi
    UIT->>GW: POST /batches/{id}/harvest/confirm
    GW->>HRV: commitHarvest()
    HRV->>DB: Simpan node timeline append-only + rantai hash
    Note over HRV,DB: server_ts node Panen MEMULAI jam umur simpan (FR-5.9).<br/>Bukan tanggal panen yang diketik Tenant: satu-satunya angka<br/>kesegaran yang tidak berasal dari klaim penjual.

    opt Ada pesanan tidak terpenuhi
        HRV->>DB: Simpan node GAGAL_PANEN (alasan + foto + GPS)
        HRV->>DB: Set flag senioritas shortfall bagi pembeli terdampak
        HRV--)UIP: Notifikasi WhatsApp + SMS fallback
    end

    rect rgb(254, 242, 242)
        Note over HRV,DB: FR-7.12 — Penalti kuota berbasis benchmark, bukan ambang tetap
        alt TIDAK_DAPAT_DINILAI
            HRV->>DB: Catat tanpa penalti
        else Deviasi signifikan dan berulang
            HRV->>DB: quota_multiplier 0.70 menjadi 0.50, pulih setelah 2 siklus wajar
            HRV--)UIT: Notifikasi disertai penjelasan perhitungan
            Note over HRV,UIT: Angka ambang TIDAK ditampilkan, hanya posisi relatif (FR-7.12c)
        else Deviasi wajar atau musim buruk merata
            HRV->>DB: Tanpa penalti
        end
    end

    UIP->>P: Tampilkan layar Harvest Assurance + konteks parsial
    P->>UIP: Buka opsi

    alt Porsi terpenuhi di bawah minimum order zona
        UIP-->>P: Tawarkan "tolak seluruhnya" lebih dahulu (FR-7.10)
    end

    UIP->>GW: GET /orders/{id}/assurance-options
    GW->>ESC: getOptions()
    ESC->>DB: SELECT nilai kewajaran + harga batch pengganti sezona

    alt Nilai TIDAK_WAJAR atau tidak terverifikasi
        Note over ESC,DB: Cap 10% GUGUR — Tenant menanggung selisih penuh
        ESC-->>UIP: Substitusi + jadwal ulang + refund
    else Selisih harga substitusi maksimal 10%
        ESC-->>UIP: Substitusi + jadwal ulang + refund
    else Selisih melebihi 10% dan shortfall wajar
        ESC-->>UIP: Hanya jadwal ulang + refund (substitusi disembunyikan)
    end

    P->>UIP: Pilih opsi
    UIP->>GW: POST /orders/{id}/assurance {pilihan}
    GW->>ESC: resolve()

    alt Refund
        ESC->>PG: Instruksi refund dari escrow
        alt Callback gagal atau timeout
            PG-->>ESC: Error
            ESC->>DB: Catat entri gagal, antrekan retry, status tetap tertahan
            ESC--)UIP: Info penundaan yang jujur, bukan halaman error
        else Sukses
            PG-->>ESC: Callback refund sukses
            ESC->>DB: INSERT entri REFUND ke ledger append-only
        end
    else Substitusi
        ESC->>DB: Tautkan replacement_batch_id + catat selisih ditanggung Tenant
    else Jadwal ulang
        ESC->>DB: Pindahkan alokasi ke siklus berikutnya, senioritas tetap melekat
    end

    Note over ESC,PG: Pesanan terpenuhi melanjutkan ke alur logistik — lihat 04-sequence.md
    ESC->>DB: Setelah status Selesai, hitung pencairan PER TENANT
    loop Untuk setiap Tenant dalam order lintas-Tenant
        ESC->>PG: Instruksi disbursement ke rekening Tenant
        PG-->>ESC: Callback sukses
        ESC->>DB: INSERT entri RELEASE ke ledger append-only
    end
    ESC--)UIT: Notifikasi pencairan di dashboard Tenant
```

## Poin Penting

**1. Satellite Worker muncul di awal, bukan saat panen.** Dua pesan pertama menegaskan bahwa NDVI dikumpulkan **asinkron dan jauh sebelumnya**. Kalau penilaian kewajaran harus menunggu tarikan satelit saat itu juga, Tenant akan berdiri di kebun menunggu langit cerah — dan itu persis yang FR-4.9 larang.

**2. Blok `alt` bersarang tiga lapis pada penilaian kewajaran bukan hiasan.** Tiga kegagalan berbeda ditangani berbeda: tidak ada NDVI → tidak dinilai; ada NDVI tapi zona sepi → dasar tunggal; lengkap → penilaian penuh. Sistem yang meruntuhkan ketiganya menjadi satu "gagal" akan menghukum Tenant karena mendung.

**3. `SELECT ... FOR UPDATE` ditampilkan eksplisit.** Alokasi adalah titik race condition paling nyata di sistem ini — dua batch dideklarasikan panen bersamaan pada order yang beririsan akan menghasilkan double-allocation tanpa lock. Ini detail implementasi yang layak terlihat di diagram karena melanggarnya menghasilkan kerugian uang, bukan sekadar bug tampilan.

**4. Urutan `ORDER BY` ditulis apa adanya.** `senioritas_shortfall DESC, paid_at ASC` — dua kolom, satu klausa. Inilah seluruh implementasi FR-7.13, dan menampilkannya mencegah developer menafsirkannya sebagai sistem antrean terpisah.

**5. Kegagalan disbursement punya jalurnya sendiri.** Callback gateway gagal → entri dicatat, dana **tetap tertahan**, retry diantrekan, pembeli diberi info jujur. Bandingkan dengan diagram happy-path yang berhenti di "callback sukses" — di sistem yang memegang uang orang, jalur inilah yang paling sering dipakai di dunia nyata.

**6. `loop` pencairan per Tenant menutup ketidaksesuaian v2.2.** Sequence lama menampilkan satu instruksi pencairan tunggal padahal order bersifat lintas-Tenant dan ERD sudah menyediakan `ESCROW_LEDGER.tenant_id`. Sekarang diagram, ERD, dan FR-7.2 mengatakan hal yang sama.

**7. Tidak ada angka ambang di seluruh diagram.** `Note` pada blok penalti menyatakannya eksplisit. Diagram ini aman ditayangkan ke publik — sebuah persyaratan produk, bukan kebetulan.
