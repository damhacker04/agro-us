import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { HarvestPreviewResponse } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AllocationService } from "../assurance/allocation.service";
import { YieldAssessmentService } from "../assurance/yield-assessment.service";
import { TimelineService, type UploadedPhoto } from "./timeline.service";
import type { CreateNodeDto } from "./timeline.dto";

/**
 * Alur panen DUA LANGKAH (sequence 04b, aturan desain v2.3 butir 3).
 *
 *   POST /tenant/batches/:id/harvest          → nilai + pratinjau, TIDAK menulis timeline
 *   POST /tenant/batches/:id/harvest/confirm  → tulis node PANEN + alokasi, satu transaksi
 *
 * Alasan pemecahannya bukan selera bentuk API. Konsekuensi verdict `TIDAK_WAJAR` adalah
 * gugurnya cap tanggungan 10% (FR-7.11) — konsekuensi FINANSIAL. Pada alur satu langkah,
 * urutannya menjadi: angka dikirim, panen tercatat, alokasi jalan, uang bergerak, lalu
 * peringatan muncul. Memberi tahu seseorang bahwa ia baru kehilangan perlindungan
 * finansial atas keputusan yang sudah tidak bisa ditarik tidak dapat dibela di sengketa
 * mana pun.
 *
 * Endpoint node timeline lama sengaja TIDAK diubah: ia tetap jalan sampai jalur ini
 * terverifikasi di produksi.
 */
@Injectable()
export class HarvestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessment: YieldAssessmentService,
    private readonly allocation: AllocationService,
    private readonly timeline: TimelineService,
  ) {}

  /**
   * Langkah 1 — nilai kewajaran lalu susun pratinjau dampak. Tidak menulis node timeline,
   * tidak menyentuh pesanan, tidak memindahkan uang.
   *
   * Yang DITULIS: satu baris `yield_assessments`. Itu disengaja — lihat catatan pada
   * `YieldAssessmentService.nilai()` tentang penyelidikan ambang.
   */
  async declare(tenantId: string, batchId: string, reportedBox: number): Promise<HarvestPreviewResponse> {
    const batch = await this.batchMilikTenant(tenantId, batchId);

    const assessment = await this.assessment.nilai(batchId, reportedBox);

    // Yang masuk ke pesanan adalah porsi yang terjual. Sisanya milik Tenant untuk dijual
    // ke mana pun — itu bukan pelanggaran, dan justru karena itulah pita kewajaran
    // membandingkan angka TOTAL, bukan angka yang dialokasikan.
    const allocatableBox = Math.min(reportedBox, batch.quotaBoxSold);
    const allocation = await this.allocation.preview(batchId, allocatableBox);

    return {
      assessment,
      allocation,
      capWillBeWaived: assessment.verdict === "TIDAK_WAJAR",
      allocatableBox,
    };
  }

  /**
   * Langkah 2 — konfirmasi. Node timeline, alokasi, dan penalti berjalan lewat
   * `TimelineService.appendNode` yang sudah memegang rantai hash, EXIF, dan pagar GPS.
   *
   * Tidak ada logika alokasi yang disalin ke sini: menduplikasinya berarti dua jalur
   * yang harus tetap sepakat soal uang, dan cepat atau lambat keduanya menyimpang.
   */
  async confirm(tenantId: string, batchId: string, dto: CreateNodeDto, photos: UploadedPhoto[]) {
    if (dto.activityType !== "PANEN" && dto.activityType !== "GAGAL_PANEN") {
      throw new BadRequestException({
        code: "ACTIVITY_NOT_HARVEST",
        message: "Endpoint ini hanya untuk menutup siklus: PANEN atau GAGAL_PANEN.",
      });
    }

    await this.batchMilikTenant(tenantId, batchId);
    await this.cocokkanPenilaian(batchId, dto);

    return this.timeline.appendNode(tenantId, batchId, dto, photos);
  }

  /**
   * Konfirmasi harus merujuk penilaian yang benar-benar dibuat untuk ANGKA INI.
   *
   * Tanpa pemeriksaan ini seluruh langkah pertama bisa dilewati: minta pratinjau dengan
   * angka yang aman, lalu kirim konfirmasi dengan angka lain. Layar peringatan TN-19b
   * akan tetap muncul di layar Tenant dan tetap tidak berarti apa-apa.
   */
  private async cocokkanPenilaian(batchId: string, dto: CreateNodeDto) {
    // GAGAL_PANEN berarti nol box. Tidak ada yang perlu dinilai kewajarannya, dan
    // memaksa penilaian di sini hanya menambah langkah pada hari terburuk Tenant.
    if (dto.activityType === "GAGAL_PANEN") return;

    if (!dto.assessmentId) {
      throw new BadRequestException({
        code: "ASSESSMENT_REQUIRED",
        message: "Konfirmasi panen harus melalui pratinjau terlebih dahulu.",
      });
    }

    const nilai = await this.prisma.yieldAssessment.findFirst({
      where: { id: dto.assessmentId, batchId },
      select: { reportedBox: true },
    });
    if (!nilai) {
      throw new NotFoundException({
        code: "ASSESSMENT_NOT_FOUND",
        message: "Pratinjau panen tidak ditemukan untuk batch ini. Ulangi dari langkah sebelumnya.",
      });
    }

    if (nilai.reportedBox !== (dto.fulfilledBox ?? 0)) {
      throw new ConflictException({
        code: "ASSESSMENT_BOX_MISMATCH",
        message:
          `Jumlah box berubah dari ${nilai.reportedBox} menjadi ${dto.fulfilledBox ?? 0} setelah pratinjau. ` +
          "Minta pratinjau ulang supaya Anda melihat dampak angka yang baru sebelum mengonfirmasi.",
      });
    }

    // Tandai penilaian MANA yang menjadi panen (TN-35). Bukan sekadar yang terakhir:
    // Tenant bisa meminta pratinjau beberapa kali lalu mengonfirmasi memakai yang pertama,
    // dan justru pola itulah yang riwayat kewajaran ada untuk perlihatkan.
    await this.prisma.yieldAssessment.update({
      where: { id: dto.assessmentId },
      data: { confirmedAt: new Date() },
    });
  }

  private async batchMilikTenant(tenantId: string, batchId: string) {
    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, product: { tenantId } },
      select: { id: true, quotaBoxSold: true, productionStatus: true },
    });
    if (!batch) throw new NotFoundException("Batch tidak ditemukan");

    if (batch.productionStatus === "HARVESTED" || batch.productionStatus === "FAILED") {
      throw new ConflictException({
        code: "BATCH_CLOSED",
        message: `Batch sudah ${batch.productionStatus === "HARVESTED" ? "dipanen" : "dinyatakan gagal"}.`,
      });
    }
    return batch;
  }
}
