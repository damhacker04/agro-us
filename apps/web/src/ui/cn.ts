import { twMerge } from "tailwind-merge";

/**
 * Gabung kelas Tailwind dengan pemenang yang DITENTUKAN, bukan diundi.
 *
 * Menyambung string kelas dengan template literal terlihat bekerja dan tidak. Ketika dua
 * utility mengatur properti yang sama — `text-tinta-samar` dari komponen dan `text-biru`
 * dari pemanggilnya — keduanya sampai ke atribut `class`, dan yang menang bukan yang
 * ditulis belakangan melainkan yang kebetulan dipancarkan belakangan di CSS hasil build.
 *
 * Diukur di halaman contoh sebelum berkas ini ada: `text-ungu` MENANG melawan
 * `text-tinta-samar`, sementara `text-biru`, `text-jambu`, dan `text-kabut-jambu` KALAH
 * melawan yang sama persis. Konstruksi identik, tiga hasil berbeda — dan salah satunya
 * membuat judul banner galat digambar gelap di atas ground jambu, praktis tak terbaca.
 *
 * Itu bukan cacat satu komponen, itu cacat cara kit ini menggabung kelas: ia akan muncul
 * lagi, acak, di tiap tempat sepanjang 57 halaman berikutnya, dan tidak akan pernah muncul
 * di typecheck, build, maupun pemeriksaan kontras — yang terakhir membaca warna yang
 * BENAR-BENAR dipakai, jadi ia melaporkan lulus untuk warna yang salah.
 *
 * `twMerge` menyelesaikannya per grup properti: yang terakhir menang, selalu.
 */
export function cn(...kelas: (string | false | null | undefined)[]): string {
  return twMerge(kelas.filter(Boolean).join(" "));
}
