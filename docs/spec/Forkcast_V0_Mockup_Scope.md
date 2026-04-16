  
**FORKCAST**

V0 Mockup Demo

**Production Screen Scope & Specification**

Real-time production management across the full food lifecycle

April 2026  |  Confidential

# **Demo Overview**

This document defines the scope for the Forkcast V0 mockup demo. The demo covers a single, end-to-end production workflow on an in-store tablet: from forecasting what to cook, through active cooking, hot holding, and disposal. It demonstrates how Forkcast manages the full food lifecycle in real time.

### **Core Process Flow**

The production screen follows food through five stages, displayed as a continuous left-to-right workflow:

**What to Cook  →  Cooking  →  Cooked  →  Held  →  Disposed**

Each stage is a column on the production screen. Items move from left to right as they progress through the lifecycle. At any moment, a staff member can glance at the screen and see the full state of production for every item.

### **Demo Items**

The mockup uses three representative items to demonstrate different production behaviors:

* **Original Chicken** — Longer cook time, moderate hold time, discrete item tracking

* **French Fries** — Short cook time, short hold time, bulk/batch tracking

* **Apple Pie** — Moderate cook time, longer hold time, low volume

## **1\. System Configuration (Back-End)**

Before the production screen can operate, the system requires foundational data. This configuration is set up once per store and updated as the menu or operating conditions change.

### **Store Setup**

* **Store information:** Name, address, time zone

* **Hours of operation:** Day-by-day operating schedule

### **Item Configuration**

Each menu item requires the following metadata to drive production logic:

| Parameter | Description |
| :---- | :---- |
| **Prep / Cook Time** | Time required from raw to cooked. Determines when to start cooking to meet demand. |
| **Hold Time / Shelf Life** | Maximum SOP holding duration after cooking. Drives the hold timer and disposal alerts. |
| **Batch Measurement** | Unit of measurement for production (pieces, weight, portions). |
| **Batch Size** | Standard production quantity per cook cycle (e.g., 8 pieces per batch, 1 basket of fries). |

### **Demand Factors**

The production forecast is driven by multiple variables that the system weighs to predict near-term demand:

| Factor | How It Influences Forecast |
| :---- | :---- |
| **Historical Sales** | Baseline demand pattern by time of day, day of week, and seasonality |
| **POS Velocity** | Real-time sales rate. The most responsive signal for short-term adjustments. |
| **Weather** | Precipitation, temperature, and severe weather affect foot traffic and delivery volume. |
| **Day / Date** | Day of week, holidays, pay cycles, and other calendar patterns. |
| **Local Events** | Sporting events, concerts, school schedules, and other predictable traffic drivers. |
| **Promotions** | Active deals, LTOs, or marketing campaigns that shift demand toward specific items. |

## **2\. Production Screen (In-Store Tablet)**

This is the core interface. Staff interact with this screen throughout their shift. It must be readable at a glance from arm’s length, operable with greasy hands, and unambiguous under time pressure. Item name, status, cook time, quantity, and batch size must be visible across all columns at all times.

The tablet screen or screens  are divided into columns, each representing a stage in the production lifecycle:

### **Column 1: What to Cook (Production Forecast)**

Displays the real-time calculated quantity the staff member needs to start cooking now. This is the system’s primary output — the answer to the question every kitchen operator asks: “How much should I drop?”

**Display:**

* A prominent tile per item showing the cook quantity in both units and batches (e.g., “10 pieces / 2 batches of Original Chicken”)

* Visual urgency indicator when the system predicts a stockout is approaching

**Cook Count Logic:**

The displayed cook quantity is calculated using:

*Cook Quantity \= Forecasted Demand − (Current Hold Inventory \+ Currently Cooking − Units Sold Since Last Cook- anticipated sales before current cooking complete)*

In plain language: the system looks at how much demand it expects in the near term, subtracts what’s already in the hold and what’s currently on the grill or in the fryer, accounts for what’s been sold since the last batch started, and tells the operator the gap. If the gap is positive, it’s time to cook.

**Dynamic Alerts (Key Feature)**

Dynamic Alerts are the system’s way of communicating why the forecast is changing and what the operator should do about it. They appear as a visual overlay on the production screen — a banner or card that interrupts the steady-state display to ensure it’s noticed. Each alert has three components: what changed, what it means for demand, and what action to take.

| ⛈  WEATHER ALERT Rain started 5 minutes ago. Expect an increase in delivery orders over the next 30 minutes. Cook 1 additional batch of Original Chicken now to stay ahead of demand. |
| :---- |

| 🏈  LOCAL EVENT Football game ended 10 minutes ago. Traffic spike expected in 15–20 minutes. Start 2 extra batches of Fries and 1 batch of Original Chicken now to avoid a stockout at the rush. |
| :---- |

| 📉  DEMAND SHIFT POS velocity for Apple Pie has dropped 40% in the last 30 minutes. Reduce next cook to 1 batch instead of 2 to avoid waste. |
| :---- |

*Every alert follows the same pattern: trigger (what changed) → impact (what it means for demand) → action (what to do now). This is the core Forkcast difference — the system doesn’t just report conditions, it coaches the operator through the response. Alerts should visually interrupt the normal screen state so they are not overlooked.*

### **Column 2: In Progress (Being Cooked)**

Tracks items that are actively cooking. Once a cook starts, the item moves from Column 1 to Column 2 with a running timer.

**Cook Start Documentation:**

Staff document the cook start using one of three methods:

| Method | How It Works | Display Icon |
| :---- | :---- | :---- |
| **Camera** | Camera detects items placed on grill / in fryer and auto-logs the start time | Camera icon |
| **Voice** | Staff says "Chicken cook started" and the system logs via voice recognition | Microphone icon |
| **Manual** | Staff taps a button on the tablet to log the cook start | Hand/tap icon |

The capture method icon is displayed next to each in-progress item so management can see which documentation method is being used across shifts and stations. This data informs decisions about camera placement and staff training.

### **Column 3: Being Held (Hold Inventory)**

Tracks finished food in the hot hold station. After cooking, the camera detects the transfer to the hold and the item moves from Column 2 to Column 3\. A countdown timer starts based on the item’s SOP hold time.

**Display:**

* **Quantity and time remaining per batch.** Example: “6 pcs Original Chicken — 15:16 remaining” or “4 pcs Original Chicken — 4:56 remaining”

* **Color-coded urgency:** Green (ample time), yellow (approaching hold limit), red (at or past limit)

* **Multiple batches visible:** If the hold contains batches placed at different times, each is shown with its own timer

*The hold timer is critical because it directly prevents food safety violations. When the timer hits zero, the item must move to Column 4 (Waste). The system does not allow items to remain in the Hold column past expiry without escalation.*

### **Column 4: Waste (Disposal)**

When an item’s hold time expires, it automatically moves from Column 3 to Column 4\. This column serves two purposes: alerting staff to discard the expired food, and capturing the waste event for reporting.

**Display:**

* **Item name and quantity** to be discarded

* **Estimated waste cost** (quantity multiplied by item food cost)

* **Reason for waste:** Hold time expired (the default trigger for this column)

**Disposal Confirmation:**

Staff confirm the disposal using the same three input methods available throughout the system: camera detection (items removed from the hold), voice confirmation, or manual button tap. Once confirmed, the item clears from the production screen and the waste event is logged to the reporting dashboard.

*Items reach this column only when their hold time has expired. Food that is sold before expiry simply depletes from Column 3 and never appears here. The Waste column captures exclusively the cost of overproduction and hold-time violations.*

## **3\. Camera Monitoring View (Demo Artifact)**

In addition to the production screen, the mockup should include a separate view showing the camera’s perspective with visual overlays: bounding boxes around detected items, on-screen labels identifying what the system sees, and event annotations (e.g., “Cook start detected”, “Transfer to hot hold”, “Disposal confirmed”).

**Purpose:**

This is a demo artifact designed to show prospects and the engineering team how the camera detection works under the hood. It is not a production screen that staff would interact with during normal operations. The designer should build it as a separate view, not as part of the production tablet interface.

**Key Events to Visualize:**

* **Cook start detection:** Camera recognizes items placed on the cooking surface

* **Hot hold transfer:** Camera detects cooked items moved to the holding station

* **Inventory tracking:** Camera tracks item count or fill level in the hold over time

* **Disposal capture:** Camera confirms items have been removed from the hold after expiry

For each event, the alternative input methods (voice and manual) should also be represented in the UI so prospects can see the full flexibility of the system.

## **4\. Management Dashboard & Reporting**

A web-based dashboard provides performance data for management review. The mockup should include day, week, month, and year views.

### **Key Metrics**

| Metric | What It Measures |
| :---- | :---- |
| **Production Accuracy %** | How closely actual cook counts matched the system’s forecast. The core metric for system performance. |
| **Forecast vs. Actual** | Predicted demand compared to actual POS sales over time. Shows whether the model’s predictions are improving and where they diverge. |
| **Stockout Count** | Number of instances where an item was unavailable (hold inventory hit zero while demand existed). Measures underproduction. |
| **Waste by Product** | Quantity and cost of food discarded due to expired hold times. Broken down by item, shift, and time of day. |
| **Hold Time Violations** | Number of times food was held past the SOP limit before being discarded. A food safety compliance metric. |

*The Forecast vs. Actual metric is critical for long-term credibility. It’s the number that proves the system is getting smarter over time, and it’s what an operations director will evaluate when deciding whether to expand the deployment.*

## **5\. Open Design Questions**

The following are unresolved decisions that affect the physical setup and should be debated during the mockup review:

### **Tablet Configuration**

* **Single screen:** One tablet displays all four production columns for all items. Simpler to build and demo, but may be too dense for a busy station.

* **Multi-screen:** Separate tablets at the cook station and the hold station, each showing only the relevant columns. More realistic for production use, but increases hardware cost and adds synchronization requirements.

* **Customer-configurable:** Let the operator choose their setup based on store layout and product mix. Most flexible, but adds configuration complexity.

### **Alert Behavior**

* Should Dynamic Alerts include an audio component (chime or voice announcement), or visual only?

* How long should an alert remain on screen before auto-dismissing? Should it require a manual acknowledgment?

* If multiple alerts fire at once (e.g., weather change \+ event ending), how are they prioritized and stacked?

### **Camera Fallback**

* When the camera cannot confirm an event (e.g., steam obscuring the hold station), should the system automatically fall back to prompting for manual input, or should it log the gap and continue?

* What level of camera detection confidence is required before auto-logging an event vs. asking for staff confirmation?