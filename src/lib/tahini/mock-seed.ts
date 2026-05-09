import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  RotateCw,
} from "lucide-react";

export type TahiniScreenId = "prep" | "live" | "stockout" | "grill";
export type GrillStateId = "idle" | "cooking" | "ready" | "over" | "safety";
export type SpitTone = "neutral" | "ready" | "warning" | "critical" | "reload";
export type RotationSpeed = "LOW" | "MEDIUM" | "HIGH";

export type TahiniScreenTab = {
  id: TahiniScreenId;
  code: string;
  label: string;
  detail: string;
  icon: LucideIcon;
};

export type PrepLoad = {
  id: string;
  protein: string;
  kg: number;
  tentative?: boolean;
};

export type LiveSpit = {
  id: string;
  protein: string;
  status: string;
  tone: SpitTone;
  remainingKg: number;
  loadedKg: number;
  shavedKg: number;
  outerColor: string;
  lastShave: string;
  rotation: RotationSpeed;
  suggested: RotationSpeed;
  note: string;
  action: string;
};

export type StockoutSpit = {
  id: string;
  protein: string;
  status: string;
  tone: SpitTone;
  remainingKg: number;
  loadedKg: number;
  shavedKg: number;
  salesPace: string;
  emptyEstimate: string;
  lastShave: string;
};

export type GrillState = {
  id: GrillStateId;
  code: string;
  title: string;
  caption: string;
  status: string;
  timeValue: string;
  timeLabel: string;
  command: string;
  tone: "neutral" | "ready" | "over" | "safety";
  batches: string;
  averageTime: string;
  averageDetail: string;
  violations: string;
  violationsDetail: string;
  note?: string;
};

export const TAHINI_SCREENS: TahiniScreenTab[] = [
  {
    id: "prep",
    code: "A",
    label: "Morning prep",
    detail: "Pre-open forecast",
    icon: Clock3,
  },
  {
    id: "live",
    code: "B",
    label: "Live cooking",
    detail: "Spit-side tablet",
    icon: RotateCw,
  },
  {
    id: "stockout",
    code: "B*",
    label: "Stockout reload",
    detail: "Start new cone",
    icon: AlertTriangle,
  },
  {
    id: "grill",
    code: "C",
    label: "Grill station",
    detail: "30s batch timer",
    icon: Flame,
  },
];

export const TAHINI_PREP = {
  store: "Tahini's - Yonge & Eg",
  time: "Tuesday, May 12 - 6:47 AM",
  window: "~ 6:30-7:30 AM - before opening",
  prompt: "How much do I cook today?",
  today: {
    cookKg: 20,
    chickenKg: 14.2,
    gyroKg: 5.8,
  },
  yesterday: {
    cookedKg: 19.4,
    soldKg: 18.5,
    wasteKg: 0.9,
    wastePercent: 5,
  },
  loads: [
    { id: "SPIT 1", protein: "Chicken", kg: 7.5 },
    { id: "SPIT 2", protein: "Chicken", kg: 6.7 },
    { id: "SPIT 3", protein: "Gyro", kg: 5.8, tentative: true },
  ] satisfies PrepLoad[],
};

export const TAHINI_LIVE = {
  store: "Tahini's - Yonge & Eg",
  time: "Tuesday, May 12 - 12:34 PM - LUNCH RUSH",
  window: "~ 8 AM-close - runs all day",
  prompt: "What's happening on each spit right now?",
  kpis: [
    {
      label: "Remaining on spits",
      value: "14.8 kg",
      detail: "across 3 spits",
    },
    {
      label: "Shaved today",
      value: "5.2 kg",
      detail: "~ 38 portions",
    },
    {
      label: "Est. stockout",
      value: "--",
      detail: "no risk currently",
    },
  ],
  spits: [
    {
      id: "SPIT 1",
      protein: "Chicken",
      status: "Live cam",
      tone: "neutral",
      remainingKg: 5.4,
      loadedKg: 7.5,
      shavedKg: 2.1,
      outerColor: "Building crust",
      lastShave: "3 min ago",
      rotation: "MEDIUM",
      suggested: "MEDIUM",
      note: "Demand pace matches volume - keep current speed",
      action: "Wait - ready in ~5 min",
    },
    {
      id: "SPIT 2",
      protein: "Chicken",
      status: "Ready to shave",
      tone: "ready",
      remainingKg: 4.8,
      loadedKg: 6.7,
      shavedKg: 1.9,
      outerColor: "Ready (golden)",
      lastShave: "8 min ago",
      rotation: "HIGH",
      suggested: "LOW",
      note: "Plenty of meat for the rest of lunch - slow rotation to preserve",
      action: "Shave now",
    },
    {
      id: "SPIT 3",
      protein: "Gyro",
      status: "Overcooking - 3 min past window",
      tone: "warning",
      remainingKg: 4.6,
      loadedKg: 5.8,
      shavedKg: 1.2,
      outerColor: "Too dark",
      lastShave: "14 min ago",
      rotation: "MEDIUM",
      suggested: "MEDIUM",
      note: "Shave first - rotation is fine",
      action: "Shave now",
    },
  ] satisfies LiveSpit[],
};

export const TAHINI_STOCKOUT = {
  store: "Tahini's - Yonge & Eg",
  time: "Tuesday, May 12 - 2:15 PM",
  window: "~ 75 min before projected empty",
  prompt: "You'll run out - start a new cone now",
  alert: {
    label: "Stockout risk - chicken",
    message:
      "Spit 1 will run out at ~3:30 PM - start a new cone now to be ready by then",
  },
  kpis: [
    {
      label: "Remaining on spits",
      value: "7.6 kg",
      detail: "across 3 spits",
    },
    {
      label: "Shaved today",
      value: "12.4 kg",
      detail: "~ 91 portions - pace +18%",
    },
    {
      label: "Est. stockout",
      value: "3:30 PM",
      detail: "spit 1 - chicken",
    },
  ],
  depleting: {
    id: "SPIT 1",
    protein: "Chicken",
    status: "Depleting fast",
    tone: "critical",
    remainingKg: 1.4,
    loadedKg: 7.5,
    shavedKg: 6.1,
    salesPace: "+18% vs fcst",
    emptyEstimate: "~ 3:30 PM",
    lastShave: "2 min ago",
  } satisfies StockoutSpit,
  reload: {
    protein: "Chicken",
    loadKg: 5.2,
    layers: "~ 12 layers",
    startCookingBy: "2:30 PM",
    readyBy: "ready by 3:30 PM",
    note: "Lunch ran 18% above forecast. Smaller cone - only 6.5 hrs of sellable time left before close at 9 PM.",
  },
  remaining: [
    {
      id: "SPIT 2",
      protein: "Chicken",
      status: "Live cam",
      tone: "neutral",
      remainingKg: 3.6,
      loadedKg: 6.7,
      shavedKg: 3.1,
      salesPace: "on track",
      emptyEstimate: "~ 5:45 PM",
      lastShave: "5 min ago",
    },
    {
      id: "SPIT 3",
      protein: "Gyro",
      status: "Live cam",
      tone: "neutral",
      remainingKg: 2.6,
      loadedKg: 5.8,
      shavedKg: 3.2,
      salesPace: "on track",
      emptyEstimate: "~ 6:30 PM",
      lastShave: "8 min ago",
    },
  ] satisfies StockoutSpit[],
};

export const TAHINI_GRILL_STATES: GrillState[] = [
  {
    id: "idle",
    code: "C1",
    title: "Idle",
    caption: "waiting for shavings",
    status: "Idle",
    timeValue: "Ready",
    timeLabel: "Camera will start the timer when shavings hit the grill",
    command: "Ready when you are",
    tone: "neutral",
    batches: "14",
    averageTime: "31.2s",
    averageDetail: "target 30.0s",
    violations: "0",
    violationsDetail: "none today",
  },
  {
    id: "cooking",
    code: "C2",
    title: "Cooking",
    caption: "timer running",
    status: "Cooking",
    timeValue: "17s",
    timeLabel: "remaining",
    command: "Keep on the grill",
    tone: "neutral",
    batches: "15",
    averageTime: "31.2s",
    averageDetail: "target 30.0s",
    violations: "0",
    violationsDetail: "none today",
  },
  {
    id: "ready",
    code: "C3",
    title: "Ready",
    caption: "remove now - chime fires",
    status: "Ready - remove now",
    timeValue: "0s",
    timeLabel: "done",
    command: "Remove now",
    tone: "ready",
    batches: "15",
    averageTime: "31.2s",
    averageDetail: "target 30.0s",
    violations: "0",
    violationsDetail: "none today",
  },
  {
    id: "over",
    code: "C4a",
    title: "Over target",
    caption: "yield loss - coaching trips on pattern",
    status: "Over target - remove",
    timeValue: "+8s",
    timeLabel: "past target",
    command: "Remove - losing yield",
    tone: "over",
    batches: "15",
    averageTime: "33.4s",
    averageDetail: "target 30s - trending up",
    violations: "0",
    violationsDetail: "none today",
    note: "Coaching note: 4 of last 5 batches removed 5+ seconds late. You're losing ~3% yield per batch. Try removing right at the chime - the meat is fully cooked at 30s.",
  },
  {
    id: "safety",
    code: "C4b",
    title: "Food safety violation",
    caption: "removed under 30s - logged + corrective",
    status: "Food safety violation",
    timeValue: "11s",
    timeLabel: "short - unsafe to serve",
    command: "Put it back on - 11s remaining",
    tone: "safety",
    batches: "15",
    averageTime: "31.2s",
    averageDetail: "target 30s",
    violations: "1",
    violationsDetail: "logged - 12:34 PM",
  },
];

export const TAHINI_OPEN_QUESTIONS = [
  "Daily reset time - likely 4 AM reset rolls live cooking back to morning prep.",
  "Spillover handling - subtract carry-over cone weight from the next prep target.",
  "Cook time per protein - chicken around 60 min, gyro still TBD.",
  "Stockout buffer - currently 15 min and should be configurable.",
  "Color thresholds - tune ready versus too dark per protein and brand.",
  "Stagger spit start times - evaluate lunch and dinner peak freshness.",
  "Coaching threshold - current pattern is 4 of last 5 late removals.",
  "Multi-spit stockout - confirm layout behavior when 4+ cards appear.",
];

export const TAHINI_GRILL_ICON_BY_TONE = {
  neutral: Gauge,
  ready: CheckCircle2,
  over: AlertTriangle,
  safety: AlertTriangle,
} satisfies Record<GrillState["tone"], LucideIcon>;
