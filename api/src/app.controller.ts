import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AppService } from "./app.service";
import { SimulationConfig } from "./domain/simulation";

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

@Get()
    getHello(): string {
    return this.appService.getHello();
    }

    @Post("simulate")
    runSimulation(@Body() payload: SimulationConfig) {
    if (
        payload.inboundFlowRate == null ||
        payload.outboundFlowRate == null ||
        !payload.runways || payload.runways.length === 0
    ) {
        return { error: "Missing required configuration parameters." };
    }

    payload.durationMinutes = payload.durationMinutes || 1440;
    payload.runCount = payload.runCount || 1;

    return this.appService.runSimulation(payload);
    }

    @Post("live/start")
    startLiveSimulation(@Body() payload: SimulationConfig) {
    if (
        payload.inboundFlowRate == null ||
        payload.outboundFlowRate == null ||
        !payload.runways || payload.runways.length === 0
    ) {
        return { error: "Missing required configuration parameters." };
    }

    payload.durationMinutes = payload.durationMinutes || 1440;
    payload.runCount = payload.runCount || 1;

    return this.appService.startLiveSimulation(payload);
    }

@Post("live/:id/finish")
finishLive(@Param("id") id: string) {
    return this.appService.finishLiveSimulation(id);
}

@Get("live/:id/state")
getLiveState(@Param("id") id: string) {
    return this.appService.getLiveSimulationState(id);
}

@Post("live/:id/tick")
tickLive(@Param("id") id: string) {
    return this.appService.tickLiveSimulation(id);
}

@Post("live/:id/runways")
updateLiveRunways(
    @Param("id") id: string,
    @Body() payload: { runways: { id: string; mode: any; status: any }[] }
    ) {
    if (!payload?.runways) {
        return { error: "Missing runways payload." };
    }
    return this.appService.updateLiveRunways(id, payload.runways);
}

@Post("save")
async saveSimulation(@Body() payload: any) {
    if (!payload.configurationUsed || !payload.aggregatedResults) {
        return {
        error:
            "Invalid payload. Must include configurationUsed and aggregatedResults.",
        };
    }
    const savedRecord = await this.appService.saveSimulation(payload);
    return { status: "success", savedRecord };
}

@Get("history")
async getSimulationHistory() {
    const history = await this.appService.getSavedSimulations();
    return { status: "success", count: history.length, data: history };
    }
}