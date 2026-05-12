"use client";

import "./wireframes.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Pause, Play, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfigCard } from "@/components/wings/config-card";
import { ScreenAOutlook } from "@/components/wings/screen-a-outlook";
import { ScreenBStation } from "@/components/wings/screen-b-station";
import { ScreenCCameras } from "@/components/wings/screen-c-cameras";
import { VisionToast } from "@/components/wings/vision-toast";
import { tickBasket } from "@/lib/wings/basket-state";
import { projectDemand } from "@/lib/wings/forecast";
import { createInitialWingsState } from "@/lib/wings/mock-seed";
import {
  arriveOrders,
  avgServiceTimeSeconds,
  fulfillFromReadyBaskets,
} from "@/lib/wings/orders";
import {
  createWingsInitialState,
  loadWingsPersisted,
  resetWingsPersistence,
  saveWingsPersisted,
} from "@/lib/wings/persistence";
import { analyzePredrop } from "@/lib/wings/predrop";
import type {
  CoachEvent,
  FryerBasket,
  ScenarioPreset,
  WingOrder,
  WingsConfigV1,
  WingsPersistedStateV1,
} from "@/lib/wings/types";

const TICK_MS = 1000;
type ScreenId = "a" | "b" | "c";

export function WingsView() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<WingsPersistedStateV1>(
    createWingsInitialState,
  );
  const [paused, setPaused] = useState(false);
  const [orderRemainder, setOrderRemainder] = useState(0);
  const [activeScreen, setActiveScreen] = useState<ScreenId>("b");
  const [visionToast, setVisionToast] = useState<{ key: number; msg: string }>({
    key: 0,
    msg: "",
  });

  useEffect(() => {
    const t = window.setTimeout(() => {
      const persisted = loadWingsPersisted();
      const fresh =
        persisted.lastTickMs == null || persisted.lastTickMs === 0
          ? createInitialWingsState(Date.now(), persisted.config)
          : persisted;
      setState(fresh);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const persist = useCallback((partial: Partial<WingsPersistedStateV1>) => {
    setState((prev) => {
      const merged: WingsPersistedStateV1 = {
        ...prev,
        ...partial,
        config: { ...prev.config, ...partial.config },
      };
      saveWingsPersisted(merged);
      return merged;
    });
  }, []);

  useEffect(() => {
    if (!hydrated || paused) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setState((prev) =>
        advanceWingsSimulation(prev, TICK_MS, now, orderRemainder, setOrderRemainder),
      );
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [hydrated, paused, orderRemainder]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      saveWingsPersisted(state);
    }, 250);
    return () => window.clearTimeout(id);
  }, [hydrated, state]);

  const forecast = useMemo(
    () => projectDemand(state, state.lastTickMs ?? 0),
    [state],
  );
  const predrop = useMemo(() => analyzePredrop(state, forecast), [state, forecast]);

  const onConfigChange = useCallback(
    (next: Partial<WingsConfigV1>) => {
      setState((prev) => {
        const config = { ...prev.config, ...next };
        let baskets = prev.baskets;
        if (next.basketCount && next.basketCount !== prev.config.basketCount) {
          if (next.basketCount > prev.config.basketCount) {
            const extra: FryerBasket[] = Array.from(
              { length: next.basketCount - prev.config.basketCount },
              (_, i) => ({
                id: `basket-${prev.config.basketCount + i + 1}`,
                index: prev.config.basketCount + i,
                status: "empty" as const,
                weightLbs: 0,
                startedAtMs: null,
                elapsedSeconds: 0,
                pulledAtMs: null,
                shortfallSeconds: 0,
              }),
            );
            baskets = [...prev.baskets, ...extra];
          } else {
            baskets = prev.baskets.slice(0, next.basketCount);
          }
        }
        const merged = { ...prev, config, baskets };
        saveWingsPersisted(merged);
        return merged;
      });
    },
    [],
  );

  const onApplyScenario = useCallback((scenario: ScenarioPreset) => {
    setState((prev) => {
      const fresh = createInitialWingsState(Date.now(), {
        ...prev.config,
        scenario,
      });
      saveWingsPersisted(fresh);
      return fresh;
    });
  }, []);

  const onTriggerGameEvent = useCallback((minutesFromNow: number) => {
    setState((prev) => ({
      ...prev,
      gameEndingAtMs: Date.now() + minutesFromNow * 60_000,
    }));
  }, []);

  const onClearGameEvent = useCallback(() => {
    setState((prev) => ({ ...prev, gameEndingAtMs: null }));
  }, []);

  const onDropBasket = useCallback((basketId: string, lbs: number) => {
    setState((prev) => {
      const basket = prev.baskets.find((b) => b.id === basketId);
      const baskets = prev.baskets.map<FryerBasket>((b) =>
        b.id === basketId
          ? {
              ...b,
              status: "frying",
              weightLbs: lbs,
              startedAtMs: Date.now(),
              elapsedSeconds: 0,
              pulledAtMs: null,
              shortfallSeconds: 0,
            }
          : b,
      );
      const adherence = {
        ...prev.adherence,
        timerPercent: Math.min(100, prev.adherence.timerPercent + 0.4),
        totalCookCycles: prev.adherence.totalCookCycles + 1,
      };
      const idx = (basket?.index ?? 0) + 1;
      setVisionToast((p) => ({
        key: p.key + 1,
        msg: `Vision AI confirmed B${idx} drop · 7:30 timer started`,
      }));
      return {
        ...prev,
        baskets,
        adherence,
        kpis: {
          ...prev.kpis,
          totalBasketCycles: prev.kpis.totalBasketCycles + 1,
        },
      };
    });
  }, []);

  /** Pull a basket. Branches:
   *   - pulled >30s short of 7:30 → undercooked violation, basket retains wings,
   *     status sticks until redrop or reset. Wings NOT moved to bin.
   *   - pulled >30s past 7:30 + overshoot → overcooked-pull violation logged,
   *     wings DO move to bin (still edible if barely past).
   *   - otherwise → normal pull, wings to bin, basket empties.
   */
  const onPullBasket = useCallback((basketId: string) => {
    setState((prev) => {
      const basket = prev.baskets.find((b) => b.id === basketId);
      if (!basket) return prev;
      const { cookSeconds, cookOvershootSeconds } = prev.config;
      const elapsed = basket.elapsedSeconds;
      const SHORT_GRACE = 30; // can pull up to 30s before 7:30 and still count as on-time

      const isUndercooked = elapsed < cookSeconds - SHORT_GRACE;
      const isOvercookedPull = elapsed > cookSeconds + cookOvershootSeconds;
      const cookOk = !isUndercooked && !isOvercookedPull;

      // Update cook adherence (rolling pct of pulls landing in the SOP window)
      const newCookPercent =
        prev.adherence.totalCookCycles === 0
          ? cookOk
            ? 100
            : 0
          : Math.round(
              (prev.adherence.cookPercent * prev.adherence.totalCookCycles +
                (cookOk ? 100 : 0)) /
                (prev.adherence.totalCookCycles + 1),
            );

      const idx = basket.index + 1;

      if (isUndercooked) {
        // Flip basket to undercooked state — wings stay put.
        const shortfall = Math.max(0, cookSeconds - elapsed);
        const baskets = prev.baskets.map<FryerBasket>((b) =>
          b.id === basketId
            ? {
                ...b,
                status: "undercooked",
                pulledAtMs: Date.now(),
                shortfallSeconds: shortfall,
              }
            : b,
        );
        setVisionToast((p) => ({
          key: p.key + 1,
          msg: `⚠ B${idx} pulled early · ${formatDuration(shortfall)} short of 7:30`,
        }));
        return {
          ...prev,
          baskets,
          adherence: { ...prev.adherence, cookPercent: newCookPercent },
          kpis: {
            ...prev.kpis,
            undercookedPulls: prev.kpis.undercookedPulls + 1,
          },
        };
      }

      // Pull from FRYING within the SOP window → basket transitions to READY
      // (wings stay in basket, KDS depletes them). Pull from OVERCOOK → wings
      // discarded, basket goes EMPTY (quality violation).
      if (isOvercookedPull) {
        const over = elapsed - cookSeconds;
        setVisionToast((p) => ({
          key: p.key + 1,
          msg: `⚠ B${idx} pulled overcooked · ${formatDuration(over)} past 7:30 · wings discarded`,
        }));
        const baskets = prev.baskets.map<FryerBasket>((b) =>
          b.id === basketId
            ? {
                ...b,
                status: "empty",
                weightLbs: 0,
                startedAtMs: null,
                elapsedSeconds: 0,
                pulledAtMs: null,
                shortfallSeconds: 0,
              }
            : b,
        );
        return {
          ...prev,
          baskets,
          adherence: { ...prev.adherence, cookPercent: newCookPercent },
          kpis: {
            ...prev.kpis,
            overcookedPulls: prev.kpis.overcookedPulls + 1,
          },
        };
      }

      // Normal pull from FRYING (within SOP window) → READY. Wings sit in
      // basket for KDS to deplete; basket stays visible with its count.
      const baskets = prev.baskets.map<FryerBasket>((b) =>
        b.id === basketId
          ? {
              ...b,
              status: "ready",
              // Mark the pull moment in startedAtMs so FIFO ordering for KDS
              // fulfillment is correct (oldest pulled basket served first).
              startedAtMs: Date.now(),
              elapsedSeconds: cookSeconds,
              pulledAtMs: null,
              shortfallSeconds: 0,
            }
          : b,
      );
      setVisionToast((p) => ({
        key: p.key + 1,
        msg: `Vision AI confirmed B${idx} pull · ${basket.weightLbs.toFixed(1)} lb on rest`,
      }));
      return {
        ...prev,
        baskets,
        adherence: { ...prev.adherence, cookPercent: newCookPercent },
      };
    });
  }, []);

  /** Restart cook from 0 after an undercooked pull. */
  const onRedropBasket = useCallback((basketId: string) => {
    setState((prev) => {
      const basket = prev.baskets.find((b) => b.id === basketId);
      if (!basket || basket.status !== "undercooked") return prev;
      const baskets = prev.baskets.map<FryerBasket>((b) =>
        b.id === basketId
          ? {
              ...b,
              status: "frying",
              startedAtMs: Date.now(),
              elapsedSeconds: 0,
              pulledAtMs: null,
              shortfallSeconds: 0,
              // weight stays the same — same wings going back in
            }
          : b,
      );
      const idx = basket.index + 1;
      setVisionToast((p) => ({
        key: p.key + 1,
        msg: `Vision AI confirmed B${idx} redrop · 7:30 timer restarted`,
      }));
      return {
        ...prev,
        baskets,
        kpis: {
          ...prev.kpis,
          totalBasketCycles: prev.kpis.totalBasketCycles + 1,
        },
      };
    });
  }, []);

  const resetAll = useCallback(() => {
    resetWingsPersistence();
    setState(createInitialWingsState(Date.now()));
  }, []);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 text-sm text-muted-foreground">
        Loading St. Louis Wings prototype…
      </div>
    );
  }

  const nowMs = state.lastTickMs ?? 0;
  const wingsOnHand =
    Math.round(state.holdingBin.weightLbs * state.config.wingsPerLb) +
    Math.round(
      state.baskets
        .filter((b) => b.status === "frying" || b.status === "ready")
        .reduce((s, b) => s + b.weightLbs, 0) * state.config.wingsPerLb,
    );

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 px-3 pb-2 pt-2 lg:px-4">
      {/* Compact operator bar — kept above the wireframe tablet for demo control */}
      <header className="sticky top-12 z-30 -mx-3 lg:-mx-4 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold tracking-tight">St. Louis Wings</h1>
            <Badge className="bg-orange-500 text-[10px] text-white hover:bg-orange-600">
              Fryer station
            </Badge>
            <Kpi
              icon={<Activity className="size-3" />}
              label={`${state.posVelocityPerMin} wings/min`}
            />
            <Kpi label={`${Math.floor(state.wingsSoldToday)} sold`} />
            <Kpi label={`${wingsOnHand} wings on hand`} />
          </div>

          <div className="flex items-center gap-1.5">
            <Clock />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">sim</span>
            {[1, 5, 60].map((speed) => (
              <Button
                key={speed}
                type="button"
                size="sm"
                variant={state.config.simulationSpeed === speed ? "default" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={() =>
                  persist({
                    config: { ...state.config, simulationSpeed: speed as 1 | 5 | 60 },
                  })
                }
              >
                {speed}×
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={resetAll}
              aria-label="Reset prototype"
            >
              <RotateCcw className="size-3" />
            </Button>
          </div>
        </div>
      </header>

      <ConfigCard
        config={state.config}
        gameEndingAtMs={state.gameEndingAtMs}
        nowMs={nowMs}
        onConfigChange={onConfigChange}
        onApplyScenario={onApplyScenario}
        onTriggerGameEvent={onTriggerGameEvent}
        onClearGameEvent={onClearGameEvent}
      />

      {/* Wireframe area — light gray canvas with the 1080px tablet */}
      <div className="stl-wires">
        <div className="header-block">
          <h1>St. Louis Wings — Forkcast Wireframes</h1>
          <p>
            Pre-service forecast (A) → live fryer station (B) → camera trust view (C) ·
            grayscale low-fi · simulation-driven
          </p>
        </div>

        <div
          className="stl-tabs"
          role="tablist"
          aria-label="St. Louis Wings screens"
        >
          <TabButton
            id="a"
            active={activeScreen}
            onSelect={setActiveScreen}
            num="SCREEN A"
            ttl="Today's Outlook"
          />
          <TabButton
            id="b"
            active={activeScreen}
            onSelect={setActiveScreen}
            num="SCREEN B"
            ttl="Live Fryer Station"
          />
          <TabButton
            id="c"
            active={activeScreen}
            onSelect={setActiveScreen}
            num="SCREEN C"
            ttl="Camera View"
          />
        </div>

        {activeScreen === "a" ? (
          <ScreenAOutlook
            state={state}
            forecast={forecast}
            nowMs={nowMs}
            onAdvanceToStation={() => setActiveScreen("b")}
          />
        ) : null}
        {activeScreen === "b" ? (
          <ScreenBStation
            state={state}
            predrop={predrop}
            nowMs={nowMs}
            onDrop={onDropBasket}
            onPull={onPullBasket}
            onRedrop={onRedropBasket}
          />
        ) : null}
        {activeScreen === "c" ? (
          <ScreenCCameras state={state} nowMs={nowMs} />
        ) : null}
      </div>

      <VisionToast triggerKey={visionToast.key} message={visionToast.msg} />
    </div>
  );
}

function TabButton({
  id,
  active,
  onSelect,
  num,
  ttl,
}: {
  id: ScreenId;
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
  num: string;
  ttl: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active === id}
      className="stl-tab"
      onClick={() => onSelect(id)}
    >
      <span className="num">{num}</span>
      <span className="ttl">{ttl}</span>
    </button>
  );
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function Kpi({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-foreground/80">
      {icon}
      {label}
    </span>
  );
}

function Clock() {
  const [label, setLabel] = useState<string>("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    const t0 = window.setTimeout(() => setLabel(fmt()), 0);
    const id = window.setInterval(() => setLabel(fmt()), 1000);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, []);
  return (
    <span
      className="font-mono text-sm font-semibold tabular-nums"
      suppressHydrationWarning
    >
      {label || "—"}
    </span>
  );
}

/** Pure simulation step. Tick baskets, generate orders, fulfill, recompute KPIs. */
function advanceWingsSimulation(
  prev: WingsPersistedStateV1,
  elapsedMs: number,
  nowMs: number,
  prevOrderRemainder: number,
  setOrderRemainder: (n: number) => void,
): WingsPersistedStateV1 {
  const { config } = prev;
  const simSeconds = Math.min(60, (elapsedMs / 1000) * config.simulationSpeed);

  const tickedBaskets = prev.baskets.map((b) =>
    tickBasket(b, config, simSeconds),
  );

  const { newOrders, remainderFraction } = arriveOrders(
    prev,
    simSeconds,
    prevOrderRemainder,
    nowMs,
  );
  setOrderRemainder(remainderFraction);

  const ordersOpenWithNew = [...prev.ordersOpen, ...newOrders];
  // Wings deplete directly from READY baskets (oldest first). When a basket
  // is drained below the empty threshold, it transitions to EMPTY.
  const { fulfilled, remainingOpen, nextBaskets: baskets } =
    fulfillFromReadyBaskets(ordersOpenWithNew, tickedBaskets, nowMs);

  // holdingBin retained in state for schema back-compat but no longer used
  // as a fulfillment buffer — wings hold in their basket instead.
  const newHoldingLbs = 0;
  const newOldest = null;

  const ordersOpen = remainingOpen.map<WingOrder>((o) => {
    const elapsedS = (nowMs - o.placedAtMs) / 1000;
    if (o.status === "queued" && elapsedS > o.slaSeconds) {
      return { ...o, status: "missed-sla" };
    }
    return o;
  });

  const ordersClosed = [...prev.ordersClosed, ...fulfilled].slice(-60);
  const serviceTimeAvgSeconds =
    ordersClosed.length > 0
      ? avgServiceTimeSeconds(ordersClosed)
      : prev.serviceTimeAvgSeconds;

  const wingsSoldDelta = fulfilled.reduce(
    (sum, o) => sum + o.weightLbs * config.wingsPerLb,
    0,
  );
  const lbsSoldDelta = fulfilled.reduce((sum, o) => sum + o.weightLbs, 0);
  const dineinFulfilled = fulfilled.filter((o) => o.channel === "dine-in").length;

  const FORECAST_BUCKET_MS = 5 * 60_000;
  let currentBucketActualLbs = prev.currentBucketActualLbs + lbsSoldDelta;
  let currentBucketStartMs = prev.currentBucketStartMs;
  let forecastVsActual = prev.kpis.forecastVsActual;
  if (nowMs - currentBucketStartMs >= FORECAST_BUCKET_MS) {
    const forecastLbs = (prev.posVelocityPerMin * 5) / config.wingsPerLb;
    forecastVsActual = [
      ...forecastVsActual,
      {
        tMs: currentBucketStartMs,
        forecastLbs: Math.round(forecastLbs * 10) / 10,
        actualLbs: Math.round(currentBucketActualLbs * 10) / 10,
      },
    ].slice(-12);
    currentBucketActualLbs = 0;
    currentBucketStartMs = nowMs;
  }

  const sessionMinutes =
    prev.lastTickMs != null ? (nowMs - prev.lastTickMs) / 60_000 : 0;
  const baselineLbsThisTick =
    (prev.kpis.baselineLbsPerHour / 60) * sessionMinutes;
  const liftLbsThisTick = Math.max(0, lbsSoldDelta - baselineLbsThisTick);
  const DOLLARS_PER_LB = 33.99 / 2;
  const revenueLiftDollars =
    prev.kpis.revenueLiftDollars + liftLbsThisTick * DOLLARS_PER_LB;

  const newCoach: CoachEvent[] = [...prev.coachEvents];
  const existing = new Set(
    prev.coachEvents
      .filter((e) => !prev.acknowledgedCoachIds.includes(e.id))
      .map((e) => e.kind),
  );
  if (
    prev.gameEndingAtMs != null &&
    !existing.has("game-ending") &&
    prev.gameEndingAtMs - nowMs <= 20 * 60_000 &&
    prev.gameEndingAtMs - nowMs > 0
  ) {
    const minutesAway = Math.round((prev.gameEndingAtMs - nowMs) / 60_000);
    newCoach.push({
      id: `coach-${nowMs}-game`,
      kind: "game-ending",
      severity: "warning",
      message: `Game ending in ${minutesAway} min — pre-drop now to land wings as orders arrive.`,
      createdAtMs: nowMs,
      dismissed: false,
    });
  }

  return {
    ...prev,
    baskets,
    holdingBin: {
      ...prev.holdingBin,
      weightLbs: newHoldingLbs,
      oldestBatchAtMs: newOldest,
    },
    ordersOpen,
    ordersClosed,
    serviceTimeAvgSeconds,
    wingsSoldToday: prev.wingsSoldToday + wingsSoldDelta,
    coachEvents: newCoach.slice(-30),
    lastTickMs: nowMs,
    kpis: {
      ...prev.kpis,
      dineinServed: prev.kpis.dineinServed + dineinFulfilled,
      forecastVsActual,
      revenueLiftDollars,
    },
    currentBucketActualLbs,
    currentBucketStartMs,
  };
}
