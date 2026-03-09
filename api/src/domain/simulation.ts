import { Aircraft } from './aircraft';
import { Runway } from './runway';
import { AircraftState, EmergencyStatus, FlightType, RunwayMode, RunwayStatus } from './types';

// Using a class instead of an interface so NestJS decorators can read it at runtime
export class SimulationConfig {
  inboundFlowRate: number; 
  outboundFlowRate: number; 
  runways: { id: string; mode: RunwayMode; status: RunwayStatus }[];
  durationMinutes: number; 
  runCount?: number; // NEW: Number of times to run the simulation
}

export class Simulation {
  private currentTime: Date;
  private holdingPattern: Aircraft[] = [];
  private takeoffQueue: Aircraft[] = [];
  private completedFlights: Aircraft[] = [];
  private divertedFlights: Aircraft[] = [];
  private cancelledFlights: Aircraft[] = [];
  private runways: Runway[];
  
  private aircraftCounter = 0;
  private readonly occupancyDurationMs = 3 * 60 * 1000; // Assume 3 mins to clear runway

  constructor(private config: SimulationConfig) {
    this.currentTime = new Date();
    this.runways = config.runways.map(
      (r) => new Runway(r.id, r.mode, r.status)
    );
  }

  public run(): any {
    for (let min = 0; min < this.config.durationMinutes; min++) {
      this.tick();
    }
    return this.generateMetrics();
  }

  private tick(): void {
    this.currentTime = new Date(this.currentTime.getTime() + 60 * 1000);
    this.spawnTraffic();
    this.updateAircraft();
    this.checkGlobalRunwayClosure();
    this.runways.forEach((r) => r.isAvailable(this.currentTime));
    this.allocateRunways();
  }

  private spawnTraffic() {
    const inboundProb = this.config.inboundFlowRate / 60;
    const outboundProb = this.config.outboundFlowRate / 60;

    if (Math.random() < inboundProb) {
      const fuel = Math.floor(Math.random() * (60 - 20 + 1) + 20); 
      const ac = new Aircraft(`IN-${++this.aircraftCounter}`, "OP", FlightType.INBOUND, this.currentTime, this.currentTime, fuel);
      ac.transitionTo(AircraftState.HOLDING);
      this.holdingPattern.push(ac);
    }

    if (Math.random() < outboundProb) {
      const ac = new Aircraft(`OUT-${++this.aircraftCounter}`, "OP", FlightType.OUTBOUND, this.currentTime, this.currentTime, 100);
      ac.transitionTo(AircraftState.TAKEOFF_QUEUE);
      this.takeoffQueue.push(ac);
    }
  }

  private updateAircraft() {
    for (let i = this.holdingPattern.length - 1; i >= 0; i--) {
      const ac = this.holdingPattern[i];
      ac.consumeFuel(1);
      if (ac.getFuelRemaining() < 10) {
        ac.transitionTo(AircraftState.DIVERTED);
        this.divertedFlights.push(ac);
        this.holdingPattern.splice(i, 1);
      }
    }

    for (let i = this.takeoffQueue.length - 1; i >= 0; i--) {
      const ac = this.takeoffQueue[i];
      ac.checkWaitTime(this.currentTime);
      if (ac.getState() === AircraftState.CANCELLED) {
        this.cancelledFlights.push(ac);
        this.takeoffQueue.splice(i, 1);
      }
    }
  }

  private checkGlobalRunwayClosure() {
    const hasAvailableRunway = this.runways.some(r => r.getStatus() === RunwayStatus.AVAILABLE || r.getStatus() === RunwayStatus.OCCUPIED);
    if (!hasAvailableRunway) {
      this.holdingPattern.forEach(ac => {
        ac.transitionTo(AircraftState.DIVERTED);
        this.divertedFlights.push(ac);
      });
      this.holdingPattern = [];

      this.takeoffQueue.forEach(ac => {
        ac.transitionTo(AircraftState.CANCELLED);
        this.cancelledFlights.push(ac);
      });
      this.takeoffQueue = [];
    }
  }

  private allocateRunways() {
    for (const runway of this.runways) {
      if (!runway.isAvailable(this.currentTime)) continue;

      const mode = runway.getMode();
      let assignedAircraft: Aircraft | null = null;

      if (mode === RunwayMode.LANDING) {
        assignedAircraft = this.popNextInbound();
      } else if (mode === RunwayMode.TAKEOFF) {
        assignedAircraft = this.popNextOutbound();
      } else if (mode === RunwayMode.MIXED) {
        assignedAircraft = this.popNextInbound(true) || 
                          (this.takeoffQueue.length > this.holdingPattern.length ? this.popNextOutbound() : this.popNextInbound()) ||
                          this.popNextOutbound();
      }

      if (assignedAircraft) {
        assignedAircraft.transitionTo(AircraftState.RUNWAY);
        assignedAircraft.setActualTime(this.currentTime);
        
        // TypeScript workaround
        (runway as any).occupiedBy = assignedAircraft;
        (runway as any).occupiedUntil = new Date(this.currentTime.getTime() + this.occupancyDurationMs);
        (runway as any).status = RunwayStatus.OCCUPIED;
        
        this.completedFlights.push(assignedAircraft);
      }
    }
  }

  private popNextInbound(emergencyOnly = false): Aircraft | null {
    if (this.holdingPattern.length === 0) return null;
    const emergencyIndex = this.holdingPattern.findIndex(ac => ac.isEmergency());
    if (emergencyIndex !== -1) return this.holdingPattern.splice(emergencyIndex, 1)[0];
    if (emergencyOnly) return null;
    return this.holdingPattern.shift() || null;
  }

  private popNextOutbound(): Aircraft | null {
    if (this.takeoffQueue.length === 0) return null;
    return this.takeoffQueue.shift() || null;
  }

  private generateMetrics() {
    const delays = this.completedFlights.map(ac => 
      (ac.getActualTime().getTime() - ac.getScheduledTime().getTime()) / 60000
    );
    const avgDelay = delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
    
    return {
      totalProcessed: this.completedFlights.length,
      diverted: this.divertedFlights.length,
      cancelled: this.cancelledFlights.length,
      averageDelayMins: avgDelay,
      holdingQueueSizeRemaining: this.holdingPattern.length,
      takeoffQueueSizeRemaining: this.takeoffQueue.length
    };
  }
}