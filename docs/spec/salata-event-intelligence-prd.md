# Salata Event Intelligence - PRD (prototype)

**Status:** Draft for customer-intent demo  
**Related:** [Salata Salade Prep PRD](./salata-salade-prep-prd.md)

---

## Problem

Managers are expected to account for weather, holidays, catering, and community events while planning prep, but event discovery and impact estimation are manual. A nearby convention, game, concert, weather event, or citywide event can change same-day food demand, especially in downtown stores.

The prototype should test whether operators value an event-intelligence layer that finds relevant signals, explains why they matter, and feeds bounded adjustments into item-level prep recommendations.

---

## Goals

- Identify events that may affect same-day prep demand for a specific Salata store.
- Support the experiment location:
  `505 S Flower St Suite #B430, Los Angeles, CA 90071, United States`.
- Combine deterministic mocked events with optional live/web-searched event candidates.
- Allow manually important venues per store.
- Score events by walkability, timing, event type, confidence, and expected impact.
- Feed approved/high-confidence signals into `/salade-prep`.
- Persist discovered, applied, ignored, and manually added signals.

---

## Non-goals

- No fully automated production-grade event ingestion in V0.
- No hard dependency on live web search for page load.
- No claim that event attendance estimates are authoritative.
- No automatic adjustment from unknown-confidence events unless promoted by rules or manager action.

---

## Reasonable Hybrid Approach

The prototype should use a hybrid event model:

1. **Deterministic mock events** load by default for a reliable demo.
2. **Manually important venues** are stored per location and always checked.
3. **Optional live search refresh** can fetch or summarize current event candidates.
4. Live results are cached/persisted with source, timestamp, and confidence.
5. Event candidates can be shown without being applied.

This is more reasonable than relying on live search at render time. It keeps demos deterministic, avoids brittle page-load failures, and still proves the value of live event discovery.

---

## Store-Specific Venue Model

The LA store should support both radius-based and manual venue importance.

Suggested seeded venues:

| Venue | Notes |
|-------|-------|
| Los Angeles Convention Center | Strong daytime/lunch relevance when conventions are active. |
| Crypto.com Arena | Major sports/concert venue; likely Live Watch relevance for overtime or post-event spikes. |
| Peacock Theater / L.A. Live | Concert/theater/event-night relevance. |
| Orpheum Theatre | Walkable theater signal. |
| The Mayan | Event-night signal. |
| Walt Disney Concert Hall / Music Center | Civic/cultural events; distance may be weaker but manually important. |
| Dodger Stadium | Not walkable, but may matter as a citywide/sports signal. |

Manual venue importance can override distance if the operator knows the venue affects the store.

---

## Walkability Scoring

Raw radius is not enough in downtown LA. The prototype should start with distance bands and leave room for future walking-time APIs.

| Distance | Default strength |
|----------|------------------|
| 0 to 0.25 mi | Strong |
| 0.25 to 0.5 mi | Medium |
| 0.5 to 1.0 mi | Weak |
| > 1.0 mi | Ignored unless major or manually important |

Config:

```ts
walkableRadiusMiles = 1
```

Future versions can replace straight-line distance with actual walking time, pedestrian barriers, transit, and venue exit flow.

---

## Event Types

| Type | Typical prep relevance |
|------|------------------------|
| Convention | Strong lunch relevance, especially business/conference crowds. |
| Sports | Pre/post-event and Live Watch relevance; overtime can shift late demand. |
| Concert | Dinner/evening relevance; may be weaker for morning prep unless predictable. |
| Theater | Dinner/evening relevance. |
| Cinema | Usually weaker unless unusually large release/event. |
| Citywide/global | Broad modifier; should require manual or confidence gating. |
| Weather | Can affect foot traffic and item mix; relevant to morning prep and Live Watch. |
| Catering/manual note | Highest trust when supplied by store/operator. |

---

## Signal Model

```ts
EventSignal {
  id: string;
  storeId: string;
  name: string;
  type:
    | "convention"
    | "sports"
    | "concert"
    | "theater"
    | "cinema"
    | "citywide"
    | "weather"
    | "catering"
    | "manual";
  venueName: string | null;
  startTime: string;
  endTime: string | null;
  distanceMiles: number | null;
  walkabilityStrength: "strong" | "medium" | "weak" | "manual" | "global";
  expectedAttendance: number | null;
  confidence: "low" | "medium" | "high";
  source: "mock" | "manual" | "web-search" | "weather" | "operator";
  sourceUrl?: string;
  fetchedAt?: string;
  impactWindow: "morning-prep" | "lunch" | "afternoon" | "dinner" | "live-watch";
  impactPercent: number;
  cappedImpactPercent: number;
  applied: boolean;
  ignored: boolean;
  explanation: string;
}
```

---

## Impact Rules

Scheduled same-day events known before 8:00 AM can affect **Morning Prep**.

Late-breaking signals after prep cutoff should go to **Live Watch**, not silently rewrite the saved morning prep plan.

Examples:

| Signal | Surface | Example action |
|--------|---------|----------------|
| Convention at 11:00 AM near store | Morning Prep | Increase lettuce/onion/tomato within cap. |
| NBA game goes overtime at night | Live Watch | Recommend small late prep or staffing attention. |
| Thunderstorm alert before lunch | Morning Prep or Live Watch | Reduce or shift demand depending on confidence. |
| Unknown web event with low confidence | Event Candidates | Show but do not auto-apply. |

---

## Adjustment Config

Default:

```ts
SalataEventConfig {
  maxAdjustmentPercent: 25;
  walkableRadiusMiles: 1;
  morningPrepTime: "08:00";
  demoAmplified: true;
}
```

The cap is configurable. For the prototype, **25%** is the default maximum adjustment so the effect is visible but not absurd.

If demo amplification is active, the UI must label the effect clearly.

---

## Persistence

Prototype persistence should support:

- Store-specific important venues.
- Event candidates discovered by mock/manual/web/weather sources.
- Applied and ignored signals.
- Live Watch recommendations.
- Config values.
- Last fetched timestamp for live search.

Future production persistence can use:

```ts
StoreVenue {
  id: string;
  storeId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  manuallyImportant: boolean;
  notes?: string;
}

EventSignalDecision {
  id: string;
  eventSignalId: string;
  storeId: string;
  decision: "applied" | "ignored" | "candidate";
  decidedBy: "system" | "manager";
  decidedAt: string;
  notes?: string;
}
```

---

## Live Search Behavior

Live search should be explicit, not automatic on every render.

Recommended V0 behavior:

- Button: "Refresh live event candidates".
- Show loading and last refreshed time.
- Cache results for the demo day.
- Each result shows source/confidence.
- Manager can apply, ignore, or mark venue important.

This protects the demo from network variability and makes the hybrid nature honest.

---

## Acceptance Criteria

- The system can show mocked event signals for the LA store.
- The system can represent store-specific important venues.
- Event candidates include timing, type, confidence, source, and impact explanation.
- High-confidence scheduled events can feed the `/salade-prep` morning recommendation.
- Late-breaking signals go to Live Watch.
- Unknown/low-confidence candidates can be shown without automatic adjustment.
- Applied/ignored decisions persist in the prototype.

---

## Open Questions

- Which live search provider or agent should be used first?
- Should weather be a first-class source in V0 or mocked alongside events?
- Should low-confidence events default to "candidate" even when visually compelling?
- What is the minimum evidence required to mark a venue important for a store?
