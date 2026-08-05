import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
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
import { NdviService } from "./ndvi.service";

@Module({
  imports: [TenantModule, AssuranceModule, NotificationModule],
  controllers: [TenantTimelineController, PublicTimelineController, AnchorController],
  providers: [
    TimelineService,
    AnchorService,
    NdviService,
    // ⚠️ Ganti ke implementasi object storage (S3/R2/GCS) sebelum produksi —
    // disk container bersifat ephemeral, lihat storage.service.ts.
    { provide: StorageService, useClass: LocalDiskStorageService },
  ],
  exports: [TimelineService, AnchorService],
})
export class TimelineModule {}
