# Audit frontend dan panduan pengguna AgroUs

Tanggal pemeriksaan: 9–11 September 2026. Acuan: kode pada working tree, `docs/PRD.md` v2.4, `docs/PAGE_INVENTORY_v2.3.md`, user flow, dan sequence panen. Status di bawah merupakan hasil penelusuran sumber dan pengujian unit/komponen; bukan klaim lulus usability test bersama petani, bukan sertifikasi aksesibilitas, dan bukan bukti semua integrasi produksi berjalan.

## Kesimpulan

AgroUs punya fondasi antarmuka yang konsisten: bahasa Indonesia, navigasi ponsel, komponen formulir berlabel, status yang dijelaskan lewat teks, pratinjau konsekuensi panen, serta data biaya dan status yang sebagian memakai kontrak bersama. Produk cocok sebagai **prototipe lomba yang punya pembeda kuat**, tetapi **belum memenuhi klaim seluruh flow berfungsi 100% atau siap melayani pengguna baru secara mandiri**. Hambatan paling nyata dulu justru di jalur paling awal — profil pengguna baru tidak dihubungkan setelah OTP dan pilihan zona pembeli tidak tersimpan ke sumber data yang dipakai checkout. Keempatnya (FE-01 s.d. FE-04) diperbaiki pada 12 September 2026 dan diuji dengan jaringan diganti test double; sisanya, termasuk offline petani, koordinat tujuan, ralat timeline dan pembayaran nyata, masih terbuka.

Untuk rubrik yang disampaikan pengguna (teknologi/AI 30%, fungsionalitas 30%, inovasi 25%, UI/UX 15%), menyelesaikan jalur pendaftaran → transaksi → bukti panen → pengiriman lebih bernilai daripada menambah halaman. Kriteria dan bobot ini adalah konteks dari pengguna, bukan hasil verifikasi penyelenggara.

## Batas dan struktur yang diperiksa

- `apps/web/src/app`: 58 berkas `page.tsx` aktif dalam Next.js App Router; kelompok `(dashboard)` tidak menjadi bagian URL.
- `apps/web/src/ui`: komponen dasar (form, tombol, panel, state, cangkang navigasi) yang sebagian sudah memiliki kontrak semantik aksesibilitas.
- `apps/web/src/components`: presentasi domain (verifikasi, pengiriman, komoditas, escrow, kurva dan poligon), serta formulir masuk bersama.
- `apps/web/src/lib`: sesi, keranjang lokal, transport API, format angka/tanggal, dan data contoh landing.
- `packages/shared/src/index.ts`: kontrak tipe, enum, dan konstanta. Tipe TypeScript tidak memvalidasi JSON yang diterima saat runtime.
- Penelusuran silang backend terbatas pada autentikasi, profil pembeli, pesanan dan timeline untuk membuktikan putusnya flow FE→BE. Audit backend menyeluruh berada pada laporan terpisah.

Inventaris menyeluruh bukan berarti semua 58 layar sudah diuji secara interaktif. File, route dan referensi API diinventarisasi; jalur berisiko ditelusuri lebih dalam. Sepuluh berkas lama kosong masih ada, termasuk `src/services/api.ts`, `src/lib/utils.ts`, `src/lib/format.ts`, dua hook `use_websocket.ts`/`use_geolocation.ts`, serta lima `tenant/*_page.tsx`. Itu bukan route aktif dan tidak boleh dihitung sebagai fitur yang sudah diimplementasikan.

## Temuan prioritas dengan bukti

Prioritas P1 = jalur inti terputus/risiko sesi atau transaksi; P2 = fungsi wajib parsial, data menyesatkan atau friksi besar; P3 = pemeliharaan/polish.

**Pembaruan 12 September 2026.** Keempat temuan P1 (FE-01 s.d. FE-04) sudah diperbaiki dan masing-masing punya test; kolom Status di bawah menyatakannya. Yang dibuktikan adalah perilaku unit/komponen dengan jaringan diganti test double — bukan UAT dengan nomor sungguhan pada API produksi. Temuan P2/P3 masih terbuka seluruhnya.

| ID | Prioritas | Temuan dan dampak | Bukti sumber | Saran konkret |
|---|---|---|---|---|
| FE-01 | P1 — **diperbaiki 12 Sep 2026** | Routing setelah OTP tidak lagi dihitung dari peran saja. `tujuanSetelahMasuk()` membaca keadaan profil: TENANT_NOT_FOUND → `/tenant/onboarding/profile`, profil ada tetapi `landPlotCount === 0` → `/tenant/onboarding/mapping`, selain itu dasbor. Cangkang `(dashboard)` Tenant memulangkan profil yang belum ada ke onboarding, jadi membuka `/tenant` dari riwayat peramban pun ikut dilanjutkan. Gagal jaringan tidak disamakan dengan profil yang belum ada. | `apps/web/src/lib/rute-masuk.ts`; `apps/web/src/app/auth/verify/page.tsx:93`; `apps/web/src/app/tenant/(dashboard)/layout.tsx:56`. Test: `src/lib/rute-masuk.spec.ts`, `src/app/auth/verify/auth-flow.spec.tsx`. | — |
| FE-02 | P1 — **diperbaiki 12 Sep 2026** | Halaman `/buyer/onboarding/profile` dibuat: nama usaha + satu zona layanan, memanggil `buatProfilPembeli`, lalu membuka katalog zona itu. Pembeli yang sudah punya profil dialihkan, bukan diminta membuat profil kedua. Tipe wrapper diperbaiki — `activeZoneId` wajib, sesuai `CreateBuyerProfileDto`. Cangkang pembeli memulangkan BUYER_NOT_FOUND ke halaman ini. | `apps/web/src/app/buyer/onboarding/profile/page.tsx`; `apps/web/src/lib/api.ts:244`; `apps/web/src/app/buyer/(dashboard)/layout.tsx:60`. Test: `src/app/buyer/onboarding/profile/onboarding-flow.spec.tsx`. | — |
| FE-03 | P1 — **diperbaiki 12 Sep 2026** | Memilih zona kini PATCH `/buyer/profile` lebih dulu; katalog baru dibuka setelah server menyimpannya, sehingga zona tampilan dan `buyer.activeZoneId` tidak lagi berbeda. Gagal simpan menahan navigasi dan menampilkan sebabnya; BUYER_NOT_FOUND dialihkan ke onboarding. Keranjang berisi batch zona lain dinyatakan sebagai konsekuensi sebelum pindah, lalu dikosongkan setelah dikonfirmasi — keranjang sezona tidak disentuh. | `apps/web/src/app/buyer/region/page.tsx`. Test: `src/app/buyer/region/region-flow.spec.tsx` (6 kasus baru). | — |
| FE-04 | P1 — **diperbaiki 12 Sep 2026** | `akhiriSesi()` menjadi satu-satunya pintu keluar ketiga peran: token, data pengguna, dan keranjang dihapus sebelum berpindah halaman. Cangkang pembeli dan operator memakainya; Tenant ikut memakai fungsi yang sama. Belum dikerjakan: penggantian entri history dan perlakuan 401 terpusat (bagian FE-17). | `apps/web/src/lib/auth.ts:61`; `apps/web/src/app/buyer/(dashboard)/layout.tsx:85`; `apps/web/src/app/operator/(dashboard)/layout.tsx:52`. Test: `src/lib/auth.spec.ts`, `src/app/auth/verify/auth-flow.spec.tsx`. | — |
| FE-05 | P2 | Keranjang disimpan pada satu kunci global, tidak dipisah pengguna/zona. Sejak FE-04 keranjang ikut dibuang saat tombol keluar ditekan, tetapi pergantian akun TANPA keluar (sesi baru ditimpa `simpanSesi`) masih mewariskan pilihan pembeli A ke pembeli B. | `apps/web/src/lib/keranjang.ts:17`; `apps/web/src/lib/auth.ts:37`. Reproduksi FE-REG-05. | Namespace per akun atau reset eksplisit saat pergantian akun; kebijakan zona harus jelas. |
| FE-06 | P2 | Digit OTP yang sudah terisi tidak dapat dikosongkan: `onChange` dengan string kosong langsung return. Backspace handler hanya memindahkan fokus ketika digit sudah kosong. | `apps/web/src/app/auth/verify/page.tsx:53` dan `:70`. | Dukung pengosongan digit, Backspace/Delete, tempel seluruh kode, dan OTP autofill; uji dengan event DOM. |
| FE-07 | P2 | Checkout meminta angka lintang/bujur dan mengisi default pusat Malang. Tanpa mengubahnya, penerima bisa menyimpan titik yang bukan alamatnya; ini berdampak langsung pada geofence serah-terima. | `apps/web/src/app/buyer/(dashboard)/checkout/page.tsx:52`, `:53`, `:165`. | Pencarian alamat + pin peta + “gunakan lokasi saya”; wajib konfirmasi titik, hindari default yang tampak valid. |
| FE-08 | P2 | Pemetaan lahan sudah mendukung titik GPS berurutan, tetapi tidak ada peta dasar/drawing interaktif. Mode ketik koordinat dikirim sebagai `GAMBAR_PETA`. | `apps/web/src/components/PetaLahan.tsx:101`, `:175`, `:206`; FR-1.5. | Tambahkan peta nyata dan preview lokasi; bedakan sumber koordinat manual dalam kontrak. Periksa kualitas GPS dan poligon sebelum kirim. |
| FE-09 | P1/P2 | Requirement offline untuk petani belum tersedia. Form timeline/foto ada di memori React; reload/tab tertutup menghilangkan draft, tidak ada antrean unggah saat offline. | `docs/PRD.md:105`; state form `apps/web/src/app/tenant/(dashboard)/batch/[id]/progress/new/page.tsx:69`; pencarian seluruh FE tidak menemukan IndexedDB, serviceWorker registration atau background sync. Berkas manifest dan worker publik kosong. | Draft persisten, antrean foto dan metadata dengan status belum tersinkron, retry idempotent di server. Jangan melabeli PWA/offline siap sebelum diuji di jaringan putus. |
| FE-10 | P2 | UI menjanjikan koreksi melalui Ralat, tetapi form tidak menawarkan target ralat dan tidak mengirim `ralatOfId`; lampiran nota input juga tidak tersedia sebagai tipe terpisah. | `apps/web/src/app/tenant/(dashboard)/batch/[id]/progress/new/page.tsx:112`–123; `apps/api/src/modules/timeline/timeline.dto.ts:64` dan `:78`; teks pengantar page sekitar `:197`. | Tambah aksi “Ralat catatan ini”, konteks catatan lama, target immutable; tambah bukti nota opsional untuk kegiatan terkait. Ralat bukan activity enum kedelapan, melainkan referensi `ralatOfId`. |
| FE-11 | P2 | Gagal panen tidak mengumpulkan alasan terstruktur cuaca/hama/penyakit/lainnya. Hanya deskripsi biasa. Ini gap terhadap FR-4.9, bukan sekadar gaya UI. | Form body `apps/web/src/app/tenant/(dashboard)/batch/[id]/progress/new/page.tsx:112`; `CreateNodeDto` juga tidak punya `failureReason`, sementara schema memiliki field tersebut. | Tambah alasan terstruktur dan validasi khusus FE+BE; pertahankan narasi/foto/GPS. |
| FE-12 | P2 | Checkout memberi opsi berbayar PDF ketertelusuran, namun FE tidak menyediakan alur unduh PDF di pesanan selesai. | `apps/web/src/app/buyer/(dashboard)/checkout/page.tsx:198`; pencarian `download`, `report`, `pdf` pada halaman pesanan tidak menemukan aksi unduh. | Selesaikan generator, otorisasi dan tombol unduh; atau sembunyikan opsi berbayar sampai dapat diserahkan. |
| FE-13 | P2 | Pembayaran adalah peragaan: nilai invoice/payload ditampilkan dari query URL, tidak ada gambar QRIS/link bayar dan status gateway otomatis. “Saya sudah bayar” memanggil jalur simulasi. | `apps/web/src/app/buyer/(dashboard)/payment/page.tsx:20`, `:32`, `:79`, `:98`. | Untuk lomba beri label simulasi yang konsisten. Untuk penggunaan nyata ambil invoice dari server, render QR/link resmi, polling status atau event server, dan dukung invoice kedaluwarsa. |
| FE-14 | P2 | Ringkasan checkout hanya barang + PDF; ongkir baru disebut akan muncul pada invoice. Keranjang memang punya pratinjau server, tetapi nilai itu tidak dibawa/diambil ulang di halaman persetujuan akhir. | `apps/web/src/app/buyer/(dashboard)/checkout/page.tsx:103`, `:243`, `:253`; cart `:45`. | Ambil preview server pada checkout dan tampilkan total final, ongkir per kiriman, zona, dan tanggal sebelum pembuatan tagihan. |
| FE-15 | P2 | Pelacakan pembeli memakai polling 15 detik, tanpa WebSocket/SSE client dan tanpa peta live. Kurir mengirim titik terbaru berkala; GPS lama dapat dikirim dengan timestamp baru jika posisi berhenti diperbarui. | `apps/web/src/app/buyer/(dashboard)/orders/[id]/page.tsx:301`; hook websocket kosong; `apps/web/src/app/courier/tracking/page.tsx:80`–85 mengambil koordinat dari ref tetapi `deviceTs` dari waktu sekarang. | Nyatakan refresh berkala secara jujur; gunakan timestamp GeolocationPosition dan tolak titik basi. Implementasikan stream/fallback sesuai kebutuhan, bukan sekadar nama hook. |
| FE-16 | P2 | API error timeline/NDVI di beberapa halaman diubah menjadi daftar kosong/null, sehingga kegagalan membaca bukti tampak seperti memang tidak ada bukti. | `apps/web/src/app/buyer/(dashboard)/product/[id]/page.tsx:110`–116; tenant batch `:53`; orders seniority `:32`. | Pisahkan loading, absent, partial error; pertahankan data terakhir dengan penanda gagal menyegarkan dan aksi retry. |
| FE-17 | P2 | JWT disimpan localStorage; tidak ada pemeriksaan role/profile di layout FE dan tidak ada transisi sesi kedaluwarsa terpusat. BE tetap harus menjadi pengaman otorisasi; ini bukan bukti bypass backend. | `apps/web/src/lib/auth.ts:17`; `apps/web/src/app/buyer/layout.tsx:3`; tenant layout serupa; transport `apps/web/src/lib/api.ts:127`. | Cookie HttpOnly/SameSite bila arsitektur memungkinkan, validasi sesi, alihkan 401 terpusat dan tampilkan forbidden yang jelas. |
| FE-18 | P2/P3 | Penyimpanan lokal hanya JSON.parse dengan cast: JSON valid bertipe salah merusak render. Tambah quantity negatif juga diterima; HTTP 205 diparse sebagai JSON meski komentar mengklaim didukung. | `apps/web/src/lib/keranjang.ts:33`, `:46`; `apps/web/src/lib/auth.ts:31`; `apps/web/src/lib/api.ts:140`. Reproduksi FE-REG-01…04. | Validasi bentuk dan rentang runtime, pulihkan data storage rusak, tangani 204/205. |
| FE-19 | P3 | Badge keranjang di header hanya diperbarui saat pathname berubah. Tambah item saat tetap di katalog tidak memperbarui jumlah meski cart mengirim event. | `apps/web/src/app/buyer/(dashboard)/layout.tsx:43`–45; `apps/web/src/lib/keranjang.ts:42`. | Subscribe event cart/storage atau gunakan store bersama. |
| FE-20 | P3 | Scope/dokumen tidak sinkron: rekomendasi tanam sudah aktif dalam menu meskipun PRD menyebut pasca-MVP; stack rencana Mapbox/shadcn/Next15 berbeda dari implementasi custom UI/Next16. | Tenant layout `:37`; recommendation page; `docs/PRD.md` FR-3.7; `docs/ARCHITECTURE_PLAN.md:19`. | Bedakan “rencana”, “sudah dibuat”, “demo”, “terverifikasi”; buat matriks requirement→endpoint→halaman→test. |

## Penilaian UI/UX per persona

| Persona | Yang sudah membantu | Gap paling terasa | Penilaian berdasarkan sumber |
|---|---|---|---|
| Petani/admin kebun | Bahasa Indonesia, pilihan kegiatan besar, GPS otomatis, peringatan konsekuensi panen sebelum konfirmasi, status keterbatasan satelit dinyatakan | Onboarding terputus; draft hilang saat offline; input koordinat manual; form wajib deskripsi/foto/lokasi membuat klaim “≤3 ketukan” belum terbukti; jargon kuota/NDVI/escrow banyak | Cocok didampingi pada demo; belum terbukti mudah dipakai sendiri di kebun |
| Pemilik lahan | Banyak petak, preview poligon, estimasi luas dan pembatasan verifikasi lahan kecil | Tidak ada role pemilik lahan pasif, relasi sewa/bagi hasil atau delegasi petani; harus berperan sebagai tenant pengelola | Cocok bila pemilik juga mengelola produksi; kebutuhan pemilik pasif di luar scope sekarang |
| Restoran/cafe | Katalog lintas produsen, harga/grade/kg per box, rencana pengiriman, klaim berbukti dan countdown | Profil baru tidak tersedia; wilayah tampilan berbeda dari wilayah order; koordinat manual; belum ada alamat tersimpan, multi-outlet, approval purchasing/finance; prapanen panjang tidak selalu cocok pembelian harian cafe | Prototipe purchasing prapanen, belum pengganti lengkap proses pembelian rutin |
| Distributor | Keranjang banyak tenant, konsolidasi dan visibilitas mutu/shortfall | Tidak ada role seller-buyer simultan pada satu user, inventori gudang, jual ulang, invoice approval, multi-cabang, jadwal pesanan berulang | Bisa sebagai pembeli institusional; belum sistem operasional distribusi lengkap |
| Kurir pihak ketiga | Tanpa akun/instalasi, QR+PIN, teks jarak dan mode tanpa GPS | Tab harus tetap terbuka; tidak ada pemulihan lintas tab yang kokoh, GPS basi, navigasi tujuan/peta live belum ada | Konsep sederhana; reliabilitas pada Android asli perlu uji lapangan |
| Operator | Antrean legalitas/klaim/satelit/kewajaran/umur simpan, status tekstual, halaman detail | Logout tidak menutup sesi; perlu pembuktian SLA/notifikasi, pagination/filter di volume besar dan audit keputusan | Cukup jelas untuk data demo, kesiapan operasi skala belum terbukti |

Peran dalam kontrak pengguna adalah TENANT, BUYER, OPERATOR; kurir memakai token sesi tanpa akun. “Petani”, “distributor”, “cafe”, dan “pemilik lahan” adalah persona bisnis, bukan seluruhnya role terpisah yang sudah diimplementasikan.

## Clean code dan konsistensi FE

Hal positif: transport API terkumpul di `lib/api.ts`; endpoint finansial tidak dihitung ulang sembarangan di tiap halaman; sebagian konstanta bisnis diimpor dari shared; UI dasar dipisahkan dari presentasi domain; nomenklatur status pengiriman/verifikasi dipusatkan; form menghubungkan label/petunjuk/galat via `useId`; tombol sibuk mencegah submit ganda.

Belum layak disebut sepenuhnya clean/SOLID. Halaman besar masih menggabungkan fetch, state, transformasi domain, aksi transaksi dan tampilan. Dependency inversion terbatas karena komponen langsung mengimpor transport/storage global; pengujian membutuhkan mock modul. Satu file shared besar tidak otomatis contract-first yang aman: `strict: false` pada FE dan cast JSON tidak mendeteksi perubahan runtime. Normalisasi Decimal pada `components/komoditas.ts:27` menunjukkan kontrak API sudah pernah meleset. Default origin API ke domain produksi (`lib/api.ts:83`) membuat build lokal tanpa env dapat mengarah ke data produksi. Komentar historis yang panjang berulang sering lebih besar daripada logikanya, dan beberapa komentar mengklaim hal yang tidak lagi sesuai kode (HTTP205, “peta”, websocket kosong).

Refactor bertahap: satukan sesi/profil/zona aktif; pisahkan hook query/mutation per domain; buat komponen form kecil dengan validasi eksplisit; validasi response/storage di batas sistem; hapus placeholder kosong setelah memastikan tak digunakan. Tidak perlu membuat interface/repository untuk setiap baris FE hanya untuk mengejar istilah SOLID.

## Inventaris route aktual

| Kelompok | Route yang tersedia |
|---|---|
| Publik/autentikasi | `/`, `/auth/tenant`, `/auth/tenant/login`, `/auth/buyer`, `/auth/buyer/login`, `/auth/operator/login`, `/auth/verify` |
| Onboarding tenant | `/tenant/onboarding/profile`, `/tenant/onboarding/mapping`, `/tenant/onboarding/confirmation`, `/tenant/onboarding/legal`, `/tenant/onboarding/success` |
| Tenant | `/tenant`, `/tenant/catalog`, `/tenant/catalog/edit`, `/tenant/batch`, `/tenant/batch/new`, `/tenant/batch/new/mapping`, `/tenant/batch/[id]`, `/tenant/batch/[id]/edit-po`, `/tenant/batch/[id]/kewajaran`, `/tenant/batch/[id]/progress/new`, `/tenant/orders`, `/tenant/orders/[id]`, `/tenant/orders/[id]/invoice`, `/tenant/land`, `/tenant/land/mapping`, `/tenant/land/confirmation`, `/tenant/finance`, `/tenant/reputation`, `/tenant/recommendation` |
| Pembeli | `/buyer/region`, `/buyer/catalog`, `/buyer/product/[id]`, `/buyer/cart`, `/buyer/checkout`, `/buyer/payment`, `/buyer/payment-success`, `/buyer/orders`, `/buyer/orders/[id]`, `/buyer/orders/[id]/resolution` |
| Kurir | `/scan/[token]`, `/courier/kode-antar`, `/courier/tracking` |
| Operator | `/operator`, `/operator/legality`, `/operator/legality/[id]`, `/operator/claims`, `/operator/claims/[id]`, `/operator/satellite`, `/operator/satellite/[id]`, `/operator/kewajaran`, `/operator/umur-simpan`, `/operator/zone`, `/operator/commodity`, `/operator/commodity/[id]`, `/operator/escrow`, `/operator/audit` |

`[id]` adalah id data sebenarnya. `/courier/kode-antar` menjelaskan pemindaian QR; memulai pengantaran harus melalui `/scan/[token]`. `/tenant/batch/[id]/edit-po` merupakan layar baca ketentuan kuota, bukan editor PO. Inventory v2.3 merujuk `PAGE_INVENTORY.md` v2.2 yang tidak ada di folder docs pada checkout ini; total “121 halaman & state” tidak dapat dipakai sebagai jumlah URL atau persentase selesai.

## Tutorial sesuai implementasi saat audit

Panduan ini membedakan alur yang tersedia dengan hambatan yang perlu diperbaiki. Jalankan demo dengan data pengujian dan akun yang sudah memiliki profil; jangan menganggap simulasi pembayaran sebagai uang yang berpindah.

### Petani/pengelola lahan (Tenant)

1. Buka beranda → **Masuk sebagai Tenant** / `/auth/tenant`. Masukkan nomor WhatsApp dan verifikasi OTP enam digit. Kode demo terisi otomatis hanya bila API mengembalikan `devOtp`.
2. Nomor baru diarahkan sendiri ke `/tenant/onboarding/profile`: isi nama usaha dan pilih satu atau lebih zona layanan. Onboarding yang ditinggalkan di tengah dilanjutkan saat masuk lagi — profil tanpa satu pun petak dibawa ke langkah pemetaan, bukan ke dasbor.
3. Di pemetaan, pilih **Kelilingi lahan**. Berdiri pada tiap sudut petak lalu tekan **Tandai sudut di titik ini**; minimal tiga sudut. Alternatifnya ketik koordinat yang benar. Periksa bentuk dan luas, lalu simpan. Peta dasar tidak tersedia.
4. Lanjutkan konfirmasi petak dan unggah foto NIB/KTP untuk tinjauan operator. JPG/PNG/WebP; PDF tidak diterima endpoint foto. Pembukaan kuota menunggu legalitas disetujui.
5. Di **Katalog produk**, tambah produk: komoditas, grade, ukuran kg per box, harga dan keterangan. Produk dapat diedit; batch PO yang sudah terbit memiliki harga terkunci sendiri.
6. Di **Manajemen batch → Buka kuota**, pilih produk dan lahan, isi total box, harga terkunci dan estimasi panen. Batas kapasitas tampil sebelum submit; baca penolakan server bila melewati kuota atau legalitas belum disetujui.
7. Buka batch → **Catat kegiatan**. Pilih kegiatan, isi deskripsi, ambil foto kamera atau lampirkan galeri sesuai kenyataan, periksa GPS, lalu simpan. Data tersimpan permanen; **jalur Ralat belum tersedia di FE**. Simpan saat online; draft tidak tahan reload.
8. Saat panen, pilih **Panen**, masukkan total box hasil lahan (termasuk yang tidak dijual melalui platform), sertakan bukti. Baca pratinjau kewajaran dan alokasi, lalu konfirmasi. Gagal total memakai **Gagal panen**; alasan terstruktur masih gap.
9. Di **Manajemen pesanan**, buka pengiriman yang siap. Terbitkan QR box dan catat **Kode Antar empat digit** yang ditampilkan sekali. Tempel QR pada box dan berikan kode kepada kurir. Bila terkunci/lupa, gunakan terbitkan kode baru yang tersedia pada detail pesanan.
10. Pantau **Keuangan & escrow**, **Reputasi**, dan **Riwayat kewajaran**. “Menunggu penyaluran” belum berarti uang sudah masuk rekening. Rekomendasi tanam tersedia tetapi di PRD termasuk pasca-MVP; bukan bukti akurasi prediksi lapangan.

### Pembeli restoran/cafe/distributor

1. Buka **Masuk sebagai Pembeli** / `/auth/buyer`, lalu OTP. Nomor baru diarahkan ke `/buyer/onboarding/profile`: isi nama usaha dan pilih satu zona layanan. Profilnya dibuat di server saat itu juga, dan katalog zona tersebut langsung terbuka.
2. Zona bisa diganti kapan saja lewat **Ganti wilayah**. Pilihannya disimpan ke profil lebih dulu, jadi ongkir, minimum pesanan dan kecocokan pesanan dihitung dengan zona yang sedang Anda lihat. Bila keranjang berisi batch dari zona lain, halaman menyatakan lebih dulu bahwa perpindahan akan mengosongkannya.
3. Telusuri katalog, cari nama produk dan urutkan grade/harga/tanggal. Buka produk untuk melihat harga per box, kg per box, kuota, mutu, foto timeline, status verifikasi dan kurva NDVI. Status tidak dapat dinilai tidak sama dengan tuduhan curang.
4. Isi jumlah box lalu tambah ke keranjang. Beberapa tenant dapat digabung; lihat rencana pengiriman dan minimum per pengiriman. Kuota belum direservasi hanya dengan masuk keranjang.
5. Lanjut checkout: nama/telepon penerima, patokan, jam terima, dan **koordinat tujuan yang benar**. Default Malang harus diperiksa. Pilih QRIS/VA/e-wallet. Opsi PDF ada, tetapi unduh hasilnya belum lengkap; hindari menjadikannya janji layanan pada demo.
6. Buat pesanan. Backend menentukan harga/kuota/ongkir akhir dan dapat menolak kuota yang baru habis. Keranjang dikosongkan setelah checkout berhasil.
7. Pada halaman pembayaran demo, baca invoice dan klik **Saya sudah bayar** untuk simulasi. Ini bukan cara membayar sungguhan melalui bank.
8. Buka **Pesanan saya** → detail. Pantau status, item, bukti budidaya dan tracking berkala. Jika shortfall, buka resolusi dan periksa opsi yang server tawarkan: substitusi, jadwal ulang, refund atau menerima sebagian. **Jadwal ulang belum benar-benar membuat alokasi baru, meskipun respons mengklaim berhasil**; jangan menjanjikan pemenuhan berikutnya dari aksi ini. Halaman resolusi sekarang memuat keputusan tertunda dari seluruh pesanan akun, bukan hanya order pada URL.
9. Saat barang datang, unggah foto kondisi dan konfirmasi terima. Jika mutu/berat tidak sesuai, ajukan klaim dengan foto dan hasil timbang dalam waktu yang ditunjukkan countdown; jangan memakai angka toleransi/jendela di luar respons aplikasi sebagai asumsi universal.
10. Selesai bekerja pada perangkat bersama, tekan **Keluar**: token, data pengguna dan keranjang dihapus sebelum halaman berpindah. Yang belum ada: entri history tidak diganti, dan 401 belum ditangani terpusat (FE-17) — jadi jangan perlakukan ini sebagai pengerasan sesi yang lengkap.

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
5. Pantau umur simpan, escrow dan hash anchor. Atur zona/komoditas hanya pada lingkungan yang memang ingin diubah. Tombol keluar operator kini menghapus sesi lewat jalur yang sama dengan peran lain (FE-04).

## Uji yang ditambahkan dan cara membaca hasil

Suite berisi **161 kasus dalam 16 file** (12 September 2026), termasuk 7 expected failure. Acceptance menghasilkan **154 lulus dan 7 gagal**. Sebelum perbaikan P1 angkanya 137 kasus dengan 10 expected failure; FE-REG-07 dan FE-REG-08 (dua parameter) berhenti menjadi cacat dan diganti test biasa, ditambah 24 kasus baru untuk rute pasca-OTP, onboarding pembeli, penyimpanan zona dan akhir sesi. Test mencakup transport API (auth header, error mesin, multipart boundary, upload, checkout, courier token encoding, panen dua langkah), sesi, keranjang lintas batch, format Indonesia, normalisasi komoditas, badge dan HTML semantik. Pengujian jsdom juga menjalankan koreksi OTP/logout, checkout/payment/pemilihan wilayah, PenilaianPanen dan PetaLahan. Jaringan dan navigasi diganti test double; tidak ada transfer, OTP eksternal atau penulisan database produksi.

`src/lib/known-regressions.spec.ts` dan `src/app/auth/verify/auth-flow.spec.tsx` menyimpan cacat yang direproduksi sebagai expected failure. Default suite **tidak menyatakan cacat itu sudah diperbaiki**. Jalankan `pnpm test:regressions` untuk memperlakukannya sebagai acceptance biasa dan memperoleh exit nonzero selama cacat masih ada. Setelah perbaikan, ubah kasus terkait menjadi test biasa; unexpected pass pada `it.fails` sengaja menggagalkan suite agar daftar cacat diperbarui.

```powershell
pnpm --filter @agro-os/web test
pnpm --filter @agro-os/web test:coverage
$env:QA_ENFORCE_REGRESSIONS = '1'
pnpm --filter @agro-os/web test
Remove-Item Env:QA_ENFORCE_REGRESSIONS
```

Konfigurasi memasukkan seluruh `src/**/*.{ts,tsx}`, termasuk halaman bisnis yang belum diuji; hanya test dan helper test dikecualikan. Coverage **baris/statements 18,83% (2.417/12.830)**, **fungsi 69,09% (199/288)** dan **cabang 91,90% (579/630)**. Halaman checkout/payment/wilayah, `lib/rute-masuk.ts` dan PenilaianPanen mencapai100% dalam pengukuran khusus; halaman onboarding pembeli 99,25% baris/85,18% cabang, dan PetaLahan memiliki satu guard internal belum terjangkau. Tidak ada penyempitan denominator demi klaim100%; mayoritas halaman tetap memerlukan pengujian. Lihat [hasil lengkap](TEST_RESULTS.md). Coverage penuh tidak membuktikan semua kombinasi input, jaringan, browser, keamanan atau kebutuhan pengguna benar.

UAT yang wajib sebelum presentasi: nomor tenant baru sampai produk dapat dibeli; nomor buyer baru sampai order selesai; pindah zona; logout perangkat bersama; OTP salah lalu koreksi; gagal GPS; offline/refresh saat unggah; dua pembeli berebut sisa kuota; panen kurang; klaim lewat batas waktu; invoice kedaluwarsa; dan pembuktian status simulasi versus integrasi nyata.
