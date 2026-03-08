import { ResultsService } from "./results.service";
import { AircraftState, EmergencyStatus, FlightType } from "../domain/types";
import type { RunResult } from "./dto/run-result.dto";

function mkRun(seed: string): RunResult {
  return {
    config: {
      runways: 1,
      inboundFlowPerHour: 15,
      outboundFlowPerHour: 15,
      seed,
      tickMinutes: 1,
      durationMinutes: 5,
    },
    ticks: [
      { minute: 0, holdingCount: 0, takeoffQueueCount: 1 },
      { minute: 1, holdingCount: 2, takeoffQueueCount: 3 },
      { minute: 2, holdingCount: 1, takeoffQueueCount: 2 },
      { minute: 3, holdingCount: 0, takeoffQueueCount: 2 },
      { minute: 4, holdingCount: 1, takeoffQueueCount: 0 },
    ],
    aircraft: [
      {
        aircraftId: "A1",
        flightType: FlightType.INBOUND,
        finalState: AircraftState.EXITED,
        holdingMinutes: 0,
        takeoffQueueMinutes: 0,
        emergencyStatus: EmergencyStatus.NONE,
      },
      {
        aircraftId: "A2",
        flightType: FlightType.INBOUND,
        finalState: AircraftState.DIVERTED,
        holdingMinutes: 12,
        takeoffQueueMinutes: 0,
        emergencyStatus: EmergencyStatus.FUEL,
      },
      {
        aircraftId: "D1",
        flightType: FlightType.OUTBOUND,
        finalState: AircraftState.CANCELLED,
        holdingMinutes: 0,
        takeoffQueueMinutes: 7,
        emergencyStatus: EmergencyStatus.NONE,
      },
      {
        aircraftId: "D2",
        flightType: FlightType.OUTBOUND,
        finalState: AircraftState.EXITED,
        holdingMinutes: 0,
        takeoffQueueMinutes: 3,
        emergencyStatus: EmergencyStatus.NONE,
      },
    ],
  };
}

describe("ResultsService", () => {
  it("formats runs into results response", () => {
    const service = new ResultsService();
    const result = service.formatRuns([mkRun("seed-1")]);

    expect(result.scenario.seed).toBe("seed-1");
    expect(result.scenario.runCount).toBe(1);

    const byLabel = Object.fromEntries(result.rows.map((r) => [r.label, r.values]));

    expect(byLabel["Fuel Emergency Events"]).toEqual([1]);
    expect(byLabel["Aircraft Diversions"]).toEqual([1]);
    expect(byLabel["Cancellations"]).toEqual([1]);
    expect(byLabel["Avg Delay / mins"][0]).toBeCloseTo(5.5, 6);
    expect(byLabel["Aircraft Processed"]).toEqual([2]);
  });
});