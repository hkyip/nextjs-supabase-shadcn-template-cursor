import {
  FORECAST_DEFAULT_WINDOW_MINUTES,
  forecastUnitsInWindow,
  integrateExpectedUnits,
} from "@/lib/forecast";
import {
  ALERT_FORECAST_MULTIPLIERS,
  STORE,
  type ForecastModifierAlertId,
} from "@/lib/mock-data";

export type ActiveForecastModifier = {
  alertId: ForecastModifierAlertId;
  untilElapsed: number;
};

export type ForecastBreakdownContext = {
  /** Simulated elapsed seconds (aligned with production `elapsed`). */
  elapsed: number;
  /** Demo time scale (sim seconds per wall-second tick). */
  timeScale: number;
  /** Last N ticks of units sold from direct-serve simulation, per menu item (newest last). */
  velocityHistory: Record<string, number[]>;
  activeForecastModifiers: ActiveForecastModifier[];
  /** Waste units logged with simulated `elapsed` at creation. */
  wasteHistory: Array<{ elapsed: number; units: number }>;
};

export type ForecastBreakdown = {
  menuItemId: string;
  baselineUnits: number;
  velocityFactor: number;
  velocityNote: string;
  eventFactor: number;
  eventNote: string;
  operatorFactor: number;
  operatorNote: string;
  adjustedUnits: number;
  /** Cumulative expected units after each multiplicative factor (same window as baseline). */
  steps: {
    baseline: number;
    afterVelocity: number;
    afterEvents: number;
    afterOperator: number;
  };
};

const VELOCITY_WINDOW_TICKS = 30;
/** Simulated seconds of waste history for operator bump. */
const OPERATOR_WASTE_WINDOW_SIM_SECONDS = 600;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function eventFactorForItem(
  menuItemId: string,
  modifiers: ActiveForecastModifier[],
  currentElapsed: number,
): { factor: number; note: string } {
  const active = modifiers.filter((m) => m.untilElapsed > currentElapsed);
  if (active.length === 0) return { factor: 1, note: "No active event modifiers" };

  let factor = 1;
  const parts: string[] = [];
  for (const m of active) {
    const cfg = ALERT_FORECAST_MULTIPLIERS[m.alertId];
    if (!cfg) continue;
    const per = cfg.byMenuItemId[menuItemId] ?? 1;
    if (per !== 1) {
      factor *= per;
      parts.push(`${m.alertId} ×${per.toFixed(2)}`);
    }
  }
  const note =
    parts.length > 0 ? parts.join(" · ") : "Active alerts (neutral for this SKU)";
  return { factor, note };
}

function operatorFactorFromWaste(
  elapsed: number,
  wasteHistory: Array<{ elapsed: number; units: number }>,
): { factor: number; note: string } {
  const windowStart = elapsed - OPERATOR_WASTE_WINDOW_SIM_SECONDS;
  const units = wasteHistory
    .filter((w) => w.elapsed >= windowStart && w.elapsed <= elapsed)
    .reduce((s, w) => s + w.units, 0);
  const bump = Math.min(0.1, units * 0.025);
  const factor = 1 + bump;
  return {
    factor,
    note:
      units > 0
        ? `${units}u waste (last ${OPERATOR_WASTE_WINDOW_SIM_SECONDS / 60}m sim)`
        : "No recent hold-expiry waste",
  };
}

function velocityFactorForItem(
  menuItemId: string,
  now: Date,
  timeScale: number,
  history: Record<string, number[]>,
): { factor: number; note: string } {
  const series = history[menuItemId] ?? [];
  if (series.length < 3) {
    return { factor: 1, note: "Warming up velocity window" };
  }
  const slice = series.slice(-VELOCITY_WINDOW_TICKS);
  const observed = slice.reduce((a, b) => a + b, 0);
  /** Wall ticks × scale ≈ simulated seconds covered by the window. */
  const windowMs = VELOCITY_WINDOW_TICKS * timeScale * 1000;
  const start = new Date(now.getTime() - windowMs);
  const expected = integrateExpectedUnits(
    menuItemId,
    start,
    now,
    STORE.timezone,
  );
  const denom = Math.max(expected, 0.25);
  const raw = observed / denom;
  const factor = clamp(raw, 0.9, 1.15);
  return {
    factor,
    note: `Sold ${observed}u vs ~${expected.toFixed(1)}u expected (rolling window)`,
  };
}

export function computeForecastBreakdown(
  menuItemId: string,
  now: Date,
  ctx: ForecastBreakdownContext,
): ForecastBreakdown {
  const baselineUnits = forecastUnitsInWindow(
    menuItemId,
    now,
    FORECAST_DEFAULT_WINDOW_MINUTES,
    STORE.timezone,
  );

  const { factor: velocityFactor, note: velocityNote } = velocityFactorForItem(
    menuItemId,
    now,
    ctx.timeScale,
    ctx.velocityHistory,
  );
  const { factor: eventFactor, note: eventNote } = eventFactorForItem(
    menuItemId,
    ctx.activeForecastModifiers,
    ctx.elapsed,
  );
  const { factor: operatorFactor, note: operatorNote } = operatorFactorFromWaste(
    ctx.elapsed,
    ctx.wasteHistory,
  );

  const afterVelocity = baselineUnits * velocityFactor;
  const afterEvents = afterVelocity * eventFactor;
  const afterOperator = afterEvents * operatorFactor;

  return {
    menuItemId,
    baselineUnits,
    velocityFactor,
    velocityNote,
    eventFactor,
    eventNote,
    operatorFactor,
    operatorNote,
    adjustedUnits: afterOperator,
    steps: {
      baseline: baselineUnits,
      afterVelocity,
      afterEvents,
      afterOperator,
    },
  };
}
