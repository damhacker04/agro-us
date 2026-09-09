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
| **E** | **Tenant** | **1 dari 24** |
| F | Operator | 1 dari 14 |

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
