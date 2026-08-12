import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { AllocationService } from "../assurance/allocation.service";
import { PodService } from "../logistics/pod.service";
import { PaymentService } from "../order/payment.service";
import { SettlementService } from "../quality/settlement.service";
import { AnchorService } from "../timeline/anchor.service";

/**
 * Penjadwal pekerjaan berkala.
 *
 * Sebelum ini seluruh job hanya punya endpoint dan tidak pernah dipanggil siapa pun.
 * Akibatnya sistem MACET DI TENGAH: pengiriman berhenti selamanya di "Diterima" karena
 * jendela klaim tidak pernah ditutup, dan escrow Tenant tidak pernah cair. Endpoint-nya
 * tetap dipertahankan supaya operator bisa memicu manual saat peragaan atau pemulihan.
 *
 * ⚠️ SATU INSTANS SAJA. Bila API dijalankan lebih dari satu proses/replika, setiap
 * replika akan menjalankan jadwal yang sama. Job-job di sini sudah dibuat idempoten
 * (masing-masing mengklaim barisnya lebih dulu secara atomik), tetapi pekerjaan
 * gandanya tetap pemborosan. Sebelum menskalakan mendatar: matikan lewat
 * `CRON_ENABLED=false` di replika selain satu, atau pindahkan ke penjadwal terpisah.
 */
@Injectable()
export class JobsService {
  private readonly log = new Logger(JobsService.name);
  private readonly aktif: boolean;

  /** Penjaga tumpang-tindih: job yang belum selesai tidak dijalankan ulang. */
  private readonly berjalan = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pod: PodService,
    private readonly settlement: SettlementService,
    private readonly payments: PaymentService,
    private readonly anchors: AnchorService,
    private readonly allocation: AllocationService,
  ) {
    this.aktif = (process.env["CRON_ENABLED"] ?? "true").toLowerCase() !== "false";
    this.log.log(this.aktif ? "Penjadwal job AKTIF" : "Penjadwal job DIMATIKAN (CRON_ENABLED=false)");
  }

  /**
   * Pembungkus setiap job: mematikan lewat env, mencegah tumpang-tindih, dan menelan
   * error. Job yang melempar error tanpa ditangkap akan menghentikan seluruh penjadwal
   * di sebagian runtime — satu kegagalan sesaat tidak boleh mematikan job yang lain.
   */
  private async jalankan(nama: string, fn: () => Promise<unknown>) {
    if (!this.aktif) return;
    if (this.berjalan.has(nama)) {
      this.log.warn(`Job ${nama} dilewati — eksekusi sebelumnya belum selesai.`);
      return;
    }
    this.berjalan.add(nama);
    const mulai = Date.now();
    try {
      const hasil = await fn();
      const ms = Date.now() - mulai;
      // Hanya dicatat bila ADA yang dikerjakan; kalau tidak, log dipenuhi baris
      // "0 diproses" tiap beberapa menit dan justru menyembunyikan kejadian nyata.
      if (hasil && Object.values(hasil as Record<string, unknown>).some((v) => typeof v === "number" && v > 0)) {
        this.log.log(`Job ${nama} (${ms} ms): ${JSON.stringify(hasil)}`);
      }
    } catch (e) {
      this.log.error(`Job ${nama} gagal: ${(e as Error).message}`);
    } finally {
      this.berjalan.delete(nama);
    }
  }

  /**
   * Fallback §5.6.4 — pembeli tak merespons 60 menit setelah kurir tiba.
   * Tiap 5 menit: cukup rapat supaya keterlambatannya tak terasa, cukup jarang supaya
   * tidak memindai tabel pengiriman terus-menerus.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  autoTerima() {
    return this.jalankan("auto-terima", () => this.pod.autoAcceptStale());
  }

  /**
   * FR-7.2 — jendela klaim berakhir → pengiriman Selesai → escrow dicairkan.
   * Inilah job yang ketiadaannya paling terasa: tanpa ini tidak ada satu pun pesanan
   * yang pernah mencapai status Selesai.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  cairkanEscrow() {
    return this.jalankan("cairkan-escrow", () => this.settlement.settleExpiredClaimWindows());
  }

  /**
   * Lepas kuota yang dikunci tagihan kedaluwarsa. Sebelumnya hanya berjalan "menumpang"
   * saat ada pembeli lain checkout — kuota bisa tertahan berhari-hari kalau zona itu
   * sedang sepi, padahal justru saat sepi kuota paling perlu dilepas.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  lepasTagihanKedaluwarsa() {
    return this.jalankan("lepas-tagihan-kedaluwarsa", () => this.payments.expireStale());
  }

  /** §6.1 — root hash harian tiap batch. Dini hari, saat lalu lintas paling sepi. */
  @Cron("0 15 1 * * *")
  jangkarHashHarian() {
    return this.jalankan("jangkar-hash", () => this.anchors.anchorAll());
  }

  /**
   * FR-7.12 — hitung ulang penalti kuota seluruh Tenant.
   *
   * Perhitungannya sendiri sudah berjalan tiap kali panen ditutup, tetapi PEMULIHANNYA
   * tidak: `quota_multiplier` hanya naik kembali kalau fungsinya dipanggil lagi, dan itu
   * baru terjadi saat Tenant punya panen berikutnya. Tenant yang sedang kena penalti
   * justru paling sedikit panennya, jadi tanpa job ini ia bisa terkunci di 0,50 lebih
   * lama daripada yang ditetapkan kebijakan.
   */
  @Cron("0 30 2 * * *")
  hitungUlangPenaltiKuota() {
    return this.jalankan("penalti-kuota", async () => {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      let berubah = 0;
      for (const t of tenants) {
        const sebelum = await this.prisma.tenant.findUniqueOrThrow({
          where: { id: t.id },
          select: { quotaMultiplier: true },
        });
        await this.allocation.applyShortfallPenalty(t.id);
        const sesudah = await this.prisma.tenant.findUniqueOrThrow({
          where: { id: t.id },
          select: { quotaMultiplier: true },
        });
        if (!sebelum.quotaMultiplier.equals(sesudah.quotaMultiplier)) berubah += 1;
      }
      return { tenantDitinjau: tenants.length, multiplierBerubah: berubah };
    });
  }
}
