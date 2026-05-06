"use client";

import {
  DEFAULT_WINGS_CONFIG,
  createInitialWingsState,
} from "@/lib/wings/mock-seed";
import type { WingsPersistedStateV1 } from "@/lib/wings/types";

const STORAGE_KEY = "forkcast:wings:v1";

/** SSR-safe deterministic initial state. */
export function createWingsInitialState(): WingsPersistedStateV1 {
  return createInitialWingsState(0);
}

export function loadWingsPersisted(): WingsPersistedStateV1 {
  if (typeof window === "undefined") return createWingsInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialWingsState(Date.now());
    const parsed = JSON.parse(raw) as WingsPersistedStateV1;
    if (parsed.version !== 1) return createInitialWingsState(Date.now());
    return {
      ...createInitialWingsState(Date.now()),
      ...parsed,
      config: { ...DEFAULT_WINGS_CONFIG, ...parsed.config },
    };
  } catch {
    return createInitialWingsState(Date.now());
  }
}

export function saveWingsPersisted(
  next: Partial<WingsPersistedStateV1>,
): WingsPersistedStateV1 {
  const prev = loadWingsPersisted();
  const merged: WingsPersistedStateV1 = {
    ...prev,
    ...next,
    config: { ...prev.config, ...next.config },
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export function resetWingsPersistence(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
