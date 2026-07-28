import "reflect-metadata";
import { ValidationPipe, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
