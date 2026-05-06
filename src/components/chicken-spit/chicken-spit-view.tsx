"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Pause, Play, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertStack } from "@/components/chicken-spit/alert-stack";
import { GrillTimerCard } from "@/components/chicken-spit/grill-timer-card";
import { ReprepTriggerCard } from "@/components/chicken-spit/reprep-trigger-card";
import { SpitCameraCard } from "@/components/chicken-spit/spit-camera-card";
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
  ChickenSpitPersistedStateV1,
  Spit,
  SpitAlert,
} from "@/lib/chicken-spit/types";

const TICK_MS = 1000;

export function ChickenSpitView() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<ChickenSpitPersistedStateV1>(
    createChickenSpitInitialState,
  );
  const [paused, setPaused] = useState(false);

  // Hydrate from localStorage after first paint.
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

  // 1Hz simulation tick.
  useEffect(() => {
    if (!hydrated || paused) return;
    const id = window.setInterval(() => {
      setState((prev) => advanceSimulation(prev, TICK_MS));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [hydrated, paused]);

  // Debounced persistence.
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
          s.id !== activeSpit.id &&
          s.cookProgress > 0 &&
          s.remainingLbs > 0,
      ),
    [state.spits, activeSpit.id],
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
      };
    });
  }, []);

  const startNewSpit = useCallback((lbs: number) => {
    setState((prev) => {
      // Only block if a non-active spit is mid-cook AND still has chicken on it
      // (i.e. a fresh load is already loading & hasn't been promoted yet).
      const alreadyLoading = prev.spits.some(
        (s) => !s.active && s.cookProgress > 0 && s.remainingLbs > 0,
      );
      if (alreadyLoading) return prev;

      // Pick the first available slot: empty (cook=0) or spent (remainingLbs<=0).
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
    setState((prev) => ({
      ...prev,
      grillTimer: { status: "idle", startedAtMs: null, elapsedSeconds: 0 },
    }));
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      acknowledgedAlertIds: [...prev.acknowledgedAlertIds, id],
    }));
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

  // "In progress" means: a non-active spit is mid-cook with chicken on it.
  // (Once promoted to active or depleted to 0 lbs, the slot is reusable.)
  const newSpitInProgress = state.spits.some(
    (s) => !s.active && s.cookProgress > 0 && s.remainingLbs > 0,
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 px-3 pb-6 pt-2 lg:px-4">
      {/* Mission-control header — sticky, dense, all controls inline */}
      <header className="sticky top-12 z-30 -mx-3 lg:-mx-4 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold tracking-tight">Chicken spit</h1>
            <Badge className="bg-orange-500 text-[10px] text-white hover:bg-orange-600">
              Lunch rush
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

      {/* Mission grid: 2 cols desktop. Hero (cam + reprep) on left, sidebar on right. */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* HERO column — operator's primary attention */}
        <div className="space-y-3 lg:col-span-2">
          <div className={cn("grid gap-3", loadingSpit ? "sm:grid-cols-2" : "")}>
            <SpitCameraCard
              spit={activeSpit}
              config={state.config}
              onAdvance={advanceCook}
              onShave={shaveActive}
            />
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

        {/* SIDEBAR column — at-a-glance status + safety + alerts */}
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

      {/* Plan — collapsed by default, opens for managers/forecasters */}
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

/** Single compact wall-clock for the operator bar. */
function Clock() {
  const [label, setLabel] = useState<string>("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    // Defer the initial setState through setTimeout(…, 0) so it doesn't run
    // synchronously inside the effect body.
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

/** Pure simulation step — clamps per-tick game time, only serves real chicken. */
function advanceSimulation(
  prev: ChickenSpitPersistedStateV1,
  elapsedMs: number,
): ChickenSpitPersistedStateV1 {
  const { config } = prev;
  // Clamp simulated time per tick to 60 game-seconds — at 60× speed and 1 Hz
  // that's 1 game-min/tick; any larger and cook progress / depletion break.
  const simSeconds = Math.min(60, (elapsedMs / 1000) * config.simulationSpeed);

  const portionsDemanded = prev.posVelocityPerMin * (simSeconds / 60);
  const portionLbs = config.portionLbs;

  let steamTable = prev.steamTablePortionsRemaining;
  const activeIdx = prev.spits.findIndex((s) => s.active);
  let activeRemainingLbs =
    activeIdx >= 0 ? prev.spits[activeIdx].remainingLbs : 0;

  // 1. Sell from steam table first — cap at what's actually there.
  let portionsSold = Math.min(steamTable, portionsDemanded);
  steamTable -= portionsSold;
  let portionsShortfall = portionsDemanded - portionsSold;

  // 2. If shortfall, serve directly from active spit (only what's available).
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

  // 3. Refill steam table toward holding level — only from chicken we actually have.
  const refillTargetPortions = 8;
  const refillNeeded = Math.max(0, refillTargetPortions - steamTable);
  if (refillNeeded > 0 && activeRemainingLbs > 0) {
    const lbsToShave = Math.min(refillNeeded * portionLbs, activeRemainingLbs);
    const portionsAdded = lbsToShave / portionLbs;
    steamTable = Math.min(prev.steamTableCapacity, steamTable + portionsAdded);
    activeRemainingLbs -= lbsToShave;
  }

  // 4. Tick the active spit — cook progress advances, remaining lbs already deducted.
  let nextSpits = prev.spits.map((s, i) =>
    i === activeIdx
      ? tickSpit({ ...s, remainingLbs: activeRemainingLbs }, config, simSeconds, 0)
      : s,
  );

  // 5. Tick the loading spit (cook progress only, no shaving).
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

  // 6. Promote a ready loading spit to active when current active depletes.
  const activeAfter = nextSpits.find((s) => s.active);
  const promoteCandidate = nextSpits.find(
    (s) => !s.active && s.cookProgress >= 0.82 && s.remainingLbs > 0,
  );
  if (activeAfter && activeAfter.remainingLbs <= 0.1 && promoteCandidate) {
    nextSpits = nextSpits.map<Spit>((s) => {
      if (s.id === activeAfter.id) return { ...s, active: false };
      if (s.id === promoteCandidate.id) return { ...s, active: true };
      return s;
    });
  }

  const portionsSoldToday = prev.portionsSoldToday + portionsSold;
  const active = nextSpits.find((s) => s.active);

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
  };
}
