"use client";

import { basketRemainingSeconds } from "@/lib/wings/basket-state";
import type { PredropAnalysis } from "@/lib/wings/predrop";
import type { FryerBasket, WingsPersistedStateV1 } from "@/lib/wings/types";

interface Props {
  state: WingsPersistedStateV1;
  predrop: PredropAnalysis;
  nowMs: number;
  onDrop: (basketId: string, lbs: number) => void;
  onPull: (basketId: string) => void;
  onRedrop: (basketId: string) => void;
}

export function ScreenBStation({
  state,
  predrop,
  nowMs,
  onDrop,
  onPull,
  onRedrop,
}: Props) {
  const { config } = state;

  // Demand strip values
  const waitingWings = Math.round(
    state.ordersOpen.reduce((s, o) => s + o.weightLbs, 0) * config.wingsPerLb,
  );
  const openTickets = state.ordersOpen.length;
  const next15LowerLbs = predrop.nextBucketLbs;
  const next15LowerWings = Math.round(next15LowerLbs * config.wingsPerLb);
  const next15UpperWings = Math.round(next15LowerWings * 1.2);

  // Compliance — real counts from KPIs
  const totalCycles = Math.max(1, state.kpis.totalBasketCycles);
  const violationCount =
    state.kpis.undercookedPulls + state.kpis.overcookedPulls;
  const compliancePct = Math.round(
    ((totalCycles - violationCount) / totalCycles) * 100,
  );

  // Active food-safety violations: any basket currently in UNDERCOOKED state.
  const undercookedBaskets = state.baskets.filter(
    (b) => b.status === "undercooked",
  );

  // Drop recommendations land on the first empty basket
  const dropRecommendationsByBasketId = new Map<string, number>();
  if (predrop.recommendedLbs > 0) {
    const empty = state.baskets.find((b) => b.status === "empty");
    if (empty) {
      dropRecommendationsByBasketId.set(
        empty.id,
        Math.round(
          Math.min(config.basketCapacityLbs, predrop.recommendedLbs) *
            config.wingsPerLb,
        ),
      );
    }
  }

  const nowLabel = new Date(nowMs).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <div className="screen-meta">
        <span className="num">SCREEN B</span>
        <span className="name">LIVE FRYER STATION — DROP RECOMMENDATIONS + VIOLATION STATES</span>
        <span className="when">cook-facing tablet · auto-refresh every few seconds</span>
      </div>

      <div className="tablet">
        <div className="header">
          <span>[ Forkcast ] &nbsp;&nbsp; St. Louis Wings — Brentwood</span>
          <span className="center">{nowLabel}</span>
          <span className="user">[ Fry Station ▾ ]</span>
        </div>

        <div className="main">
          {undercookedBaskets.length > 0 ? (
            <div
              className="food-safety-banner"
              role="alert"
              aria-live="assertive"
            >
              <div className="fsb-mark">⚠</div>
              <div className="fsb-body">
                <div className="fsb-ttl">FOOD SAFETY VIOLATION</div>
                <div className="fsb-msg">
                  {undercookedBaskets.length === 1
                    ? `B${undercookedBaskets[0].index + 1} pulled before 7:30 — wings must be re-dropped before serving.`
                    : `${undercookedBaskets.length} baskets pulled before 7:30 — wings must be re-dropped before serving.`}
                </div>
              </div>
              <div className="fsb-action">
                Action: <strong>RE-DROP IMMEDIATELY</strong>
              </div>
            </div>
          ) : null}

          <div className="demand-strip">
            <div className="demand-cell">
              <div className="lbl">WAITING TO SERVE</div>
              <div className="val">{waitingWings} wings</div>
              <div className="sub">
                {openTickets} open ticket{openTickets === 1 ? "" : "s"} on KDS
              </div>
            </div>
            <div className="demand-cell">
              <div className="lbl">FORECAST NEXT 15M</div>
              <div className="val">
                {next15LowerWings}–{next15UpperWings}
              </div>
              <div className="sub">wings expected</div>
            </div>
            <div className="demand-cell mode">
              <div className="lbl">MODE</div>
              <div className="val">{predrop.urgent ? "REACT" : "PROACTIVE"}</div>
              <div className="sub">
                {predrop.urgent
                  ? "demand exceeds capacity"
                  : "adding anticipatory drops"}
              </div>
            </div>
          </div>

          {/* Live fryer grid */}
          <div
            className="fryer-grid"
            style={{
              gridTemplateColumns: `repeat(${Math.min(
                4,
                state.baskets.length,
              )}, 1fr)`,
            }}
          >
            {state.baskets.map((b) => (
              <FryerCard
                key={b.id}
                basket={b}
                cookSeconds={config.cookSeconds}
                cookOvershootSeconds={config.cookOvershootSeconds}
                wingsPerLb={config.wingsPerLb}
                recommendedWings={dropRecommendationsByBasketId.get(b.id)}
                onDrop={() => onDrop(b.id, config.basketCapacityLbs)}
                onPull={() => onPull(b.id)}
                onRedrop={() => onRedrop(b.id)}
              />
            ))}
          </div>

          {/* Compliance counter — single live metric, no reference cards */}
          <div className="violations-line">
            <span>
              Today&apos;s compliance:{" "}
              <span className="vio-count">
                {violationCount} violation{violationCount === 1 ? "" : "s"}
              </span>{" "}
              of {totalCycles} baskets · {compliancePct}% on-time
            </span>
            <span className="vio-link">[ View log → ]</span>
          </div>

          <div className="footer-actions">
            <div className="footer-meta">
              Recommendations refresh every 30s · last update{" "}
              {new Date(nowMs).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}{" "}
              · camera-confirmed drops
            </div>
            <div>
              <button className="btn secondary" type="button">Override mode</button>
              <button className="btn" type="button">View today&apos;s recap →</button>
            </div>
          </div>
        </div>
      </div>

      <p className="annotation">
        Screen B · live. Demand strip locks the next 15&nbsp;min in view. Each fryer card shows the
        current state: COOKING with countdown · READY for plate-up · IDLE with a drop recommendation
        · UNDERCOOKED (red, sticky until REDROP) · OVERCOOKED (amber, counting UP).
      </p>
    </>
  );
}

/* ============================ Live fryer card ============================ */

interface CardProps {
  basket: FryerBasket;
  cookSeconds: number;
  cookOvershootSeconds: number;
  wingsPerLb: number;
  recommendedWings?: number;
  onDrop: () => void;
  onPull: () => void;
  onRedrop: () => void;
}

function FryerCard({
  basket,
  cookSeconds,
  cookOvershootSeconds,
  wingsPerLb,
  recommendedWings,
  onDrop,
  onPull,
  onRedrop,
}: CardProps) {
  const isFrying = basket.status === "frying";
  const isReady = basket.status === "ready";
  const isOvercook = basket.status === "overcook";
  const isUndercooked = basket.status === "undercooked";

  const remaining = basketRemainingSeconds(basket, {
    cookSeconds,
    cookOvershootSeconds,
  } as Parameters<typeof basketRemainingSeconds>[1]);
  const wings = Math.round(basket.weightLbs * wingsPerLb);

  const timerStr = fmt(Math.max(0, remaining));
  const overcookSeconds = Math.max(0, basket.elapsedSeconds - cookSeconds);
  const overcookStr = fmt(overcookSeconds);

  const stateLabel = isUndercooked
    ? "UNDERCOOKED"
    : isOvercook
      ? "OVERCOOKED"
      : isReady
        ? "READY"
        : isFrying
          ? "COOKING"
          : "IDLE";
  const stateClass = isUndercooked
    ? "undercooked"
    : isOvercook
      ? "overcooked"
      : isReady
        ? "ready"
        : isFrying
          ? "cooking"
          : "idle";

  const rootClass = isUndercooked
    ? "fryer undercooked"
    : isOvercook
      ? "fryer overcooked"
      : "fryer";

  // Undercooked card — violation copy + REDROP
  if (isUndercooked) {
    const pulledAtLabel = basket.pulledAtMs
      ? new Date(basket.pulledAtMs).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";
    return (
      <div className={rootClass}>
        <div className="fryer-head">
          <span className="name">B{basket.index + 1}</span>
          <span className={`state ${stateClass}`}>{stateLabel}</span>
        </div>
        <div className="fryer-body">
          <div className="violation-msg">⚠ PULLED EARLY</div>
          <div className="violation-detail">
            at {pulledAtLabel} · {fmt(basket.shortfallSeconds)} short of 7:30
          </div>
          <div className="fryer-num">{wings}</div>
          <div className="fryer-lbl">wings · do not serve</div>
          <button className="redrop-btn" type="button" onClick={onRedrop}>
            ▶ REDROP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <div className="fryer-head">
        <span className="name">B{basket.index + 1}</span>
        <span className={`state ${stateClass}`}>{stateLabel}</span>
      </div>
      <div className="fryer-body">
        {isFrying ? (
          <>
            <div className="fryer-num">{wings}</div>
            <div className="fryer-lbl">wings cooking</div>
            <div className="fryer-timer">{timerStr}</div>
            <div className="fryer-cam">
              <span className="dot" />
              CAMERA · 7:30 TARGET
            </div>
            <button className="pull-btn" type="button" onClick={onPull}>
              PULL NOW<span className="mic">🎤 voice</span>
            </button>
          </>
        ) : isReady ? (
          <>
            <div className="fryer-num">{wings}</div>
            <div className="fryer-lbl">wings on rest</div>
            <div className="fryer-cam">
              <span className="dot" />
              SAUCE &amp; SERVE
            </div>
            <button className="pull-btn" type="button" onClick={onPull}>
              MOVE TO HOLD<span className="mic">🎤 voice</span>
            </button>
          </>
        ) : isOvercook ? (
          <>
            <div className="fryer-num">{wings}</div>
            <div className="fryer-lbl">wings in basket</div>
            <div className="fryer-timer overcooked">+{overcookStr}</div>
            <div className="fryer-cam overcooked-cam">
              <span className="dot" />
              PAST 7:30 · COUNTING UP
            </div>
            <button className="pull-btn" type="button" onClick={onPull}>
              PULL NOW<span className="mic">🎤 voice</span>
            </button>
          </>
        ) : recommendedWings && recommendedWings > 0 ? (
          <>
            <div className="fryer-num">{recommendedWings}</div>
            <div className="fryer-lbl">wings to drop</div>
            <button className="drop-btn" type="button" onClick={onDrop}>
              ▶ DROP NOW
            </button>
          </>
        ) : (
          <>
            <div className="fryer-num dim">—</div>
            <div className="fryer-lbl">no drop needed</div>
            <div className="hold-mark">· · ·</div>
          </>
        )}
      </div>
    </div>
  );
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}
