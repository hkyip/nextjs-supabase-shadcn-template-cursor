import type { BasketStatus, FryerBasket, WingsConfigV1 } from "@/lib/wings/types";

export const BASKET_STATE_LABEL: Record<BasketStatus, string> = {
  empty: "EMPTY",
  frying: "FRYING",
  ready: "READY",
  overcook: "OVERCOOK",
  undercooked: "UNDERCOOKED",
};

export function deriveBasketStatus(
  basket: FryerBasket,
  config: WingsConfigV1,
): BasketStatus {
  if (basket.status === "empty") return "empty";
  // Undercooked and READY are sticky states — only cleared by user action
  // (redrop) or KDS depletion. READY only enters via manual PULL, never auto.
  if (basket.status === "undercooked") return "undercooked";
  if (basket.status === "ready") return "ready";
  const elapsed = basket.elapsedSeconds;
  // FRYING is sticky across the cook + grace window. Operator must PULL to
  // exit to READY. If they don't, basket auto-flips to OVERCOOK past grace.
  if (elapsed <= config.cookSeconds + config.cookOvershootSeconds) return "frying";
  return "overcook";
}

/** seconds left in the 7:30 window — negative if past cook time. */
export function basketRemainingSeconds(
  basket: FryerBasket,
  config: WingsConfigV1,
): number {
  return config.cookSeconds - basket.elapsedSeconds;
}

/** Tick a basket forward by sim seconds. Terminal states (empty, ready,
 * undercooked) don't advance — they're cleared by user action or KDS. */
export function tickBasket(
  basket: FryerBasket,
  config: WingsConfigV1,
  simSecondsElapsed: number,
): FryerBasket {
  if (
    basket.status === "empty" ||
    basket.status === "undercooked" ||
    basket.status === "ready"
  ) {
    return basket;
  }
  const elapsedSeconds = basket.elapsedSeconds + simSecondsElapsed;
  return {
    ...basket,
    elapsedSeconds,
    status: deriveBasketStatus({ ...basket, elapsedSeconds }, config),
  };
}
