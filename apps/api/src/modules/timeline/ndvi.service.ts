import { Injectable, NotFoundException } from "@nestjs/common";
import type { NdviSeries } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Deret NDVI satu batch (BY-03b, TN-15).
 *
 * Data ini sudah dihitung `satellite-worker` dan tersimpan, tetapi sebelumnya tidak ada
 * jalan bagi FE mengambilnya — padahal verifikasi satelit adalah pembeda utama produk
 * ini, dan grafiknya yang membuat klaim itu bisa dinilai sendiri oleh pembeli.
 *
 * PUBLIK, sejalan dengan Verified Timeline (§6.1): pembeli harus bisa memeriksa bukti
 * tanpa mempercayai kata AgroUs, dan tanpa perlu punya akun.
 */
@Injectable()
export class NdviService {
  constructor(private readonly prisma: PrismaService) {}

  async forBatch(batchId: string): Promise<NdviSeries> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: {
        landPlotId: true,
        claimedPlantDate: true,
        claimedHarvestDate: true,
        detectedPlantDate: true,
        detectedHarvestDate: true,
        verificationStatus: true,
      },
    });
    if (!batch) throw new NotFoundException("Batch tidak ditemukan");

    const rows = await this.prisma.satelliteObservation.findMany({
      where: { landPlotId: batch.landPlotId },
      orderBy: { sceneDate: "asc" },
      select: { sceneDate: true, ndviMean: true, ndmiMean: true, cloudPct: true, usable: true },
    });

    return {
      batchId,
      verificationStatus: batch.verificationStatus,
      claimedPlantDate: batch.claimedPlantDate?.toISOString().slice(0, 10) ?? null,
      claimedHarvestDate: batch.claimedHarvestDate.toISOString().slice(0, 10),
      detectedPlantDate: batch.detectedPlantDate?.toISOString().slice(0, 10) ?? null,
      detectedHarvestDate: batch.detectedHarvestDate?.toISOString().slice(0, 10) ?? null,
      // Pengamatan yang TERTUTUP AWAN tetap dikirim, tidak disaring diam-diam.
      // Grafik yang menyembunyikannya akan terlihat mulus dan lengkap padahal
      // sebenarnya berlubang — pembeli berhak melihat di mana datanya memang tidak ada.
      points: rows.map((r) => ({
        date: r.sceneDate.toISOString().slice(0, 10),
        ndvi: r.ndviMean === null ? null : Number(r.ndviMean),
        ndmi: r.ndmiMean === null ? null : Number(r.ndmiMean),
        cloudPct: Number(r.cloudPct),
        usable: r.usable,
      })),
    };
  }
}
