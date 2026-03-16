import { Injectable } from "@nestjs/common";
import type { RunResult } from "./dto/run-result.dto";
import type { ResultsResponse } from "./dto/results-response.dto";
import { formatResultsResponse } from "./metrics/results-formatter";

@Injectable()
export class ResultsService {
  formatRuns(runs: RunResult[]): ResultsResponse {
    return formatResultsResponse(runs);
  }
}