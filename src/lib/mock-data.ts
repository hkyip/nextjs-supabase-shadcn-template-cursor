// ---------------------------------------------------------------------------
// Forkcast V0 — Mock data for the production management demo.
// All data is static / hardcoded — no backend needed.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Store Configuration
// ---------------------------------------------------------------------------

export type StoreConfig = {
  name: string;
  address: string;
  timezone: string;
  hoursOfOperation: { day: string; open: string; close: string }[];
};

export const STORE: StoreConfig = {
  name: "Forkcast Demo Store #142",
  address: "1200 Main Street, Springfield",
  timezone: "America/Chicago",
  hoursOfOperation: [
    { day: "Monday", open: "06:00", close: "22:00" },
    { day: "Tuesday", open: "06:00", close: "22:00" },
    { day: "Wednesday", open: "06:00", close: "22:00" },
    { day: "Thursday", open: "06:00", close: "22:00" },
    { day: "Friday", open: "06:00", close: "23:00" },
    { day: "Saturday", open: "07:00", close: "23:00" },
    { day: "Sunday", open: "07:00", close: "21:00" },
  ],
};

// ---------------------------------------------------------------------------
// Menu Items — the three spec demo items
// ---------------------------------------------------------------------------

export type MenuItem = {
  id: string;
  name: string;
  cookTimeSeconds: number;
  holdTimeSeconds: number;
  batchMeasurement: string;
  batchSize: number;
  foodCostPerUnit: number;
  /** Average seconds between sales during peak demand. Drives the demo POS simulation. */
  salesIntervalSeconds: number;
};

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "original-chicken",
    name: "Original Chicken",
    cookTimeSeconds: 600,
    holdTimeSeconds: 1200,
    batchMeasurement: "pieces",
    batchSize: 8,
    foodCostPerUnit: 0.85,
    salesIntervalSeconds: 22,
  },
  {
    id: "french-fries",
    name: "French Fries",
    cookTimeSeconds: 210,
    holdTimeSeconds: 420,
    batchMeasurement: "portions",
    batchSize: 6,
    foodCostPerUnit: 0.35,
    salesIntervalSeconds: 14,
  },
  {
    id: "apple-pie",
    name: "Apple Pie",
    cookTimeSeconds: 480,
    holdTimeSeconds: 1800,
    batchMeasurement: "pieces",
    batchSize: 4,
    foodCostPerUnit: 0.65,
    salesIntervalSeconds: 55,
  },
];

/**
 * Shrinks statistical forecast units on `/forecast` and "Next 30m" in production so
 * values are easy to eyeball (e.g. tens instead of hundreds). Does not affect
 * `salesIntervalSeconds` or the POS simulation tick.
 */
export const FORECAST_DEMO_UNIT_SCALE = 0.1;

/**
 * Intraday demand shape (24 entries, local hour 0–23) for statistical forecast only.
 * Scaled in forecast.ts so long-run average rate matches salesIntervalSeconds.
 */
export const FORECAST_HOURLY_WEIGHT: Record<string, readonly number[]> = {
  "original-chicken": [
    0.05, 0.05, 0.05, 0.05, 0.08, 0.12, 0.35, 0.55, 0.75, 0.9, 1.0, 1.15, 1.25, 1.1,
    0.85, 0.7, 0.65, 0.95, 1.2, 1.05, 0.8, 0.45, 0.2, 0.1,
  ],
  "french-fries": [
    0.08, 0.06, 0.05, 0.05, 0.1, 0.18, 0.45, 0.7, 0.85, 0.95, 1.0, 1.2, 1.35, 1.15,
    0.9, 0.75, 0.85, 1.1, 1.25, 1.0, 0.75, 0.4, 0.2, 0.12,
  ],
  "apple-pie": [
    0.02, 0.02, 0.02, 0.02, 0.05, 0.1, 0.25, 0.4, 0.55, 0.65, 0.75, 0.85, 0.9, 0.8,
    0.65, 0.55, 0.5, 0.7, 0.85, 0.75, 0.5, 0.3, 0.15, 0.08,
  ],
} as const;

// ---------------------------------------------------------------------------
// Capture methods for cook-start / disposal documentation
// ---------------------------------------------------------------------------

export type CaptureMethod = "camera" | "voice" | "manual";

// ---------------------------------------------------------------------------
// Production Stage types — items flow left to right
// ---------------------------------------------------------------------------

export type WhatToCookItem = {
  menuItemId: string;
  cookQuantity: number;
  batchCount: number;
  urgency: "normal" | "soon" | "urgent";
  /** Expected units in the next 30 minutes from the time-based forecast (not sales-driven). */
  forecastedDemand: number;
  /** POS / remote tickets still waiting (units). */
  queuedUnits: number;
  /** Lane / direct-serve shortfall not covered by hot hold (units). */
  laneBacklogUnits: number;
  currentHoldInventory: number;
  currentlyCooking: number;
  soldSinceLastCook: number;
};

export type CookingBatch = {
  id: string;
  menuItemId: string;
  quantity: number;
  startedAtSeconds: number;
  captureMethod: CaptureMethod;
  /** Wall-clock instant when standard cook time should be done (set in production state). */
  targetReadyAtMs: number;
};

export type HeldBatch = {
  id: string;
  menuItemId: string;
  quantity: number;
  heldAtSeconds: number;
  holdTimeSeconds: number;
};

export type WasteEntry = {
  id: string;
  menuItemId: string;
  quantity: number;
  reason: string;
  estimatedCost: number;
  confirmed: boolean;
};

// ---------------------------------------------------------------------------
// Detection events — shared between Production and Camera views
// ---------------------------------------------------------------------------

export type DetectionEventType =
  | "cook-start"
  | "hot-hold"
  | "inventory"
  | "disposal";

export type DetectionEvent = {
  id: string;
  timestampMs: number;
  type: DetectionEventType;
  method: CaptureMethod;
  label: string;
  confidence: number;
};

export const INITIAL_EVENTS: DetectionEvent[] = [
  {
    id: "seed-1",
    timestampMs: Date.now() - 5 * 60 * 1000,
    type: "cook-start",
    method: "camera",
    label: "Cook start detected — Original Chicken (8 pcs)",
    confidence: 0.97,
  },
  {
    id: "seed-2",
    timestampMs: Date.now() - 90 * 1000,
    type: "cook-start",
    method: "voice",
    label: "Cook start logged — French Fries (6 portions)",
    confidence: 0.94,
  },
];

// ---------------------------------------------------------------------------
// Initial production state for the demo
// ---------------------------------------------------------------------------

export const INITIAL_WHAT_TO_COOK: WhatToCookItem[] = [
  {
    menuItemId: "original-chicken",
    cookQuantity: 16,
    batchCount: 2,
    urgency: "urgent",
    forecastedDemand: 32,
    queuedUnits: 0,
    laneBacklogUnits: 0,
    currentHoldInventory: 6,
    currentlyCooking: 8,
    soldSinceLastCook: 4,
  },
  {
    menuItemId: "french-fries",
    cookQuantity: 12,
    batchCount: 2,
    urgency: "soon",
    forecastedDemand: 24,
    queuedUnits: 0,
    laneBacklogUnits: 0,
    currentHoldInventory: 6,
    currentlyCooking: 6,
    soldSinceLastCook: 2,
  },
  {
    menuItemId: "apple-pie",
    cookQuantity: 4,
    batchCount: 1,
    urgency: "normal",
    forecastedDemand: 8,
    queuedUnits: 0,
    laneBacklogUnits: 0,
    currentHoldInventory: 3,
    currentlyCooking: 0,
    soldSinceLastCook: 1,
  },
];

/** `targetReadyAtMs` is a placeholder until the client provider assigns real wall times. */
export const INITIAL_COOKING: CookingBatch[] = [
  {
    id: "cook-1",
    menuItemId: "original-chicken",
    quantity: 8,
    startedAtSeconds: 240,
    captureMethod: "camera",
    targetReadyAtMs: 0,
  },
  {
    id: "cook-2",
    menuItemId: "french-fries",
    quantity: 6,
    startedAtSeconds: 90,
    captureMethod: "voice",
    targetReadyAtMs: 0,
  },
];

export const INITIAL_HELD: HeldBatch[] = [
  {
    id: "hold-1",
    menuItemId: "original-chicken",
    quantity: 6,
    heldAtSeconds: 284,
    holdTimeSeconds: 1200,
  },
  {
    id: "hold-2",
    menuItemId: "french-fries",
    quantity: 6,
    heldAtSeconds: 180,
    holdTimeSeconds: 420,
  },
  {
    id: "hold-3",
    menuItemId: "apple-pie",
    quantity: 3,
    heldAtSeconds: 720,
    holdTimeSeconds: 1800,
  },
  {
    id: "hold-4",
    menuItemId: "french-fries",
    quantity: 4,
    heldAtSeconds: 350,
    holdTimeSeconds: 420,
  },
];

export const INITIAL_WASTE: WasteEntry[] = [
  {
    id: "waste-1",
    menuItemId: "french-fries",
    quantity: 3,
    reason: "Hold time expired",
    estimatedCost: 1.05,
    confirmed: false,
  },
];

// ---------------------------------------------------------------------------
// Demand Factors — drivers of the forecast (Section 1 of the spec)
// ---------------------------------------------------------------------------

export type DemandFactor = {
  id: string;
  label: string;
  value: string;
  description: string;
  trend: "up" | "down" | "neutral";
};

export const DEMAND_FACTORS: DemandFactor[] = [
  {
    id: "historical",
    label: "Historical Sales",
    value: "Lunch baseline",
    description:
      "Baseline demand pattern by time of day, day of week, and seasonality.",
    trend: "neutral",
  },
  {
    id: "pos-velocity",
    label: "POS Velocity",
    value: "+8% vs. 15-min avg",
    description:
      "Real-time sales rate — the most responsive signal for short-term adjustments.",
    trend: "up",
  },
  {
    id: "weather",
    label: "Weather",
    value: "Light rain, 52°F",
    description:
      "Precipitation and temperature affect foot traffic and delivery volume.",
    trend: "up",
  },
  {
    id: "day-date",
    label: "Day / Date",
    value: "Thursday lunch rush",
    description: "Day of week, holidays, and pay-cycle patterns.",
    trend: "neutral",
  },
  {
    id: "local-event",
    label: "Local Event",
    value: "Football kickoff 7:00 PM",
    description:
      "Sporting events, concerts, school schedules, and other predictable traffic drivers.",
    trend: "up",
  },
  {
    id: "promotion",
    label: "Promotion",
    value: "Chicken combo LTO active",
    description: "Active deals, LTOs, or marketing campaigns that shift demand.",
    trend: "up",
  },
];

// ---------------------------------------------------------------------------
// Dynamic Alerts
// ---------------------------------------------------------------------------

export type AlertType = "weather" | "event" | "demand";

export type DynamicAlert = {
  id: string;
  type: AlertType;
  icon: string;
  title: string;
  trigger: string;
  impact: string;
  action: string;
  delayMs: number;
};

export const DEMO_ALERTS: DynamicAlert[] = [
  {
    id: "alert-weather",
    type: "weather",
    icon: "cloud-rain",
    title: "WEATHER ALERT",
    trigger: "Rain started 5 minutes ago.",
    impact: "Expect an increase in delivery orders over the next 30 minutes.",
    action:
      "Cook 1 additional batch of Original Chicken now to stay ahead of demand.",
    delayMs: 15000,
  },
  {
    id: "alert-event",
    type: "event",
    icon: "trophy",
    title: "LOCAL EVENT",
    trigger: "Football game ended 10 minutes ago.",
    impact: "Traffic spike expected in 15\u201320 minutes.",
    action:
      "Start 2 extra batches of Fries and 1 batch of Original Chicken now to avoid a stockout at the rush.",
    delayMs: 45000,
  },
  {
    id: "alert-demand",
    type: "demand",
    icon: "trending-down",
    title: "DEMAND SHIFT",
    trigger: "POS velocity for Apple Pie has dropped 40% in the last 30 minutes.",
    impact: "Lower-than-expected demand for this item.",
    action: "Reduce next cook to 1 batch instead of 2 to avoid waste.",
    delayMs: 75000,
  },
];

// ---------------------------------------------------------------------------
// Dashboard — Reporting mock data
// ---------------------------------------------------------------------------

export type DashboardPeriod = "day" | "week" | "month" | "year";

export type DashboardKpi = {
  label: string;
  value: number;
  unit: string;
  change: string;
  positive: boolean;
};

export const DASHBOARD_KPIS: Record<DashboardPeriod, DashboardKpi[]> = {
  day: [
    { label: "Production Accuracy", value: 91, unit: "%", change: "+2% vs yesterday", positive: true },
    { label: "Stockout Count", value: 2, unit: "events", change: "-3 vs yesterday", positive: true },
    { label: "Waste Cost", value: 18.4, unit: "$", change: "-$6.20 vs yesterday", positive: true },
    { label: "Hold Time Violations", value: 1, unit: "events", change: "-2 vs yesterday", positive: true },
  ],
  week: [
    { label: "Production Accuracy", value: 88, unit: "%", change: "+3% vs last week", positive: true },
    { label: "Stockout Count", value: 12, unit: "events", change: "-5 vs last week", positive: true },
    { label: "Waste Cost", value: 142.5, unit: "$", change: "-$31 vs last week", positive: true },
    { label: "Hold Time Violations", value: 8, unit: "events", change: "+2 vs last week", positive: false },
  ],
  month: [
    { label: "Production Accuracy", value: 86, unit: "%", change: "+5% vs last month", positive: true },
    { label: "Stockout Count", value: 48, unit: "events", change: "-18 vs last month", positive: true },
    { label: "Waste Cost", value: 589.0, unit: "$", change: "-$124 vs last month", positive: true },
    { label: "Hold Time Violations", value: 31, unit: "events", change: "-12 vs last month", positive: true },
  ],
  year: [
    { label: "Production Accuracy", value: 82, unit: "%", change: "+12% vs prior year", positive: true },
    { label: "Stockout Count", value: 580, unit: "events", change: "-220 vs prior year", positive: true },
    { label: "Waste Cost", value: 7120.0, unit: "$", change: "-$2,840 vs prior year", positive: true },
    { label: "Hold Time Violations", value: 365, unit: "events", change: "-145 vs prior year", positive: true },
  ],
};

export type ForecastVsActualPoint = {
  label: string;
  forecast: number;
  actual: number;
};

export const FORECAST_VS_ACTUAL: Record<DashboardPeriod, ForecastVsActualPoint[]> = {
  day: [
    { label: "6 AM", forecast: 8, actual: 6 },
    { label: "8 AM", forecast: 22, actual: 20 },
    { label: "10 AM", forecast: 45, actual: 48 },
    { label: "12 PM", forecast: 98, actual: 102 },
    { label: "2 PM", forecast: 65, actual: 58 },
    { label: "4 PM", forecast: 40, actual: 42 },
    { label: "6 PM", forecast: 88, actual: 92 },
    { label: "8 PM", forecast: 55, actual: 50 },
    { label: "10 PM", forecast: 15, actual: 12 },
  ],
  week: [
    { label: "Mon", forecast: 320, actual: 310 },
    { label: "Tue", forecast: 295, actual: 288 },
    { label: "Wed", forecast: 310, actual: 325 },
    { label: "Thu", forecast: 340, actual: 335 },
    { label: "Fri", forecast: 420, actual: 445 },
    { label: "Sat", forecast: 480, actual: 470 },
    { label: "Sun", forecast: 350, actual: 340 },
  ],
  month: [
    { label: "Wk 1", forecast: 2200, actual: 2150 },
    { label: "Wk 2", forecast: 2350, actual: 2400 },
    { label: "Wk 3", forecast: 2180, actual: 2100 },
    { label: "Wk 4", forecast: 2420, actual: 2380 },
  ],
  year: [
    { label: "Jan", forecast: 9200, actual: 8800 },
    { label: "Feb", forecast: 8500, actual: 8200 },
    { label: "Mar", forecast: 9800, actual: 9600 },
    { label: "Apr", forecast: 10200, actual: 10500 },
    { label: "May", forecast: 11000, actual: 10800 },
    { label: "Jun", forecast: 12500, actual: 12200 },
    { label: "Jul", forecast: 13000, actual: 13400 },
    { label: "Aug", forecast: 12800, actual: 12500 },
    { label: "Sep", forecast: 11500, actual: 11200 },
    { label: "Oct", forecast: 10800, actual: 10600 },
    { label: "Nov", forecast: 9500, actual: 9800 },
    { label: "Dec", forecast: 10500, actual: 10200 },
  ],
};

export type WasteByProduct = {
  menuItemId: string;
  name: string;
  quantity: number;
  cost: number;
};

export type WasteByShift = {
  shift: "Morning" | "Lunch" | "Afternoon" | "Dinner" | "Late";
  cost: number;
};

export const WASTE_BY_SHIFT: Record<DashboardPeriod, WasteByShift[]> = {
  day: [
    { shift: "Morning", cost: 2.1 },
    { shift: "Lunch", cost: 7.4 },
    { shift: "Afternoon", cost: 3.2 },
    { shift: "Dinner", cost: 4.8 },
    { shift: "Late", cost: 0.9 },
  ],
  week: [
    { shift: "Morning", cost: 14.8 },
    { shift: "Lunch", cost: 52.1 },
    { shift: "Afternoon", cost: 21.0 },
    { shift: "Dinner", cost: 46.2 },
    { shift: "Late", cost: 8.4 },
  ],
  month: [
    { shift: "Morning", cost: 62.5 },
    { shift: "Lunch", cost: 215.3 },
    { shift: "Afternoon", cost: 88.1 },
    { shift: "Dinner", cost: 190.8 },
    { shift: "Late", cost: 32.3 },
  ],
  year: [
    { shift: "Morning", cost: 740.0 },
    { shift: "Lunch", cost: 2610.5 },
    { shift: "Afternoon", cost: 1065.4 },
    { shift: "Dinner", cost: 2310.0 },
    { shift: "Late", cost: 394.1 },
  ],
};

export type WasteByHourPoint = {
  hour: string;
  cost: number;
};

export const WASTE_BY_HOUR: WasteByHourPoint[] = [
  { hour: "6 AM", cost: 0.4 },
  { hour: "7 AM", cost: 0.9 },
  { hour: "8 AM", cost: 0.8 },
  { hour: "9 AM", cost: 0.3 },
  { hour: "10 AM", cost: 0.6 },
  { hour: "11 AM", cost: 1.8 },
  { hour: "12 PM", cost: 3.1 },
  { hour: "1 PM", cost: 2.5 },
  { hour: "2 PM", cost: 1.2 },
  { hour: "3 PM", cost: 0.9 },
  { hour: "4 PM", cost: 1.1 },
  { hour: "5 PM", cost: 1.6 },
  { hour: "6 PM", cost: 2.2 },
  { hour: "7 PM", cost: 1.9 },
  { hour: "8 PM", cost: 0.7 },
  { hour: "9 PM", cost: 0.3 },
  { hour: "10 PM", cost: 0.1 },
];

export const WASTE_BY_PRODUCT: Record<DashboardPeriod, WasteByProduct[]> = {
  day: [
    { menuItemId: "original-chicken", name: "Original Chicken", quantity: 5, cost: 4.25 },
    { menuItemId: "french-fries", name: "French Fries", quantity: 18, cost: 6.3 },
    { menuItemId: "apple-pie", name: "Apple Pie", quantity: 3, cost: 1.95 },
  ],
  week: [
    { menuItemId: "original-chicken", name: "Original Chicken", quantity: 32, cost: 27.2 },
    { menuItemId: "french-fries", name: "French Fries", quantity: 95, cost: 33.25 },
    { menuItemId: "apple-pie", name: "Apple Pie", quantity: 18, cost: 11.7 },
  ],
  month: [
    { menuItemId: "original-chicken", name: "Original Chicken", quantity: 128, cost: 108.8 },
    { menuItemId: "french-fries", name: "French Fries", quantity: 380, cost: 133.0 },
    { menuItemId: "apple-pie", name: "Apple Pie", quantity: 72, cost: 46.8 },
  ],
  year: [
    { menuItemId: "original-chicken", name: "Original Chicken", quantity: 1540, cost: 1309.0 },
    { menuItemId: "french-fries", name: "French Fries", quantity: 4560, cost: 1596.0 },
    { menuItemId: "apple-pie", name: "Apple Pie", quantity: 860, cost: 559.0 },
  ],
};
