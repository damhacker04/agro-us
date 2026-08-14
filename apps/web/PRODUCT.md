# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Tenant (produsen agrikultur)** — gapoktan dan petani di Malang Raya. Mengelola lahan,
membuka kuota Pre-Order sebelum tanam, dan mencatat kegiatan lapangan. Bekerja **di kebun**,
sambil berdiri, sering dengan satu tangan.

**Pembeli institusional** — restoran, HORECA, dan distributor. Mengunci pasokan sebelum
panen dan menanggung risiko bila pasokan meleset. Mengambil keputusan pembelian dari kantor.

**Kurir** — mengantar pesanan. **Tidak memasang aplikasi apa pun**: masuk lewat pindai QR
dengan kamera bawaan ponsel, lalu memasukkan Kode Antar 4 digit.

**Operator AgroUs** — staf internal. Meninjau legalitas Tenant, klaim mutu, penilaian
kewajaran hasil panen, dan escrow. Bekerja dari antrean kerja, bukan dari eksplorasi.

## Product Purpose

Mempertemukan produsen agrikultur dengan pembeli institusional lewat **Pre-Order yang
dikunci sebelum tanam**: pembeli mendapat kepastian pasokan dan harga, produsen mendapat
permintaan yang pasti sebelum mengeluarkan modal.

Masalah yang dipecahkan bukan "mempertemukan penjual dan pembeli" — itu sudah banyak.
Masalahnya adalah **pembeli tidak punya alasan mempercayai janji pasokan** yang dibuat
berbulan-bulan sebelum barangnya ada.

Berhasil bila pembeli bersedia membayar di muka untuk barang yang belum ditanam, dan
tetap bersedia mengulanginya setelah satu siklus yang tidak sempurna.

## Positioning

**Verified Timeline** — setiap kegiatan lapangan tercatat sebagai node berantai hash
append-only, disertai foto, GPS, dan stempel waktu perangkat, lalu **diuji silang dengan
citra satelit Sentinel-2**: kurva NDVI menentukan apakah tanggal tanam dan panen yang
diklaim Tenant konsisten dengan apa yang benar-benar terlihat dari orbit.

Yang tidak bisa ditiru pesaing dalam semalam bukan kode verifikasinya, melainkan **aset
kalibrasinya**: kurva vegetasi dan rendemen acuan per komoditas per musim, yang hanya
terbentuk dari pengamatan lapangan berulang.

Pembeda kedua: sistem ini **menyatakan kapan ia tidak tahu**. Awan menutup citra, zona
belum punya cukup pembanding, mitra pembayaran belum menjawab — semuanya punya status
tersendiri dan tidak pernah disamarkan menjadi "terverifikasi".

## Operating Context

- **Pasar awal:** Malang Raya — Kota Malang, Kabupaten Malang, Kota Batu. Tiap zona punya
  nilai minimum pesanan sendiri.
- **Perangkat berbeda per peran** *(dikonfirmasi)*: Tenant dan kurir memakai ponsel Android
  kelas menengah-bawah di lapangan dengan sinyal seadanya; pembeli dan operator memakai
  desktop kantor. Tiap peran dioptimalkan untuk perangkatnya sendiri, bukan satu kompromi.
- **Pencatatan lapangan** dibatasi maksimal tiga ketukan + kamera. Foto wajib diambil
  langsung; foto dari galeri tercatat sebagai sumber yang menurunkan derajat kepercayaan.
- **Kurir zero-install**: seluruh alurnya berjalan di peramban, dari tautan hasil pindai QR.
- **Jendela klaim mutu 2 jam** sejak status Diterima; lewat itu pesanan dianggap diterima
  penuh dan escrow dicairkan.
- **Konteks penilaian saat ini:** produk sedang dinilai pada lomba IT Fest IPB. Data yang
  tampil adalah data karangan, dan halaman-halamannya dibaca oleh juri sebelum dibaca
  pengguna sungguhan.

## Capabilities and Constraints

**Sudah berjalan di produksi** — 57 halaman, empat peran, seluruh siklus: pemetaan lahan
poligon (PostGIS), kuota PO dibatasi kapasitas lahan, timeline berantai hash, alokasi hasil
panen FIFO dengan senioritas shortfall, Harvest Assurance (substitusi / jadwal ulang /
refund), klaim mutu, dan buku besar escrow append-only.

**Batasan produk yang tidak boleh dikaburkan di antarmuka:**

- **Komoditas MVP dibatasi yang tahan suhu ambien** (cabai, bawang, umbi). Sayuran daun di
  luar lingkup: tanpa rantai dingin, susutnya melampaui toleransi dan setiap pengiriman
  akan memicu klaim.
- **Mitra pembayaran belum tersambung.** Tombol "Saya Sudah Bayar" adalah simulasi
  ber-otentikasi, dan pencairan escrow berstatus `PENDING` — bukan `SUCCESS`.
- **Verifikasi satelit belum menyala di produksi**; angka NDVI yang tampil adalah data
  contoh. Pipeline-nya nyata dan teruji, tetapi belum ditarik langsung.
- **Angka kalibrasi masih estimasi** yang belum divalidasi lapangan, dan menyatakan dirinya
  demikian di basis data.
- **Ambang penalti tidak pernah ditampilkan di mana pun** — bukan preferensi tampilan,
  melainkan syarat agar angka yang dilaporkan sendiri oleh Tenant tidak berubah menjadi
  target.

**Istilah yang dipakai konsisten:** Tenant, Pembeli, Kurir, Operator · Batch · Kuota PO ·
Verified Timeline · Kode Antar · Harvest Assurance · Pita Kewajaran Hasil.

## Brand Commitments

- **Nama "AgroUs" dan `public/logo.png` bersifat mengikat.** Tipografi, palet, dan seluruh
  bahasa visual lainnya bebas diganti *(dikonfirmasi)*.
- **Tagline PRD "Kami tidak percaya klaim petani. Kami memverifikasinya." tidak mengikat**
  dan tidak wajib tampil.
- **Larangan keras:** kalimat itu — dan nada menuduh apa pun terhadap produsen — **tidak
  boleh muncul di antarmuka Tenant mana pun**. Tenant adalah sisi pasok yang harus
  diakuisisi, bukan tersangka yang diawasi.

## Evidence on Hand

- **Produk berjalan sungguhan**: Vercel (web) + Render (API) + Supabase PostGIS. Seluruh
  alur sudah diuji ujung ke ujung terhadap produksi, termasuk perpindahan uang antar-Tenant.
- **Akun demo per peran** tercantum di `README.md`.
- **Pipeline Sentinel-2 nyata** lewat STAC/COG dari AWS Open Data — 16 uji di
  `apps/satellite-worker/tests`.
- **23 uji pagar keamanan** di `apps/api`.
- **Dokumen produk lengkap** di `docs/`: PRD, ERD, use case, activity, user flow, sequence,
  page inventory (v2.3).
- **Foto bukti**: tersimpan di Cloudflare R2 dan disajikan lewat domain API.

**Tidak ada, dan tidak boleh dikarang:** pelanggan nyata, testimoni, logo mitra, angka
penggunaan, liputan pers, sertifikasi, mitra pembayaran berizin, dan validasi lapangan atas
angka rendemen.

## Product Principles

1. **Nyatakan ketidaktahuan, jangan sembunyikan.** "Belum bisa dinilai" adalah jawaban yang
   sah dan harus terbaca berbeda dari "bermasalah". Menggabungkan keduanya membuat orang
   merasa dituduh karena cuaca.
2. **Peringatan datang sebelum konsekuensi, bukan sesudah.** Setiap layar yang menjatuhkan
   akibat finansial wajib punya layar peringatan pasangannya.
3. **Bukti harus bisa diperiksa tanpa mempercayai AgroUs.** Rantai hash, foto, dan koordinat
   terbuka untuk diverifikasi sendiri — itu produknya, bukan fiturnya.
4. **Sisi pasok diakuisisi, bukan diawasi.** Nada ke Tenant selalu informatif. Yang keras
   adalah mekanismenya, bukan kalimatnya.
5. **Jangan menuntut apa pun dari lapangan yang tidak bisa dilakukan sambil berdiri di kebun
   dengan satu tangan.**

## Accessibility & Inclusion

Belum ada standar formal yang ditetapkan. Yang sudah pasti dan mengikat secara praktis:
antarmuka Tenant dan kurir harus terbaca di bawah sinar matahari pada ponsel kelas
menengah-bawah, dan tetap dapat diselesaikan pada koneksi yang buruk.
