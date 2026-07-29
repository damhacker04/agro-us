import { Injectable } from "@nestjs/common";
import {
  DEMAND_HORIZON_WEEKS_MAX,
  DEMAND_HORIZON_WEEKS_MIN,
  DEMAND_LOOKBACK_WEEKS,
  SATURATION_OVER_PCT,
  SATURATION_UNDER_PCT,
  type DemandAggregate,
  type DemandConfidence,
  type SaturationLevel,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

/** Senin 00:00 dari minggu yang memuat `d`, dalam UTC. */
export function startOfWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Senin = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

interface HistoryRow {
  zone_id: string;
  commodity_id: string;
  week: Date;
  kg: number;
}
interface SupplyRow {
  zone_id: string;
  commodity_id: string;
  week: Date;
  quota_kg: number;
  booked_kg: number;
  tenants: number;
  price_per_kg: number | null;
}
interface SignalRow {
  zone_id: string;
  commodity_id: string;
  miss_count: number;
  unserved_kg: number;
}

/**
 * Agregasi permintaan per zona × komoditas × minggu panen (FR-8.1).
 *
 * PERINGATAN INTERPRETASI: `projectedKg` adalah PROYEKSI, bukan pesanan yang sudah
 * ada. Dasarnya laju pesanan lunas beberapa minggu terakhir, diproyeksikan datar ke
 * depan — musiman, hari raya, dan cuaca TIDAK dimodelkan. Karena Tenant mengeluarkan
 * uang sungguhan untuk menanam, setiap baris wajib membawa `confidence` dan
 * `weeksObserved` supaya angka bersandar dua minggu data tidak terlihat sama
 * meyakinkannya dengan delapan minggu.
 */
@Injectable()
export class DemandService {
  constructor(private readonly prisma: PrismaService) {}

  /** Zona yang dilayani sebuah Tenant — batas cakupan setiap query intelijen. */
  async zoneIdsOf(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.tenantZone.findMany({ where: { tenantId }, select: { zoneId: true } });
    return rows.map((r) => r.zoneId);
  }

  /**
   * Baris agregat untuk zona-zona tertentu, minggu panen +8 s.d. +16.
   *
   * Sengaja membangun kisi (zona × komoditas × minggu) dari komoditas yang PERNAH
   * diminati di zona itu — bukan dari batch yang sudah ada. Kalau kisinya diturunkan
   * dari batch, minggu yang belum ada satu pun Tenant membuka kuota tidak akan pernah
   * muncul; padahal itu justru kasus yang paling perlu direkomendasikan (FR-8.2).
   */
  async aggregate(zoneIds: string[], now = new Date()): Promise<DemandAggregate[]> {
    if (!zoneIds.length) return [];

    const thisWeek = startOfWeek(now);
    const firstWeek = addDays(thisWeek, DEMAND_HORIZON_WEEKS_MIN * 7);
    const lastWeek = addDays(thisWeek, DEMAND_HORIZON_WEEKS_MAX * 7);
    const lookbackFrom = addDays(thisWeek, -DEMAND_LOOKBACK_WEEKS * 7);

    const [history, supply, signals, zones, commodities, fallbackPrices] = await Promise.all([
      this.loadHistory(zoneIds, lookbackFrom, thisWeek),
      this.loadSupply(zoneIds, firstWeek, addDays(lastWeek, 7)),
      this.loadSignals(zoneIds, lookbackFrom),
      this.prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true } }),
      this.prisma.commodity.findMany({ select: { id: true, name: true } }),
      this.loadFallbackPrices(zoneIds),
    ]);

    const zoneName = new Map(zones.map((z) => [z.id, z.name]));
    const commodityName = new Map(commodities.map((c) => [c.id, c.name]));

    // Laju mingguan per (zona, komoditas): rata-rata DIBAGI jumlah minggu dalam
    // jendela lookback, bukan dibagi jumlah minggu yang ada transaksinya. Kalau
    // dibagi minggu-yang-ada-saja, satu pesanan besar sekali seumur hidup akan
    // terbaca sebagai permintaan mingguan yang tetap.
    const rate = new Map<string, { totalKg: number; weeks: Set<string> }>();
    for (const h of history) {
      const k = `${h.zone_id}|${h.commodity_id}`;
      const cur = rate.get(k) ?? { totalKg: 0, weeks: new Set<string>() };
      cur.totalKg += Number(h.kg);
      cur.weeks.add(iso(h.week));
      rate.set(k, cur);
    }

    const signalByPair = new Map(signals.map((s) => [`${s.zone_id}|${s.commodity_id}`, s]));
    const priceByPair = new Map(fallbackPrices.map((p) => [`${p.zone_id}|${p.commodity_id}`, p.price_per_kg]));
    const supplyByCell = new Map(supply.map((s) => [`${s.zone_id}|${s.commodity_id}|${iso(s.week)}`, s]));

    // Kisi: setiap pasangan (zona, komoditas) yang punya jejak permintaan — dari
    // riwayat pesanan ATAU dari sinyal permintaan gagal — dikalikan setiap minggu
    // dalam horizon. Pasangan yang hanya punya pasokan ikut masuk supaya kelebihan
    // pasokan tetap terlihat sebagai JENUH.
    const pairs = new Set<string>([
      ...rate.keys(),
      ...signalByPair.keys(),
      ...supply.map((s) => `${s.zone_id}|${s.commodity_id}`),
    ]);

    const out: DemandAggregate[] = [];
    for (const pair of pairs) {
      const [zoneId, commodityId] = pair.split("|") as [string, string];
      if (!zoneName.has(zoneId) || !commodityName.has(commodityId)) continue;

      const r = rate.get(pair);
      const weeksObserved = r?.weeks.size ?? 0;
      const baselineWeeklyKg = r ? r.totalKg / DEMAND_LOOKBACK_WEEKS : 0;

      const sig = signalByPair.get(pair);
      // Sinyal dibagi rata ke seluruh jendela lookback supaya lonjakan sesaat tidak
      // dibaca sebagai permintaan mingguan permanen.
      const unservedWeeklyKg = sig ? Number(sig.unserved_kg) / DEMAND_LOOKBACK_WEEKS : 0;

      for (let w = 0; w <= DEMAND_HORIZON_WEEKS_MAX - DEMAND_HORIZON_WEEKS_MIN; w++) {
        const weekStart = addDays(firstWeek, w * 7);
        const cell = supplyByCell.get(`${zoneId}|${commodityId}|${iso(weekStart)}`);
        const openQuotaKg = cell ? Number(cell.quota_kg) : 0;

        const projectedKg = Math.round(baselineWeeklyKg + unservedWeeklyKg);
        const gapKg = Math.max(projectedKg - openQuotaKg, 0);
        const coveragePct =
          projectedKg > 0 ? Math.round((openQuotaKg / projectedKg) * 1000) / 10 : null;

        out.push({
          zoneId,
          zoneName: zoneName.get(zoneId)!,
          commodityId,
          commodityName: commodityName.get(commodityId)!,
          harvestWeekStart: iso(weekStart),
          harvestWeekEnd: iso(addDays(weekStart, 6)),
          projectedKg,
          baselineKg: Math.round(baselineWeeklyKg),
          unservedKg: Math.round(unservedWeeklyKg),
          searchMissCount: sig ? Number(sig.miss_count) : 0,
          openQuotaKg: Math.round(openQuotaKg),
          bookedKg: Math.round(cell ? Number(cell.booked_kg) : 0),
          gapKg,
          coveragePct,
          saturation: this.saturationOf(projectedKg, coveragePct),
          confidence: this.confidenceOf(weeksObserved),
          weeksObserved,
          tenantsPlanting: cell ? Number(cell.tenants) : 0,
          estPricePerKg: this.priceOf(cell?.price_per_kg, priceByPair.get(pair)),
        });
      }
    }

    return out.sort((a, b) => b.gapKg - a.gapKg || a.harvestWeekStart.localeCompare(b.harvestWeekStart));
  }

  /**
   * TANPA_DATA sengaja dibedakan dari SEIMBANG. Permintaan yang belum terukur BUKAN
   * permintaan yang sudah tertutup — matview v1 menyamakan keduanya (saturation 100%)
   * dan akibatnya justru menyembunyikan peluang yang belum pernah dilayani.
   */
  private saturationOf(projectedKg: number, coveragePct: number | null): SaturationLevel {
    if (projectedKg <= 0 || coveragePct === null) return "TANPA_DATA";
    if (coveragePct < SATURATION_UNDER_PCT) return "KURANG";
    if (coveragePct > SATURATION_OVER_PCT) return "JENUH";
    return "SEIMBANG";
  }

  /**
   * Harga acuan minggu itu kalau ada; kalau tidak, harga komoditas yang sama di zona
   * yang sama dari batch mana pun yang masih baru.
   *
   * Cadangan ini justru yang paling sering terpakai: pada minggu yang BELUM ada Tenant
   * membuka kuota — kasus yang paling perlu direkomendasikan — minggu itu memang tidak
   * punya harga acuan sama sekali, dan tanpa cadangan kalimat rekomendasinya kehilangan
   * angka harga yang diminta FR-8.2.
   */
  private priceOf(weekly: number | null | undefined, fallback: number | null | undefined) {
    const v = weekly ?? fallback;
    return v != null ? Math.round(Number(v)) : null;
  }

  private confidenceOf(weeksObserved: number): DemandConfidence {
    if (weeksObserved === 0) return "TANPA_DATA";
    if (weeksObserved >= DEMAND_LOOKBACK_WEEKS) return "TINGGI";
    if (weeksObserved >= 3) return "SEDANG";
    return "RENDAH";
  }

  /** Konsumsi nyata per minggu panen, dari pesanan LUNAS. */
  private loadHistory(zoneIds: string[], from: Date, until: Date) {
    return this.prisma.$queryRaw<HistoryRow[]>`
      SELECT s.zone_id::text,
             p.commodity_id::text,
             date_trunc('week', b.claimed_harvest_date)::date AS week,
             SUM(oi.qty_box * p.qty_kg_per_box)::float8 AS kg
      FROM order_items oi
      JOIN shipments s ON s.id = oi.shipment_id
      JOIN batches   b ON b.id = oi.batch_id
      JOIN products  p ON p.id = b.product_id
      JOIN orders    o ON o.id = oi.order_id
      -- Hanya pesanan yang benar-benar dibayar. Order DRAFT belum permintaan;
      -- CLOSED sudah batal/kedaluwarsa dan tidak boleh menaikkan proyeksi.
      WHERE o.order_status = 'PAID'
        AND s.zone_id = ANY(${zoneIds}::uuid[])
        AND b.claimed_harvest_date >= ${from}
        AND b.claimed_harvest_date <  ${until}
      GROUP BY 1, 2, 3
    `;
  }

  /**
   * Pasokan yang AKAN diproduksi minggu itu — memakai quota_box_total, bukan sisa
   * yang belum terjual. Untuk menakar kejenuhan yang penting adalah berapa banyak
   * barang akan muncul di pasar, bukan berapa yang masih bisa dipesan.
   */
  private loadSupply(zoneIds: string[], from: Date, until: Date) {
    return this.prisma.$queryRaw<SupplyRow[]>`
      SELECT tz.zone_id::text,
             p.commodity_id::text,
             date_trunc('week', b.claimed_harvest_date)::date AS week,
             SUM(b.quota_box_total * p.qty_kg_per_box)::float8 AS quota_kg,
             -- Porsi yang sudah dipesan & dibayar. Menyerap cepat = permintaannya nyata;
             -- kuota menganggur = proyeksi permintaan patut dicurigai kebesaran.
             SUM(b.quota_box_sold  * p.qty_kg_per_box)::float8 AS booked_kg,
             COUNT(DISTINCT p.tenant_id)::int AS tenants,
             -- Harga per KG, bukan per box: box antar Tenant beda isinya sehingga
             -- rata-rata harga box tidak bisa dibandingkan.
             (percentile_cont(0.5) WITHIN GROUP (
                ORDER BY b.locked_price / NULLIF(p.qty_kg_per_box, 0)
              ))::float8 AS price_per_kg
      FROM batches b
      JOIN products p       ON p.id = b.product_id
      JOIN tenant_zones tz  ON tz.tenant_id = p.tenant_id
      WHERE b.production_status IN ('PLANNING', 'GROWING')
        AND tz.zone_id = ANY(${zoneIds}::uuid[])
        AND b.claimed_harvest_date >= ${from}
        AND b.claimed_harvest_date <  ${until}
      GROUP BY 1, 2, 3
    `;
  }

  /** Harga per kg terkini per (zona, komoditas), lepas dari minggu panen. */
  private loadFallbackPrices(zoneIds: string[]) {
    return this.prisma.$queryRaw<Array<{ zone_id: string; commodity_id: string; price_per_kg: number | null }>>`
      SELECT tz.zone_id::text,
             p.commodity_id::text,
             (percentile_cont(0.5) WITHIN GROUP (
                ORDER BY b.locked_price / NULLIF(p.qty_kg_per_box, 0)
              ))::float8 AS price_per_kg
      FROM batches b
      JOIN products p      ON p.id = b.product_id
      JOIN tenant_zones tz ON tz.tenant_id = p.tenant_id
      WHERE tz.zone_id = ANY(${zoneIds}::uuid[])
        AND b.claimed_harvest_date >= CURRENT_DATE - INTERVAL '180 days'
      GROUP BY 1, 2
    `;
  }

  /** Permintaan yang gagal dilayani — pencarian nihil & checkout kalah kuota. */
  private loadSignals(zoneIds: string[], from: Date) {
    return this.prisma.$queryRaw<SignalRow[]>`
      SELECT zone_id::text,
             commodity_id::text,
             COUNT(*) FILTER (WHERE signal_type = 'CARI_KOSONG')::int AS miss_count,
             COALESCE(SUM(qty_kg_wanted) FILTER (WHERE signal_type = 'KUOTA_HABIS'), 0)::float8 AS unserved_kg
      FROM demand_signals
      WHERE zone_id = ANY(${zoneIds}::uuid[])
        AND commodity_id IS NOT NULL
        AND created_at >= ${from}
      GROUP BY 1, 2
    `;
  }
}
