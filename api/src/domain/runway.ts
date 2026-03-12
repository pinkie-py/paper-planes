import { Aircraft } from "./aircraft";
import { FlightType, RunwayMode, RunwayStatus } from "./types";

export class Runway {
  private runwayNumber: string;
  private mode: RunwayMode;
  private status: RunwayStatus;
  private occupiedBy: Aircraft | null;
  private occupiedUntil: Date | null;
  private pendingStatus: RunwayStatus | null;

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
    this.pendingStatus = null;
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

  public getPendingStatus(): RunwayStatus | null {
    return this.pendingStatus;
  }

  public setMode(m: RunwayMode): void {
    this.mode = m;
  }

  public setStatus(s: RunwayStatus): void {
    this.pendingStatus = null;
    this.status = s;

    if (
      s === RunwayStatus.RUNWAY_INSPECTION ||
      s === RunwayStatus.SNOW_CLEARANCE ||
      s === RunwayStatus.EQUIPMENT_FAILURE ||
      s === RunwayStatus.AVAILABLE
    ) {
      this.occupiedBy = null;
      this.occupiedUntil = null;
    }
  }

  public queueStatusChange(s: RunwayStatus): void {
    this.pendingStatus = s;
  }

  public occupy(ac: Aircraft, occupiedUntil: Date): void {
    this.occupiedBy = ac;
    this.occupiedUntil = occupiedUntil;
    this.status = RunwayStatus.OCCUPIED;
  }

  public getCurrentAction(): "Landing" | "Take-off" | "--" {
    if (!this.occupiedBy) return "--";
    return this.occupiedBy.getType() === FlightType.INBOUND
      ? "Landing"
      : "Take-off";
  }

  public getTimeRemainingSeconds(now: Date): number | null {
    if (!this.occupiedUntil || !this.occupiedBy) return null;
    return Math.max(
      0,
      Math.ceil((this.occupiedUntil.getTime() - now.getTime()) / 1000)
    );
  }

  public isAvailable(t: Date): boolean {
    if (
      this.status !== RunwayStatus.AVAILABLE &&
      this.status !== RunwayStatus.OCCUPIED
    ) {
      return false;
    }

    if (this.status === RunwayStatus.OCCUPIED) {
      if (this.occupiedUntil !== null && t >= this.occupiedUntil) {
        this.occupiedBy = null;
        this.occupiedUntil = null;

        if (this.pendingStatus) {
          this.status = this.pendingStatus;
          this.pendingStatus = null;
          return this.status === RunwayStatus.AVAILABLE;
        }

        this.status = RunwayStatus.AVAILABLE;
        return true;
      }
      return false;
    }

    return this.occupiedBy === null;
  }
}