# AgroUs — Page Inventory (Daftar Halaman untuk UI/UX)

> Turunan dari [`PRD.md`](PRD.md) **v2.2** + [`diagrams/`](diagrams). Setiap cabang keputusan di
> User Flow & Activity Diagram sudah ditelusuri agar **tiap jalur punya halaman/state tujuan**.
>
> **Total: 5 role · 112 halaman & state** (termasuk error handling).
>
> **Status v2.2:** seluruh gap di §8 sudah **diputuskan** dan sudah dipropagasi ke PRD + diagram.
> Perubahan utama bagi desainer: **alur panen sebagian** (TN-19a, BY-11c), **laporan ketertelusuran
> pindah ke checkout** (BY-18 dihapus), dan **notifikasi kedatangan bertahap** (BY-10b).

---

## Cara pakai dokumen ini

| Kolom | Arti |
|---|---|
| **ID** | Kode stabil untuk penamaan file desain & handoff (`SH-01`, `TN-17a`, dst). |
| **Ref** | Sumber requirement di PRD (`FR-x.y`) atau node diagram (`T12`, `KPD`, `D8`). Kalau kosong → **halaman implisit**, lihat §8 Gap. |
| **Prio** | M/S/C mengikuti MoSCoW PRD. `M` = wajib ada di MVP. |

**Konvensi ID:** `SH` Shared · `TN` Tenant · `BY` Buyer · `KR` Kurir · `OP` Operator · `ER` Error/System.
Sufiks huruf (`TN-02a`) = sub-state/varian dari halaman induk, bukan halaman terpisah di navigasi.

**Wajib dibaca sebelum desain:**
- **Kurir (`KR-*`) < 150KB** — tanpa font kustom, tanpa gambar besar, tanpa framework berat. Buka dalam hitungan detik di 3G. Ini requirement keras, bukan preferensi.
- **Tenant** dipakai sambil berdiri di kebun: harus terbaca di bawah sinar matahari, target sentuh ≥ 44×44px, **offline-tolerant**, input timeline **maks 3 ketukan**.
- **Font:** Fredoka (heading & angka metrik) · Poppins (body, tabel, form).
- **Warna status verifikasi** konsisten di semua role: 🟢 hijau Terverifikasi · 🟠 amber Perlu Ditinjau · ⚪ abu-abu Tidak Dapat Diverifikasi.
- **Bahasa Indonesia**, hindari istilah teknis di UI Tenant ("Bukti Foto", bukan "Upload Evidence").

---

## 1. Shared / Publik (8)

Diakses tanpa login atau sebelum peran ditentukan. Peran ditentukan oleh CTA yang dipilih di landing.

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| SH-01 | Landing Page | `/` | Proposisi nilai menekankan **verifikasi satelit** sebagai pembeda (bukan sekadar pelacakan). 2 CTA: "Mulai Menjual" & "Cari Produk". | FR-1.1, FR-1.2 | M |
| SH-02 | Registrasi | `/daftar` | Input nomor telepon. Email opsional. Pilihan peran terbawa dari CTA. | FR-1.3 | M |
| SH-03 | Verifikasi OTP | `/otp` | Input 4–6 digit, countdown kirim ulang, indikator sisa percobaan (maks 3×). | FR-1.3, `T3` | M |
| SH-04 | Login | `/masuk` | Nomor telepon → OTP. | FR-1.3 | M |
| SH-05 | Profil Publik Tenant | `/tenant/[slug]` | Nama & logo, badge verifikasi, **rasio klaim publik**, daftar produk. | FR-5.7 | S |
| SH-06 | Syarat & Ketentuan | `/syarat` | **Copy kepatuhan wajib:** pembeli = badan usaha (bukan investor), tanpa janji imbal hasil, dana di escrow mitra berizin. | §5.7.1 | M |
| SH-07 | Kebijakan Privasi | `/privasi` | Penanganan data lokasi kurir, foto ber-EXIF, retensi. | — | M |
| SH-08 | Bantuan / Kontak | `/bantuan` | FAQ per peran, kontak operator. | — | S |

---

## 2. Tenant / Penjual (33)

Desktop/Tablet untuk dashboard; **input timeline wajib nyaman di ponsel**.

### 2a. Onboarding (7)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| TN-01 | Onboarding 1: Profil Bisnis | `/tenant/onboarding/profil` | Nama perusahaan, unggah logo, nomor telepon aktif. | FR-1.4, `T4` | M |
| TN-02 | Onboarding 2: Pilih Metode Pemetaan | `/tenant/onboarding/lahan` | Pilihan: gambar di peta **atau** walk-around GPS. | FR-1.5, `T5` | M |
| TN-02a | ↳ Mode Gambar di Peta | — | Peta interaktif, tarik titik poligon, undo/hapus titik, tampilkan luas berjalan. | FR-1.5 | M |
| TN-02b | ↳ Mode Walk-Around GPS | — | State merekam: jumlah titik, akurasi GPS, jeda/lanjut/selesai. Butuh state "akurasi rendah". | FR-1.5 | M |
| TN-03 | Konfirmasi Luas Lahan | — | Ringkasan luas (ha). **Jika < 0,1 ha:** peringatan + label "Verifikasi Terbatas" yang harus diakui pengguna. | FR-1.6, `T6`, `T7` | S |
| TN-04 | Unggah Legalitas | `/tenant/onboarding/legalitas` | Unggah NIB atau KTP pemilik. Preview + ganti file. | FR-1.7 | S |
| TN-05 | Menunggu Tinjauan | `/tenant/onboarding/selesai` | Status legalitas `PENDING`. Jelaskan apa yang sudah/belum bisa dilakukan selama menunggu. | FR-1.7 | S |

### 2b. Navigasi utama & katalog (6)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| TN-10 | Dashboard | `/tenant` | **Nilai escrow tertahan + jadwal pencairan**, ringkasan batch, PO aktif, pesanan perlu tindakan. ⚠️ **Tanpa metrik performa kurir.** | FR-3.1, FR-3.5 | M |
| TN-11 | Katalog Produk | `/tenant/produk` | Tabel produk: nama, grade, harga/box, stok, est. panen, status. | FR-3.1, FR-3.2 | M |
| TN-12 | Tambah / Edit Produk | `/tenant/produk/baru` · `/[id]/edit` | Nama, **kelas mutu A/B/C**, harga per box, kuantitas kg per box, deskripsi, stok box, est. tanggal panen. | FR-3.2 | M |
| TN-13 | Manajemen Lahan | `/tenant/lahan` | Daftar poligon + luas + tier verifikasi. Tambah lahan baru (pakai alur TN-02). | FR-1.5, FR-3.4 | M |
| TN-14 | Manajemen Batch | `/tenant/batch` | Daftar batch: produk, poligon, kuota terjual/total, status produksi, **badge verifikasi**. | FR-3.1 | M |
| TN-15 | Detail Batch | `/tenant/batch/[id]` | Verified Timeline (kronologis), badge + **grafik NDVI**, kuota, tanggal klaim vs terdeteksi. | FR-3.4, FR-4.5 | M |

### 2c. Kuota PO & Verified Timeline (8)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| TN-16 | Buka Kuota PO | `/tenant/batch/[id]/kuota` | Jumlah box, **harga terkunci**, perkiraan tanggal panen. Validasi: maks berdasarkan luas poligon × rendemen, **dibatasi 70% kapasitas**. | FR-3.3, `T9` | M |
| TN-17 | Input Node Timeline | `/tenant/batch/[id]/node/baru` | **Maks 3 ketukan.** Pilih jenis kegiatan (6 opsi terstruktur, bukan teks bebas) → deskripsi ≤280 karakter → foto. GPS & waktu terekam otomatis (tak bisa disunting). | FR-4.1, §5.4.1, `T10` | M |
| TN-17a | ↳ Kamera In-App | — | Ambil foto langsung. Opsi galeri **ditandai berbeda** + peringatan menurunkan kepercayaan node. | §5.4.1 | M |
| TN-17b | ↳ Peringatan GPS di Luar Poligon | — | Tolak simpan, **atau** minta alasan tertulis yang akan **tampil ke pembeli**. Harus jelas konsekuensinya. | FR-4.3, `D4` | M |
| TN-17c | ↳ Antrean Offline | — | Node tersimpan lokal saat tanpa sinyal + indikator "menunggu terkirim". | Persona §4.1 | S |
| TN-18 | Tambah Node Ralat | `/tenant/batch/[id]/node/[id]/ralat` | Node koreksi merujuk node asli. **Tegaskan: node asli tetap tampil & tidak terhapus.** | FR-4.2 | M |
| TN-19 | Tandai Panen | `/tenant/batch/[id]/panen` | Konfirmasi panen + **wajib isi jumlah box hasil aktual**. Ditolak jika belum ada node penanaman atau rentang waktu tidak masuk akal. | FR-4.8, FR-7.8, `TH1` | M |
| TN-19a | ↳ Pratinjau Alokasi FIFO | — | **Sebelum konfirmasi**, tampilkan dampak: *"6 dari 10 pesanan terpenuhi penuh. 4 pesanan akan ditawari Harvest Assurance."* Tenant harus melihat konsekuensi sebelum menekan. | FR-7.8, FR-7.9, `TH4` | M |
| TN-20 | Deklarasi Gagal / Panen Sebagian | `/tenant/batch/[id]/gagal` | **Bukan tombol status — ini form node timeline** tipe `GAGAL_PANEN`: alasan terstruktur (cuaca/hama/penyakit/lainnya) + foto kamera in-app + GPS dalam poligon. Append-only, masuk rantai hash, **tidak bisa dihapus**. Memicu Harvest Assurance **segera**. | FR-4.9, `TH3` | M |
| TN-20a | ↳ Peringatan Konsekuensi | — | Sebelum simpan: jelaskan shortfall tercatat permanen & memengaruhi rasio publik + kuota siklus berikutnya. | FR-7.12 | M |

### 2d. Pesanan, QR & Kode Antar (5)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| TN-21 | Pesanan Aktif | `/tenant/pesanan` | Daftar pesanan per status. | FR-3.1 | M |
| TN-22 | Detail Pesanan Aktif | `/tenant/pesanan/[id]` | Item, penerima, **tombol Cetak QR Box** (aktif hanya pasca-Panen) + **Kode Antar 4 digit**. | FR-3.6, FR-6.1, `T12` | M |
| TN-22a | ↳ Tampilan Kode Antar | — | Kode besar & mudah dibaca/diucapkan ke kurir. Jelaskan: berikan saat serah terima barang. | FR-6.1 | M |
| TN-23 | Cetak QR Box | `/tenant/pesanan/[id]/qr` | Preview cetak **bulk** (puluhan box), 1 QR unik per box, layout siap tempel. | FR-3.6 | M |
| TN-24 | Terbitkan Kode Antar Baru | — | Muncul saat token terkunci (5× salah). Konfirmasi + kode baru. | FR-6.3 | M |

### 2e. Escrow, Rekomendasi & akun (7)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| TN-25 | Escrow & Pencairan | `/tenant/escrow` | Ledger append-only: HOLD / RELEASE / POTONG_KLAIM / REFUND. Saldo tertahan & jadwal cair. | FR-3.5, FR-7.2 | M |
| TN-26 | Ajukan Pencairan Sebagian | — | Maks **30%** saat status Panen untuk biaya logistik. | FR-7.3 | S |
| TN-27 | Rekomendasi Tanam | `/tenant/rekomendasi` | Permintaan agregat belum terpenuhi 8–16 minggu ke depan, **kalimat operasional** ("Zona Malang butuh 8 ton cabai rawit minggu ke-34…"). + **indikator kejenuhan pasokan**. | FR-3.7, FR-8.2, FR-8.4 | S |
| TN-28 | Buka Kuota dari Rekomendasi | — | **Satu ketukan** dari TN-27 → prefilled TN-16. | FR-8.3 | M |
| TN-29 | Klaim Masuk | `/tenant/klaim` | Klaim mutu terhadap pengiriman Tenant + status penyelesaian. ⚠️ *Implisit.* | FR-5.x | M |
| TN-30 | Langganan (Paket Verified) | `/tenant/langganan` | Rp199.000/bulan. Gerbang verifikasi satelit **batch baru**, kuota PO tanpa batas, Rekomendasi Tanam. | FR-9.1 | M |
| TN-30a | ↳ State Masa Tenggang | — | **14 hari** sebelum penguncian + notifikasi. Nyatakan jelas apa yang **tetap aman**: badge lama permanen, batch dengan PO terjual tetap diverifikasi. | FR-9.2, FR-9.3, FR-9.4 | S |
| TN-33 | Rasio Shortfall & Reputasi | `/tenant/reputasi` | Rasio klaim + **rasio shortfall** (rolling 2 siklus) + `quota_multiplier` berjalan. Peringatan bila mendekati ambang 15%. | FR-5.7, FR-7.12 | S |
| TN-31 | Notifikasi | `/tenant/notifikasi` | PO masuk, pembayaran, klaim, hasil verifikasi satelit, pencairan. | — | M |
| TN-32 | Pengaturan Akun | `/tenant/pengaturan` | Profil bisnis, logo, telepon, zona layanan. | FR-1.4 | M |

---

## 3. Pembeli / HORECA (26)

Mobile-first (di lapangan), tetap layak di desktop saat rekonsiliasi tagihan.

### 3a. Penemuan & keranjang (7)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| BY-01 | Pilih Kota Layanan | `/pilih-kota` | Wajib saat pertama masuk. Menentukan Tenant & zona yang tampil. | FR-2.1, `P3` | M |
| BY-02 | Katalog Terpadu | `/katalog` | Telusur **berdasarkan komoditas** (lintas-Tenant, bukan per penjual). Filter: komoditas, grade, badge verifikasi, tanggal panen. | FR-2.2, `P4` | M |
| BY-03 | Detail Produk | `/produk/[id]` | Grade, harga/box, kg/box, est. panen, **badge verifikasi**, nama Tenant. | FR-2.5, FR-2.6, `P5` | M |
| BY-03a | ↳ Verified Timeline | — | Kronologi node + foto bukti + penanda sumber foto (kamera/galeri) + node Ralat terlihat. | §5.4 | M |
| BY-03b | ↳ Bukti Satelit (NDVI) | — | Grafik NDVI vs tanggal klaim. **Ketidaksesuaian ditampilkan terbuka**, tidak disembunyikan. | FR-4.6 | M |
| BY-04 | Keranjang Lintas-Tenant | `/keranjang` | Item dari **beberapa Tenant** dalam satu transaksi, dikelompokkan per Tenant. | FR-2.3, `P6` | M |
| BY-05 | Rencana Pengiriman | `/keranjang/pengiriman` | Item dikelompokkan jadi 1+ rencana per **zona & tanggal panen**, + **ongkir terkonsolidasi**. | FR-2.4, `P9` | M |

### 3b. Checkout & pembayaran (6)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| BY-06 | Checkout: Detail Pengiriman | `/checkout` | Nama penerima, **titik lokasi di peta**, patokan alamat (opsional), telepon, **jam operasional penerimaan**. ⚠️ **Tanpa pilihan ekspedisi** (FR-6.4). | FR-2.7, `P10` | M |
| BY-06a | ↳ Opsi Laporan Ketertelusuran | — | Checkbox *"Sertakan Laporan Ketertelusuran (+Rp25.000)"* — ikut tagihan yang sama. **Menggantikan halaman pembelian terpisah** (biaya gateway akan memakan 16% dari harga laporan). | FR-2.10 | S |
| BY-07 | Pilih Metode Pembayaran | `/checkout/bayar` | QRIS / Virtual Account / E-Wallet. | FR-2.8, `P11` | M |
| BY-07a | ↳ Instruksi QRIS | — | QR + countdown kedaluwarsa. | FR-2.8 | M |
| BY-07b | ↳ Instruksi Virtual Account | — | Nomor VA + salin + countdown. | FR-2.8 | M |
| BY-07c | ↳ Redirect E-Wallet | — | State menunggu kembali dari aplikasi e-wallet. | FR-2.8 | M |
| BY-08 | Pembayaran Berhasil | `/checkout/sukses` | Konfirmasi dana **masuk escrow** (bukan langsung ke Tenant) → status "Menunggu Panen". | FR-7.1, `A6` | M |

### 3c. Pesanan, PoD & klaim (10)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| BY-09 | Pesanan Saya | `/pesanan` | Daftar + status ringkas. | FR-2.9, `P14` | M |
| BY-10 | Detail Pesanan | `/pesanan/[id]` | **Stepper 6 status**, Verified Timeline, posisi kargo real-time. | FR-2.9 | M |
| BY-10a | ↳ Live Map Tracking | — | Peta posisi kurir. **Wajib ada state**: posisi terakhir + stempel waktu jujur saat sinyal terputus. | §6.3 Batasan 3 | M |
| BY-10b | ↳ State Notifikasi Bertahap | — | **3 tahap berbeda**: (1) Dikirim + estimasi tiba, (2) kurir ±1 km "siapkan penerimaan", (3) geofence 100 m "konfirmasi sekarang". **Countdown 60 menit hanya muncul di tahap 3.** | FR-10.2 | M |
| BY-11 | Harvest Assurance | `/pesanan/[id]/assurance` | **3 opsi**: substitusi Tenant lain (harga terkunci) / jadwal ulang / refund. **Konteks parsial wajib tampil**: *"Anda memesan 50 box, tersedia 30."* | FR-7.4, `PHA` | M |
| BY-11a | ↳ Pilih Batch Substitusi | — | Daftar Tenant pengganti di zona sama + badge verifikasi. **Opsi ini disembunyikan** bila gagal panen terverifikasi & selisih harga > 10% — hanya tampil jadwal ulang/refund. | FR-7.4, FR-7.11, `PSU` | M |
| BY-11b | ↳ Konfirmasi Jadwal Ulang | — | Siklus panen berikutnya + tanggal baru. | FR-7.4 | M |
| BY-11c | ↳ **Pilihan Pembeli di Perbatasan** | — | Muncul bila hanya kebagian sebagian box. **Dua pilihan setara, jangan default ke parsial**: (a) terima sebagian + refund sisa, (b) tolak semua → Harvest Assurance penuh. Bila porsi terpenuhi di bawah minimum order zona, **tawarkan (b) lebih dahulu**. | FR-7.10, `PSB` | M |
| BY-12 | Refund Diproses | `/pesanan/[id]/refund` | Dana dikembalikan, pesanan ditutup. | FR-7.4, `PRF` | M |
| BY-13 | Konfirmasi Penerimaan | `/pesanan/[id]/terima` | **Satu ketukan + foto kondisi barang**. Dipicu notifikasi geofence. Jelaskan: membuka jendela klaim 2 jam. | §5.6.4, `P18` | M |
| BY-14 | Ajukan Klaim Mutu | `/pesanan/[id]/klaim` | **Foto + berat aktual hasil timbang**. Tampilkan toleransi susut yang berlaku (5% daun / 3% buah-umbi) sebelum kirim. | FR-5.2, FR-5.4, `P20` | M |
| BY-15 | Status Klaim | `/pesanan/[id]/klaim/[id]` | Rute penyelesaian: ditolak (dalam toleransi) / auto-settle (<10%) / tinjauan operator (>10%, SLA 1 hari kerja). | FR-5.5, FR-5.6, `P21` | M |

### 3d. Penutup & tambahan (3)

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| BY-16 | Pesanan Selesai | — | Escrow dicairkan ke Tenant, jendela klaim berakhir. | `P22`, `G3` | M |
| BY-17 | Batalkan Pesanan | `/pesanan/[id]/batal` | **Hanya saat "Menunggu Panen"**. Tampilkan **biaya batal 10%** yang diteruskan ke Tenant. Setelah Panen: tidak bisa dibatalkan. | FR-7.5, FR-7.6 | M |
| ~~BY-18~~ | ~~Beli Laporan Ketertelusuran~~ | — | **DIHAPUS v2.2** — dipindah jadi checkbox di checkout (**BY-06a**). Yang tersisa hanya **tautan unduh PDF** di halaman pesanan Selesai (BY-16), bukan halaman tersendiri. | FR-2.10 | — |
| BY-19 | Pesan Ulang | — | Salin komposisi order sebelumnya, **satu ketukan**. | FR-2.11 | C |
| BY-20 | Notifikasi | `/notifikasi` | Panen, dikirim, **kurir tiba**, gagal panen, klaim, refund. | `P15` | M |
| BY-21 | Pengaturan / Profil | `/pengaturan` | Profil perusahaan, outlet, zona aktif. | — | M |

---

## 4. Kurir (10) — ZERO-INSTALL

> **Batas keras: < 150KB per halaman.** Tanpa font kustom, tanpa gambar besar, tanpa framework berat.
> **Nol instalasi, nol akun.** Satu-satunya input: Kode Antar 4 digit. Kurir tidak menekan tombol lain sampai selesai.

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| KR-01 | Input Kode Antar | `/scan/[token]` | **Halaman pertama setelah scan QR.** Keypad numerik 4 digit besar. Instruksi: "Minta kode dari penjual". | FR-6.2, `KP` | M |
| KR-02 | Kode Salah | — | Sisa percobaan eksplisit ("Sisa 3 percobaan"). Tetap di KR-01. | FR-6.3, `KPD` | M |
| KR-03 | Token Terkunci | — | Setelah **5× salah**. Instruksi hubungi Tenant untuk kode baru. | FR-6.3, `KPE` | M |
| KR-04 | QR Tidak Berlaku | — | Token invalid **atau sudah terpakai**. Kontak Tenant. | `K3`, `D10` | M |
| KR-05 | Minta Izin Lokasi | — | Muncul **setelah kode benar**. Jelaskan singkat kenapa lokasi diperlukan. | `K4` | M |
| KR-06 | Izin Lokasi Ditolak | — | Instruksi mengaktifkan lokasi **atau** lanjut tanpa live-track. | `K6`, `D11` | M |
| KR-07 | Pelacakan Aktif | — | Minimal: tujuan, status, "biarkan tab ini terbuka". **Screen Wake Lock** bila didukung. Kirim posisi tiap 10 detik. | §6.3 Batasan 1 | M |
| KR-08 | Mode Tanpa Live-Track | — | Sesi jalan tanpa peta; jalur konfirmasi pembeli tetap berfungsi. | `E5` | M |
| KR-09 | Sinyal Terputus | — | Indikator jujur "posisi terakhir terkirim: HH:MM". Bukan error keras. | §6.3 Batasan 3 | M |
| KR-10 | Sesi Berakhir | — | Setelah pembeli konfirmasi. Halaman penutup ringkas. | `K8` | M |

---

## 5. Operator AgroUs (12)

> Role internal dari Use Case `UC-12`. **PRD hanya menyebut 2 tugas eksplisit** (tinjau legalitas & klaim >10%);
> sisanya implisit tapi tak terhindarkan agar sistem bisa dijalankan. Lihat §8.

| ID | Halaman | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| OP-01 | Login Operator | `/operator/masuk` | Autentikasi terpisah. | — | M |
| OP-02 | Dashboard Operator | `/operator` | Antrean per SLA, jumlah tertunda. | — | M |
| OP-03 | Antrean Legalitas Tenant | `/operator/legalitas` | Daftar `PENDING`. | FR-1.7 | S |
| OP-04 | Detail & Putusan Legalitas | `/operator/legalitas/[id]` | Lihat NIB/KTP → Setujui / Tolak + alasan. | FR-1.7 | S |
| OP-05 | Antrean Klaim >10% | `/operator/klaim` | **SLA 1 hari kerja** — countdown per item. | FR-5.6 | S |
| OP-06 | Detail & Putusan Klaim | `/operator/klaim/[id]` | Foto, berat timbang, nilai klaim, % order → putusan menyesuaikan escrow. | FR-5.6 | S |
| OP-07 | Antrean Verifikasi "Perlu Ditinjau" | `/operator/verifikasi` | Batch selisih 7–21 hari. ⚠️ *Implisit.* | FR-4.5 | M |
| OP-08 | Detail Verifikasi Batch | `/operator/verifikasi/[id]` | Timeline vs kurva NDVI berdampingan. | FR-4.5 | M |
| OP-09 | Manajemen Zona | `/operator/zona` | **Nilai minimum pesanan per zona** (gerbang unit economics). ⚠️ *Implisit.* | Risiko 3 | M |
| OP-10 | Manajemen Komoditas | `/operator/komoditas` | **Standar grade A/B/C**, toleransi susut, rendemen rata-rata per komoditas. ⚠️ *Implisit tapi memblokir FR-5.1 & FR-3.3.* | FR-5.1, FR-5.2 | M |
| OP-11 | Monitoring Escrow Ledger | `/operator/escrow` | Audit mutasi append-only. ⚠️ *Implisit.* | FR-7.x | S |
| OP-12 | Audit Hash Anchor | `/operator/audit` | Root hash harian + referensi penyimpanan write-once. ⚠️ *Implisit.* | §6.1 | S |

---

## 6. Error, Empty & System States (20)

Bukan "halaman sisa" — beberapa di antaranya adalah **jalur bisnis normal** (ER-09, ER-16) yang sering terlewat.

### 6a. Error jalur bisnis (bukan bug)

| ID | State | Kapan muncul | Yang harus ada di desain | Ref |
|---|---|---|---|---|
| ER-01 | **Kuota Habis saat Checkout** | Reservasi gagal karena kuota batch terjual duluan (race condition). | Jelaskan pesanan gagal & **dana belum ditarik**. Tawarkan batch alternatif. | `D2`, `FAIL1` |
| ER-02 | **Tagihan Kedaluwarsa** | Lewat batas waktu bayar → reservasi kuota dilepas. | Opsi buat tagihan ulang (kuota bisa sudah tidak tersedia). | `P13`, `D3` |
| ER-03 | **Pembayaran Gagal / Ditolak** | Gateway menolak. | Bedakan dari kedaluwarsa. Coba metode lain. | FR-2.8 |
| ER-04 | **Klaim Ditolak — Dalam Toleransi** | Selisih ≤ toleransi susut. | Tampilkan perhitungan: berat klaim vs toleransi. Bukan penolakan sepihak. | FR-5.2, `G5` |
| ER-05 | **Jendela Klaim Berakhir** | Lewat 2 jam (atau 24 jam fallback). | Nyatakan pesanan dianggap diterima penuh. | FR-5.3 |
| ER-06 | **Diterima Otomatis** | Pembeli tak merespons 60 menit. | Bukan error — **jendela klaim diperpanjang 24 jam** sebagai kompensasi. Nada informatif. | §5.6.4, `P17` |
| ER-07 | **Node Timeline Ditolak** | Elemen wajib tidak lengkap. | Inline, tunjukkan elemen mana yang kurang. Jangan hilangkan data yang sudah diisi. | FR-4.1, `D4` |
| ER-08 | **Panen Ditolak Sistem** | Belum ada node penanaman / rentang tak masuk akal. | Jelaskan syaratnya. | FR-4.8 |
| ER-09 | **Kuota Melebihi Kapasitas Lahan** | Input kuota > 70% kapasitas poligon. | Tampilkan batas terhitung + alasannya (ruang penyangga gagal panen). | FR-3.3, Risiko 2 |
| ER-10 | **Tidak Dapat Diverifikasi (Awan)** | Tutupan awan >40% berkepanjangan. | ⚪ **Jujur, bukan disembunyikan.** Jelaskan bukti foto jadi lapis kedua. | FR-4.5, §5.4.3 |
| ER-11 | **Langganan Kedaluwarsa** | Paket Verified habis (setelah tenggang 14 hari). | Nyatakan **batas dampaknya**: hanya batch **baru** yang tidak diverifikasi. Badge lama **tetap**, batch dengan PO terjual **tetap diverifikasi**. Jangan bikin Tenant panik. | FR-9.2, FR-9.3 |
| ER-21 | **Kuota Diturunkan (Penalti Shortfall)** | Shortfall terverifikasi >15% rolling 2 siklus. | Tampilkan `quota_multiplier` turun 0,70 → 0,50, perhitungannya, dan **syarat pemulihan** (2 siklus bersih). | FR-7.12 |
| ER-22 | **Substitusi Tidak Tersedia** | Gagal panen terverifikasi tapi selisih harga pengganti > 10%. | Jujur: hanya jadwal ulang / refund. Jangan tampilkan opsi substitusi yang tidak bisa dipenuhi. | FR-7.11 |
| ER-12 | **Minimum Order Belum Terpenuhi** | Nilai keranjang < minimum zona. | Banner + selisih yang dibutuhkan + saran item. Bukan blokir buta. | `P8`, `D1` |

### 6b. Error teknis & perangkat

| ID | State | Catatan desain | Ref |
|---|---|---|---|
| ER-13 | **Offline / Tanpa Koneksi** | PWA offline shell. **Kritis untuk Tenant di kebun** — tunjukkan antrean data belum terkirim. | §6.4 |
| ER-14 | **Izin Kamera Ditolak** | Timeline butuh foto kamera. Instruksi mengaktifkan per browser. | §5.4.1 |
| ER-15 | **Izin Lokasi Ditolak** | 2 konteks: Tenant (node timeline) & Kurir (KR-06). | FR-4.3, `D11` |
| ER-16 | **GPS Akurasi Rendah** | Saat walk-around & node timeline. Tampilkan radius galat. | §6.3 Batasan 2 |
| ER-17 | **Unggah Foto Gagal** | Ukuran/format/koneksi. **Jangan kompres ulang sebelum EXIF diekstrak.** | §6.4 |
| ER-18 | **Browser Tidak Didukung** | Geolocation/kamera tak tersedia. Untuk kurir harus sangat ringan. | §6.3 |
| ER-19 | **OTP Terlalu Sering** | Rate limit + countdown. | FR-1.3 |
| ER-20 | **404 / 403 / 500 / Maintenance** | Set standar. 403 relevan untuk akses lintas-peran. | — |

### 6c. Empty states (wajib didesain, jangan tabel kosong)

Katalog kosong di zona terpilih · Keranjang kosong · Belum ada pesanan · Belum ada batch · Belum ada produk · Belum ada lahan terpetakan · Belum ada node timeline · Rekomendasi Tanam kosong · Antrean operator kosong · Belum ada notifikasi.

### 6d. Checklist state per halaman

Untuk setiap halaman data: **Loading (skeleton) · Empty · Error + retry · Partial (sebagian gagal) · Success**.
Untuk setiap form: **Idle · Validating · Inline error · Submitting (disabled) · Success · Server error (data tidak hilang)**.

---

## 7. Prioritas per Fase Roadmap (PRD §11.1)

| Fase | Minggu | Halaman |
|---|---|---|
| **1 — Fondasi** | 1–3 | SH-01…08 · TN-01…05 · TN-10…15 · BY-01…03 · OP-01,02 · ER-13,14,19,20 · **seed komoditas & zona** |
| **2 — Transaksi** | 4–6 | BY-04…08 · **BY-06a** · BY-09,10,17 · TN-25 · ER-01,02,03,12 |
| **3 — Verifikasi** | 7–9 | TN-16…18 · TN-30,30a · BY-03a,03b · OP-07,08,12 · ER-07,08,09,10,11,16,17 |
| **4 — Logistik** | 10–11 | **TN-19,19a,20,20a** · TN-21…24 · TN-29,33 · BY-10a,**10b**,11,**11c**…15 · **KR-01…10** · OP-03…06,09,10,11 · ER-04,05,06,15,18,**21,22** |
| **5 — Intelijen** | 12 | TN-27,28 · BY-19 |

> **Catatan penjadwalan v2.2:** OP-09 & OP-10 **turun ke Fase 4**. Yang dibutuhkan Fase 1 adalah
> **datanya**, bukan UI-nya — cukup file *seed* `COMMODITIES` (grade, toleransi susut, rendemen)
> dan `ZONES` (nilai minimum pesanan). Konsol CRUD-nya baru perlu saat komoditas melebihi daftar awal.

---

## 8. Keputusan yang Sudah Diambil (v2.2)

Enam gap yang ditemukan saat menyusun inventaris ini **sudah diputuskan** dan dipropagasi ke PRD v2.2 +
diagram terkait. Dicatat di sini supaya desainer tahu *kenapa* sebuah halaman berbentuk demikian.

| # | Gap | Keputusan | Dampak halaman |
|---|---|---|---|
| 1 | Siapa mendeklarasikan gagal panen? | **Tenant**, melalui **node timeline `GAGAL_PANEN`** (append-only, wajib foto + GPS + alasan). Harvest Assurance dipicu **segera**; verifikasi satelit berjalan paralel & asinkron — pembeli tidak menunggu langit cerah. | TN-20, TN-20a |
| 1b | Panen sebagian | **FIFO berdasarkan `PAYMENTS.paid_at`** (bukan waktu order dibuat — agar tidak bisa di-*gaming*). Pesanan dipenuhi **utuh** berurutan. Pembeli di perbatasan **memilih**, tidak dipaksa parsial. | TN-19, TN-19a, BY-11, BY-11c |
| 2 | Master data komoditas & zona | **Seed data di Fase 1, konsol CRUD di Fase 4.** Yang memblokir adalah datanya, bukan UI-nya. | OP-09, OP-10 → Fase 4 |
| 3 | Bayar Laporan Ketertelusuran | **Checkbox di checkout**, ikut tagihan yang sama. Pembayaran mikro terpisah tidak masuk akal (fee gateway ±16%). | **BY-18 dihapus** → BY-06a |
| 4 | Langganan lapse | **Badge yang sudah terbit permanen.** Batch dengan PO terjual tetap diverifikasi. Hanya batch **baru** yang terkunci. Tenggang 14 hari. | TN-30a, ER-11 |
| 5 | Kanal notifikasi | **WhatsApp** untuk kejadian kritis + **SMS fallback** (infra SMS sudah ada untuk OTP). Notifikasi kedatangan **bertahap**: Dikirim → ±1 km → 100 m; jendela 60 menit baru mulai di tahap terakhir. | BY-10b |

**Angka kebijakan yang mengikat desain** (jangan diubah tanpa update PRD):

| Angka | Untuk | Ref |
|---|---|---|
| **10%** | Cap tanggungan Tenant atas selisih harga substitusi. **Gugur** bila gagal panen tak terverifikasi. | FR-7.11 |
| **15%** | Ambang shortfall terverifikasi (rolling 2 siklus) → `quota_multiplier` 0,70 → 0,50 | FR-7.12 |
| **14 hari** | Masa tenggang langganan | FR-9.4 |
| **±1 km / 100 m** | Radius notifikasi bertahap | FR-10.2 |

> Angka **10%** sengaja dipakai ulang di tiga tempat (biaya pembatalan pembeli FR-7.5, ambang klaim otomatis
> FR-5.5, cap selisih substitusi FR-7.11) — satu angka yang sama lebih mudah dijelaskan ke juri dan diingat tim.

### Sengaja TIDAK ada halaman (jangan didesain)

- **Pemilihan ekspedisi saat checkout** — pengaturan kurir sepenuhnya di tangan Tenant.
- **Metrik performa kurir di dashboard Tenant** — kurir tidak punya identitas dalam sistem.

Keduanya ditolak eksplisit oleh **FR-6.4**.
