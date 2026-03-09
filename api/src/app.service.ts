import { Injectable } from "@nestjs/common";
import { Simulation, SimulationConfig } from "./domain/simulation";
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AppService {
    // Define the path to our simplified JSON database
    private readonly dbPath = path.join(process.cwd(), 'simulation_db.json');

    getHello(): string {
        return "Airport Simulation API is running!";
    }

    runSimulation(config: SimulationConfig): any {
        const runs = config.runCount || 1;
        const allResults = [];

        for (let i = 0; i < runs; i++) {
            const sim = new Simulation(config);
            allResults.push(sim.run());
        }

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
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            
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

    // --- NEW: Database Functionality ---

    async saveSimulation(payload: any) {
        let db = [];
        try {
            // Read existing database
            const fileContent = await fs.readFile(this.dbPath, 'utf8');
            db = JSON.parse(fileContent);
        } catch (error) {
            // If file doesn't exist, we start with an empty array
        }

        // Fulfill SR-8: Store Simulation ID, Seed (Configuration), and Statistics
        const record = {
            id: payload.id || `SIM-${Date.now()}`,
            timestamp: new Date().toISOString(),
            seed: payload.configurationUsed, 
            statistics: {
                perRunResults: payload.perRunResults,
                aggregatedResults: payload.aggregatedResults
            }
        };

        db.push(record);
        
        // Write back to database
        await fs.writeFile(this.dbPath, JSON.stringify(db, null, 2));
        return record;
    }

    async getSavedSimulations() {
        try {
            const fileContent = await fs.readFile(this.dbPath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            return []; // Return empty if no runs saved yet
        }
    }
}