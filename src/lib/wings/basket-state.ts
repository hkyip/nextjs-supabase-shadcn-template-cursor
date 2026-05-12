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
  // Undercooked is a sticky violation state — only cleared by redrop or empty.
  if (basket.status === "undercooked") return "undercooked";
  const elapsed = basket.elapsedSeconds;
  if (elapsed < config.cookSeconds) return "frying";
  if (elapsed <= config.cookSeconds + config.cookOvershootSeconds) return "ready";
  return "overcook";
}

/** seconds left in the 7:30 window — negative if past cook time. */
export function basketRemainingSeconds(
  basket: FryerBasket,
  config: WingsConfigV1,
): number {
  return config.cookSeconds - basket.elapsedSeconds;
}

/** Tick a basket forward by sim seconds. Undercooked + empty are frozen. */
export function tickBasket(
  basket: FryerBasket,
  config: WingsConfigV1,
  simSecondsElapsed: number,
): FryerBasket {
  if (basket.status === "empty" || basket.status === "undercooked") return basket;
  const elapsedSeconds = basket.elapsedSeconds + simSecondsElapsed;
  return {
    ...basket,
    elapsedSeconds,
    status: deriveBasketStatus({ ...basket, elapsedSeconds }, config),
  };
}
