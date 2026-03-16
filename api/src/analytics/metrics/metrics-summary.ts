/**
 * Interfaces representing the aggregated mathematical results of a single simulation run.
 */

export interface QueueStats {
  avgHoldingSize: number;
  maxHoldingSize: number;
  avgTakeoffQueueSize: number;
  maxTakeoffQueueSize: number;
}

export interface TimeStats {
  avgHoldingTime: number;
  maxHoldingTime: number;
  avgTakeoffWait: number;
  maxTakeoffWait: number;
  avgDelay: number;
  maxDelay: number;
}

export interface OutcomeCounts {
  processedCount: number;
  cancelledCount: number;
  divertedCount: number;
  fuelEmergencyCount: number;
}

/**
 * The master wrapper object containing all computed metrics for a given run.
 */
export interface MetricsSummary {
  queue: QueueStats;
  time: TimeStats;
  counts: OutcomeCounts;
}