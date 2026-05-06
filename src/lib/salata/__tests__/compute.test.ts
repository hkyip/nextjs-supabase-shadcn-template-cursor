import { describe, expect, it } from "vitest";

import { aggregateWeatherAndEventPercents, laWeekdayIndexIsoDate } from "@/lib/salata/compute";
import type { EventSignal, SalataEventConfig } from "@/lib/salata/types";

const cfg: SalataEventConfig = {
  maxAdjustmentPercent: 25,
  walkableRadiusMiles: 1,
  morningPrepTime: "08:00",
  demoAmplified: true,
};

function sig(
  partial: Partial<EventSignal> & Pick<EventSignal, "id" | "type" | "impactWindow" | "cappedImpactPercent">,
): EventSignal {
  return {
    storeId: "x",
    name: "n",
    venueName: null,
    startTime: "2026-05-01T12:00:00",
    endTime: null,
    distanceMiles: null,
    walkabilityStrength: "global",
    expectedAttendance: null,
    confidence: "high",
    source: "mock",
    impactPercent: partial.cappedImpactPercent,
    applied: true,
    ignored: false,
    explanation: "",
    ...partial,
  };
}

describe("laWeekdayIndexIsoDate", () => {
  it("maps a known Friday in LA", () => {
    expect(laWeekdayIndexIsoDate("2026-05-01")).toBe(5);
  });
});

describe("aggregateWeatherAndEventPercents", () => {
  it("combines event and weather with total caps", () => {
    const signals: EventSignal[] = [
      sig({
        id: "a",
        type: "convention",
        impactWindow: "lunch",
        cappedImpactPercent: 14,
      }),
      sig({
        id: "b",
        type: "weather",
        impactWindow: "lunch",
        cappedImpactPercent: -5,
      }),
    ];
    const out = aggregateWeatherAndEventPercents(signals, cfg);
    expect(out.eventPct).toBe(14);
    expect(out.weatherPct).toBe(-5);
  });
});
