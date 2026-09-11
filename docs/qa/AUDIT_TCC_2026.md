# Audit menyeluruh AgroUs untuk TCC 2026

Tanggal pemeriksaan: 9–11 September 2026. Kesimpulan: **ide dan fondasi AgroUs layak dibawa ke lomba pengembangan web, tetapi versi yang diperiksa belum siap dinyatakan lengkap, bebas bug, atau mudah digunakan secara mandiri oleh seluruh persona. Target unit coverage 100% untuk seluruh proyek belum tercapai.**

Cabang Vibe Code / Web Application Development, presentasi 31 Oktober 2026, serta bobot teknologi dan AI 30%, fungsionalitas 30%, inovasi 25%, UI/UX 15% mengikuti ringkasan dokumen lomba yang diberikan pemilik proyek. PDF dan aturan lengkap penyelenggara belum diperiksa langsung; laporan ini bukan verifikasi kelayakan administratif atau prediksi nilai juri.

## Cara membaca hasil

Audit mencakup inventaris seluruh sumber milik proyek, hubungan FE–BE–worker, schema/migration, alur berisiko, requirement dan diagram di `docs`, ditambah pengujian unit/komponen. Pemeriksaan seluruh struktur tidak berarti setiap kombinasi input pada setiap layar sudah diuji. Tidak dilakukan transfer uang, pengiriman SMS/WhatsApp nyata, migrasi/reset database pengguna, perubahan cloud, atau penulisan data produksi.

| Dokumen | Isi |
|---|---|
| [Hasil pengujian](TEST_RESULTS.md) | Jumlah kasus, coverage seluruh sumber, perintah reproduksi, kegagalan yang masih terbuka dan batas bukti |
| [Struktur proyek](PROJECT_STRUCTURE.md) | Peta folder, seluruh sumber, route aktif, modul, migration dan placeholder |
| [Frontend dan UX](FRONTEND_AUDIT.md) | 20 kelompok temuan FE, penilaian tiap persona, bukti file/baris dan saran |
| [Backend](BACKEND_AUDIT.md) | Integritas transaksi, akses, clean code/SOLID dan matriks requirement→implementasi |
| [Worker satelit](SATELLITE_AUDIT.md) | Coverage 100%, empat cacat keputusan/citra, dan keterbatasan validasi lapangan |
| [Tutorial pengguna](USER_GUIDE.md) | Langkah tenant, pembeli, kurir dan operator berdasarkan layar yang ada |
| [Diagram arsitektur aktual](../diagrams/06-architecture-as-built.md) | Komponen nyata, integrasi yang belum tersedia, dan alur transaksi |

Label **direproduksi** berarti ada test yang menunjukkan pelanggaran perilaku yang diharapkan. Label **inspeksi sumber** berarti implementasi dibaca tetapi skenario belum dieksekusi menyeluruh pada sistem nyata. Label **belum diverifikasi** tidak berarti komponennya pasti tidak ada di cloud.

## 1. Apakah sudah mudah digunakan?

**Belum untuk onboarding dan transaksi mandiri.** Bahasa Indonesia, harga per box, grade, label status, navigasi per peran, QR+PIN tanpa akun kurir, dan pratinjau konsekuensi panen adalah fondasi yang membantu. Namun kemudahan tampilan tidak cukup bila pengguna baru tidak bisa mencapai transaksi.

| Persona | Kesesuaian saat ini | Gap utama |
|---|---|---|
| Petani/pengelola kebun | Alur tenant mencakup lahan, produk, batch, kegiatan dan pengiriman | OTP tidak melanjutkan onboarding; koordinat manual; belum ada draft offline; ralat/alasan gagal panen belum lengkap |
| Pemilik lahan yang mengelola produksi | Dapat memakai peran tenant dan banyak petak | Pemilik pasif, sewa/bagi hasil, delegasi ke penggarap belum dimodelkan |
| Restoran/cafe | Pembelian prapanen, keranjang lintas tenant, mutu dan klaim relevan | Profil pembeli baru belum tersedia; wilayah katalog dan order bisa berbeda; titik pengiriman sulit diisi; multi-outlet dan pembelian berulang belum ada |
| Distributor | Dapat berperan sebagai pembeli institusional | Belum mencakup gudang, jual ulang, stok distribusi, approval pembelian dan peran membeli+menjual sekaligus |
| Kurir | Masuk melalui QR dan PIN sederhana | Keandalan GPS/tab di ponsel, pemulihan sesi, timestamp posisi dan navigasi tujuan perlu perbaikan |
| Operator | Antrean per domain dan detail bukti tersedia | Logout tidak menghapus token; notifikasi/SLA dan penggunaan data besar belum dibuktikan |

Kebutuhan tambahan distributor atau pemilik pasif adalah **batas segmen produk**, bukan otomatis pelanggaran PRD. Pilih segmen utama: tenant penghasil sayur/buah dan pembeli usaha pada satu zona layanan. Jangan menjanjikan satu produk menggantikan seluruh proses semua persona.

Prioritas UX: sambungkan profil baru, simpan zona ke server, samakan logout, tampilkan total final sebelum order dibuat, ganti koordinat tujuan dengan pemilihan lokasi yang dapat dipahami, dukung koreksi OTP dan draft kegiatan, serta tampilkan kegagalan mengambil data sebagai error yang dapat dicoba ulang.

Penilaian ini bersifat heuristik dan berdasarkan sumber/komponen. Belum ada pengukuran task success, waktu penyelesaian, SUS, atau uji pengguna petani/restoran nyata; tidak ada dasar untuk memberi angka kepuasan atau menyatakan aksesibilitas tersertifikasi.

## 2. Apakah flow, clean code, SOLID dan diagram sudah konsisten?

**Sebagian fondasinya baik; seluruh flow belum konsisten dan belum 100% selesai.** NestJS dibagi menurut domain, ada DTO/guard, kontrak bersama, beberapa transaksi dan conditional update, trigger integritas, utility hash murni, serta adapter storage/messaging. Pilihan modular monolith sesuai untuk tim kecil dan demo ini.

Masalah utamanya ada pada state dan batas transaksi: dua callback dapat mencatat HOLD ganda; konfirmasi penilaian panen bisa tersimpan saat bukti gagal; penerimaan bersamaan tidak atomik; “jadwal ulang berhasil” belum memindahkan alokasi; room WebSocket tidak memeriksa identitas. Pembayaran, penyaluran/refund dana, messaging dan anchor eksternal juga belum merupakan integrasi nyata. Bukti lebih rinci dan temuan tambahan ada di audit backend.

Pada FE, halaman besar mencampur pemanggilan API, state bisnis dan rendering. Sesi, profil serta zona tidak menjadi satu alur yang konsisten. Cast TypeScript terhadap JSON tidak memvalidasi bentuk data saat runtime. Backend juga masih memakai service besar yang menggabungkan Prisma/raw SQL, aturan bisnis, transaksi dan efek samping.

Penilaian SOLID harus proporsional: pemisahan tanggung jawab dan dependency inversion sudah terlihat pada sebagian modul; belum merata. Tidak cukup bukti untuk mengklaim seluruh proyek memenuhi lima prinsip, maupun untuk menyatakan setiap prinsip dilanggar. Refactor dimulai dari transisi status, fungsi domain murni, batas transaksi dan port integrasi yang kompleks; jumlah interface bukan ukuran kualitas.

Dokumen belum menjadi satu sumber kebenaran: PRD v2.4, inventory/diagram v2.3 dan architecture plan v2.2 berbeda; ada tautan ke dokumen yang tidak ditemukan. Sequence panen bahkan menggambar commit alokasi sebelum preview, sementara requirement menginginkan preview sebelum konfirmasi. Definisikan state machine yang disepakati dan perbarui diagram bersamaan dengan test. Jumlah halaman/state pada dokumen tidak dapat dijadikan persentase fitur selesai.

**70% vibe coding tidak otomatis membuat proyek buruk atau bagus.** Yang menentukan adalah kemampuan menjelaskan keputusan, membuktikan invariant, menelusuri error, menjaga kontrak dan memperbaiki cacat. Audit menemukan kedua sisi: fondasi teknis nyata dan sambungan alur yang masih berlubang. Simpan riwayat kontribusi AI serta keputusan yang ditinjau manusia untuk mendukung penjelasan lomba.

## 3. Tutorial sebagai pengguna

Panduan rinci terdapat di [USER_GUIDE.md](USER_GUIDE.md), termasuk hambatan yang masih ada. Alur utamanya:

1. **Tenant:** masuk dan lengkapi profil → petakan lahan → ajukan legalitas → tambah produk → buka batch/kuota → catat budidaya → pratinjau dan konfirmasi panen → siapkan pesanan → QR+Kode Antar → pantau settlement.
2. **Pembeli:** profil usaha dan zona → katalog → keranjang → titik/jam penerimaan → checkout dan pembayaran simulasi → pantau pesanan → pilih penyelesaian shortfall bila ada → konfirmasi terima dengan foto → klaim dalam jendela yang ditampilkan.
3. **Kurir:** scan QR → PIN dari tenant → izinkan GPS → antar barang → pembeli mengonfirmasi penerimaan.
4. **Operator:** tinjau legalitas, klaim dan kewajaran/satelit → putuskan dengan alasan → pantau antrean dan pembukuan.

Saat audit, pendaftaran baru belum tersambung penuh. Demo dapat memakai akun pengujian berprofil lengkap, tetapi skenario tersebut tidak membuktikan onboarding sudah lulus. Tombol “Saya sudah bayar” bukan bukti transaksi bank; pilihan jadwal ulang belum membuat alokasi baru; PDF berbayar belum memiliki hasil yang dapat diunduh.

## 4. Infrastruktur dan arsitektur

**Struktur repositori cukup tertata; kesiapan operasional masih parsial.** Pemisahan `apps/web`, `apps/api`, `apps/satellite-worker`, `packages/shared`, migration, dan docs jelas. Runtime API adalah satu aplikasi modular; worker satelit job terpisah yang mengakses database bersama. Tidak perlu mengubahnya menjadi microservice untuk tampil meyakinkan.

| Area | Yang ada | Gap / tindak lanjut |
|---|---|---|
| Build dan kontrak | pnpm lockfile, Turborepo, build shared/API/web, Prisma | Root type-check sebelumnya tidak memeriksa web; script sudah ditambahkan. Web masih `strict:false`. Pisahkan refactor strict bertahap |
| QA dan CI | Test, coverage, gate regression dan workflow QA ditambahkan dalam audit ini | Workflow baru belum dijalankan GitHub. Gate acceptance dan target coverage100% akan merah sampai syaratnya terpenuhi. API lint placeholder dan `next lint` pada web masih gagal |
| Database | PostgreSQL/PostGIS, FK/constraint, trigger, migration | Belum menjalankan suite integrasi SQL/concurrency; rollback/recovery migration, backup restore dan hak akses akun cloud belum diverifikasi |
| Kesehatan layanan | `/health`, jadwal keepalive | Health hanya liveness, belum readiness database/storage. Uji cold start, dependency outage dan target latency |
| Scheduler | Cron NestJS dengan lock satu proses; satelit via Actions | Lock tidak lintas replika; restart/duplikasi perlu idempotensi dan koordinasi database. Jadwal satelit dapat skip jika secret tidak ada; keberadaan secret aktual belum dicek |
| Storage | Adapter lokal/S3, validasi kunci/URL, R2 menurut README | Fallback disk berisiko hilang pada host tanpa volume persisten; dokumen legalitas/PoD perlu klasifikasi privat dan otorisasi akses |
| Efek samping | Socket.IO, port SMS, ledger dan anchor internal | Otorisasi room kurang, belum outbox/retry persisten, channel nyata belum tersambung, anchor independen belum diterbitkan |
| Konfigurasi | Contoh env dan konfigurasi deployment dijelaskan | Frontend mempunyai fallback URL API demo; validasi environment wajib agar pengujian lokal tidak mengarah ke layanan yang keliru. Secret cloud tidak diaudit |
| Observabilitas | Log proses dan status job | Bukti alert kegagalan, correlation ID lintas alur, error monitoring dan restore drill belum tersedia dalam audit |
| Dependensi | pnpm mengunci JS; worker requirements-dev memisahkan alat uji | Rentang versi Python cukup longgar; buat lock/constraints yang dapat direproduksi. Build masih memperingatkan konfigurasi ESLint Next yang usang |

Next.js 16 memang menghapus perintah `next lint`; jalankan ESLint CLI setelah konfigurasi lint ditetapkan, bukan mengganti hasilnya dengan echo sukses. [Dokumentasi upgrade resmi Next.js](https://nextjs.org/docs/app/guides/upgrading/version-16).

Lihat [diagram Mermaid arsitektur aktual dan alur data](../diagrams/06-architecture-as-built.md). Diagram membedakan koneksi yang ada dari integrasi yang belum tersedia; nama Vercel/Render/R2 mengikuti README dan bukan hasil inspeksi akun hosting.

## 5. Kelayakan lomba dan rencana perbaikan

**Cocok sebagai proyek lomba bila difokuskan dan dibuktikan, belum layak diajukan dengan klaim seluruh fitur siap produksi.** Pembeda terkuat adalah menghubungkan pre-order pertanian, bukti budidaya, verifikasi satelit, alokasi saat hasil kurang, dan penanganan mutu. Itu memberi cerita masalah→solusi yang lebih kuat daripada banyak dashboard tanpa satu transaksi yang selesai.

| Aspek dari rubrik pengguna | Modal yang dimiliki | Bukti yang perlu disiapkan |
|---|---|---|
| Teknologi dan AI — 30% | PostGIS, citra Sentinel-2, NDVI/NDMI, pengolahan raster, kontrak lintas aplikasi | Jelaskan mana algoritme berbasis aturan, mana kontribusi AI dalam pengembangan. Jangan menyebut model ML terlatih bila belum ada. Tunjukkan citra/aset asal, error handling dan validasi lintas musim |
| Fungsionalitas — 30% | Alur domain jauh lebih kaya daripada CRUD sederhana | Satu siklus akun baru hingga settlement demo yang dapat diulang, semua acceptance regression lulus, integrasi nyata/simulasi diberi label jelas |
| Inovasi/solusi — 25% | Kepercayaan dan ketidakpastian panen dihubungkan dengan keputusan perdagangan | Wawancara petani dan pembeli, contoh masalah terukur, alasan metode, pembanding dan batas solusi; jangan mengarang hasil validasi |
| UI/UX — 15% | Bahasa lokal, role-based navigation, status dan preview | Rekaman UAT tanpa bantuan, perbaikan onboarding/lokasi/offline, konsistensi mobile dan error state |

Worker sekarang memakai deteksi fenologi berbasis aturan, bukan bukti model ML yang dilatih. Coverage 100% worker tidak membuktikan NDVI akurat mengidentifikasi tanggal panen pada semua komoditas. Empat defect yang direproduksi mencakup pencampuran musim, badge lama tertimpa, piksel luar poligon dihitung sebagai awan, dan kegagalan HTTP yang tidak terisolasi. Ini langsung memengaruhi janji inovasi sehingga harus diperbaiki sebelum menunjukkan status verifikasi sebagai kebenaran lapangan.

### Urutan menuju 31 Oktober

| Waktu usulan | Fokus dan syarat selesai |
|---|---|
| 10–20 September | Bekukan scope MVP dan state machine; perbaiki onboarding, zona, logout/OTP, akses privat dan cacat atomisitas pembayaran/panen/penerimaan. Acceptance terkait harus lulus |
| 21–30 September | Selesaikan pilihan shortfall atau batasi opsi yang belum berjalan; perbaiki worker/QR/chain sesuai temuan; putuskan integrasi sandbox resmi versus simulasi yang terang. Tambah PostgreSQL/PostGIS integration tests |
| 1–10 Oktober | Lanjutkan coverage modul/halaman yang belum diuji sampai target yang diminta; e2e akun baru, kuota terakhir, callback berulang, gagal unggah, klaim dan settlement. Hilangkan lint placeholder |
| 11–20 Oktober | UAT petani/pembeli/kurir pada Android dan jaringan buruk; uji lapangan citra/foto; perbaiki hambatan terbesar; verifikasi backup, restore dan observabilitas |
| 21–27 Oktober | Freeze fitur, rehearsal demo, data fixture konsisten, laporan bug dan provenance AI; siapkan demo cadangan lokal/video dengan label yang jujur |
| 28–30 Oktober | Smoke test deployment dan akun demo, cek akses URL/perangkat, latihan tanya jawab dan presentasi tanpa perubahan berisiko |
| 31 Oktober | Presentasikan satu cerita transaksi lengkap serta satu skenario gagal panen yang ditangani benar |

Jadwal ini usulan kerja, bukan estimasi terjamin; sesuaikan dengan tim dan hasil perbaikan. Prioritaskan bug yang memutus alur atau merusak integritas dibanding menambah rekomendasi, PDF atau dashboard baru.

### Gate demonstrasi yang dapat dinilai

- Nomor baru tenant dan buyer menyelesaikan profil tanpa intervensi database.
- Dua pembeli berebut kuota terakhir tidak menghasilkan penjualan berlebih; callback berulang hanya mencatat pembayaran sekali.
- Gagal menyimpan foto tidak membuat panen setengah terkonfirmasi; multi-foto yang sah tetap lolos verifikasi rantai.
- Kekurangan panen memberi hasil nyata untuk setiap opsi yang ditampilkan; jumlah QR sesuai box fisik terpenuhi.
- Penerimaan, auto-terima, klaim dan settlement memiliki satu transisi yang dapat diulang secara idempoten.
- Pengguna lain tidak bisa membaca lokasi/notifikasi privat; logout menghapus sesi dan data pribadi yang relevan.
- Worker tahan awan, HTTP gagal dan riwayat multi-musim; badge historis sesuai PRD dan limitasi agronominya dijelaskan.
- Semua regression acceptance lulus, laporan coverage menunjukkan denominator yang jujur, build/type-check/lint sah, serta e2e/UAT terpisah dari unit tests.

Tidak ada dasar untuk menjamin “make no mistake” secara absolut. Yang bisa diberikan adalah temuan yang dapat ditelusuri, test yang dapat diulang, batas bukti yang dinyatakan, dan penolakan untuk mengubah coverage menjadi klaim fungsionalitas. Laporan ini mempertahankan perbedaan tersebut.
