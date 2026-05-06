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
 * Try to fulfill queued orders from holding-bin lbs first. Returns mutated
 * holding lbs and the orders to mark as served (with servedAtMs set).
 */
export function fulfillFromHolding(
  ordersOpen: WingOrder[],
  holdingLbs: number,
  nowMs: number,
): { fulfilled: WingOrder[]; remainingHoldingLbs: number; remainingOpen: WingOrder[] } {
  const fulfilled: WingOrder[] = [];
  const remainingOpen: WingOrder[] = [];
  let pool = holdingLbs;
  for (const order of ordersOpen) {
    if (order.status !== "queued") {
      remainingOpen.push(order);
      continue;
    }
    if (pool >= order.weightLbs) {
      pool -= order.weightLbs;
      fulfilled.push({ ...order, status: "served", servedAtMs: nowMs });
    } else {
      remainingOpen.push(order);
    }
  }
  return { fulfilled, remainingHoldingLbs: pool, remainingOpen };
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
