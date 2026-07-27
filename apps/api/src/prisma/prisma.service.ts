import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * PrismaClient sebagai provider Nest. Koneksi LAZY (tidak $connect saat boot)
 * supaya server tetap bisa nyala tanpa DB — berguna untuk dev FE & health check.
 * Kolom geometry (PostGIS) ditulis via $executeRaw — lihat apps/api/README.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL belum diset — salin apps/api/.env.example ke .env");
    }
    super({ adapter: new PrismaPg({ connectionString: url }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
