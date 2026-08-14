import React from "react";

/**
 * Kepala bagian — judul dan pengantar dengan ritme jarak yang satu untuk seluruh halaman.
 *
 * Dipisah jadi komponen bukan demi menghemat baris, melainkan supaya jarak di atas judul
 * selalu lebih besar daripada jarak di bawahnya, di setiap bagian, tanpa perlu diingat
 * ulang tiap kali. Ritme yang dijaga per-tempat selalu melenceng pada bagian ketujuh.
 */

type Nada = "kertas" | "warna";

export function KepalaBagian({
  judul,
  children,
  nada = "kertas",
  lebarJudul = "max-w-[18ch]",
}: {
  judul: React.ReactNode;
  children?: React.ReactNode;
  nada?: Nada;
  lebarJudul?: string;
}) {
  return (
    <header>
      <h2
        className={`${lebarJudul} text-balance text-[clamp(1.9rem,4.2vw,3.1rem)] font-extrabold leading-[1] tracking-[-0.032em]`}
        style={{ fontStretch: "108%" }}
      >
        {judul}
      </h2>
      {children ? (
        <p
          className={`mt-6 max-w-[68ch] text-[17px] leading-relaxed ${
            nada === "kertas" ? "text-tinta-lembut" : "text-kabut-biru"
          }`}
        >
          {children}
        </p>
      ) : null}
    </header>
  );
}

/**
 * Baris aturan: nilai terukur di kiri, penjelasannya di kanan.
 *
 * Sengaja BUKAN kartu ikon-judul-teks. Isinya adalah angka aturan yang berlaku di server,
 * dan angka berhak berdiri sebagai angka — bukan diperkecil jadi hiasan di pojok kotak.
 */
export function BarisAturan({
  nilai,
  satuan,
  label,
  children,
  warnaNilai = "text-tinta",
  warnaGaris = "border-kertas-garis",
  warnaTeks = "text-tinta-lembut",
}: {
  nilai: string;
  satuan?: string;
  label: string;
  children: React.ReactNode;
  warnaNilai?: string;
  warnaGaris?: string;
  warnaTeks?: string;
}) {
  return (
    <div className={`grid gap-x-8 gap-y-2 border-t ${warnaGaris} py-6 md:grid-cols-[13rem_minmax(0,1fr)]`}>
      <div>
        <div className={`font-mono text-[26px] leading-none ${warnaNilai}`}>
          {nilai}
          {satuan ? <span className="ml-1 text-[15px]">{satuan}</span> : null}
        </div>
        <div className={`mt-2 text-[11px] font-semibold uppercase tracking-cap ${warnaTeks}`}>{label}</div>
      </div>
      <p className={`max-w-[58ch] text-[15px] leading-relaxed ${warnaTeks}`}>{children}</p>
    </div>
  );
}
