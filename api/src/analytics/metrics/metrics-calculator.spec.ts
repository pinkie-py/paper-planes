
import { computeMetrics } from "./metrics-calculator";
import { AircraftState, EmergencyStatus, FlightType } from "../../domain/types";
import type { RunResult } from "../dto/run-result.dto";

describe("MetricsCalculator", () => {
  it("computes queue avg/max", () => {
    const run: RunResult = {
      config: {
        runways: 1,
        inboundFlowPerHour: 15,
        outboundFlowPerHour: 15,
        seed: "123",
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
      ],
    };

    const m = computeMetrics(run);

    expect(m.queue.maxHoldingSize).toBe(2);
    expect(m.queue.avgHoldingSize).toBeCloseTo(0.8, 6);
  });
});