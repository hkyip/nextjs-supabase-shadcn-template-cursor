import { z } from "zod";

import type { DemoTimeScale } from "@/lib/demo-clock";
import type { CaptureMethod } from "@/lib/mock-data";
import { DEMO_ALERTS } from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Remote command model
//
// Commands are fired either by the local Command Deck (on /production) or by
// a paired /remote controller over Supabase Realtime. The production reducer
// is the single place that applies them.
// ---------------------------------------------------------------------------

export type RemoteCommandType =
  | "cook-start"
  | "hot-hold"
  | "served"
  | "disposal"
  | "dynamic-alert"
  | "set-demo-time"
  | "set-demo-time-scale"
  | "set-demo-now";

export type CookStartCommand = {
  type: "cook-start";
  menuItemId: string;
  quantity: number;
  method: CaptureMethod;
  narration: string;
};

export type HotHoldCommand = {
  type: "hot-hold";
  menuItemId: string;
  /** Informational — the reducer promotes the oldest matching cooking batch. */
  quantity: number;
  method: CaptureMethod;
  narration: string;
};

export type ServedCommand = {
  type: "served";
  menuItemId: string;
  quantity: number;
  method: CaptureMethod;
  narration: string;
  /**
   * `"pos"` (from `/pos`) or `"remote"` (from `/remote` serving panel) → production
   * queues in Incoming orders. Omitted → apply `served` immediately from hot hold.
   */
  orderSource?: "pos" | "remote";
};

export type DisposalCommand = {
  type: "disposal";
  /** Optional: if omitted, the oldest waste entry is cleared. */
  menuItemId?: string;
  method: CaptureMethod;
  narration: string;
};

/** Push a forecast / ops coaching banner on the production screen (from `/remote` only in UI). */
export type DynamicAlertCommand = {
  type: "dynamic-alert";
  alertId: (typeof DEMO_ALERTS)[number]["id"];
  method: CaptureMethod;
  narration: string;
};

/** Jump the demo store clock to a local time-of-day (store TZ) for rehearsals. */
export type SetDemoTimeCommand = {
  type: "set-demo-time";
  hour: number;
  minute: number;
  method: CaptureMethod;
  narration: string;
};

/** Set accelerated timeline vs wall clock (`1` or `10`). */
export type SetDemoTimeScaleCommand = {
  type: "set-demo-time-scale";
  timeScale: DemoTimeScale;
  method: CaptureMethod;
  narration: string;
};

/** Snap demo clock to real wall “now” (same UTC instant as this device), keep time scale. */
export type SetDemoNowCommand = {
  type: "set-demo-now";
  method: CaptureMethod;
  narration: string;
};

export type RemoteCommand =
  | CookStartCommand
  | HotHoldCommand
  | ServedCommand
  | DisposalCommand
  | DynamicAlertCommand
  | SetDemoTimeCommand
  | SetDemoTimeScaleCommand
  | SetDemoNowCommand;

const captureMethodSchema: z.ZodType<CaptureMethod> = z.enum([
  "camera",
  "voice",
  "manual",
]);

const cookStartSchema = z.object({
  type: z.literal("cook-start"),
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
  method: captureMethodSchema,
  narration: z.string().min(1).max(200),
});

const hotHoldSchema = z.object({
  type: z.literal("hot-hold"),
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
  method: captureMethodSchema,
  narration: z.string().min(1).max(200),
});

const servedSchema = z.object({
  type: z.literal("served"),
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive().max(50),
  method: captureMethodSchema,
  narration: z.string().min(1).max(200),
  orderSource: z.enum(["pos", "remote"]).optional(),
});

const disposalSchema = z.object({
  type: z.literal("disposal"),
  menuItemId: z.string().min(1).optional(),
  method: captureMethodSchema,
  narration: z.string().min(1).max(200),
});

const dynamicAlertIdSchema = z.enum(
  DEMO_ALERTS.map((a) => a.id) as [string, string, ...string[]],
);

const dynamicAlertSchema = z.object({
  type: z.literal("dynamic-alert"),
  alertId: dynamicAlertIdSchema,
  method: captureMethodSchema,
  narration: z.string().min(1).max(200),
});

const setDemoTimeSchema = z.object({
  type: z.literal("set-demo-time"),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  method: captureMethodSchema,
  narration: z.string().min(1).max(200),
});

const demoTimeScaleSchema = z.union([z.literal(1), z.literal(10)]);

const setDemoTimeScaleSchema = z.object({
  type: z.literal("set-demo-time-scale"),
  timeScale: demoTimeScaleSchema,
  method: captureMethodSchema,
  narration: z.string().min(1).max(200),
});

const setDemoNowSchema = z.object({
  type: z.literal("set-demo-now"),
  method: captureMethodSchema,
  narration: z.string().min(1).max(200),
});

export const remoteCommandSchema: z.ZodType<RemoteCommand> =
  z.discriminatedUnion("type", [
    cookStartSchema,
    hotHoldSchema,
    servedSchema,
    disposalSchema,
    dynamicAlertSchema,
    setDemoTimeSchema,
    setDemoTimeScaleSchema,
    setDemoNowSchema,
  ]);

export function parseRemoteCommand(payload: unknown): RemoteCommand | null {
  const result = remoteCommandSchema.safeParse(payload);
  return result.success ? result.data : null;
}

// ---------------------------------------------------------------------------
// Demo script catalog — the buttons rendered on /production and /remote
// ---------------------------------------------------------------------------

export type DemoScriptKind = "voice" | "camera" | "manual";

export type DemoScript = {
  id: string;
  kind: DemoScriptKind;
  label: string;
  command: RemoteCommand;
};

export const DEMO_SCRIPTS: DemoScript[] = [
  // Voice — chef narrates an action
  {
    id: "voice-chicken-in-fryer",
    kind: "voice",
    label: "Chicken in the fryer",
    command: {
      type: "cook-start",
      menuItemId: "original-chicken",
      quantity: 8,
      method: "voice",
      narration: "Chicken in the fryer",
    },
  },
  {
    id: "voice-fries-in-fryer",
    kind: "voice",
    label: "Fries in the fryer",
    command: {
      type: "cook-start",
      menuItemId: "french-fries",
      quantity: 6,
      method: "voice",
      narration: "Fries in the fryer",
    },
  },
  {
    id: "voice-pies-in-oven",
    kind: "voice",
    label: "Apple pies in the oven",
    command: {
      type: "cook-start",
      menuItemId: "apple-pie",
      quantity: 4,
      method: "voice",
      narration: "Apple pies in the oven",
    },
  },
  {
    id: "voice-two-chickens-served",
    kind: "voice",
    label: "Two chickens served",
    command: {
      type: "served",
      menuItemId: "original-chicken",
      quantity: 2,
      method: "voice",
      narration: "Two chickens served",
    },
  },
  {
    id: "voice-one-fries-served",
    kind: "voice",
    label: "One fries served",
    command: {
      type: "served",
      menuItemId: "french-fries",
      quantity: 1,
      method: "voice",
      narration: "One fries served",
    },
  },

  // Camera — vision model detects an event
  {
    id: "camera-chicken-detected",
    kind: "camera",
    label: "Detected 8 pcs chicken on cooking surface",
    command: {
      type: "cook-start",
      menuItemId: "original-chicken",
      quantity: 8,
      method: "camera",
      narration: "Detected 8 pieces of chicken on the cooking surface",
    },
  },
  {
    id: "camera-fries-detected",
    kind: "camera",
    label: "Detected 6 portions fries in fryer",
    command: {
      type: "cook-start",
      menuItemId: "french-fries",
      quantity: 6,
      method: "camera",
      narration: "Detected 6 portions of fries in the fryer",
    },
  },
  {
    id: "camera-chicken-served",
    kind: "camera",
    label: "Detected 2 chicken being served",
    command: {
      type: "served",
      menuItemId: "original-chicken",
      quantity: 2,
      method: "camera",
      narration: "Detected 2 pieces of chicken being served",
    },
  },
  {
    id: "camera-fries-disposal",
    kind: "camera",
    label: "Detected fries disposal",
    command: {
      type: "disposal",
      menuItemId: "french-fries",
      method: "camera",
      narration: "Detected fries removed from hold station",
    },
  },

  // Manual — chef taps a control
  {
    id: "manual-cook-chicken",
    kind: "manual",
    label: "Chef tap — cook chicken",
    command: {
      type: "cook-start",
      menuItemId: "original-chicken",
      quantity: 8,
      method: "manual",
      narration: "Chef tapped cook-start for chicken",
    },
  },
  {
    id: "manual-confirm-disposal",
    kind: "manual",
    label: "Chef tap — confirm disposal",
    command: {
      type: "disposal",
      method: "manual",
      narration: "Chef confirmed disposal",
    },
  },
];
