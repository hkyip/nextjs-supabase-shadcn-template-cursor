"use client";

import { basketRemainingSeconds } from "@/lib/wings/basket-state";
import type { FryerBasket, WingsPersistedStateV1 } from "@/lib/wings/types";

interface Props {
  state: WingsPersistedStateV1;
  nowMs: number;
}

export function ScreenCCameras({ state, nowMs }: Props) {
  const { config } = state;
  const baskets = state.baskets.slice(0, 4); // grid is 2×2

  const onlineCount = baskets.length;
  const accuracy = computeAccuracy(state);
  const lastFrameLabel = "0.4s ago";

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
        <span className="num">SCREEN C</span>
        <span className="name">CAMERA VIEW — WHAT THE AI SEES</span>
        <span className="when">trust + install + troubleshooting · GM/operator-facing</span>
      </div>

      <div className="tablet">
        <div className="header">
          <span>[ Forkcast ] &nbsp;&nbsp; St. Louis Wings — Brentwood</span>
          <span className="center">{nowLabel}</span>
          <span className="user">[ GM ▾ ]</span>
        </div>

        <div className="main">
          <div className="cam-health">
            <div className="cam-cell">
              <div className="lbl">CAMERAS ONLINE</div>
              <div className="val">
                {onlineCount} of {onlineCount}
              </div>
              <div className="sub">all fryers monitored</div>
            </div>
            <div className="cam-cell">
              <div className="lbl">BASKET DETECTION</div>
              <div className="val">{accuracy}%</div>
              <div className="sub">avg last 100 events</div>
            </div>
            <div className="cam-cell">
              <div className="lbl">LAST FRAME</div>
              <div className="val">{lastFrameLabel}</div>
              <div className="sub">refresh rate 2 Hz</div>
            </div>
            <div className="cam-cell online">
              <div className="lbl">
                <span className="pulse" />
                STATUS
              </div>
              <div className="val">LIVE</div>
              <div className="sub">all systems normal</div>
            </div>
          </div>

          <div className="cam-grid">
            {baskets.map((b) => (
              <CamCard
                key={b.id}
                basket={b}
                cookSeconds={config.cookSeconds}
                cookOvershootSeconds={config.cookOvershootSeconds}
                wingsPerLb={config.wingsPerLb}
                nowMs={nowMs}
              />
            ))}
          </div>

          <div className="footer-actions">
            <div className="footer-meta">
              Vision pipeline · YOLOv8 fine-tune · refresh 2 fps · drop-event
              latency &lt;1 s
            </div>
            <div>
              <button className="btn secondary" type="button">Recalibrate</button>
              <button className="btn" type="button">Camera log →</button>
            </div>
          </div>
        </div>
      </div>

      <p className="annotation">
        Screen C · the AI&apos;s view. Each camera shows the live frame, basket detection bounding box,
        and event log. Sidebar surfaces wings (via POS), cook elapsed vs. 7:30 target, drop/pull events,
        and basket-detection confidence — earning operator trust in what the agent claims to see.
      </p>
    </>
  );
}

interface CamProps {
  basket: FryerBasket;
  cookSeconds: number;
  cookOvershootSeconds: number;
  wingsPerLb: number;
  nowMs: number;
}

function CamCard({
  basket,
  cookSeconds,
  cookOvershootSeconds,
  wingsPerLb,
  nowMs,
}: CamProps) {
  const isFrying = basket.status === "frying";
  const isReady = basket.status === "ready";
  const isOvercook = basket.status === "overcook";
  const isEmpty = basket.status === "empty";
  const wings = Math.round(basket.weightLbs * wingsPerLb);
  const idx = basket.index + 1;

  const elapsed = basket.elapsedSeconds;
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const elapsedStr = `${mm}:${ss.toString().padStart(2, "0")}`;

  const targetStr = `${Math.floor(cookSeconds / 60)}:${(cookSeconds % 60).toString().padStart(2, "0")}`;

  const overSec = Math.max(0, elapsed - cookSeconds);
  const omm = Math.floor(overSec / 60);
  const oss = overSec % 60;
  const overStr = `${omm}:${oss.toString().padStart(2, "0")}`;

  const dropAtMs = basket.startedAtMs ?? nowMs;
  const dropTimeStr = new Date(dropAtMs).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const remainingSec = basketRemainingSeconds(basket, {
    cookSeconds,
    cookOvershootSeconds,
  } as Parameters<typeof basketRemainingSeconds>[1]);
  void remainingSec;

  const cardClass = isOvercook
    ? "cam-card violation-over"
    : "cam-card";

  return (
    <div className={cardClass}>
      <div className="cam-view">
        <div className="cam-view-inner" />
        <div className="cam-overlay-top">
          <span>
            <span className="rec-dot" />
            REC · FRYER {idx}
          </span>
          <span className="res">1280×960 · 2fps</span>
        </div>

        {isEmpty ? (
          <>
            <CamSvgEmpty />
            <div className="cam-empty-msg">NO BASKET DETECTED</div>
            <div className="cam-overlay-bottom">
              <span>AWAITING DROP</span>
              <span className="time-stamp">empty</span>
            </div>
          </>
        ) : isReady ? (
          <>
            <CamSvgReady wingCount={Math.max(6, Math.min(20, wings))} />
            <div
              className="cam-detect-label"
              style={{ top: 56, left: 76 }}
            >
              BASKET · ON REST
            </div>
            <div
              className="cam-detect-label"
              style={{ top: 56, right: 12, background: "rgb(107,114,128)", color: "#fff" }}
            >
              POS: {wings} wings
            </div>
            <div className="cam-overlay-bottom">
              <span>PULL DETECTED {dropTimeStr}</span>
              <span className="time-stamp">{elapsedStr} cook · on time</span>
            </div>
          </>
        ) : isOvercook ? (
          <>
            <CamSvgOver wingCount={Math.max(8, Math.min(28, wings))} />
            <div
              className="cam-detect-label amber"
              style={{ top: 86, left: 76 }}
            >
              ⚠ OVERCOOKED
            </div>
            <div
              className="cam-detect-label"
              style={{ top: 86, right: 12, background: "rgb(107,114,128)", color: "#fff" }}
            >
              POS: {wings} wings
            </div>
            <div className="cam-overlay-bottom">
              <span>DROP DETECTED {dropTimeStr}</span>
              <span className="time-stamp" style={{ color: "rgb(251, 191, 36)" }}>
                +{elapsedStr} elapsed · {overStr} OVER
              </span>
            </div>
          </>
        ) : (
          <>
            <CamSvgCooking wingCount={Math.max(8, Math.min(30, wings))} />
            <div
              className="cam-detect-label"
              style={{ top: 86, left: 76 }}
            >
              BASKET DETECTED
            </div>
            <div
              className="cam-detect-label"
              style={{ top: 86, right: 12, background: "rgb(107,114,128)", color: "#fff" }}
            >
              POS: {wings} wings
            </div>
            <div className="cam-overlay-bottom">
              <span>DROP DETECTED {dropTimeStr}</span>
              <span className="time-stamp">+{elapsedStr} elapsed</span>
            </div>
          </>
        )}
      </div>

      <div className="cam-sidebar">
        <div className="cam-sidebar-head">
          <span className="name">FRYER {idx}</span>
          <span
            className={`state-pill ${
              isOvercook ? "over" : isReady ? "ready" : isFrying ? "cooking" : "empty"
            }`}
          >
            {isOvercook ? "OVERCOOKED" : isReady ? "READY" : isFrying ? "COOKING" : "EMPTY"}
          </span>
        </div>

        {isEmpty ? (
          <>
            <Stat k="Basket detected" v="NO" />
            <Stat k="Empty for" v="—" mono />
            <Stat k="Last pull" v="—" />
            <Stat k="System rec" v="—" />
          </>
        ) : (
          <>
            <Stat k="Wings (via POS)" v={`${wings}`} big />
            <Stat
              k={isOvercook ? "Time in fryer" : isReady ? "Cooked for" : "Time in fryer"}
              v={elapsedStr}
              mono
              amber={isOvercook}
            />
            {isOvercook ? (
              <Stat k="Over target by" v={`+${overStr}`} mono amber />
            ) : isReady ? (
              <Stat k="Compliance" v="ON TIME ✓" />
            ) : (
              <Stat k="Target" v={targetStr} mono />
            )}
            <Stat k={isReady ? "Pull event" : "Drop event"} v={dropTimeStr} />
          </>
        )}

        <div className="cam-confidence">
          <span>BASKET DETECTION</span>
          <span className="conf">
            <span className="dot" />
            HIGH · {isEmpty ? 99 : isReady ? 97 : isOvercook ? 96 : 98}%
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  k,
  v,
  big,
  mono,
  amber,
}: {
  k: string;
  v: string;
  big?: boolean;
  mono?: boolean;
  amber?: boolean;
}) {
  return (
    <div className="cam-stat">
      <span className="k">{k}</span>
      <span
        className={`v${big ? " big" : ""}${mono ? " mono" : ""}${amber ? " amber" : ""}`}
      >
        {v}
      </span>
    </div>
  );
}

/* ============ Inline SVG mocks of the four camera scenes ============ */

const BASKET_PATH = (
  <g stroke="#9ca3af" strokeWidth="1" fill="none" opacity="0.6">
    <rect x="80" y="80" width="240" height="140" rx="4" />
    <line x1="80" y1="115" x2="320" y2="115" />
    <line x1="80" y1="150" x2="320" y2="150" />
    <line x1="80" y1="185" x2="320" y2="185" />
    <line x1="120" y1="80" x2="120" y2="220" />
    <line x1="160" y1="80" x2="160" y2="220" />
    <line x1="200" y1="80" x2="200" y2="220" />
    <line x1="240" y1="80" x2="240" y2="220" />
    <line x1="280" y1="80" x2="280" y2="220" />
  </g>
);

const FRYER_WELL = (
  <rect
    x="40"
    y="40"
    width="320"
    height="220"
    fill="none"
    stroke="#6b7280"
    strokeWidth="1"
    strokeDasharray="3,3"
    opacity="0.5"
  />
);

/** Deterministic wing positions from a seed integer. */
function wingPoints(seed: number, count: number) {
  const out: Array<{ cx: number; cy: number; rot: number }> = [];
  let s = seed;
  for (let i = 0; i < count; i += 1) {
    s = (s * 9301 + 49297) % 233280;
    const r1 = s / 233280;
    s = (s * 9301 + 49297) % 233280;
    const r2 = s / 233280;
    s = (s * 9301 + 49297) % 233280;
    const r3 = s / 233280;
    const cx = Math.round(95 + r1 * 220);
    const cy = Math.round(95 + r2 * 110);
    const rot = Math.round(-45 + r3 * 90);
    out.push({ cx, cy, rot });
  }
  return out;
}

function CamSvgCooking({ wingCount }: { wingCount: number }) {
  const pts = wingPoints(11, wingCount);
  return (
    <svg className="cam-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      {FRYER_WELL}
      {BASKET_PATH}
      <g fill="#d1d5db" stroke="#f3f4f6" strokeWidth="0.5">
        {pts.map((p, i) => (
          <ellipse
            key={i}
            cx={p.cx}
            cy={p.cy}
            rx="10"
            ry="6"
            transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}
          />
        ))}
      </g>
      <rect x="76" y="76" width="248" height="148" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function CamSvgReady({ wingCount }: { wingCount: number }) {
  const pts = wingPoints(23, wingCount);
  return (
    <svg className="cam-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="40"
        y="160"
        width="320"
        height="100"
        fill="none"
        stroke="#6b7280"
        strokeWidth="1"
        strokeDasharray="3,3"
        opacity="0.3"
      />
      <text
        x="200"
        y="225"
        textAnchor="middle"
        fill="#6b7280"
        fontSize="9"
        fontFamily="monospace"
        letterSpacing="2"
        opacity="0.5"
      >
        FRYER WELL (EMPTY)
      </text>
      <g stroke="#9ca3af" strokeWidth="1" fill="none" opacity="0.7">
        <rect x="80" y="50" width="240" height="100" rx="4" />
        <line x1="80" y1="75" x2="320" y2="75" />
        <line x1="80" y1="100" x2="320" y2="100" />
        <line x1="80" y1="125" x2="320" y2="125" />
      </g>
      <g fill="#9ca3af" stroke="#d1d5db" strokeWidth="0.5">
        {pts.map((p, i) => (
          <ellipse
            key={i}
            cx={p.cx}
            cy={Math.max(55, p.cy - 50)}
            rx="10"
            ry="6"
            transform={`rotate(${p.rot} ${p.cx} ${Math.max(55, p.cy - 50)})`}
          />
        ))}
      </g>
      <rect x="76" y="46" width="248" height="108" fill="none" stroke="#fff" strokeWidth="2" />
      <path
        d="M 200 200 Q 200 180 200 160"
        stroke="#fff"
        strokeWidth="1.5"
        strokeDasharray="4,3"
        fill="none"
        opacity="0.7"
      />
      <polygon points="200,155 196,162 204,162" fill="#fff" opacity="0.7" />
    </svg>
  );
}

function CamSvgOver({ wingCount }: { wingCount: number }) {
  const pts = wingPoints(43, wingCount);
  return (
    <svg className="cam-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      {FRYER_WELL}
      {BASKET_PATH}
      <g fill="#78350f" stroke="#92400e" strokeWidth="0.5" opacity="0.85">
        {pts.map((p, i) => (
          <ellipse
            key={i}
            cx={p.cx}
            cy={p.cy}
            rx="10"
            ry="6"
            transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}
          />
        ))}
      </g>
      <rect x="76" y="76" width="248" height="148" fill="none" stroke="#fbbf24" strokeWidth="3" />
    </svg>
  );
}

function CamSvgEmpty() {
  return (
    <svg className="cam-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      {FRYER_WELL}
      <line x1="80" y1="100" x2="160" y2="100" stroke="#9ca3af" strokeWidth="1" opacity="0.4" />
      <line x1="200" y1="130" x2="280" y2="130" stroke="#9ca3af" strokeWidth="1" opacity="0.4" />
      <line x1="100" y1="170" x2="200" y2="170" stroke="#9ca3af" strokeWidth="1" opacity="0.4" />
      <line x1="220" y1="200" x2="320" y2="200" stroke="#9ca3af" strokeWidth="1" opacity="0.4" />
      <line x1="60" y1="230" x2="180" y2="230" stroke="#9ca3af" strokeWidth="1" opacity="0.4" />
    </svg>
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
