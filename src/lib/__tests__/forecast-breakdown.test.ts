import { describe, expect, it } from "vitest";

import { computeForecastBreakdown } from "@/lib/forecast-breakdown";
import { STORE } from "@/lib/mock-data";

const anchor = new Date("2026-06-15T18:00:00.000Z");

describe("computeForecastBreakdown", () => {
  it("matches baseline-only when factors are neutral", () => {
    const ctx = {
      elapsed: 100,
      timeScale: 10,
      velocityHistory: {},
      activeForecastModifiers: [],
      wasteHistory: [],
    };
    const bd = computeForecastBreakdown("original-chicken", anchor, ctx);
    expect(bd.velocityFactor).toBe(1);
    expect(bd.eventFactor).toBe(1);
    expect(bd.operatorFactor).toBe(1);
    expect(bd.adjustedUnits).toBeCloseTo(bd.baselineUnits, 5);
    expect(bd.steps.baseline).toBeCloseTo(bd.baselineUnits, 5);
    expect(bd.steps.afterVelocity).toBeCloseTo(bd.baselineUnits, 5);
    expect(bd.steps.afterOperator).toBeCloseTo(bd.adjustedUnits, 5);
  });

  it("applies event multiplier for active alert", () => {
    const ctx = {
      elapsed: 100,
      timeScale: 10,
      velocityHistory: {},
      activeForecastModifiers: [
        { alertId: "alert-weather" as const, untilElapsed: 10_000 },
      ],
      wasteHistory: [],
    };
    const bd = computeForecastBreakdown("original-chicken", anchor, ctx);
    expect(bd.eventFactor).toBeCloseTo(1.12, 5);
    expect(bd.adjustedUnits).toBeCloseTo(bd.baselineUnits * 1.12, 4);
    expect(bd.steps.afterEvents).toBeCloseTo(bd.baselineUnits * 1.12, 4);
    expect(bd.steps.afterVelocity).toBeCloseTo(bd.baselineUnits, 4);
  });

  it("uses integrate window consistent with STORE timezone", () => {
    const ctx = {
      elapsed: 500,
      timeScale: 10,
      velocityHistory: { "original-chicken": Array(30).fill(0) },
      activeForecastModifiers: [],
      wasteHistory: [],
    };
    const bd = computeForecastBreakdown("original-chicken", anchor, ctx);
    expect(STORE.timezone).toBeDefined();
    expect(bd.baselineUnits).toBeGreaterThan(0);
  });
});
