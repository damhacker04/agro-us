import React from "react";
import type { LegalityStatus } from "@agro-os/shared";
import { Pil, type Nada } from "@/ui";

/**
 * Status legalitas Tenant di meja operator.
 *
 * Sebelumnya pil-nya mencetak `{t.legalityStatus}` apa adanya, jadi layar konsol memuat
 * "PENDING" dan "REJECTED" — nama kolom basis data, bukan label. Cacat yang sama dengan
 * buku besar escrow dan jenis kegiatan timeline, dan ketiganya lahir dari kebiasaan yang
 * sama: nilai enum diperlakukan seolah sudah berupa kalimat.
 *
 * Kata-katanya sengaja BERBEDA dari yang dibaca Tenant di layar onboarding. Operator
 * membaca antrean kerja — yang berguna baginya adalah apa yang harus ia lakukan; Tenant
 * membaca nasib pendaftarannya sendiri, dan yang berguna baginya adalah apa artinya bagi
 * dia. Satu keadaan, dua sudut pandang, dan menyamakan kalimatnya justru merugikan salah
 * satunya.
 */
export const STATUS_LEGALITAS: Record<LegalityStatus, { label: string; nada: Nada }> = {
  PENDING: { label: "Menunggu tinjauan", nada: "kabar" },
  APPROVED: { label: "Disetujui", nada: "utama" },
  REJECTED: { label: "Ditolak", nada: "awas" },
};

export function PilLegalitas({
  status,
  className,
}: {
  status: LegalityStatus;
  className?: string;
}) {
  const s = STATUS_LEGALITAS[status];
  return (
    <Pil nada={s.nada} garis={s.nada !== "awas"} className={className}>
      {s.label}
    </Pil>
  );
}
