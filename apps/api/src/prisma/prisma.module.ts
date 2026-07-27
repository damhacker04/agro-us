import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global() // sekali import di AppModule, tersedia di semua modul
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
