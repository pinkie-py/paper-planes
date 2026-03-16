import { AircraftState, EmergencyStatus, FlightType } from "../../domain/types";
import type { RunResult } from "../dto/run-result.dto";
import type { MetricsSummary } from "./metrics-summary";

/**
 * Helper function to calculate the mean (average) of an array of numbers.
 * Safely returns 0 to avoid NaN errors on empty arrays.
 */
function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = nums.reduce((a, b) => a + b, 0);
  return s / nums.length;
}

/**
 * Helper function to find the maximum value in an array of numbers.
 * Safely returns 0 on empty arrays.
 */
function max(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((m, x) => (x > m ? x : m), nums[0]);
}

/**
 * Takes a raw simulation RunResult (containing minute-by-minute ticks and aircraft histories)
 * and computes the statistical summaries (averages, maximums, and outcome counts).
 */
export function computeMetrics(run: RunResult): MetricsSummary {
  // 1. Queue Statistics (calculated from tick-by-tick snapshots)
  const holdingCounts = run.ticks.map((t) => t.holdingCount);
  const takeoffCounts = run.ticks.map((t) => t.takeoffQueueCount);

  const avgHoldingSize = mean(holdingCounts);
  const maxHoldingSize = max(holdingCounts);
  const avgTakeoffQueueSize = mean(takeoffCounts);
  const maxTakeoffQueueSize = max(takeoffCounts);

  // 2. Wait Time Statistics (calculated from individual aircraft records)
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

  // 3. Overall Delay Calculation
  // Delay is defined as the difference between actual processing time and scheduled time.
  // We use Math.max(0, ...) to ensure aircraft processed early or exactly on time have 0 delay, not negative.
  const delays = run.aircraft.map((a) =>
    Math.max(0, a.actualMinute - a.scheduledMinute),
  );
  const avgDelay = mean(delays);
  const maxDelay = max(delays);

  // 4. Final Outcome Counts
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