import { Injectable, Logger } from "@nestjs/common";
import { CLAIM_WINDOW_FALLBACK_MS, CLAIM_WINDOW_MS } from "@agro-os/shared";

const MENIT = 60_000;

/**
 * Panjang jendela klaim mutu (FR-5.3, §5.6.4).
 *
 * Nilai bakunya 2 jam (konfirmasi pembeli) dan 24 jam (fallback auto-terima) — diambil
 * dari `packages/shared` supaya FE dan BE menyebut angka yang sama.
 *
 * KENAPA BISA DIATUR: dalam peragaan, alur "Diterima → jendela klaim habis → Selesai →
 * escrow cair" tidak mungkin ditunjukkan kalau harus menunggu dua jam. Padahal pencairan
 * escrow itu justru inti ceritanya.
 *
 * KENAPA DIKUNCI DI PRODUKSI: memendekkan jendela berarti MENGURANGI waktu pembeli
 * memeriksa barang dan mengajukan klaim — merugikan pihak yang sudah membayar di muka.
 * Karena itu override sengaja diabaikan saat `NODE_ENV=production`, bukan sekadar
 * "jangan diisi ya".
 */
@Injectable()
export class ClaimWindowService {
  private readonly log = new Logger(ClaimWindowService.name);
  readonly normalMs: number;
  readonly fallbackMs: number;

  constructor() {
    this.normalMs = this.resolve("CLAIM_WINDOW_MINUTES", CLAIM_WINDOW_MS, "konfirmasi pembeli");
    this.fallbackMs = this.resolve("CLAIM_WINDOW_FALLBACK_MINUTES", CLAIM_WINDOW_FALLBACK_MS, "auto-terima");
  }

  /** "2 jam" / "3 menit" — dipakai di pesan log & respons supaya angkanya tidak pernah bohong. */
  static humanize(ms: number): string {
    const menit = Math.round(ms / MENIT);
    if (menit < 60) return `${menit} menit`;
    const jam = menit / 60;
    return Number.isInteger(jam) ? `${jam} jam` : `${jam.toFixed(1)} jam`;
  }

  get normalLabel() {
    return ClaimWindowService.humanize(this.normalMs);
  }

  private resolve(envKey: string, bakuMs: number, untuk: string): number {
    const raw = process.env[envKey];
    if (!raw) return bakuMs;

    if (process.env["NODE_ENV"] === "production") {
      this.log.error(
        `${envKey} DIABAIKAN di production. Memendekkan jendela klaim mengurangi waktu ` +
          `pembeli memeriksa barang. Memakai nilai baku ${ClaimWindowService.humanize(bakuMs)}.`,
      );
      return bakuMs;
    }

    const menit = Number(raw);
    if (!Number.isFinite(menit) || menit <= 0) {
      this.log.error(`${envKey}="${raw}" bukan angka menit yang sah — memakai nilai baku.`);
      return bakuMs;
    }

    const ms = menit * MENIT;
    this.log.warn(
      `Jendela klaim ${untuk} dipendekkan jadi ${ClaimWindowService.humanize(ms)} ` +
        `(baku ${ClaimWindowService.humanize(bakuMs)}) lewat ${envKey}. HANYA untuk demo/uji.`,
    );
    return ms;
  }
}
