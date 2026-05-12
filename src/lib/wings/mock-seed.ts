import type {
  FryerBasket,
  ScenarioPreset,
  WingOrder,
  WingsConfigV1,
  WingsPersistedStateV1,
} from "@/lib/wings/types";
import { CHANNEL_SLA_SECONDS } from "@/lib/wings/types";

export const DEFAULT_WINGS_CONFIG: WingsConfigV1 = {
  basketCount: 4,
  basketCapacityLbs: 2.5,
  cookSeconds: 7 * 60 + 30, // 7:30
  cookOvershootSeconds: 30, // 30s overshoot grace
  holdDecayMinutes: 10,
  timerStartGraceSeconds: 30,
  simulationSpeed: 5,
  wingsPerLb: 8,
  scenario: "pre-rush",
};

let _idSeed = 1;
function nextId(prefix: string): string {
  _idSeed += 1;
  return `${prefix}-${_idSeed}`;
}

function freshBaskets(count: number): FryerBasket[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `basket-${i + 1}`,
    index: i,
    status: "empty",
    weightLbs: 0,
    startedAtMs: null,
    elapsedSeconds: 0,
    pulledAtMs: null,
    shortfallSeconds: 0,
  }));
}

function seedOrdersForScenario(
  scenario: ScenarioPreset,
  nowMs: number,
): WingOrder[] {
  // Initial open orders are kept light on purpose: a heavy seed would drain
  // the seeded READY basket on the first sim tick and the operator would
  // never see state 4 (wings on rest / sauce & serve). Demand accrues
  // organically via arriveOrders() as the sim ticks forward.
  if (scenario === "calm") {
    return [mkOrder("dine-in", 0.5, nowMs - 30_000)];
  }
  if (scenario === "pre-rush") {
    // Empty so the seeded READY basket stays at exactly 18 wings on load,
    // matching the artifact reference. New orders accrue via arriveOrders().
    return [];
  }
  // peak — 3 small orders totaling 1.5 lb against a 2.25 lb READY basket
  return [
    mkOrder("dine-in", 0.5, nowMs - 60_000),
    mkOrder("uber-eats", 0.5, nowMs - 30_000),
    mkOrder("pickup", 0.5, nowMs - 10_000),
  ];
}

function mkOrder(
  channel: WingOrder["channel"],
  weightLbs: number,
  placedAtMs: number,
): WingOrder {
  return {
    id: nextId(`o-${channel}`),
    channel,
    weightLbs,
    placedAtMs,
    servedAtMs: null,
    status: "queued",
    slaSeconds: CHANNEL_SLA_SECONDS[channel],
  };
}

function seedBasketsForScenario(
  scenario: ScenarioPreset,
  config: WingsConfigV1,
  nowMs: number,
): FryerBasket[] {
  const baskets = freshBaskets(config.basketCount);
  if (scenario === "calm") {
    return baskets;
  }
  if (scenario === "pre-rush") {
    // All four baskets seeded in state 4 (wings on rest) with varied counts,
    // so the operator can demo PULL-to-fulfill from any fryer.
    // Counts: 18 / 20 / 14 / 24 wings.
    const readyAt = (lbs: number, agedMs: number) =>
      ({
        status: "ready" as const,
        weightLbs: lbs,
        startedAtMs: nowMs - agedMs,
        elapsedSeconds: config.cookSeconds,
      });
    if (baskets[0]) baskets[0] = { ...baskets[0], ...readyAt(2.25, 45_000) }; // 18
    if (baskets[1]) baskets[1] = { ...baskets[1], ...readyAt(2.5, 30_000) };  // 20
    if (baskets[2]) baskets[2] = { ...baskets[2], ...readyAt(1.75, 15_000) }; // 14
    if (baskets[3]) baskets[3] = { ...baskets[3], ...readyAt(3.0, 10_000) };  // 24
    return baskets;
  }
  // peak — mirrors the artifact wireframe composition + showcases all four states:
  //   F1 COOK (mid) · F2 SIT IN BASKET (state 4) · F3 COOK (near pull time) · F4 EMPTY
  if (baskets[0])
    baskets[0] = {
      ...baskets[0],
      status: "frying",
      weightLbs: config.basketCapacityLbs,
      startedAtMs: nowMs - 3 * 60_000,
      elapsedSeconds: 3 * 60, // ~4:30 remaining
    };
  if (baskets[1])
    baskets[1] = {
      ...baskets[1],
      status: "ready",
      weightLbs: 2.25, // 18 wings — artifact reference card
      startedAtMs: nowMs - 30_000,
      elapsedSeconds: config.cookSeconds,
    };
  if (baskets[2])
    baskets[2] = {
      ...baskets[2],
      status: "ready",
      weightLbs: 1.75, // 14 wings
      startedAtMs: nowMs - 60_000,
      elapsedSeconds: config.cookSeconds,
    };
  if (baskets[3])
    baskets[3] = {
      ...baskets[3],
      status: "ready",
      weightLbs: 2.75, // 22 wings
      startedAtMs: nowMs - 10_000,
      elapsedSeconds: config.cookSeconds,
    };
  return baskets;
}

export function createInitialWingsState(
  nowMs: number = Date.now(),
  override: Partial<WingsConfigV1> = {},
): WingsPersistedStateV1 {
  const config: WingsConfigV1 = { ...DEFAULT_WINGS_CONFIG, ...override };
  const baskets = seedBasketsForScenario(config.scenario, config, nowMs);

  // POS velocity (wings/min) by scenario
  const posVelocityPerMin =
    config.scenario === "calm" ? 6 : config.scenario === "pre-rush" ? 12 : 22;

  const holdingLbs =
    config.scenario === "calm" ? 1 : config.scenario === "pre-rush" ? 2 : 3.5;
  const oldestBatchAtMs =
    config.scenario === "calm"
      ? nowMs - 60_000
      : config.scenario === "pre-rush"
        ? nowMs - 90_000
        : nowMs - 4 * 60_000;

  const ordersOpen = seedOrdersForScenario(config.scenario, nowMs);

  // Game ending in 18 minutes for pre-rush, 6 minutes for peak, none for calm
  const gameEndingAtMs =
    config.scenario === "calm"
      ? null
      : config.scenario === "pre-rush"
        ? nowMs + 18 * 60_000
        : nowMs + 6 * 60_000;

  return {
    version: 1,
    config,
    baskets,
    holdingBin: {
      weightLbs: holdingLbs,
      oldestBatchAtMs: holdingLbs > 0 ? oldestBatchAtMs : null,
      capacityLbs: 12,
    },
    ordersOpen,
    ordersClosed: [],
    coachEvents: [],
    acknowledgedCoachIds: [],
    posVelocityPerMin,
    gameEndingAtMs,
    serviceTimeAvgSeconds:
      config.scenario === "calm"
        ? 7 * 60
        : config.scenario === "pre-rush"
          ? 9 * 60
          : 14 * 60,
    adherence: {
      timerPercent:
        config.scenario === "calm" ? 96 : config.scenario === "pre-rush" ? 93 : 84,
      cookPercent:
        config.scenario === "calm" ? 99 : config.scenario === "pre-rush" ? 96 : 88,
      totalCookCycles: config.scenario === "peak" ? 24 : 6,
    },
    wingsSoldToday:
      config.scenario === "calm" ? 84 : config.scenario === "pre-rush" ? 156 : 312,
    lastTickMs: nowMs,
    kpis: {
      dineinServed:
        config.scenario === "calm" ? 4 : config.scenario === "pre-rush" ? 8 : 18,
      forecastVsActual: [],
      baselineLbsPerHour: 5,
      revenueLiftDollars: 0,
      totalBasketCycles:
        config.scenario === "calm" ? 8 : config.scenario === "pre-rush" ? 24 : 47,
      undercookedPulls: 0,
      overcookedPulls:
        config.scenario === "peak" ? 2 : 0,
    },
    currentBucketActualLbs: 0,
    currentBucketStartMs: nowMs,
  };
}
