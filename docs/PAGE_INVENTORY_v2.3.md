# AgroUs — Page Inventory v2.3 (Tambahan atas v2.2)

> **Dokumen ini bersifat ADITIF.** Seluruh 112 halaman dan state pada `PAGE_INVENTORY.md` v2.2
> **tetap berlaku dan tidak ada yang dihapus**. Yang berubah hanya: **9 halaman/state baru**,
> **6 halaman berubah isi** (ID dipertahankan), dan **penjadwalan ulang** mengikuti roadmap §11.1 baru.
>
> Turunan dari [`PRD.md`](PRD.md) **v2.3** + [`diagrams/`](diagrams).
>
> **Total setelah v2.3: 121 halaman & state** (112 lama + 9 baru).
>
> **Ringkasan bagi desainer:** ada satu tema besar di rilis ini — **memberi tahu Tenant sebelum
> menghukum, dan memberi tahu Pembeli bahwa ia diprioritaskan.** Hampir semua halaman baru adalah
> layar peringatan, penjelasan, atau pemberitahuan. Tidak ada fitur transaksional baru.

---

## 1. Halaman & State BARU (9)

### 1a. Tenant (4)

| ID | Halaman / State | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| **TN-19b** | ↳ Peringatan Kewajaran Hasil | — | Muncul saat jumlah box yang dilaporkan **di luar pita kewajaran NDVI**, **sebelum** konfirmasi panen. Wajib tampilkan: rentang pita yang dihitung sistem, angka yang dilaporkan Tenant, dan konsekuensi eksplisit — *"cap tanggungan 10% akan gugur untuk batch ini"*. Butuh konfirmasi eksplisit, bukan sekadar tombol lanjut. **Nada informatif, bukan menuduh.** | FR-4.10, FR-7.11, `THW` | M |
| **TN-19c** | ↳ Info Tidak Dapat Dinilai | — | Muncul saat puncak NDVI tidak tersedia (tutupan awan berkepanjangan). **Harus terasa berbeda dari TN-19b** — ini bukan kecurigaan, ini keterbatasan cuaca. Nyatakan: tidak ada konsekuensi penalti, bukti foto tetap berlaku. | FR-7.12e, `THN` | M |
| **TN-34** | Posisi Realisasi vs Zona | `/tenant/reputasi` *(bagian baru)* | Menampilkan **posisi relatif** realisasi Tenant terhadap rata-rata zona untuk komoditas & musim yang sama. ⚠️ **DILARANG menampilkan angka ambang penalti atau jarak menuju ambang** (FR-7.12c). Contoh diksi yang benar: *"Realisasi Anda 8% di bawah rata-rata zona untuk cabai musim ini."* | FR-7.12b, FR-7.12f, `TRP` | S |
| **TN-35** | Riwayat Penilaian Kewajaran per Batch | `/tenant/batch/[id]/kewajaran` | Riwayat penilaian batch: nilai (`WAJAR` / `PERLU_DITINJAU` / `TIDAK_WAJAR` / `TIDAK_DAPAT_DINILAI`), rentang pita, dasar penilaian yang dipakai (pita saja / pita + benchmark). Transparansi perhitungan, bukan skor buta. | FR-4.10, FR-7.12d | S |

### 1b. Pembeli (2)

| ID | Halaman / State | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| **BY-11d** | ↳ Banner Senioritas Shortfall | — | Muncul di **Pesanan Saya** bagi pembeli yang siklus lalu terkena shortfall. Isi: *"Pesanan Anda diprioritaskan pada panen berikutnya dari [Tenant]."* **Penting:** senioritas yang tidak diberitahukan tidak menghasilkan retensi — pembeli tetap merasa dirugikan dan tetap pergi. Banner ini adalah setengah nilai dari FR-7.13. | FR-7.13, `PSN` | M |
| **BY-12b** | ↳ Sisa Umur Simpan pada Pesanan *(baru v2.4)* | `/buyer/orders/[id]` | Umur produk saat tiba dan sisa umur simpannya, diturunkan dari **stempel server node Panen** — bukan dari tanggal yang diketik penjual. Nyatakan asal angkanya, karena justru itu yang membedakannya dari klaim. | FR-5.9, `PUS` | M |
| **BY-11e** | ↳ Penjelasan Opsi Substitusi Tidak Tersedia | — | Saat substitusi disembunyikan (shortfall wajar + selisih harga > 10%), jelaskan **mengapa** — bukan sekadar menampilkan dua opsi tanpa konteks. Diksi: *"Tidak ada Tenant pengganti dengan selisih harga yang dapat ditanggung. Tersedia penjadwalan ulang atau pengembalian dana penuh."* | FR-7.11, `PHB` | M |

### 1c. Operator (1)

| ID | Halaman / State | Rute | Isi kunci | Ref | Prio |
|---|---|---|---|---|---|
| **OP-14** | Antrean Pantau Umur Simpan *(baru v2.4)* | `/operator/umur-simpan` | Batch yang sudah dipanen tetapi belum terkirim, diurutkan dari sisa umur simpan paling tipis. **Informatif, bukan penghalang** — tidak ada tombol yang memblokir pengiriman. Wajib menampilkan bahwa angka umur simpan masih indikatif dan belum divalidasi lapangan. | FR-5.10, FR-5.8 | S |
| **OP-13** | Antrean Tinjauan Kewajaran Hasil | `/operator/kewajaran` | Batch bernilai `PERLU_DITINJAU`. Tampilkan berdampingan: kurva NDVI, rentang pita, jumlah dilaporkan, dan **realisasi Tenant lain di zona & musim sama**. SLA 1 hari kerja dengan countdown. Putusan operator menentukan apakah cap 10% berlaku. | FR-7.12a, FR-5.6 | M |

### 1d. Error & System States (2)

| ID | State | Kapan muncul | Yang harus ada di desain | Ref |
|---|---|---|---|---|
| **ER-23** | **Batch Tidak Dapat Dinilai** | Puncak NDVI tak tersedia **dan/atau** benchmark zona < 5 batch pembanding. | ⚪ **Jujur, bukan menuduh.** Nyatakan: sistem tidak punya dasar menilai, **tidak ada penalti dijatuhkan**, bukti foto tetap berlaku. Bedakan tegas dari ER-24. | FR-7.12e |
| **ER-24** | **Laporan Hasil di Luar Pita Kewajaran** | Jumlah box dilaporkan jauh di bawah pita padahal kurva vegetasi normal hingga panen. | Tampilkan perhitungan pita secara terbuka, konsekuensi (cap 10% gugur), dan jalur banding ke Operator. **Bukan penolakan** — Tenant tetap bisa melanjutkan, tetapi dengan konsekuensi yang ia lihat lebih dulu. | FR-4.10, FR-7.11 |

---

## 2. Halaman yang BERUBAH ISI (ID dipertahankan, 6)

> Tidak ada yang dihapus. Yang berubah adalah **isi** atau **status penjadwalan** — desain lama
> tetap menjadi titik awal, bukan dibuang.

| ID | Perubahan v2.3 | Ref |
|---|---|---|
| **TN-17** | Jenis kegiatan: **6 → 7 opsi** (tambah `GAGAL_PANEN`). *Sudah berlaku sejak v2.2, ditegaskan di sini karena label lama masih tertulis "6 opsi".* | §5.4.1 |
| **TN-19** | Setelah input jumlah box aktual, alur kini melewati **TN-19b / TN-19c** sebelum TN-19a. | FR-4.10 |
| **TN-19a** | Pratinjau alokasi kini menampilkan urutan **senioritas shortfall lebih dulu, baru FIFO `paid_at`** — bukan FIFO murni. | FR-7.13 |
| **TN-33** | Judul & isi bergeser: dari *"Rasio Shortfall & Reputasi"* dengan peringatan mendekati ambang 15%, menjadi **rasio klaim + rujukan ke TN-34**. ⚠️ **Hapus seluruh tampilan angka ambang.** | FR-7.12c |
| **BY-11a** | Kondisi penyembunyian substitusi berubah: bukan lagi "gagal terverifikasi & selisih > 10%", melainkan **"shortfall dinilai wajar & selisih > 10%"**. Bila shortfall `TIDAK_WAJAR`, substitusi **tetap ditawarkan** (Tenant menanggung selisih penuh). | FR-7.11 |
| **ER-21** | Judul tetap "Kuota Diturunkan", tetapi isinya **tidak boleh lagi menampilkan angka ambang**. Ganti dengan: penjelasan perhitungan deviasi, posisi relatif terhadap zona, dan syarat pemulihan (2 siklus wajar). | FR-7.12c, FR-7.12d |

### Halaman yang ditandai **[PASCA-MVP]** (tidak dihapus, tidak didesain sekarang)

| ID | Halaman | Alasan |
|---|---|---|
| **TN-27** | Rekomendasi Tanam | Modul Demand Intelligence ditunda — butuh data 2–3 siklus tanam (§5.8). Desain ditunda, ID dipertahankan. |
| **TN-28** | Buka Kuota dari Rekomendasi | Bergantung pada TN-27. |
| **BY-19** | Pesan Ulang | Tetap prioritas C, kini eksplisit di luar 12 minggu. |

---

## 3. Penjadwalan Ulang Mengikuti Roadmap §11.1 Baru

> Roadmap v2.3 memindahkan **Verifikasi mendahului Transaksi**, karena verifikasi adalah satu-satunya
> pembeda produk — bila tidak bekerja, lebih baik diketahui minggu ke-7 daripada minggu ke-9.
> **Fase 0 tidak menghasilkan halaman apa pun** (validasi lapangan, bukan pembangunan).

| Fase | Minggu | Halaman |
|---|---|---|
| **0 — Validasi** | 1–3 | *(tidak ada halaman — pemetaan poligon nyata, tarik NDVI historis, wawancara pembeli)* |
| **1 — Fondasi** | 4–5 | SH-01…08 · TN-01…05 · TN-10…15 · BY-01…03 · OP-01, 02 · ER-13, 14, 19, 20 · **seed komoditas & zona** |
| **2 — Verifikasi** | 6–7 | TN-16…18 · TN-30, 30a · **TN-35** · BY-03a, 03b · OP-07, 08, 12 · ER-07, 08, 09, 10, 11, 16, 17 |
| **3 — Transaksi** | 8–9 | BY-04…08 · BY-06a · BY-09, 10, 17 · TN-25, 26 · ER-01, 02, 03, 12 |
| **4 — Logistik** | 10–11 | TN-21…24 · TN-29 · BY-10a, 10b, 13, 14, 15 · **KR-01…10** · OP-03…06, 09, 10, 11 · ER-04, 05, 06, 15, 18 |
| **5 — Shortfall & Penyelesaian** | 12 | TN-19, **19a, 19b, 19c**, 20, 20a · TN-33, **34** · BY-11, 11a, 11b, 11c, **11d, 11e**, 12 · **OP-13** · ER-21, 22, **23, 24** |
| **Pasca-MVP** | — | TN-27, 28 · BY-19 |

> **Catatan penting bagi PM:** seluruh halaman baru v2.3 jatuh di **Fase 5 (minggu ke-12)**, kecuali
> TN-35 yang naik ke Fase 2 karena bergantung pada pipeline satelit. Fase 5 kini padat — bila terpaksa
> dipotong, prioritas yang **tidak boleh** dikorbankan adalah **TN-19b** dan **BY-11d**: keduanya adalah
> mekanisme yang menjaga kedua sisi marketplace tetap bertahan, bukan sekadar tampilan.

---

## 4. Aturan Desain Baru v2.3

Empat aturan ini mengikat seluruh halaman di atas dan beberapa halaman lama.

**1. Jangan pernah menampilkan angka ambang penalti.** Berlaku di TN-33, TN-34, ER-21, dan notifikasi apa pun. Ambang adalah parameter server (FR-7.12c). Yang ditampilkan adalah **posisi relatif**, bukan jarak menuju hukuman. Alasannya bukan estetika: ambang yang terlihat berubah menjadi target yang bisa dipermainkan.

**2. Bedakan "tidak dapat dinilai" dari "janggal".** TN-19c vs TN-19b, ER-23 vs ER-24. Keduanya berarti sistem tidak bisa memastikan, tetapi penyebabnya berbeda — cuaca versus kejanggalan. Menggabungkan keduanya membuat Tenant merasa dituduh karena mendung, dan itu cara tercepat kehilangan sisi pasok.

**3. Peringatan datang sebelum konsekuensi, tidak sesudah.** TN-19b muncul sebelum tombol konfirmasi, bukan sebagai notifikasi seminggu kemudian. Setiap layar yang menjatuhkan konsekuensi harus punya layar peringatan pasangannya.

**4. Nada ke Tenant: informatif, bukan mengancam.** Tenant adalah sisi pasok yang harus diakuisisi, bukan tersangka yang harus diawasi (§9 poin 8). Tagline *"Kami tidak percaya klaim petani"* ditujukan kepada pembeli dan juri — **tidak boleh muncul di antarmuka Tenant mana pun** (§11.3).

---

## 5. Matriks Ketertelusuran v2.3

Setiap perubahan v2.3 dapat ditelusuri dari FR → diagram → halaman.

| FR | Use Case | Activity | User Flow | Sequence | Halaman |
|---|---|---|---|---|---|
| **FR-4.10** Pita kewajaran | UC-4c | `PLB`, `PLC`, `PLW`, `PLT`, `PLX` | `THK`, `THW`, `THN` | blok `rect` penilaian | TN-19b, TN-19c, TN-35, ER-24 |
| **FR-7.12a** Pita individual | UC-4c → UC-10 | `PNA` | — | `alt` kurang dari 5 pembanding | OP-13, TN-35 |
| **FR-7.12b** Benchmark zona | UC-10a | `PNB` | `TRP` | `SELECT benchmark zona` | TN-34 |
| **FR-7.12c** Ambang tak dipublikasikan | — | *(tidak ada angka di node mana pun)* | `TRP` | `Note` pada blok penalti | TN-33, TN-34, ER-21 |
| **FR-7.12d** Konsekuensi kuota | — | `PN1` | — | `alt` deviasi berulang | ER-21 |
| **FR-7.12e** Cold start | — | `PN0`, `PL0` | `THN` | `alt` NDVI tak tersedia | TN-19c, ER-23 |
| **FR-7.13** Senioritas shortfall | UC-4b | `ALC`, `SP3`, `H1` | `PSN`, `PSC` | `ORDER BY senioritas DESC` | BY-11d, TN-19a |
| **FR-7.11** Cap gugur | UC-7a → UC-4c | `DPL`, `DCAP`, `DSUB` | `PSU`, `PHB` | `alt` opsi assurance | BY-11a, BY-11e |
| **FR-5.8** Umur simpan komoditas | — | — | — | — | OP-14 |
| **FR-5.9** Umur produk saat tiba | — | — | `PUS` | `Note` pada konfirmasi panen | BY-12b |
| **FR-5.10** Antrean pantau umur simpan | — | — | — | — | OP-14 |
| **FR-7.2** Pencairan per Tenant | UC-11 | `G9` | — | `loop` disbursement | TN-25 |
| **§5.8** Demand Intelligence ditunda | UC-13 *(abu-abu)* | — | *(dihapus dari alur Tenant)* | — | TN-27, TN-28 → pasca-MVP |

---

## 6. Yang Sengaja TIDAK Ditambahkan

- **Halaman Fase 0.** Validasi dilakukan di lapangan dan lewat wawancara, bukan lewat aplikasi. Membuat halaman untuk itu akan mengubah gerbang validasi menjadi fitur.
- **Dashboard analitik shortfall untuk Tenant.** Cukup TN-34 (posisi relatif) dan TN-35 (riwayat per batch). Analitik yang lebih dalam akan menggoda tim menampilkan angka ambang.
- **Halaman banding penalti terpisah.** Jalur banding menempel di ER-21 dan OP-13; membuat alur banding sendiri terlalu berat untuk MVP dengan 25 Tenant.
- **Pemilihan ekspedisi & metrik performa kurir.** Tetap ditolak eksplisit oleh **FR-6.4** — tidak berubah sejak v2.1.
