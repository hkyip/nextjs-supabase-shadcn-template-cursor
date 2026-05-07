import type {
  ChickenSpitConfigV1,
  ChickenSpitPersistedStateV1,
  Spit,
  SpitKpis,
  SpitScenario,
} from "@/lib/chicken-spit/types";

export const DEFAULT_CHICKEN_SPIT_CONFIG: ChickenSpitConfigV1 = {
  simulationSpeed: 5,
  cookTimeSecondsAt1x: 60 * 60, // 1h cook at medium speed
  readyWindowWidth: 0.18, // ~10 min ready window
  grillMinSeconds: 30,
  portionLbs: 0.4,
  newSpitLeadMinutes: 60,

  // Daily setup
  numSpits: 2,
  cookSpeed: "medium",
  carryoverEnabled: true,
  scenario: "lunch",
};

const SLOT_IDS = ["spit-a", "spit-b", "spit-c"] as const;

function emptySpit(id: string): Spit {
  return {
    id,
    loadedAtMs: 0,
    initialLbs: 0,
    remainingLbs: 0,
    cookProgress: 0,
    state: "loading",
    active: false,
  };
}

function freshSpitsArray(numSpits: 1 | 2 | 3): Spit[] {
  return Array.from({ length: numSpits }, (_, i) => emptySpit(SLOT_IDS[i]));
}

function emptyKpis(): SpitKpis {
  return {
    stockoutEvents: 0,
    idealCuts: 0,
    totalCuts: 0,
    foodSafetyViolations: 0,
    totalGrillPulls: 0,
    forecastVsActual: [],
    shrinkageHistory: [],
  };
}

function seedSpitsForScenario(
  scenario: SpitScenario,
  config: ChickenSpitConfigV1,
  nowMs: number,
): Spit[] {
  const spits = freshSpitsArray(config.numSpits);

  // Carryover toggle: if enabled, slot 0 is the morning carryover from last night
  if (config.carryoverEnabled && spits[0]) {
    if (scenario === "calm") {
      spits[0] = {
        ...spits[0],
        loadedAtMs: nowMs - 70 * 60_000,
        initialLbs: 8,
        remainingLbs: 6,
        cookProgress: 0.85,
        state: "ready",
        active: true,
      };
    } else if (scenario === "lunch") {
      spits[0] = {
        ...spits[0],
        loadedAtMs: nowMs - 55 * 60_000,
        initialLbs: 12,
        remainingLbs: 3.5,
        cookProgress: 0.92,
        state: "ready",
        active: true,
      };
    } else {
      // dinner-rush — carryover already mostly gone, lean spit
      spits[0] = {
        ...spits[0],
        loadedAtMs: nowMs - 70 * 60_000,
        initialLbs: 14,
        remainingLbs: 1.5,
        cookProgress: 1.05,
        state: "overcooking",
        active: true,
      };
    }
  } else if (spits[0]) {
    // No carryover — slot 0 is a fresh morning spit, mid-cook
    spits[0] = {
      ...spits[0],
      loadedAtMs: nowMs - 30 * 60_000,
      initialLbs: 12,
      remainingLbs: 12,
      cookProgress: 0.55,
      state: "undercooked",
      active: true,
    };
  }

  // For dinner-rush, also pre-load slot 1 (a fresh spit cooking) if available
  if (scenario === "dinner-rush" && spits[1]) {
    spits[1] = {
      ...spits[1],
      loadedAtMs: nowMs - 20 * 60_000,
      initialLbs: 12,
      remainingLbs: 12,
      cookProgress: 0.4,
      state: "undercooked",
      active: false,
    };
  }

  return spits;
}

export function createInitialChickenSpitState(
  nowMs: number = Date.now(),
  override: Partial<ChickenSpitConfigV1> = {},
): ChickenSpitPersistedStateV1 {
  const config: ChickenSpitConfigV1 = { ...DEFAULT_CHICKEN_SPIT_CONFIG, ...override };
  const spits = seedSpitsForScenario(config.scenario, config, nowMs);

  // Demand level by scenario
  const posVelocityPerMin =
    config.scenario === "calm" ? 2 : config.scenario === "lunch" ? 4 : 6;
  const steamTable =
    config.scenario === "calm" ? 8 : config.scenario === "lunch" ? 4 : 2;
  const portionsSoldToday =
    config.scenario === "calm" ? 60 : config.scenario === "lunch" ? 187 : 320;

  return {
    version: 1,
    config,
    spits,
    steamTablePortionsRemaining: steamTable,
    steamTableCapacity: 12,
    posVelocityPerMin,
    grillTimer: { status: "idle", startedAtMs: null, elapsedSeconds: 0 },
    alerts: [],
    acknowledgedAlertIds: [],
    portionsSoldToday,
    lastTickMs: nowMs,
    kpis: emptyKpis(),
    prevStockedout: false,
    currentBucketActualLbs: 0,
    currentBucketStartMs: nowMs,
  };
}

/** Backwards-compat seed for tests / older callers. */
export function seedSpits(nowMs: number): Spit[] {
  return seedSpitsForScenario("lunch", DEFAULT_CHICKEN_SPIT_CONFIG, nowMs);
}
