import { findUtcForZonedWallClock, zonedParts } from "@/lib/forecast";

/** Simulated seconds advanced per wall-second tick (kitchen + forecast demo speed). */
export const DEMO_TIME_SCALE_DEFAULT = 1;

/** Supported timeline speeds vs wall clock (remote + local). */
export const DEMO_TIME_SCALES = [1, 10] as const;
export type DemoTimeScale = (typeof DEMO_TIME_SCALES)[number];

export type DemoClockState = {
  anchorWallMs: number;
  anchorDemoMs: number;
  timeScale: number;
};

export function createInitialDemoClock(): DemoClockState {
  const w = Date.now();
  return {
    anchorWallMs: w,
    anchorDemoMs: w,
    timeScale: DEMO_TIME_SCALE_DEFAULT,
  };
}

/** Virtual store clock instant (accelerated vs wall time). */
export function demoNowFromClock(clock: DemoClockState): Date {
  return new Date(
    clock.anchorDemoMs + (Date.now() - clock.anchorWallMs) * clock.timeScale,
  );
}

/**
 * Jump the demo clock so the store's local wall time becomes `hour`:`minute`
 * on the same calendar date as `referenceDemoInstant` in `timeZone`.
 */
export function jumpDemoClockToLocalTime(
  clock: DemoClockState,
  hour: number,
  minute: number,
  timeZone: string,
  referenceDemoInstant: Date,
): DemoClockState {
  const p = zonedParts(referenceDemoInstant, timeZone);
  const instant = findUtcForZonedWallClock(
    p.year,
    p.month,
    p.day,
    hour,
    minute,
    0,
    timeZone,
  );
  const wall = Date.now();
  return {
    ...clock,
    anchorWallMs: wall,
    anchorDemoMs: instant.getTime(),
  };
}

/**
 * Switch wall↔demo speed while keeping the **current demo instant** unchanged
 * (re-anchors so `demoNowFromClock` is continuous at the moment of change).
 */
export function setDemoClockTimeScale(
  clock: DemoClockState,
  timeScale: DemoTimeScale,
): DemoClockState {
  const wall = Date.now();
  const instantMs =
    clock.anchorDemoMs + (wall - clock.anchorWallMs) * clock.timeScale;
  return {
    ...clock,
    anchorWallMs: wall,
    anchorDemoMs: instantMs,
    timeScale,
  };
}

/**
 * Align the demo timeline with **real wall time** at this instant (UTC),
 * then keep advancing at `clock.timeScale`. Store-local “now” matches the device.
 */
export function syncDemoClockToWallNow(clock: DemoClockState): DemoClockState {
  const wall = Date.now();
  return {
    ...clock,
    anchorWallMs: wall,
    anchorDemoMs: wall,
  };
}
