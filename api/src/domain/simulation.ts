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

  // ADDED: Master arrays to satisfy the analytics service requirements
  private allAircraft: Aircraft[] = [];
  private historyTicks: any[] = [];

  private aircraftCounter = 0;
  private readonly occupancyDurationMs = 3 * 60 * 1000;

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

    this.spawnTraffic();
    this.updateAircraft();
    this.checkGlobalRunwayClosure();
    this.runways.forEach((r) => r.isAvailable(this.currentTime));
    this.allocateRunways();

    // ADDED: Save a tick snapshot for the analytics module
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
      this.allAircraft.push(ac); // ADDED
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
      this.allAircraft.push(ac); // ADDED
    }
  }

  private updateAircraft() {
    for (let i = this.holdingPattern.length - 1; i >= 0; i--) {
      const ac = this.holdingPattern[i];
      ac.consumeFuel(1);

      if (ac.getFuelRemaining() < 10) {
        ac.transitionTo(AircraftState.DIVERTED);
        ac.setActualTime(this.currentTime); // ADDED: Record exact time of diversion
        this.divertedFlights.push(ac);
        this.holdingPattern.splice(i, 1);
        this.logEvent(`${ac.getAircraftID()} diverted due to low fuel`);
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
        ac.setActualTime(this.currentTime); // ADDED
        this.divertedFlights.push(ac);
      });
      this.takeoffQueue.forEach((ac) => {
        ac.transitionTo(AircraftState.CANCELLED);
        ac.setActualTime(this.currentTime); // ADDED
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