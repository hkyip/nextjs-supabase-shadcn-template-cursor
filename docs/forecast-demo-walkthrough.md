# Forecast demo — 60–90 second walkthrough

Use this script when showing how the Forkcast **V0 demo** ties the forecast to the line. All routes assume the dev server is running (for example `http://localhost:3000`).

## Setup (optional)

- Open **Production** in one window: `/production`
- Open **Fry kitchen** (`/fry-kitchen`; legacy **`/forecast` redirects**) in another (or the same tab)

Both use the same **demo session** (shared `ProductionProvider` in the demo layout), so numbers on `/fry-kitchen` can line up with **What to Cook** when you expand **Live bridge** on the fry-kitchen page.

## Script

1. **Fry kitchen (`/fry-kitchen`)** — “This is the **plan from the clock**, not from last sale.”
   - Point to **How this demo works**: **Track A** is store time → intraday curve → **next 30 minutes** expected units.
   - Point to the **three cards**: each SKU has its **own** curve; numbers are **expected units** in the sliding window.
   - Point to **Today**: switching **Original Chicken / French Fries / Apple Pie** changes the **shape**; the **green** bars are buckets overlapping **now through the next 30 minutes**.

2. **Contrast** — “What you sell does **not** move that statistical line.”
   - Open the collapsible **Live bridge** and pick a product tab so it matches a tile.
   - Say: **Next 30m (forecast)** stays on the time model; **Queue** and **Lane** are **operations** from POS/lane (see Production).

3. **Production (`/production`)** — “Here’s where forecast meets inventory.”
   - Point to **Next 30m**, **Queue**, **Lane**, **Hold**, **Cooking** on **What to Cook**.
   - Short line: cook target combines **forecast − pipeline + queue + lane** (see explainer card on `/fry-kitchen`).
   - Mention the link line at the top: **Demand curve & today’s time buckets → `/fry-kitchen`** (legacy `/forecast` redirects).

4. **Optional punch** — Open **POS** (`/pos`) in another tab, ring through a ticket, come back to Production and show **Queue** (and **Cook qty**) reacting while the **Next 30m** forecast figure (time-based) does not jump just because of a single order **within** plan.

## If asked “where is weather / ML?”

This V0 demo uses a **mock intraday curve** and **no live backend**. Say: production roadmap can swap the curve for historical sales and other signals; the **separation** of statistical forecast vs operational queue is the architectural point you’re showing.
