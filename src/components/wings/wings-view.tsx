"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Award, Pause, Play, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdherenceMeter } from "@/components/wings/adherence-meter";
import { CoachFeedCard } from "@/components/wings/coach-feed-card";
import { ConfigCard } from "@/components/wings/config-card";
import { DemandPulseCard } from "@/components/wings/demand-pulse-card";
import { FryerBayGrid } from "@/components/wings/fryer-bay-grid";
import { HoldingBinCard } from "@/components/wings/holding-bin-card";
import { OrderQueueCard } from "@/components/wings/order-queue-card";
import { PredropCard } from "@/components/wings/predrop-card";
import { RevenueCard } from "@/components/wings/revenue-card";
import { ServiceTimeKpi } from "@/components/wings/service-time-kpi";
import { VisionToast } from "@/components/wings/vision-toast";
import { WingsKpiStrip } from "@/components/wings/wings-kpi-strip";
import { tickBasket } from "@/lib/wings/basket-state";
import { projectDemand } from "@/lib/wings/forecast";
import { createInitialWingsState } from "@/lib/wings/mock-seed";
import {
  arriveOrders,
  avgServiceTimeSeconds,
  fulfillFromHolding,
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

export function WingsView() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<WingsPersistedStateV1>(
    createWingsInitialState,
  );
  const [paused, setPaused] = useState(false);
  // continuous order-arrival accumulator across ticks
  const [orderRemainder, setOrderRemainder] = useState(0);
  // Vision-AI toast trigger — bump key whenever a basket flips empty→frying
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

  // 1Hz simulation tick
  useEffect(() => {
    if (!hydrated || paused) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setState((prev) => advanceWingsSimulation(prev, TICK_MS, now, orderRemainder, setOrderRemainder));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [hydrated, paused, orderRemainder]);

  // Debounced persistence
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
        // If basketCount changed, resize baskets array
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

  const onApplyScenario = useCallback(
    (scenario: ScenarioPreset) => {
      setState((prev) => {
        const fresh = createInitialWingsState(Date.now(), {
          ...prev.config,
          scenario,
        });
        saveWingsPersisted(fresh);
        return fresh;
      });
    },
    [],
  );

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
            }
          : b,
      );
      const adherence = {
        ...prev.adherence,
        timerPercent: Math.min(100, prev.adherence.timerPercent + 0.4),
        totalCookCycles: prev.adherence.totalCookCycles + 1,
      };
      // Fire vision-AI confirmation toast
      const idx = (basket?.index ?? 0) + 1;
      setVisionToast((p) => ({
        key: p.key + 1,
        msg: `Vision AI confirmed B${idx} drop · 7:30 timer started`,
      }));
      return { ...prev, baskets, adherence };
    });
  }, []);

  const onPullBasket = useCallback((basketId: string) => {
    setState((prev) => {
      const basket = prev.baskets.find((b) => b.id === basketId);
      if (!basket) return prev;
      const cookOk =
        basket.elapsedSeconds >= prev.config.cookSeconds - 5 &&
        basket.elapsedSeconds <=
          prev.config.cookSeconds + prev.config.cookOvershootSeconds;
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
      const baskets = prev.baskets.map<FryerBasket>((b) =>
        b.id === basketId
          ? {
              ...b,
              status: "empty",
              weightLbs: 0,
              startedAtMs: null,
              elapsedSeconds: 0,
            }
          : b,
      );
      const newOldest =
        prev.holdingBin.weightLbs > 0
          ? prev.holdingBin.oldestBatchAtMs
          : Date.now();
      return {
        ...prev,
        baskets,
        holdingBin: {
          ...prev.holdingBin,
          weightLbs: Math.min(
            prev.holdingBin.capacityLbs,
            prev.holdingBin.weightLbs + basket.weightLbs,
          ),
          oldestBatchAtMs: newOldest,
        },
        adherence: { ...prev.adherence, cookPercent: newCookPercent },
      };
    });
  }, []);

  const onPredrop = useCallback(
    (lbs: number) => {
      // Find first empty basket and drop
      setState((prev) => {
        const empty = prev.baskets.find((b) => b.status === "empty");
        if (!empty || lbs <= 0) return prev;
        const basketLbs = Math.min(prev.config.basketCapacityLbs, lbs);
        // Vision AI toast for predrop
        setVisionToast((p) => ({
          key: p.key + 1,
          msg: `Vision AI confirmed B${empty.index + 1} pre-drop · ${basketLbs} lb`,
        }));
        const baskets = prev.baskets.map<FryerBasket>((b) =>
          b.id === empty.id
            ? {
                ...b,
                status: "frying",
                weightLbs: basketLbs,
                startedAtMs: Date.now(),
                elapsedSeconds: 0,
              }
            : b,
        );
        const coachEvents = [
          ...prev.coachEvents,
          {
            id: `coach-${Date.now()}-predrop`,
            kind: "predrop-needed" as const,
            severity: "info" as const,
            message: `Pre-dropped ${basketLbs} lb in B${empty.index + 1}.`,
            createdAtMs: Date.now(),
            dismissed: false,
          },
        ];
        return { ...prev, baskets, coachEvents };
      });
    },
    [],
  );

  const onAcknowledgeCoach = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      acknowledgedCoachIds: [...prev.acknowledgedCoachIds, id],
    }));
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

  const canDropPredrop = state.baskets.some((b) => b.status === "empty");
  const nowMs = state.lastTickMs ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 px-3 pb-6 pt-2 lg:px-4">
      {/* Operator bar */}
      <header className="sticky top-12 z-30 -mx-3 lg:-mx-4 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold tracking-tight">St. Louis Wings</h1>
            <Badge className="bg-orange-500 text-[10px] text-white hover:bg-orange-600">
              Wing kitchen
            </Badge>
            <Kpi icon={<Activity className="size-3" />} label={`${state.posVelocityPerMin}/min`} />
            <Kpi label={`${Math.floor(state.wingsSoldToday)} wings sold`} />
            <Kpi label={`${(predrop.readyLbs + predrop.cookingLbs).toFixed(1)} lb in flight`} />
            <span className="hidden items-center gap-1 rounded border border-violet-300/60 bg-violet-50/60 px-1.5 py-0.5 font-mono text-[10px] text-violet-800 dark:bg-violet-950/40 dark:text-violet-200 sm:inline-flex">
              <Award className="size-3" /> Wingstop benchmark · 20+m → &lt;12m
            </span>
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

      <DemandPulseCard
        forecast={forecast}
        gameEndingAtMs={state.gameEndingAtMs}
        nowMs={nowMs}
      />

      <WingsKpiStrip
        kpis={state.kpis}
        wingsSoldToday={Math.floor(state.wingsSoldToday)}
        baselineWingsPerDay={Math.round(
          state.kpis.baselineLbsPerHour * 12 * state.config.wingsPerLb,
        )}
      />

      <RevenueCard
        wingsSoldLbsToday={state.wingsSoldToday / state.config.wingsPerLb}
        baselineLbsPerDay={state.kpis.baselineLbsPerHour * 12}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <FryerBayGrid
            baskets={state.baskets}
            config={state.config}
            onDrop={onDropBasket}
            onPull={onPullBasket}
          />
          <PredropCard
            analysis={predrop}
            onDrop={onPredrop}
            canDrop={canDropPredrop}
          />
          <ServiceTimeKpi avgSeconds={state.serviceTimeAvgSeconds} />
        </div>

        <aside className="space-y-3">
          <HoldingBinCard bin={state.holdingBin} config={state.config} nowMs={nowMs} />
          <OrderQueueCard ordersOpen={state.ordersOpen} nowMs={nowMs} />
          <AdherenceMeter adherence={state.adherence} />
          <CoachFeedCard
            events={state.coachEvents}
            acknowledgedIds={state.acknowledgedCoachIds}
            onAcknowledge={onAcknowledgeCoach}
          />
        </aside>
      </div>

      <VisionToast triggerKey={visionToast.key} message={visionToast.msg} />
    </div>
  );
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

  // 1. Tick baskets
  const baskets = prev.baskets.map((b) => tickBasket(b, config, simSeconds));

  // 2. Generate new orders
  const { newOrders, remainderFraction } = arriveOrders(
    prev,
    simSeconds,
    prevOrderRemainder,
    nowMs,
  );
  setOrderRemainder(remainderFraction);

  // 3. Fulfill from holding bin
  const ordersOpenWithNew = [...prev.ordersOpen, ...newOrders];
  const { fulfilled, remainingHoldingLbs, remainingOpen } = fulfillFromHolding(
    ordersOpenWithNew,
    prev.holdingBin.weightLbs,
    nowMs,
  );

  // 4. Update holding bin — weight reduces, oldest batch unchanged unless empty now
  const newHoldingLbs = remainingHoldingLbs;
  const newOldest =
    newHoldingLbs <= 0 ? null : prev.holdingBin.oldestBatchAtMs ?? nowMs;

  // 5. Mark SLA-breached open orders
  const ordersOpen = remainingOpen.map<WingOrder>((o) => {
    const elapsedS = (nowMs - o.placedAtMs) / 1000;
    if (o.status === "queued" && elapsedS > o.slaSeconds) {
      return { ...o, status: "missed-sla" };
    }
    return o;
  });

  // 6. Update closed orders (cap at 60 most recent for memory)
  const ordersClosed = [...prev.ordersClosed, ...fulfilled].slice(-60);
  const serviceTimeAvgSeconds =
    ordersClosed.length > 0
      ? avgServiceTimeSeconds(ordersClosed)
      : prev.serviceTimeAvgSeconds;

  // 7. Wings sold today
  const wingsSoldDelta = fulfilled.reduce(
    (sum, o) => sum + o.weightLbs * config.wingsPerLb,
    0,
  );
  const lbsSoldDelta = fulfilled.reduce((sum, o) => sum + o.weightLbs, 0);
  const dineinFulfilled = fulfilled.filter((o) => o.channel === "dine-in").length;

  // 7b. Forecast bucketing (5-min)
  const FORECAST_BUCKET_MS = 5 * 60_000;
  let currentBucketActualLbs = prev.currentBucketActualLbs + lbsSoldDelta;
  let currentBucketStartMs = prev.currentBucketStartMs;
  let forecastVsActual = prev.kpis.forecastVsActual;
  if (nowMs - currentBucketStartMs >= FORECAST_BUCKET_MS) {
    // Forecast for the closing bucket = posVelocity wings/min × 5 min ÷ wingsPerLb
    const forecastLbs =
      (prev.posVelocityPerMin * 5) / config.wingsPerLb;
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

  // 7c. Revenue lift (live computation vs hardcoded baseline lb/hr)
  // We accumulate $ for each lb sold above the baseline pace.
  const sessionMinutes =
    prev.lastTickMs != null ? (nowMs - prev.lastTickMs) / 60_000 : 0;
  const baselineLbsThisTick =
    (prev.kpis.baselineLbsPerHour / 60) * sessionMinutes;
  const liftLbsThisTick = Math.max(0, lbsSoldDelta - baselineLbsThisTick);
  const DOLLARS_PER_LB = 33.99 / 2;
  const revenueLiftDollars =
    prev.kpis.revenueLiftDollars + liftLbsThisTick * DOLLARS_PER_LB;

  // 8. Coach events: predrop, game-ending, basket-overshoot, holding-decay, sla-tight
  const newCoach: CoachEvent[] = [...prev.coachEvents];
  const existing = new Set(
    prev.coachEvents
      .filter((e) => !prev.acknowledgedCoachIds.includes(e.id))
      .map((e) => e.kind),
  );

  // Game-ending coach
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

  // Basket overshoot coach
  for (const b of baskets) {
    if (b.status === "overcook") {
      const kind = "basket-overshoot";
      const already = prev.coachEvents.some(
        (e) =>
          !prev.acknowledgedCoachIds.includes(e.id) &&
          e.kind === kind &&
          e.message.includes(`B${b.index + 1}`),
      );
      if (!already) {
        newCoach.push({
          id: `coach-${nowMs}-overshoot-${b.id}`,
          kind: "basket-overshoot",
          severity: "critical",
          message: `B${b.index + 1} past 7:30 — pull immediately.`,
          createdAtMs: nowMs,
          dismissed: false,
        });
      }
    }
  }

  // Holding decay coach
  if (
    newHoldingLbs > 0 &&
    newOldest != null &&
    !existing.has("holding-decay") &&
    (nowMs - newOldest) / 60_000 >= config.holdDecayMinutes
  ) {
    newCoach.push({
      id: `coach-${nowMs}-decay`,
      kind: "holding-decay",
      severity: "warning",
      message: `Holding bin past ${config.holdDecayMinutes}m — remake oldest batch.`,
      createdAtMs: nowMs,
      dismissed: false,
    });
  }

  // SLA tight coach
  const tightCount = ordersOpen.filter(
    (o) => o.status === "queued" && nowMs - o.placedAtMs > o.slaSeconds * 1000 - 60_000,
  ).length;
  if (tightCount >= 2 && !existing.has("sla-tight")) {
    newCoach.push({
      id: `coach-${nowMs}-sla`,
      kind: "sla-tight",
      severity: "warning",
      message: `${tightCount} orders within 1 min of SLA — prioritize plate-up.`,
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
