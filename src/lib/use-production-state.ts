import { useCallback, useEffect, useReducer } from "react";

import type {
  CaptureMethod,
  CookingBatch,
  HeldBatch,
  WasteEntry,
  WhatToCookItem,
} from "@/lib/mock-data";
import {
  INITIAL_COOKING,
  INITIAL_HELD,
  INITIAL_WASTE,
  INITIAL_WHAT_TO_COOK,
  MENU_ITEMS,
} from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type ProductionState = {
  whatToCook: WhatToCookItem[];
  cooking: CookingBatch[];
  held: HeldBatch[];
  waste: WasteEntry[];
  elapsed: number;
};

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
  | { type: "FINISH_COOKING"; batchId: string }
  | { type: "CONFIRM_DISPOSAL"; wasteId: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function menuItem(id: string) {
  return MENU_ITEMS.find((m) => m.id === id)!;
}

let batchSeq = 100;
function nextId(prefix: string) {
  return `${prefix}-${++batchSeq}`;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: ProductionState, action: Action): ProductionState {
  switch (action.type) {
    case "TICK": {
      const elapsed = state.elapsed + 1;

      const cooking = state.cooking.map((b) => ({
        ...b,
        startedAtSeconds: b.startedAtSeconds + 1,
      }));

      const held = state.held.map((b) => ({
        ...b,
        heldAtSeconds: b.heldAtSeconds + 1,
      }));

      const expiredIds: string[] = [];
      const newWaste: WasteEntry[] = [];

      for (const b of held) {
        if (b.heldAtSeconds >= b.holdTimeSeconds) {
          expiredIds.push(b.id);
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

      const finishedCookIds: string[] = [];
      const newHeld: HeldBatch[] = [];

      for (const b of cooking) {
        const mi = menuItem(b.menuItemId);
        if (b.startedAtSeconds >= mi.cookTimeSeconds) {
          finishedCookIds.push(b.id);
          newHeld.push({
            id: nextId("hold"),
            menuItemId: b.menuItemId,
            quantity: b.quantity,
            heldAtSeconds: 0,
            holdTimeSeconds: mi.holdTimeSeconds,
          });
        }
      }

      return {
        ...state,
        elapsed,
        cooking: cooking.filter((b) => !finishedCookIds.includes(b.id)),
        held: [
          ...held.filter((b) => !expiredIds.includes(b.id)),
          ...newHeld,
        ],
        waste: [...state.waste, ...newWaste],
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
      };

      const whatToCook = state.whatToCook.map((item) => {
        if (item.menuItemId !== action.menuItemId) return item;
        const newQty = Math.max(0, item.cookQuantity - action.quantity);
        return {
          ...item,
          cookQuantity: newQty,
          batchCount: Math.ceil(newQty / mi.batchSize),
          currentlyCooking: item.currentlyCooking + action.quantity,
          urgency: newQty === 0
            ? ("normal" as const)
            : newQty <= mi.batchSize
              ? ("soon" as const)
              : item.urgency,
        };
      });

      return {
        ...state,
        whatToCook,
        cooking: [...state.cooking, batch],
      };
    }

    case "FINISH_COOKING": {
      const batch = state.cooking.find((b) => b.id === action.batchId);
      if (!batch) return state;

      const mi = menuItem(batch.menuItemId);
      const newHeld: HeldBatch = {
        id: nextId("hold"),
        menuItemId: batch.menuItemId,
        quantity: batch.quantity,
        heldAtSeconds: 0,
        holdTimeSeconds: mi.holdTimeSeconds,
      };

      return {
        ...state,
        cooking: state.cooking.filter((b) => b.id !== action.batchId),
        held: [...state.held, newHeld],
      };
    }

    case "CONFIRM_DISPOSAL": {
      return {
        ...state,
        waste: state.waste.filter((w) => w.id !== action.wasteId),
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const initialState: ProductionState = {
  whatToCook: INITIAL_WHAT_TO_COOK,
  cooking: INITIAL_COOKING,
  held: INITIAL_HELD,
  waste: INITIAL_WASTE,
  elapsed: 0,
};

export function useProductionState() {
  const [state, dispatch] = useReducer(reducer, initialState);

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

  const finishCooking = useCallback((batchId: string) => {
    dispatch({ type: "FINISH_COOKING", batchId });
  }, []);

  const confirmDisposal = useCallback((wasteId: string) => {
    dispatch({ type: "CONFIRM_DISPOSAL", wasteId });
  }, []);

  return { state, startCooking, finishCooking, confirmDisposal };
}
