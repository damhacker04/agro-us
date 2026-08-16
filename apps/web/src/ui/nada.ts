/**
 * Nada — empat warna sertifikasi diterjemahkan jadi kosakata keadaan.
 *
 * Di halaman depan warna menguasai REGION penuh: satu bagian, satu warna, ground dan tipe
 * dan garisnya sekaligus. Itu perangkat Persuade dan tidak bisa dipindahkan apa adanya ke
 * halaman kerja — satu halaman antrean yang tiap kartunya menguasai region akan jadi
 * tambal sulam, dan mode Operate berpijak pada warna yang tertahan.
 *
 * Terjemahannya memakai perangkat dunia ini sendiri, bukan aksen tempelan: GARIS. Sertifikat
 * memisahkan setiap kolom dengan aturan tinta 1px; keadaan menaikkannya jadi 2px dalam warna
 * keadaan itu, dan mewarnai labelnya. Grounnya tetap kertas. Warna penuh disediakan untuk
 * dua hal yang memang region kecil utuh — pil status dan banner galat — di mana hukum
 * region-penuh berlaku apa adanya.
 *
 * Pemetaannya bukan pilihan estetis. `jambu` sudah memikul "kurang/gagal" di halaman depan
 * (10 box kurang, posisi kurir yang ditolak), jadi ia yang memikul bahaya di sini. `stempel`
 * TIDAK dipakai untuk galat umum: DESIGN.md menyediakannya khusus untuk mencap dan menandai,
 * dan warna yang dipakai untuk segalanya berhenti berarti apa-apa.
 */

export type Nada = "netral" | "utama" | "kabar" | "awas";

type Resep = {
  /** Aturan tebal di atas blok — perangkat pemisah dunia ini, dinaikkan jadi penanda keadaan. */
  garis: string;
  /** Tipe pada ground kertas. */
  teks: string;
  /** Ground penuh, untuk region kecil yang utuh (pil, banner). */
  ground: string;
  /** Tipe di atas ground penuh. */
  atasGround: string;
  /** Tipe sekunder di atas ground penuh — ditarik dari hue ground-nya, tidak pernah abu-abu. */
  kabut: string;
};

export const NADA: Record<Nada, Resep> = {
  /** Bukan keadaan. Blok biasa yang tidak sedang menyatakan apa-apa. */
  netral: {
    garis: "border-tinta",
    teks: "text-tinta",
    ground: "bg-tinta",
    atasGround: "text-kertas-terang",
    kabut: "text-kertas-garis",
  },
  /** Terverifikasi, terpilih, tindakan utama. Ungu adalah label dasar. */
  utama: {
    garis: "border-ungu",
    teks: "text-ungu",
    ground: "bg-ungu",
    atasGround: "text-kertas-terang",
    kabut: "text-kabut-ungu",
  },
  /** Sedang berjalan, informasi, distribusi. Biru adalah label pokok. */
  kabar: {
    garis: "border-biru",
    teks: "text-biru",
    ground: "bg-biru",
    atasGround: "text-kertas-terang",
    kabut: "text-kabut-biru",
  },
  /** Kurang, gagal, klaim, bahaya. Merah jambu adalah label sebar. */
  awas: {
    garis: "border-jambu",
    teks: "text-jambu",
    ground: "bg-jambu",
    atasGround: "text-kertas-terang",
    kabut: "text-kabut-jambu",
  },
};
