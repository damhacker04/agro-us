# Panduan pengguna AgroUs

Panduan berdasarkan implementasi yang diaudit 9–11 September 2026. Hambatan dan simulasi ditandai agar langkah demo tidak dianggap layanan produksi yang sudah lengkap. Lihat [laporan QA](AUDIT_TCC_2026.md) untuk daftar perbaikan.

## Tutorial sesuai implementasi saat audit

Panduan ini membedakan alur yang tersedia dengan hambatan yang perlu diperbaiki. Jalankan demo dengan data pengujian dan akun yang sudah memiliki profil; jangan menganggap simulasi pembayaran sebagai uang yang berpindah.

### Petani/pengelola lahan (Tenant)

1. Buka beranda → **Masuk sebagai Tenant** / `/auth/tenant`. Masukkan nomor WhatsApp dan verifikasi OTP enam digit. Kode demo terisi otomatis hanya bila API mengembalikan `devOtp`.
2. **Akun baru saat ini terhenti pada profil yang belum dibuat.** Sebagai workaround demo, setelah login buka `/tenant/onboarding/profile` secara langsung, isi nama usaha dan pilih satu/lebih zona layanan. Ini workaround, bukan flow onboarding yang sudah beres.
3. Di pemetaan, pilih **Kelilingi lahan**. Berdiri pada tiap sudut petak lalu tekan **Tandai sudut di titik ini**; minimal tiga sudut. Alternatifnya ketik koordinat yang benar. Periksa bentuk dan luas, lalu simpan. Peta dasar tidak tersedia.
4. Lanjutkan konfirmasi petak dan unggah foto NIB/KTP untuk tinjauan operator. JPG/PNG/WebP; PDF tidak diterima endpoint foto. Pembukaan kuota menunggu legalitas disetujui.
5. Di **Katalog produk**, tambah produk: komoditas, grade, ukuran kg per box, harga dan keterangan. Produk dapat diedit; batch PO yang sudah terbit memiliki harga terkunci sendiri.
6. Di **Manajemen batch → Buka kuota**, pilih produk dan lahan, isi total box, harga terkunci dan estimasi panen. Batas kapasitas tampil sebelum submit; baca penolakan server bila melewati kuota atau legalitas belum disetujui.
7. Buka batch → **Catat kegiatan**. Pilih kegiatan, isi deskripsi, ambil foto kamera atau lampirkan galeri sesuai kenyataan, periksa GPS, lalu simpan. Data tersimpan permanen; **jalur Ralat belum tersedia di FE**. Simpan saat online; draft tidak tahan reload.
8. Saat panen, pilih **Panen**, masukkan total box hasil lahan (termasuk yang tidak dijual melalui platform), sertakan bukti. Baca pratinjau kewajaran dan alokasi, lalu konfirmasi. Gagal total memakai **Gagal panen**; alasan terstruktur masih gap.
9. Di **Manajemen pesanan**, buka pengiriman yang siap. Terbitkan QR box dan catat **Kode Antar empat digit** yang ditampilkan sekali. Tempel QR pada box dan berikan kode kepada kurir. Bila terkunci/lupa, gunakan terbitkan kode baru yang tersedia pada detail pesanan.
10. Pantau **Keuangan & escrow**, **Reputasi**, dan **Riwayat kewajaran**. “Menunggu penyaluran” belum berarti uang sudah masuk rekening. Rekomendasi tanam tersedia tetapi di PRD termasuk pasca-MVP; bukan bukti akurasi prediksi lapangan.

### Pembeli restoran/cafe/distributor

1. Buka **Masuk sebagai Pembeli** / `/auth/buyer`, lalu OTP. **Akun baru belum mempunyai layar profil usaha**, sehingga untuk demo perlu akun yang profil dan `activeZoneId`-nya telah disiapkan; tidak ada workaround UI lengkap saat ini.
2. Pilih zona layanan. **Gunakan zona yang sama dengan profil demo**, karena perubahan zona di layar belum disimpan ke database.
3. Telusuri katalog, cari nama produk dan urutkan grade/harga/tanggal. Buka produk untuk melihat harga per box, kg per box, kuota, mutu, foto timeline, status verifikasi dan kurva NDVI. Status tidak dapat dinilai tidak sama dengan tuduhan curang.
4. Isi jumlah box lalu tambah ke keranjang. Beberapa tenant dapat digabung; lihat rencana pengiriman dan minimum per pengiriman. Kuota belum direservasi hanya dengan masuk keranjang.
5. Lanjut checkout: nama/telepon penerima, patokan, jam terima, dan **koordinat tujuan yang benar**. Default Malang harus diperiksa. Pilih QRIS/VA/e-wallet. Opsi PDF ada, tetapi unduh hasilnya belum lengkap; hindari menjadikannya janji layanan pada demo.
6. Buat pesanan. Backend menentukan harga/kuota/ongkir akhir dan dapat menolak kuota yang baru habis. Keranjang dikosongkan setelah checkout berhasil.
7. Pada halaman pembayaran demo, baca invoice dan klik **Saya sudah bayar** untuk simulasi. Ini bukan cara membayar sungguhan melalui bank.
8. Buka **Pesanan saya** → detail. Pantau status, item, bukti budidaya dan tracking berkala. Jika shortfall, buka resolusi dan periksa opsi yang server tawarkan: substitusi, jadwal ulang, refund atau menerima sebagian. **Jadwal ulang belum benar-benar membuat alokasi baru, meskipun respons mengklaim berhasil**; jangan menjanjikan pemenuhan berikutnya dari aksi ini. Halaman resolusi sekarang memuat keputusan tertunda dari seluruh pesanan akun, bukan hanya order pada URL.
9. Saat barang datang, unggah foto kondisi dan konfirmasi terima. Jika mutu/berat tidak sesuai, ajukan klaim dengan foto dan hasil timbang dalam waktu yang ditunjukkan countdown; jangan memakai angka toleransi/jendela di luar respons aplikasi sebagai asumsi universal.
10. Selesai bekerja pada perangkat bersama, ketahui bahwa tombol keluar pembeli **belum menghapus sesi**. Perbaiki ini sebelum uji pengguna sungguhan; logout visual saja bukan perlindungan akun.

### Kurir

1. Scan QR box melalui kamera ponsel; buka tautan `/scan/[token]`.
2. Masukkan Kode Antar empat digit dari tenant. Jika percobaan terkunci, minta tenant menerbitkan ulang kode; jangan menerka terus.
3. Izinkan GPS dan biarkan tab tracking terbuka. Halaman menampilkan jarak dan kapan posisi berhasil dikirim. Tidak ada navigasi peta bawaan.
4. Jika izin/GPS gagal, pilih mode tanpa GPS yang disediakan. Serah-terima tetap membutuhkan alur penerimaan pembeli.
5. Bawa barang ke penerima dan minta pembeli melakukan konfirmasi dengan foto. Menutup tab dapat menghilangkan sesi browser; pemulihan sesi perlu ditingkatkan sebelum operasi rutin.

### Operator internal

1. Masuk `/auth/operator/login` dengan akun operator yang telah dibuat. UI ini bukan jalur pendaftaran operator publik.
2. Buka antrean legalitas, periksa dokumen dan putuskan beserta alasan. Persetujuan memungkinkan tenant melanjutkan pembukaan PO.
3. Buka antrean klaim dan tinjau foto, berat/nilai klaim serta usia kasus sebelum memutuskan. Ikuti hak keputusan server, jangan mengubah angka lewat browser.
4. Periksa antrean satelit/kewajaran; bedakan tidak ada data/awan dengan bukti yang bertentangan. Angka kalibrasi yang masih indikatif memerlukan penjelasan dalam demo.
5. Pantau umur simpan, escrow dan hash anchor. Atur zona/komoditas hanya pada lingkungan yang memang ingin diubah. Tombol keluar operator juga masih memiliki gap sesi FE-04.

