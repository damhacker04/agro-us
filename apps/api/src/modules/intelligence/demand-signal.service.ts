import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Perekam permintaan yang GAGAL dilayani (FR-8.1).
 *
 * Semua metode di sini SENGAJA tidak pernah melempar error dan tidak pernah ikut
 * transaksi pemanggilnya: pencatatan analitik tidak boleh menggagalkan pencarian
 * katalog atau checkout pembeli. Kehilangan satu sinyal jauh lebih murah daripada
 * kehilangan satu pesanan.
 */
@Injectable()
export class DemandSignalService {
  private readonly log = new Logger(DemandSignalService.name);

  /** Pembeli menyaring komoditas di sebuah zona dan hasilnya nihil. */
  async recordSearchMiss(zoneId: string, commodityId: string | undefined, searchTerm?: string) {
    // Tanpa komoditas, sinyalnya tidak bisa diarahkan ke rekomendasi mana pun.
    if (!commodityId) return;
    await this.safeCreate({ zoneId, commodityId, signalType: "CARI_KOSONG", searchTerm: searchTerm ?? null });
  }

  /** Checkout kalah cepat memperebutkan kuota — permintaan nyata, bukan minat belaka. */
  async recordQuotaRaceLost(zoneId: string, commodityId: string, qtyKg: number, buyerId?: string) {
    if (qtyKg <= 0) return;
    await this.safeCreate({
      zoneId,
      commodityId,
      buyerId: buyerId ?? null,
      signalType: "KUOTA_HABIS",
      qtyKgWanted: qtyKg,
    });
  }

  constructor(private readonly prisma: PrismaService) {}

  private async safeCreate(data: Parameters<PrismaService["demandSignal"]["create"]>[0]["data"]) {
    try {
      await this.prisma.demandSignal.create({ data });
    } catch (e) {
      this.log.warn(`Sinyal permintaan gagal dicatat: ${(e as Error).message}`);
    }
  }
}
