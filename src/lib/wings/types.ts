/**
 * Domain types for the St. Louis Wings demo (Forkcast Wings PRD).
 * Wings are tracked in pounds (lbs); ~8 wings/lb shown as a derived hint.
 * All times in seconds (durations) or ms-since-epoch (instants).
 */

export type ScenarioPreset = "calm" | "pre-rush" | "peak";
export type OrderChannel = "dine-in" | "uber-eats" | "skip" | "pickup";
export type OrderStatus =
  | "queued" // POS placed, no basket assigned
  | "cooking" // assigned to a frying basket OR pulled from holding
  | "ready" // wings ready, awaiting plate-up / handoff
  | "served" // closed
  | "missed-sla"; // SLA elapsed, served late

export type BasketStatus =
  | "empty"
  | "frying"
  | "ready" // cooked but not yet pulled to holding bin
  | "overcook"; // past 7:30 + overshoot allowance

export type CoachKind =
  | "predrop-needed"
  | "game-ending"
  | "basket-overshoot"
  | "sla-tight"
  | "holding-decay"
  | "info";
export type CoachSeverity = "info" | "warning" | "critical";

export interface FryerBasket {
  id: string;
  index: number; // 0-based, for label "B1"…"B6"
  status: BasketStatus;
  weightLbs: number; // chicken in basket while frying
  startedAtMs: number | null;
  /** elapsed seconds since startedAt (recomputed on tick at sim speed) */
  elapsedSeconds: number;
}

export interface HoldingBin {
  weightLbs: number;
  /** ms-since-epoch of the OLDEST batch in the bin (for decay) */
  oldestBatchAtMs: number | null;
  capacityLbs: number;
}

export interface WingOrder {
  id: string;
  channel: OrderChannel;
  weightLbs: number;
  placedAtMs: number;
  servedAtMs: number | null;
  status: OrderStatus;
  /** SLA budget in seconds, by channel */
  slaSeconds: number;
}

export interface CoachEvent {
  id: string;
  kind: CoachKind;
  severity: CoachSeverity;
  message: string;
  createdAtMs: number;
  dismissed: boolean;
}

export interface DemandBucket {
  /** minutes from now to start of bucket (0, 5, 10) */
  startMinAhead: number;
  /** projected lbs of wings demanded in the bucket */
  projectedLbs: number;
  /** human label for the time window (e.g. "8:25–8:30 PM") */
  label: string;
}

export interface WingsConfigV1 {
  basketCount: 2 | 3 | 4 | 5 | 6;
  basketCapacityLbs: number; // typically 2.5 lb per basket
  cookSeconds: number; // 450 = 7:30
  /** allowed overshoot before basket flips to OVERCOOK */
  cookOvershootSeconds: number;
  /** wings quality decays after this many minutes in the holding bin */
  holdDecayMinutes: number;
  /** how many seconds we count "timer started in time" — PRD says 30s */
  timerStartGraceSeconds: number;
  /** simulation tick speed multiplier */
  simulationSpeed: 1 | 5 | 60;
  wingsPerLb: number;
  scenario: ScenarioPreset;
}

export interface WingsAdherence {
  timerPercent: number; // 0..100
  cookPercent: number; // 0..100
  totalCookCycles: number;
}

/** Pilot-deck KPIs (Service Speed / Throughput / Quality / Revenue / Planning Accuracy) */
export interface WingsKpis {
  /** Each dine-in served closes a partial table-turn; ~4 dine-in orders ≈ 1 turn. */
  dineinServed: number;
  /** Forecast vs. actual demand pairs from rolling 5-min buckets */
  forecastVsActual: Array<{ tMs: number; forecastLbs: number; actualLbs: number }>;
  /** Hardcoded baseline (lb sold per hour pre-AI). Deck implies modest 2-lb/day uplift. */
  baselineLbsPerHour: number;
  /** Realized revenue $ delta vs. baseline since session start */
  revenueLiftDollars: number;
}

export interface WingsPersistedStateV1 {
  version: 1;
  config: WingsConfigV1;
  baskets: FryerBasket[];
  holdingBin: HoldingBin;
  ordersOpen: WingOrder[];
  ordersClosed: WingOrder[]; // last ~30 served, kept for service-time KPI
  coachEvents: CoachEvent[];
  acknowledgedCoachIds: string[];
  /** demand wings/min (smoothed POS) — drives auto orders */
  posVelocityPerMin: number;
  /** when the next named event ("game ending") fires; null = no event */
  gameEndingAtMs: number | null;
  /** rolling KPIs */
  serviceTimeAvgSeconds: number;
  adherence: WingsAdherence;
  /** total wings sold today */
  wingsSoldToday: number;
  lastTickMs: number | null;
  /** deck KPIs */
  kpis: WingsKpis;
  /** rolling 5-min bucket accumulator for forecast vs. actual */
  currentBucketActualLbs: number;
  currentBucketStartMs: number;
}

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  "dine-in": "Dine-in",
  "uber-eats": "Uber Eats",
  skip: "Skip the Dishes",
  pickup: "Pickup",
};

export const CHANNEL_SLA_SECONDS: Record<OrderChannel, number> = {
  "dine-in": 8 * 60, // 8 min target table delivery
  pickup: 10 * 60, // 10 min pickup
  "uber-eats": 14 * 60, // 14 min total prep
  skip: 14 * 60,
};
