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
| **C** | **Alur pembeli** | **8 dari 11** |
| D | Kurir | 1 dari 2 |
| E | Tenant | 1 dari 23 |
| F | Operator | 1 dari 12 |

Halaman depan `/` TIDAK memakai `@/ui` dan memang tidak seharusnya: ia mode Persuade dengan
komponennya sendiri. Skrip di atas menandainya BELUM — abaikan untuk `/` saja.

### Sisa Fase C — tiga halaman, dan ketiganya yang terberat

| Rute | Baris | Kenapa berat |
|---|---|---|
| `/buyer/product/[id]` | 463 | Memikul verifikasi satelit dan tiga status badge. Halaman yang menentukan keputusan beli. |
| `/buyer/orders/[id]` | 625 | Timeline berantai, pelacakan kurir, jendela klaim mutu. Terbesar di aplikasi. |
| `/buyer/orders/[id]/resolution` | 360 | Tawaran substitusi dan cap gugur. Uang berpindah di sini, jadi salah tampil berarti salah keputusan. |

Kerjakan `product/[id]` lebih dulu: ia yang menentukan keputusan beli, dan pola badge
verifikasinya sudah ada di `/buyer/catalog` (`STATUS` → `Tanda` penuh/sebagian/tidak) jadi
tinggal dilanjutkan, bukan dikarang ulang.

## Yang harus diperiksa tiap kali, dan alasannya

Empat hal ini masing-masing pernah lolos ke produksi di proyek ini.

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

Dan periksa di 375px, bukan hanya di lebar penuh: label `tracking-cap` 0,26em tidak bisa
dipersempit, jadi grid yang tidak runtuh akan bertabrakan di sana — pakai `<Deret>`.
