import { AircraftState, EmergencyStatus, FlightType } from "../../domain/types";
import type { RunConfig } from "./run-config.dto";

export interface TickSnapshot {
  minute: number;
  holdingCount: number;
  takeoffQueueCount: number;
  occupiedRunwaysCount?: number;
}

export interface AircraftOutcome {
  aircraftId: string;
  flightType: FlightType;
  finalState: AircraftState;
  holdingMinutes: number;
  takeoffQueueMinutes: number;
  emergencyStatus: EmergencyStatus;
}

export interface RunResult {
  config: RunConfig;
  ticks: TickSnapshot[];
  aircraft: AircraftOutcome[];
}