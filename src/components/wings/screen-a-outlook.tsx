"use client";

import type { ForecastResult } from "@/lib/wings/forecast";
import type { WingsPersistedStateV1 } from "@/lib/wings/types";

interface Props {
  state: WingsPersistedStateV1;
  forecast: ForecastResult;
  nowMs: number;
  onAdvanceToStation: () => void;
}

interface HourPoint {
  label: string;
  wings: number;
  tier: "low" | "med" | "peak";
}

/** 12-hour wing forecast curve, shaped by base demand × hour multiplier × game lift. */
function buildHourlyForecast(
  state: WingsPersistedStateV1,
  nowMs: number,
): HourPoint[] {
  const { posVelocityPerMin, gameEndingAtMs } = state;
  const baseWingsPerMin = posVelocityPerMin;
  // 11a → 10p
  const hours = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  const curve: Record<number, number> = {
    11: 0.55, 12: 1.05, 13: 0.95, 14: 0.45, 15: 0.35, 16: 0.5,
    17: 0.95, 18: 1.6, 19: 1.85, 20: 1.7, 21: 1.1, 22: 0.55,
  };
  return hours.map((h) => {
    let mult = curve[h] ?? 0.5;
    if (gameEndingAtMs != null) {
      const endHr = new Date(gameEndingAtMs).getHours();
      const dist = Math.abs(h - endHr);
      if (dist <= 2) mult *= 1 + Math.max(0, (2 - dist) / 2) * 0.7;
    }
    const wings = Math.round(baseWingsPerMin * 60 * mult);
    const tier: HourPoint["tier"] =
      mult >= 1.6 ? "peak" : mult >= 0.95 ? "med" : "low";
    const label =
      h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`;
    return { label, wings, tier };
    void nowMs;
  });
}

export function ScreenAOutlook({
  state,
  nowMs,
  onAdvanceToStation,
}: Props) {
  const hours = buildHourlyForecast(state, nowMs);
  const maxWings = Math.max(...hours.map((h) => h.wings), 1);
  const predictedToday = hours.reduce((s, h) => s + h.wings, 0);
  const peakIdx = hours.reduce(
    (best, h, i, arr) => (h.wings > arr[best].wings ? i : best),
    0,
  );
  const peak = hours[peakIdx];
  // group dayparts
  const lunch = hours.slice(0, 3).reduce((s, h) => s + h.wings, 0);
  const afternoon = hours.slice(3, 6).reduce((s, h) => s + h.wings, 0);
  const dinner = hours.slice(6, 10).reduce((s, h) => s + h.wings, 0);
  const late = hours.slice(10).reduce((s, h) => s + h.wings, 0);

  const gameEnds =
    state.gameEndingAtMs != null
      ? new Date(state.gameEndingAtMs).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  const nowLabel = new Date(nowMs).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const accuracy = computeAccuracy(state);

  return (
    <>
      <div className="screen-meta">
        <span className="num">SCREEN A</span>
        <span className="name">TODAY&apos;S OUTLOOK — PRE-SERVICE FORECAST</span>
        <span className="when">opened by GM/KM at start of shift</span>
      </div>

      <div className="tablet">
        <div className="header">
          <span>[ Forkcast ] &nbsp;&nbsp; St. Louis Wings — Brentwood</span>
          <span className="center">{nowLabel}</span>
          <span className="user">[ GM ▾ ]</span>
        </div>

        <div className="main">
          <div className="outlook-banner">
            <div>
              <div className="ttl">TODAY&apos;S OUTLOOK</div>
              <div className="msg">
                {gameEnds
                  ? `Heavy night expected — game wraps ~${gameEnds}, surge to follow`
                  : `Standard day — no event surge on the books`}
              </div>
            </div>
            <div className="badge">PROACTIVE MODE</div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="h">FORECAST · WINGS BY HOUR</span>
              <span className="sub">continuously updated · all stations · open → close</span>
            </div>
            <div className="panel-body">
              <div className="chart-summary">
                <div className="summary-stat">
                  <div className="lbl">PREDICTED TODAY</div>
                  <div className="val">{predictedToday.toLocaleString()}</div>
                  <div className="delta">wings · projected from POS pace</div>
                </div>
                <div className="summary-stat">
                  <div className="lbl">PREDICTED PEAK HR</div>
                  <div className="val">{peak.label}</div>
                  <div className="delta">
                    ~ {peak.wings} wings · {Math.round(peak.wings / state.config.wingsPerLb)} lbs
                  </div>
                </div>
                <div className="summary-stat">
                  <div className="lbl">FORECAST ACCURACY</div>
                  <div className="val">{accuracy}%</div>
                  <div className="delta">last 6 windows · within target band</div>
                </div>
              </div>

              <div className="chart">
                <div className="grid-line" style={{ bottom: "25%" }} />
                <div className="grid-line" style={{ bottom: "50%" }} />
                <div className="grid-line" style={{ bottom: "75%" }} />
                <div className="grid-line" style={{ bottom: "100%" }} />

                <div className="y-axis">
                  <span className="y-tick" style={{ top: "-4px" }}>
                    {Math.round(maxWings * 1.05)}
                  </span>
                  <span className="y-tick" style={{ top: "25%" }}>
                    {Math.round(maxWings * 0.75)}
                  </span>
                  <span className="y-tick" style={{ top: "50%" }}>
                    {Math.round(maxWings * 0.5)}
                  </span>
                  <span className="y-tick" style={{ top: "75%" }}>
                    {Math.round(maxWings * 0.25)}
                  </span>
                  <span className="y-tick" style={{ bottom: "-4px" }}>0</span>
                </div>

                {hours.map((h, i) => (
                  <div key={h.label + i} className="bar-group">
                    <div
                      className={`bar${h.tier === "peak" ? " peak" : h.tier === "med" ? " med" : ""}`}
                      style={{
                        height: `${Math.max(2, (h.wings / maxWings) * 95)}%`,
                      }}
                    >
                      {i === peakIdx ? (
                        <span className="bar-label">{h.wings}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="x-axis">
                {hours.map((h, i) => (
                  <div key={h.label + i} className="x-tick">{h.label}</div>
                ))}
              </div>

              <div className="daypart-strip">
                <div className="daypart">
                  <div className="name">LUNCH</div>
                  <div className="qty">{lunch.toLocaleString()}</div>
                </div>
                <div className="daypart">
                  <div className="name">AFTERNOON</div>
                  <div className="qty">{afternoon.toLocaleString()}</div>
                </div>
                <div className="daypart peak">
                  <div className="name">{gameEnds ? "DINNER + GAME" : "DINNER"}</div>
                  <div className="qty">{dinner.toLocaleString()}</div>
                </div>
                <div className="daypart">
                  <div className="name">LATE</div>
                  <div className="qty">{late.toLocaleString()}</div>
                </div>
              </div>

              <div className="triggers">
                <div className="h">SIGNALS DRIVING TODAY&apos;S FORECAST</div>
                <Trigger icon="F" text="Friday baseline — 22% higher than mid-week avg" when="all day" />
                {gameEnds ? (
                  <Trigger
                    icon="★"
                    text="NHL Playoffs Game 5 — historical surge +180 wings vs no-game Friday"
                    when={`${gameEnds} puck drop`}
                  />
                ) : null}
                <Trigger
                  icon="☀"
                  text="Weather: 22°C / clear — patio + walk-in lift expected"
                  when="5:00 PM onward"
                />
                <Trigger
                  icon="○"
                  text={`Online order pace this morning: tracking +${Math.round(
                    state.posVelocityPerMin * 1.5,
                  )} wings vs forecast`}
                  when="live"
                />
              </div>
            </div>
          </div>

          <YesterdayRecap state={state} accuracy={accuracy} nowMs={nowMs} />


          <div className="footer-actions">
            <div className="footer-meta">
              Forecast refreshed{" "}
              {new Date(nowMs).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              · auto-refresh every 15 min
            </div>
            <div>
              <button className="btn secondary" type="button">View week ahead</button>
              <button className="btn" type="button" onClick={onAdvanceToStation}>
                Open station view →
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="annotation">
        Screen A · pre-service briefing. Outlook banner sets the day; hourly chart shows the shape;
        signals show why; yesterday recap establishes trust. &ldquo;Open station view&rdquo; advances to Screen B.
      </p>
    </>
  );
}

function Trigger({ icon, text, when }: { icon: string; text: string; when: string }) {
  return (
    <div className="trigger-row">
      <span className="icon">{icon}</span>
      <span>{text}</span>
      <span className="when">{when}</span>
    </div>
  );
}

function Recap({ lbl, val, sub }: { lbl: string; val: string; sub: string }) {
  return (
    <div className="recap-stat">
      <div className="lbl">{lbl}</div>
      <div className="val">{val}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

/** Yesterday recap — uses live session data once the demo has run long enough,
 * otherwise falls back to a hardcoded baseline so the screen still feels real. */
function YesterdayRecap({
  state,
  accuracy,
  nowMs,
}: {
  state: WingsPersistedStateV1;
  accuracy: number;
  nowMs: number;
}) {
  const soldToday = Math.floor(state.wingsSoldToday);
  const useLive = soldToday >= 500; // ~enough samples to feel meaningful

  let forecasted: number;
  let dropped: number;
  let sold: number;
  let accuracyPct: number;
  let soldDeltaPct: number;
  let dayLabel: string;

  if (useLive) {
    sold = soldToday;
    // Drops = sold + leftover in baskets/holding (waste signal), but cap to a sane multiple.
    const inFlight =
      Math.round(state.holdingBin.weightLbs * state.config.wingsPerLb) +
      Math.round(
        state.baskets.reduce((s, b) => s + b.weightLbs, 0) *
          state.config.wingsPerLb,
      );
    dropped = sold + inFlight;
    accuracyPct = accuracy;
    // Forecasted = sold × (1 / (1 + delta))  — derive so the math is internally consistent.
    const deltaPct = 100 - accuracyPct;
    forecasted = Math.round(sold * (1 - deltaPct / 200));
    soldDeltaPct =
      forecasted === 0
        ? 0
        : Math.round(((sold - forecasted) / forecasted) * 1000) / 10;
    dayLabel = "TODAY · LIVE";
  } else {
    forecasted = 1420;
    dropped = 1510;
    sold = 1468;
    accuracyPct = 96.7 as unknown as number; // keep one-decimal display via formatting
    soldDeltaPct = 3.4;
    dayLabel = "YESTERDAY";
  }

  // Day name from "yesterday" relative to nowMs
  if (!useLive) {
    const yesterday = new Date(nowMs - 24 * 60 * 60 * 1000);
    const weekday = yesterday.toLocaleDateString("en-US", { weekday: "long" });
    dayLabel = `YESTERDAY · ${weekday.toUpperCase()}`;
  }

  const fmtAcc = (n: number) =>
    n === Math.floor(n) ? `${n}%` : `${n.toFixed(1)}%`;

  return (
    <div className="yesterday-strip">
      <div className="panel-header">
        <span className="h">{dayLabel}</span>
        <span className="sub">[ See full recap → ]</span>
      </div>
      <div className="recap-grid">
        <Recap lbl="FORECASTED" val={forecasted.toLocaleString()} sub="wings" />
        <Recap lbl="DROPPED" val={dropped.toLocaleString()} sub="wings into fryer" />
        <Recap
          lbl="SOLD"
          val={sold.toLocaleString()}
          sub={`wings · ${soldDeltaPct >= 0 ? "↑" : "↓"} ${Math.abs(soldDeltaPct).toFixed(1)}% vs forecast`}
        />
        <Recap
          lbl="FORECAST ACCURACY"
          val={fmtAcc(accuracyPct)}
          sub="within target band"
        />
      </div>
    </div>
  );
}

function computeAccuracy(state: WingsPersistedStateV1): number {
  const samples = state.kpis.forecastVsActual.slice(-6);
  if (samples.length === 0) return 96;
  let totalForecast = 0;
  let totalAbsErr = 0;
  for (const s of samples) {
    totalForecast += s.forecastLbs;
    totalAbsErr += Math.abs(s.forecastLbs - s.actualLbs);
  }
  if (totalForecast === 0) return 96;
  const errPct = (totalAbsErr / totalForecast) * 100;
  return Math.max(0, Math.min(100, Math.round(100 - errPct)));
}
