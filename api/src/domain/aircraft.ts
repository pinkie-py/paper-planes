import { AircraftState, EmergencyStatus, FlightType } from "./types";

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
    // consumes fuel by delta minutes
    this.updateFuel(-delta);
  }

  public updateFuel(delta: number): void {
    this.fuelRemaining = Math.max(0, this.fuelRemaining + delta);

    // Auto-flag fuel emergency if below threshold 
    if (this.fuelRemaining <= 10 && this.emergencyStatus === EmergencyStatus.NONE) {
      this.emergencyStatus = EmergencyStatus.FUEL;
    }
  }

  public checkWaitTime(t: Date): void {
    // Cancellation is relevant for OUTBOUND aircraft waiting for takeoff.
    if (this.type !== FlightType.OUTBOUND) return;
    if (this.state !== AircraftState.TAKEOFF_QUEUE) return;

    const waitedMs = t.getTime() - this.scheduledTime.getTime();
    const waitedMin = waitedMs / (60 * 1000);

    //  cancel if waitTime > 30 minutes
    if (waitedMin > 30) {
      this.transitionTo(AircraftState.CANCELLED);
    }
  }

  public isEmergency(): boolean {
    return this.emergencyStatus !== EmergencyStatus.NONE;
  }

  // (Optional but very useful for the rest of the backend)
  public getState(): AircraftState {
    return this.state;
  }

  public getAircraftID(): string {
    return this.aircraftID;
  }

  public getOperator(): string {
    return this.operator;
  }


  public getScheduledTime(): Date {
    return this.scheduledTime;
  }

  public getActualTime(): Date {
    return this.actualTime;
  }

  public setActualTime(t: Date): void {
    this.actualTime = t;
  }

  public getFuelRemaining(): number {
    return this.fuelRemaining;
  }

  public getEmergencyStatus(): EmergencyStatus {
    return this.emergencyStatus;
  }

  public getType(): FlightType {
    return this.type;
  }
}