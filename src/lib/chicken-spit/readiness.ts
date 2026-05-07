import type {
  ChickenSpitConfigV1,
  Spit,
  SpitState,
} from "@/lib/chicken-spit/types";
import { COOK_SPEED_MULTIPLIER } from "@/lib/chicken-spit/types";

/**
 * Cook progress regions (vision-AI mock):
 *   0.00..0.30  → loading (internal temp ramping, skin pale)
 *   0.30..0.82  → undercooked (golden building, do NOT shave)
 *   0.82..1.00  → ready (optimal shave window)
 *   1.00..1.20  → overcooking warning
 *   >1.20       → critical overcook
 */
export function deriveSpitState(progress: number): SpitState {
  if (progress < 0.3) return "loading";
  if (progress < 0.82) return "undercooked";
  if (progress < 1.0) return "ready";
  return "overcooking";
}

/** Seconds until the next state transition, given the current cook progress. */
export function secondsUntilNextStateChange(
  progress: number,
  config: ChickenSpitConfigV1,
): number {
  const state = deriveSpitState(progress);
  let targetProgress = 1;
  if (state === "loading") targetProgress = 0.3;
  else if (state === "undercooked") targetProgress = 0.82;
  else if (state === "ready") targetProgress = 1.0;
  else targetProgress = 1.2; // critical line
  const delta = Math.max(0, targetProgress - progress);
  // progress 1.0 = full cook time; so seconds = delta × cookTime
  return Math.round(delta * config.cookTimeSecondsAt1x);
}

/**
 * Advance a spit's cook progress and shrink remaining lbs based on simulated
 * shave events (driven by POS velocity in the parent tick).
 */
export function tickSpit(
  spit: Spit,
  config: ChickenSpitConfigV1,
  simSecondsElapsed: number,
  shavedLbsThisTick: number,
): Spit {
  if (!spit.active) return spit;
  // Cook progresses at the configured speed multiplier (low/medium/high).
  const speedMul = COOK_SPEED_MULTIPLIER[config.cookSpeed];
  const cookDelta = (simSecondsElapsed * speedMul) / config.cookTimeSecondsAt1x;
  const cookProgress = Math.min(1.4, spit.cookProgress + cookDelta);
  const remainingLbs = Math.max(0, spit.remainingLbs - shavedLbsThisTick);
  const state = deriveSpitState(cookProgress);
  return {
    ...spit,
    cookProgress,
    remainingLbs,
    state,
  };
}

/** A pretty label for the state pill. */
export const SPIT_STATE_LABEL: Record<SpitState, string> = {
  loading: "LOADING",
  undercooked: "UNDERCOOKED",
  ready: "READY TO SHAVE",
  overcooking: "OVERCOOKING",
};

/** A descriptive helper line for each state. */
export const SPIT_STATE_HINT: Record<SpitState, string> = {
  loading: "Skin still pale. Internal temp ramping — do not shave.",
  undercooked: "Golden building. Hold shaving until skin crisps.",
  ready: "Crisp golden crust. Optimal shave window — start shaving now.",
  overcooking: "Skin darkening. Shave aggressively or pull this spit.",
};
