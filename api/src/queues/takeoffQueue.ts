import { Aircraft } from "../domain/aircraft";
import { AircraftState, FlightType } from "../domain/types";

export class TakeoffQueue {
  private queue: Aircraft[];
  private maxWaitMin: number;

  constructor(maxWaitMin: number = 30) {
    this.queue = [];
    this.maxWaitMin = maxWaitMin;
  }

  public enqueue(a: Aircraft): void {
    if (a.getType() !== FlightType.OUTBOUND) {
      throw new Error("Only OUTBOUND aircraft can enter takeoff queue.");
    }

    a.transitionTo(AircraftState.TAKEOFF_QUEUE);
    this.queue.push(a);
  }

  public dequeue(): Aircraft | null {
    return this.queue.shift() ?? null;
  }

  public peek(): Aircraft | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  public size(): number {
    return this.queue.length;
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Cancels aircraft that have exceeded max wait time.
   * Returns list of cancelled aircraft (for metrics).
   */
  public cancelOverdue(now: Date): Aircraft[] {
    const cancelled: Aircraft[] = [];

    this.queue = this.queue.filter((aircraft) => {
      const scheduled = aircraft.getScheduledTime();
      const waitedMin =
        (now.getTime() - scheduled.getTime()) / (60 * 1000);

      if (waitedMin > this.maxWaitMin) {
        aircraft.transitionTo(AircraftState.CANCELLED);
        cancelled.push(aircraft);
        return false; // remove from queue
      }

      return true;
    });

    return cancelled;
  }
}