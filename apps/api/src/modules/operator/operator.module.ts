import { Module } from "@nestjs/common";
import { AssuranceModule } from "../assurance/assurance.module";
import { QualityModule } from "../quality/quality.module";
import { TimelineModule } from "../timeline/timeline.module";
import { OperatorController } from "./operator.controller";
import { OperatorService } from "./operator.service";

/** Konsol operator — bergantung pada TimelineModule untuk menghitung ulang rantai hash. */
@Module({
  imports: [TimelineModule, AssuranceModule, QualityModule],
  controllers: [OperatorController],
  providers: [OperatorService],
})
export class OperatorModule {}
