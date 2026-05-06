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
  }));
}

function seedOrdersForScenario(
  scenario: ScenarioPreset,
  nowMs: number,
): WingOrder[] {
  if (scenario === "calm") {
    return [
      mkOrder("dine-in", 1.0, nowMs - 60_000),
      mkOrder("pickup", 0.75, nowMs - 30_000),
    ];
  }
  if (scenario === "pre-rush") {
    return [
      mkOrder("dine-in", 1.5, nowMs - 90_000),
      mkOrder("pickup", 0.75, nowMs - 60_000),
      mkOrder("uber-eats", 1.25, nowMs - 30_000),
    ];
  }
  // peak
  return [
    mkOrder("dine-in", 1.5, nowMs - 4 * 60_000),
    mkOrder("dine-in", 1.0, nowMs - 3 * 60_000),
    mkOrder("uber-eats", 1.25, nowMs - 2 * 60_000),
    mkOrder("skip", 1.5, nowMs - 90_000),
    mkOrder("pickup", 1.0, nowMs - 60_000),
    mkOrder("dine-in", 0.75, nowMs - 30_000),
    mkOrder("uber-eats", 1.25, nowMs - 10_000),
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
    // One basket already in mid-fry as a visual anchor
    if (baskets[0]) {
      baskets[0] = {
        ...baskets[0],
        status: "frying",
        weightLbs: config.basketCapacityLbs,
        startedAtMs: nowMs - 90_000,
        elapsedSeconds: 90,
      };
    }
    return baskets;
  }
  // peak — three baskets active, one ready
  if (baskets[0])
    baskets[0] = {
      ...baskets[0],
      status: "frying",
      weightLbs: config.basketCapacityLbs,
      startedAtMs: nowMs - 5 * 60_000,
      elapsedSeconds: 5 * 60,
    };
  if (baskets[1])
    baskets[1] = {
      ...baskets[1],
      status: "frying",
      weightLbs: config.basketCapacityLbs,
      startedAtMs: nowMs - 2 * 60_000,
      elapsedSeconds: 2 * 60,
    };
  if (baskets[2])
    baskets[2] = {
      ...baskets[2],
      status: "ready",
      weightLbs: config.basketCapacityLbs,
      startedAtMs: nowMs - 8 * 60_000,
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
  };
}
