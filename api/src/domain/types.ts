/**
 * Represents the direction of the flight.
 */
export enum FlightType {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
}

/**
 * Tracks the emergency status of an aircraft. 
 * Any status other than NONE gives the aircraft absolute priority in the holding queue.
 */
export enum EmergencyStatus {
  NONE = "NONE",
  FUEL = "FUEL", // Automatically triggered when fuel <= 10 mins
  MECHANICAL_FAILURE = "MECHANICAL_FAILURE",
  PASSENGER_HEALTH = "PASSENGER_HEALTH",
}

/**
 * The lifecycle state machine of an aircraft. 
 * EXITED, CANCELLED, and DIVERTED are terminal states.
 */
export enum AircraftState {
  ENTERING_SIM = "ENTERING_SIM",
  HOLDING = "HOLDING", // Waiting in the air (Inbound)
  TAKEOFF_QUEUE = "TAKEOFF_QUEUE", // Waiting on the ground (Outbound)
  RUNWAY = "RUNWAY", // Actively occupying a runway
  EXITED = "EXITED", // Successfully processed
  CANCELLED = "CANCELLED", // Outbound flight waited too long or airport closed
  DIVERTED = "DIVERTED", // Inbound flight ran out of fuel or airport closed
}

/**
 * Dictates what type of traffic a runway is allowed to accept.
 */
export enum RunwayMode {
  LANDING = "LANDING",
  TAKEOFF = "TAKEOFF",
  MIXED = "MIXED", // Accepts both, depending on queue sizes
}

/**
 * Represents the physical availability and health of a runway.
 */
export enum RunwayStatus {
  AVAILABLE = "AVAILABLE",
  OCCUPIED = "OCCUPIED", // Currently processing an aircraft
  RUNWAY_INSPECTION = "RUNWAY_INSPECTION",
  SNOW_CLEARANCE = "SNOW_CLEARANCE",
  EQUIPMENT_FAILURE = "EQUIPMENT_FAILURE",
}