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
}

export function ScreenBStation({
  state,
  predrop,
  nowMs,
  onDrop,
  onPull,
}: Props) {
  const { config } = state;
  const waitingWings = Math.round(
    state.ordersOpen.reduce((s, o) => s + o.weightLbs, 0) * config.wingsPerLb,
  );
  const openTickets = state.ordersOpen.length;
  const next15LowerLbs = predrop.nextBucketLbs;
  const next15LowerWings = Math.round(next15LowerLbs * config.wingsPerLb);
  const next15UpperWings = Math.round(next15LowerWings * 1.2);

  const violationCount = state.kpis.forecastVsActual.length; // placeholder rolling count
  const totalBaskets = Math.max(
    state.adherence.totalCookCycles,
    state.baskets.filter((b) => b.status !== "empty").length,
  );
  const compliancePct =
    totalBaskets === 0
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(state.adherence.cookPercent),
          ),
        );

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
              />
            ))}
          </div>

          <div
            className="violations-line"
            style={{ maxWidth: 720, marginTop: 18 }}
          >
            <span>
              Today&apos;s compliance:{" "}
              <span className="vio-count">
                {violationCount} violation{violationCount === 1 ? "" : "s"}
              </span>{" "}
              · {compliancePct}% on-time
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
        Screen B · live. Demand strip locks the next 15&nbsp;min in view. Four fryer cards show the current
        state per basket: COOKING with countdown · READY for plate-up · IDLE with a drop recommendation
        · IDLE with no need. OVERCOOKED card flips amber and counts UP when the timer crosses 7:30.
      </p>
    </>
  );
}

interface CardProps {
  basket: FryerBasket;
  cookSeconds: number;
  cookOvershootSeconds: number;
  wingsPerLb: number;
  recommendedWings?: number;
  onDrop: () => void;
  onPull: () => void;
}

function FryerCard({
  basket,
  cookSeconds,
  cookOvershootSeconds,
  wingsPerLb,
  recommendedWings,
  onDrop,
  onPull,
}: CardProps) {
  const isFrying = basket.status === "frying";
  const isReady = basket.status === "ready";
  const isOvercook = basket.status === "overcook";
  const isEmpty = basket.status === "empty";

  const remaining = basketRemainingSeconds(basket, {
    cookSeconds,
    cookOvershootSeconds,
  } as Parameters<typeof basketRemainingSeconds>[1]);
  const wings = Math.round(basket.weightLbs * wingsPerLb);

  const mm = Math.floor(Math.abs(remaining) / 60);
  const ss = Math.abs(remaining) % 60;
  const timerStr = `${mm}:${ss.toString().padStart(2, "0")}`;

  const overcookSeconds = Math.max(0, basket.elapsedSeconds - cookSeconds);
  const omm = Math.floor(overcookSeconds / 60);
  const oss = overcookSeconds % 60;
  const overcookStr = `${omm}:${oss.toString().padStart(2, "0")}`;

  const stateLabel = isOvercook
    ? "OVERCOOKED"
    : isReady
      ? "READY"
      : isFrying
        ? "COOKING"
        : "IDLE";
  const stateClass = isOvercook
    ? "overcooked"
    : isReady
      ? "ready"
      : isFrying
        ? "cooking"
        : "idle";

  const rootClass = isOvercook
    ? "fryer overcooked"
    : "fryer";

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

  // satisfy linter for `isEmpty`
  void isEmpty;
}
