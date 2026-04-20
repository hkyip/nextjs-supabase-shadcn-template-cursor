import {
  FORECAST_DEMO_UNIT_SCALE,
  FORECAST_HOURLY_WEIGHT,
  MENU_ITEMS,
  STORE,
  type MenuItem,
} from "@/lib/mock-data";

export const FORECAST_DEFAULT_WINDOW_MINUTES = 30;

function menuItemOrThrow(menuItemId: string): MenuItem {
  const mi = MENU_ITEMS.find((m) => m.id === menuItemId);
  if (!mi) throw new Error(`Unknown menu item: ${menuItemId}`);
  return mi;
}

function hourlyWeights(menuItemId: string): readonly number[] {
  const w = FORECAST_HOURLY_WEIGHT[menuItemId];
  if (!w) throw new Error(`No forecast weights for menu item: ${menuItemId}`);
  return w;
}

function meanHourlyWeight(menuItemId: string): number {
  const w = hourlyWeights(menuItemId);
  return w.reduce((a, b) => a + b, 0) / 24;
}

/** Expected sales rate (units per second) for a local wall-clock hour. */
export function forecastRatePerSecondAtHour(
  menuItemId: string,
  hour: number,
): number {
  const mi = menuItemOrThrow(menuItemId);
  const w = hourlyWeights(menuItemId);
  const mean = meanHourlyWeight(menuItemId);
  const weight = w[hour] ?? 0;
  return (
    (1 / mi.salesIntervalSeconds) *
    (weight / mean) *
    FORECAST_DEMO_UNIT_SCALE
  );
}

export function zonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function getZonedHour(date: Date, timeZone: string): number {
  return zonedParts(date, timeZone).hour;
}

/**
 * Approximate UTC instant where `timeZone` shows the given local wall time.
 */
export function findUtcForZonedWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  let lo = Date.UTC(year, month - 1, day - 1, 12, 0, 0);
  let hi = Date.UTC(year, month - 1, day + 1, 12, 0, 0);
  const targetKey = year * 10000 + month * 100 + day;
  const targetSecs = hour * 3600 + minute * 60 + second;

  for (let i = 0; i < 56; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const p = zonedParts(new Date(mid), timeZone);
    const key = p.year * 10000 + p.month * 100 + p.day;
    const secs = p.hour * 3600 + p.minute * 60 + p.second;
    if (key < targetKey || (key === targetKey && secs < targetSecs)) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return new Date(lo);
}

export function startOfZonedDay(instant: Date, timeZone: string): Date {
  const p = zonedParts(instant, timeZone);
  return findUtcForZonedWallClock(
    p.year,
    p.month,
    p.day,
    0,
    0,
    0,
    timeZone,
  );
}

/** First instant of the next calendar day after `instant` in `timeZone`. */
export function startOfNextZonedDay(instant: Date, timeZone: string): Date {
  const sod = startOfZonedDay(instant, timeZone);
  const p0 = zonedParts(sod, timeZone);
  let t = sod.getTime() + 60_000;
  const limit = sod.getTime() + 50 * 3600 * 1000;
  while (t < limit) {
    const p = zonedParts(new Date(t), timeZone);
    if (p.day !== p0.day || p.month !== p0.month || p.year !== p0.year) {
      return findUtcForZonedWallClock(
        p.year,
        p.month,
        p.day,
        0,
        0,
        0,
        timeZone,
      );
    }
    t += 60_000;
  }
  return new Date(sod.getTime() + 24 * 3600 * 1000);
}

/**
 * Integrate expected unit demand between two instants (start inclusive, end exclusive).
 */
export function integrateExpectedUnits(
  menuItemId: string,
  startInclusive: Date,
  endExclusive: Date,
  timeZone: string = STORE.timezone,
): number {
  const msStart = startInclusive.getTime();
  const msEnd = endExclusive.getTime();
  if (msEnd <= msStart) return 0;

  let sum = 0;
  let t = msStart;
  while (t < msEnd) {
    const d = new Date(t);
    const hour = getZonedHour(d, timeZone);
    const rate = forecastRatePerSecondAtHour(menuItemId, hour);
    const nextMinute = Math.min(msEnd, Math.floor(t / 60_000) * 60_000 + 60_000);
    const sliceEnd = Math.min(nextMinute, msEnd);
    const seconds = (sliceEnd - t) / 1000;
    sum += rate * seconds;
    t = sliceEnd;
  }
  return sum;
}

/**
 * Expected units in `(now, now + windowMinutes]` from the time-based forecast only.
 */
export function forecastUnitsInWindow(
  menuItemId: string,
  now: Date,
  windowMinutes: number,
  timeZone: string = STORE.timezone,
): number {
  const end = new Date(now.getTime() + windowMinutes * 60_000);
  return integrateExpectedUnits(menuItemId, now, end, timeZone);
}

export type ForecastIntradayBucket = {
  start: Date;
  end: Date;
  label: string;
  units: number;
};

function formatBucketLabel(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/**
 * Full calendar day in `timeZone`, split into equal buckets (5 or 30 minutes).
 */
export function intradayBucketsForDate(
  menuItemId: string,
  day: Date,
  bucketMinutes: 5 | 30,
  timeZone: string = STORE.timezone,
): ForecastIntradayBucket[] {
  const sod = startOfZonedDay(day, timeZone);
  const nextMidnight = startOfNextZonedDay(day, timeZone);
  const msBucket = bucketMinutes * 60_000;
  const out: ForecastIntradayBucket[] = [];
  for (let t = sod.getTime(); t < nextMidnight.getTime(); t += msBucket) {
    const start = new Date(t);
    const end = new Date(Math.min(t + msBucket, nextMidnight.getTime()));
    const units = integrateExpectedUnits(menuItemId, start, end, timeZone);
    out.push({
      start,
      end,
      label: formatBucketLabel(start, timeZone),
      units,
    });
  }
  return out;
}
