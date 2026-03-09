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
        payload.runCount = payload.runCount || 1;

        return this.appService.runSimulation(payload);
    }

    // --- NEW: Database Endpoints ---

    @Post('save')
    async saveSimulation(@Body() payload: any) {
        if (!payload.configurationUsed || !payload.aggregatedResults) {
            return { error: "Invalid payload. Must include configurationUsed and aggregatedResults." };
        }
        const savedRecord = await this.appService.saveSimulation(payload);
        return { status: "success", savedRecord };
    }

    @Get('history')
    async getSimulationHistory() {
        const history = await this.appService.getSavedSimulations();
        return { status: "success", count: history.length, data: history };
    }
}