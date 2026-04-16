// ---------------------------------------------------------------------------
// Mock data for the Fry Kitchen Demand Forecasting demo.
// All data is static / hardcoded -- no backend needed.
// ---------------------------------------------------------------------------

export type FryItem = {
  id: string;
  name: string;
  category: "protein" | "sides" | "snacks";
  unit: string;
  cookTimeSeconds: number;
};

export const MENU_ITEMS: FryItem[] = [
  { id: "chicken-tenders", name: "Chicken Tenders", category: "protein", unit: "pcs", cookTimeSeconds: 270 },
  { id: "fries-large", name: "Fries (Large)", category: "sides", unit: "bags", cookTimeSeconds: 210 },
  { id: "fries-regular", name: "Fries (Regular)", category: "sides", unit: "bags", cookTimeSeconds: 210 },
  { id: "onion-rings", name: "Onion Rings", category: "snacks", unit: "pcs", cookTimeSeconds: 180 },
  { id: "fish-fillets", name: "Fish Fillets", category: "protein", unit: "pcs", cookTimeSeconds: 300 },
  { id: "mozzarella-sticks", name: "Mozzarella Sticks", category: "snacks", unit: "pcs", cookTimeSeconds: 150 },
  { id: "chicken-wings", name: "Chicken Wings", category: "protein", unit: "pcs", cookTimeSeconds: 480 },
  { id: "corn-dogs", name: "Corn Dogs", category: "snacks", unit: "pcs", cookTimeSeconds: 240 },
];

// ---------------------------------------------------------------------------
// Station: "Drop Now" recommendations
// ---------------------------------------------------------------------------

export type DropNowItem = {
  itemId: string;
  name: string;
  unit: string;
  quantity: number;
  demandInSeconds: number;
  confidence: number;
};

export const DROP_NOW: DropNowItem[] = [
  { itemId: "chicken-tenders", name: "Chicken Tenders", unit: "pcs", quantity: 10, demandInSeconds: 300, confidence: 0.91 },
  { itemId: "fries-large", name: "Fries (Large)", unit: "bags", quantity: 6, demandInSeconds: 300, confidence: 0.88 },
  { itemId: "onion-rings", name: "Onion Rings", unit: "pcs", quantity: 8, demandInSeconds: 300, confidence: 0.84 },
];

// ---------------------------------------------------------------------------
// Station: Holding Bin
// ---------------------------------------------------------------------------

export type FreshnessStatus = "fresh" | "good" | "stale";

export type HoldingBinEntry = {
  itemId: string;
  name: string;
  unit: string;
  quantity: number;
  cookedMinutesAgo: number;
  maxHoldMinutes: number;
  status: FreshnessStatus;
};

export const HOLDING_BIN: HoldingBinEntry[] = [
  { itemId: "chicken-tenders", name: "Chicken Tenders", unit: "pcs", quantity: 8, cookedMinutesAgo: 2, maxHoldMinutes: 10, status: "fresh" },
  { itemId: "fries-large", name: "Fries (Large)", unit: "bags", quantity: 4, cookedMinutesAgo: 6, maxHoldMinutes: 7, status: "stale" },
  { itemId: "onion-rings", name: "Onion Rings", unit: "pcs", quantity: 6, cookedMinutesAgo: 1, maxHoldMinutes: 8, status: "fresh" },
  { itemId: "fish-fillets", name: "Fish Fillets", unit: "pcs", quantity: 3, cookedMinutesAgo: 4, maxHoldMinutes: 12, status: "good" },
  { itemId: "mozzarella-sticks", name: "Mozzarella Sticks", unit: "pcs", quantity: 5, cookedMinutesAgo: 8, maxHoldMinutes: 8, status: "stale" },
];

// ---------------------------------------------------------------------------
// Station: Upcoming demand (5-min intervals, next 30 min)
// ---------------------------------------------------------------------------

export type DemandIntensity = "low" | "medium" | "high" | "peak";

export type UpcomingSlot = {
  label: string;
  totalOrders: number;
  intensity: DemandIntensity;
};

export const UPCOMING_DEMAND: UpcomingSlot[] = [
  { label: "11:45", totalOrders: 14, intensity: "medium" },
  { label: "11:50", totalOrders: 22, intensity: "high" },
  { label: "11:55", totalOrders: 31, intensity: "peak" },
  { label: "12:00", totalOrders: 28, intensity: "high" },
  { label: "12:05", totalOrders: 18, intensity: "medium" },
  { label: "12:10", totalOrders: 9, intensity: "low" },
];

// ---------------------------------------------------------------------------
// Shift: Full-day demand curve (hourly)
// ---------------------------------------------------------------------------

export type HourlyDemand = {
  hour: string;
  predicted: number;
  actual: number;
  phase: "opening" | "morning" | "lunch" | "afternoon" | "dinner" | "closing";
};

export const SHIFT_DEMAND_CURVE: HourlyDemand[] = [
  { hour: "10 AM", predicted: 20, actual: 18, phase: "opening" },
  { hour: "11 AM", predicted: 45, actual: 42, phase: "morning" },
  { hour: "12 PM", predicted: 98, actual: 102, phase: "lunch" },
  { hour: "1 PM", predicted: 110, actual: 105, phase: "lunch" },
  { hour: "2 PM", predicted: 65, actual: 60, phase: "afternoon" },
  { hour: "3 PM", predicted: 35, actual: 38, phase: "afternoon" },
  { hour: "4 PM", predicted: 30, actual: 28, phase: "afternoon" },
  { hour: "5 PM", predicted: 72, actual: 70, phase: "dinner" },
  { hour: "6 PM", predicted: 95, actual: 91, phase: "dinner" },
  { hour: "7 PM", predicted: 88, actual: 85, phase: "dinner" },
  { hour: "8 PM", predicted: 55, actual: 52, phase: "closing" },
  { hour: "9 PM", predicted: 25, actual: 22, phase: "closing" },
];

// ---------------------------------------------------------------------------
// Shift: KPI summary
// ---------------------------------------------------------------------------

export type KpiData = {
  label: string;
  value: string;
  unit: string;
  change: string;
  positive: boolean;
};

export const KPIS: KpiData[] = [
  { label: "Forecast Accuracy", value: "87", unit: "%", change: "+3% vs last week", positive: true },
  { label: "Waste Avoided", value: "12", unit: "lbs ($48)", change: "-18% waste today", positive: true },
  { label: "Avg Wait Impact", value: "-40", unit: "sec", change: "vs no-forecast baseline", positive: true },
  { label: "Orders Today", value: "738", unit: "orders", change: "+5% vs forecast", positive: true },
];

// ---------------------------------------------------------------------------
// Shift: Item-level forecast vs actual
// ---------------------------------------------------------------------------

export type ItemForecast = {
  itemId: string;
  name: string;
  category: string;
  forecasted: number;
  actual: number;
  variance: number;
  wasteLbs: number;
};

export const ITEM_FORECASTS: ItemForecast[] = [
  { itemId: "chicken-tenders", name: "Chicken Tenders", category: "Protein", forecasted: 240, actual: 232, variance: -3.3, wasteLbs: 1.8 },
  { itemId: "fries-large", name: "Fries (Large)", category: "Sides", forecasted: 185, actual: 190, variance: 2.7, wasteLbs: 0.5 },
  { itemId: "fries-regular", name: "Fries (Regular)", category: "Sides", forecasted: 160, actual: 155, variance: -3.1, wasteLbs: 0.8 },
  { itemId: "onion-rings", name: "Onion Rings", category: "Snacks", forecasted: 120, actual: 115, variance: -4.2, wasteLbs: 1.2 },
  { itemId: "fish-fillets", name: "Fish Fillets", category: "Protein", forecasted: 85, actual: 82, variance: -3.5, wasteLbs: 0.9 },
  { itemId: "mozzarella-sticks", name: "Mozzarella Sticks", category: "Snacks", forecasted: 95, actual: 98, variance: 3.2, wasteLbs: 0.3 },
  { itemId: "chicken-wings", name: "Chicken Wings", category: "Protein", forecasted: 140, actual: 135, variance: -3.6, wasteLbs: 2.1 },
  { itemId: "corn-dogs", name: "Corn Dogs", category: "Snacks", forecasted: 65, actual: 60, variance: -7.7, wasteLbs: 1.4 },
];

// ---------------------------------------------------------------------------
// Shift phase config
// ---------------------------------------------------------------------------

export const SHIFT_PHASES = [
  { id: "opening", label: "Opening", timeRange: "10 – 11 AM" },
  { id: "morning", label: "Late Morning", timeRange: "11 AM – 12 PM" },
  { id: "lunch", label: "Lunch Rush", timeRange: "12 – 2 PM" },
  { id: "afternoon", label: "Afternoon Lull", timeRange: "2 – 5 PM" },
  { id: "dinner", label: "Dinner Rush", timeRange: "5 – 8 PM" },
  { id: "closing", label: "Closing", timeRange: "8 – 10 PM" },
] as const;
