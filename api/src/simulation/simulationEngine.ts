import { Aircraft } from "../domain/aircraft";
import {
  AllocationPolicy,
  AircraftState,
  EmergencyStatus,
  FlightType,
  RunwayMode,
  RunwayStatus,
} from "../domain/types";
import { Runway } from "../domain/runway";
import { HoldingPattern } from "../queues/holdingPattern";
import { TakeoffQueue } from "../queues/takeoffQueue";


export class SimulationEngine {
  // UML-style private attributes
  private inboundFlowRate: number; // aircraft per hour
  private outboundFlowRate: number; // aircraft per hour

  private currentTime: Date;
  private tickMinutes: number;

  private runways: Runway[];
  private holdingPattern: HoldingPattern;
  private takeoffQueue: TakeoffQueue;

  // Engine-owned runway occupation tracking
  private runwayOccupiedUntil: Map<string, Date>;
  private runwayOccupiedBy: Map<string, Aircraft>;

  // Minimal metrics counters (wire to SimulationStats later)
  private cancelledCount: number = 0;
  private divertedCount: number = 0;
  private emergencyCount: number = 0;
  private processedLandings: number = 0;
  private processedTakeoffs: number = 0;

  constructor(
    startTime: Date,
    tickMinutes: number,
    inboundFlowRate: number,
    outboundFlowRate: number,
    runways: Runway[],
    maxTakeoffWaitMin: number = 30
  ) {
    this.currentTime = new Date(startTime);
    this.tickMinutes = tickMinutes;

    this.inboundFlowRate = inboundFlowRate;
    this.outboundFlowRate = outboundFlowRate;

    this.runways = runways;
    this.holdingPattern = new HoldingPattern();
    this.takeoffQueue = new TakeoffQueue(maxTakeoffWaitMin);

    this.runwayOccupiedUntil = new Map();
    this.runwayOccupiedBy = new Map();
  }

  // ---------------------------
  // UML METHOD: timeIncrement
  // ---------------------------
  public timeIncrement(t: Date): void {
    this.currentTime = new Date(t);

    
    for (const r of this.runways) {
      const key = r.getRunwayNumber();
      const until = this.runwayOccupiedUntil.get(key);

      // if occupied and time passed => release
      if (until && this.currentTime >= until) {
        this.runwayOccupiedUntil.delete(key);
        this.runwayOccupiedBy.delete(key);
        // set runway back to AVAILABLE if it is still OCCUPIED
        if (r.getStatus() === RunwayStatus.OCCUPIED) {
          r.setStatus(RunwayStatus.AVAILABLE);
        }
      }
    }

    // 2) generate inbound/outbound aircraft for this tick
    this.generateInboundForTick();
    this.generateOutboundForTick();

    // 3) cancel overdue departures
    const cancelled = this.takeoffQueue.cancelOverdue(this.currentTime);
    this.cancelledCount += cancelled.length;

    // 4) fuel burn + diversions for holding aircraft
    this.applyHoldingFuelBurnAndDiversions();

    // 5) promote newly-emergency aircraft in holding
    this.holdingPattern.promoteEmergencies();
  }

  public allocateRunways(policy: AllocationPolicy): void {
    for (const runway of this.runways) {
      if (!this.isRunwayFree(runway)) continue;

      // If runway is closed for any reason, skip
      const st = runway.getStatus();
      if (
        st === RunwayStatus.RUNWAY_INSPECTION ||
        st === RunwayStatus.SNOW_CLEARANCE ||
        st === RunwayStatus.EQUIPMENT_FAILURE
      ) {
        continue;
      }

      switch (policy) {
        case AllocationPolicy.LANDING_PRIORITY:
          this.allocateLandingThenTakeoff(runway);
          break;

        case AllocationPolicy.TAKEOFF_PRIORITY:
          this.allocateTakeoffThenLanding(runway);
          break;

        case AllocationPolicy.BALANCED:
          this.allocateBalanced(runway);
          break;
      }
    }
  }


  public applyClosure(r: Runway, status: RunwayStatus): void {
    r.setStatus(status);

    // If closing a runway, also clear engine-side occupation tracking
    if (status !== RunwayStatus.AVAILABLE && status !== RunwayStatus.OCCUPIED) {
      const key = r.getRunwayNumber();
      this.runwayOccupiedUntil.delete(key);
      this.runwayOccupiedBy.delete(key);
    }
  }


  public getTime(): Date {
    return new Date(this.currentTime);
  }

  public getCounters() {
    return {
      cancelledCount: this.cancelledCount,
      divertedCount: this.divertedCount,
      emergencyCount: this.emergencyCount,
      processedLandings: this.processedLandings,
      processedTakeoffs: this.processedTakeoffs,
      holdingSize: this.holdingPattern.size(),
      takeoffQueueSize: this.takeoffQueue.size(),
    };
  }



  private isRunwayFree(runway: Runway): boolean {
    // Use engine occupancy first
    const key = runway.getRunwayNumber();
    const until = this.runwayOccupiedUntil.get(key);
    if (until && this.currentTime < until) return false;

    // Also respect runway's own availability check (status-based)
    return runway.isAvailable(this.currentTime);
  }

  private occupyRunway(runway: Runway, aircraft: Aircraft, durationMin: number): void {
    const key = runway.getRunwayNumber();
    const until = new Date(this.currentTime.getTime() + durationMin * 60_000);

    runway.setStatus(RunwayStatus.OCCUPIED);
    this.runwayOccupiedBy.set(key, aircraft);
    this.runwayOccupiedUntil.set(key, until);
  }

  private allocateLandingThenTakeoff(runway: Runway): void {
    if (!this.supportsLanding(runway)) return;

    const landing = this.holdingPattern.dequeue();
    if (landing) {
      this.processLanding(runway, landing);
      return;
    }

    if (!this.supportsTakeoff(runway)) return;

    const takeoff = this.takeoffQueue.dequeue();
    if (takeoff) {
      this.processTakeoff(runway, takeoff);
    }
  }

  private allocateTakeoffThenLanding(runway: Runway): void {
    if (this.supportsTakeoff(runway)) {
      const takeoff = this.takeoffQueue.dequeue();
      if (takeoff) {
        this.processTakeoff(runway, takeoff);
        return;
      }
    }

    if (this.supportsLanding(runway)) {
      const landing = this.holdingPattern.dequeue();
      if (landing) {
        this.processLanding(runway, landing);
      }
    }
  }

  private allocateBalanced(runway: Runway): void {

    const holding = this.holdingPattern.size();
    const takeoff = this.takeoffQueue.size();

    if (holding >= takeoff) {
      this.allocateLandingThenTakeoff(runway);
    } else {
      this.allocateTakeoffThenLanding(runway);
    }
  }

  private supportsLanding(runway: Runway): boolean {
    const m = runway.getMode();
    return m === RunwayMode.LANDING || m === RunwayMode.MIXED;
  }

  private supportsTakeoff(runway: Runway): boolean {
    const m = runway.getMode();
    return m === RunwayMode.TAKEOFF || m === RunwayMode.MIXED;
  }

  private processLanding(runway: Runway, aircraft: Aircraft): void {
    aircraft.transitionTo(AircraftState.RUNWAY);

    // Duration modelling placeholder (replace with your variation model)
    this.occupyRunway(runway, aircraft, this.tickMinutes);

    // When landing completes, engine will release at timeIncrement()
    aircraft.transitionTo(AircraftState.EXITED);
    this.processedLandings += 1;
  }

  private processTakeoff(runway: Runway, aircraft: Aircraft): void {
    aircraft.transitionTo(AircraftState.RUNWAY);

    this.occupyRunway(runway, aircraft, this.tickMinutes);

    aircraft.transitionTo(AircraftState.EXITED);
    this.processedTakeoffs += 1;
  }

  private generateInboundForTick(): void {
    const expected = (this.inboundFlowRate / 60) * this.tickMinutes;
    if (Math.random() >= expected) return;

    // fuel 20-60 minutes, uniform
    const fuel = 20 + Math.floor(Math.random() * 41);

    const a = new Aircraft(
      `IN-${this.currentTime.getTime()}`,
      "OP",
      FlightType.INBOUND,
      new Date(this.currentTime),
      new Date(this.currentTime),
      fuel,
      EmergencyStatus.NONE
    );

    // If there is a landing-capable free runway, land immediately; else holding
    const free = this.findFreeRunwayForLanding();
    if (free) {
      this.processLanding(free, a);
    } else {
      this.holdingPattern.enqueue(a);
    }
  }

  private generateOutboundForTick(): void {
    const expected = (this.outboundFlowRate / 60) * this.tickMinutes;
    if (Math.random() >= expected) return;

    const a = new Aircraft(
      `OUT-${this.currentTime.getTime()}`,
      "OP",
      FlightType.OUTBOUND,
      new Date(this.currentTime),
      new Date(this.currentTime),
      0,
      EmergencyStatus.NONE
    );

    this.takeoffQueue.enqueue(a);
  }

  private findFreeRunwayForLanding(): Runway | null {
    for (const r of this.runways) {
      if (!this.supportsLanding(r)) continue;
      if (this.isRunwayFree(r)) return r;
    }
    return null;
  }

  private applyHoldingFuelBurnAndDiversions(): void {
    // Burn fuel for all aircraft currently in holding.
    // If fuelRemaining < 10 mins => divert
    const all = this.holdingPattern.getAll();

    // We need to remove diverted aircraft from holding.
    // Since HoldingPattern doesn't yet have a remove method, we do a simple rebuild:
    const survivors: Aircraft[] = [];

    for (const a of all) {
      const before = a.getFuelRemaining();
      a.consumeFuel(this.tickMinutes);

      if (a.isEmergency() && before > 10) {
        // first time it became emergency this tick
        this.emergencyCount += 1;
      }

      if (a.getFuelRemaining() < 10) {
        a.transitionTo(AircraftState.DIVERTED);
        this.divertedCount += 1;
      } else {
        survivors.push(a);
      }
    }

    // Rebuild holding queues in correct priority order
    // (This keeps your holding pattern logic consistent and simple.)
    // Clear by creating a new HoldingPattern and re-enqueue survivors
    this.holdingPattern = new HoldingPattern();
    for (const a of survivors) {
      this.holdingPattern.enqueue(a);
    }
  }
}