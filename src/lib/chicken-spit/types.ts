/**
 * Domain types for the chicken-spit demo (Tahini's pilot deck v2).
 * All weights expressed in pounds (lbs). Times in seconds.
 */

/** Open-ended id so we can have 1, 2, or 3 spits. Existing seeds use spit-a/spit-b/spit-c. */
export type SpitId = string;

export type SpitState =
  | "loading"
  | "undercooked"
  | "ready"
  | "overcooking";

export interface Spit {
  id: SpitId;
  loadedAtMs: number;
  initialLbs: number;
  remainingLbs: number;
  cookProgress: number;
  state: SpitState;
  active: boolean;
}

export type GrillStatus = "idle" | "searing" | "overshoot";

export interface GrillTimer {
  status: GrillStatus;
  startedAtMs: number | null;
  elapsedSeconds: number;
}

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertKind =
  | "ready-to-shave"
  | "overcooking"
  | "grill-warning"
  | "grill-overshoot"
  | "steam-table-low"
  | "reprep-needed"
  | "stockout-imminent"
  | "food-safety-violation";

export interface SpitAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
  createdAtMs: number;
}

export type CookSpeed = "low" | "medium" | "high";
export type SpitScenario = "calm" | "lunch" | "dinner-rush";

/** Cook-speed effect on cook progression: low cooks slowest, high fastest. */
export const COOK_SPEED_MULTIPLIER: Record<CookSpeed, number> = {
  low: 0.7,
  medium: 1.0,
  high: 1.35,
};

export interface ChickenSpitConfigV1 {
  simulationSpeed: 1 | 5 | 60;
  cookTimeSecondsAt1x: number;
  readyWindowWidth: number;
  grillMinSeconds: number;
  portionLbs: number;
  newSpitLeadMinutes: number;

  /** Daily-setup config (deck §1: 1, 2, or 3 spits + cook speed) */
  numSpits: 1 | 2 | 3;
  cookSpeed: CookSpeed;
  /** Whether last night's spit is on the rotisserie at open */
  carryoverEnabled: boolean;
  scenario: SpitScenario;
}

/** Rolling KPI counters tied to deck §V0 Pilot Metrics. */
export interface SpitKpis {
  /** Times the steam table emptied with open POS demand. */
  stockoutEvents: number;
  /** Number of "good" cuts (in ideal ready window). */
  idealCuts: number;
  /** Total cuts (ideal + late + early). */
  totalCuts: number;
  /** Pulls from grill that landed before 30s SOP — food safety violations. */
  foodSafetyViolations: number;
  /** Total grill plate-ups across the session. */
  totalGrillPulls: number;
  /** History of (forecast lbs, actual lbs sold) per recent 15-min window for accuracy KPI. */
  forecastVsActual: Array<{ tMs: number; forecastLbs: number; actualLbs: number }>;
  /** Per-cook-cycle shrinkage % history (initial − pulled finished) / initial × 100. */
  shrinkageHistory: Array<{ tMs: number; spitId: SpitId; pct: number }>;
}

export interface ChickenSpitPersistedStateV1 {
  version: 1;
  config: ChickenSpitConfigV1;
  spits: Spit[];
  steamTablePortionsRemaining: number;
  steamTableCapacity: number;
  posVelocityPerMin: number;
  grillTimer: GrillTimer;
  alerts: SpitAlert[];
  acknowledgedAlertIds: string[];
  portionsSoldToday: number;
  lastTickMs: number | null;
  kpis: SpitKpis;
  /** Was the steam table empty on the previous tick? Used to debounce stockout events. */
  prevStockedout: boolean;
  /** Forecast bucket accumulator: actual lbs sold in the current 15-min wall window. */
  currentBucketActualLbs: number;
  currentBucketStartMs: number;
}
