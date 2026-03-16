import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AppService } from "./app.service";
import { SimulationConfig } from "./domain/simulation";

/**
 * Main application controller handling all HTTP requests for the simulation API.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * GET /
   * Simple health check endpoint to verify the API is running.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * POST /simulate
   * Runs an entire simulation synchronously in the background and returns the final results.
   * Useful for batch testing or scenarios where real-time UI animation isn't needed.
   */
  @Post("simulate")
  runSimulation(@Body() payload: SimulationConfig) {
    // Basic validation to ensure required fields are present
    if (
      payload.inboundFlowRate == null ||
      payload.outboundFlowRate == null ||
      !payload.runways || payload.runways.length === 0
    ) {
      return { error: "Missing required configuration parameters." };
    }

    // Apply strict fallback defaults
    payload.durationMinutes = payload.durationMinutes || 1440;
    payload.runCount = payload.runCount || 1;

    return this.appService.runSimulation(payload);
  }

  /**
   * POST /live/start
   * Initializes a new interactive, step-by-step simulation session.
   * Returns a unique Session ID and the initial snapshot of the airport.
   */
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

  /**
   * POST /live/:id/finish
   * Instantly fast-forwards the remaining time in a live simulation.
   * Useful when the user clicks the "Finish Now" button.
   */
  @Post("live/:id/finish")
  finishLive(@Param("id") id: string) {
    return this.appService.finishLiveSimulation(id);
  }

  /**
   * GET /live/:id/state
   * Retrieves the current snapshot of the airport without advancing the clock.
   * Useful for syncing the UI state if the user pauses.
   */
  @Get("live/:id/state")
  getLiveState(@Param("id") id: string) {
    return this.appService.getLiveSimulationState(id);
  }

  /**
   * POST /live/:id/tick
   * Advances the simulation clock by exactly 1 minute and returns the new state.
   * This is the endpoint the frontend polls repeatedly to animate the UI.
   */
  @Post("live/:id/tick")
  tickLive(@Param("id") id: string) {
    return this.appService.tickLiveSimulation(id);
  }

  /**
   * POST /live/:id/runways
   * Allows the user to dynamically change runway modes/statuses while the simulation is running.
   */
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

  /**
   * POST /save
   * Saves a completed simulation result to the local JSON database for future comparison.
   */
  @Post("save")
  async saveSimulation(@Body() payload: any) {
    if (!payload.configurationUsed || !payload.aggregatedResults) {
      return {
        error: "Invalid payload. Must include configurationUsed and aggregatedResults.",
      };
    }
    const savedRecord = await this.appService.saveSimulation(payload);
    return { status: "success", savedRecord };
  }

  /**
   * GET /history
   * Retrieves all previously saved simulation runs from the JSON database.
   */
  @Get("history")
  async getSimulationHistory() {
    const history = await this.appService.getSavedSimulations();
    return { status: "success", count: history.length, data: history };
  }
}