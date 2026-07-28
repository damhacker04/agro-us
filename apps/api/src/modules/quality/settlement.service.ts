import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Penyelesaian akhir: jendela klaim berakhir → Selesai → escrow dicairkan (FR-7.2, activity G3→G9).
 *
 * Jumlah yang dicairkan = HOLD dikurangi seluruh potongan klaim, dihitung PER TENANT
 * karena satu order lintas-Tenant punya beberapa penerima pencairan.
 *
 * ⚠️ Yang dicatat di sini baru PEMBUKUAN. Instruksi pencairan sesungguhnya ke mitra
 * payment gateway berizin belum disambungkan (FR-7.1, kepatuhan §5.7.1) — dana tidak
 * boleh mampir ke rekening operasional AgroUs.
 */
@Injectable()
export class SettlementService {
  private readonly log = new Logger(SettlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tutup jendela klaim yang sudah lewat, lalu cairkan sisanya.
   * Idempoten: pengiriman yang sudah SELESAI tidak diproses ulang.
   */
  async settleExpiredClaimWindows() {
    const due = await this.prisma.shipment.findMany({
      where: { status: "DITERIMA", claimWindowEndsAt: { lt: new Date() } },
      select: { id: true, orderId: true },
    });

    let released = 0;
    let totalAmount = 0;

    for (const s of due) {
      // Klaim yang masih menunggu operator MENAHAN pencairan — mencairkan lebih dulu
      // berarti uangnya sudah pindah ke Tenant sebelum sengketa diputus.
      const pending = await this.prisma.claim.count({
        where: { shipmentId: s.id, finalStatus: "MENUNGGU_OPERATOR" },
      });
      if (pending > 0) {
        this.log.log(`Pengiriman ${s.id.slice(0, 8)} ditahan — ${pending} klaim menunggu operator`);
        continue;
      }

      const amount = await this.releaseForShipment(s.id, s.orderId);
      if (amount > 0) {
        released++;
        totalAmount += amount;
      }
    }

    if (released) {
      this.log.log(`${released} pengiriman dicairkan, total Rp${totalAmount.toLocaleString("id-ID")}`);
    }
    return { settled: released, totalAmount, heldByPendingClaims: due.length - released };
  }

  /** Cairkan sisa escrow satu pengiriman lalu tandai Selesai. */
  private async releaseForShipment(shipmentId: string, orderId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ tenant_id: string; sisa: bigint }>>`
      SELECT tenant_id::text,
             SUM(CASE WHEN entry_type = 'HOLD' THEN amount
                      WHEN entry_type IN ('POTONG_KLAIM','RELEASE30','RELEASE','REFUND') THEN -amount
                      ELSE 0 END)::bigint AS sisa
      FROM escrow_ledger
      WHERE shipment_id = ${shipmentId}::uuid
      GROUP BY tenant_id
      HAVING SUM(CASE WHEN entry_type = 'HOLD' THEN amount
                      WHEN entry_type IN ('POTONG_KLAIM','RELEASE30','RELEASE','REFUND') THEN -amount
                      ELSE 0 END) > 0
    `;

    let total = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const r of rows) {
        const amount = Number(r.sisa);
        await tx.escrowLedgerEntry.create({
          data: {
            orderId,
            shipmentId,
            tenantId: r.tenant_id,
            entryType: "RELEASE",
            amount,
            gatewayRef: `settle:${shipmentId}`,
          },
        });
        total += amount;
      }
      await tx.shipment.updateMany({
        where: { id: shipmentId, status: "DITERIMA" },
        data: { status: "SELESAI", completedAt: new Date() },
      });
    });
    return total;
  }

  /** Ringkasan escrow untuk dashboard Tenant (FR-3.5). */
  async tenantBalance(tenantId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ entry_type: string; total: bigint }>>`
      SELECT entry_type::text, SUM(amount)::bigint AS total
      FROM escrow_ledger WHERE tenant_id = ${tenantId}::uuid
      GROUP BY entry_type
    `;
    const by = Object.fromEntries(rows.map((r) => [r.entry_type, Number(r.total)]));
    const hold = by.HOLD ?? 0;
    // HOLD adalah SATU-SATUNYA arus masuk; sisanya apa pun jenisnya adalah uang yang
    // sudah keluar dari escrow Tenant. Dihitung sebagai "selain HOLD" dan bukan
    // daftar putih, karena daftar putih inilah yang bikin BIAYA_BATAL10 dan
    // ALIH_SUBSTITUSI sempat terhitung sebagai dana yang masih dipegang Tenant.
    const keluar = Object.entries(by).reduce((s, [k, v]) => (k === "HOLD" ? s : s + v), 0);
    return {
      tertahan: hold - keluar,
      totalDitahan: hold,
      totalDicairkan: (by.RELEASE ?? 0) + (by.RELEASE30 ?? 0),
      totalPotonganKlaim: by.POTONG_KLAIM ?? 0,
      totalRefund: by.REFUND ?? 0,
      totalBiayaBatal: by.BIAYA_BATAL10 ?? 0,
      totalAlihSubstitusi: by.ALIH_SUBSTITUSI ?? 0,
      rincian: by,
    };
  }
}
