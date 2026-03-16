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

export interface MetricsSummary {
  queue: QueueStats;
  time: TimeStats;
  counts: OutcomeCounts;
}