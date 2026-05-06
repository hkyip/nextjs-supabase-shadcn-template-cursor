import type { DemandBucket, WingsPersistedStateV1 } from "@/lib/wings/types";

/**
 * 15-min look-ahead in three 5-minute buckets. Demand lifts as a configured
 * "game ending" event approaches (since fans pour in for post-game wings).
 */
const BUCKET_COUNT = 3;
const BUCKET_MIN = 5;

export interface ForecastResult {
  buckets: DemandBucket[];
  /** lbs of capacity available across all baskets per 5-min window */
  capacityLbsPerBucket: number;
  /** total projected lbs for the next 15 min */
  total15Lbs: number;
  /** True if any bucket exceeds capacity. */
  anyBucketOverCapacity: boolean;
}

function bucketLabel(startMin: number, nowMs: number): string {
  const start = new Date(nowMs + startMin * 60_000);
  const end = new Date(nowMs + (startMin + BUCKET_MIN) * 60_000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)}–${fmt(end)}`;
}

export function projectDemand(
  state: WingsPersistedStateV1,
  nowMs: number,
): ForecastResult {
  const { posVelocityPerMin, gameEndingAtMs, config } = state;
  const baseLbsPerMin = (posVelocityPerMin / config.wingsPerLb);

  const buckets: DemandBucket[] = [];
  for (let i = 0; i < BUCKET_COUNT; i += 1) {
    const startMin = i * BUCKET_MIN;
    const midMs = nowMs + (startMin + BUCKET_MIN / 2) * 60_000;
    let multiplier = 1;

    // Game-ending lift — peaks ±5 min around the end time
    if (gameEndingAtMs != null) {
      const distMin = Math.abs(midMs - gameEndingAtMs) / 60_000;
      if (distMin <= 10) {
        // 1.0× at distMin>=10, up to 2.4× at distMin=0
        multiplier *= 1 + Math.max(0, (10 - distMin) / 10) * 1.4;
      }
    }

    const projectedLbs = baseLbsPerMin * BUCKET_MIN * multiplier;
    buckets.push({
      startMinAhead: startMin,
      projectedLbs: Math.round(projectedLbs * 10) / 10,
      label: bucketLabel(startMin, nowMs),
    });
  }

  const capacityLbsPerBucket =
    config.basketCount * config.basketCapacityLbs * (BUCKET_MIN / (config.cookSeconds / 60));

  const total15Lbs = Math.round(
    buckets.reduce((s, b) => s + b.projectedLbs, 0) * 10,
  ) / 10;

  return {
    buckets,
    capacityLbsPerBucket: Math.round(capacityLbsPerBucket * 10) / 10,
    total15Lbs,
    anyBucketOverCapacity: buckets.some(
      (b) => b.projectedLbs > capacityLbsPerBucket,
    ),
  };
}
