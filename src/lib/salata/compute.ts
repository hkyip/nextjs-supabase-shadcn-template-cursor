import type {
  EventSignal,
  SalataEventConfig,
  SalataPrepItemId,
  SalataPrepPlanItem,
} from "@/lib/salata/types";

/** Map YYYY-MM-DD to weekday index Sun=0 in America/Los_Angeles (noon UTC anchor). */
export function laWeekdayIndexIsoDate(isoDate: string): number {
  const [y, mo, d] = isoDate.split("-").map((x) => Number(x));
  if (!y || !mo || !d) return 5;
  const utcNoon = Date.UTC(y, mo - 1, d, 12, 0, 0);
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
  }).format(new Date(utcNoon));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekdayShort] ?? 5;
}

const MORNING_IMPACT_WINDOWS = new Set<EventSignal["impactWindow"]>([
  "morning-prep",
  "lunch",
  "afternoon",
]);

function isMorningPlanSignal(s: EventSignal): boolean {
  if (s.ignored || !s.applied) return false;
  return MORNING_IMPACT_WINDOWS.has(s.impactWindow);
}

function clamp(n: number, max: number): number {
  return Math.min(Math.max(n, -max), max);
}

export function aggregateWeatherAndEventPercents(
  signals: EventSignal[],
  config: SalataEventConfig,
): { eventPct: number; weatherPct: number; reason: string } {
  let eventSum = 0;
  let weatherSum = 0;
  const reasons: string[] = [];

  for (const s of signals) {
    if (!isMorningPlanSignal(s)) continue;
    const eff = clamp(s.cappedImpactPercent, config.maxAdjustmentPercent);
    if (s.type === "weather") {
      weatherSum += eff;
      reasons.push(`${s.name} (${eff >= 0 ? "+" : ""}${eff}%)`);
    } else {
      eventSum += eff;
      reasons.push(`${s.name} (${eff >= 0 ? "+" : ""}${eff}%)`);
    }
  }

  const max = config.maxAdjustmentPercent;
  const eventPct = clamp(eventSum, max);
  const weatherPct = clamp(weatherSum, max);

  const reason =
    reasons.length > 0
      ? reasons.slice(0, 3).join(" · ")
      : "No applied event/weather signals for morning plan.";

  return { eventPct, weatherPct, reason };
}

export function buildPrepPlanItems(input: {
  prepDate: string;
  usageByWeekday: Record<SalataPrepItemId, number[]>;
  onHand: Record<SalataPrepItemId, number>;
  signals: EventSignal[];
  config: SalataEventConfig;
  managerOverrides: Partial<Record<SalataPrepItemId, number | null>>;
  savedFinalPrep: Partial<Record<SalataPrepItemId, number | null>>;
}): SalataPrepPlanItem[] {
  const wd = laWeekdayIndexIsoDate(input.prepDate);
  const { eventPct, weatherPct, reason } = aggregateWeatherAndEventPercents(
    input.signals,
    input.config,
  );

  const eventMult = 1 + eventPct / 100;
  const weatherMult = 1 + weatherPct / 100;

  const items: SalataPrepItemId[] = ["lettuce", "onion", "tomato"];

  return items.map((itemId) => {
    const baselineUsage = Math.round(input.usageByWeekday[itemId][wd] ?? 0);
    const onHand = input.onHand[itemId];
    const adjustedUsage = Math.ceil(baselineUsage * eventMult * weatherMult);
    const baselinePrep = Math.max(0, baselineUsage - onHand);
    const recommendedPrep = Math.max(0, adjustedUsage - onHand);
    const managerOverride = input.managerOverrides[itemId] ?? null;
    const finalPrep =
      input.savedFinalPrep[itemId] ??
      managerOverride ??
      recommendedPrep;

    const adjustmentPercent =
      baselineUsage <= 0
        ? 0
        : Math.round(((adjustedUsage / baselineUsage - 1) * 100) * 10) / 10;

    return {
      itemId,
      unitLabel: "Unit",
      onHand,
      baselineUsage,
      baselinePrep,
      adjustmentPercent,
      recommendedPrep,
      managerOverride,
      finalPrep,
      reason,
    };
  });
}
