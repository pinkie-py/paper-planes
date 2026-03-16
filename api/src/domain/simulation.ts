import { Aircraft } from "./aircraft";
import { Runway } from "./runway";
import {
  AircraftState,
  EmergencyStatus,
  FlightType,
  RunwayMode,
  RunwayStatus,
} from "./types";

export class SimulationConfig {
  inboundFlowRate: number;
  outboundFlowRate: number;
  runways: { id: string; mode: RunwayMode; status: RunwayStatus }[];
  durationMinutes: number;
  runCount?: number;
  seed?: number | null;
  runwayEmergencyProbability?: number;
  aircraftEmergencyProbability?: number;
  // ADDED: Type definition for incoming scheduled closures
  scheduledClosures?: { runwayId: string; startMinute: number; durationMinutes: number; reason: string }[]; 
}

export type SnapshotAircraft = {
  aircraftID: string;
  type: FlightType;
  state: AircraftState;
  emergencyStatus: EmergencyStatus;
  fuelRemainingMins: number;
  waitSeconds: number;
};

export type SnapshotRunway = {
  runwayNumber: string;
  mode: RunwayMode;
  status: RunwayStatus;
  occupiedBy: string | null;
  currentAction: "Landing" | "Take-off" | "--";
  timeRemainingSeconds: number | null;
  planePosPct: number | null;
};

export type SnapshotLogEntry = {
  at: string;
  message: string;
};

export type SimulationSnapshot = {
  scenarioName: string;
  seed: number | null;
  runIndex: number;
  runCountTotal: number;
  elapsedSeconds: number;
  runways: SnapshotRunway[];
  holding: SnapshotAircraft[];
  takeoff: SnapshotAircraft[];
  log: SnapshotLogEntry[];
};

/**
 * The core simulation engine. Manages the clock, the queues, and the active runways.
 */
export class Simulation {
  // Time tracking
  private currentTime: Date;
  private startTimeMs: number;
  private elapsedMinutes = 0;

  // Queues and Lists
  private holdingPattern: Aircraft[] = [];
  private takeoffQueue: Aircraft[] = [];
  private completedFlights: Aircraft[] = [];
  private divertedFlights: Aircraft[] = [];
  private cancelledFlights: Aircraft[] = [];
  private runways: Runway[];
  private log: SnapshotLogEntry[] = [];

  // Master tracking for Analytics/Metrics
  private allAircraft: Aircraft[] = [];
  private historyTicks: any[] = [];

  private aircraftCounter = 0;
  private readonly occupancyDurationMs = 3 * 60 * 1000; // 3 minutes to process a plane

  // Event Trackers
  private naturalClosures = new Map<string, number>();
  private activeScheduledClosures = new Map<string, number>();

  constructor(private config: SimulationConfig) {
    this.currentTime = new Date();
    this.startTimeMs = this.currentTime.getTime();
    this.runways = config.runways.map((r) => new Runway(r.id, r.mode, r.status));
    this.logEvent("Simulation initialized");
  }

/**
   * The master loop. Executes exactly one simulated minute of operations per call.
   * Order of operations is CRITICAL here to prevent statistical skipping.
   */
  public step(): void {
    if (this.isFinished()) return;

    this.elapsedMinutes += 1;
    this.currentTime = new Date(this.currentTime.getTime() + 60 * 1000);

    // 1. Free up runways that have finished processing their planes
    this.runways.forEach((r) => r.isAvailable(this.currentTime));

    // 2. Process deterministic scheduled closures (e.g. Snow Clearance)
    this.processScheduledEvents(); 
    
    // 3. Roll stochastic dice for random emergencies (e.g. Equipment Failure)
    this.triggerNaturalEvents(); 

    // 4. Generate new planes based on flow rates
    this.spawnTraffic();
    
    // 5. Burn fuel and check for timeout cancellations in the queues
    this.updateAircraft();
    
    // 6. If the airport is totally shut down, dump the queues
    this.checkGlobalRunwayClosure();
    
    // 7. Pull planes from the queues and assign them to available runways
    this.allocateRunways();

    // 8. Take a snapshot of queue sizes for the analytics engine
    this.historyTicks.push({
      minute: this.elapsedMinutes,
      holdingCount: this.holdingPattern.length,
      takeoffQueueCount: this.takeoffQueue.length,
      occupiedRunwaysCount: this.runways.filter((r) => r.getStatus() === RunwayStatus.OCCUPIED).length,
    });
  }
  public run(): any {
    while (!this.isFinished()) {
      this.step();
    }
    return this.getMetrics();
  }

  public isFinished(): boolean {
    return this.elapsedMinutes >= this.config.durationMinutes;
  }

  public updateRunways(
    runwayUpdates: { id: string; mode: RunwayMode; status: RunwayStatus }[]
  ) {
    for (const update of runwayUpdates) {
      const target = this.runways.find(
        (r) =>
          r.getRunwayNumber() === update.id ||
          this.extractRunwayNumber(r.getRunwayNumber()) ===
            this.extractRunwayNumber(update.id)
      );

      if (!target) continue;

      target.setMode(update.mode);

      // If a user manually updates a runway that was naturally closed, clear the natural recovery timer
      if (this.naturalClosures.has(target.getRunwayNumber())) {
          this.naturalClosures.delete(target.getRunwayNumber());
      }

      const occupiedNow =
        target.getStatus() === RunwayStatus.OCCUPIED &&
        target.getOccupiedBy() !== null;

      if (occupiedNow && update.status !== RunwayStatus.OCCUPIED) {
        target.queueStatusChange(update.status);
        this.logEvent(
          `${target.getRunwayNumber()} will switch to ${update.status} after current aircraft clears`
        );
      } else {
        target.setStatus(update.status);
        this.logEvent(
          `${target.getRunwayNumber()} updated to ${update.mode} / ${update.status}`
        );
      }
    }
  }

  public getSnapshot(
    runIndex: number,
    runCountTotal: number,
    seed: number | null = null
  ): SimulationSnapshot {
    return {
      scenarioName: "Configured Scenario",
      seed,
      runIndex,
      runCountTotal,
      elapsedSeconds: this.elapsedMinutes * 60,
      runways: this.runways.map((r) => {
        const remainingSeconds = r.getTimeRemainingSeconds(this.currentTime);
        let planePosPct: number | null = null;

        if (remainingSeconds !== null) {
          const remainingMs = remainingSeconds * 1000;
          const progress =
            1 -
            Math.min(
              1,
              Math.max(0, remainingMs / this.occupancyDurationMs)
            );
          planePosPct = 6 + progress * 98;
        }

        return {
          runwayNumber: this.extractRunwayNumber(r.getRunwayNumber()),
          mode: r.getMode(),
          status: r.getStatus(),
          occupiedBy: r.getOccupiedBy()?.getAircraftID() ?? null,
          currentAction: r.getCurrentAction(),
          timeRemainingSeconds: remainingSeconds,
          planePosPct,
        };
      }),
      holding: this.holdingPattern.map((ac) => ({
        aircraftID: ac.getAircraftID(),
        type: ac.getType(),
        state: ac.getState(),
        emergencyStatus: ac.getEmergencyStatus(),
        fuelRemainingMins: ac.getFuelRemaining(),
        waitSeconds: Math.max(
          0,
          Math.floor(
            (this.currentTime.getTime() - ac.getScheduledTime().getTime()) /
              1000
          )
        ),
      })),
      takeoff: this.takeoffQueue.map((ac) => ({
        aircraftID: ac.getAircraftID(),
        type: ac.getType(),
        state: ac.getState(),
        emergencyStatus: ac.getEmergencyStatus(),
        fuelRemainingMins: ac.getFuelRemaining(),
        waitSeconds: Math.max(
          0,
          Math.floor(
            (this.currentTime.getTime() - ac.getScheduledTime().getTime()) /
              1000
          )
        ),
      })),
      log: this.log,
    };
  }

  public getMetrics() {
    const configOut = {
      inboundFlowPerHour: this.config.inboundFlowRate,
      outboundFlowPerHour: this.config.outboundFlowRate,
      runways: this.config.runways.length,
      seed: this.config.seed ? String(this.config.seed) : "random",
    };

    const aircraftOut = this.allAircraft.map((ac) => {
      const schedMs = ac.getScheduledTime().getTime();
      let actMs = ac.getActualTime().getTime();

      let st = ac.getState();
      
      if (st === AircraftState.RUNWAY) {
        st = AircraftState.EXITED;
      }

      if (st === AircraftState.HOLDING || st === AircraftState.TAKEOFF_QUEUE) {
        actMs = this.currentTime.getTime();
      }

      const waitMins = Math.max(0, (actMs - schedMs) / 60000);

      return {
        aircraftId: ac.getAircraftID(),
        flightType: ac.getType(),
        finalState: st,
        holdingMinutes: ac.getType() === FlightType.INBOUND ? waitMins : 0,
        takeoffQueueMinutes: ac.getType() === FlightType.OUTBOUND ? waitMins : 0,
        scheduledMinute: Math.floor((schedMs - this.startTimeMs) / 60000),
        actualMinute: Math.floor((actMs - this.startTimeMs) / 60000),
        emergencyStatus: ac.getEmergencyStatus(),
      };
    });

    return {
      config: configOut,
      ticks: this.historyTicks,
      aircraft: aircraftOut,
    };
  }

  private spawnTraffic() {
    const inboundProb = this.config.inboundFlowRate / 60;
    const outboundProb = this.config.outboundFlowRate / 60;

    if (Math.random() < inboundProb) {
      const fuel = Math.floor(Math.random() * (60 - 20 + 1) + 20);
      const ac = new Aircraft(
        `IN-${++this.aircraftCounter}`,
        "OP",
        FlightType.INBOUND,
        this.currentTime,
        this.currentTime,
        fuel
      );
      ac.transitionTo(AircraftState.HOLDING);
      this.holdingPattern.push(ac);
      this.allAircraft.push(ac); 
    }

    if (Math.random() < outboundProb) {
      const ac = new Aircraft(
        `OUT-${++this.aircraftCounter}`,
        "OP",
        FlightType.OUTBOUND,
        this.currentTime,
        this.currentTime,
        100
      );
      ac.transitionTo(AircraftState.TAKEOFF_QUEUE);
      this.takeoffQueue.push(ac);
      this.allAircraft.push(ac);
    }
  }

  /**
   * Processes deterministic, user-configured closures based on the elapsed minute.
   */
  private processScheduledEvents() {
    // End scheduled closures if duration has elapsed
    for (const [runwayNum, endMinute] of this.activeScheduledClosures.entries()) {
      if (this.elapsedMinutes >= endMinute) {
        const target = this.runways.find(r => this.extractRunwayNumber(r.getRunwayNumber()) === runwayNum);
        if (target && target.getStatus() !== RunwayStatus.AVAILABLE && target.getStatus() !== RunwayStatus.OCCUPIED) {
            target.setStatus(RunwayStatus.AVAILABLE);
        }
        this.activeScheduledClosures.delete(runwayNum);
      }
    }

    // Start scheduled closures if their minute has arrived
    const startingNow = this.config.scheduledClosures?.filter(c => c.startMinute === this.elapsedMinutes) || [];
    for (const closure of startingNow) {
      const rNum = this.extractRunwayNumber(closure.runwayId);
      const target = this.runways.find(r => this.extractRunwayNumber(r.getRunwayNumber()) === rNum);
      
      if (target) {
        const reason = closure.reason as RunwayStatus;
        if (target.getStatus() === RunwayStatus.OCCUPIED) {
            target.queueStatusChange(reason);
        } else {
            target.setStatus(reason);
        }
        
        // Remove from natural closures so a random event doesn't accidentally "recover" a scheduled event early
        this.naturalClosures.delete(rNum);
        this.activeScheduledClosures.set(rNum, closure.startMinute + closure.durationMinutes);
      }
    }
  }

  /**
   * Processes stochastic (random) events based on configured probability percentages.
   */
  private triggerNaturalEvents() {
    // 1. Recover runways whose random downtime has expired
    for (const [runwayNum, recoveryTime] of this.naturalClosures.entries()) {
      if (this.currentTime.getTime() >= recoveryTime) {
        const target = this.runways.find(r => this.extractRunwayNumber(r.getRunwayNumber()) === runwayNum);
        
        // Only recover it if it isn't currently under a SCHEDULED closure
        if (target && !this.activeScheduledClosures.has(runwayNum) && target.getStatus() !== RunwayStatus.AVAILABLE && target.getStatus() !== RunwayStatus.OCCUPIED) {
            target.setStatus(RunwayStatus.AVAILABLE);
        }
        this.naturalClosures.delete(runwayNum);
      }
    }

    // 2. Roll for new Runway emergencies
    const runwayProb = this.config.runwayEmergencyProbability ?? 0.02; 
    this.runways.forEach(r => {
      const rNum = this.extractRunwayNumber(r.getRunwayNumber());
      
      // Skip rolling the dice if this runway is currently enduring a SCHEDULED closure
      if (this.activeScheduledClosures.has(rNum)) return;

      if (r.getStatus() === RunwayStatus.AVAILABLE || r.getStatus() === RunwayStatus.OCCUPIED) {
         if (Math.random() < runwayProb) {
             const isFailure = Math.random() < 0.5;
             const newStatus = isFailure ? RunwayStatus.EQUIPMENT_FAILURE : RunwayStatus.RUNWAY_INSPECTION;
             
             if (r.getStatus() === RunwayStatus.OCCUPIED) {
                 r.queueStatusChange(newStatus);
             } else {
                 r.setStatus(newStatus);
             }
             
             // Randomize a recovery time between 10 and 30 minutes
             const recoveryMinutes = Math.floor(Math.random() * 20) + 10;
             const recoveryMs = this.currentTime.getTime() + (recoveryMinutes * 60 * 1000);
             this.naturalClosures.set(rNum, recoveryMs);
         }
      }
    });

    // 3. Roll for aircraft emergencies
    const aircraftProb = this.config.aircraftEmergencyProbability ?? 0.002; 
    this.holdingPattern.forEach(ac => {
        ac.triggerRandomEmergency(aircraftProb);
    });
  }

  /**
   * Burns fuel for holding planes, and processes timeouts for the queues.
   */
  private updateAircraft() {
    for (let i = this.holdingPattern.length - 1; i >= 0; i--) {
      const ac = this.holdingPattern[i];
      ac.consumeFuel(1); // Burns 1 minute of fuel

      // Terminal State: Ran completely out of fuel
      if (ac.getFuelRemaining() <= 0) {
        ac.transitionTo(AircraftState.DIVERTED);
        ac.setActualTime(this.currentTime);
        this.divertedFlights.push(ac);
        this.holdingPattern.splice(i, 1);
      }
    }

    for (let i = this.takeoffQueue.length - 1; i >= 0; i--) {
      const ac = this.takeoffQueue[i];
      ac.checkWaitTime(this.currentTime); // Triggers cancellation if > 30 mins

      if (ac.getState() === AircraftState.CANCELLED) {
        ac.setActualTime(this.currentTime); 
        this.cancelledFlights.push(ac);
        this.takeoffQueue.splice(i, 1);
      }
    }
  }

  /**
   * Safety catch: If all runways are broken, immediately clear the sky and the ground.
   */
  private checkGlobalRunwayClosure() {
    const hasAvailableRunway = this.runways.some(
      (r) => r.getStatus() === RunwayStatus.AVAILABLE || r.getStatus() === RunwayStatus.OCCUPIED
    );

    if (!hasAvailableRunway) {
      this.holdingPattern.forEach((ac) => {
        ac.transitionTo(AircraftState.DIVERTED);
        ac.setActualTime(this.currentTime);
        this.divertedFlights.push(ac);
      });
      this.takeoffQueue.forEach((ac) => {
        ac.transitionTo(AircraftState.CANCELLED);
        ac.setActualTime(this.currentTime); 
        this.cancelledFlights.push(ac);
      });

      this.holdingPattern = [];
      this.takeoffQueue = [];
    }
  }

  /**
   * Pulls planes from queues and assigns them to available runways based on mode and priority.
   */
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
        // Mixed Mode Logic:
        // 1. ALWAYS check for inbound emergencies first (emergencyOnly = true)
        // 2. Otherwise, serve whichever queue is currently longest
        assignedAircraft =
          this.popNextInbound(true) ||
          (this.takeoffQueue.length > this.holdingPattern.length
            ? this.popNextOutbound()
            : this.popNextInbound()) ||
          this.popNextOutbound();
      }

      // If a plane was successfully popped from a queue, lock the runway
      if (assignedAircraft) {
        assignedAircraft.transitionTo(AircraftState.RUNWAY);
        assignedAircraft.setActualTime(this.currentTime);

        runway.occupy(
          assignedAircraft,
          new Date(this.currentTime.getTime() + this.occupancyDurationMs)
        );

        this.completedFlights.push(assignedAircraft);
      }
    }
  }

  /**
   * Safely retrieves the next inbound flight from the holding pattern.
   * Scans for emergencies first and bypasses the FIFO queue if one is found.
   */
  private popNextInbound(emergencyOnly = false): Aircraft | null {
    if (this.holdingPattern.length === 0) return null;

    const emergencyIndex = this.holdingPattern.findIndex((ac) => ac.isEmergency());
    if (emergencyIndex !== -1) {
      return this.holdingPattern.splice(emergencyIndex, 1)[0];
    }

    if (emergencyOnly) return null;
    return this.holdingPattern.shift() || null;
  }

  private popNextOutbound(): Aircraft | null {
    if (this.takeoffQueue.length === 0) return null;
    return this.takeoffQueue.shift() || null;
  }

  private logEvent(message: string) {
    const at = `${Math.floor(this.elapsedMinutes / 60)}:${String(
      this.elapsedMinutes % 60
    ).padStart(2, "0")}`;
    this.log = [{ at, message }, ...this.log].slice(0, 20);
  }

  private extractRunwayNumber(id: string) {
    const match = String(id).match(/(\d{2})$/);
    return match ? match[1] : String(id);
  }
}