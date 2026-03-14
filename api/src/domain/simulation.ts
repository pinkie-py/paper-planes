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
  runwayEmergencyProbability?: number; // ADDED
  aircraftEmergencyProbability?: number; // ADDED
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

export class Simulation {
  private currentTime: Date;

  private startTimeMs: number; // ADDED: Tracks simulation absolute start for accurate delay math
  private elapsedMinutes = 0;

  private holdingPattern: Aircraft[] = [];
  private takeoffQueue: Aircraft[] = [];
  private completedFlights: Aircraft[] = [];
  private divertedFlights: Aircraft[] = [];
  private cancelledFlights: Aircraft[] = [];
  private runways: Runway[];
  private log: SnapshotLogEntry[] = [];


  private allAircraft: Aircraft[] = [];
  private historyTicks: any[] = [];

  private inboundSpawnCarry = 0;
  private outboundSpawnCarry = 0;

  private aircraftCounter = 0;
  private readonly occupancyDurationMs = 60 * 1000;

  // Track natural closures to restore them later: { runwayNumber: recoveryTimeMs }
  private naturalClosures = new Map<string, number>();

  constructor(private config: SimulationConfig) {
    this.currentTime = new Date();
    this.startTimeMs = this.currentTime.getTime();
    this.runways = config.runways.map(
      (r) => new Runway(r.id, r.mode, r.status)
    );
    this.logEvent("Simulation initialized");
  }

  public step(): void {
    if (this.isFinished()) return;

    this.elapsedMinutes += 1;
    this.currentTime = new Date(this.currentTime.getTime() + 60 * 1000);

    // 1. Free up runways that have finished their previous landing/take-off
    this.runways.forEach((r) => r.isAvailable(this.currentTime));

    // 2. Roll for emergencies (now that runways have had a chance to become AVAILABLE)
    this.triggerNaturalEvents(); 

    // 3. Spawn new traffic and update existing waiting aircraft
    this.spawnTraffic();
    this.updateAircraft();

    // 4. Check if the natural events just closed the entire airport
    this.checkGlobalRunwayClosure();

    // 5. Assign waiting planes to whatever runways are still available
    this.allocateRunways();


    // 6. Record the history snapshot
    this.historyTicks.push({
      minute: this.elapsedMinutes,
      holdingCount: this.holdingPattern.length,
      takeoffQueueCount: this.takeoffQueue.length,
      occupiedRunwaysCount: this.runways.filter(
        (r) => r.getStatus() === RunwayStatus.OCCUPIED
      ).length,
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

  // REWRITTEN: Now perfectly generates the `RunResult` object for your analytics calculator!
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
      
      // If they made it to the runway successfully, treat them as fully processed (EXITED)
      if (st === AircraftState.RUNWAY) {
        st = AircraftState.EXITED;
      }

      // If they are still stuck in holding/takeoff at the end, their delay continues until simulation ends
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
    this.inboundSpawnCarry += this.config.inboundFlowRate / 60;
    this.outboundSpawnCarry += this.config.outboundFlowRate / 60;

    while (this.inboundSpawnCarry >= 1) {
      this.inboundSpawnCarry -= 1;

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
      this.allAircraft.push(ac); // IMPORTANT
    }

    while (this.outboundSpawnCarry >= 1) {
      this.outboundSpawnCarry -= 1;

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
      this.allAircraft.push(ac); // IMPORTANT
    }
  }

  // ADDED: Random events processor
  private triggerNaturalEvents() {
    // 1. Check if any natural closures have expired (restore runway)
    for (const [runwayNum, recoveryTime] of this.naturalClosures.entries()) {
      if (this.currentTime.getTime() >= recoveryTime) {
        const target = this.runways.find(r => this.extractRunwayNumber(r.getRunwayNumber()) === runwayNum);
        if (target && target.getStatus() !== RunwayStatus.AVAILABLE && target.getStatus() !== RunwayStatus.OCCUPIED) {
            target.setStatus(RunwayStatus.AVAILABLE);
            this.logEvent(`${target.getRunwayNumber()} has recovered and is now AVAILABLE`);
        }
        this.naturalClosures.delete(runwayNum);
      }
    }

    // 2. Roll for new Runway emergencies (Rolls every minute now!)
    const runwayProb = this.config.runwayEmergencyProbability ?? 0.005; // Set to 0.5% by default 
    this.runways.forEach(r => {
      // Only roll if it isn't already broken
      if (r.getStatus() === RunwayStatus.AVAILABLE || r.getStatus() === RunwayStatus.OCCUPIED) {
         if (Math.random() < runwayProb) {
             const isFailure = Math.random() < 0.5;
             const newStatus = isFailure ? RunwayStatus.EQUIPMENT_FAILURE : RunwayStatus.RUNWAY_INSPECTION;
             
             // If a plane is on it, wait for it to finish. Otherwise, break immediately.
             if (r.getStatus() === RunwayStatus.OCCUPIED) {
                 r.queueStatusChange(newStatus);
                 this.logEvent(`${r.getRunwayNumber()} will suffer ${newStatus} after current aircraft clears`);
             } else {
                 r.setStatus(newStatus);
                 this.logEvent(`${r.getRunwayNumber()} suffered ${newStatus}`);
             }
             
             // Setup recovery time (between 10 to 30 minutes)
             const recoveryMinutes = Math.floor(Math.random() * 20) + 10;
             const recoveryMs = this.currentTime.getTime() + (recoveryMinutes * 60 * 1000);
             this.naturalClosures.set(this.extractRunwayNumber(r.getRunwayNumber()), recoveryMs);
         }
      }
    });

    // 3. Roll for aircraft emergencies
    const aircraftProb = this.config.aircraftEmergencyProbability ?? 0.002; 
    this.holdingPattern.forEach(ac => {
        if (ac.triggerRandomEmergency(aircraftProb)) {
            this.logEvent(`EMERGENCY: ${ac.getAircraftID()} declared ${ac.getEmergencyStatus()}`);
        }
    });
  }

  private updateAircraft() {
    for (let i = this.holdingPattern.length - 1; i >= 0; i--) {
      const ac = this.holdingPattern[i];
      ac.consumeFuel(1);

      if (ac.getFuelRemaining() < 10 && ac.getEmergencyStatus() !== EmergencyStatus.FUEL) {
        this.logEvent(`EMERGENCY: ${ac.getAircraftID()} declared FUEL emergency`);
      }

      if (ac.getFuelRemaining() <= 0) {
        ac.transitionTo(AircraftState.DIVERTED);
        ac.setActualTime(this.currentTime); // ADDED: Record exact time of diversion
        this.divertedFlights.push(ac);
        this.holdingPattern.splice(i, 1);
        this.logEvent(`${ac.getAircraftID()} diverted due to critically low fuel`);
      }
    }

    for (let i = this.takeoffQueue.length - 1; i >= 0; i--) {
      const ac = this.takeoffQueue[i];
      ac.checkWaitTime(this.currentTime);

      if (ac.getState() === AircraftState.CANCELLED) {
        ac.setActualTime(this.currentTime); // ADDED: Record exact time of cancellation
        this.cancelledFlights.push(ac);
        this.takeoffQueue.splice(i, 1);
        this.logEvent(
          `${ac.getAircraftID()} cancelled after excessive wait`
        );
      }
    }
  }

  private checkGlobalRunwayClosure() {
    const hasAvailableRunway = this.runways.some(
      (r) =>
        r.getStatus() === RunwayStatus.AVAILABLE ||
        r.getStatus() === RunwayStatus.OCCUPIED
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

      if (this.holdingPattern.length || this.takeoffQueue.length) {
        this.logEvent(
          "All runways unavailable — holding aircraft diverted and outbound aircraft cancelled"
        );
      }

      this.holdingPattern = [];
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
        assignedAircraft =
          this.popNextInbound(true) ||
          (this.takeoffQueue.length > this.holdingPattern.length
            ? this.popNextOutbound()
            : this.popNextInbound()) ||
          this.popNextOutbound();
      }

      if (assignedAircraft) {
        assignedAircraft.transitionTo(AircraftState.RUNWAY);
        assignedAircraft.setActualTime(this.currentTime);

        runway.occupy(
          assignedAircraft,
          new Date(this.currentTime.getTime() + this.occupancyDurationMs)
        );

        this.completedFlights.push(assignedAircraft);

        const action =
          assignedAircraft.getType() === FlightType.INBOUND
            ? "landing"
            : "take-off";
        this.logEvent(
          `${assignedAircraft.getAircraftID()} assigned to ${runway.getRunwayNumber()} for ${action}`
        );
      }
    }
  }

  private popNextInbound(emergencyOnly = false): Aircraft | null {
    if (this.holdingPattern.length === 0) return null;

    const emergencyIndex = this.holdingPattern.findIndex((ac) =>
      ac.isEmergency()
    );
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