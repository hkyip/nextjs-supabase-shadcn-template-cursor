"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import type { RemoteCommand } from "@/lib/demo-commands";
import {
  createInitialDemoClock,
  demoNowFromClock,
  jumpDemoClockToLocalTime,
  setDemoClockTimeScale,
  syncDemoClockToWallNow,
  type DemoClockState,
} from "@/lib/demo-clock";
import {
  computeForecastBreakdown,
  type ActiveForecastModifier,
  type ForecastBreakdownContext,
} from "@/lib/forecast-breakdown";
import type {
  CaptureMethod,
  CookingBatch,
  DetectionEvent,
  DetectionEventType,
  HeldBatch,
  MenuItem,
  WasteEntry,
  WhatToCookItem,
} from "@/lib/mock-data";
import {
  ALERT_FORECAST_MULTIPLIERS,
  INITIAL_COOKING,
  INITIAL_EVENTS,
  INITIAL_HELD,
  INITIAL_WASTE,
  INITIAL_WHAT_TO_COOK,
  MENU_ITEMS,
  STORE,
} from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type CommandOrigin = "local" | "remote";

export type CommandOverlay = {
  id: string;
  narration: string;
  method: CaptureMethod;
  origin: CommandOrigin;
  at: number;
};

/** Queued tickets from `/pos` or `/remote` serving — fulfilled on the line from hot hold. */
export type IncomingOrder = {
  id: string;
  menuItemId: string;
  quantity: number;
  narration: string;
  orderSource: "pos" | "remote";
  receivedAtMs: number;
};

export type ProductionState = {
  whatToCook: WhatToCookItem[];
  cooking: CookingBatch[];
  held: HeldBatch[];
  /** Orders waiting to be pulled from hot hold (camera / voice / manual). */
  incomingOrders: IncomingOrder[];
  /**
   * Lane / direct-serve shortfall (units) not covered by hot hold — does not change the
   * statistical forecast; decremented when product is pulled from hold on the lane.
   */
  laneBacklog: Record<string, number>;
  waste: WasteEntry[];
  events: DetectionEvent[];
  elapsed: number;
  /** Seconds-of-elapsed at which a simulated lane order was last enqueued per item. */
  lastSaleAt: Record<string, number>;
  overlay: CommandOverlay | null;
  /** Accelerated virtual store clock (forecast + simulation). */
  demoClock: DemoClockState;
  /** Rolling direct-serve sales samples (units per tick), newest last. */
  velocityHistory: Record<string, number[]>;
  /** Active `dynamic-alert` forecast modifiers (simulated elapsed expiry). */
  activeForecastModifiers: ActiveForecastModifier[];
  /** Recent hold-expiry waste for operator factor. */
  wasteHistory: Array<{ elapsed: number; units: number }>;
};

const EVENT_LOG_MAX = 16;
const INVENTORY_EVENT_INTERVAL_SECONDS = 45;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "TICK" }
  | {
      type: "START_COOKING";
      menuItemId: string;
      quantity: number;
      captureMethod: CaptureMethod;
    }
  | {
      type: "CONFIRM_DISPOSAL";
      wasteId: string;
      method: CaptureMethod;
    }
  | {
      type: "FULFILL_ORDER";
      orderId: string;
      method: CaptureMethod;
    }
  | {
      type: "APPLY_COMMAND";
      command: RemoteCommand;
      origin: CommandOrigin;
    };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function menuItem(id: string): MenuItem {
  const mi = MENU_ITEMS.find((m) => m.id === id);
  if (!mi) throw new Error(`Unknown menu item: ${id}`);
  return mi;
}

let seq = 1000;
function nextId(prefix: string): string {
  return `${prefix}-${++seq}`;
}

function emit(
  events: DetectionEvent[],
  type: DetectionEventType,
  method: CaptureMethod,
  label: string,
  confidence: number,
): DetectionEvent[] {
  const next: DetectionEvent = {
    id: nextId("ev"),
    timestampMs: Date.now(),
    type,
    method,
    label,
    confidence,
  };
  return [next, ...events].slice(0, EVENT_LOG_MAX);
}

function methodConfidence(method: CaptureMethod): number {
  if (method === "manual") return 1;
  return 0.92 + Math.random() * 0.07;
}

function methodTag(method: CaptureMethod): string {
  switch (method) {
    case "camera":
      return "CAMERA";
    case "voice":
      return "VOICE";
    case "manual":
      return "MANUAL";
  }
}

function narratedLabel(method: CaptureMethod, narration: string): string {
  return `${methodTag(method)} — ${narration}`;
}

function buildOverlay(
  command: RemoteCommand,
  origin: CommandOrigin,
): CommandOverlay {
  return {
    id: nextId("ov"),
    narration: command.narration,
    method: command.method,
    origin,
    at: Date.now(),
  };
}

/**
 * Cook quantity = max(0, adjusted expectation − hold − cooking + queued POS + lane backlog).
 * `forecastedDemand` is baseline-only; `adjustedExpectedDemand` includes demo factors.
 */
function computeCookQuantity(
  item: WhatToCookItem,
  batchSize: number,
): WhatToCookItem {
  const opsOverlay = item.queuedUnits + item.laneBacklogUnits;
  const rawCook = Math.max(
    0,
    item.adjustedExpectedDemand -
      item.currentHoldInventory -
      item.currentlyCooking +
      opsOverlay,
  );
  /** Whole units for the line — forecast integration can be fractional. */
  const cookQuantity = Math.round(rawCook);
  const batchCount = Math.ceil(cookQuantity / batchSize);
  let urgency: WhatToCookItem["urgency"];
  if (cookQuantity === 0) urgency = "normal";
  else if (item.currentHoldInventory <= batchSize) urgency = "urgent";
  else if (cookQuantity >= batchSize * 2) urgency = "soon";
  else urgency = "normal";
  return { ...item, cookQuantity, batchCount, urgency };
}

function totalHeldForItem(held: HeldBatch[], menuItemId: string): number {
  return held
    .filter((b) => b.menuItemId === menuItemId)
    .reduce((sum, b) => sum + b.quantity, 0);
}

function totalCookingForItem(
  cooking: CookingBatch[],
  menuItemId: string,
): number {
  return cooking
    .filter((b) => b.menuItemId === menuItemId)
    .reduce((sum, b) => sum + b.quantity, 0);
}

/** Remove one unit from the oldest held batch for the given menu item. */
function sellOneUnit(
  held: HeldBatch[],
  menuItemId: string,
): { held: HeldBatch[]; sold: boolean } {
  const candidates = held
    .map((b, idx) => ({ b, idx }))
    .filter(({ b }) => b.menuItemId === menuItemId && b.quantity > 0)
    .sort((a, b) => b.b.heldAtSeconds - a.b.heldAtSeconds);

  if (candidates.length === 0) return { held, sold: false };

  const target = candidates[0];
  const nextHeld = held
    .map((b, idx) => {
      if (idx !== target.idx) return b;
      return { ...b, quantity: b.quantity - 1 };
    })
    .filter((b) => b.quantity > 0);

  return { held: nextHeld, sold: true };
}

function sellManyUnits(
  held: HeldBatch[],
  menuItemId: string,
  quantity: number,
): { held: HeldBatch[]; sold: number } {
  let current = held;
  let sold = 0;
  for (let i = 0; i < quantity; i++) {
    const result = sellOneUnit(current, menuItemId);
    if (!result.sold) break;
    current = result.held;
    sold += 1;
  }
  return { held: current, sold };
}

function queuedUnitsForItem(
  incomingOrders: IncomingOrder[],
  menuItemId: string,
): number {
  return incomingOrders
    .filter((o) => o.menuItemId === menuItemId)
    .reduce((s, o) => s + o.quantity, 0);
}

function forecastSliceContext(
  state: ProductionState,
): ForecastBreakdownContext {
  return {
    elapsed: state.elapsed,
    timeScale: state.demoClock.timeScale,
    velocityHistory: state.velocityHistory,
    activeForecastModifiers: state.activeForecastModifiers.filter(
      (m) => m.untilElapsed > state.elapsed,
    ),
    wasteHistory: state.wasteHistory,
  };
}

function recomputeWhatToCook(
  whatToCook: WhatToCookItem[],
  held: HeldBatch[],
  cooking: CookingBatch[],
  incomingOrders: IncomingOrder[],
  laneBacklog: Record<string, number>,
  soldDelta: Record<string, number>,
  resetSoldFor: string | null,
  now: Date,
  breakdownCtx: ForecastBreakdownContext,
): WhatToCookItem[] {
  return whatToCook.map((item) => {
    const mi = menuItem(item.menuItemId);
    const deltaSold = soldDelta[item.menuItemId] ?? 0;
    const baseSold =
      resetSoldFor === item.menuItemId ? 0 : item.soldSinceLastCook;
    const bd = computeForecastBreakdown(item.menuItemId, now, breakdownCtx);
    const merged: WhatToCookItem = {
      ...item,
      forecastedDemand: bd.baselineUnits,
      adjustedExpectedDemand: bd.adjustedUnits,
      velocityFactor: bd.velocityFactor,
      eventFactor: bd.eventFactor,
      operatorFactor: bd.operatorFactor,
      queuedUnits: queuedUnitsForItem(incomingOrders, item.menuItemId),
      laneBacklogUnits: laneBacklog[item.menuItemId] ?? 0,
      currentHoldInventory: totalHeldForItem(held, item.menuItemId),
      currentlyCooking: totalCookingForItem(cooking, item.menuItemId),
      soldSinceLastCook: baseSold + deltaSold,
    };
    return computeCookQuantity(merged, mi.batchSize);
  });
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function applyCookStartCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "cook-start" }>,
  origin: CommandOrigin,
): ProductionState {
  const mi = menuItem(command.menuItemId);
  const batch: CookingBatch = {
    id: nextId("cook"),
    menuItemId: command.menuItemId,
    quantity: command.quantity,
    startedAtSeconds: 0,
    captureMethod: command.method,
    targetReadyAtMs: Date.now() + mi.cookTimeSeconds * 1000,
  };
  const cooking = [...state.cooking, batch];
  const now = demoNowFromClock(state.demoClock);
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    state.held,
    cooking,
    state.incomingOrders,
    state.laneBacklog,
    {},
    command.menuItemId,
    now,
    forecastSliceContext(state),
  );
  const events = emit(
    state.events,
    "cook-start",
    command.method,
    narratedLabel(command.method, command.narration),
    methodConfidence(command.method),
  );
  return {
    ...state,
    cooking,
    whatToCook,
    events,
    overlay: buildOverlay(command, origin),
  };
}

function applyHotHoldCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "hot-hold" }>,
  origin: CommandOrigin,
): ProductionState {
  // Promote the oldest cooking batch for this item (highest startedAtSeconds).
  // We move the entire batch rather than split it — keeping the batch shape
  // intact mirrors how the natural cook-timer transition in TICK works.
  const candidates = state.cooking
    .map((b, idx) => ({ b, idx }))
    .filter(({ b }) => b.menuItemId === command.menuItemId)
    .sort((a, b) => b.b.startedAtSeconds - a.b.startedAtSeconds);

  if (candidates.length === 0) {
    const events = emit(
      state.events,
      "hot-hold",
      command.method,
      `${narratedLabel(command.method, command.narration)} (no cooking batch to promote)`,
      methodConfidence(command.method),
    );
    return {
      ...state,
      events,
      overlay: buildOverlay(command, origin),
    };
  }

  const target = candidates[0];
  const mi = menuItem(command.menuItemId);
  const cooking = state.cooking.filter((_, idx) => idx !== target.idx);
  const held: HeldBatch[] = [
    ...state.held,
    {
      id: nextId("hold"),
      menuItemId: target.b.menuItemId,
      quantity: target.b.quantity,
      heldAtSeconds: 0,
      holdTimeSeconds: mi.holdTimeSeconds,
    },
  ];
  const now = demoNowFromClock(state.demoClock);
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    held,
    cooking,
    state.incomingOrders,
    state.laneBacklog,
    {},
    null,
    now,
    forecastSliceContext(state),
  );
  const events = emit(
    state.events,
    "hot-hold",
    command.method,
    narratedLabel(command.method, command.narration),
    methodConfidence(command.method),
  );

  return {
    ...state,
    cooking,
    held,
    whatToCook,
    events,
    overlay: buildOverlay(command, origin),
  };
}

function applyEnqueueServedCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "served" }>,
  origin: CommandOrigin,
): ProductionState {
  const src = command.orderSource;
  if (src !== "pos" && src !== "remote") return state;

  const mi = menuItem(command.menuItemId);
  const order: IncomingOrder = {
    id: nextId("ord"),
    menuItemId: command.menuItemId,
    quantity: command.quantity,
    narration: command.narration,
    orderSource: src,
    receivedAtMs: Date.now(),
  };
  const lane = src === "pos" ? "POS" : "Remote";
  const events = emit(
    state.events,
    "inventory",
    command.method,
    `${narratedLabel(command.method, command.narration)} · ${lane} incoming (${command.quantity}× ${mi.name})`,
    methodConfidence(command.method),
  );
  const incomingOrders = [...state.incomingOrders, order];
  const now = demoNowFromClock(state.demoClock);
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    state.held,
    state.cooking,
    incomingOrders,
    state.laneBacklog,
    {},
    null,
    now,
    forecastSliceContext(state),
  );
  return {
    ...state,
    incomingOrders,
    whatToCook,
    events,
    overlay: buildOverlay(command, origin),
  };
}

function applyDirectServedCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "served" }>,
  origin: CommandOrigin,
): ProductionState {
  const { held, sold } = sellManyUnits(
    state.held,
    command.menuItemId,
    command.quantity,
  );
  const unfulfilled = command.quantity - sold;
  const laneBacklog = { ...state.laneBacklog };
  const lbKey = command.menuItemId;
  if (unfulfilled > 0) {
    laneBacklog[lbKey] = (laneBacklog[lbKey] ?? 0) + unfulfilled;
  }
  if (sold > 0) {
    laneBacklog[lbKey] = Math.max(0, (laneBacklog[lbKey] ?? 0) - sold);
  }

  const soldDelta = sold > 0 ? { [command.menuItemId]: sold } : {};
  const now = demoNowFromClock(state.demoClock);
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    held,
    state.cooking,
    state.incomingOrders,
    laneBacklog,
    soldDelta,
    null,
    now,
    forecastSliceContext(state),
  );
  const tail =
    sold === 0 && command.quantity > 0
      ? " (nothing in hot hold)"
      : sold < command.quantity
        ? ` (only ${sold} in hot hold)`
        : sold > 0
          ? " · pulled from hot hold"
          : "";
  const demandTail =
    unfulfilled > 0
      ? ` · lane backlog +${unfulfilled} (unmet — drives What to Cook)`
      : "";
  const events = emit(
    state.events,
    "inventory",
    command.method,
    `${narratedLabel(command.method, command.narration)}${tail}${demandTail}`,
    methodConfidence(command.method),
  );
  return {
    ...state,
    held,
    laneBacklog,
    whatToCook,
    events,
    overlay: buildOverlay(command, origin),
  };
}

function applyFulfillOrder(
  state: ProductionState,
  orderId: string,
  method: CaptureMethod,
): ProductionState {
  const order = state.incomingOrders.find((o) => o.id === orderId);
  if (!order) return state;

  const { held, sold } = sellManyUnits(
    state.held,
    order.menuItemId,
    order.quantity,
  );
  const remaining = order.quantity - sold;

  const incomingOrders =
    remaining > 0
      ? state.incomingOrders.map((o) =>
          o.id === order.id ? { ...o, quantity: remaining } : o,
        )
      : state.incomingOrders.filter((o) => o.id !== order.id);

  const soldDelta = sold > 0 ? { [order.menuItemId]: sold } : {};

  const now = demoNowFromClock(state.demoClock);
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    held,
    state.cooking,
    incomingOrders,
    state.laneBacklog,
    soldDelta,
    null,
    now,
    forecastSliceContext(state),
  );

  const mi = menuItem(order.menuItemId);
  const tail =
    sold === 0
      ? " — nothing in hot hold (ticket waits)"
      : sold < order.quantity
        ? ` — partial (${sold}/${order.quantity} from hold)`
        : ` — ${sold} ${mi.batchMeasurement} from hot hold`;

  const events = emit(
    state.events,
    "inventory",
    method,
    `${narratedLabel(method, `Fulfilled incoming · ${order.quantity}× ${mi.name}`)}${tail}`,
    methodConfidence(method),
  );

  return {
    ...state,
    held,
    incomingOrders,
    whatToCook,
    events,
    overlay: {
      id: nextId("ov"),
      narration: `Incoming order ${sold > 0 ? `fulfilled (${sold}× ${mi.name})` : "— no hold stock"}`,
      method,
      origin: "local",
      at: Date.now(),
    },
  };
}

function applyDynamicAlertCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "dynamic-alert" }>,
  origin: CommandOrigin,
): ProductionState {
  const cfg = ALERT_FORECAST_MULTIPLIERS[command.alertId];
  const duration = cfg?.durationSimulatedSeconds ?? 1800;
  const untilElapsed = state.elapsed + duration;
  const activeForecastModifiers = [
    ...state.activeForecastModifiers.filter(
      (m) => m.alertId !== command.alertId && m.untilElapsed > state.elapsed,
    ),
    { alertId: command.alertId, untilElapsed },
  ];
  const now = demoNowFromClock(state.demoClock);
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    state.held,
    state.cooking,
    state.incomingOrders,
    state.laneBacklog,
    {},
    null,
    now,
    forecastSliceContext({ ...state, activeForecastModifiers }),
  );
  return {
    ...state,
    activeForecastModifiers,
    whatToCook,
    overlay: buildOverlay(command, origin),
  };
}

function applySetDemoTimeCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "set-demo-time" }>,
  origin: CommandOrigin,
): ProductionState {
  const clock = jumpDemoClockToLocalTime(
    state.demoClock,
    command.hour,
    command.minute,
    STORE.timezone,
    demoNowFromClock(state.demoClock),
  );
  const now = demoNowFromClock(clock);
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    state.held,
    state.cooking,
    state.incomingOrders,
    state.laneBacklog,
    {},
    null,
    now,
    forecastSliceContext(state),
  );
  return {
    ...state,
    demoClock: clock,
    whatToCook,
    overlay: buildOverlay(command, origin),
  };
}

function applySetDemoTimeScaleCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "set-demo-time-scale" }>,
  origin: CommandOrigin,
): ProductionState {
  const clock = setDemoClockTimeScale(state.demoClock, command.timeScale);
  const now = demoNowFromClock(clock);
  const nextState: ProductionState = { ...state, demoClock: clock };
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    state.held,
    state.cooking,
    state.incomingOrders,
    state.laneBacklog,
    {},
    null,
    now,
    forecastSliceContext(nextState),
  );
  return {
    ...nextState,
    whatToCook,
    overlay: buildOverlay(command, origin),
  };
}

function applySetDemoNowCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "set-demo-now" }>,
  origin: CommandOrigin,
): ProductionState {
  const clock = syncDemoClockToWallNow(state.demoClock);
  const now = demoNowFromClock(clock);
  const whatToCook = recomputeWhatToCook(
    state.whatToCook,
    state.held,
    state.cooking,
    state.incomingOrders,
    state.laneBacklog,
    {},
    null,
    now,
    forecastSliceContext({ ...state, demoClock: clock }),
  );
  return {
    ...state,
    demoClock: clock,
    whatToCook,
    overlay: buildOverlay(command, origin),
  };
}

function applyDisposalCommand(
  state: ProductionState,
  command: Extract<RemoteCommand, { type: "disposal" }>,
  origin: CommandOrigin,
): ProductionState {
  const target =
    state.waste.find(
      (w) => !command.menuItemId || w.menuItemId === command.menuItemId,
    ) ?? null;

  const label = target
    ? narratedLabel(command.method, command.narration)
    : `${narratedLabel(command.method, command.narration)} (no waste to clear)`;

  const events = emit(
    state.events,
    "disposal",
    command.method,
    label,
    methodConfidence(command.method),
  );

  return {
    ...state,
    waste: target ? state.waste.filter((w) => w.id !== target.id) : state.waste,
    events,
    overlay: buildOverlay(command, origin),
  };
}

function reducer(state: ProductionState, action: Action): ProductionState {
  switch (action.type) {
    case "TICK": {
      const dt = state.demoClock.timeScale;
      const elapsed = state.elapsed + dt;
      let events = state.events;

      // 1. Advance cooking timers and promote finished batches to held.
      let cooking = state.cooking.map((b) => ({
        ...b,
        startedAtSeconds: b.startedAtSeconds + dt,
      }));

      const promotedToHold: HeldBatch[] = [];
      const finishedCookIds = new Set<string>();
      for (const b of cooking) {
        const mi = menuItem(b.menuItemId);
        if (b.startedAtSeconds >= mi.cookTimeSeconds) {
          finishedCookIds.add(b.id);
          promotedToHold.push({
            id: nextId("hold"),
            menuItemId: b.menuItemId,
            quantity: b.quantity,
            heldAtSeconds: 0,
            holdTimeSeconds: mi.holdTimeSeconds,
          });
          events = emit(
            events,
            "hot-hold",
            "camera",
            `Transfer to hot hold — ${mi.name} (${b.quantity} ${mi.batchMeasurement})`,
            0.93 + Math.random() * 0.06,
          );
        }
      }
      cooking = cooking.filter((b) => !finishedCookIds.has(b.id));

      // 2. Advance held timers; expire to waste.
      let held = [...state.held, ...promotedToHold].map((b) => ({
        ...b,
        heldAtSeconds: b.heldAtSeconds + dt,
      }));

      const newWaste: WasteEntry[] = [];
      const expiredIds = new Set<string>();
      for (const b of held) {
        if (b.heldAtSeconds >= b.holdTimeSeconds) {
          expiredIds.add(b.id);
          const mi = menuItem(b.menuItemId);
          newWaste.push({
            id: nextId("waste"),
            menuItemId: b.menuItemId,
            quantity: b.quantity,
            reason: "Hold time expired",
            estimatedCost: +(b.quantity * mi.foodCostPerUnit).toFixed(2),
            confirmed: false,
          });
        }
      }
      held = held.filter((b) => !expiredIds.has(b.id));

      // 3. POS simulation — sell one unit per menu item per sales interval (direct from hold;
      //    only `/pos` queues into Incoming orders).
      const lastSaleAt = { ...state.lastSaleAt };
      const soldDelta: Record<string, number> = {};
      for (const mi of MENU_ITEMS) {
        const last = lastSaleAt[mi.id] ?? 0;
        if (elapsed - last >= mi.salesIntervalSeconds) {
          const result = sellOneUnit(held, mi.id);
          if (result.sold) {
            held = result.held;
            soldDelta[mi.id] = (soldDelta[mi.id] ?? 0) + 1;
          }
          lastSaleAt[mi.id] = elapsed;
        }
      }

      const activeForecastModifiers = state.activeForecastModifiers.filter(
        (m) => m.untilElapsed > elapsed,
      );

      const velocityHistory: Record<string, number[]> = { ...state.velocityHistory };
      for (const mi of MENU_ITEMS) {
        const add = soldDelta[mi.id] ?? 0;
        velocityHistory[mi.id] = [...(velocityHistory[mi.id] ?? []), add].slice(
          -30,
        );
      }

      let wasteHistory = state.wasteHistory;
      if (newWaste.length > 0) {
        const add = newWaste.map((w) => ({ elapsed, units: w.quantity }));
        wasteHistory = [...state.wasteHistory, ...add].slice(-80);
      }

      const sliceCtx: ForecastBreakdownContext = {
        elapsed,
        timeScale: state.demoClock.timeScale,
        velocityHistory,
        activeForecastModifiers,
        wasteHistory,
      };

      const whatToCook = recomputeWhatToCook(
        state.whatToCook,
        held,
        cooking,
        state.incomingOrders,
        state.laneBacklog,
        soldDelta,
        null,
        demoNowFromClock(state.demoClock),
        sliceCtx,
      );

      const invPrev = Math.floor(
        (elapsed - dt) / INVENTORY_EVENT_INTERVAL_SECONDS,
      );
      const invNext = Math.floor(elapsed / INVENTORY_EVENT_INTERVAL_SECONDS);
      if (invNext > invPrev && invNext > 0) {
        const pingItem = MENU_ITEMS[invNext % MENU_ITEMS.length];
        const qty = totalHeldForItem(held, pingItem.id);
        events = emit(
          events,
          "inventory",
          "camera",
          `Inventory count — ${pingItem.name}: ${qty} ${pingItem.batchMeasurement} in hold`,
          0.9 + Math.random() * 0.08,
        );
      }

      return {
        ...state,
        elapsed,
        cooking,
        held,
        waste: [...state.waste, ...newWaste],
        events,
        whatToCook,
        lastSaleAt,
        velocityHistory,
        wasteHistory,
        activeForecastModifiers,
      };
    }

    case "START_COOKING": {
      const mi = menuItem(action.menuItemId);
      const batch: CookingBatch = {
        id: nextId("cook"),
        menuItemId: action.menuItemId,
        quantity: action.quantity,
        startedAtSeconds: 0,
        captureMethod: action.captureMethod,
        targetReadyAtMs: Date.now() + mi.cookTimeSeconds * 1000,
      };

      const cooking = [...state.cooking, batch];
      const now = demoNowFromClock(state.demoClock);
      const whatToCook = recomputeWhatToCook(
        state.whatToCook,
        state.held,
        cooking,
        state.incomingOrders,
        state.laneBacklog,
        {},
        action.menuItemId,
        now,
        forecastSliceContext(state),
      );

      const captureLabel =
        action.captureMethod === "camera"
          ? "Cook start detected"
          : action.captureMethod === "voice"
            ? "Cook start logged (voice)"
            : "Cook start logged (manual)";

      const events = emit(
        state.events,
        "cook-start",
        action.captureMethod,
        `${captureLabel} — ${mi.name} (${action.quantity} ${mi.batchMeasurement})`,
        methodConfidence(action.captureMethod),
      );

      return { ...state, cooking, whatToCook, events };
    }

    case "FULFILL_ORDER": {
      return applyFulfillOrder(state, action.orderId, action.method);
    }

    case "CONFIRM_DISPOSAL": {
      const entry = state.waste.find((w) => w.id === action.wasteId);
      if (!entry) return state;
      const mi = menuItem(entry.menuItemId);

      const events = emit(
        state.events,
        "disposal",
        action.method,
        `Disposal confirmed — ${mi.name} (${entry.quantity} ${mi.batchMeasurement} expired)`,
        methodConfidence(action.method),
      );

      return {
        ...state,
        waste: state.waste.filter((w) => w.id !== action.wasteId),
        events,
      };
    }

    case "APPLY_COMMAND": {
      switch (action.command.type) {
        case "cook-start":
          return applyCookStartCommand(state, action.command, action.origin);
        case "hot-hold":
          return applyHotHoldCommand(state, action.command, action.origin);
        case "served": {
          const os = action.command.orderSource;
          return os === "pos" || os === "remote"
            ? applyEnqueueServedCommand(state, action.command, action.origin)
            : applyDirectServedCommand(state, action.command, action.origin);
        }
        case "disposal":
          return applyDisposalCommand(state, action.command, action.origin);
        case "dynamic-alert":
          return applyDynamicAlertCommand(state, action.command, action.origin);
        case "set-demo-time":
          return applySetDemoTimeCommand(state, action.command, action.origin);
        case "set-demo-time-scale":
          return applySetDemoTimeScaleCommand(
            state,
            action.command,
            action.origin,
          );
        case "set-demo-now":
          return applySetDemoNowCommand(state, action.command, action.origin);
      }
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Provider + hook
// ---------------------------------------------------------------------------

function createInitialProductionState(): ProductionState {
  const wall = Date.now();
  const cooking = INITIAL_COOKING.map((b) => {
    const mi = menuItem(b.menuItemId);
    return {
      ...b,
      targetReadyAtMs: wall + (mi.cookTimeSeconds - b.startedAtSeconds) * 1000,
    };
  });
  const demoClock = createInitialDemoClock();
  const base: ProductionState = {
    whatToCook: INITIAL_WHAT_TO_COOK,
    cooking,
    held: INITIAL_HELD,
    incomingOrders: [],
    laneBacklog: {},
    waste: INITIAL_WASTE,
    events: INITIAL_EVENTS,
    elapsed: 0,
    lastSaleAt: {},
    overlay: null,
    demoClock,
    velocityHistory: {},
    activeForecastModifiers: [],
    wasteHistory: [],
  };
  const now = demoNowFromClock(demoClock);
  const initCtx: ForecastBreakdownContext = {
    elapsed: 0,
    timeScale: demoClock.timeScale,
    velocityHistory: {},
    activeForecastModifiers: [],
    wasteHistory: [],
  };
  return {
    ...base,
    whatToCook: recomputeWhatToCook(
      base.whatToCook,
      base.held,
      base.cooking,
      base.incomingOrders,
      base.laneBacklog,
      {},
      null,
      now,
      initCtx,
    ),
  };
}

export type ProductionContextValue = {
  state: ProductionState;
  /** Virtual store clock (1× wall by default); updates on a short interval for UI. */
  demoNow: Date;
  startCooking: (
    menuItemId: string,
    quantity: number,
    captureMethod: CaptureMethod,
  ) => void;
  fulfillOrder: (orderId: string, method: CaptureMethod) => void;
  confirmDisposal: (wasteId: string, method: CaptureMethod) => void;
  applyCommand: (command: RemoteCommand, origin?: CommandOrigin) => void;
};

const ProductionContext = createContext<ProductionContextValue | null>(null);

export function ProductionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    createInitialProductionState,
  );

  const [renderTick, setRenderTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRenderTick((x) => x + 1), 200);
    return () => clearInterval(id);
  }, []);

  const demoNow = useMemo(() => {
    void renderTick;
    return demoNowFromClock(state.demoClock);
  }, [state.demoClock, renderTick]);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, []);

  const startCooking = useCallback(
    (menuItemId: string, quantity: number, captureMethod: CaptureMethod) => {
      dispatch({ type: "START_COOKING", menuItemId, quantity, captureMethod });
    },
    [],
  );

  const fulfillOrder = useCallback((orderId: string, method: CaptureMethod) => {
    dispatch({ type: "FULFILL_ORDER", orderId, method });
  }, []);

  const confirmDisposal = useCallback(
    (wasteId: string, method: CaptureMethod) => {
      dispatch({ type: "CONFIRM_DISPOSAL", wasteId, method });
    },
    [],
  );

  const applyCommand = useCallback(
    (command: RemoteCommand, origin: CommandOrigin = "local") => {
      dispatch({ type: "APPLY_COMMAND", command, origin });
    },
    [],
  );

  const value = useMemo<ProductionContextValue>(
    () => ({
      state,
      demoNow,
      startCooking,
      fulfillOrder,
      confirmDisposal,
      applyCommand,
    }),
    [state, demoNow, startCooking, fulfillOrder, confirmDisposal, applyCommand],
  );

  return createElement(ProductionContext.Provider, { value }, children);
}

export function useProduction(): ProductionContextValue {
  const ctx = useContext(ProductionContext);
  if (!ctx) {
    throw new Error("useProduction must be used within a ProductionProvider");
  }
  return ctx;
}
