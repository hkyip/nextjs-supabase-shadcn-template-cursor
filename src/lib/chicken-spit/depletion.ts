import type {
  ChickenSpitPersistedStateV1,
  Spit,
} from "@/lib/chicken-spit/types";

export interface DepletionPoint {
  /** minutes from now (0..N) */
  minutesAhead: number;
  /** projected portions remaining at that minute */
  portionsRemaining: number;
}

export interface DepletionAnalysis {
  /** Total lbs of chicken accessible right now (active spit + steam table). */
  accessibleLbs: number;
  /** Total ready-to-serve portions (steam table + shavable from active spit). */
  accessiblePortions: number;
  /** Projected stockout time, ms epoch — null if no stockout in window */
  stockoutAtMs: number | null;
  /** Minutes until projected stockout (null if not in window) */
  minutesUntilStockout: number | null;
  /** Should we reprep now? (stockout < lead time + buffer) */
  shouldReprep: boolean;
  /** Recommended new spit weight in lbs (basic heuristic for demo) */
  recommendedNewSpitLbs: number;
  /** Sample points for the depletion chart, every minute over the next 90min */
  curve: DepletionPoint[];
}

const PROJECTION_MINUTES = 90;

export function analyzeDepletion(
  state: ChickenSpitPersistedStateV1,
  nowMs: number,
): DepletionAnalysis {
  const { config, spits, steamTablePortionsRemaining, posVelocityPerMin } =
    state;

  const activeSpit: Spit | undefined = spits.find((s) => s.active);
  const activeSpitLbs = activeSpit?.remainingLbs ?? 0;
  const accessibleLbs = activeSpitLbs;
  const portionsFromSpit = Math.floor(activeSpitLbs / config.portionLbs);
  const accessiblePortions =
    Math.max(0, steamTablePortionsRemaining) + portionsFromSpit;

  const curve: DepletionPoint[] = [];
  let stockoutAtMs: number | null = null;
  for (let m = 0; m <= PROJECTION_MINUTES; m += 1) {
    const consumed = posVelocityPerMin * m;
    const remaining = Math.max(0, accessiblePortions - consumed);
    curve.push({ minutesAhead: m, portionsRemaining: remaining });
    if (remaining <= 0 && stockoutAtMs == null) {
      stockoutAtMs = nowMs + m * 60 * 1000;
    }
  }

  const minutesUntilStockout =
    stockoutAtMs != null ? Math.round((stockoutAtMs - nowMs) / 60000) : null;

  // Reprep urgency: if stockout will happen before we can finish a fresh spit
  // (config.newSpitLeadMinutes), we need to reprep NOW.
  const shouldReprep =
    minutesUntilStockout != null &&
    minutesUntilStockout <= config.newSpitLeadMinutes + 10;

  // Heuristic: cover the next 2 hours of demand, capped at realistic single-spit
  // capacity (16 lb is the practical max for one rotisserie load).
  const lbsNeededFor2h = posVelocityPerMin * 120 * config.portionLbs;
  const recommendedNewSpitLbs = Math.max(
    4,
    Math.min(16, Math.round(lbsNeededFor2h - accessibleLbs)),
  );

  return {
    accessibleLbs: Math.round(accessibleLbs * 10) / 10,
    accessiblePortions,
    stockoutAtMs,
    minutesUntilStockout,
    shouldReprep,
    recommendedNewSpitLbs,
    curve,
  };
}
