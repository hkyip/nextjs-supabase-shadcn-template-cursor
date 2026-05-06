# Forecasting — PRD (lean)

**Status:** V0 demo  
**Code:** [`src/lib/forecast.ts`](../../src/lib/forecast.ts), [`src/lib/use-production-state.ts`](../../src/lib/use-production-state.ts)  
**Related:** [Forkcast V0 Mockup Scope](./Forkcast_V0_Mockup_Scope.md)

---

## What “What to Cook” is

It answers: *how many units to **start** now so we are not short soon, given **hold + cooking + committed demand**?*

**Cook math (V0):**

`cookQty ≈ round(max(0, adjustedPlan − hold − cooking + queue + laneBacklog))`

where **`adjustedPlan = baseline × velocity × eventMult × operator`** (demo):

- **Baseline** — same as `forecastUnitsInWindow` (time + intraday curve only). Shown as **Next 30m / baseline** on tiles; **not** bumped by a single normal order.
- **Velocity** — rolling direct-serve sales vs integrated baseline over the same simulated window (capped).
- **Events** — active `dynamic-alert` modifiers from [`ALERT_FORECAST_MULTIPLIERS`](../../src/lib/mock-data.ts) until simulated expiry.
- **Operator** — recent hold-expiry waste nudges the plan term up slightly.
- **Queue / lane** — **operational** on top of `adjustedPlan`; they do **not** change the baseline number on the tile.

---

## Separation principle

| Signal | Role |
|--------|------|
| **Statistical forecast** | Expected units in the next ~30 minutes from store-local clock + per-SKU shape + baseline rate. Slides with real time; a normal order does **not** bump this baseline. |
| **Hold / cooking** | Reduces how much more to start. |
| **Queue / lane** | Adds urgency when tickets or shortfall need product not covered by the shelf. |

**Actual sales** move inventory, queue, and lane — **not** the pure time-model forecast number (V0).

---

## V0 inputs (implemented)

| Input | Source |
|-------|--------|
| Store TZ | `STORE.timezone` in [`mock-data.ts`](../../src/lib/mock-data.ts) |
| `now` | Virtual **demo store clock** (`demoClock` in production state, default **1×** wall); passed into `forecastUnitsInWindow` / buckets. Remote **`set-demo-time`** jumps local time-of-day in `STORE.timezone`. |
| Shape | `FORECAST_HOURLY_WEIGHT` (24 hourly weights per SKU) |
| Rate anchor | `salesIntervalSeconds` per SKU |
| Demo scale | `FORECAST_DEMO_UNIT_SCALE` (forecast display only; does not retime POS sim) |
| Horizon | `FORECAST_DEFAULT_WINDOW_MINUTES` (30) |
| Buckets | `intradayBucketsForDate` — `/fry-kitchen` highlights buckets overlapping **now → now+30m** |

**Rate (concept):** `(1 / salesIntervalSeconds) × (hourlyWeight / meanWeight) × FORECAST_DEMO_UNIT_SCALE`; integrate over the window for **expected units**.

---

## API sketch

- **`forecastUnitsInWindow(menuItemId, now, windowMinutes)`** — headline “next 30m” units.  
- **`intradayBucketsForDate(...)`** — full-day series in store local time.  
- **`computeForecastBreakdown`** ([`forecast-breakdown.ts`](../../src/lib/forecast-breakdown.ts)) — baseline + factors → `adjustedUnits`.
- Production **`forecastedDemand`** = baseline only; **`adjustedExpectedDemand`** = adjusted plan; **not** from unfulfilled orders.

---

## Surfaces

| Path | Role |
|------|------|
| `/fry-kitchen` | Fry / hot-side demand curve demo (forecast view). **`/forecast` redirects here.** |
| `/salade-prep` | Salata cold salad prep prototype driven by mocked usage + hybrid event signals. |
| `/production` | Tiles: baseline × factors → adjusted plan; queue/lane vs pipeline → cook qty |
| `/remote` | Presets jump demo time; forecast alerts apply event multipliers |

---

## Non-goals (V0)

No Supabase-persisted curves, no live weather/ML, no bucket-vs-actual reconciliation on this screen.

---

## Roadmap (one line)

Persisted history, external factors (weather/events/promos), velocity layer **without** double-counting queue, and dropping demo scale in real deployments.

---

*Update when forecast inputs or cook math change.*
