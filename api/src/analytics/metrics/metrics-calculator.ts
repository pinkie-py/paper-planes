import { AircraftState, EmergencyStatus, FlightType } from "../../domain/types";
import type { RunResult } from "../dto/run-result.dto";
import type { MetricsSummary } from "./metrics-summary";

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = nums.reduce((a, b) => a + b, 0);
  return s / nums.length;
}

function max(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((m, x) => (x > m ? x : m), nums[0]);
}

export function computeMetrics(run: RunResult): MetricsSummary {
  const holdingCounts = run.ticks.map((t) => t.holdingCount);
  const takeoffCounts = run.ticks.map((t) => t.takeoffQueueCount);

  const avgHoldingSize = mean(holdingCounts);
  const maxHoldingSize = max(holdingCounts);
  const avgTakeoffQueueSize = mean(takeoffCounts);
  const maxTakeoffQueueSize = max(takeoffCounts);

  const inboundHoldingTimes = run.aircraft
    .filter((a) => a.flightType === FlightType.INBOUND)
    .map((a) => a.holdingMinutes);

  const outboundQueueTimes = run.aircraft
    .filter((a) => a.flightType === FlightType.OUTBOUND)
    .map((a) => a.takeoffQueueMinutes);

  const avgHoldingTime = mean(inboundHoldingTimes);
  const maxHoldingTime = max(inboundHoldingTimes);

  const avgTakeoffWait = mean(outboundQueueTimes);
  const maxTakeoffWait = max(outboundQueueTimes);

  const delays = run.aircraft.map((a) =>
    a.flightType === FlightType.INBOUND ? a.holdingMinutes : a.takeoffQueueMinutes,
  );
  const avgDelay = mean(delays);
  const maxDelay = max(delays);

  const processedCount = run.aircraft.filter((a) => a.finalState === AircraftState.EXITED).length;
  const cancelledCount = run.aircraft.filter((a) => a.finalState === AircraftState.CANCELLED).length;
  const divertedCount = run.aircraft.filter((a) => a.finalState === AircraftState.DIVERTED).length;
  const fuelEmergencyCount = run.aircraft.filter((a) => a.emergencyStatus === EmergencyStatus.FUEL).length;

  return {
    queue: { avgHoldingSize, maxHoldingSize, avgTakeoffQueueSize, maxTakeoffQueueSize },
    time: { avgHoldingTime, maxHoldingTime, avgTakeoffWait, maxTakeoffWait, avgDelay, maxDelay },
    counts: { processedCount, cancelledCount, divertedCount, fuelEmergencyCount },
  };
}