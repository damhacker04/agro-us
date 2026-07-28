import { Module } from "@nestjs/common";
import { TenantModule } from "../tenant/tenant.module";
import { AssuranceModule } from "../assurance/assurance.module";
import { LocalDiskStorageService, StorageService } from "../storage/storage.service";
import {
  AnchorController,
  PublicTimelineController,
  TenantTimelineController,
} from "./timeline.controller";
import { TimelineService } from "./timeline.service";
import { AnchorService } from "./anchor.service";

@Module({
  imports: [TenantModule, AssuranceModule],
  controllers: [TenantTimelineController, PublicTimelineController, AnchorController],
  providers: [
    TimelineService,
    AnchorService,
    // ⚠️ Ganti ke implementasi object storage (S3/R2/GCS) sebelum produksi —
    // disk container bersifat ephemeral, lihat storage.service.ts.
    { provide: StorageService, useClass: LocalDiskStorageService },
  ],
  exports: [TimelineService],
})
export class TimelineModule {}
