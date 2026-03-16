import { Body, Controller, Post } from "@nestjs/common";
import type { RunResult } from "./dto/run-result.dto";
import type { ResultsResponse } from "./dto/results-response.dto";
import { ResultsService } from "./results.service";

/**
 * NestJS Controller exposing the analytics endpoints.
 */
@Controller("results")
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  /**
   * POST /results/format
   * Accepts an array of raw RunResults and returns a formatted ResultsResponse (Rows & Scenario info)
   */
  @Post("format")
  formatRuns(@Body() runs: RunResult[]): ResultsResponse {
    return this.resultsService.formatRuns(runs);
  }
}