import { describe, expect, it, vi } from "vitest";

import {
  demoNowFromClock,
  setDemoClockTimeScale,
  syncDemoClockToWallNow,
  type DemoClockState,
} from "@/lib/demo-clock";

describe("setDemoClockTimeScale", () => {
  it("keeps demo instant fixed when changing scale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

    const w = Date.now();
    const clock: DemoClockState = {
      anchorWallMs: w,
      anchorDemoMs: w,
      timeScale: 10,
    };
    const before = demoNowFromClock(clock).getTime();

    vi.advanceTimersByTime(5000);
    const mid = demoNowFromClock(clock).getTime();
    expect(mid - before).toBe(50_000);

    const slower = setDemoClockTimeScale(clock, 1);
    const afterSwitch = demoNowFromClock(slower).getTime();
    expect(afterSwitch).toBe(mid);

    vi.advanceTimersByTime(2000);
    expect(demoNowFromClock(slower).getTime() - afterSwitch).toBe(2000);

    vi.useRealTimers();
  });
});

describe("syncDemoClockToWallNow", () => {
  it("makes demo instant equal to wall time at apply, keeps scale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T15:30:00.000Z"));

    const clock = {
      anchorWallMs: Date.now() - 10_000,
      anchorDemoMs: 0,
      timeScale: 10,
    };
    const synced = syncDemoClockToWallNow(clock);
    expect(synced.timeScale).toBe(10);
    expect(synced.anchorWallMs).toBe(synced.anchorDemoMs);
    expect(demoNowFromClock(synced).getTime()).toBe(Date.now());

    vi.useRealTimers();
  });
});
