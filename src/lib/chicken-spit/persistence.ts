"use client";

import {
  DEFAULT_CHICKEN_SPIT_CONFIG,
  createInitialChickenSpitState,
} from "@/lib/chicken-spit/mock-seed";
import type { ChickenSpitPersistedStateV1 } from "@/lib/chicken-spit/types";

const STORAGE_KEY = "forkcast:chicken-spit:v1";

/** Deterministic SSR initial state — load from LS in an effect afterward. */
export function createChickenSpitInitialState(): ChickenSpitPersistedStateV1 {
  // Use a stable nowMs for SSR to avoid hydration mismatch.
  return createInitialChickenSpitState(0);
}

export function loadChickenSpitPersisted(): ChickenSpitPersistedStateV1 {
  if (typeof window === "undefined") return createChickenSpitInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialChickenSpitState(Date.now());
    const parsed = JSON.parse(raw) as ChickenSpitPersistedStateV1;
    if (parsed.version !== 1) return createInitialChickenSpitState(Date.now());
    return {
      ...createInitialChickenSpitState(Date.now()),
      ...parsed,
      config: { ...DEFAULT_CHICKEN_SPIT_CONFIG, ...parsed.config },
    };
  } catch {
    return createInitialChickenSpitState(Date.now());
  }
}

export function saveChickenSpitPersisted(
  next: Partial<ChickenSpitPersistedStateV1>,
): ChickenSpitPersistedStateV1 {
  const prev = loadChickenSpitPersisted();
  const merged: ChickenSpitPersistedStateV1 = {
    ...prev,
    ...next,
    config: { ...prev.config, ...next.config },
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export function resetChickenSpitPersistence(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
