import "reflect-metadata";
import { join } from "node:path";
import { ValidationPipe, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Foto bukti (timeline, PoD, klaim) disimpan LocalDiskStorageService ke `uploads/`
  // dan URL-nya dibagikan lewat API — tetapi tanpa baris ini tidak ada yang MELAYANI
  // URL tersebut, sehingga seluruh foto bukti tampil rusak di FE.
  //
  // Nama berkas = digest SHA-256 isinya, jadi tidak bisa ditebak. Timeline memang
  // publik by design (§6.1: pembeli harus bisa memverifikasi tanpa mempercayai AgroUs).
  // ⚠️ Foto PoD & klaim ikut terlayani di sini; sebelum produksi tinjau apakah keduanya
  // boleh publik-lewat-URL, atau perlu jalur bertoken sendiri.
  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads",
    setHeaders: (res) => {
      // Isi folder ini berasal dari unggahan pengguna. `nosniff` menahan peramban
      // menebak-nebak tipe isinya, dan CSP sandbox memastikan berkas yang entah
      // bagaimana lolos sebagai HTML tetap tidak bisa menjalankan skrip atau
      // membaca origin API. Ekstensi sendiri sudah dibatasi di StorageService.
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Content-Disposition", "inline");
    },
  });

  // DTO divalidasi global; field di luar DTO dibuang (whitelist).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // FE dev (Next.js) di :3000. Produksi: ganti dengan origin FE asli via env.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  Logger.log(`API listen di http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
