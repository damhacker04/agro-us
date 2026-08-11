# AgroUs — Changelog PRD

> Riwayat keputusan produk. Dipisahkan dari [`PRD.md`](PRD.md) sejak v2.3 agar dokumen utama
> tidak dibuka dengan ~1.200 kata tentang apa yang dulu salah — informasi berharga untuk tim,
> tetapi menanamkan framing keliru bagi pembaca eksternal.

---

## v2.3 — Deteksi Berbasis Benchmark, Fase 0 Validasi, Go-to-Market
**27 Juli 2026**

Berbeda dari v2.1 dan v2.2 yang menambah cakupan, versi ini **memotong cakupan** di dua tempat dan mengganti satu mekanisme yang terbukti dapat dimanipulasi.

| # | Perubahan | Referensi |
|---|---|---|
| 1 | **Ambang shortfall tetap 15% dibuang**, diganti pita kewajaran hasil (NDVI) + benchmark realisasi lintas-Tenant sezona. Ambang internal tidak dipublikasikan. | FR-4.10, §5.7.3, FR-7.12a–f |
| 2 | **Senioritas shortfall** pada alokasi FIFO — pembeli yang terkena shortfall naik ke prioritas teratas siklus berikutnya. | FR-7.13 |
| 3 | **Fase 0 Validasi (3 minggu)** dengan kriteria gugur eksplisit untuk tiga asumsi kritis. | §10.1, §11.1 |
| 4 | **Demand Intelligence dikeluarkan dari MVP** — hanya agregasi data (FR-8.1) yang dibangun. | §5.8, §11.2 |
| 5 | **Komoditas MVP dibatasi** yang tahan suhu ambien; sayuran daun keluar dari lingkup. | §11.2, FR-5.2 |
| 6 | **Go-to-Market & Cold Start** ditambahkan; tiga risiko baru (churn terkonsentrasi, kapabilitas escrow, dokumentasi melampaui produk). | §7, §11.3 |
| 7 | Perbaikan konsistensi: status pengiriman diselaraskan menjadi **7 status** (`Dibatalkan` sebelumnya hanya ada di ERD). | §5.6.1 |
| 8 | Urutan roadmap diubah: **Verifikasi naik mendahului Transaksi**, karena verifikasi adalah satu-satunya pembeda produk. | §11.1 |

**Alasan utama Perubahan 1.** Risiko 1b pada v2.2 sudah jujur mengakui satelit tidak dapat menghitung jumlah box, tetapi konsekuensinya belum ditarik habis: seluruh FR-7.12 berdiri di atas angka yang dilaporkan sendiri oleh Tenant. Ambang tetap yang dipublikasikan bukan pagar, melainkan papan petunjuk — Tenant rasional cukup melaporkan shortfall tepat di bawah ambang setiap siklus dan tidak pernah terkena penalti. Bandingkan dengan rasio klaim (FR-5.7) yang tidak punya masalah ini karena pengaju klaim adalah pembeli, bukan pihak yang diuntungkan bila angkanya salah.

**Alasan utama Perubahan 2.** FIFO atas `PAYMENTS.paid_at` bersifat struktural, bukan acak. Pembeli yang membayar lambat — biasanya yang perlu persetujuan finance, artinya akun bernilai lebih besar — selalu berada di ekor antrean dan terkena shortfall berulang hingga churn. Pro-rata menyebar kerugian; FIFO memusatkannya pada subset tetap.

**Propagasi yang masih perlu dikerjakan ke dokumen lain:**

| Dokumen | Perubahan yang perlu |
|---|---|
| `diagrams/05-erd.md` | `BATCHES.yield_plausibility` (WAJAR/PERLU_DITINJAU/TIDAK_WAJAR/TIDAK_DAPAT_DINILAI) · `BATCHES.expected_yield_min` & `expected_yield_max` · view `ZONE_YIELD_BENCHMARK` · flag senioritas shortfall pada `ORDER_ITEMS` atau `ASSURANCE_RESOLUTIONS` · `SHIPMENTS.status` = 7 nilai |
| `diagrams/02-activity.md` | Node `PEN` diganti percabangan berbasis benchmark; tambah jalur `TIDAK_DAPAT_DINILAI` |
| `diagrams/01-use-case.md` | UC-4b diperluas mencakup senioritas shortfall; pertimbangkan UC baru untuk penilaian kewajaran |
| `PAGE_INVENTORY.md` | TN-27/TN-28 (Rekomendasi Tanam) → tandai pasca-MVP · ER-21 diperbarui (tanpa angka ambang) · halaman baru: posisi relatif realisasi Tenant · penjadwalan ulang mengikuti roadmap §11.1 baru |
| `ARCHITECTURE_PLAN.md` | Modul `verification` mencakup pita kewajaran & benchmark · modul `demand` turun ke pasca-MVP · sprint dipetakan ulang ke Fase 0-5 · tambah item wajib: konfirmasi escrow mitra sebelum Fase 3 |

---

## v2.2 — Panen Sebagian, Langganan & Notifikasi
**25 Juli 2026**

Menutup celah yang ditemukan saat penyusunan inventaris halaman: v2.1 hanya mengenal gagal panen total, padahal realitas agrikultur nyaris selalu berupa panen sebagian.

1. **Panen Sebagian.** FR-7.4 sebelumnya biner (`HARVESTED` / `FAILED`). Ditambahkan sub-alur shortfall dengan alokasi **FIFO berdasarkan `PAYMENTS.paid_at`** — bukan waktu order dibuat, agar tidak dapat di-*gaming* oleh pemesan yang booking duluan tetapi bayar belakangan. *Alasan memilih FIFO atas pro-rata:* pro-rata membuat semua pembeli kekurangan sedikit-sedikit, dan bagi restoran 70% pesanan sering tidak berguna karena menu tidak bisa dimasak setengah. → FR-7.8 s.d. FR-7.12
2. **Deklarasi gagal panen sebagai node timeline.** Tenant mendeklarasikan lewat node append-only (wajib foto + GPS + alasan terstruktur); Harvest Assurance dipicu segera, verifikasi satelit berjalan paralel & asinkron. *Alasan:* pembeli tidak boleh menunggu langit cerah sementara dananya tertahan. Jenis kegiatan timeline: 6 → 7. → FR-4.9
3. **Cap tanggungan selisih substitusi 10%**, konsisten dengan FR-7.5 dan FR-5.5. Gugur bila gagal panen tidak terverifikasi. → FR-7.11
4. **Ambang penalti kuota 15% rolling 2 siklus.** → FR-7.12 *(dibuang di v2.3, lihat di atas)*
5. **Modul Langganan (§5.9) & Notifikasi (§5.10)** — sebelumnya hanya ada di model bisnis dan tabel basis data tanpa requirement. Ditegaskan: badge yang sudah terbit permanen; batch dengan PO terjual tetap diverifikasi meski langganan lapse.
6. **Laporan Ketertelusuran dibundel di checkout**, bukan pembayaran mikro terpisah — biaya gateway akan memakan porsi terlalu besar dari harga laporan. → FR-2.10

---

## v2.1 — Kode Antar Kurir
**25 Juli 2026**

**Perubahan tunggal:** PIN 4 digit sekali pakai per pengiriman pada alur pemindaian QR.

*Latar belakang:* pada v2.0, siapa pun yang memindai QR lebih dulu dapat menghabiskan token sekali-pakai sebelum kurir yang sebenarnya tiba. Kode Antar menutup celah tersebut sekaligus menjadi verifikasi sederhana bahwa pemegang kode memang orang yang menerima barang langsung dari Tenant — tanpa mengorbankan prinsip nol instalasi dan nol akun.

*Konsekuensi ikutan:* token QR berstatus terpakai **setelah kode terverifikasi benar**, bukan saat dipindai.

**Dua keputusan yang ditegaskan** (bukan perubahan perilaku):
1. Dashboard Tenant **tidak** menampilkan metrik performa kurir — kurir tidak memiliki identitas dalam sistem.
2. Pembeli **tidak** memilih ekspedisi saat checkout — pengaturan kurir sepenuhnya di tangan Tenant.

---

## v2.0 — Revisi Strategis
**25 Juli 2026**

Enam perubahan struktural yang mengubah posisi produk dari "marketplace agrikultur dengan fitur pelacakan" menjadi "sistem produksi berbasis permintaan yang terverifikasi".

1. **Timeline Immutable → Verified Timeline.** Pada v1.0 data diinput bebas oleh Tenant lalu dikunci. Kini setiap node wajib disertai bukti mesin (foto ber-EXIF, rantai hash) serta divalidasi silang dengan citra Sentinel-2. *Alasan: data yang tidak diverifikasi hanyalah kebohongan yang dikunci selamanya. Verifikasi adalah moat, immutability bukan.*
2. **Order Satu Tenant → Keranjang Lintas-Tenant.** *Alasan: restoran membutuhkan 30-50 SKU dalam satu pengiriman; order terfragmentasi menghancurkan unit economics.*
3. **Tanpa Refund → Escrow dan Harvest Assurance.** *Alasan: gagal panen adalah kejadian normal dalam agrikultur, bukan pengecualian.*
4. **Geofence Auto-Complete → Dual-Signal PoD.** *Alasan: koordinat GPS bukan bukti serah terima.*
5. **Penambahan Modul Mutu dan Susut** (grade A/B/C, toleransi susut, jendela klaim). *Alasan: mutu dan penolakan barang adalah realitas operasional harian procurement HORECA.*
6. **Reposisi menjadi Demand Intelligence Platform.** *Alasan: aset sesungguhnya bukan transaksi, melainkan data permintaan pra-panen — membalik rantai pasok dari push menjadi pull.* *(Pemanfaatannya ditunda ke pasca-MVP pada v2.3.)*

---

## v1.0 — Draft MVP Awal

Konsep awal: marketplace B2B agrikultur dengan PO pra-panen, timeline immutable, cetak QR logistik, dan geofencing auto-complete. Menjadi dasar seluruh revisi di atas.
