# Salata Salade Prep - PRD (prototype)

**Status:** Draft for customer-intent demo  
**Route:** `/salade-prep`  
**Related:** [Salata Event Intelligence PRD](./salata-event-intelligence-prd.md), [Forecasting PRD](./forecasting-prd.md)

---

## Problem

Salata morning prep is mostly decided early in the day, but the current prep-sheet workflow asks managers to mentally account for weather, holidays, catering, and community events. That context is easy to miss, hard to quantify, and not connected to item-level prep recommendations.

The prototype should show whether operators value an event-aware prep assistant that explains same-day demand risks and lets managers accept or override suggested prep quantities.

---

## Goals

- Create a new `/salade-prep` demo route in the same demo navigation family as the kitchen forecasting screens.
- Focus on food prep, not fry/cook production.
- Recommend morning prep for three items: **onion**, **lettuce**, and **tomato**.
- Use mocked 14-day usage history, current on-hand counts, and same-day event/weather modifiers.
- Show both automatic forecast adjustment and manager-visible explanations.
- Support interactive manager overrides and persist the final decision.
- Include a separate **Live Watch** section for events that happen after morning prep, such as NBA overtime or weather alerts.

---

## Non-goals

- No production ML model.
- No POS integration for V0.
- No real inventory system integration.
- No guarantee that live event search is authoritative.
- No full Salata prep-sheet recreation; the prototype covers only three prep items.

---

## User

Primary user: store manager or shift lead preparing cold salad ingredients around **8:00 AM local store time**.

Experiment store:

`505 S Flower St Suite #B430, Los Angeles, CA 90071, United States`

---

## Route And Navigation

| Route | Role |
|-------|------|
| `/salade-prep` | New Salata cold-prep prototype. |
| `/fry-kitchen` | Fry / statistical demand demo (forecast view). **`/forecast` redirects here.** |

The Salata prep page should sit beside the kitchen/fry workflow, not replace it. This keeps salad prep and fry-kitchen forecasting conceptually separate.

---

## Core Workflow

1. Manager opens `/salade-prep` during morning prep.
2. The page loads mocked 14-day usage and mocked current on-hand counts.
3. The page evaluates same-day event and weather signals.
4. The system recommends prep quantities for onion, lettuce, and tomato.
5. Manager reviews explanations and overrides quantities if needed.
6. Manager saves the final prep plan.
7. During the day, **Live Watch** shows late-breaking signals and recommends recovery actions without silently rewriting the morning prep plan.

---

## Prep Items

| Item | Unit | Notes |
|------|------|-------|
| Lettuce | Unit | Generic demo unit for morning prep. |
| Onion | Unit | Generic demo unit for morning prep. |
| Tomato | Unit | Generic demo unit for morning prep. |

Use the generic label **Unit** for the prototype. A future version can map each item to realistic containers, tubs, bags, or 32 oz units.

---

## Calculation

The V0 formula should be simple and explainable:

```text
baselineUsage = average(last 14 days same-weekday usage)
adjustedUsage = ceil(baselineUsage * eventMultiplier * weatherMultiplier)
recommendedPrep = max(0, adjustedUsage - onHand)
finalPrep = managerOverride ?? recommendedPrep
```

The adjustment cap must be configurable.

Default:

```ts
maxAdjustmentPercent = 25
morningPrepTime = "08:00"
unitLabel = "Unit"
```

Because this is a customer-intent demo, adjustments may be visually obvious, but the UI must label this as **demo-amplified** when an adjustment is boosted for presentation clarity.

---

## Morning Prep UI

The page should include:

- Store header with address and prep date.
- Morning prep cutoff time.
- Item-level recommendation table.
- Event/weather explanation panel.
- Manager override controls.
- Save action for the final prep plan.

Table columns:

| Column | Meaning |
|--------|---------|
| Item | Onion, lettuce, tomato. |
| On hand | Mocked current count. |
| 14-day avg | Same-weekday average usage from mocked history. |
| Baseline prep | `max(0, baselineUsage - onHand)`. |
| Adjustment | Event/weather effect, capped by config. |
| Recommended prep | System recommendation after modifiers. |
| Override | Manager-entered value. |
| Final prep | Persisted accepted or overridden value. |
| Reason | Short explanation of the largest factor. |

---

## Live Watch UI

Live Watch is separate from morning prep.

It handles signals discovered after morning prep, such as:

- NBA game goes overtime.
- Concert/theater event is delayed.
- Weather alert changes traffic.
- Usage is running hot or cold versus the morning plan.

Live Watch recommendations should be action-oriented:

- "Prep +1 Unit lettuce now."
- "Hold tomato prep; usage is below plan."
- "Expect post-game spike in 45 minutes."

Live Watch must not silently rewrite the saved morning prep plan. It can create a persisted live recommendation or manager note.

---

## Persistence

Prototype persistence should support:

- Saved final prep quantities.
- Manager overrides.
- Ignored/applied event signals.
- Live Watch actions.
- Config values such as `maxAdjustmentPercent`.

For V0 implementation, persistence can be local/browser or app-level mocked persistence if database schema is not ready, but the PRD requirement is that decisions survive basic page interaction and can be reviewed.

Future production persistence should store:

```ts
SalataPrepPlan {
  id: string;
  storeId: string;
  prepDate: string;
  morningPrepTime: string;
  items: SalataPrepPlanItem[];
  appliedSignalIds: string[];
  ignoredSignalIds: string[];
  createdAt: string;
  updatedAt: string;
}

SalataPrepPlanItem {
  itemId: "lettuce" | "onion" | "tomato";
  unitLabel: "Unit";
  onHand: number;
  baselineUsage: number;
  baselinePrep: number;
  adjustmentPercent: number;
  recommendedPrep: number;
  managerOverride: number | null;
  finalPrep: number;
  reason: string;
}
```

---

## Acceptance Criteria

- `/salade-prep` shows onion, lettuce, and tomato prep recommendations.
- Recommendations use mocked 14-day history and same-day event/weather signals.
- The default adjustment cap is 25% and is configurable.
- The UI clearly distinguishes morning prep from Live Watch.
- Manager overrides are interactive and persist in the prototype.
- Event/weather explanations are visible next to the affected prep items.
- Demo-amplified adjustments are labeled as such.

---

## Open Questions

- What persistence mechanism should V0 use: local storage, mock server state, Supabase, or future-only schema?
- Should manager overrides feed future mocked learning, or remain isolated decisions?
- Should Live Watch have explicit "accept" and "dismiss" actions?
- Should the page include a printable/exportable prep sheet in V0?
