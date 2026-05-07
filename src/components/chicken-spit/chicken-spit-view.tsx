"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Pause, Play, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertStack } from "@/components/chicken-spit/alert-stack";
import { GrillTimerCard } from "@/components/chicken-spit/grill-timer-card";
import { ReprepTriggerCard } from "@/components/chicken-spit/reprep-trigger-card";
import { SpitCameraCard } from "@/components/chicken-spit/spit-camera-card";
import { SpitConfigCard } from "@/components/chicken-spit/spit-config-card";
import { SpitKpiStrip } from "@/components/chicken-spit/spit-kpi-strip";
import { SpitPlanCard } from "@/components/chicken-spit/spit-plan-card";
import { SteamTableCard } from "@/components/chicken-spit/steam-table-card";
import { analyzeDepletion } from "@/lib/chicken-spit/depletion";
import { createInitialChickenSpitState } from "@/lib/chicken-spit/mock-seed";
import {
  createChickenSpitInitialState,
  loadChickenSpitPersisted,
  resetChickenSpitPersistence,
  saveChickenSpitPersisted,
} from "@/lib/chicken-spit/persistence";
import { deriveSpitState, tickSpit } from "@/lib/chicken-spit/readiness";
import { cn } from "@/lib/utils";
import type {
  ChickenSpitConfigV1,
  ChickenSpitPersistedStateV1,
  Spit,
  SpitAlert,
  SpitScenario,
} from "@/lib/chicken-spit/types";

const TICK_MS = 1000;
const FORECAST_BUCKET_MS = 15 * 60_000;

export function ChickenSpitView() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<ChickenSpitPersistedStateV1>(
    createChickenSpitInitialState,
  );
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const persisted = loadChickenSpitPersisted();
      const fresh =
        persisted.spits.every((s) => s.loadedAtMs === 0) ||
        persisted.lastTickMs == null
          ? createInitialChickenSpitState(Date.now())
          : persisted;
      setState(fresh);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const persist = useCallback(
    (partial: Partial<ChickenSpitPersistedStateV1>) => {
      setState((prev) => {
        const merged: ChickenSpitPersistedStateV1 = {
          ...prev,
          ...partial,
          config: { ...prev.config, ...partial.config },
        };
        saveChickenSpitPersisted(merged);
        return merged;
      });
    },
    [],
  );

  useEffect(() => {
    if (!hydrated || paused) return;
    const id = window.setInterval(() => {
      setState((prev) => advanceSimulation(prev, TICK_MS));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [hydrated, paused]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      saveChickenSpitPersisted(state);
    }, 250);
    return () => window.clearTimeout(id);
  }, [hydrated, state]);

  const activeSpit = useMemo<Spit>(
    () => state.spits.find((s) => s.active) ?? state.spits[0],
    [state.spits],
  );
  const loadingSpit = useMemo<Spit | undefined>(
    () =>
      state.spits.find(
        (s) =>
          !s.active &&
          s.id !== activeSpit?.id &&
          s.cookProgress > 0 &&
          s.remainingLbs > 0,
      ),
    [state.spits, activeSpit?.id],
  );

  const analysis = useMemo(
    () => analyzeDepletion(state, state.lastTickMs ?? 0),
    [state],
  );

  const advanceCook = useCallback((seconds: number) => {
    setState((prev) => advanceSimulation(prev, seconds * 1000));
  }, []);

  const shaveActive = useCallback((lbs: number) => {
    setState((prev) => {
      const activeIdx = prev.spits.findIndex((s) => s.active);
      if (activeIdx < 0) return prev;
      const active = prev.spits[activeIdx];
      const actuallyShaved = Math.min(lbs, active.remainingLbs);
      if (actuallyShaved <= 0) return prev;
      const portionsAdded = actuallyShaved / prev.config.portionLbs;

      // Classify the cut: cookProgress 0.82..1.0 = ideal, otherwise late/early
      const inIdeal =
        active.cookProgress >= 0.82 && active.cookProgress <= 1.0;

      const nextSpits = prev.spits.map((s, i) =>
        i === activeIdx
          ? { ...s, remainingLbs: s.remainingLbs - actuallyShaved }
          : s,
      );
      return {
        ...prev,
        spits: nextSpits,
        steamTablePortionsRemaining: Math.min(
          prev.steamTableCapacity,
          prev.steamTablePortionsRemaining + portionsAdded,
        ),
        kpis: {
          ...prev.kpis,
          totalCuts: prev.kpis.totalCuts + 1,
          idealCuts: prev.kpis.idealCuts + (inIdeal ? 1 : 0),
        },
      };
    });
  }, []);

  const startNewSpit = useCallback((lbs: number) => {
    setState((prev) => {
      const alreadyLoading = prev.spits.some(
        (s) => !s.active && s.cookProgress > 0 && s.remainingLbs > 0,
      );
      if (alreadyLoading) return prev;

      const slotIdx = prev.spits.findIndex(
        (s) => !s.active && (s.cookProgress === 0 || s.remainingLbs <= 0),
      );
      if (slotIdx < 0) return prev;

      const now = Date.now();
      const slotName = prev.spits[slotIdx].id.replace("-", " ");
      const next = prev.spits.map<Spit>((s, i) =>
        i === slotIdx
          ? {
              ...s,
              loadedAtMs: now,
              initialLbs: lbs,
              remainingLbs: lbs,
              cookProgress: 0.05,
              state: "loading",
              active: false,
            }
          : s,
      );
      const alert: SpitAlert = {
        id: `alert-${now}-newspit`,
        kind: "reprep-needed",
        severity: "info",
        message: `${slotName} loaded with ${lbs} lbs — ETA ready in ~${prev.config.newSpitLeadMinutes} min.`,
        createdAtMs: now,
      };
      return { ...prev, spits: next, alerts: [...prev.alerts, alert] };
    });
  }, []);

  const startGrill = useCallback(() => {
    setState((prev) => ({
      ...prev,
      grillTimer: {
        status: "searing",
        startedAtMs: Date.now(),
        elapsedSeconds: 0,
      },
    }));
  }, []);

  const plateGrill = useCallback(() => {
    setState((prev) => {
      const elapsed = prev.grillTimer.elapsedSeconds;
      const violation = elapsed < prev.config.grillMinSeconds;
      const alerts =
        violation && prev.grillTimer.startedAtMs != null
          ? [
              ...prev.alerts,
              {
                id: `alert-${Date.now()}-foodsafety`,
                kind: "food-safety-violation" as const,
                severity: "critical" as const,
                message: `Plated at ${elapsed}s — under ${prev.config.grillMinSeconds}s SOP. Food-safety violation logged.`,
                createdAtMs: Date.now(),
              },
            ]
          : prev.alerts;
      return {
        ...prev,
        grillTimer: { status: "idle", startedAtMs: null, elapsedSeconds: 0 },
        alerts,
        kpis: {
          ...prev.kpis,
          totalGrillPulls: prev.kpis.totalGrillPulls + 1,
          foodSafetyViolations:
            prev.kpis.foodSafetyViolations + (violation ? 1 : 0),
        },
      };
    });
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      acknowledgedAlertIds: [...prev.acknowledgedAlertIds, id],
    }));
  }, []);

  const onConfigChange = useCallback(
    (next: Partial<ChickenSpitConfigV1>) => {
      setState((prev) => {
        const config = { ...prev.config, ...next };
        let spits = prev.spits;
        if (next.numSpits && next.numSpits !== prev.config.numSpits) {
          if (next.numSpits > prev.config.numSpits) {
            const SLOT_IDS = ["spit-a", "spit-b", "spit-c"];
            const extra: Spit[] = Array.from(
              { length: next.numSpits - prev.config.numSpits },
              (_, i) => ({
                id: SLOT_IDS[prev.config.numSpits + i],
                loadedAtMs: 0,
                initialLbs: 0,
                remainingLbs: 0,
                cookProgress: 0,
                state: "loading" as const,
                active: false,
              }),
            );
            spits = [...prev.spits, ...extra];
          } else {
            spits = prev.spits.slice(0, next.numSpits);
            // ensure at least one is active if any have chicken
            if (!spits.some((s) => s.active) && spits.some((s) => s.remainingLbs > 0)) {
              const firstWithChicken = spits.findIndex((s) => s.remainingLbs > 0);
              spits = spits.map((s, i) =>
                i === firstWithChicken ? { ...s, active: true } : s,
              );
            }
          }
        }
        const merged = { ...prev, config, spits };
        saveChickenSpitPersisted(merged);
        return merged;
      });
    },
    [],
  );

  const onApplyScenario = useCallback((scenario: SpitScenario) => {
    setState((prev) => {
      const fresh = createInitialChickenSpitState(Date.now(), {
        ...prev.config,
        scenario,
      });
      saveChickenSpitPersisted(fresh);
      return fresh;
    });
  }, []);

  const resetAll = useCallback(() => {
    resetChickenSpitPersistence();
    setState(createInitialChickenSpitState(Date.now()));
  }, []);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 text-sm text-muted-foreground">
        Loading chicken-spit prototype…
      </div>
    );
  }

  const newSpitInProgress = state.spits.some(
    (s) => !s.active && s.cookProgress > 0 && s.remainingLbs > 0,
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 px-3 pb-6 pt-2 lg:px-4">
      <header className="sticky top-12 z-30 -mx-3 lg:-mx-4 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold tracking-tight">Chicken spit</h1>
            <Badge className="bg-orange-500 text-[10px] text-white hover:bg-orange-600">
              {state.config.scenario}
            </Badge>
            <Kpi icon={<Activity className="size-3" />} label={`${state.posVelocityPerMin}/min`} />
            <Kpi label={`${Math.floor(state.portionsSoldToday)} sold`} />
            <Kpi label={`${analysis.accessibleLbs.toFixed(1)} lb on hand`} />
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

      <SpitConfigCard
        config={state.config}
        onConfigChange={onConfigChange}
        onApplyScenario={onApplyScenario}
      />

      <SpitKpiStrip kpis={state.kpis} />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className={cn("grid gap-3", loadingSpit ? "sm:grid-cols-2" : "")}>
            {activeSpit ? (
              <SpitCameraCard
                spit={activeSpit}
                config={state.config}
                onAdvance={advanceCook}
                onShave={shaveActive}
              />
            ) : null}
            {loadingSpit ? (
              <SpitCameraCard
                spit={loadingSpit}
                config={state.config}
                onAdvance={advanceCook}
                dense
              />
            ) : null}
          </div>
          <ReprepTriggerCard
            analysis={analysis}
            config={state.config}
            posVelocityPerMin={state.posVelocityPerMin}
            onStartNewSpit={startNewSpit}
            newSpitInProgress={newSpitInProgress}
          />
        </div>

        <aside className="space-y-3">
          <SteamTableCard
            portionsRemaining={state.steamTablePortionsRemaining}
            capacity={state.steamTableCapacity}
            portionLbs={state.config.portionLbs}
            posVelocityPerMin={state.posVelocityPerMin}
          />
          <GrillTimerCard
            timer={state.grillTimer}
            minSeconds={state.config.grillMinSeconds}
            onStart={startGrill}
            onPlate={plateGrill}
            onReset={plateGrill}
          />
          <AlertStack
            alerts={state.alerts}
            acknowledgedIds={state.acknowledgedAlertIds}
            onAcknowledge={acknowledgeAlert}
          />
        </aside>
      </div>

      <SpitPlanCard />
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

/** Pure simulation step — clamps per-tick, only serves real chicken, tracks KPIs. */
function advanceSimulation(
  prev: ChickenSpitPersistedStateV1,
  elapsedMs: number,
): ChickenSpitPersistedStateV1 {
  const { config } = prev;
  const simSeconds = Math.min(60, (elapsedMs / 1000) * config.simulationSpeed);

  const portionsDemanded = prev.posVelocityPerMin * (simSeconds / 60);
  const portionLbs = config.portionLbs;

  let steamTable = prev.steamTablePortionsRemaining;
  const activeIdx = prev.spits.findIndex((s) => s.active);
  let activeRemainingLbs =
    activeIdx >= 0 ? prev.spits[activeIdx].remainingLbs : 0;

  let portionsSold = Math.min(steamTable, portionsDemanded);
  steamTable -= portionsSold;
  let portionsShortfall = portionsDemanded - portionsSold;

  if (portionsShortfall > 0 && activeRemainingLbs > 0) {
    const lbsForShortfall = Math.min(
      portionsShortfall * portionLbs,
      activeRemainingLbs,
    );
    const portionsServed = lbsForShortfall / portionLbs;
    portionsSold += portionsServed;
    portionsShortfall -= portionsServed;
    activeRemainingLbs -= lbsForShortfall;
  }

  const refillTargetPortions = 8;
  const refillNeeded = Math.max(0, refillTargetPortions - steamTable);
  if (refillNeeded > 0 && activeRemainingLbs > 0) {
    const lbsToShave = Math.min(refillNeeded * portionLbs, activeRemainingLbs);
    const portionsAdded = lbsToShave / portionLbs;
    steamTable = Math.min(prev.steamTableCapacity, steamTable + portionsAdded);
    activeRemainingLbs -= lbsToShave;
  }

  // Stockout detection: stockout = steam table empty AND no active chicken AND demand active
  const stockedOutNow =
    steamTable <= 0 &&
    activeRemainingLbs <= 0 &&
    portionsShortfall > 0;
  const stockoutEvents =
    stockedOutNow && !prev.prevStockedout
      ? prev.kpis.stockoutEvents + 1
      : prev.kpis.stockoutEvents;

  let nextSpits = prev.spits.map((s, i) =>
    i === activeIdx
      ? tickSpit({ ...s, remainingLbs: activeRemainingLbs }, config, simSeconds, 0)
      : s,
  );

  const loadingIdx = nextSpits.findIndex(
    (s) => !s.active && s.cookProgress > 0 && s.remainingLbs > 0,
  );
  if (loadingIdx >= 0) {
    nextSpits = nextSpits.map((s, i) =>
      i === loadingIdx
        ? tickSpit({ ...s, active: true }, config, simSeconds, 0)
        : s,
    );
    nextSpits[loadingIdx] = { ...nextSpits[loadingIdx], active: false };
  }

  const activeAfter = nextSpits.find((s) => s.active);
  const promoteCandidate = nextSpits.find(
    (s) => !s.active && s.cookProgress >= 0.82 && s.remainingLbs > 0,
  );
  // Track shrinkage when an active spit is being demoted (depleted)
  let shrinkageHistory = prev.kpis.shrinkageHistory;
  if (activeAfter && activeAfter.remainingLbs <= 0.1 && promoteCandidate) {
    // Compute shrinkage % for the depleting spit. We don't track raw weight,
    // so model shrinkage as 22-38% based on how far past ready it cooked.
    const overcookFactor = Math.max(0, activeAfter.cookProgress - 0.92);
    const pct = Math.min(45, 22 + overcookFactor * 80);
    shrinkageHistory = [
      ...shrinkageHistory,
      { tMs: Date.now(), spitId: activeAfter.id, pct: Math.round(pct * 10) / 10 },
    ].slice(-30);
    nextSpits = nextSpits.map<Spit>((s) => {
      if (s.id === activeAfter.id) return { ...s, active: false };
      if (s.id === promoteCandidate.id) return { ...s, active: true };
      return s;
    });
  }

  const portionsSoldToday = prev.portionsSoldToday + portionsSold;
  const active = nextSpits.find((s) => s.active);

  // Forecast vs. actual bucketing — every 15 min wall, snapshot a bucket
  let currentBucketActualLbs =
    prev.currentBucketActualLbs + portionsSold * portionLbs;
  let currentBucketStartMs = prev.currentBucketStartMs;
  let forecastVsActual = prev.kpis.forecastVsActual;
  const now = Date.now();
  if (now - currentBucketStartMs >= FORECAST_BUCKET_MS) {
    // Forecast = posVelocity × 15 min × portionLbs (idealized straight-line)
    const forecastLbs =
      prev.posVelocityPerMin * 15 * portionLbs;
    forecastVsActual = [
      ...forecastVsActual,
      {
        tMs: currentBucketStartMs,
        forecastLbs: Math.round(forecastLbs * 10) / 10,
        actualLbs: Math.round(currentBucketActualLbs * 10) / 10,
      },
    ].slice(-12);
    currentBucketActualLbs = 0;
    currentBucketStartMs = now;
  }

  let grillTimer = prev.grillTimer;
  if (grillTimer.status !== "idle" && grillTimer.startedAtMs != null) {
    const elapsedSeconds = Math.floor(
      (Date.now() - grillTimer.startedAtMs) / 1000,
    );
    grillTimer = {
      ...grillTimer,
      elapsedSeconds,
      status:
        elapsedSeconds > config.grillMinSeconds ? "overshoot" : "searing",
    };
  }

  const newAlerts: SpitAlert[] = [...prev.alerts];
  const existingKinds = new Set(
    prev.alerts
      .filter((a) => !prev.acknowledgedAlertIds.includes(a.id))
      .map((a) => `${a.kind}:${a.severity}`),
  );
  if (active) {
    const st = deriveSpitState(active.cookProgress);
    if (st === "ready" && !existingKinds.has("ready-to-shave:info")) {
      newAlerts.push({
        id: `alert-${Date.now()}-ready`,
        kind: "ready-to-shave",
        severity: "info",
        message: `${active.id.replace("-", " ")} is in the optimal shave window.`,
        createdAtMs: Date.now(),
      });
    }
    if (
      st === "overcooking" &&
      !existingKinds.has("overcooking:warning") &&
      !existingKinds.has("overcooking:critical")
    ) {
      newAlerts.push({
        id: `alert-${Date.now()}-overcook`,
        kind: "overcooking",
        severity: active.cookProgress > 1.15 ? "critical" : "warning",
        message: `${active.id.replace("-", " ")} overcooking — shave aggressively or pull.`,
        createdAtMs: Date.now(),
      });
    }
  }
  if (steamTable <= 2 && !existingKinds.has("steam-table-low:warning")) {
    newAlerts.push({
      id: `alert-${Date.now()}-steamtable`,
      kind: "steam-table-low",
      severity: "warning",
      message: `Steam table low (${Math.floor(steamTable)} portions).`,
      createdAtMs: Date.now(),
    });
  }
  if (
    grillTimer.status === "overshoot" &&
    !existingKinds.has("grill-overshoot:critical")
  ) {
    newAlerts.push({
      id: `alert-${Date.now()}-grilloverk`,
      kind: "grill-overshoot",
      severity: "critical",
      message: `Grill ${grillTimer.elapsedSeconds}s — past ${config.grillMinSeconds}s line.`,
      createdAtMs: Date.now(),
    });
  }

  return {
    ...prev,
    spits: nextSpits,
    steamTablePortionsRemaining: Math.max(0, steamTable),
    grillTimer,
    alerts: newAlerts.slice(-30),
    portionsSoldToday: Math.round(portionsSoldToday * 10) / 10,
    lastTickMs: Date.now(),
    kpis: {
      ...prev.kpis,
      stockoutEvents,
      shrinkageHistory,
      forecastVsActual,
    },
    prevStockedout: stockedOutNow,
    currentBucketActualLbs,
    currentBucketStartMs,
  };
}
