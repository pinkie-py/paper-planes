// api/src/analytics/dto/results-response.dto.ts

export interface ScenarioSummary {
  name: string;
  seed?: string;
  runCount: number;
  runways: number;
  inboundFlow: number;
  outboundFlow: number;
  maxWaitTimeMins: number;
}

export interface MetricRow {
  label: string;
  values: number[];
}

export interface ResultsResponse {
  scenario: ScenarioSummary;
  rows: MetricRow[];
}