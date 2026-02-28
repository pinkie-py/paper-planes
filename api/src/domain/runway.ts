import { Aircraft } from "./aircraft";
import { RunwayMode, RunwayStatus } from "./types";

export class Runway {
  private runwayNumber: string;
  private mode: RunwayMode;
  private status: RunwayStatus;
  private occupiedBy: Aircraft | null;
  private occupiedUntil: Date | null;

  constructor(
    runwayNumber: string,
    mode: RunwayMode,
    status: RunwayStatus = RunwayStatus.AVAILABLE
  ) {
    this.runwayNumber = runwayNumber;
    this.mode = mode;
    this.status = status;

    this.occupiedBy = null;
    this.occupiedUntil = null;
  }

  
  public getRunwayNumber(): string {
    return this.runwayNumber;
  }

  public getMode(): RunwayMode {
    return this.mode;
  }

  public getStatus(): RunwayStatus {
    return this.status;
  }

  public getOccupiedBy(): Aircraft | null {
    return this.occupiedBy;
  }

  public getOccupiedUntil(): Date | null {
    return this.occupiedUntil;
  }



  public setMode(m: RunwayMode): void {
    this.mode = m;
  }

  public setStatus(s: RunwayStatus): void {
    this.status = s;

    if (
      s === RunwayStatus.RUNWAY_INSPECTION ||
      s === RunwayStatus.SNOW_CLEARANCE ||
      s === RunwayStatus.EQUIPMENT_FAILURE
    ) {
      this.occupiedBy = null;
      this.occupiedUntil = null;
    }

    if (s === RunwayStatus.AVAILABLE) {
      this.occupiedBy = null;
      this.occupiedUntil = null;
    }
  }

  public isAvailable(t: Date): boolean {
    // Not available if runway is closed for any reason
    if (this.status !== RunwayStatus.AVAILABLE && this.status !== RunwayStatus.OCCUPIED) {
      return false;
    }

    // If runway is occupied, check if it should become available now
    if (this.status === RunwayStatus.OCCUPIED) {
      if (this.occupiedUntil !== null && t >= this.occupiedUntil) {
        // Release automatically when time passes
        this.status = RunwayStatus.AVAILABLE;
        this.occupiedBy = null;
        this.occupiedUntil = null;
        return true;
      }
      return false;
    }

    // AVAILABLE: ensure no current occupant
    return this.occupiedBy === null;
  }

}