import type { RunResult } from "../dto/run-result.dto";
import type {
  MetricRow,
  ResultsResponse,
  ScenarioSummary,
} from "../dto/results-response.dto";
import type { MetricsSummary } from "./metrics-summary";
import { computeMetrics } from "./metrics-calculator";

function buildScenarioSummary(runs: RunResult[]): ScenarioSummary {
  const first = runs[0];

  return {
    name: "Simulation Scenario",
    seed: first.config.seed,
    runCount: runs.length,
    runways: first.config.runways,
    inboundFlow: first.config.inboundFlowPerHour,
    outboundFlow: first.config.outboundFlowPerHour,
    maxWaitTimeMins: 30,
  };
}

function buildMetricRows(metrics: MetricsSummary[]): MetricRow[] {
  return [
    {
      label: "Fuel Emergency Events",
      values: metrics.map((m) => m.counts.fuelEmergencyCount),
    },
    {
      label: "Aircraft Diversions",
      values: metrics.map((m) => m.counts.divertedCount),
    },
    {
      label: "Cancellations",
      values: metrics.map((m) => m.counts.cancelledCount),
    },
    {
      label: "Avg Landing Queue size",
      values: metrics.map((m) => m.queue.avgHoldingSize),
    },
    {
      label: "Max Landing Queue size",
      values: metrics.map((m) => m.queue.maxHoldingSize),
    },
    {
      label: "Avg Take-Off Queue size",
      values: metrics.map((m) => m.queue.avgTakeoffQueueSize),
    },
    {
      label: "Max Take-Off Queue size",
      values: metrics.map((m) => m.queue.maxTakeoffQueueSize),
    },
    {
      label: "Avg Waiting Time (arrival) / mins",
      values: metrics.map((m) => m.time.avgHoldingTime),
    },
    {
      label: "Max Waiting Time (arrival) / mins",
      values: metrics.map((m) => m.time.maxHoldingTime),
    },
    {
      label: "Avg Waiting Time (departure) / mins",
      values: metrics.map((m) => m.time.avgTakeoffWait),
    },
    {
      label: "Max Waiting Time (departure) / mins",
      values: metrics.map((m) => m.time.maxTakeoffWait),
    },
    {
      label: "Avg Delay / mins",
      values: metrics.map((m) => m.time.avgDelay),
    },
    {
      label: "Max Delay / mins",
      values: metrics.map((m) => m.time.maxDelay),
    },
    {
      label: "Aircraft Processed",
      values: metrics.map((m) => m.counts.processedCount),
    },
  ];
}

export function formatResultsResponseFromMetrics(
  runs: RunResult[],
  metrics: MetricsSummary[],
): ResultsResponse {
  if (runs.length === 0) {
    return {
      scenario: {
        name: "Simulation Scenario",
        runCount: 0,
        runways: 0,
        inboundFlow: 0,
        outboundFlow: 0,
        maxWaitTimeMins: 30,
      },
      rows: [],
    };
  }

  return {
    scenario: buildScenarioSummary(runs),
    rows: buildMetricRows(metrics),
  };
}

export function formatResultsResponse(runs: RunResult[]): ResultsResponse {
  const metrics = runs.map((run) => computeMetrics(run));
  return formatResultsResponseFromMetrics(runs, metrics);
}