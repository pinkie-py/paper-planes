import { computeMetrics } from "./metrics-calculator";
import { AircraftState, EmergencyStatus, FlightType } from "../../domain/types";
import type { RunResult } from "../dto/run-result.dto";

/**
 * Helper to generate a mock simulation run for predictable unit testing.
 */
function mkRun(): RunResult {
  return {
    // ... [Configuration and Ticks Mock Data] ...
    config: { runways: 1, inboundFlowPerHour: 15, outboundFlowPerHour: 15, seed: "123", tickMinutes: 1, durationMinutes: 5 },
    ticks: [
      { minute: 0, holdingCount: 0, takeoffQueueCount: 1 },
      { minute: 1, holdingCount: 2, takeoffQueueCount: 3 },
      { minute: 2, holdingCount: 1, takeoffQueueCount: 2 },
      { minute: 3, holdingCount: 0, takeoffQueueCount: 2 },
      { minute: 4, holdingCount: 1, takeoffQueueCount: 0 },
    ],
    // ... [Aircraft Mock Data] ...
    aircraft: [
      // Inbound: no holding, processed, arrives early -> delay = 0
      { aircraftId: "A1", flightType: FlightType.INBOUND, finalState: AircraftState.EXITED, holdingMinutes: 0, takeoffQueueMinutes: 0, scheduledMinute: 10, actualMinute: 8, emergencyStatus: EmergencyStatus.NONE },
      // Inbound: held 12, diverted with fuel emergency -> delay = 12
      { aircraftId: "A2", flightType: FlightType.INBOUND, finalState: AircraftState.DIVERTED, holdingMinutes: 12, takeoffQueueMinutes: 0, scheduledMinute: 20, actualMinute: 32, emergencyStatus: EmergencyStatus.FUEL },
      // Outbound: queued 7, cancelled -> delay = 10
      { aircraftId: "D1", flightType: FlightType.OUTBOUND, finalState: AircraftState.CANCELLED, holdingMinutes: 0, takeoffQueueMinutes: 7, scheduledMinute: 30, actualMinute: 40, emergencyStatus: EmergencyStatus.NONE },
      // Outbound: queued 3, processed -> delay = 5
      { aircraftId: "D2", flightType: FlightType.OUTBOUND, finalState: AircraftState.EXITED, holdingMinutes: 0, takeoffQueueMinutes: 3, scheduledMinute: 50, actualMinute: 55, emergencyStatus: EmergencyStatus.NONE },
    ],
  };
}

describe("MetricsCalculator / computeMetrics", () => {
  it("computes queue avg/max", () => {
    const m = computeMetrics(mkRun());
    // holding: [0,2,1,0,1] avg=0.8 max=2
    expect(m.queue.maxHoldingSize).toBe(2);
    expect(m.queue.avgHoldingSize).toBeCloseTo(0.8, 6);
    // takeoff: [1,3,2,2,0] avg=1.6 max=3
    expect(m.queue.maxTakeoffQueueSize).toBe(3);
    expect(m.queue.avgTakeoffQueueSize).toBeCloseTo(1.6, 6);
  });

  it("computes outcome counts and fuel emergencies", () => {
    const m = computeMetrics(mkRun());
    expect(m.counts.processedCount).toBe(2);
    expect(m.counts.cancelledCount).toBe(1);
    expect(m.counts.divertedCount).toBe(1);
    expect(m.counts.fuelEmergencyCount).toBe(1);
  });

  it("computes waiting time and overall delay", () => {
    const m = computeMetrics(mkRun());
    // inbound holding times: [0,12] avg=6 max=12
    expect(m.time.avgHoldingTime).toBeCloseTo(6, 6);
    expect(m.time.maxHoldingTime).toBe(12);
    // outbound queue times: [7,3] avg=5 max=7
    expect(m.time.avgTakeoffWait).toBeCloseTo(5, 6);
    expect(m.time.maxTakeoffWait).toBe(7);
    // delays: [0,12,10,5] avg = 27/4 = 6.75, max = 12
    expect(m.time.avgDelay).toBeCloseTo(6.75, 6);
    expect(m.time.maxDelay).toBe(12);
  });

  it("clips negative delay to zero", () => {
    // Tests that planes arriving early do not falsely lower the average delay
    const run: RunResult = {
      config: { runways: 1, inboundFlowPerHour: 15, outboundFlowPerHour: 15, seed: "neg-delay", tickMinutes: 1, durationMinutes: 1 },
      ticks: [{ minute: 0, holdingCount: 0, takeoffQueueCount: 0 }],
      aircraft: [
        { aircraftId: "X1", flightType: FlightType.INBOUND, finalState: AircraftState.EXITED, holdingMinutes: 0, takeoffQueueMinutes: 0, scheduledMinute: 20, actualMinute: 15, emergencyStatus: EmergencyStatus.NONE },
      ],
    };
    const m = computeMetrics(run);
    expect(m.time.avgDelay).toBe(0);
    expect(m.time.maxDelay).toBe(0);
  });
it("returns zero delay when actual time equals scheduled time", () => {
  const run: RunResult = {
    config: {
      runways: 1,
      inboundFlowPerHour: 15,
      outboundFlowPerHour: 15,
      seed: "zero-delay",
      tickMinutes: 1,
      durationMinutes: 1,
    },
    ticks: [{ minute: 0, holdingCount: 0, takeoffQueueCount: 0 }],
    aircraft: [
      {
        aircraftId: "Z1",
        flightType: FlightType.INBOUND,
        finalState: AircraftState.EXITED,
        holdingMinutes: 0,
        takeoffQueueMinutes: 0,
        scheduledMinute: 20,
        actualMinute: 20, // exact on time -> delay = 0
        emergencyStatus: EmergencyStatus.NONE,
      },
    ],
  };

  const m = computeMetrics(run);
  expect(m.time.avgDelay).toBe(0);
  expect(m.time.maxDelay).toBe(0);
});
});