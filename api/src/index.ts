import { Runway } from "./domain/runway";
import { RunwayMode, RunwayStatus, AllocationPolicy } from "./domain/types";
import { SimulationEngine } from "./simulation/simulationEngine";

const start = new Date("2026-01-01T00:00:00Z");
const runways = [new Runway("09", RunwayMode.MIXED, RunwayStatus.AVAILABLE)];

const engine = new SimulationEngine(start, 1, 15, 15, runways, 30);

for (let i = 0; i < 60; i++) {
  engine.timeIncrement(new Date(start.getTime() + i * 60_000));
  engine.allocateRunways(AllocationPolicy.BALANCED);
}

console.log("FINAL", engine.getCounters());