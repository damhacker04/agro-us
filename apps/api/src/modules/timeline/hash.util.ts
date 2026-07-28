import { createHash } from "node:crypto";

/**
 * Rantai hash Verified Timeline (§5.4.1 elemen 5, PRD §6.1).
 *
 *   nodeHash = SHA-256( canonical(isi node) + "|" + prevHash )
 *
 * Mengubah satu baris akan memutus seluruh rantai sesudahnya, sehingga manipulasi
 * langsung lewat SQL pun ketahuan saat verifikasi ulang.
 */

export interface NodeHashInput {
  batchId: string;
  seq: number;
  activityType: string;
  description: string;
  lng: number;
  lat: number;
  deviceTs: Date;
  /** SHA-256 tiap foto bukti, urut sesuai unggahan. Ikut di-hash agar foto tidak bisa ditukar. */
  photoHashes: string[];
  ralatOfId: string | null;
}

/**
 * Representasi kanonik — WAJIB stabil selamanya. Mengubah format ini membatalkan
 * seluruh rantai yang sudah tersimpan, jadi jangan diutak-atik tanpa rencana migrasi.
 * Koordinat dibulatkan 7 desimal (±1 cm) supaya beda presisi float tidak memutus rantai.
 */
export function canonicalize(n: NodeHashInput): string {
  return [
    n.batchId,
    n.seq,
    n.activityType,
    n.description,
    n.lng.toFixed(7),
    n.lat.toFixed(7),
    n.deviceTs.toISOString(),
    n.photoHashes.join(","),
    n.ralatOfId ?? "",
  ].join("|");
}

export function computeNodeHash(input: NodeHashInput, prevHash: string | null): string {
  return createHash("sha256").update(`${canonicalize(input)}|${prevHash ?? "GENESIS"}`).digest("hex");
}

export function sha256(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Root hash batch = digest berantai dari seluruh nodeHash terurut.
 * Inilah yang dipublikasikan harian ke penyimpanan write-once eksternal (§6.1),
 * supaya integritas bisa dibuktikan TANPA mempercayai server AgroUs.
 */
export function computeRootHash(nodeHashes: string[]): string {
  return createHash("sha256").update(nodeHashes.join("")).digest("hex");
}
