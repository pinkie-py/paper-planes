import { Injectable } from "@nestjs/common";
import { Simulation, SimulationConfig } from "./domain/simulation";

@Injectable()
export class AppService {
    getHello(): string {
        return "Airport Simulation API is running!";
    }

    runSimulation(config: SimulationConfig): any {
        const sim = new Simulation(config);
        const results = sim.run();
        
        return {
            status: "success",
            configurationUsed: config,
            results: results
        };
    }
}