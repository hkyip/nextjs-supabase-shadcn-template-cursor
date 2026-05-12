import type {
  OrderChannel,
  WingOrder,
  WingsPersistedStateV1,
} from "@/lib/wings/types";
import { CHANNEL_SLA_SECONDS } from "@/lib/wings/types";

const CHANNEL_WEIGHTS: { channel: OrderChannel; weight: number }[] = [
  { channel: "dine-in", weight: 0.4 },
  { channel: "uber-eats", weight: 0.25 },
  { channel: "skip", weight: 0.2 },
  { channel: "pickup", weight: 0.15 },
];

let _seq = 1000;

function rand(seed: number): number {
  // tiny deterministic-ish pseudo-rand from a counter — keeps demos repeatable
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function pickChannel(seed: number): OrderChannel {
  const r = rand(seed);
  let acc = 0;
  for (const c of CHANNEL_WEIGHTS) {
    acc += c.weight;
    if (r < acc) return c.channel;
  }
  return "dine-in";
}

export function pickOrderWeight(channel: OrderChannel, seed: number): number {
  // Dine-in tends to be 1-1.5 lb (sharing). Delivery 1 lb. Pickup 0.5-1.
  const r = rand(seed);
  if (channel === "dine-in") return Math.round((1 + r * 0.75) * 4) / 4; // .25 step
  if (channel === "pickup") return Math.round((0.5 + r * 0.5) * 4) / 4;
  return Math.round((0.75 + r * 0.5) * 4) / 4;
}

/**
 * Generate the integer count of new orders that should have arrived during a
 * sim window, given POS velocity. Uses a continuous accumulator so partial
 * orders don't get lost across ticks.
 */
export interface OrderArrivals {
  newOrders: WingOrder[];
  remainderFraction: number;
}
export function arriveOrders(
  state: WingsPersistedStateV1,
  simSeconds: number,
  prevRemainderFraction: number,
  nowMs: number,
): OrderArrivals {
  // wings/min → lbs/min via wingsPerLb. But the simpler abstraction: orders/min
  // averages ~3 wings/order * 8 wings/lb. We'll model order rate as
  // (posVelocityPerMin / wingsPerOrderEst) — picking 6 wings/order = 0.75 lb avg.
  const wingsPerOrderEst = 6;
  const ordersPerMin = state.posVelocityPerMin / wingsPerOrderEst;
  const ordersExpectedFloat =
    prevRemainderFraction + ordersPerMin * (simSeconds / 60);
  const count = Math.floor(ordersExpectedFloat);
  const remainderFraction = ordersExpectedFloat - count;

  const newOrders: WingOrder[] = [];
  for (let i = 0; i < count; i += 1) {
    _seq += 1;
    const seed = _seq;
    const channel = pickChannel(seed);
    const weightLbs = pickOrderWeight(channel, seed + 1);
    newOrders.push({
      id: `o-${_seq}`,
      channel,
      weightLbs,
      placedAtMs: nowMs - Math.floor(rand(seed + 2) * simSeconds * 1000),
      servedAtMs: null,
      status: "queued",
      slaSeconds: CHANNEL_SLA_SECONDS[channel],
    });
  }
  return { newOrders, remainderFraction };
}

/**
 * Try to fulfill queued orders by depleting READY baskets (oldest first).
 * Wings sit in their basket after cooking — KDS depletes them in place,
 * and a basket transitions to EMPTY when its weight drops below the
 * EMPTY_THRESHOLD_LBS floor (treated as essentially zero).
 *
 * Returns the orders served + the next baskets array.
 */
const EMPTY_THRESHOLD_LBS = 0.1;

import type { FryerBasket } from "@/lib/wings/types";

export function fulfillFromReadyBaskets(
  ordersOpen: WingOrder[],
  baskets: FryerBasket[],
  nowMs: number,
): {
  fulfilled: WingOrder[];
  remainingOpen: WingOrder[];
  nextBaskets: FryerBasket[];
} {
  const fulfilled: WingOrder[] = [];
  const remainingOpen: WingOrder[] = [];

  // Mutate a working copy of baskets so we can deplete weight in place
  const working = baskets.map((b) => ({ ...b }));

  // Order ready baskets by oldest start time first (FIFO)
  const readyIdx = working
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.status === "ready" && b.weightLbs > 0)
    .sort((a, b) => (a.b.startedAtMs ?? 0) - (b.b.startedAtMs ?? 0))
    .map(({ i }) => i);

  for (const order of ordersOpen) {
    if (order.status !== "queued") {
      remainingOpen.push(order);
      continue;
    }
    // Try to fulfill across one or more baskets if needed
    let remaining = order.weightLbs;
    let consumed = 0;
    for (const i of readyIdx) {
      if (remaining <= 0) break;
      const basket = working[i];
      if (basket.status !== "ready" || basket.weightLbs <= 0) continue;
      const take = Math.min(remaining, basket.weightLbs);
      basket.weightLbs = Math.max(0, basket.weightLbs - take);
      consumed += take;
      remaining -= take;
      // Drop basket to EMPTY when essentially drained
      if (basket.weightLbs <= EMPTY_THRESHOLD_LBS) {
        basket.status = "empty";
        basket.weightLbs = 0;
        basket.startedAtMs = null;
        basket.elapsedSeconds = 0;
        basket.pulledAtMs = null;
        basket.shortfallSeconds = 0;
      }
    }
    if (consumed >= order.weightLbs - EMPTY_THRESHOLD_LBS) {
      fulfilled.push({ ...order, status: "served", servedAtMs: nowMs });
    } else {
      // Couldn't fully fulfill — leave on the queue
      remainingOpen.push(order);
    }
  }

  return { fulfilled, remainingOpen, nextBaskets: working };
}

/** Average order→served latency in seconds across recent closed orders. */
export function avgServiceTimeSeconds(closed: WingOrder[]): number {
  const last = closed.slice(-30);
  if (last.length === 0) return 0;
  const sum = last.reduce((acc, o) => {
    if (o.servedAtMs == null) return acc;
    return acc + (o.servedAtMs - o.placedAtMs) / 1000;
  }, 0);
  return Math.round(sum / last.length);
}

/** SLA seconds remaining for an open order; negative = breached. */
export function slaRemainingSeconds(order: WingOrder, nowMs: number): number {
  const elapsed = (nowMs - order.placedAtMs) / 1000;
  return Math.round(order.slaSeconds - elapsed);
}
