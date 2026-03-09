import { Injectable } from "@nestjs/common";
import { Simulation, SimulationConfig } from "./domain/simulation";

@Injectable()
export class AppService {
    getHello(): string {
        return "Airport Simulation API is running!";
    }

    runSimulation(config: SimulationConfig): any {
        const runs = config.runCount || 1;
        const allResults = [];

        // Execute the simulation 'runs' times
        for (let i = 0; i < runs; i++) {
            const sim = new Simulation(config);
            allResults.push(sim.run());
        }

        // Aggregate results across all runs
        const aggregated = this.aggregateMetrics(allResults);

        return {
            status: "success",
            configurationUsed: config,
            perRunResults: allResults,
            aggregatedResults: aggregated
        };
    }

    private aggregateMetrics(results: any[]) {
        if (!results || results.length === 0) return null;

        const keys = Object.keys(results[0]);
        const aggregated: Record<string, { mean: number; stdDev: number }> = {};

        for (const key of keys) {
            const values = results.map(r => r[key]);
            
            // Calculate Mean
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            
            // Calculate Standard Deviation (Sample)
            let stdDev = 0;
            if (values.length > 1) {
                const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
                stdDev = Math.sqrt(variance);
            }

            aggregated[key] = {
                mean: Number(mean.toFixed(2)),
                stdDev: Number(stdDev.toFixed(2))
            };
        }

        return aggregated;
    }
}