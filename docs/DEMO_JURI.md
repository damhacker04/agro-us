# Panduan demo AgroUs untuk juri

AgroUs menghubungkan pesanan pembeli dengan budidaya tenant, bukti kegiatan, pemenuhan panen, dan pencatatan dana yang ditahan sampai proses penerimaan selesai. Panduan ini menyediakan tur sekitar **8–10 menit**, lalu percobaan tambahan jika waktu tersedia.

**Buka [demo AgroUs](https://agro-us.vercel.app).** Untuk menjalankan salinan sendiri, ikuti [panduan instalasi](INSTALLATION.md), termasuk pengisian data demo. Semua route di bawah memakai alamat web yang sedang diuji; misalnya `/buyer/catalog` menjadi `http://localhost:3000/buyer/catalog` pada instalasi lokal.

Panduan dicocokkan dengan kode dan seed pada **14 September 2026**. Hasil yang disebutkan adalah keadaan yang disiapkan oleh seed; ketersediaan deployment dan keseluruhan alur pada perangkat juri tetap perlu diperiksa. Demo bersama dapat berubah setelah digunakan peserta lain, dan beberapa status berubah karena pekerjaan terjadwal.

## Masuk dan akun demo

1. Pilih [masuk pembeli](https://agro-us.vercel.app/auth/buyer/login), [masuk tenant](https://agro-us.vercel.app/auth/tenant/login), atau [masuk operator](https://agro-us.vercel.app/auth/operator/login).
2. Masukkan nomor sesuai tabel. **Tidak ada kata sandi atau OTP tetap seperti `123456`.**
3. Bila mode demo aktif, OTP enam digit terisi otomatis; lanjutkan verifikasi. Pada instalasi lokal, ini membutuhkan `DEMO_EXPOSE_OTP=true` di API.
4. Gunakan **Keluar** sebelum berganti akun. Untuk melihat dua peran bersamaan, gunakan dua profil browser berbeda atau satu jendela biasa dan satu jendela privat; tab biasa dalam profil yang sama berbagi sesi.

Nomor dan nama berikut adalah **identitas fiktif dari seed**, bukan kredensial pengguna sungguhan.

| Peran | Nomor | Nama | Data yang disiapkan |
| --- | --- | --- | --- |
| Tenant | `081100000101` | Tani Makmur Pujon | Batch Wortel dengan timeline lengkap, pesanan, dan ledger escrow |
| Tenant | `081100000102` | Kebun Lestari Batu | Batch Wortel untuk opsi substitusi dan produk lain |
| Tenant | `081100000103` | Gapoktan Ngantang Sejahtera | Produk Cabai Rawit; zona Kabupaten Malang |
| Tenant | `081100000104` | Tani Muda Wajak | Legalitas menunggu tinjauan; belum memiliki lahan/produk |
| Pembeli | `081100000201` | Katering Sehat Nusantara | Pesanan Wortel menunggu panen dan Selada diterima |
| Pembeli | `081100000202` | Resto Padi Emas | Pesanan Kubis dikirim dan Caisim selesai |
| Pembeli | `081100000203` | Dapur Kolektif Batu | Pembeli baru di zona Kota Batu |
| Operator | `081100000030` | Operator demo | Konsol tinjauan internal |

Kurir masuk melalui QR dan Kode Antar, sehingga tidak memerlukan akun pada tabel ini. OTP tidak dikirim ke SMS/WhatsApp sungguhan: penyedia saat ini hanya mencetak pesan ke log API. Bila kolom OTP tidak terisi pada demo daring, itu perlu diperiksa oleh tim pengelola; meminta SMS ulang tidak akan mengaktifkan layanan pengiriman pesan.

## Tur utama: 8–10 menit

Tur ini memakai data yang sudah disiapkan, sehingga juri tidak perlu menuntaskan pendaftaran lahan, menunggu panen, atau menunggu jendela klaim.

### 1. Lihat katalog dan bukti budidaya — sekitar 3 menit

Masuk sebagai pembeli **`081100000201`**, lalu buka **Katalog** (`/buyer/catalog`). Zona awalnya Kota Malang. Pilih **Wortel Pujon Grade A**.

Periksa:

- Harga per box, isi kilogram per box, produsen, estimasi panen, dan sisa kuota.
- **Verified Timeline**: pada seed baru terdapat lima catatan kegiatan dengan foto contoh dan koordinat, serta hasil pemeriksaan **Rantai utuh · 5 catatan**.
- Bagian bukti satelit dan grafik NDVI: seed menyediakan deret contoh, termasuk titik tidak terukur karena awan. Ini mendemonstrasikan penyajian data, bukan hasil verifikasi lapangan terbaru.

**Hasil yang diharapkan:** pembeli dapat memeriksa rincian dan asal bukti sebelum memesan. Pemeriksaan hash menunjukkan integritas rantai catatan; itu sendiri tidak membuktikan bahwa kegiatan di dunia nyata benar-benar terjadi.

Jika Wortel tidak muncul karena telah dipanen dalam demo sebelumnya, buka **Pesanan** pada langkah berikut dan gunakan tautan bukti/rincian batch di pesanan Wortel. Untuk mengulang keadaan awal secara persis, tim pengelola dapat menyiapkan ulang database demo khusus.

### 2. Lihat pesanan pembeli — sekitar 1–2 menit

Masih sebagai pembeli yang sama, buka **Pesanan saya** (`/buyer/orders`) dan pilih pesanan Wortel.

Pada seed baru, pesanan berisi **24 box Wortel**, sudah dibayar dalam data simulasi, dan pengirimannya **Menunggu panen**. Periksa rincian item, nilai transaksi, serta tahap pemenuhan. Pesanan Selada pada akun ini disiapkan sebagai **Diterima**, tetapi dapat menjadi **Selesai** setelah jendela klaim dan pekerjaan terjadwal berjalan.

**Hasil yang diharapkan:** pemesanan dan pembayaran tercatat lebih dahulu, sementara pengiriman menunggu hasil panen.

### 3. Lihat sisi tenant dan dana tertahan — sekitar 2 menit

Keluar, masuk sebagai tenant **`081100000101`**, lalu buka:

1. **Manajemen batch** (`/tenant/batch`) → Wortel Pujon Grade A: periksa kuota, status, dan kegiatan budidaya.
2. **Pesanan masuk** (`/tenant/orders`): periksa pesanan dari Katering Sehat Nusantara.
3. **Keuangan & escrow** (`/tenant/finance`): periksa entri `HOLD` dan perbedaan dana tertahan dengan dana yang sudah selesai diproses.

**Hasil yang diharapkan:** tenant melihat komitmen yang harus dipenuhi, dan pembayaran pembeli belum otomatis menjadi dana yang dapat dicairkan. Angka escrow dalam demo merupakan ledger internal; tidak ada transfer bank sungguhan.

### 4. Lihat pemeriksaan operator — sekitar 2 menit

Keluar, masuk sebagai operator **`081100000030`**, kemudian buka:

- **Legalitas** (`/operator/legality`): Tani Muda Wajak menunggu pemeriksaan pada seed baru. Buka rincian untuk melihat data pengajuan yang tersedia; persetujuan/penolakan akan mengubah keadaan demo.
- **Escrow** (`/operator/escrow`): lihat posisi dana lintas tenant.
- Jika waktu masih tersedia, **Verifikasi satelit** (`/operator/satellite`) dan **Audit** (`/operator/audit`) untuk melihat sarana peninjauan. Antrean atau jangkar bisa kosong bila belum ada kejadian/job yang mengisinya.

**Hasil yang diharapkan:** terdapat peran operator untuk keputusan yang membutuhkan tinjauan, terpisah dari tampilan pembeli dan tenant.

## Percobaan tambahan

Langkah di bagian ini **mengubah data demo**. Panen menutup batch, keputusan resolusi memengaruhi alokasi/dana, dan QR yang sudah dipakai tidak dapat dipakai ulang. Lakukan setelah tur utama; gunakan salinan lokal dengan database khusus bila perlu mengulang banyak kali.

### A. Buat pre-order dan simulasikan pembayaran

1. Masuk pembeli `081100000201`, pilih zona Kota Malang, buka Wortel Pujon Grade A yang masih tersedia.
2. Pada seed baru, tambahkan **20 box** dengan harga **Rp145.000/box**. Nilai barang **Rp2.900.000** memenuhi minimum Kota Malang **Rp2.500.000**. Gunakan angka pada aplikasi bila data telah berubah.
3. Buka **Keranjang** (`/buyer/cart`) → checkout. Isi penerima, telepon, patokan, jam penerimaan, dan periksa koordinat tujuan. Jangan memilih add-on laporan PDF untuk percobaan dasar.
4. Pilih metode pembayaran dan buat pesanan. Pada halaman pembayaran tekan **Saya sudah bayar** untuk simulasi.
5. Periksa pesanan pembeli, kemudian ledger tenant Pujon.

**Hasil yang diharapkan:** tagihan berubah lunas dan dana barang menjadi `HOLD`. Tombol demo membutuhkan pembeli yang login sebagai pemilik tagihan dan `DEMO_EXPOSE_OTP=true`; metode QRIS/VA/e-wallet yang tampil belum terhubung ke pembayaran sungguhan. Checkout di bawah minimum atau melebihi kuota memang ditolak.

### B. Catat panen, terbitkan QR, dan buka halaman kurir

1. Masuk tenant `081100000101` → `/tenant/batch` → Wortel Pujon Grade A → **Catat kegiatan** → **Panen**. Seed menyiapkan umur tanam Wortel agar sudah layak dicatat panen pada hari seed dibuat.
2. Isi **Total box hasil panen**, deskripsi, foto JPG/PNG/WebP, dan koordinat. Angka yang diminta adalah seluruh hasil lahan, termasuk hasil yang tidak dijual melalui AgroUs. Untuk skenario pemenuhan penuh, jumlahnya harus cukup bagi seluruh box terjual; baca penilaian kewajaran sebelum konfirmasi.
3. Pada pengujian lokal fiktif, contoh titik di dalam petak Wortel seed ialah latitude **`-7.8405`**, longitude **`112.4708`**. Jelaskan deskripsi/foto sebagai simulasi. Angka ini bukan lokasi perangkat juri atau bukti kunjungan lapangan.
4. Periksa pratinjau dampak dan konfirmasi. Buka `/tenant/orders`, pilih pengiriman Wortel yang sudah **Panen**, lalu **Terbitkan QR & Kode Antar**. Catat kode empat digit yang ditampilkan sekali.
5. Pindai QR dari layar menggunakan kamera perangkat lain, atau gunakan pembaca QR untuk mendekode gambar dan membuka URL `/scan/...` di dalamnya. **Menyalin alamat gambar QR tidak membuka halaman kurir**: gambar tersebut adalah data gambar, bukan tautan halaman.
6. Masukkan Kode Antar. Izinkan lokasi jika ingin mencoba pelaporan GPS, atau pilih **Lanjut tanpa GPS** pada halaman tracking. Mode tanpa GPS tidak menyediakan pelacakan lokasi; penerimaan tetap lewat konfirmasi pembeli.

**Hasil yang diharapkan:** satu QR dibuat per box, dan kode yang benar membuka sesi kurir tanpa pendaftaran akun. Jika kode lupa/terkunci, gunakan **Terbitkan kode antar baru** saat kendali itu tersedia. Setelah pengiriman berjalan, ikuti status dan kendali yang benar-benar tersedia di aplikasi.

Pesanan Kubis milik Resto Padi Emas memang sudah **Dikirim** pada seed, tetapi **bukan titik awal penerbitan QR baru**. UI hanya menyediakan penerbitan awal ketika pengiriman sudah **Panen**.

Untuk demo di komputer lokal, URL di QR harus terjangkau oleh perangkat pemindai. `localhost` di ponsel menunjuk ponsel itu sendiri. Tim pengelola perlu menyiapkan alamat frontend/API, CORS, dan `SCAN_BASE_URL` yang sesuai; opsi paling langsung untuk demo lintas perangkat adalah deployment HTTPS. Tur utama tidak membutuhkan GPS atau dua perangkat.

### C. Perlihatkan penanganan panen kurang

Gunakan keadaan awal demo yang belum dipanen. Skenario ini adalah alternatif dari panen penuh pada B.

1. Sebagai tenant Pujon, catat panen Wortel dengan **10 box** saat pesanan seed **24 box** masih menunggu. Lengkapi bukti simulasi dan periksa pratinjau kewajaran/alokasi sebelum konfirmasi.
2. Sebagai pembeli `081100000201`, buka pesanan Wortel → penyelesaian kekurangan panen.
3. Periksa opsi yang server izinkan beserta konsekuensi nilainya. Seed menyediakan **Wortel Batu Grade A** dari tenant lain untuk kandidat substitusi, tetapi ketersediaan akhir tetap diperiksa server.
4. Pilih satu keputusan bila ingin menguji perubahan alokasi/ledger; periksa kembali pesanan dan keuangan tenant terkait.

**Hasil yang diharapkan:** pembeli melihat opsi substitusi, pengembalian dana, penerimaan sebagian, atau jadwal ulang sesuai syaratnya. Pada angka 10 box × Rp145.000, porsi terpenuhi berada di bawah minimum Kota Malang sehingga penerimaan sebagian tidak memenuhi syarat. **Jadwal ulang membutuhkan batch berikutnya dari tenant yang sama dengan kuota cukup**; seed awal tidak menyediakannya untuk Wortel Pujon, sehingga opsi tersebut semestinya tidak tersedia. Jika tersedia, implementasi mengalokasikan item dan dana ke pengiriman siklus berikutnya.

### D. Lihat rekomendasi tanam

Sebagai tenant Pujon, buka **Rekomendasi tanam** (`/tenant/recommendation`). Bila paket belum aktif, **Aktifkan paket Verified** adalah aktivasi simulasi. Periksa komoditas, zona, minggu panen, perkiraan kekurangan pasokan, tingkat keyakinan, dan sisa waktu tanam.

**Hasil yang diharapkan:** rekomendasi berasal dari riwayat/sinyal permintaan dan dibatasi waktu serta kapasitas yang dihitung server. Angka dan tanggal berubah mengikuti waktu; proyeksi bukan pesanan baru yang dijamin ada. Data seed sengaja menyediakan riwayat/sinyal untuk mengisi contoh ini.

## Layanan eksternal dan batas demo

| Bagian | Yang tersedia untuk penilaian | Kebutuhan atau batasnya |
| --- | --- | --- |
| Web dan API | Dapat dijalankan lokal atau melalui deployment | Lokal tetap membutuhkan PostgreSQL dengan PostGIS; XAMPP/MySQL saja tidak cukup |
| OTP dan pesan kritis | OTP otomatis dalam mode demo; pesan dicetak ke log API | Belum mengirim SMS/WhatsApp sungguhan |
| Pembayaran dan escrow | Simulasi pembayaran, aturan transaksi, alokasi, dan ledger | Belum ada gateway pembayaran/penyaluran escrow bank sungguhan |
| Foto | Unggah dan baca dari disk lokal saat S3 tidak dikonfigurasi | Kunci S3/R2 tidak diperlukan untuk demo lokal; foto seed berada di disk lokal API. Konfigurasi S3 yang hanya diisi sebagian menggagalkan boot |
| Satelit | Grafik dari seed dan worker verifikasi terpisah | Worker tidak wajib untuk tur ini. Penarikan citra nyata membutuhkan jaringan dan akses database; `SYNTHETIC_SCENES=1` membuat data tiruan untuk pengembangan |
| GPS/pemetaan | Input koordinat, lokasi perangkat, dan pilihan kurir tanpa GPS | Tidak ada peta navigasi bawaan; izin perangkat dan lingkungan browser memengaruhi GPS |
| Rekomendasi dan kalibrasi | Perhitungan berdasarkan data yang tersedia | Data demo/parameter indikatif bukan validasi agronomi lapangan atau jaminan akurasi prakiraan |

## Jika langkah demo tidak sesuai

| Gejala | Tindakan |
| --- | --- |
| Halaman tampil, tetapi katalog/login gagal | Periksa API; untuk lokal ikuti bagian pemeriksaan dan pemecahan masalah di [instalasi](INSTALLATION.md). Web yang tampil saja belum membuktikan API/database tersambung |
| OTP tidak terisi | Lokal: periksa `DEMO_EXPOSE_OTP=true`, `OTP_PEPPER`, dan log API. Daring: laporkan kepada pengelola demo |
| Diminta onboarding saat memakai nomor tabel | Periksa nomor dan database tujuan; seed demo mungkin belum dimuat pada API yang dipakai frontend |
| Produk/antrean/status berbeda | Data demo sudah berubah, zona berbeda, atau job sudah berjalan. Gunakan data yang tersedia atau minta tim menyiapkan ulang database demo khusus |
| QR hanya membuka gambar | Pindai/dekode QR untuk memperoleh URL halaman kurir di dalam gambar |
| GPS ditolak | Tur utama tetap dapat dinilai; untuk kurir gunakan **Lanjut tanpa GPS** dan jalur penerimaan pembeli |

Pembuatan ulang data demo **menghapus data transaksional** di database sasaran. Itu tugas tim pengelola pada database khusus demo, bukan langkah pemulihan rutin yang perlu dilakukan juri. Bukti pengujian dan batas verifikasinya tersedia di [hasil QA](qa/TEST_RESULTS.md); panduan ini tidak menggantikan hasil pengujian tersebut.
