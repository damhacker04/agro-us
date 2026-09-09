# Status migrasi dunia Label Sertifikasi

Pelacak keadaan, bukan rencana. Ditulis supaya sesi mana pun bisa melanjutkan tanpa
menebak-nebak apa yang sudah selesai — dan supaya jendela transisi punya ujung yang terlihat.

**Kontraknya ada di [DESIGN.md](DESIGN.md).** Berkas ini hanya mencatat siapa yang sudah
pindah. Baca DESIGN.md dulu untuk hukumnya; jangan menyimpulkan aturan dari halaman contoh.

## Cara memeriksa sendiri

```bash
for f in $(find apps/web/src/app -name page.tsx | sort); do grep -ql '@/ui\|FormMasuk' $f && echo "SUDAH ${f}" || echo "BELUM ${f}"; done
```

Sebuah halaman dihitung bermigrasi bila ia dibungkus `<Halaman>` dari `@/ui`. Itu saklar
dunianya — dan menyalakannya berarti menyatakan halaman itu lepas PENUH dari dunia lama:
tidak ada warna emerald/abu-abu, tidak ada sudut membulat, tidak ada ikon lucide mentah.
Setengah migrasi lebih buruk daripada belum migrasi.

## Keadaan

| Fase | Lingkup | Status |
|---|---|---|
| A | Halaman depan `/` (mode Persuade, dunianya sendiri) | selesai |
| B | Kit `src/ui` + 4 halaman bukti | selesai |
| B.5 | Cangkang peran (tenant, pembeli, operator) | selesai |
| C | Alur pembeli | selesai (11 dari 11) |
| D | Kurir | selesai (3 dari 3) |
| E | Tenant | selesai (24 dari 24) |
| F | Operator | selesai (14 dari 14) |

Hitungan Fase D dulu tertulis "1 dari 2" dan itu keliru: alur kurir punya TIGA halaman, dan
yang ketiga — `/scan/[token]`, pintu masuknya — tidak ikut terhitung karena ia tinggal di
luar `/courier`. Kurir masuk lewat pindai QR, jadi rutenya memang tidak berada di bawah
folder perannya. Angka Tenant dan Operator juga dikoreksi dengan hitungan sungguhan:

```bash
for peran in tenant operator; do
  total=$(find apps/web/src/app/$peran -name page.tsx | wc -l)
  sudah=$(for f in $(find apps/web/src/app/$peran -name page.tsx); do grep -ql '@/ui' "$f" && echo x; done | wc -l)
  echo "$peran: $sudah dari $total"
done
```

Halaman depan `/` TIDAK memakai `@/ui` dan memang tidak seharusnya: ia mode Persuade dengan
komponennya sendiri. Skrip di atas menandainya BELUM — abaikan untuk `/` saja.

### Yang lahir dari tiga halaman terakhir Fase C

Ketiganya menuntut perkakas yang belum ada, dan perkakas itu sekarang milik bersama —
jangan menyalinnya ulang di Fase D–F:

| Berkas | Isi | Sudah dipakai di |
|---|---|---|
| `src/components/tanda-verifikasi.tsx` | `STATUS_VERIFIKASI` (badge FR-2.6), `STATUS_MENTAH` (5 status pipeline), `<PilVerifikasi>` | katalog, rincian batch, rincian pesanan |
| `src/components/tahap-pengiriman.tsx` | `TAHAP` + `<PilTahap>` — enam tahap §5.6.1 | daftar & rincian pesanan |
| `src/components/kurva-ndvi-batch.tsx` | Kurva NDVI yang digerakkan `NdviSeries`, bukan konstanta halaman depan | rincian batch |
| `src/ui` → `Berkas` | Pemilih berkas; `sr-only`, bukan `hidden`, jadi bisa dijangkau papan ketik | konfirmasi terima, klaim mutu |
| `src/ui` → `Radio nonaktif` | Opsi mati WAJIB membawa alasannya; tidak bisa dimatikan tanpa kalimat | penyelesaian panen kurang |
| `src/lib/format-id` → `jamWib` | Jam WIB deterministik (offset tetap + getter UTC), bukan `toLocaleTimeString` | pelacakan kurir, node timeline |

`tanggalPanjang`/`tanggalPendek` kini memotong 10 karakter pertama lebih dulu, jadi stempel
waktu penuh (`2026-08-05T04:12:33Z`) tidak lagi jadi `NaN` diam-diam.

Isi yang dibuang dari `product/[id]`, dan alasannya dicatat karena ini bukan soal rupa:
blok spesifikasi karangan (Brix, "suhu 10–12°C", "7–10 hari Chiller", dimensi krat, gudang
konsolidasi), tiga foto stok Unsplash, dan kartu "Terverifikasi AI · Akurasi Biomassa 92%".
Dua yang pertama menjanjikan rantai dingin yang justru TIDAK ada — itu sebabnya komoditas
MVP dibatasi yang tahan suhu ambien. Yang terakhir mengklaim verifikasi satelit yang belum
menyala di produksi. `next.config.mjs` ikut kehilangan izin host Unsplash-nya.

### Fase D — layar lapangan punya syarat yang tidak dimiliki halaman kantor

Kurir dan Tenant membaca layarnya sambil BERDIRI, satu tangan, di bawah matahari, pada
Android kelas menengah-bawah. Yang berlaku di sana dan tidak di halaman pembeli:

- **Angka yang menentukan diset sebesar yang layar izinkan** — jarak 56px, kode antar 34px,
  keduanya monospace. Ini menyimpang dari ramp Operate dengan sengaja; hook desain akan
  menandainya, dan jawabannya adalah konteks pakainya, bukan ramp-nya.
- **`Deret kolom={2}` menahan dua kolom di SEGALA lebar.** Benar untuk angka pendek yang
  dibaca berpasangan, salah untuk alamat — pada 375px tujuan pecah jadi empat baris selebar
  150px. Untuk teks panjang, pakai `<dl className="space-y-4">` biasa.
- **Rata kiri sampai ke kendali paling bawah.** Satu blok tombol yang ditengahkan terbaca
  sebagai judul bagian baru, bukan sebagai kendali.

### Fase E — alur pencatatan lapangan (TN-17, TN-18, TN-19a/b/c)

Tiga cacat yang bukan soal rupa ikut diperbaiki, dan ketiganya menyentuh rantai bukti:

- **Asal foto berhenti dipalsukan.** `captureSource` dipaku `IN_APP_CAMERA` di halaman
  pencatatan, apa pun cara fotonya dipilih — sehingga pil "Dari galeri" di layar pembeli
  tidak pernah bisa muncul, dan rantai bukti memuat klaim asal-usul tanpa penopang. Sekarang
  dua kendali terpisah, dan yang tercatat adalah kendali yang benar-benar dipakai.
- **Foto yang hilang dinyatakan, bukan dibiarkan patah.** Foto demo sebelum pindah ke R2
  sudah hilang permanen (URL-nya 404), dan `<img>` yang gagal memuat menggambar kotak putus
  milik peramban berikut teks `alt` yang meluber — satu-satunya elemen yang digambar peramban,
  bukan oleh dunia ini, tepat di tempat buktinya seharusnya berdiri. `<FotoBukti>` kini
  menyatakan keadaannya dan menampilkan sidik jari foto: gambarnya boleh hilang, hash-nya
  tetap terkunci di rantai. Dipakai dari kedua sisi meja, Tenant dan pembeli.
- **"Gagal panen" berhenti diwarnai bahaya.** Tombolnya dulu bergaris merah di antara enam
  tombol netral. Deklarasi gagal panen justru yang paling dibutuhkan sistem ini tepat waktu
  dan jujur; mewarnainya seperti tindakan terlarang menghukum kejujuran sebelum orangnya
  sempat jujur. Konsekuensinya tetap dinyatakan — setelah dipilih, sebagai kalimat.

Dua halaman berikutnya (TN-14 daftar batch, TN-35 riwayat kewajaran) menambah dua pelajaran:

- **Kalimat penjelas status tidak diulang di daftar.** Di halaman rincian ia menjelaskan satu
  batch; dicetak dua belas kali di daftar ia berhenti dibaca. Pil menamai keadaan, penjelasan
  menunggu di halaman yang dibuka untuk satu batch.
- **Dunia ini tidak punya perangkat proporsional, dan itu disengaja.** Bilah kuota
  `rounded-full` dibuang dari daftar batch karena angkanya sudah lebih tepat. Di TN-35
  larangannya lebih keras lagi: menggambar posisi laporan di dalam pita akan menjawab persis
  pertanyaan yang FR-7.12c larang — "seberapa jauh lagi sampai kena?". Angka dilaporkan dan
  rentang perkiraan berdiri berdampingan sebagai dua nilai terukur, tanpa sumbu di antaranya.

TN-19b versus TN-19c tetap wajib TERASA berbeda, dan dunia ini memberi alat yang lebih tajam
daripada beda warna kartu: TN-19b menguasai ground `jambu` penuh, TN-19c tidak memakai warna
sama sekali — hanya aturan tinta dan tanda "tidak" yang digambar, yaitu perangkat "lubang"
yang sama dengan tanggal tertutup awan pada kurva NDVI. Hanya TN-19b yang meminta konfirmasi
eksplisit. Jangan satukan keduanya saat menyentuh berkas itu lagi.

### Fase E — alur pembukaan kuota (TN-16, TN-20)

Satu CACAT PERILAKU ikut ketahuan saat halaman dibuka dengan data yang tepat, dan ia bukan
soal rupa: pemindahan petak otomatis di `batch/new` mencari petak pengganti tanpa
mengecualikan petak yang sedang dipilih. Pada pemanggilan pertama ia menemukan petak itu
sendiri, memanggil `setLandPlotId` dengan nilai yang sama, dan React membatalkan render —
efeknya tidak pernah berjalan lagi. Akibatnya pada Tenant yang SEMUA petaknya sedang
dipakai: batas kuota tidak pernah tampil, peringatan "petak terpakai" tidak pernah muncul,
tombol simpan tetap hidup, dan penolakan baru datang dari server setelah formulir dikirim —
persis kebalikan dari alasan layar itu mengambil kapasitas lebih dulu. Yang ditandai
sekarang adalah petak yang barusan dicoba, bukan petak tujuannya.

Terlihat hanya dengan membuka halaman sebagai Tenant yang tepat (akun demo `081100000102`,
dua petak dan dua batch aktif). Data demo yang lapang tidak menunjukkannya.

### Fase E — katalog produk (TN-13, TN-13b)

Pola yang sama dengan `product/[id]` milik pembeli, kali ini di sisi Tenant: tiap kartu
produk dipuncaki blok abu-abu setinggi 192px berisi ikon gambar — tempat foto yang tidak
pernah ada isinya. Separuh tinggi kartu dihabiskan untuk mengumumkan ketiadaan, sementara
harga, isi box, dan sisa kuota berdesakan di bawahnya. Penggantinya isi, bukan gambar lain.

Tombol ubah produk juga berhenti jadi glif tanpa nama — cacat yang sama persis dengan tombol
ambil lokasi di layar pencatatan. **Kalau sebuah tindakan hanya diwakili ikon, ia belum punya
nama**: periksa itu tiap kali menyentuh halaman Tenant atau Operator berikutnya.

### Ramp tipografi: DESIGN.md kini menggambarkan SELURUH sistem

Hook desain menandai 14px, 12px, dan 22px sebagai di luar ramp selama tiga fase, dan setiap
kali dijawab "positif palsu". Itu keliru. Ketiganya memang dipakai kit `src/ui` sejak Fase B
— `Panel`, `Galat`, `Medan`, `Ubin`, `Nilai` — tetapi blok `typography` DESIGN.md hanya
memuat ramp halaman depan, jadi kontraknya melaporkan halaman yang benar sebagai pelanggaran.

DESIGN.md sekarang memuat tiga ramp: **Persuade** (halaman depan), **Operate**
(`body-panel` 14px, `hint` 12px, `data-tile` 22px), dan **lapangan** (`field-action` 16px,
`field-code` 34px, `field-figure` 56px) berikut alasan pakainya. Yang menentukan ramp mana
yang berlaku adalah permukaannya, bukan selera.

⚠️ `.impeccable/design.json` adalah berkas hasil generate dan masih lebih tua dari DESIGN.md.
Yang menyegarkannya `/impeccable document` — tetapi perintah itu MENGHASILKAN DESIGN.md dari
kode, jadi ia bisa menimpa prosa use-scene ramp lapangan yang tidak bisa disimpulkan dari
kode. Periksa diff-nya sebelum menerima.

### Fase E — alur lahan (TN-05, TN-06, dan `PetaLahan`)

DUA CACAT YANG SALING MENYEMBUNYIKAN, dan keduanya baru terlihat saat alurnya ditelusuri
sebagai alur, bukan sebagai halaman terpisah:

1. **`land/confirmation` tidak pernah bisa dicapai.** Layar pemetaan langsung kembali ke
   daftar lahan setelah menyimpan, jadi tidak ada satu pun tautan masuk ke halaman itu.
2. **Dan halaman itu menampilkan petak yang salah.** Ia mengambil `lahan[lahan.length - 1]`
   sebagai "petak terbaru", padahal server mengurutkan `ORDER BY area_ha DESC` — bukan
   menurut waktu buat. Elemen terakhir adalah petak TERKECIL milik Tenant. Halaman itu akan
   menyebut petak lama sebagai petak yang barusan disimpan, berikut luas dan tier yang bukan
   miliknya.

Cacat kedua tidak pernah ketahuan justru karena cacat pertama. Sekarang `PetaLahan`
mengembalikan petak yang baru dibuat, pemetaan mengarah ke ringkasan dengan membawa id-nya,
dan ringkasannya menunjuk petak lewat id — tidak menebak dari urutan. Bila id-nya tidak ada,
halaman menyatakan itu alih-alih menampilkan petak sembarang.

**Pelajaran yang berlaku umum: jangan pernah menebak "yang terbaru" dari urutan daftar.**
Urutan itu milik server dan bisa berubah tanpa memberi tahu siapa pun.

⚠️ `tenant/onboarding/mapping` IKUT bermigrasi karena memakai `PetaLahan` yang sama —
halaman setengah dunia lama dan setengah dunia baru lebih buruk daripada yang belum
tersentuh. Konsekuensinya: alur onboarding kini campur ANTAR-LANGKAH (langkah 2 sudah, 1 dan
3 belum). Empat halaman onboarding sisanya sebaiknya jadi yang berikutnya.

### Fase E — onboarding Tenant (5 layar + cangkangnya)

Cangkang onboarding memuat TIGA KLAIM YANG TIDAK DITOPANG APA PUN, semuanya di panel kiri
yang dibaca orang saat memutuskan apakah akan menaruh lahannya di sini:

- **"Jangkau ribuan jaringan HORECA"** — angka penggunaan yang dikarang. PRODUCT.md mengikat:
  tidak ada pelanggan nyata, testimoni, logo mitra, maupun angka penggunaan.
- **"SATELIT AKTIF: Real-time monitoring"** berikut titik berdenyut — dua kekeliruan sekaligus.
  Verifikasi satelit belum menyala di produksi, dan Sentinel-2 melintas lima harian, bukan
  real-time.
- **"Dokumen Anda dilindungi dengan enkripsi tingkat tinggi"** — klaim keamanan tanpa
  penopang, dipasang tepat di layar yang meminta foto KTP.

Ditambah tiga tautan kaki `href="#"`. Semuanya dibuang; yang menggantikan lencana palsu itu
adalah PENUNJUK LANGKAH, yang menempati tempat yang sama, mengatakan sesuatu yang benar, dan
menghapus pengulangan "Langkah N dari 3" di tiap halaman. Logo daun juga diganti
`public/logo.png` yang mengikat menurut PRODUCT.md.

**Rel kirinya `ungu`** karena ungu adalah pintu Tenant di halaman depan — orang yang sampai
di sini baru saja melewati pintu itu.

Pola duplikasi yang SUDAH TIGA KALI muncul dan patut dicurigai tiap kali: **judul panel dan
pil di sebelahnya memuat kata yang sama persis** (vonis kewajaran, status legalitas, label
komoditas). Kalau `Panel` sudah membawa nada dan judulnya, pil berisi kalimat yang sama
bukan penegasan — ia terbaca sebagai keterangan tambahan yang ternyata bukan.

### Fase E — pesanan Tenant (TN-21, TN-22, TN-23)

**Kosakata tahap disatukan, nadanya tidak.** Sebelum ini ada TIGA salinan `TAHAP` dengan dua
kosakata: daftar pesanan Tenant menyebut `PANEN` sebagai "Siap Kirim" sementara rincian yang
dibuka DARI daftar itu menyebutnya "Panen" — dua nama untuk satu keadaan pada dua layar
berurutan. Nama kini satu untuk semua peran; yang berbeda per peran adalah NADA, dan itu
memang isi: pembeli hanya perlu bertindak pada `TIBA_DI_LOKASI`, Tenant justru pada `PANEN`
saat QR dan Kode Antar menunggu diterbitkan. `PilTahap` menerima `peran`.

**Kendali yang hanya bisa ditolak dihapus.** Rincian pesanan menawarkan "Terbitkan QR"
kapan pun QR belum terbit — termasuk pada pengiriman yang sudah SELESAI, dan pada yang masih
MENUNGGU_PANEN (server menolak keduanya). Kini tombolnya hanya muncul pada tahap `PANEN`;
di luar itu halaman menyatakan sebabnya. Pola yang sama dengan penjaga kapasitas petak di
`batch/new` — **tawarkan tindakan hanya pada keadaan yang server memang menerimanya.**

**Kode Antar naik ke ground penuh `jambu`.** Ia betul-betul hanya ditampilkan sekali, dan
blok yang terbaca seperti keterangan biasa akan dilewati orang yang sedang buru-buru
menyerahkan box ke kurir.

Surat jalan (TN-23) adalah satu-satunya layar yang memang DICETAK, jadi dunia ini bukan tema
yang ditempelkan padanya melainkan bentuk aslinya — termasuk blok tanda tangan yang gunanya
baru muncul setelah dicetak.

### Fase E — tiga layar terakhir (TN-12, TN-24, TN-25)

**Beranda Tenant memakai tiga perangkat yang tidak dimiliki dunia ini**: kartu hero berlatar
hijau tua dengan piringan putih ber-`blur-2xl` (kaca dan cahaya sebagai hiasan), bilah
proporsi status batch, dan kartu indigo — warna yang tidak ada di palet mana pun. Bilahnya
juga tidak berarti: "60% batch Anda GROWING" tidak menuntun keputusan apa pun; yang berarti
cacahnya. Penggantinya bukan versi lebih tenang dari benda yang sama melainkan URUTAN: apa
yang menunggu tindakan hari ini, lalu yang sedang berjalan, lalu posisi uangnya. **Beranda
peran Operate adalah antrean kerja, bukan pameran angka.**

**Nama kolom basis data berhenti bocor ke layar.** Halaman keuangan menampilkan rincian
lewat `jenis.replace(/_/g, " ")`, jadi Tenant membaca "BIAYA BATAL10" dan "RELEASE30" di
halaman yang menjelaskan uangnya sendiri. Ketujuh jenis kini punya nama, keterangan, dan
ARAH uang di `@/components/entri-escrow`.

**"Menunggu penyaluran" naik ke ground penuh** — keadaan yang paling mudah disalahpahami di
seluruh produk (dana sudah jadi hak Tenant, instruksi ke mitra pembayaran belum tersambung),
dan kotak amber pucat di sebelah "sudah dicairkan" tidak cukup memisahkannya.

Satu pelajaran kecil yang berlaku umum: **jangan taruh nilai di dalam `Label`.** Label selalu
huruf besar ber-`tracking-cap`, dan itu mengubah `Rp2.640.000` jadi `RP2.640.000`. Nama
medannya label, angkanya monospace di bawahnya.

Dan satu penerapan aturan ramp yang baru ditulis: angka escrow sempat saya set 34px, padahal
itu langkah LAPANGAN. Halaman keuangan dibaca di meja, jadi ia memakai `data-display` 26px.
Permukaannya yang menentukan ramp-nya, bukan seberapa penting angkanya terasa.

### Fase F — dua antrean tinjauan (OP-03, OP-03b, OP-05, OP-05b)

Dimulai dari putusan yang jatuh ke orang lain: klaim mutu memindahkan uang dari escrow Tenant
ke pembeli, legalitas membuka izin sebuah usaha menerima pembayaran di muka. Keduanya dibaca
dua pihak yang tidak hadir di layar.

**Akibat putusan dihitung di depan mata.** Di layar klaim, nilai yang diketik langsung jadi
dua kalimat: berapa yang dipotong dari Tenant, berapa yang tetap jadi haknya. Peringatan
datang sebelum konsekuensinya, dan konsekuensinya di sini uang orang.

**"Setujui" dikunci selama dokumen legalitas belum ada.** Layar lama menawarkannya dengan
bobot yang sama persis walau tidak ada satu berkas pun untuk ditinjau — dan di data demo,
KETIGA Tenant yang sudah disetujui `legalityDocUrl`-nya null. Tombol nonaktif selalu disertai
sebabnya; tanpa itu orang hanya mengkliknya berulang kali.

**Nama enum berhenti bocor, untuk ketiga kalinya.** Setelah jenis kegiatan timeline dan buku
besar escrow, giliran `{legalityStatus}` yang tercetak apa adanya: "sudah berstatus REJECTED".
Kosakatanya kini di `@/components/status-legalitas`, dan sengaja BERBEDA dari kalimat yang
dibaca Tenant — operator perlu tahu apa yang harus ia lakukan, Tenant perlu tahu apa artinya
bagi dirinya.

**Foto yang gagal dimuat dinyatakan sebagai penghalang, bukan pojok kosong.** Foto klaim
adalah dasar putusan; `<img>` yang diam-diam 404 berarti operator memutus tanpa melihat
buktinya. `FotoPutusan` mengatakannya dan menyarankan meminta ulang fotonya.

Pelajaran yang berulang tiga kali dalam satu berkas dan pantas dicatat sebagai aturan:
**kalimat yang benar di satu keadaan jadi salah di keadaan lain.** Layar legalitas sempat
menunjuk "dokumen di atas" justru ketika dokumennya tidak ada, dan menyarankan "tolak" di
layar yang sudah tidak punya tombol tolak. Setiap kalimat yang menunjuk sesuatu di layar
harus ikut bercabang bersama keadaan yang menampilkannya.

Satu hal yang TIDAK diubah: putusan klaim maupun legalitas tidak pernah dikirim selama
pemeriksaan. Antrean klaim demo kosong, jadi layar berisinya dilihat lewat rute tiruan
GET-saja di proksi scratchpad; `POST /decide` sengaja tidak ditiru.

### Fase F — verifikasi satelit (OP-04, OP-04b)

**Kurvanya akhirnya sampai ke meja yang memutus.** Layar ini menilai apakah kurva vegetasi
mendukung tanggal yang diklaim Tenant, dan satu-satunya bentuk kurvanya adalah tabel angka.
Pembeli — yang cuma membaca hasilnya — sudah melihat grafiknya sejak Fase C. **Orang yang
mengambil keputusan punya bukti visual lebih sedikit daripada orang yang membaca akibatnya.**
`KurvaNdviBatch` yang sama dipakai di kedua tempat.

**Salinan ketiga pemetaan status dibuang.** Halaman antrean punya `STATUS`-nya sendiri
lengkap dengan emerald/amber/orange/gray/red — persis yang dilarang docstring
`tanda-verifikasi.tsx`. Berbeda dengan legalitas, di sini kosakatanya sengaja TIDAK dipisah
per peran: `STATUS_MENTAH` sudah menyatakan alasannya sendiri, bahwa kedua sisi meja harus
menyebut keadaan yang sama dengan kata dan warna yang sama.

**Akibat putusan dinyatakan sebagai tanda yang dilihat pembeli.** Empat status mentah
meringkas jadi tiga badge, dan peringkasannya tidak terbaca dari nama statusnya: "citra tidak
bisa dinilai" dan "citra menyangkal klaim" sama-sama jadi "belum terverifikasi", padahal
artinya jauh berbeda. Pemetaannya diambil dari `toVerificationBadge` di kontrak bersama.

**Tidak ada medan catatan, dan itu keputusan sadar.** `DecideSatelliteBody.note` diterima DTO
lalu dibuang — controller memanggil `decideSatellite(batchId, dto.verificationStatus)` tanpa
meneruskannya. Menyediakan kotak alasan yang isinya menguap adalah meminta orang menulis
untuk tempat sampah. Yang harus diperbaiki lebih dulu adalah servernya.

**Dua cacat yang hanya terlihat di layar sungguhan:**

- *Satu fakta, dua sumber.* Panel pembanding membaca tanggal terdeteksi dari item antrean
  sementara kurva menggambarnya dari deret NDVI. Begitu keduanya berbeda, halaman menulis
  "panen tidak terdeteksi" tepat di atas grafik yang menggambar garis panen terdeteksi.
  Sekarang keduanya membaca deret yang sama.
- *Nol bukan "sedikit".* Batch demo punya `observationCount` 0, dan kalimat yang ditulis untuk
  "ada lintasan, sebagian dibuang" berbunyi "0 dari 0 lintasan terpakai, yang tertutup awan
  dibuang" — mengarang proses yang tidak pernah terjadi. Tiga keadaan, bukan dua.

Ini kali keempat dalam dua batch **kalimat yang benar di satu keadaan jadi salah di keadaan
lain.** Aturannya sudah ditulis di bagian sebelumnya; yang baru di sini adalah bahwa
keadaan-nol hampir selalu butuh cabangnya sendiri, bukan menumpang cabang "sedikit".

### Fase F — komoditas & angka kalibrasi (OP-10, OP-10b)

Tiga angka di layar ini mengikat SEMUA Tenant sekaligus: rendemen membatasi kuota PO,
toleransi susut menentukan klaim mutu mana yang sah, umur tanam minimal jadi pagar tanggal
panen. Dan ketiganya berlaku surut terhadap batch yang sedang berjalan.

**Pemanggilan yang tampak memformat angka, ternyata tidak memformat apa pun.**
`avgYieldKgPerHa.toLocaleString("id-ID")` — nilainya Decimal Prisma yang diserialkan sebagai
STRING, jadi yang terpanggil `String.prototype.toLocaleString`, yang mengembalikan stringnya
apa adanya dan mengabaikan argumen locale-nya. Rendemen lima digit tampil `15000` tanpa
pemisah ribuan, tanpa satu pun galat. **Karena kontraknya mengaku `number`, TypeScript tidak
bisa menangkapnya** — dan itu pelajaran yang lebih besar dari bug-nya: tipe yang berbohong
mematikan alat yang seharusnya menjaga. Pembacaannya kini lewat `bacaKomoditas`.

**Formulir menawarkan dua dari tiga nilai enum.** `CommodityCategory` punya DAUN, BUAH_UMBI,
dan KERING; tombolnya diketik tangan dan berhenti di dua. Belum ada komoditas KERING di data
demo, jadi kekurangannya diam — tetapi komoditas kering tidak akan pernah bisa dibuat, dan
begitu ada satu, formulirnya terbuka tanpa kategori tersorot sehingga klik pertama operator
diam-diam memindahkan kategorinya. Pilihannya kini dibangkitkan dari `Object.values(enum)`.

**Yang TIDAK disentuh dinyatakan.** Formulir berisi lima medan di atas data yang punya lebih
banyak medan terbaca seperti formulir yang akan menghapus sisanya. Server hanya menulis
`gradeStandards` bila medannya terkirim, jadi definisi grade A/B/C aman — dan sekarang
halamannya mengatakan itu, alih-alih membiarkan operator menebak.

**Satu kecurigaan yang ternyata salah, dan itu pantas dicatat.** Saya menduga kolom "umur
tanam" selalu kosong karena `growingDaysMin` tidak ada di `CommoditySummary` dan halamannya
menambal dengan cast lokal. Memeriksa responsnya sungguhan: servernya MENGIRIM medan itu
(150 hari untuk Apel Batu). Yang cacat kontraknya, bukan tampilannya. Membetulkan "bug" itu
tanpa memeriksa akan merusak kolom yang selama ini benar.

Kontrak `CommoditySummary` memang tertinggal dari servernya — `growingDaysMin`,
`shelfLifeDays`, dan `ambientStable` dikirim tetapi tidak dideklarasikan, dan
`shrinkTolerancePct`/`avgYieldKgPerHa` dideklarasikan `number` padahal tiba sebagai string.
Perbaikan yang benar ada di serialisasi server, jadi tidak dikerjakan di sini; sementara itu
pembacaannya dikumpulkan di `@/components/komoditas` supaya konversinya tidak lupa dilakukan
di halaman berikutnya. Modul yang sama menghapus salinan kedua pemetaan `KATEGORI` yang
sebelumnya hidup di halaman produk pembeli.

### Fase F — escrow & umur simpan (OP-09, OP-14)

Dua layar pemantauan, dan keduanya hanya berguna bila menyatakan batas pengetahuannya
sendiri: yang satu tentang uang yang belum benar-benar berpindah, yang lain tentang angka
yang belum divalidasi.

**"Sudah dicairkan" berhenti jadi judul yang menyesatkan.** `menungguPenyaluran` adalah
BAGIAN dari `totalDicairkan` yang instruksinya ke mitra pembayaran belum sukses. Di data demo
keduanya sama persis — Rp8.892.000 — artinya **nol rupiah benar-benar sampai ke rekening
siapa pun.** Layar lama menyatakannya sebagai butir bersarang dengan indentasi dua spasi di
dalam string, `"  ↳ menunggu penyaluran"`, padahal butir-butirnya duduk di dalam grid: spasi
itu tidak menghasilkan indentasi apa pun, jadi hubungan induk-anaknya tidak pernah terlihat.
Ketiga angkanya kini satu panel yang menghitung selisihnya sendiri dan menamainya "sudah
diterima Tenant".

**Saldo tertahan negatif dinyatakan sebagai anomali.** `tertahan` = seluruh HOLD dikurangi
seluruh arus keluar, jadi angka negatif berarti ada potongan atau pengalihan tanpa dana yang
pernah ditahan untuknya. Data demo punya satu: Tani Muda Wajak, −Rp6.600.000 tertahan dengan
Rp0 pernah ditahan — dan 6,6 juta itu persis jumlah potongan klaim (1,76 jt) dan pengalihan
substitusi (4,84 jt) di ringkasan atas. Buku besar append-only tidak bisa disunting dari
layar, jadi **satu-satunya guna dashboard ini adalah membuat keadaan seperti itu kelihatan**
— dan layar lama mencetaknya abu-abu, sama seperti angka lainnya.

**Kartu hijau tua ber-`blur-2xl` dibuang.** Kaca dan cahaya sebagai hiasan sudah dibuang dari
beranda Tenant di Fase E; ini salinan keduanya.

**`{b.shipmentStatus}` berhenti dicetak mentah** — kebocoran nama enum kelima, setelah
kegiatan timeline, buku besar escrow, status legalitas, dan verifikasi satelit. Pilnya
sengaja NETRAL alih-alih memakai `PilTahap`: `RUPA` di komponen itu menyatakan GILIRAN SIAPA
sebuah tahap, dan di layar ini tidak ada tahap yang menuntut tindakan operator. Warna
mendesaknya sudah dipakai sisa umur simpan, dan warna yang dipakai dua kali untuk dua arti
berhenti berarti apa pun.

**`settled` akhirnya dipakai.** Kontraknya memuat penanda apakah umurnya sudah final (barang
tiba) atau jamnya masih berjalan; layar lama membuangnya. "Sisa 2 hari" yang membeku dan
"sisa 2 hari" yang masih menghitung mundur menuntut tindakan berbeda dari yang membacanya.

**`rupiah()` menaruh minus di tempat yang salah.** `Rp-6.600.000` menempatkan tanda di antara
penanda mata uang dan angkanya, seolah yang negatif adalah rupiahnya. Kini `-Rp6.600.000`.
Cacat ini tidak pernah terlihat sebelumnya karena tidak ada layar yang menampilkan rupiah
negatif — sampai panel anomali di atas dibuat.

Satu catatan cara kerja: dua "cacat" yang saya lihat di tangkapan layar halaman umur simpan
— baris keempat hilang dan satu baris kehilangan keterangannya — ternyata **tidak ada**.
Keduanya artefak tangkapan layar yang terpotong. Membaca DOM-nya lebih dulu mencegah
"perbaikan" atas sesuatu yang sudah benar, persis seperti dugaan `growingDaysMin` di batch
komoditas.

### Fase F — tiga halaman terakhir (OP-08, OP-11, beranda)

**Beranda merakit dirinya dari dua antrean, padahal ada lima.** Docstring-nya menyebut
alasannya — hanya klaim dan legalitas yang punya endpoint — dan itu benar saat ditulis. Kini
tinjauan satelit, tinjauan kewajaran, dan pantau umur simpan semuanya punya endpoint dan
halamannya sendiri. Akibatnya beranda bisa berkata "tidak ada antrean" sementara sebuah
tinjauan satelit menunggu. **Kesalahan terburuk yang bisa dilakukan sebuah antrean kerja
adalah menyatakan dirinya kosong padahal tidak.**

**`Promise.all` → `Promise.allSettled`.** `all` menolak pada kegagalan pertama, jadi satu
antrean bermasalah menghapus empat antrean lain yang baik-baik saja dan menggantinya dengan
satu kotak merah. Sekarang antrean yang gagal mencetak `?` berikut pil "gagal dimuat", sisanya
tetap terbaca, dan `semuaBersih` menolak menyimpulkan apa pun selama ada yang tidak diketahui
— **antrean yang tidak diketahui isinya tidak pernah dihitung nol.** Dibuktikan dengan
menggagalkan satu endpoint dengan sengaja di proksi, lalu melepasnya lagi.

**"SLA 1 hari kerja" berhenti diketik di kalimat** — `CLAIM_REVIEW_SLA_HOURS` dari kontrak
bersama, aturan yang sama yang dipakai server saat menandai klaim lewat SLA.

**Tombol ubah zona tidak punya nama.** Ia hanya berisi ikon pensil tanpa `aria-label` maupun
teks, jadi pembaca layar mengumumkan tiga tombol identik bernama "button" di daftar tiga zona.

**Dua saluran galat zona dipisah.** Satu state `galat` dipakai bersama oleh kegagalan MEMUAT
daftar dan kegagalan MENYIMPAN formulir, ditampilkan dengan syarat `galat && !buka`. Akibatnya
galat pemuatan berpindah ke dalam formulir begitu formulirnya dibuka, dan orang membaca
"gagal memuat zona" sebagai alasan simpanannya gagal.

**Audit: `toLocaleDateString` diganti `tanggalPanjang`.** Di halaman yang seluruh gunanya
membuktikan sesuatu TIDAK berubah, tanggal yang berbeda antara render server dan render klien
adalah jenis ketidakcocokan yang paling buruk untuk ditemukan. Data demo ternyata memang punya
satu jangkar yang tidak cocok — Wortel Pujon Grade A, dijangkarkan 7 Agustus 2026.

Dua duplikasi yang SAYA buat sendiri dan ketahuan dari tangkapan layar: kota tercetak dua kali
di tiap kartu zona (label panel + baris data), dan kalimat "belum dipublikasikan ke penyimpanan
eksternal" terulang di tiap kartu jangkar padahal panel di bawahnya sudah menyatakannya.
Pengulangan justru menumpulkan kalimat yang sedang berusaha jujur.

## Yang harus diperiksa tiap kali, dan alasannya

Enam hal ini masing-masing pernah lolos ke produksi di proyek ini.

1. **Lihat hasilnya dengan mata.** Guilloche halaman depan menggambar KOSONG sementara
   elemennya ada, ukurannya benar, kontrasnya lulus, hydration bersih, dan build lolos.
   Tidak ada pemeriksaan terukur yang menangkapnya.
2. **Jangan sambung kelas dengan template literal — pakai `cn()`.** Pemenang antara kelas
   dasar komponen dan `className` pemanggil ditentukan urutan CSS hasil build, bukan urutan
   penulisan. Terukur: `text-ungu` menang melawan `text-tinta-samar`, tetapi `text-biru` dan
   `text-jambu` kalah melawan kelas yang sama persis. Audit kontras pun tidak menangkapnya,
   karena ia membaca warna yang benar-benar dipakai.
3. **Angka aturan server diimpor dari `@agro-os/shared`, tidak diketik ulang.** Biaya laporan
   Rp25.000 sempat hidup di dua tempat: yang menagih dan yang menampilkan.
4. **Tanggal dan angka lewat `@/lib/format-id`.** `toLocaleDateString("id-ID")` bergantung
   pada data ICU runtime; selisih satu karakter antara server dan peramban membuang seluruh
   pohon React dengan galat hidrasi.
5. **Buka juga baris yang KOSONG, bukan hanya yang berisi.** Tiga cacat di halaman rincian
   batch cuma muncul pada batch tanpa data, dan ketiganya lolos typecheck, build, dan
   pembacaan kode: pil "Sentinel-2 · 0 lintasan", kalimat "sisanya tertutup awan" pada batch
   yang tidak punya satu pun lintasan (menyalahkan cuaca atas ketiadaan data), dan pil
   "Rantai utuh · 0 catatan" berikut hash akar yang sebenarnya SHA-256 dari string kosong.
   Semuanya benar secara teknis dan menyesatkan secara praktis. Data demo yang rapi tidak
   akan menunjukkannya — cari batch yang benar-benar kosong.
6. **Artefak mockup bisa lolos ke produksi dan hanya terlihat oleh mata.** Layar pelacakan
   kurir menggambar BINGKAI PONSEL — lebar dipatok 400px, tinggi 700px, sudut 40px, bezel
   hitam 8px, `shadow-2xl` — lalu disajikan kepada kurir yang membukanya DI ponsel. Ponsel
   di dalam ponsel, memakan layar sungguhan milik orang yang sedang berdiri di bawah
   matahari. Typecheck lolos, build lolos, kontras lolos; yang menangkapnya cuma melihat.

Dan periksa di 375px, bukan hanya di lebar penuh: label `tracking-cap` 0,26em tidak bisa
dipersempit, jadi grid yang tidak runtuh akan bertabrakan di sana — pakai `<Deret>`.
