
import { Aircraft } from "../domain/aircraft";
import { AircraftState, FlightType } from "../domain/types";

export class HoldingPattern {
  private emergencyQueue: Aircraft[];
  private normalQueue: Aircraft[];

  constructor() {
    this.emergencyQueue = [];
    this.normalQueue = [];
  }

  /** Add inbound aircraft into holding pattern */
  public enqueue(a: Aircraft): void {
    if (a.getType() !== FlightType.INBOUND) {
      throw new Error("Only INBOUND aircraft can enter the holding pattern.");
    }

    a.transitionTo(AircraftState.HOLDING);

    if (a.isEmergency()) {
      this.emergencyQueue.push(a);
    } else {
      this.normalQueue.push(a);
    }
  }

  /**
   * Returns next aircraft to land:
   * - emergency first
   * - otherwise FIFO from normal queue
   */
  public dequeue(): Aircraft | null {
    if (this.emergencyQueue.length > 0) {
      return this.emergencyQueue.shift() ?? null;
    }
    if (this.normalQueue.length > 0) {
      return this.normalQueue.shift() ?? null;
    }
    return null;
  }

  public peek(): Aircraft | null {
    if (this.emergencyQueue.length > 0) return this.emergencyQueue[0];
    if (this.normalQueue.length > 0) return this.normalQueue[0];
    return null;
  }

  public size(): number {
    return this.emergencyQueue.length + this.normalQueue.length;
  }

  public isEmpty(): boolean {
    return this.size() === 0;
  }

  public getAll(): Aircraft[] {
    return [...this.emergencyQueue, ...this.normalQueue];
  }

  /**
   * If aircraft become emergencies while waiting (e.g., fuel drops and
   * Aircraft.emergencyStatus changes), move them to emergency queue.
   * Call this once per tick in the SimulationEngine.
   */
  public promoteEmergencies(): void {
    const stillNormal: Aircraft[] = [];

    for (const a of this.normalQueue) {
      if (a.isEmergency()) {
        this.emergencyQueue.push(a);
      } else {
        stillNormal.push(a);
      }
    }

    this.normalQueue = stillNormal;
  }
}