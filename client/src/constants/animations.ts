// Animation timing constants for consistent timing across components

// Fireball animation timings
export const FIREBALL_FLIGHT_DURATION = 0.3; // seconds - adjust this to make fireball faster/slower
export const FIREBALL_IMPACT_DURATION = 0.3; // seconds
export const FIREBALL_TOTAL_DURATION =
  FIREBALL_FLIGHT_DURATION + FIREBALL_IMPACT_DURATION; // Total time from launch to completion

// Convert to milliseconds for setTimeout usage
export const FIREBALL_FLIGHT_MS = FIREBALL_FLIGHT_DURATION * 1000;
export const FIREBALL_IMPACT_MS = FIREBALL_IMPACT_DURATION * 1000;
export const FIREBALL_TOTAL_MS = FIREBALL_TOTAL_DURATION * 1000;
