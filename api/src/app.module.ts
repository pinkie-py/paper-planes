import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ResultsController } from "./analytics/results.controller";
import { ResultsService } from "./analytics/results.service";

@Module({
  imports: [],
  controllers: [AppController, ResultsController],
  providers: [AppService, ResultsService],
})
export class AppModule {}