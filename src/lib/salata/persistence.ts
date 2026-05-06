"use client";

import { seedVenues } from "@/lib/salata/mock-seed";
import type {
  EventSignal,
  SalataEventConfig,
  SalataPersistedStateV1,
  SalataPrepItemId,
} from "@/lib/salata/types";

const STORAGE_KEY = "forkcast:salata:v1";

export const DEFAULT_SALATA_CONFIG: SalataEventConfig = {
  maxAdjustmentPercent: 25,
  walkableRadiusMiles: 1,
  morningPrepTime: "08:00",
  demoAmplified: true,
};

const DEFAULT_SIGNAL_APPLY = [
  "mock-lacc-expo",
  "mock-orpheum-matinee",
  "mock-drizzle",
];

/** Deterministic SSR + first hydration paint (matches server output). LS loads in an effect afterward. */
export function createSalataInitialState(): SalataPersistedStateV1 {
  return {
    version: 1,
    config: { ...DEFAULT_SALATA_CONFIG },
    appliedSignalIds: [...DEFAULT_SIGNAL_APPLY],
    ignoredSignalIds: [],
    managerOverrides: {},
    savedFinalPrep: {},
    lastSavedAt: null,
    webCandidates: [],
    lastWebFetchAt: null,
    venues: seedVenues(),
    liveWatchDismissedIds: [],
  };
}

export function loadSalataPersisted(): SalataPersistedStateV1 {
  if (typeof window === "undefined") return createSalataInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSalataInitialState();
    const parsed = JSON.parse(raw) as SalataPersistedStateV1;
    if (parsed.version !== 1) return createSalataInitialState();
    return {
      ...createSalataInitialState(),
      ...parsed,
      config: { ...DEFAULT_SALATA_CONFIG, ...parsed.config },
      venues: parsed.venues?.length ? parsed.venues : seedVenues(),
    };
  } catch {
    return createSalataInitialState();
  }
}

export function saveSalataPersisted(
  next: Partial<SalataPersistedStateV1>,
): SalataPersistedStateV1 {
  const prev = loadSalataPersisted();
  const merged: SalataPersistedStateV1 = {
    ...prev,
    ...next,
    config: { ...prev.config, ...next.config },
    managerOverrides: {
      ...prev.managerOverrides,
      ...next.managerOverrides,
    },
    savedFinalPrep: {
      ...prev.savedFinalPrep,
      ...next.savedFinalPrep,
    },
    webCandidates: next.webCandidates ?? prev.webCandidates,
    venues: next.venues ?? prev.venues,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export function resetSalataPersistence(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function overlaySignalDecisions(
  signals: EventSignal[],
  appliedIds: string[],
  ignoredIds: string[],
): EventSignal[] {
  const applied = new Set(appliedIds);
  const ignored = new Set(ignoredIds);
  return signals.map((s) => {
    if (ignored.has(s.id)) {
      return { ...s, applied: false, ignored: true };
    }
    if (applied.has(s.id)) {
      return { ...s, applied: true, ignored: false };
    }
    return { ...s, ignored: false };
  });
}

export function setManagerOverride(
  prev: Partial<Record<SalataPrepItemId, number | null>>,
  itemId: SalataPrepItemId,
  value: string,
): Partial<Record<SalataPrepItemId, number | null>> {
  const trimmed = value.trim();
  if (trimmed === "") return { ...prev, [itemId]: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return { ...prev, [itemId]: null };
  return { ...prev, [itemId]: Math.floor(n) };
}
