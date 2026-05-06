import type { ForecastResult } from "@/lib/wings/forecast";
import type { WingsPersistedStateV1 } from "@/lib/wings/types";

export interface PredropAnalysis {
  /** lbs we recommend pre-dropping right now */
  recommendedLbs: number;
  /** what to do — short imperative line */
  verdict: string;
  /** is the recommendation urgent? */
  urgent: boolean;
  /** lbs of cooked product currently accessible (holding bin + ready baskets) */
  readyLbs: number;
  /** lbs of cooking product on the way (frying baskets) */
  cookingLbs: number;
  /** lbs of next-bucket demand (5–10 min ahead) */
  nextBucketLbs: number;
}

export function analyzePredrop(
  state: WingsPersistedStateV1,
  forecast: ForecastResult,
): PredropAnalysis {
  const { baskets, holdingBin, config } = state;
  const readyBasketLbs = baskets
    .filter((b) => b.status === "ready")
    .reduce((sum, b) => sum + b.weightLbs, 0);
  const cookingLbs = baskets
    .filter((b) => b.status === "frying")
    .reduce((sum, b) => sum + b.weightLbs, 0);

  const readyLbs = holdingBin.weightLbs + readyBasketLbs;
  const next = forecast.buckets[1] ?? forecast.buckets[0];
  const nextBucketLbs = next ? next.projectedLbs : 0;

  // Recommend covering next bucket minus what's already cooked + cooking,
  // but only what we can actually fit in baskets.
  const totalBasketCapacityLbs = config.basketCount * config.basketCapacityLbs;
  const gap = nextBucketLbs - readyLbs - cookingLbs;
  const recommendedLbs = Math.max(
    0,
    Math.min(totalBasketCapacityLbs, Math.round(gap * 10) / 10),
  );

  const urgent =
    nextBucketLbs > readyLbs + cookingLbs &&
    forecast.buckets[0] &&
    forecast.buckets[0].projectedLbs >
      readyLbs + cookingLbs * 0.5; /* about-to-land surge */

  let verdict = "On track — no pre-drop required.";
  if (recommendedLbs > 0) {
    if (urgent) {
      verdict = `Surge in ${forecast.buckets[1]?.startMinAhead ?? 5} min. Pre-drop ${recommendedLbs} lb NOW so wings land as orders hit.`;
    } else {
      verdict = `Pre-drop ${recommendedLbs} lb to cover ${forecast.buckets[1]?.label ?? "next window"}.`;
    }
  }

  return {
    recommendedLbs,
    verdict,
    urgent: Boolean(urgent),
    readyLbs: Math.round(readyLbs * 10) / 10,
    cookingLbs: Math.round(cookingLbs * 10) / 10,
    nextBucketLbs,
  };
}
