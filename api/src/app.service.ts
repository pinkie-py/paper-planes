import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Simulation, SimulationConfig } from "./domain/simulation";
import * as fs from "fs/promises";
import * as path from "path";

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

    const aggregated = this.aggregateMetrics(allResults);

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
        aggregatedResults: this.aggregateMetrics(session.perRunResults),
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

  private aggregateMetrics(results: any[]) {
    if (!results || results.length === 0) return null;

    const keys = Object.keys(results[0]);
    const aggregated: Record<string, { mean: number; stdDev: number }> = {};

    for (const key of keys) {
      const values = results.map((r) => r[key]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;

      let stdDev = 0;
      if (values.length > 1) {
        const variance =
          values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          (values.length - 1);
        stdDev = Math.sqrt(variance);
      }

      aggregated[key] = {
        mean: Number(mean.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
      };
    }

    return aggregated;
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

    // Create a clear, easily identifiable name for the simulation
    const recordName = `Sim: ${runCount} Run(s) (${inFlow} In / ${outFlow} Out)`;

    const record = {
      id: payload.simId || payload.id || `SIM-${Date.now()}`,
      name: recordName,
      timestamp: new Date().toISOString(),
      configurationUsed: payload.configurationUsed,
      aggregatedResults: payload.aggregatedResults,
      perRunResults: payload.perRunResults,
    };

    // Upsert logic: If this exact simId is already saved, overwrite it rather than duplicating
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