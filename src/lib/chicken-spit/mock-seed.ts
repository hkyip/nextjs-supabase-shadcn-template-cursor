import type {
  ChickenSpitConfigV1,
  ChickenSpitPersistedStateV1,
  Spit,
} from "@/lib/chicken-spit/types";

export const DEFAULT_CHICKEN_SPIT_CONFIG: ChickenSpitConfigV1 = {
  simulationSpeed: 5,
  cookTimeSecondsAt1x: 60 * 60, // 1h cook
  readyWindowWidth: 0.18, // ~10 min ready window
  grillMinSeconds: 30,
  portionLbs: 0.4, // ~6.4oz portion
  newSpitLeadMinutes: 60,
};

/** Mock state: lunch rush is live, Spit A is half-shaved and approaching overcook. */
export function seedSpits(nowMs: number): Spit[] {
  return [
    {
      id: "spit-a",
      loadedAtMs: nowMs - 55 * 60 * 1000, // loaded 55min ago
      initialLbs: 12,
      remainingLbs: 3.5, // mid-shave, rapidly depleting
      cookProgress: 0.92, // nearly into overcook range
      state: "ready",
      active: true,
    },
    {
      id: "spit-b",
      loadedAtMs: nowMs,
      initialLbs: 0,
      remainingLbs: 0,
      cookProgress: 0,
      state: "loading",
      active: false,
    },
  ];
}

export function createInitialChickenSpitState(
  nowMs: number = Date.now(),
): ChickenSpitPersistedStateV1 {
  return {
    version: 1,
    config: { ...DEFAULT_CHICKEN_SPIT_CONFIG },
    spits: seedSpits(nowMs),
    steamTablePortionsRemaining: 4, // ~1.6lbs on steam table — running low
    steamTableCapacity: 12,
    posVelocityPerMin: 4, // 4 portions/min — busy lunch
    grillTimer: { status: "idle", startedAtMs: null, elapsedSeconds: 0 },
    alerts: [],
    acknowledgedAlertIds: [],
    portionsSoldToday: 187,
    lastTickMs: nowMs,
  };
}
