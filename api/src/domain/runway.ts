import { Aircraft } from "./aircraft";
import { FlightType, RunwayMode, RunwayStatus } from "./types";

/**
 * Represents a physical runway strip. 
 * Manages its current availability and the aircraft currently using it.
 */
export class Runway {
  private runwayNumber: string;
  private mode: RunwayMode;
  private status: RunwayStatus;
  private occupiedBy: Aircraft | null;
  private occupiedUntil: Date | null;
  
  // Holds a status change (like a failure or closure) if a plane is currently landing/taking off
  private pendingStatus: RunwayStatus | null;

  constructor(runwayNumber: string, mode: RunwayMode, status: RunwayStatus = RunwayStatus.AVAILABLE) {
    this.runwayNumber = runwayNumber;
    this.mode = mode;
    this.status = status;
    this.occupiedBy = null;
    this.occupiedUntil = null;
    this.pendingStatus = null;
  }

  /**
   * Instantly changes the status. If the runway is closed by this action, 
   * any occupying aircraft is effectively cleared (aborted).
   */
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

  /**
   * Safely queues a closure/failure to happen immediately after the current aircraft finishes.
   */
  public queueStatusChange(s: RunwayStatus): void {
    this.pendingStatus = s;
  }

  /**
   * Locks the runway for a specific duration while a plane uses it.
   */
  public occupy(ac: Aircraft, occupiedUntil: Date): void {
    this.occupiedBy = ac;
    this.occupiedUntil = occupiedUntil;
    this.status = RunwayStatus.OCCUPIED;
  }

  /**
   * Evaluates if the runway is free to take a new plane at the current time tick.
   */
  public isAvailable(t: Date): boolean {
    if (this.status !== RunwayStatus.AVAILABLE && this.status !== RunwayStatus.OCCUPIED) {
      return false;
    }

    // Check if the timer for the currently occupying aircraft has expired
    if (this.status === RunwayStatus.OCCUPIED) {
      if (this.occupiedUntil !== null && t >= this.occupiedUntil) {
        this.occupiedBy = null;
        this.occupiedUntil = null;

        // Apply any closures that were waiting for the plane to clear
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
  public getTimeRemainingSeconds(now: Date): number | null {
    if (!this.occupiedUntil || !this.occupiedBy) return null;
    return Math.max(0,Math.ceil((this.occupiedUntil.getTime() - now.getTime()) / 1000));
  }

  public getCurrentAction(): "Landing" | "Take-off" | "--" {
    if (!this.occupiedBy) return "--";
    return this.occupiedBy.getType() === FlightType.INBOUND ? "Landing": "Take-off";
  }
  
  // ... [Standard Getters/Setters] ...


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
}