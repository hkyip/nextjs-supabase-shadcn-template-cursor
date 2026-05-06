/** Salata demo store (Downtown LA experiment). */
export const SALATA_DEMO_STORE_ID = "salata-demo-la";

export const SALATA_DEMO_ADDRESS =
  "505 S Flower St Suite #B430, Los Angeles, CA 90071, United States";

/** Approximate coords for distance display (Financial District). */
export const SALATA_STORE_COORDS = { lat: 34.0507, lng: -118.2542 };

export type SalataPrepItemId = "lettuce" | "onion" | "tomato";

export type EventSignalType =
  | "convention"
  | "sports"
  | "concert"
  | "theater"
  | "cinema"
  | "citywide"
  | "weather"
  | "catering"
  | "manual";

export type WalkabilityStrength =
  | "strong"
  | "medium"
  | "weak"
  | "manual"
  | "global";

export type ImpactWindow =
  | "morning-prep"
  | "lunch"
  | "afternoon"
  | "dinner"
  | "live-watch";

export type Confidence = "low" | "medium" | "high";

export type EventSource =
  | "mock"
  | "manual"
  | "web-search"
  | "weather"
  | "operator";

export type EventSignal = {
  id: string;
  storeId: string;
  name: string;
  type: EventSignalType;
  venueName: string | null;
  startTime: string;
  endTime: string | null;
  distanceMiles: number | null;
  walkabilityStrength: WalkabilityStrength;
  expectedAttendance: number | null;
  confidence: Confidence;
  source: EventSource;
  sourceUrl?: string;
  fetchedAt?: string;
  /** Center for OpenStreetMap preview; defaults to {@link SALATA_STORE_COORDS} when omitted. */
  mapCenter?: { lat: number; lng: number };
  impactWindow: ImpactWindow;
  /** Raw model impact before cap, e.g. 12 means +12%. */
  impactPercent: number;
  /** After walkability + cap. */
  cappedImpactPercent: number;
  applied: boolean;
  ignored: boolean;
  explanation: string;
};

export type StoreVenue = {
  id: string;
  storeId: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  manuallyImportant: boolean;
  notes?: string;
};

export type SalataPrepPlanItem = {
  itemId: SalataPrepItemId;
  unitLabel: "Unit";
  onHand: number;
  baselineUsage: number;
  baselinePrep: number;
  adjustmentPercent: number;
  recommendedPrep: number;
  managerOverride: number | null;
  finalPrep: number;
  reason: string;
};

export type SalataPrepPlan = {
  id: string;
  storeId: string;
  prepDate: string;
  morningPrepTime: string;
  items: SalataPrepPlanItem[];
  appliedSignalIds: string[];
  ignoredSignalIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SalataEventConfig = {
  maxAdjustmentPercent: number;
  walkableRadiusMiles: number;
  morningPrepTime: string;
  demoAmplified: boolean;
};

export type LiveWatchNote = {
  id: string;
  text: string;
  createdAt: string;
  dismissed: boolean;
};

export type SalataPersistedStateV1 = {
  version: 1;
  config: SalataEventConfig;
  /** User toggles Apply on signal id */
  appliedSignalIds: string[];
  ignoredSignalIds: string[];
  /** Per-item manager override for recommended prep */
  managerOverrides: Partial<Record<SalataPrepItemId, number | null>>;
  /** Saved final prep after Save (or override mirror) */
  savedFinalPrep: Partial<Record<SalataPrepItemId, number | null>>;
  lastSavedAt: string | null;
  webCandidates: EventSignal[];
  lastWebFetchAt: string | null;
  venues: StoreVenue[];
  liveWatchDismissedIds: string[];
};
