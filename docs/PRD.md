# Product Requirements Document (PRD) — AgroUs

| | |
|---|---|
| **Nama Produk** | AgroUs |
| **Versi Dokumen** | v2.0 (Revisi Strategis — menggantikan v1.0 MVP Draft) |
| **Tanggal** | 25 Juli 2026 |
| **Platform** | Progressive Web App (Responsive/Mobile-First) |
| **Fase Rilis** | MVP (12 Minggu Pengembangan) |
| **Model Bisnis** | B2B SaaS + Marketplace + Demand Intelligence |
| **Target Pengguna** | B2B — Produsen Agrikultur (Tenant) & Pembeli Institusional (Restoran/HORECA/Distributor) |
| **Pasar Awal** | Malang Raya (Kota Malang, Kabupaten Malang, Batu) |
| **Tagline** | *Kami tidak percaya klaim petani. Kami memverifikasinya.* |

---

## Ringkasan Perubahan dari v1.0

Dokumen ini bukan sekadar penyempurnaan redaksional. Terdapat enam perubahan struktural yang mengubah posisi produk dari "marketplace agrikultur dengan fitur pelacakan" menjadi "sistem produksi berbasis permintaan yang terverifikasi".

1. **Timeline Immutable → Verified Timeline.** Pada v1.0 data diinput bebas oleh Tenant lalu dikunci. Pada v2.0 setiap node wajib disertai bukti mesin (foto ber-EXIF dan rantai hash) serta divalidasi silang dengan citra satelit Sentinel-2. *Alasan: data yang tidak diverifikasi hanyalah kebohongan yang dikunci selamanya. Verifikasi adalah moat, immutability bukan.*
2. **Order Satu Tenant → Keranjang Lintas-Tenant.** Pada v1.0 pembeli hanya bisa memesan dari satu Tenant per transaksi. Pada v2.0 tersedia keranjang lintas-Tenant dengan konsolidasi pengiriman per zona. *Alasan: restoran membutuhkan 30-50 SKU dalam satu pengiriman. Order terfragmentasi menghancurkan unit economics.*
3. **Tanpa Refund → Escrow dan Harvest Assurance.** Pada v1.0 tidak ada pembatalan, refund, maupun kompensasi. Pada v2.0 dana ditahan di escrow hingga barang diterima, dengan opsi substitusi atau refund saat gagal panen. *Alasan: gagal panen adalah kejadian normal dalam agrikultur, bukan pengecualian.*
4. **Geofence Auto-Complete → Dual-Signal PoD.** Pada v1.0 geofencing memicu status "Diterima" otomatis. Pada v2.0 geofence memicu notifikasi, lalu pembeli mengonfirmasi dengan satu ketukan disertai foto kondisi barang. *Alasan: koordinat GPS bukan bukti serah terima.*
5. **Penambahan Modul Mutu dan Susut.** Pada v1.0 tidak ada penanganan mutu, grading, atau penyusutan. Pada v2.0 tersedia kelas mutu A/B/C, toleransi susut yang disepakati, dan jendela klaim 2 jam. *Alasan: mutu dan penolakan barang adalah realitas operasional harian procurement HORECA.*
6. **Reposisi menjadi Demand Intelligence Platform.** Pada v1.0 produk diposisikan sebagai marketplace. Pada v2.0 data PO agregat diubah menjadi rekomendasi tanam bagi Tenant. *Alasan: aset sesungguhnya bukan transaksi, melainkan data permintaan pra-panen. Ini membalik rantai pasok dari push menjadi pull.*

---

## 1. Product Overview & Positioning

### 1.1. Pernyataan Posisi

Untuk restoran dan distributor yang kehilangan uang karena pasokan komoditas segar yang tidak pasti, AgroUs adalah platform rantai pasok berbasis permintaan yang mengunci kuota panen sebelum tanam dan memverifikasi setiap klaim budidaya dengan bukti independen.

Berbeda dengan marketplace agrikultur konvensional yang hanya memindahkan transaksi ke layar, AgroUs mengubah arah rantai pasok: **permintaan pembeli menentukan apa yang ditanam, bukan sebaliknya.**

### 1.2. Tiga Lapisan Produk

1. **Lapisan 1 — Transaksi:** Pre-Order pra-panen berbasis kuota, escrow pembayaran, konsolidasi pengiriman, dan pelacakan logistik. Menghasilkan pendapatan dan arus data. *Mudah ditiru.*
2. **Lapisan 2 — Verifikasi:** Verified Timeline berupa bukti foto ber-metadata, rantai hash, dan validasi silang citra satelit. Menghasilkan kepercayaan yang bisa dijual sebagai premium harga. *Sulit ditiru.*
3. **Lapisan 3 — Intelijen:** Agregasi permintaan pra-panen menjadi rekomendasi tanam untuk Tenant. Menghasilkan network effect. *Nyaris mustahil ditiru pendatang baru.*

---

## 2. Problem & Solution

### 2.1. Tiga Masalah Inti

1. **Ketidakpastian Pasokan (Sisi Pembeli):** Restoran dan distributor tidak memiliki kepastian volume maupun harga untuk komoditas segar. Harga dapat berayun 30-50% dalam hitungan minggu, sementara menu dan margin restoran bersifat kaku.
2. **Klaim Budidaya yang Tidak Dapat Dibuktikan:** Pembeli yang bersedia membayar premium untuk praktik budidaya tertentu (rendah residu, organik, tertelusur) tidak memiliki cara memverifikasi klaim tersebut. Sertifikasi pihak ketiga mahal dan lambat bagi petani kecil.
3. **Ketidakpastian Serah Terima Kargo:** Kurir pihak ketiga kerap lalai memperbarui status dan menolak memasang aplikasi khusus. Pembeli tidak dapat merencanakan penerimaan, penjual tidak punya bukti serah terima saat sengketa.

### 2.2. Solusi AgroUs

1. **Atas Masalah 1 — Pre-Order Pra-Panen Harga Terkunci:** Tenant membuka kuota sebelum tanam. Pembeli mengunci volume dan harga. Dana ditahan di escrow hingga serah terima.
2. **Atas Masalah 2 — Verified Timeline:** Setiap node perawatan wajib disertai foto ber-metadata GPS dan waktu. Sistem memvalidasi silang dengan citra satelit lahan pada rentang tanggal yang diklaim.
3. **Atas Masalah 3 — Zero-Install Tracking & Dual-Signal PoD:** Kurir memindai QR dengan kamera bawaan. Geofence memicu notifikasi. Pembeli mengonfirmasi dengan satu ketukan disertai foto kondisi barang.

---

## 3. Unfair Advantage & Competitive Moat

### 3.1. Lanskap Kompetitif

| Dimensi | Model Umum di Pasar | AgroUs |
|---|---|---|
| Aset | Fulfillment center + armada sendiri (padat modal) | Asset-light: gudang mitra + kurir pihak ketiga |
| Arah rantai pasok | **Push** (beli hasil panen lalu cari pembeli) | **Pull** (kunci permintaan dulu, produksi mengikuti) |
| Basis kepercayaan | Klaim sepihak penjual / sertifikasi mahal | Bukti mesin + validasi satelit (murah & otomatis) |
| Sumber pendapatan | Take-rate tipis 3-5% | Take-rate + langganan SaaS + biaya verifikasi premium |

### 3.2. Tiga Sumber Keunggulan

- **A — Verifikasi Independen Biaya Mendekati Nol.** Citra Sentinel-2 gratis (Copernicus), resolusi 10 m, revisit ~5 hari. Deret waktu NDVI/NDMI pada poligon lahan memeriksa apakah lahan benar ditanami & dipanen sesuai klaim.
  - *Bisa diverifikasi:* keberadaan tanaman aktif, perkiraan tanggal tanam & panen, luas lahan produktif.
  - *Tidak bisa diverifikasi:* jenis pupuk/pestisida spesifik → pakai bukti sekunder (foto nota pembelian input).
  - *Mengapa moat:* pipeline geospasial + kalibrasi baseline per komoditas butuh waktu & data historis, bukan sekadar uang.
- **B — Aset Data Permintaan Pra-Panen.** Setiap Pre-Order adalah sinyal permintaan berjangka. Setelah 2-3 siklus tanam, data ini menjadi produk rekomendasi tanam. Network effect: makin banyak pengguna, makin akurat.
- **C — Friksi Nol pada Titik Terlemah Rantai.** Kurir cukup memindai QR dengan kamera bawaan — nol instalasi. Inovasi distribusi, bukan teknologi; justru di titik ini banyak pesaing gagal.

---

## 4. User Personas

### 4.1. Tenant / Penjual — "Pak Hadi" (Admin Kebun)
- **Profil:** Pengelola kebun 2-15 ha di Kabupaten Malang. Usia 30-50. Melek ponsel, tidak melek komputer.
- **Tujuan:** Kepastian pembeli sebelum tanam, harga lebih baik dari tengkulak.
- **Frustrasi:** Harga jatuh saat panen raya, tidak punya daya tawar, modal habis di awal musim.
- **Perangkat:** Android kelas menengah, koneksi tidak stabil di kebun.
- **Implikasi Desain:** Input timeline harus bisa sambil berdiri di kebun, offline-tolerant, ≤3 ketukan per node.

### 4.2. Pembeli — "Bu Rina" (Purchasing Manager Restoran)
- **Profil:** Pengadaan 2-5 outlet. Memesan 30-50 SKU, 2-3 kali/minggu.
- **Tujuan:** Harga stabil, mutu konsisten, satu pengiriman untuk banyak item.
- **Frustrasi:** Barang tidak sesuai grade, tidak ada mekanisme klaim jelas, harus menelepon lima pemasok.
- **Perangkat:** Ponsel di lapangan, desktop saat rekonsiliasi tagihan.
- **Implikasi Desain:** Wajib keranjang lintas-Tenant, kelas mutu eksplisit di katalog, jendela klaim tegas.

### 4.3. Kurir — "Mas Anto" (Pengemudi Pihak Ketiga)
- **Profil:** Pengemudi lepas / karyawan vendor logistik lokal. Melayani banyak klien per hari.
- **Tujuan:** Selesaikan rute secepat mungkin tanpa administrasi tambahan.
- **Frustrasi:** Diminta memasang aplikasi berbeda tiap klien, memori ponsel penuh.
- **Implikasi Desain:** Nol instalasi, nol pendaftaran akun, nol tombol wajib. Cukup satu pemindaian QR.

---

## 5. Functional Requirements (Fitur Inti)

> Kode unik **FR-x.y**. Prioritas MoSCoW: **M** (Must), **S** (Should), **C** (Could).

### 5.1. Modul Landing Page & Autentikasi

| Kode | Prio | Requirement |
|---|---|---|
| FR-1.1 | M | Landing page menekankan verifikasi satelit sebagai pembeda utama, bukan sekadar pelacakan. |
| FR-1.2 | M | Dua CTA utama: "Mulai Menjual" (Tenant) dan "Cari Produk" (Pembeli). |
| FR-1.3 | M | Registrasi via nomor telepon + OTP. Email opsional. |
| FR-1.4 | M | Onboarding Tenant: nama perusahaan, logo, nomor telepon aktif, pemetaan lokasi kebun. |
| FR-1.5 | M | Pemetaan lahan: gambar poligon di peta interaktif atau walk-around GPS. Poligon = dasar seluruh verifikasi satelit. |
| FR-1.6 | S | Tolak poligon < 0,1 ha (di bawah resolusi andal Sentinel-2) → tandai "Verifikasi Terbatas". |
| FR-1.7 | S | Verifikasi legalitas Tenant via unggah NIB/KTP, ditinjau manual oleh operator. |

### 5.2. Modul Pembeli (Buyer Storefront)

| Kode | Prio | Requirement |
|---|---|---|
| FR-2.1 | M | Pembeli memilih kota layanan; sistem menampilkan Tenant yang melayani zona tersebut. |
| FR-2.2 | M | Katalog terpadu lintas-Tenant, dapat ditelusuri berdasarkan komoditas. |
| FR-2.3 | M | Keranjang mendukung item dari beberapa Tenant dalam satu transaksi. |
| FR-2.4 | M | Item dikelompokkan jadi "Rencana Pengiriman" per zona & tanggal panen, ongkir terkonsolidasi. |
| FR-2.5 | M | Tiap produk menampilkan grade (A/B/C), harga per box, kuantitas per box (kg), estimasi tanggal panen. |
| FR-2.6 | M | Badge Verifikasi 3 status: Terverifikasi Satelit, Bukti Foto Saja, Belum Terverifikasi. |
| FR-2.7 | M | Detail pengiriman: nama penerima, titik peta, patokan (opsional), telepon, jam operasional terima. |
| FR-2.8 | M | Pembayaran QRIS/VA/E-Wallet dengan validasi otomatis tanpa unggah bukti transfer. |
| FR-2.9 | M | Halaman "Pesanan Saya": status, Verified Timeline, posisi kargo real-time. |
| FR-2.10 | S | Unduh Laporan Ketertelusuran (PDF) berisi rantai bukti lengkap untuk audit/pemasaran. |
| FR-2.11 | C | "Pesan Ulang" — menyalin komposisi order sebelumnya dalam satu ketukan. |

### 5.3. Modul Manajemen Tenant (Seller Dashboard)

| Kode | Prio | Requirement |
|---|---|---|
| FR-3.1 | M | Sidebar: Dashboard, Katalog Produk, Manajemen Batch, Pesanan Aktif, Rekomendasi Tanam. |
| FR-3.2 | M | Katalog: nama produk, grade, harga per box, kuantitas per box (kg), deskripsi, stok (box), estimasi panen. |
| FR-3.3 | M | Buka kuota Pre-Order: jumlah box, harga terkunci, perkiraan tanggal panen. Kuota maks dibatasi luas poligon × rendemen rata-rata komoditas. |
| FR-3.4 | M | Satu Pre-Order terikat satu Batch; satu Batch terikat satu poligon lahan terdaftar. |
| FR-3.5 | M | Dashboard menampilkan nilai escrow tertahan + jadwal pencairan. |
| FR-3.6 | M | "Cetak QR Box" muncul hanya setelah status batch = "Panen". Tiap box QR unik, tidak dapat dipakai ulang. |
| FR-3.7 | S | Halaman Rekomendasi Tanam: permintaan agregat belum terpenuhi di zona Tenant untuk 8-16 minggu ke depan. |

### 5.4. Modul Verified Timeline

> **Catatan perubahan:** v1.0 hanya immutable (dikunci setelah simpan). v2.0 mempertahankan immutability sebagai fondasi teknis, ditambah lapisan bukti dan verifikasi independen. Klaim tanpa bukti tetap boleh disimpan, namun ditampilkan sebagai "Belum Terverifikasi".

**5.4.1. Struktur Node Timeline** — tiap node wajib memuat 5 elemen (node tanpa elemen wajib ditolak):

1. **Jenis Kegiatan** — dipilih dari daftar terstruktur (Penyiapan Lahan, Penanaman, Pemupukan, Pengendalian Hama, Pengairan, Panen). Bukan teks bebas.
2. **Deskripsi** — teks ≤ 280 karakter.
3. **Bukti Foto** — minimal satu foto dari kamera dalam aplikasi. Unggahan galeri ditandai berbeda & menurunkan kepercayaan node.
4. **Metadata** — koordinat GPS & stempel waktu perangkat, direkam otomatis, tidak dapat disunting.
5. **Hash** — SHA-256 dari isi node + hash node sebelumnya → rantai tamper-evident.

**5.4.2. Aturan Verifikasi**

| Kode | Prio | Requirement |
|---|---|---|
| FR-4.1 | M | Endpoint timeline **INSERT ONLY**. Tidak ada UPDATE/DELETE di level API. |
| FR-4.2 | M | Koreksi via node "Ralat" yang merujuk node sebelumnya. Node asli tetap tampil. |
| FR-4.3 | M | Tolak node yang GPS-nya di luar poligon, kecuali Tenant memberi alasan tertulis (ditampilkan ke pembeli). |
| FR-4.4 | M | Job harian mengambil citra Sentinel-2 tiap poligon aktif, hitung deret NDVI, bandingkan klaim tanggal tanam/panen. |
| FR-4.5 | M | Status verifikasi batch otomatis: Terverifikasi / Perlu Ditinjau / Tidak Dapat Diverifikasi (awan berlebih atau lahan terlalu kecil). |
| FR-4.6 | M | Ketidaksesuaian ditampilkan terbuka ke pembeli, bukan disembunyikan. |
| FR-4.7 | S | Node Pemupukan & Pengendalian Hama dapat menyertakan foto nota pembelian input sebagai bukti sekunder. |
| FR-4.8 | M | Status "Panen" hanya bisa jika ≥1 node penanaman tercatat sebelumnya & rentang waktunya masuk akal bagi komoditas. |

**5.4.3. Batasan yang Diakui Terbuka** — verifikasi satelit tidak dapat membuktikan jenis pupuk/pestisida; hanya keberadaan tanaman aktif, perkiraan waktu tanam/panen, luas lahan. Tutupan awan tropis dapat menghalangi pengamatan berminggu-minggu → status diturunkan ke "Tidak Dapat Diverifikasi" alih-alih menebak. Menyatakan batasan ini eksplisit adalah bagian dari strategi produk.

### 5.5. Modul Mutu, Susut & Klaim

| Kode | Prio | Requirement |
|---|---|---|
| FR-5.1 | M | Tiap produk wajib punya grade (A/B/C) dengan definisi terstandar per komoditas (ukuran, keseragaman, toleransi cacat). |
| FR-5.2 | M | Toleransi susut disepakati di muka: baku 5% sayuran daun, 3% buah & umbi. Selisih dalam toleransi tidak dapat diklaim. |
| FR-5.3 | M | Jendela klaim mutu 2 jam sejak status Diterima. Lewat itu, order dianggap diterima penuh. |
| FR-5.4 | M | Pengajuan klaim wajib menyertakan foto + berat aktual hasil timbang. |
| FR-5.5 | S | Klaim < 10% nilai order → selesai otomatis via potongan escrow tanpa peninjauan manual. |
| FR-5.6 | S | Klaim > 10% → antrean peninjauan operator, target 1 hari kerja. |
| FR-5.7 | S | Rasio klaim tiap Tenant ditampilkan publik di profil sebagai mekanisme reputasi. |

### 5.6. Modul Logistik & Order Status

**5.6.1. Hierarki Status Pesanan**

1. **Menunggu Panen** — pembayaran masuk escrow, batch belum dipanen. *Pemicu:* pembayaran tervalidasi gateway.
2. **Panen** — Tenant menetapkan panen, kargo disiapkan. *Pemicu:* node "Panen" tersimpan di timeline.
3. **Dikirim** — kargo dalam perjalanan, pelacakan GPS aktif. *Pemicu:* QR box dipindai kurir.
4. **Tiba di Lokasi** — kurir dalam radius geofence tujuan. *Pemicu:* perhitungan geofence otomatis.
5. **Diterima** — pembeli konfirmasi serah terima, jendela klaim mulai. *Pemicu:* konfirmasi 1-ketuk pembeli.
6. **Selesai** — jendela klaim berakhir, dana escrow dicairkan. *Pemicu:* otomatis setelah 2 jam tanpa klaim.

**5.6.2. Eksekusi Kurir (Alur Tanpa Instalasi)**

1. Tenant menempelkan QR Code tercetak pada tiap box fisik.
2. Kurir memindai QR dengan kamera bawaan / Google Lens.
3. Pemindaian membuka tautan browser berisi token sesi sekali pakai yang meminta izin lokasi. Tanpa daftar akun, tanpa instalasi.
4. Status pesanan otomatis → "Dikirim", posisi kurir mulai dipancarkan.
5. Saat kurir masuk radius 100 m dari tujuan → status "Tiba di Lokasi" + notifikasi ke pembeli.
6. Pembeli konfirmasi penerimaan 1-ketuk + foto kondisi barang. Kurir tidak perlu menekan apa pun.
7. Sesi pelacakan berakhir, token tidak berlaku.

**5.6.3. Catatan Radius Geofence** — diperlebar dari 50 m (v1.0) menjadi 100 m. Geolokasi browser bersandar pada triangulasi WiFi/seluler dengan galat 50-150 m di kota padat. Karena "Tiba di Lokasi" kini hanya memicu notifikasi (bukan penyelesaian final), radius lebih longgar justru lebih andal.

**5.6.4. Dual-Signal Proof of Delivery**

1. **Sinyal 1 (Geofence):** membuktikan kargo tiba fisik di lokasi tujuan.
2. **Sinyal 2 (Konfirmasi Pembeli):** membuktikan siapa yang menerima, kapan, dalam kondisi apa.
3. **Fallback:** jika pembeli tidak merespons dalam 60 menit setelah geofence, sistem set "Diterima Otomatis" + perpanjang jendela klaim jadi 24 jam sebagai kompensasi.

### 5.7. Modul Escrow & Harvest Assurance

| Kode | Prio | Requirement |
|---|---|---|
| FR-7.1 | M | Seluruh pembayaran ditahan di rekening escrow mitra payment gateway berizin, bukan rekening operasional AgroUs. |
| FR-7.2 | M | Dana dicairkan ke Tenant hanya setelah status Selesai & jendela klaim berakhir. |
| FR-7.3 | S | Tenant dapat mengajukan pencairan sebagian (maks 30%) saat status Panen untuk menutup biaya logistik. |
| FR-7.4 | M | Jika batch gagal panen, sistem menawarkan 3 opsi: substitusi dari Tenant lain (harga terkunci), penjadwalan ulang, atau refund penuh. |
| FR-7.5 | M | Pembatalan sepihak pembeli hanya saat status "Menunggu Panen", dikenakan biaya 10% yang diteruskan ke Tenant. |
| FR-7.6 | M | Setelah "Panen", pesanan mengikat & tidak dapat dibatalkan. Sengketa lewat jalur klaim mutu. |
| FR-7.7 | S | Tenant gagal memenuhi PO tanpa bukti gagal panen terverifikasi satelit → penalti reputasi + pembatasan kuota siklus berikut. |

**5.7.1. Catatan Kepatuhan (Wajib)** — struktur penghimpunan dana di muka untuk komoditas yang belum ada fisik mirip skema investasi. Pembatas: (1) pembeli adalah badan usaha yang membeli barang untuk dipakai, bukan investor; (2) tidak ada janji keuntungan finansial; (3) dana di rekening escrow mitra berizin, tidak pernah masuk rekening operasional platform. **AgroUs tidak boleh membangun unit pembiayaan sendiri**; jika pembiayaan input ditawarkan, harus lewat kemitraan dengan lembaga keuangan berizin.

### 5.8. Modul Demand Intelligence

| Kode | Prio | Requirement |
|---|---|---|
| FR-8.1 | M | Agregasi seluruh Pre-Order per komoditas, per zona, per minggu panen. |
| FR-8.2 | M | Rekomendasi Tanam dalam kalimat operasional. Contoh: *"Zona Malang membutuhkan tambahan 8 ton cabai rawit pada minggu ke-34. Belum ada Tenant yang membuka kuota. Estimasi harga terkunci Rp28.000/kg."* |
| FR-8.3 | M | Tenant dapat membuka kuota PO langsung dari halaman rekomendasi dalam satu ketukan. |
| FR-8.4 | S | Indikator kejenuhan pasokan untuk mencegah seluruh Tenant menanam komoditas sama (panen raya). |
| FR-8.5 | C | Laporan tren permintaan bulanan yang dapat dijual sebagai produk data terpisah. |

---

## 6. Technical & System Requirements

### 6.1. Arsitektur Data Append-Only

Entitas timeline = tabel append-only dengan rantai hash. Tiap baris menyimpan hash isinya + hash baris sebelumnya pada batch yang sama; mengubah satu baris memutus seluruh rantai setelahnya & langsung terdeteksi.

1. **Level API:** hanya INSERT & SELECT. Tidak ada UPDATE/DELETE untuk entitas progres.
2. **Level Basis Data:** hak akses aplikasi dibatasi INSERT & SELECT. Trigger menolak UPDATE/DELETE bahkan dari koneksi administratif.
3. **Level Verifikasi:** root hash tiap batch dipublikasikan harian ke penyimpanan write-once eksternal → integritas dapat dibuktikan tanpa mempercayai server AgroUs.

> Basis data append-only yang servernya dikendalikan operator tetap bisa dimodifikasi via SQL langsung. Publikasi root hash harian ke penyimpanan write-once eksternal adalah pembatas termurah yang mengubah klaim dari "percayalah kepada kami" menjadi "silakan periksa sendiri". **Blockchain tidak diperlukan.**

### 6.2. Pipeline Verifikasi Satelit

1. **Sumber:** Sentinel-2 Level-2A (surface reflectance) via Copernicus Data Space. Resolusi 10 m, revisit ~5 hari, tanpa biaya lisensi.
2. **Geometri:** poligon lahan disimpan sebagai GeoJSON. Tiap scene dipotong hanya pada piksel relevan.
3. **Penyaringan Kualitas:** Scene Classification Layer membuang piksel awan/bayang/cirrus. Scene dengan tutupan awan > 40% pada poligon dibuang.
4. **Analitik:** deret waktu NDVI & NDMI per poligon per tanggal. Titik tanam dari kenaikan tajam indeks vegetasi; titik panen dari penurunan tajam menuju tanah terbuka.
5. **Keputusan:** selisih tanggal deteksi vs klaim — < 7 hari **Terverifikasi**, 7-21 hari **Perlu Ditinjau**, > 21 hari **Tidak Sesuai**.
6. **Kalibrasi:** baseline kurva vegetasi per komoditas & per musim dari data historis — aset teknis yang butuh waktu & sulit ditiru.

### 6.3. Pelacakan GPS dan Batasannya

1. **Suspensi JavaScript:** JS disuspensi saat tab ke background/layar terkunci (terutama Safari iOS). *Mitigasi:* Screen Wake Lock API, halaman dirancang agar layak dibiarkan terbuka, deteksi jeda + interpolasi rute.
2. **Akurasi Geolokasi:** galat 50-150 m di kota padat. *Mitigasi:* radius geofence 100 m, geofence hanya memicu notifikasi.
3. **Sesi Terputus:** kurir menutup tab/kehabisan baterai/kehilangan sinyal. *Mitigasi:* tampilkan posisi terakhir dengan stempel waktu jujur + jalur konfirmasi manual pembeli.
4. **Pemalsuan Koordinat:** koordinat browser dapat dipalsukan. *Mitigasi:* pemeriksaan kewajaran kecepatan & lompatan posisi + sinyal kedua (konfirmasi pembeli) yang membuat pemalsuan sepihak tidak berguna.

### 6.4. Stack & Integrasi

1. **Frontend:** Next.js (PWA) + Tailwind CSS. Satu basis kode untuk seluruh persona; halaman kurir dibuat sangat ringan.
2. **Backend:** Node.js atau Go + PostgreSQL + **PostGIS** (operasi poligon lahan & geofence).
3. **Real-time:** WebSocket untuk posisi kurir, SSE cadangan. Frekuensi kirim 10 detik (hemat baterai & kuota).
4. **Peta:** Mapbox GL JS (biaya terkendali di volume awal, mendukung rendering poligon).
5. **Geospasial:** Copernicus Data Space + pemrosesan Python (rasterio, numpy). Pekerjaan terjadwal harian, bukan sinkron.
6. **Pembayaran:** Midtrans atau Xendit dengan penahanan dana. Wajib skema escrow mitra, bukan penahanan mandiri.
7. **Penyimpanan:** object storage untuk foto bukti; metadata EXIF diekstrak & disimpan terpisah. Foto tidak dikompresi ulang sebelum ekstraksi metadata.

---

## 7. Manajemen Risiko

| # | Risiko | Tingkat | Mitigasi |
|---|---|---|---|
| 1 | **Side-Selling** — Tenant menjual ke pihak lain saat harga pasar melonjak | Tinggi | Verifikasi satelit deteksi panen tanpa pemenuhan PO; penalti reputasi publik; pembatasan kuota; bagi keuntungan 50/50 bila harga pasar melampaui ambang. |
| 2 | **Gagal Panen** — cuaca, hama, penyakit | Tinggi | Harvest Assurance (3 opsi); kuota PO maks 70% kapasitas lahan; jaringan Tenant sezona untuk substitusi. |
| 3 | **Unit Economics Negatif** — ongkir order kecil > take-rate | Tinggi | Nilai minimum pesanan per zona; konsolidasi lintas-Tenant; jendela pengiriman terjadwal. |
| 4 | **Ketidakpatuhan Regulasi** — dipersepsi skema investasi | Sedang | Escrow mitra berizin; tanpa janji imbal hasil; pembeli terbatas badan usaha; konsultasi hukum pra-peluncuran. |
| 5 | **Kegagalan Pelacakan GPS** | Sedang | Rangkaian mitigasi §6.3 + konfirmasi pembeli sebagai jalur independen. |
| 6 | **Adopsi Tenant Rendah** | Sedang | Input timeline ≤3 ketukan/node + insentif harga premium nyata bagi batch Terverifikasi. |
| 7 | **Verifikasi Satelit Gagal** — tutupan awan berkepanjangan | Sedang | Status diturunkan jujur ke Tidak Dapat Diverifikasi; bukti foto tetap berlaku sebagai lapis kedua. |

---

## 8. Model Bisnis & Unit Economics

### 8.1. Sumber Pendapatan

1. **Take-Rate Transaksi:** 4% nilai order, dipotong sisi Tenant.
2. **Langganan SaaS Tenant:** Rp199.000/bulan (paket Verified) — mencakup verifikasi satelit, kuota PO tanpa batas, akses Rekomendasi Tanam.
3. **Laporan Ketertelusuran:** Rp25.000/laporan bagi pembeli (audit/pemasaran).
4. **Produk Data Agregat:** skema kontrak pasca-MVP (laporan tren permintaan untuk distributor besar & lembaga riset).

### 8.2. Asumsi Unit Economics (Ilustratif — validasi pada 90 hari pertama)

| Metrik | Nilai |
|---|---|
| Nilai rata-rata pesanan | Rp3.500.000 (order mingguan restoran menengah, 20-30 SKU) |
| Pendapatan take-rate per order | Rp140.000 (4%) |
| Biaya logistik per pengiriman | Rp85.000 (konsolidasi dalam kota, ~18 km) |
| **Marjin kotor per order** | **Rp55.000** (belum termasuk langganan) |
| Titik kritis | Marjin negatif di bawah nilai order Rp2.200.000 → **nilai minimum pesanan wajib** |

---

## 9. Design & UI/UX Guidelines

1. **Visual:** profesional, bersih, berorientasi data. Terasa seperti perangkat kerja, bukan etalase.
2. **Tipografi:** **Fredoka** untuk Heading (judul, angka metrik); **Poppins** untuk Body (paragraf, tabel, form).
3. **Warna:** hijau tua (utama), amber (aksen status/peringatan). Status verifikasi: hijau = Terverifikasi, amber = Perlu Ditinjau, abu-abu = Tidak Dapat Diverifikasi.
4. **Responsivitas:** Modul Kurir & Pembeli optimal di mobile; Dashboard Tenant untuk desktop/tablet. Input timeline tetap nyaman di ponsel (dilakukan di kebun).
5. **Halaman Kurir:** ukuran muat < 150KB. Tanpa gambar besar/font kustom/framework berat. Terbuka dalam hitungan detik di 3G.
6. **Aksesibilitas:** kontras minimum 4.5:1; target sentuh minimum 44×44 px. Antarmuka Tenant terbaca di bawah sinar matahari.
7. **Bahasa:** Indonesia utama. Hindari istilah teknis di antarmuka Tenant (gunakan "Bukti Foto", bukan "Upload Evidence").

---

## 10. Success Metrics (90 hari pertama)

| Kategori | Target |
|---|---|
| Adopsi Tenant | 25 Tenant aktif dengan ≥1 batch terverifikasi |
| Adopsi Pembeli | 40 pembeli aktif dengan ≥2 pesanan |
| Kepercayaan — Cakupan Verifikasi | > 70% batch Terverifikasi Satelit |
| Kepercayaan — Premium Harga | Selisih harga rata-rata batch Terverifikasi > 8% |
| Operasional — Pemenuhan PO | > 85% PO terpenuhi tanpa gagal panen |
| Operasional — Rasio Klaim | < 7% total pesanan |
| Teknis — Keberhasilan Pelacakan | > 80% sesi pelacakan berhasil hingga geofence terpicu |
| Retensi | > 50% pembeli memesan ulang dalam 30 hari |
| Validasi Model | ≥ 15 PO dibuka Tenant sebagai respons Rekomendasi Tanam |

---

## 11. Roadmap & Out of Scope

### 11.1. Roadmap MVP (12 Minggu)

1. **Fase 1 — Fondasi (Minggu 1-3):** Autentikasi, onboarding Tenant, pemetaan poligon lahan, katalog produk, kerangka DB append-only.
2. **Fase 2 — Transaksi (Minggu 4-6):** Katalog terpadu, keranjang lintas-Tenant, checkout, integrasi payment gateway, escrow.
3. **Fase 3 — Verifikasi (Minggu 7-9):** Verified Timeline, penangkapan bukti foto, rantai hash, pipeline Sentinel-2.
4. **Fase 4 — Logistik (Minggu 10-11):** Pembuatan QR, sesi pelacakan kurir, geofencing, Dual-Signal PoD, modul klaim mutu.
5. **Fase 5 — Intelijen (Minggu 12):** Agregasi permintaan, halaman Rekomendasi Tanam, penyempurnaan.

### 11.2. Di Luar Ruang Lingkup MVP

- **Aplikasi Native** — seluruh persona via PWA.
- **Pembiayaan Input Pertanian** — pasca-MVP, hanya via kemitraan lembaga keuangan berizin.
- **Multi-Kota** — MVP terbatas Malang Raya.
- **Integrasi ERP Pembeli** — ekspor CSV manual dinilai memadai.
- **Lelang / Harga Dinamis** — harga terkunci saat pembukaan PO.
- **Sertifikasi Organik Formal** — AgroUs menyediakan bukti, bukan sertifikat.
- **Blockchain** — sengaja tidak digunakan; rantai hash + root hash write-once eksternal setara dengan biaya jauh lebih rendah.

---

## 12. Panduan Demonstrasi

### 12.1. Dua Momen yang Wajib Ditampilkan

1. **Layar Verifikasi (60 detik):** split-screen — kiri Verified Timeline + foto bukti, kanan grafik NDVI satelit pada poligon yang sama. Tunjukkan kenaikan kurva vegetasi berimpit tanggal tanam, penurunan berimpit tanggal panen. *Penutup: "Kompetitor meminta Anda mempercayai kata petani. Kami memeriksanya dari orbit, setiap lima hari, tanpa biaya lisensi."*
2. **Rantai Logistik Tanpa Instalasi (45 detik):** ponsel kedua sebagai perangkat kurir. Pindai QR pakai kamera bawaan → status berubah "Dikirim" otomatis di layar pembeli → ikon kendaraan bergerak → notifikasi kedatangan terpicu geofence. *Penutup: "Kurir tidak mengunduh apa pun, tidak mendaftar apa pun, dan tidak menekan apa pun."*

### 12.2. Pertanyaan yang Harus Diantisipasi

- **"Bukankah sama dengan platform agritech yang ada?"** → Platform lain memindahkan transaksi ke layar & tetap mengandalkan klaim sepihak. AgroUs memverifikasi klaim secara independen & membalik arah rantai pasok push → pull.
- **"Bagaimana jika petani berbohong pada timeline?"** → Verifikasi satelit mendeteksi ketidaksesuaian tanggal tanam/panen. Untuk yang tak terverifikasi, status ditampilkan apa adanya. Kami tidak mengklaim mendeteksi segalanya.
- **"Bagaimana jika gagal panen?"** → Harvest Assurance: substitusi, penjadwalan ulang, atau refund penuh dari escrow.
- **"Mengapa tidak blockchain?"** → Rantai hash + root hash write-once eksternal memberi jaminan setara tanpa biaya & kompleksitas tambahan.
- **"Apa yang menghalangi pemain besar meniru?"** → Fitur bisa ditiru 6 bulan; baseline kurva vegetasi per komoditas & basis data permintaan pra-panen butuh beberapa siklus tanam, nilainya bertambah seiring pertumbuhan pengguna.

---

## Catatan Penutup

Dokumen ini merupakan revisi strategis atas PRD AgroUs v1.0. Seluruh perubahan bersifat menaikkan tingkat pertahanan produk terhadap pertanyaan kritis, bukan menambah jumlah fitur.

---

### Dokumen terkait

- [Use Case Diagram](diagrams/01-use-case.md)
- [Activity Diagram](diagrams/02-activity.md)
- [User Flow](diagrams/03-user-flow.md)
- [Sequence Diagram](diagrams/04-sequence.md)
- [Entity Relationship Diagram](diagrams/05-erd.md)
