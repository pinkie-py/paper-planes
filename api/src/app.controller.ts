import { Body, Controller, Get, Post } from "@nestjs/common";
import { AppService } from "./app.service";
import { SimulationConfig } from "./domain/simulation";

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Post('simulate')
    runSimulation(@Body() payload: SimulationConfig) {
        if (!payload.runways || !payload.inboundFlowRate || !payload.outboundFlowRate) {
            return { error: "Missing required configuration parameters." };
        }

        payload.durationMinutes = payload.durationMinutes || 1440;
        payload.runCount = payload.runCount || 1; // Default to 1 run

        return this.appService.runSimulation(payload);
    }
}