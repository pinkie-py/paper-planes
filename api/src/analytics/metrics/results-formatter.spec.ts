import { AircraftState, EmergencyStatus, FlightType } from "../../domain/types";
import type { RunResult } from "../dto/run-result.dto";
import { formatResultsResponse } from "./results-formatter";

function mkRun(seed: string, holdingMinutesA2: number, processedCountVariant = 0): RunResult {
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
        scheduledMinute: 10,
        actualMinute: 8, // early -> delay = 0
        emergencyStatus: EmergencyStatus.NONE,
      },
      {
        aircraftId: "A2",
        flightType: FlightType.INBOUND,
        finalState: AircraftState.DIVERTED,
        holdingMinutes: holdingMinutesA2,
        takeoffQueueMinutes: 0,
        scheduledMinute: 20,
        actualMinute: 20 + holdingMinutesA2, // delay = holdingMinutesA2
        emergencyStatus: EmergencyStatus.FUEL,
      },
      {
        aircraftId: "D1",
        flightType: FlightType.OUTBOUND,
        finalState: AircraftState.CANCELLED,
        holdingMinutes: 0,
        takeoffQueueMinutes: 7,
        scheduledMinute: 30,
        actualMinute: 40, // delay = 10
        emergencyStatus: EmergencyStatus.NONE,
      },
      {
        aircraftId: "D2",
        flightType: FlightType.OUTBOUND,
        finalState:
          processedCountVariant === 0 ? AircraftState.EXITED : AircraftState.CANCELLED,
        holdingMinutes: 0,
        takeoffQueueMinutes: 3,
        scheduledMinute: 50,
        actualMinute: 55, // delay = 5
        emergencyStatus: EmergencyStatus.NONE,
      },
    ],
  };
}

describe("formatResultsResponse", () => {
  it("formats scenario information correctly", () => {
    const runs = [mkRun("seed-1", 12), mkRun("seed-2", 10)];
    const result = formatResultsResponse(runs);

    expect(result.scenario.name).toBe("Simulation Scenario");
    expect(result.scenario.seed).toBe("seed-1");
    expect(result.scenario.runCount).toBe(2);
    expect(result.scenario.runways).toBe(1);
    expect(result.scenario.inboundFlow).toBe(15);
    expect(result.scenario.outboundFlow).toBe(15);
    expect(result.scenario.maxWaitTimeMins).toBe(30);
  });

  it("formats metric rows in the expected order", () => {
    const runs = [mkRun("seed-1", 12), mkRun("seed-2", 10)];
    const result = formatResultsResponse(runs);

    expect(result.rows.map((r) => r.label)).toEqual([
      "Fuel Emergency Events",
      "Aircraft Diversions",
      "Cancellations",
      "Avg Landing Queue size",
      "Max Landing Queue size",
      "Avg Take-Off Queue size",
      "Max Take-Off Queue size",
      "Avg Waiting Time (arrival) / mins",
      "Max Waiting Time (arrival) / mins",
      "Avg Waiting Time (departure) / mins",
      "Max Waiting Time (departure) / mins",
      "Avg Delay / mins",
      "Max Delay / mins",
      "Aircraft Processed",
    ]);
  });

  it("formats metric values across multiple runs", () => {
    const runs = [
      mkRun("seed-1", 12, 0), // delays: [0,12,10,5] -> avg 6.75, max 12
      mkRun("seed-2", 10, 1), // delays: [0,10,10,5] -> avg 6.25, max 10
    ];

    const result = formatResultsResponse(runs);
    const byLabel = Object.fromEntries(result.rows.map((r) => [r.label, r.values]));

    expect(byLabel["Fuel Emergency Events"]).toEqual([1, 1]);
    expect(byLabel["Aircraft Diversions"]).toEqual([1, 1]);
    expect(byLabel["Cancellations"]).toEqual([1, 2]);

    expect(byLabel["Avg Landing Queue size"][0]).toBeCloseTo(0.8, 6);
    expect(byLabel["Avg Landing Queue size"][1]).toBeCloseTo(0.8, 6);

    expect(byLabel["Max Landing Queue size"]).toEqual([2, 2]);

    expect(byLabel["Avg Waiting Time (arrival) / mins"][0]).toBeCloseTo(6, 6);
    expect(byLabel["Avg Waiting Time (arrival) / mins"][1]).toBeCloseTo(5, 6);

    expect(byLabel["Max Waiting Time (arrival) / mins"]).toEqual([12, 10]);

    expect(byLabel["Max Waiting Time (departure) / mins"]).toEqual([7, 7]);

    expect(byLabel["Avg Delay / mins"][0]).toBeCloseTo(6.75, 6);
    expect(byLabel["Avg Delay / mins"][1]).toBeCloseTo(6.25, 6);

    expect(byLabel["Max Delay / mins"]).toEqual([12, 10]);

    expect(byLabel["Aircraft Processed"]).toEqual([2, 1]);
  });

  it("returns empty rows for empty input", () => {
    const result = formatResultsResponse([]);

    expect(result.scenario.runCount).toBe(0);
    expect(result.rows).toEqual([]);
  });
});