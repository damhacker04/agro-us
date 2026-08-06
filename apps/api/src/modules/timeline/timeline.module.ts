import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { TenantModule } from "../tenant/tenant.module";
import { AssuranceModule } from "../assurance/assurance.module";
import { StorageModule } from "../storage/storage.module";
import {
  AnchorController,
  PublicTimelineController,
  TenantTimelineController,
} from "./timeline.controller";
import { TimelineService } from "./timeline.service";
import { AnchorService } from "./anchor.service";
import { NdviService } from "./ndvi.service";

@Module({
  imports: [TenantModule, AssuranceModule, NotificationModule, StorageModule],
  controllers: [TenantTimelineController, PublicTimelineController, AnchorController],
  providers: [TimelineService, AnchorService, NdviService],
  exports: [TimelineService, AnchorService],
})
export class TimelineModule {}
