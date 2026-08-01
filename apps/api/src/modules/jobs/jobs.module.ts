import { Module } from "@nestjs/common";
import { AssuranceModule } from "../assurance/assurance.module";
import { LogisticsModule } from "../logistics/logistics.module";
import { OrderModule } from "../order/order.module";
import { QualityModule } from "../quality/quality.module";
import { TimelineModule } from "../timeline/timeline.module";
import { JobsService } from "./jobs.service";

/**
 * Menjalankan job berkala yang selama ini hanya punya endpoint.
 * Endpoint manualnya tetap ada — dipakai saat peragaan dan pemulihan.
 */
@Module({
  imports: [LogisticsModule, QualityModule, OrderModule, TimelineModule, AssuranceModule],
  providers: [JobsService],
})
export class JobsModule {}
