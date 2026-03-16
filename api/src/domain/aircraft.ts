import { AircraftState, EmergencyStatus, FlightType } from "./types";

/**
 * Represents a single aircraft moving through the simulation.
 * Tracks its lifecycle, fuel, schedule, and any emergencies.
 */
export class Aircraft {
  private aircraftID: string;
  private operator: string;
  private type: FlightType;
  private scheduledTime: Date;
  private actualTime: Date;
  private emergencyStatus: EmergencyStatus;
  private fuelRemaining: number;
  private state: AircraftState;

  constructor(
    aircraftID: string,
    operator: string,
    type: FlightType,
    scheduledTime: Date,
    actualTime: Date,
    fuelRemaining: number,
    emergencyStatus: EmergencyStatus = EmergencyStatus.NONE
  ) {
    this.aircraftID = aircraftID;
    this.operator = operator;
    this.type = type;
    this.scheduledTime = scheduledTime;
    this.actualTime = actualTime;
    this.emergencyStatus = emergencyStatus;
    this.fuelRemaining = fuelRemaining;

    this.state = AircraftState.ENTERING_SIM;
  }

  /**
   * Safely transitions the aircraft to a new state.
   * Prevents any state changes if the aircraft has reached a terminal state.
   */
  public transitionTo(s: AircraftState): void {
    if (
      this.state === AircraftState.EXITED ||
      this.state === AircraftState.CANCELLED ||
      this.state === AircraftState.DIVERTED
    ) {
      return;
    }
    this.state = s;
  }

  public consumeFuel(delta: number): void {
    this.updateFuel(-delta);
  }

  /**
   * Updates fuel and automatically declares an emergency if it drops to critical levels.
   */
  public updateFuel(delta: number): void {
    this.fuelRemaining = Math.max(0, this.fuelRemaining + delta);

    // Business Rule: Auto-flag fuel emergency if 10 mins or less remaining
    if (this.fuelRemaining <= 10 && this.emergencyStatus === EmergencyStatus.NONE) {
      this.emergencyStatus = EmergencyStatus.FUEL;
    }
  }

  /**
   * Evaluates if an outbound aircraft has been waiting in the queue for too long.
   */
  public checkWaitTime(t: Date): void {
    if (this.type !== FlightType.OUTBOUND) return;
    if (this.state !== AircraftState.TAKEOFF_QUEUE) return;

    const waitedMs = t.getTime() - this.scheduledTime.getTime();
    const waitedMin = waitedMs / (60 * 1000);

    // Business Rule: Hard cancellation if wait time exceeds 30 minutes
    if (waitedMin > 30) {
      this.transitionTo(AircraftState.CANCELLED);
    }
  }

  /**
   * Rolls a stochastic dice based on configured probabilities to spawn unexpected emergencies.
   */
  public triggerRandomEmergency(probability: number): boolean {
    if (this.emergencyStatus !== EmergencyStatus.NONE) return false;

    if (Math.random() < probability) {
      // 50/50 split between mechanical and passenger health issues
      this.emergencyStatus = Math.random() < 0.5 
        ? EmergencyStatus.MECHANICAL_FAILURE 
        : EmergencyStatus.PASSENGER_HEALTH;
      return true;
    }
    return false;
  }

  public isEmergency(): boolean {
    return this.emergencyStatus !== EmergencyStatus.NONE;
  }

  // ... [Standard Getters/Setters] ...
  public getState(): AircraftState { return this.state; }
  public getAircraftID(): string { return this.aircraftID; }
  public getOperator(): string { return this.operator; }
  public getScheduledTime(): Date { return this.scheduledTime; }
  public getActualTime(): Date { return this.actualTime; }
  public setActualTime(t: Date): void { this.actualTime = t; }
  public getFuelRemaining(): number { return this.fuelRemaining; }
  public getEmergencyStatus(): EmergencyStatus { return this.emergencyStatus; }
  public getType(): FlightType { return this.type; }
}