/**
 * Spit-level forecast logic. Maps demand drivers (POS history, weather, events)
 * to recommended new-spit weight in lbs.
 *
 * For the demo we keep this deterministic: 14-day average × per-weekday curve,
 * adjusted for current depletion + lookahead window.
 */

export interface ForecastInputs {
  /** lbs sold per hour, last 14d average for this weekday */
  baselineLbsPerHour: number;
  /** current local hour 0-23 (LA) */
  hourOfDay: number;
  /** weather skew — sunny patio bumps demand, rain dampens */
  weatherFactor: number; // ~0.85..1.15
  /** event factor — overlapping nearby event lifts demand */
  eventFactor: number; // ~1.0..1.30
  /** lookahead horizon in hours we want a spit to cover */
  horizonHours: number;
}

export interface ForecastBreakdown {
  recommendedLbs: number;
  baselineLbs: number;
  weatherDeltaLbs: number;
  eventDeltaLbs: number;
  reasonLines: string[];
}

/**
 * Per-hour demand multiplier — higher around lunch (12-2pm) and dinner (6-8pm),
 * tapers in shoulder hours. Calibrated for the demo.
 */
function hourDemandCurve(hour: number): number {
  const curve: Record<number, number> = {
    10: 0.4,
    11: 0.85,
    12: 1.45,
    13: 1.6,
    14: 1.1,
    15: 0.55,
    16: 0.55,
    17: 0.95,
    18: 1.4,
    19: 1.35,
    20: 0.85,
  };
  return curve[hour] ?? 0.3;
}

export function computeRecommendedSpitLbs(
  inputs: ForecastInputs,
): ForecastBreakdown {
  const reasonLines: string[] = [];
  let baselineLbs = 0;

  for (let i = 0; i < inputs.horizonHours; i += 1) {
    const h = (inputs.hourOfDay + i) % 24;
    baselineLbs += inputs.baselineLbsPerHour * hourDemandCurve(h);
  }

  const weatherDeltaLbs = baselineLbs * (inputs.weatherFactor - 1);
  const eventDeltaLbs = baselineLbs * (inputs.eventFactor - 1);

  reasonLines.push(
    `Baseline: ${baselineLbs.toFixed(1)} lbs over next ${inputs.horizonHours}h ` +
      `(14-day avg × hourly curve).`,
  );
  if (Math.abs(weatherDeltaLbs) > 0.3) {
    reasonLines.push(
      `${weatherDeltaLbs >= 0 ? "+" : ""}${weatherDeltaLbs.toFixed(1)} lbs · ` +
        `weather (factor ${inputs.weatherFactor.toFixed(2)}).`,
    );
  }
  if (Math.abs(eventDeltaLbs) > 0.3) {
    reasonLines.push(
      `+${eventDeltaLbs.toFixed(1)} lbs · nearby event ` +
        `(factor ${inputs.eventFactor.toFixed(2)}).`,
    );
  }

  // Round to nearest pound, min 4 lbs (smallest practical spit).
  const recommendedLbs = Math.max(
    4,
    Math.round(baselineLbs + weatherDeltaLbs + eventDeltaLbs),
  );
  return {
    recommendedLbs,
    baselineLbs: Math.round(baselineLbs * 10) / 10,
    weatherDeltaLbs: Math.round(weatherDeltaLbs * 10) / 10,
    eventDeltaLbs: Math.round(eventDeltaLbs * 10) / 10,
    reasonLines,
  };
}

export const DEMO_FORECAST_INPUTS: ForecastInputs = {
  baselineLbsPerHour: 6,
  hourOfDay: 13,
  weatherFactor: 1.08,
  eventFactor: 1.15,
  horizonHours: 4,
};
