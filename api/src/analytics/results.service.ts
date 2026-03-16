import { Injectable } from "@nestjs/common";
import type { RunResult } from "./dto/run-result.dto";
import type { ResultsResponse } from "./dto/results-response.dto";
import { formatResultsResponse } from "./metrics/results-formatter";

/**
 * NestJS Service wrapper for the analytics formatting logic.
 * Keeps business logic decoupled from the HTTP transport layer.
 */
@Injectable()
export class ResultsService {
  formatRuns(runs: RunResult[]): ResultsResponse {
    return formatResultsResponse(runs);
  }
}