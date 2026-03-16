import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Simulation, SimulationConfig } from "./domain/simulation";
import * as fs from "fs/promises";
import * as path from "path";
import { formatResultsResponse } from "./analytics/metrics/results-formatter";

/**
 * Defines the structure of an in-memory live simulation session.
 * Tracks multiple runs if the user requested them.
 */
type LiveSession = {
  id: string;
  baseConfig: SimulationConfig;
  totalRuns: number;
  currentRunIndex: number;
  currentSimulation: Simulation; // The actual domain class instance
  perRunResults: any[];          // Stores finished run data until all runs complete
  finished: boolean;
  finalPayload: any | null;      // Caches the final result to prevent re-calculating
};

@Injectable()
export class AppService {
  // Path to the local JSON flat-file database
  private readonly dbPath = path.join(process.cwd(), "simulation_db.json");
  
  // In-memory store for active simulations, keyed by unique session IDs
  private readonly liveSessions = new Map<string, LiveSession>();

  getHello(): string {
    return "Airport Simulation API is running!";
  }

  /**
   * Synchronously runs a full simulation (or multiple runs) without live ticking.
   * Instantiates the domain model, loops it until finished, and computes analytics.
   */
  runSimulation(config: SimulationConfig): any {
    const normalized = this.normalizeConfig(config);
    const runs = normalized.runCount || 1;
    const allResults = [];

    // Execute N independent runs
    for (let i = 0; i < runs; i++) {
      const sim = new Simulation({ ...normalized, runCount: 1 });
      allResults.push(sim.run());
    }

    // Pass the raw data through the analytics formatter to calculate means/stddevs
    const aggregated = formatResultsResponse(allResults);

    return {
      status: "success",
      configurationUsed: normalized,
      perRunResults: allResults,
      aggregatedResults: aggregated,
    };
  }

  /**
   * Initializes a live simulation session and stores it in memory.
   */
  startLiveSimulation(config: SimulationConfig) {
    const normalized = this.normalizeConfig(config);
    const totalRuns = normalized.runCount || 1;

    const session: LiveSession = {
      id: randomUUID(),
      baseConfig: normalized,
      totalRuns,
      currentRunIndex: 1,
      currentSimulation: new Simulation({ ...normalized, runCount: 1 }),
      perRunResults: [],
      finished: false,
      finalPayload: null,
    };

    // Save session to memory so it can be retrieved on subsequent /tick requests
    this.liveSessions.set(session.id, session);

    return {
      status: "success",
      simId: session.id,
      finished: false,
      snapshot: session.currentSimulation.getSnapshot(
        session.currentRunIndex,
        session.totalRuns,
        normalized.seed ?? null
      ),
    };
  }

  /**
   * Retrieves the current state of a live session without ticking the clock.
   */
  getLiveSimulationState(simId: string) {
    const session = this.liveSessions.get(simId);
    if (!session) return { error: "Simulation session not found." };

    return {
      status: "success",
      simId,
      finished: session.finished,
      snapshot: session.currentSimulation.getSnapshot(
        session.currentRunIndex,
        session.totalRuns,
        session.baseConfig.seed ?? null
      ),
    };
  }

  /**
   * Advances the specific live simulation session by 1 minute.
   * Handles transitioning between multiple sequential runs seamlessly.
   */
  tickLiveSimulation(simId: string) {
    const session = this.liveSessions.get(simId);
    if (!session) return { error: "Simulation session not found." };

    // If already done, just return the cached final results
    if (session.finished) {
      return session.finalPayload;
    }

    // Step the domain simulation logic forward by 1 minute
    session.currentSimulation.step();

    // Check if the current run has hit its time limit
    if (session.currentSimulation.isFinished()) {
      session.perRunResults.push(session.currentSimulation.getMetrics());

      // If we need to do more runs, reset the simulation instance and increment the index
      if (session.currentRunIndex < session.totalRuns) {
        session.currentRunIndex += 1;
        session.currentSimulation = new Simulation({
          ...session.baseConfig,
          runCount: 1,
        });

        // Return a snapshot indicating we are starting the next run
        return {
          status: "success",
          simId,
          finished: false,
          snapshot: session.currentSimulation.getSnapshot(
            session.currentRunIndex,
            session.totalRuns,
            session.baseConfig.seed ?? null
          ),
        };
      }

      // If ALL runs are completely finished, compute the final aggregated analytics
      const finalPayload = {
        status: "success",
        simId,
        finished: true,
        configurationUsed: session.baseConfig,
        perRunResults: session.perRunResults,
        aggregatedResults: formatResultsResponse(session.perRunResults), // <-- Triggers metrics-calculator
        snapshot: session.currentSimulation.getSnapshot(
          session.currentRunIndex,
          session.totalRuns,
          session.baseConfig.seed ?? null
        ),
      };

      session.finished = true;
      session.finalPayload = finalPayload;
      return finalPayload;
    }

    // Standard return: Not finished yet, return the new updated snapshot
    return {
      status: "success",
      simId,
      finished: false,
      snapshot: session.currentSimulation.getSnapshot(
        session.currentRunIndex,
        session.totalRuns,
        session.baseConfig.seed ?? null
      ),
    };
  }

  /**
   * Triggers a while loop to instantly fast-forward the remaining ticks of a live simulation.
   */
  finishLiveSimulation(simId: string) {
    const session = this.liveSessions.get(simId);
    if (!session) return { error: "Simulation session not found." };

    if (session.finished) {
      return session.finalPayload;
    }

    let guard = 0;
    // Loop until finished, with a failsafe limit to prevent infinite loops from freezing the server
    while (!session.finished && guard < 100000) {
      this.tickLiveSimulation(simId);
      guard += 1;
    }

    if (!session.finished) {
      return { error: "Unable to finish simulation safely." };
    }

    return session.finalPayload;
  }

  /**
   * Passes runway updates (closures/mode changes) from the user directly into the active domain instance.
   */
  updateLiveRunways(
    simId: string,
    runways: { id: string; mode: any; status: any }[]
  ) {
    const session = this.liveSessions.get(simId);
    if (!session) return { error: "Simulation session not found." };

    session.currentSimulation.updateRunways(runways);
    session.baseConfig = { ...session.baseConfig, runways };

    return {
      status: "success",
      simId,
      finished: session.finished,
      snapshot: session.currentSimulation.getSnapshot(
        session.currentRunIndex,
        session.totalRuns,
        session.baseConfig.seed ?? null
      ),
    };
  }

  /**
   * Sanitizes and maps user configuration into a strict object.
   * Applies defaults for any fields the frontend omitted.
   */
  private normalizeConfig(config: SimulationConfig): SimulationConfig {
    return {
      inboundFlowRate: config.inboundFlowRate,
      outboundFlowRate: config.outboundFlowRate,
      durationMinutes: config.durationMinutes || 1440,
      runCount: config.runCount || 1,
      seed: config.seed ?? null,
      runways: config.runways || [],
      runwayEmergencyProbability: config.runwayEmergencyProbability ?? 0.02,
      aircraftEmergencyProbability: config.aircraftEmergencyProbability ?? 0.002,
      scheduledClosures: config.scheduledClosures || [],
    };
  }

  /**
   * Upserts the final simulation payload into the local `simulation_db.json`.
   * Generates descriptive names based on configuration parameters.
   */
  async saveSimulation(payload: any) {
    let db = [];
    try {
      const fileContent = await fs.readFile(this.dbPath, "utf8");
      db = JSON.parse(fileContent);
    } catch {
      // Create empty db if file does not exist yet
    }

    const config = payload.configurationUsed || {};
    const runCount = config.runCount || 1;
    const inFlow = config.inboundFlowRate || 0;
    const outFlow = config.outboundFlowRate || 0;

    const recordName = `Sim: ${runCount} Run(s) (${inFlow} In / ${outFlow} Out)`;

    const record = {
      id: payload.simId || payload.id || `SIM-${Date.now()}`,
      name: recordName,
      timestamp: new Date().toISOString(),
      configurationUsed: payload.configurationUsed,
      aggregatedResults: payload.aggregatedResults,
      perRunResults: payload.perRunResults,
    };

    // Upsert logic: Update if ID exists, push new if it doesn't
    const existingIndex = db.findIndex((r) => r.id === record.id);
    if (existingIndex >= 0) {
      db[existingIndex] = record;
    } else {
      db.push(record);
    }

    await fs.writeFile(this.dbPath, JSON.stringify(db, null, 2));
    return record;
  }

  /**
   * Returns the entire contents of the `simulation_db.json`.
   */
  async getSavedSimulations() {
    try {
      const fileContent = await fs.readFile(this.dbPath, "utf8");
      return JSON.parse(fileContent);
    } catch {
      return [];
    }
  }
}