/**
 * Domain types for the chicken-spit demo (Forkcast / Tahini's PRD §3-§5).
 * All weights expressed in pounds (lbs). Times in seconds.
 */

export type SpitId = "spit-a" | "spit-b";

export type SpitState =
  | "loading" // freshly loaded, internal temp ramping
  | "undercooked" // skin not yet golden — do NOT shave
  | "ready" // optimal shave window
  | "overcooking"; // dehydrating, urgent shave or pull

export interface Spit {
  id: SpitId;
  loadedAtMs: number; // simulated wall-clock ms
  initialLbs: number; // weight at load
  remainingLbs: number; // shrinks as we shave
  cookProgress: number; // 0..1.4 (>1 = overcooking)
  state: SpitState;
  active: boolean; // is this spit currently mounted on the rotisserie
}

export type GrillStatus = "idle" | "searing" | "overshoot";

export interface GrillTimer {
  status: GrillStatus;
  startedAtMs: number | null;
  /** elapsed seconds since startedAt, recomputed on tick */
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
  | "stockout-imminent";

export interface SpitAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
  createdAtMs: number;
}

export interface ChickenSpitConfigV1 {
  /** Demo simulation speed multiplier — 1×, 5×, 60× */
  simulationSpeed: 1 | 5 | 60;
  /** Cook time required to reach `ready` state, real-world seconds at 1× */
  cookTimeSecondsAt1x: number;
  /** Window before READY ends and OVERCOOKING begins, in cookProgress units */
  readyWindowWidth: number;
  /** Minimum sear time on flat-top grill before plating (food safety) */
  grillMinSeconds: number;
  /** Steam-table portion size in lbs */
  portionLbs: number;
  /** Lead time to load + cook a fresh spit, real-world minutes */
  newSpitLeadMinutes: number;
}

export interface ChickenSpitPersistedStateV1 {
  version: 1;
  config: ChickenSpitConfigV1;
  spits: Spit[];
  /** Portions on the steam table, ready to plate */
  steamTablePortionsRemaining: number;
  steamTableCapacity: number;
  /** Demand velocity, portions per minute (smoothed POS) */
  posVelocityPerMin: number;
  grillTimer: GrillTimer;
  alerts: SpitAlert[];
  acknowledgedAlertIds: string[];
  /** Portions sold today, for KPIs */
  portionsSoldToday: number;
  lastTickMs: number | null;
}
