// api/src/analytics/dto/run-config.dto.ts

export interface RunConfig {
  // Inputs (align with UI where possible)
  runways: number; // 1..10
  inboundFlowPerHour: number; // >= 0
  outboundFlowPerHour: number; // >= 0
  seed?: string;

  // Simulation clock
  tickMinutes: number; // fixed 1
  durationMinutes: number; // default 1440 (24h)
}