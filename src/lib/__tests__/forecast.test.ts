import { describe, expect, it } from "vitest";

import {
  forecastRatePerSecondAtHour,
  forecastUnitsInWindow,
  integrateExpectedUnits,
  intradayBucketsForDate,
  startOfNextZonedDay,
  startOfZonedDay,
} from "@/lib/forecast";
import { STORE } from "@/lib/mock-data";

const TZ = STORE.timezone;
const ITEM = "original-chicken";

describe("forecast", () => {
  it("hourly rate is positive for every hour", () => {
    for (let h = 0; h < 24; h++) {
      expect(forecastRatePerSecondAtHour(ITEM, h)).toBeGreaterThan(0);
    }
  });

  it("full-day integral matches sum of 5-minute buckets", () => {
    const anchor = new Date("2026-06-15T15:00:00.000Z");
    const sod = startOfZonedDay(anchor, TZ);
    const end = startOfNextZonedDay(anchor, TZ);
    const total = integrateExpectedUnits(ITEM, sod, end, TZ);
    const buckets = intradayBucketsForDate(ITEM, anchor, 5, TZ);
    const sumBuckets = buckets.reduce((s, b) => s + b.units, 0);
    expect(sumBuckets).toBeCloseTo(total, 2);
  });

  it("5-minute and 30-minute bucket series sum to the same daily total", () => {
    const anchor = new Date("2026-11-02T12:00:00.000Z");
    const b5 = intradayBucketsForDate(ITEM, anchor, 5, TZ);
    const b30 = intradayBucketsForDate(ITEM, anchor, 30, TZ);
    const s5 = b5.reduce((s, b) => s + b.units, 0);
    const s30 = b30.reduce((s, b) => s + b.units, 0);
    expect(s5).toBeCloseTo(s30, 2);
  });

  it("longer horizon includes more expected units than shorter (same start)", () => {
    const now = new Date("2026-08-10T17:30:00.000Z");
    const w15 = forecastUnitsInWindow(ITEM, now, 15, TZ);
    const w30 = forecastUnitsInWindow(ITEM, now, 30, TZ);
    const w60 = forecastUnitsInWindow(ITEM, now, 60, TZ);
    expect(w15).toBeLessThanOrEqual(w30 + 1e-6);
    expect(w30).toBeLessThanOrEqual(w60 + 1e-6);
  });

  it("sliding the start forward changes the next-30m window", () => {
    const a = new Date("2026-03-01T14:00:00.000Z");
    const b = new Date(a.getTime() + 45 * 60_000);
    const fa = forecastUnitsInWindow(ITEM, a, 30, TZ);
    const fb = forecastUnitsInWindow(ITEM, b, 30, TZ);
    expect(fa).not.toBe(fb);
  });
});
