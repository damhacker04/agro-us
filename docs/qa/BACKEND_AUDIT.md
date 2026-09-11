# Audit backend AgroUs — 9–11 September 2026

Backend memakai NestJS modular monolith dengan 15 modul, Prisma/PostgreSQL/PostGIS, REST, Socket.IO dan cron. Pemeriksaan ini menggabungkan penelusuran controller → service → penyimpanan, migration/constraint, kontrak shared, PRD dan diagram, serta unit test dengan dependency eksternal diganti test double. Database PostgreSQL/PostGIS nyata, mitra pembayaran, notifikasi, dan konfigurasi produksi tidak dijalankan dalam pengujian ini.

## Hasil dan batas pengujian

Suite bertambah dari 29 menjadi **563 kasus dalam 35 file**. Mode acceptance ketat menghasilkan **548 lulus dan 15 gagal**; mode normal menandai 15 cacat yang diketahui dengan `it.fails` sehingga Vitest menampilkannya dalam 563 passed. Itu **bukan** 563 requirement yang sudah benar. Jalankan `pnpm test:regressions` untuk mengekspos semua cacat sebagai kegagalan biasa.

Coverage seluruh `apps/api/src/**/*.ts`, dengan hanya test/deklarasi dikecualikan: **statement/baris 61,26% (3.805/6.211)**, fungsi **82,45% (235/285)**, cabang **94,63% (1.146/1.211)** menurut V8. File yang belum diimpor tetap tercakup dalam denominator. Angka branch/function V8 untuk berkas yang belum dieksekusi tidak menggantikan pengujian service/controller tersebut. Coverage 100% proyek belum tercapai.

File bisnis yang mencapai 100% pada empat metrik mencakup service payment, escrow, courier, PoD, QR, claim-window, claim, settlement, harvest, timeline, yield-assessment, anchor, jobs, notification, profil tenant/buyer, legalitas, subscription, catalog/product/batch, hash utility dan adapter lokal/S3. Beberapa tetap mempunyai defect yang direproduksi: coverage penuh tidak menjamin semua invariant benar. Banyak controller/DTO, pemetaan lahan, pesanan tenant, operator, intelligence dan sebagian cabang order/assurance masih belum memiliki coverage memadai. Lihat [angka dan batas pengujian lengkap](TEST_RESULTS.md).

## Cacat yang direproduksi otomatis

P1 = alur inti, integritas, atau kontrol akses berisiko; P2 = fungsi parsial/ketepatan data/operasional; P3 = kasus konfigurasi/perbaikan kecil.

| ID | Prioritas | Temuan, bukti, dan dampak | Arah perbaikan |
|---|---|---|---|
| BE-01 | P1 | `order/payment.service.ts:93–121`: status PENDING dibaca sebelum transaksi; update PAID tidak bersyarat. Dua callback bersamaan sama-sama menulis HOLD dalam fixture konkurensi. Jalur FAILED/expireStale mempunyai pola baca-lalu-update yang sama. | Klaim status secara atomik dalam transaksi, kunci idempotensi unik untuk event/ledger, uji callback versus expiry dengan Postgres nyata. HMAC sah tidak menyelesaikan race. |
| BE-02 | P1 | `timeline/harvest.service.ts:79–82,125`: `confirmedAt` penilaian ditulis sebelum `TimelineService.appendNode` memvalidasi/menyimpan bukti. Saat append gagal, penilaian tetap tampak dikonfirmasi. | Satukan perubahan penilaian, node dan alokasi dalam transaksi yang sama; validasi bukti sebelum commit; uji rollback nyata. |
| BE-03 | P2 | `quality/settlement.service.ts:49–61`: jumlah settled hanya bertambah jika nilai RELEASE > 0. Pengiriman yang sudah refund penuh tetap diubah ke SELESAI oleh `:102`, tetapi hasil job menyebut settled=0 dan heldByPendingClaims=1 walau tidak ada klaim. | Pisahkan hasil status settlement, jumlah uang, dan alasan ditahan. **Bug ini tidak membuktikan status shipment macet**; yang salah adalah ringkasan/observabilitas. |
| BE-04 | P1 | `logistics/pod.service.ts:31–52,101–117`: pengecekan status penerimaan berada di luar transaksi; update tidak memeriksa status sebelumnya. Konfirmasi pembeli bersamaan/auto-terima dapat menulis ulang mode dan tenggat klaim serta menggandakan event. | Conditional transition atau row lock, satu waktu penerimaan yang tetap, hasil idempoten untuk pengulangan. |
| BE-05 | P1 | `assurance/assurance.service.ts:283–286`: JADWAL_ULANG hanya `break`, kemudian membuat resolution pada `:394`. Tidak ada alokasi/item/batch/jadwal baru, tetapi pesan `:527` mengatakan sudah dijadwalkan. | Implementasikan komitmen batch/jadwal berikut, reservasi kuota dan senioritas; atau nyatakan permintaan menunggu penetapan, jangan mengklaim selesai. |
| BE-06 | P2 | `logistics/courier.service.ts:207`: titik tidak masuk akal tetap dipancarkan lewat gateway walau tidak boleh memicu geofence. REST snapshot menyaring `is_plausible=true`. | Jangan broadcast sebagai posisi valid, atau kirim event diagnostik terpisah. FE saat ini polling, sehingga dampak saat ini terutama kontrak stream untuk konsumen WebSocket. |
| BE-07 | P1 | `logistics/tracking.gateway.ts:35`: klien anonim dapat join room shipment yang ID-nya diketahui. UUID bukan pemeriksaan hak akses. | Verifikasi JWT dan kepemilikan pesanan; token kurir hanya untuk sesi yang ditetapkan. |
| BE-08 | P1 | `notification/notification.gateway.ts:35`: room pengguna memakai userId dari klien tanpa verifikasi identitas. | Ambil identitas dari token terverifikasi, bukan payload subscribe. |
| BE-09 | P2 | `storage/storage.service.ts:153–155`: semua kegagalan `stat` diubah menjadi null, termasuk permission error. Bukti yang tidak bisa dibaca tampak hilang/404, mengaburkan gangguan storage. | Tangani ENOENT/ENOTDIR sebagai tidak ada; propagasikan dan pantau kesalahan akses/infrastruktur. |
| BE-10 | P3 | `storage/s3-storage.service.ts:49`: regex fallback r2.dev memeriksa akhir string URL; URL host yang sama dengan `/proof` lolos kebijakan fallback yang diinginkan kode. | Parse `new URL(...).hostname`, validasi konfigurasi; pengujian tidak memverifikasi klaim pemblokiran domain oleh jaringan Indonesia saat ini. |
| BE-11 | P1 | `timeline/timeline.service.ts:127,379`: node di-hash memakai urutan foto unggahan, tetapi verifikasi membaca foto menurut UUID acak. Dua foto sah dengan urutan UUID berbeda membuat `intact:false`. Schema foto tidak menyimpan ordinal. | Tetapkan urutan kanonis yang konsisten saat menulis dan memverifikasi, termasuk strategi kompatibilitas bukti lama; uji round-trip multi-foto dengan database nyata. |
| BE-12 | P1 | `quality/claim.service.ts:169,184,195`: dua operator membaca status menunggu sebelum transaksi, kemudian masing-masing menulis keputusan dan POTONG_KLAIM. Tidak ada unique constraint gatewayRef ledger untuk menahan duplikasi. | Conditional transition/row lock dan idempotency key; pengulangan boleh mengembalikan keputusan yang sama atau konflik, tetapi saldo hanya boleh berubah sekali. |
| BE-13 | P2 | `logistics/qr.service.ts:101` memakai qtyBox pesanan. Fixture dua item dengan 3 box dipesan tetapi hanya 1 terpenuhi tetap menerbitkan 3 token. TERIMA_SEBAGIAN tidak mengubah kuantitas pesanan asal. | Dasarkan label pada box fisik terpenuhi dengan aturan eksplisit untuk null/0; pastikan perilaku substitusi dan split shipment. |
| BE-14 | P2 | `logistics/qr.service.ts:99–118,133`: token dan hash PIN disimpan sebelum `list` menolak SCAN_BASE_URL yang hilang pada production. Pemanggil menerima error setelah state berubah; POST ulang konflik. | Validasi konfigurasi sebelum mutasi dan pulihkan hasil secara idempoten. Bukan kerusakan permanen: sesudah konfigurasi diperbaiki, GET cetak ulang dan penerbitan PIN baru sebelum dispatch dapat memulihkan. |
| BE-15 | P1 | `catalog/batch.service.ts:65,89,123`: dua pembukaan kuota serentak sama-sama melihat petak kosong, lalu masing-masing menyimpan batch aktif. Migration membatasi kapasitas per batch tetapi tidak ditemukan unique constraint petak aktif. | Partial unique index pada land_plot_id untuk PLANNING/GROWING atau penguncian yang setara, tangani konflik sebagai LAND_PLOT_BUSY dan uji dua koneksi PostgreSQL nyata. |

Reproduksi berada di file `*.spec.ts` berpasangan dengan service/gateway terkait. Fixture transaksi menguji orkestrasi dan panggilan yang dihasilkan; belum membuktikan efek isolasi SQL atau semua kemungkinan interleaving produksi.

## Gap tambahan dari inspeksi sumber

1. **Pembayaran, refund dan disbursement nyata belum diintegrasikan.** `PaymentService.buildPayload` menghasilkan payload SIMULASI; `SettlementService` menulis pembukuan, bukan API transfer mitra. Kolom settlement PENDING jujur, tetapi tidak sama dengan transfer berhasil. FR-2.8, FR-7.1/2 dan sequence callback/retry belum lengkap. Ini penilaian implementasi terhadap PRD, bukan pendapat hukum tentang perizinan.
2. **Jangkar eksternal tidak ada.** `timeline/anchor.service.ts:69` menulis `externalRef:null,publishedAt:null`; SHA-256 dan trigger memberi deteksi/perlindungan perubahan biasa, tetapi pemilik database yang dapat menonaktifkan trigger tetap dapat mengubahnya. Hindari klaim tak bisa disentuh admin atau bukti independen penuh sebelum anchor eksternal ada.
3. **SMS/WhatsApp belum keluar.** `notification/sms.service.ts` hanya ConsoleSmsService dan NotificationModule mengikat port ke implementasi itu. FR-10.1 termasuk fallback kanal tidak terbukti. Kegagalan pengiriman belum masuk antrean persisten/outbox.
4. **Jalur PANEN lama melewati langkah penilaian.** `timeline/timeline.controller.ts:65` langsung memanggil `appendNode`; `timeline.service.ts` tidak memanggil `HarvestService.cocokkanPenilaian`. `assessmentId` opsional dalam DTO. Jalur baru dua langkah tidak boleh bisa dilewati lewat endpoint lama (FR-7.8, FR-4.10).
5. **Alasan gagal panen terstruktur belum tersambung.** Kolom FailureReason ada dalam schema, tetapi `CreateNodeDto` dan form FE tidak mengirimkannya; penyisipan timeline tidak menyimpan alasan terstruktur. Ralat sudah didukung backend, tetapi kontrol FE belum tersedia.
6. **Checkout dan invoice berbeda transaksi.** `order/order.service.ts:214` menyimpan order/reservasi; `:290` membuat invoice sesudah transaksi selesai. Kegagalan pembuatan invoice meninggalkan order/reservasi tanpa tagihan. Tambahkan pemulihan/idempotensi atau desain transaksi + outbox, lalu uji fault injection.
7. **QR parsial telah direproduksi.** Ketidaksesuaian jumlah label bukan lagi hanya dugaan dari inspeksi; lihat BE-13 dan BUG-QR-01. Integration test parsial/refund dengan database nyata tetap diperlukan sebelum menyatakan FR-3.6 benar.
8. **Batas akses endpoint belum konsisten.** `GET /shipments/:id/track` sengaja tanpa guard (`logistics.controller.ts:99`). Endpoint mutasi job `/logistics/jobs/auto-accept`, `/payments/expire-stale` juga tidak memiliki guard lokal. Batasi endpoint operasional ke operator/service identity; jangan menyamakan data timeline publik dengan lokasi kiriman/notifikasi privat. Tidak dilakukan akses ke data akun lain dalam audit ini.
9. **Langganan hanya simulasi dan tanggal.** `subscription.service.ts:30–41` menghitung akses dari periodEnd/graceUntil; ini disengaja untuk menghindari kolom status yang belum diperbarui scheduler, bukan bukti bug pembatalan. Schema belum memodelkan status pembatalan. `subscription.controller.ts:43` mengizinkan aktivasi simulasi tenant tanpa saklar demo seperti pembayaran. Recurring invoice, transisi terjadwal dan notifikasi grace belum lengkap (FR-9.1/4). FR-9.2 juga dilanggar worker menurut audit satelit.
10. **PDF ketertelusuran belum selesai.** Checkout membuat TraceabilityReport dan memungut add-on (`order.service.ts:281`), tetapi tidak ditemukan generator/route unduh hasil dalam modul runtime. Menyimpan record laporan belum menyerahkan PDF FR-2.10.

## Ketertelusuran requirement ke implementasi

| Acuan | Implementasi yang ada | Status audit |
|---|---|---|
| FR-1.x / UC-0, UC-1 | OTP, JWT, role, profile, legalitas, lahan PostGIS | Sebagian diuji; onboarding FE terputus, SMS console, geometri/migration nyata belum diuji otomatis |
| FR-2.x / UC-5, UC-6 | Catalog per zona, preview, reservasi kuota, order, invoice | Logic preview/checkout diuji; zona FE tidak tersimpan, gateway dan PDF belum lengkap |
| FR-3.x / UC-2, UC-4d | Product/batch/kuota, legalitas, QR dan PIN | Constraint SQL ada; cacat QR parsial direproduksi; integrasi PostGIS belum terbukti |
| FR-4.1–4.3 / UC-3 | Hash chain, append-only, EXIF/GPS, ralat backend | Fungsi hash murni lulus; verifikasi urutan multi-foto cacat; publikasi anchor dan ralat FE belum ada |
| FR-4.4–4.6 / UC-10 | Worker Python menulis observasi dan status | Worker src coverage100 tetapi empat defect terbuka; hasil lapangan belum tervalidasi |
| FR-4.8–4.10 / UC-4,4a,4c | Batas tanggal tanam, preview kewajaran, konfirmasi dan alokasi | Jalur lama melewati penilaian; confirmedAt tidak atomik; failureReason belum tersambung |
| FR-5.x / UC-8a,UC-12 | Claim window, klaim, operator, umur simpan | Window/claim/settlement diuji unit; race keputusan klaim cacat; umur simpan dan lifecycle SQL belum cukup teruji |
| FR-6.x / UC-9 | QR, PIN, sesi, GPS, fallback | Courier/PoD teruji unit; race penerimaan, stream posisi invalid, privasi tracking terbuka |
| FR-7.1–7.7 / UC-7a,UC-11 | Ledger, settlement, opsi assurance, cancellation | Dana nyata belum berpindah; jadwal ulang belum mengalokasikan; race callback |
| FR-7.8–7.13 / UC-4b,4c | Preview, senioritas+paid_at FIFO, benchmark, penalti | Alokasi diuji sebagian; validasi baseline dan SQL/concurrency perlu integrasi nyata |
| FR-8.x / UC-13 | Agregasi, demand signal, rekomendasi | Dibangun sebagian melampaui scope MVP yang menunda UI; manfaat data historis belum terbukti |
| FR-9.x | Status+grace dan aktivasi simulasi | Billing lifecycle belum ada; badge lapse cacat di worker |
| FR-10.x | Event gateway dan port messaging | Belum ada delivery WA/SMS nyata/inbox persisten; room tidak diotorisasi |

## Clean code, SOLID, dan dokumentasi

**Fondasi baik:** pemisahan controller/DTO/service menurut domain; shared enum/string union; SQL berparameter; sejumlah conditional update dan constraint kuota; transaksi alokasi; port StorageService/SmsService; hash utility murni; scheduler mencegah tumpang-tindih dalam satu proses. Auth memeriksa role pengguna yang ada dari database, memakai pepper, batas percobaan OTP, dan consume atomik.

**Belum clean architecture penuh:** service besar mencampur aturan bisnis, akses Prisma/raw SQL, transaksi, serialisasi response dan notifikasi. YieldAssessmentService, AssuranceService, OrderService dan TimelineService menjadi pusat banyak tanggung jawab. Dependency inversion nyata pada storage/messaging, tetapi sebagian besar use case bergantung langsung pada PrismaService. Kontrak SQL dan shared tetap perlu runtime validation; sekadar memakai TypeScript/NestJS tidak membuktikan SOLID. Tidak cukup bukti untuk menyatakan seluruh hierarki memenuhi atau melanggar Liskov; audit menilai titik coupling dan perilaku konkret, bukan mencentang istilah.

Refactor prioritas: state transition finansial yang atomik, satu entry point penutupan panen, fungsi murni alokasi/penilaian, port transaksi/repository pada modul kompleks, outbox efek samping, kontrak error/respons dan policy sesi. Hindari refactor besar semua modul sekaligus menjelang lomba.

**Diagram juga perlu dikoreksi:** `04b-sequence-harvest.md` menggambar alokasi UPDATE+COMMIT sebelum “pratinjau dampak sebelum konfirmasi”, berlawanan dengan tujuan FR-7.8. Jadikan langkah pertama simulasi alokasi tanpa mutasi order, kemudian satu transaksi commit setelah konfirmasi. Dokumen merujuk `04-sequence.md` yang tidak ada di checkout. PRD v2.4, inventory/diagram v2.3 dan rencana arsitektur v2.2 tidak otomatis konsisten satu sama lain.

## Gate sebelum mengklaim flow selesai

Gunakan database **khusus pengujian** PostgreSQL/PostGIS dengan semua migration; buat akun baru setiap peran; buktikan double-checkout kuota terakhir, webhook duplikat versus expiry, rollback panen/foto, senioritas+FIFO, parsial/substitusi/jadwal ulang/refund, QR/PIN serentak, geofence dengan timestamp basi, auto-terima versus konfirmasi, klaim versus settlement, append-only trigger serta tenant isolation. Unit mocks tidak mengeksekusi query SQL tersebut. Lanjutkan coverage file nol, lalu e2e pada desktop/Android, UAT persona dan smoke test deployment. Jangan menjalankan destructive seed/reset terhadap database yang sudah berisi data pengguna.
