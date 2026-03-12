import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Simulation, SimulationConfig } from "./domain/simulation";
import * as fs from "fs/promises";
import * as path from "path";
import { formatResultsResponse } from "./analytics/metrics/results-formatter"; // <-- INTEGRATED HERE

type LiveSession = {
  id: string;
  baseConfig: SimulationConfig;
  totalRuns: number;
  currentRunIndex: number;
  currentSimulation: Simulation;
  perRunResults: any[];
  finished: boolean;
  finalPayload: any | null;
};

@Injectable()
export class AppService {
  private readonly dbPath = path.join(process.cwd(), "simulation_db.json");
  private readonly liveSessions = new Map<string, LiveSession>();

  getHello(): string {
    return "Airport Simulation API is running!";
  }

  runSimulation(config: SimulationConfig): any {
    const normalized = this.normalizeConfig(config);
    const runs = normalized.runCount || 1;
    const allResults = [];

    for (let i = 0; i < runs; i++) {
      const sim = new Simulation({ ...normalized, runCount: 1 });
      allResults.push(sim.run());
    }

    // Call your powerful analytics formatter here
    const aggregated = formatResultsResponse(allResults);

    return {
      status: "success",
      configurationUsed: normalized,
      perRunResults: allResults,
      aggregatedResults: aggregated,
    };
  }

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

  tickLiveSimulation(simId: string) {
    const session = this.liveSessions.get(simId);
    if (!session) return { error: "Simulation session not found." };

    if (session.finished) {
      return session.finalPayload;
    }

    session.currentSimulation.step();

    if (session.currentSimulation.isFinished()) {
      session.perRunResults.push(session.currentSimulation.getMetrics());

      if (session.currentRunIndex < session.totalRuns) {
        session.currentRunIndex += 1;
        session.currentSimulation = new Simulation({
          ...session.baseConfig,
          runCount: 1,
        });

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

      const finalPayload = {
        status: "success",
        simId,
        finished: true,
        configurationUsed: session.baseConfig,
        perRunResults: session.perRunResults,
        // Call your powerful analytics formatter here
        aggregatedResults: formatResultsResponse(session.perRunResults),
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

  finishLiveSimulation(simId: string) {
    const session = this.liveSessions.get(simId);
    if (!session) return { error: "Simulation session not found." };

    if (session.finished) {
      return session.finalPayload;
    }

    let guard = 0;
    while (!session.finished && guard < 100000) {
      this.tickLiveSimulation(simId);
      guard += 1;
    }

    if (!session.finished) {
      return { error: "Unable to finish simulation safely." };
    }

    return session.finalPayload;
  }

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

  private normalizeConfig(config: SimulationConfig): SimulationConfig {
    return {
      inboundFlowRate: config.inboundFlowRate,
      outboundFlowRate: config.outboundFlowRate,
      durationMinutes: config.durationMinutes || 1440,
      runCount: config.runCount || 1,
      seed: config.seed ?? null,
      runways: config.runways || [],
    };
  }

  async saveSimulation(payload: any) {
    let db = [];
    try {
      const fileContent = await fs.readFile(this.dbPath, "utf8");
      db = JSON.parse(fileContent);
    } catch {
      // start empty
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

    const existingIndex = db.findIndex((r) => r.id === record.id);
    if (existingIndex >= 0) {
      db[existingIndex] = record;
    } else {
      db.push(record);
    }

    await fs.writeFile(this.dbPath, JSON.stringify(db, null, 2));
    return record;
  }

  async getSavedSimulations() {
    try {
      const fileContent = await fs.readFile(this.dbPath, "utf8");
      return JSON.parse(fileContent);
    } catch {
      return [];
    }
  }
}