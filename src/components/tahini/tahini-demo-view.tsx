"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Circle,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  TimerReset,
  TrendingUp,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TAHINI_GRILL_ICON_BY_TONE,
  TAHINI_GRILL_STATES,
  TAHINI_LIVE,
  TAHINI_OPEN_QUESTIONS,
  TAHINI_PREP,
  TAHINI_SCREENS,
  TAHINI_STOCKOUT,
  type GrillState,
  type GrillStateId,
  type LiveSpit,
  type PrepLoad,
  type RotationSpeed,
  type SpitTone,
  type StockoutSpit,
  type TahiniScreenId,
} from "@/lib/tahini/mock-seed";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<
  SpitTone,
  {
    border: string;
    accent: string;
    badge: string;
    action: string;
    visual: string;
  }
> = {
  neutral: {
    border: "border-border",
    accent: "text-foreground",
    badge: "border-border bg-card text-card-foreground",
    action: "border-border text-foreground hover:bg-muted",
    visual: "bg-card",
  },
  ready: {
    border: "border-foreground",
    accent: "text-foreground",
    badge: "border-foreground bg-card text-card-foreground",
    action:
      "border-foreground bg-foreground text-background hover:bg-foreground/90",
    visual: "bg-muted-foreground/45",
  },
  warning: {
    border: "border-foreground",
    accent: "text-foreground",
    badge:
      "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    action:
      "border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/40",
    visual: "bg-muted-foreground/80 dark:bg-muted-foreground/60",
  },
  critical: {
    border: "border-orange-500 dark:border-orange-400",
    accent: "text-orange-600 dark:text-orange-300",
    badge:
      "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200",
    action:
      "border-orange-500 bg-orange-600 text-white hover:bg-orange-700 dark:border-orange-400 dark:bg-orange-500 dark:text-background dark:hover:bg-orange-400",
    visual: "bg-orange-100 dark:bg-orange-950",
  },
  reload: {
    border: "border-dashed border-foreground/70",
    accent: "text-foreground",
    badge: "border-border bg-card text-card-foreground",
    action:
      "border-foreground bg-foreground text-background hover:bg-foreground/90",
    visual: "bg-card",
  },
};

const GRILL_TONE_STYLES: Record<
  GrillState["tone"],
  {
    border: string;
    text: string;
    badge: string;
    panel: string;
  }
> = {
  neutral: {
    border: "border-foreground",
    text: "text-foreground",
    badge: "border-border bg-card text-card-foreground",
    panel: "border-foreground",
  },
  ready: {
    border: "border-foreground",
    text: "text-foreground",
    badge: "border-foreground bg-card text-card-foreground",
    panel: "border-foreground",
  },
  over: {
    border: "border-red-600 dark:border-red-400",
    text: "text-red-600 dark:text-red-300",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
    panel: "border-red-600 dark:border-red-400",
  },
  safety: {
    border: "border-red-800 dark:border-red-300",
    text: "text-red-800 dark:text-red-200",
    badge:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100",
    panel: "border-red-800 dark:border-red-300",
  },
};

const BASE_TIME_MINUTES = 12 * 60 + 34;
const CLOSE_TIME_MINUTES = 21 * 60;
const PORTION_KG = 0.137;
const RELOAD_LEAD_MINUTES = 60;
const STOCKOUT_BUFFER_MINUTES = 15;
const AUTO_STEP_MINUTES = 5;

const BASE_SPIT_DEMAND_KG_PER_MIN: Record<string, number> = {
  "SPIT 1": 0.032,
  "SPIT 2": 0.022,
  "SPIT 3": 0.014,
};

const BASE_LAST_SHAVE_MINUTES_AGO: Record<string, number> = {
  "SPIT 1": 3,
  "SPIT 2": 8,
  "SPIT 3": 14,
};

type TahiniDemoState = {
  elapsedMinutes: number;
  demandMultiplier: number;
  forecastKg: number;
  prepConfirmed: boolean;
  reloadStarted: boolean;
  reloadStartedAtMinute: number | null;
  manualShavesKg: Record<string, number>;
  lastShaveAtMinute: Record<string, number>;
  grillElapsedSeconds: number;
  grillRunning: boolean;
  grillBatches: number;
  grillTotalSeconds: number;
  grillViolations: number;
  grillLateStreak: number;
  grillLastUnsafe: boolean;
};

type LiveProjection = {
  timeLabel: string;
  demandLabel: string;
  remainingKg: number;
  shavedKg: number;
  portions: number;
  stockoutLabel: string;
  stockoutDetail: string;
  riskSpit: LiveSpit | null;
  spits: LiveSpit[];
};

type GrillProjection = {
  state: GrillState;
  elapsedSeconds: number;
  running: boolean;
};

const INITIAL_DEMO_STATE: TahiniDemoState = {
  elapsedMinutes: 0,
  demandMultiplier: 1,
  forecastKg: TAHINI_PREP.today.cookKg,
  prepConfirmed: false,
  reloadStarted: false,
  reloadStartedAtMinute: null,
  manualShavesKg: {},
  lastShaveAtMinute: {
    "SPIT 1": -BASE_LAST_SHAVE_MINUTES_AGO["SPIT 1"],
    "SPIT 2": -BASE_LAST_SHAVE_MINUTES_AGO["SPIT 2"],
    "SPIT 3": -BASE_LAST_SHAVE_MINUTES_AGO["SPIT 3"],
  },
  grillElapsedSeconds: 0,
  grillRunning: false,
  grillBatches: 15,
  grillTotalSeconds: Math.round(31.2 * 15),
  grillViolations: 0,
  grillLateStreak: 0,
  grillLastUnsafe: false,
};

function advanceDemoClock(
  state: TahiniDemoState,
  minutes: number,
): TahiniDemoState {
  return {
    ...state,
    elapsedMinutes: clamp(
      state.elapsedMinutes + minutes,
      0,
      CLOSE_TIME_MINUTES - BASE_TIME_MINUTES,
    ),
  };
}

function projectLive(state: TahiniDemoState): LiveProjection {
  const spits = TAHINI_LIVE.spits.map((spit) => projectSpit(spit, state));
  const remainingKg = sumBy(spits, (spit) => spit.remainingKg);
  const shavedKg =
    5.2 +
    state.elapsedMinutes * totalDemandRate(state) +
    sumBy(Object.values(state.manualShavesKg), (kg) => kg);
  const riskSpit = getRiskSpit(spits, state);
  const stockoutMinute =
    riskSpit == null ? null : getProjectedEmptyMinutes(riskSpit, state);

  return {
    timeLabel: `${formatDateTime(BASE_TIME_MINUTES + state.elapsedMinutes)}${getDaypart(state.elapsedMinutes)}`,
    demandLabel: formatDemand(state.demandMultiplier),
    remainingKg,
    shavedKg,
    portions: Math.round(shavedKg / PORTION_KG),
    stockoutLabel:
      riskSpit && stockoutMinute != null
        ? formatTimeOfDay(
            BASE_TIME_MINUTES + state.elapsedMinutes + stockoutMinute,
          )
        : "--",
    stockoutDetail:
      riskSpit && stockoutMinute != null
        ? `${riskSpit.id.toLowerCase()} - ${riskSpit.protein.toLowerCase()}`
        : "no risk currently",
    riskSpit,
    spits,
  };
}

function projectSpit(base: LiveSpit, state: TahiniDemoState): LiveSpit {
  const baseRate = BASE_SPIT_DEMAND_KG_PER_MIN[base.id] ?? 0.015;
  const autoShavedKg = state.elapsedMinutes * baseRate * state.demandMultiplier;
  const manualShavedKg = state.manualShavesKg[base.id] ?? 0;
  const remainingKg = Math.max(
    0,
    base.remainingKg - autoShavedKg - manualShavedKg,
  );
  const shavedKg = base.shavedKg + autoShavedKg + manualShavedKg;
  const lastShaveAgo = Math.max(
    0,
    state.elapsedMinutes - (state.lastShaveAtMinute[base.id] ?? 0),
  );
  const emptyMinutes = getProjectedEmptyMinutes(
    { ...base, remainingKg },
    state,
  );
  const isChickenRisk =
    base.protein === "Chicken" &&
    emptyMinutes <= RELOAD_LEAD_MINUTES + STOCKOUT_BUFFER_MINUTES;
  const outerColor = getOuterColor(lastShaveAgo, remainingKg);
  const suggested = getSuggestedRotation(state.demandMultiplier, emptyMinutes);
  const tone = getSpitTone({
    isChickenRisk,
    remainingKg,
    outerColor,
    baseTone: base.tone,
  });

  return {
    ...base,
    status: getSpitStatus(tone, outerColor),
    tone,
    remainingKg,
    shavedKg,
    outerColor,
    lastShave: formatAgo(lastShaveAgo),
    rotation: getCurrentRotation(state.demandMultiplier, base.rotation),
    suggested,
    note: getSpitNote(tone, state.demandMultiplier, emptyMinutes),
    action: getSpitAction(tone, outerColor),
  };
}

function toStockoutSpit(spit: LiveSpit, state: TahiniDemoState): StockoutSpit {
  const emptyMinutes = getProjectedEmptyMinutes(spit, state);

  return {
    id: spit.id,
    protein: spit.protein,
    status: spit.status,
    tone: spit.tone,
    remainingKg: spit.remainingKg,
    loadedKg: spit.loadedKg,
    shavedKg: spit.shavedKg,
    salesPace: formatDemand(state.demandMultiplier),
    emptyEstimate: `~ ${formatTimeOfDay(BASE_TIME_MINUTES + state.elapsedMinutes + emptyMinutes)}`,
    lastShave: spit.lastShave,
  };
}

function projectGrill(
  state: TahiniDemoState,
  fallbackStateId: GrillStateId,
): GrillProjection {
  if (state.grillLastUnsafe) {
    return {
      state: makeGrillState("safety", state),
      elapsedSeconds: state.grillElapsedSeconds,
      running: state.grillRunning,
    };
  }

  if (state.grillRunning) {
    const id =
      state.grillElapsedSeconds < 30
        ? "cooking"
        : state.grillElapsedSeconds <= 34
          ? "ready"
          : "over";

    return {
      state: makeGrillState(id, state),
      elapsedSeconds: state.grillElapsedSeconds,
      running: true,
    };
  }

  return {
    state: makeGrillState(fallbackStateId, state),
    elapsedSeconds: state.grillElapsedSeconds,
    running: false,
  };
}

function makeGrillState(id: GrillStateId, state: TahiniDemoState): GrillState {
  const base =
    TAHINI_GRILL_STATES.find((grillState) => grillState.id === id) ??
    TAHINI_GRILL_STATES[0];
  const avgTime =
    state.grillBatches === 0 ? 0 : state.grillTotalSeconds / state.grillBatches;
  const remaining = Math.max(0, 30 - state.grillElapsedSeconds);
  const over = Math.max(0, state.grillElapsedSeconds - 30);
  const unsafe = id === "safety";

  return {
    ...base,
    timeValue:
      id === "idle"
        ? "Ready"
        : id === "cooking"
          ? `${remaining}s`
          : id === "ready"
            ? "0s"
            : unsafe
              ? `${remaining || 11}s`
              : `+${over}s`,
    batches: String(state.grillBatches),
    averageTime: `${avgTime.toFixed(1)}s`,
    averageDetail: avgTime > 32 ? "target 30s - trending up" : "target 30.0s",
    violations: String(state.grillViolations),
    violationsDetail:
      state.grillViolations > 0
        ? `logged - ${formatTimeOfDay(BASE_TIME_MINUTES + state.elapsedMinutes)}`
        : "none today",
    note:
      id === "over" && state.grillLateStreak >= 3
        ? "Coaching note: late pulls are clustering. Remove at the chime to protect yield."
        : base.note,
  };
}

function getRiskSpit(spits: LiveSpit[], state: TahiniDemoState) {
  const chickenSpits = spits.filter((spit) => spit.protein === "Chicken");
  const [soonest] = chickenSpits.sort(
    (a, b) =>
      getProjectedEmptyMinutes(a, state) - getProjectedEmptyMinutes(b, state),
  );

  if (!soonest) return null;

  return getProjectedEmptyMinutes(soonest, state) <=
    RELOAD_LEAD_MINUTES + STOCKOUT_BUFFER_MINUTES
    ? soonest
    : null;
}

function getProjectedEmptyMinutes(
  spit: Pick<LiveSpit, "id" | "remainingKg">,
  state: TahiniDemoState,
) {
  const rate =
    (BASE_SPIT_DEMAND_KG_PER_MIN[spit.id] ?? 0.015) * state.demandMultiplier;

  if (rate <= 0) return Number.POSITIVE_INFINITY;

  return Math.max(0, Math.round(spit.remainingKg / rate));
}

function getOuterColor(lastShaveAgo: number, remainingKg: number) {
  if (remainingKg <= 0.2) return "Empty";
  if (lastShaveAgo >= 13) return "Too dark";
  if (lastShaveAgo >= 7) return "Ready (golden)";
  if (lastShaveAgo >= 3) return "Building crust";
  return "Fresh cut";
}

function getSpitTone({
  isChickenRisk,
  remainingKg,
  outerColor,
  baseTone,
}: {
  isChickenRisk: boolean;
  remainingKg: number;
  outerColor: string;
  baseTone: SpitTone;
}): SpitTone {
  if (isChickenRisk || remainingKg <= 1.5) return "critical";
  if (outerColor === "Too dark") return "warning";
  if (outerColor === "Ready (golden)") return "ready";
  return baseTone === "reload" ? "neutral" : "neutral";
}

function getSpitStatus(tone: SpitTone, outerColor: string) {
  if (tone === "critical") return "Depleting fast";
  if (tone === "warning") return "Overcooking - past window";
  if (tone === "ready") return "Ready to shave";
  if (outerColor === "Fresh cut") return "Recovering";
  return "Live cam";
}

function getCurrentRotation(
  demandMultiplier: number,
  fallback: RotationSpeed,
): RotationSpeed {
  if (demandMultiplier >= 1.25) return "HIGH";
  if (demandMultiplier <= 0.85) return "LOW";
  return fallback;
}

function getSuggestedRotation(
  demandMultiplier: number,
  emptyMinutes: number,
): RotationSpeed {
  if (emptyMinutes <= RELOAD_LEAD_MINUTES + STOCKOUT_BUFFER_MINUTES) {
    return "HIGH";
  }
  if (demandMultiplier >= 1.15) return "HIGH";
  if (demandMultiplier <= 0.9) return "LOW";
  return "MEDIUM";
}

function getSpitNote(
  tone: SpitTone,
  demandMultiplier: number,
  emptyMinutes: number,
) {
  if (tone === "critical") {
    return `Projected empty in ~${emptyMinutes} min - start reload now.`;
  }
  if (tone === "warning") return "Shave first - outer layer is darkening.";
  if (tone === "ready") return "Ready band hit - shave now to protect yield.";
  if (demandMultiplier >= 1.15) {
    return "Demand is ahead of forecast - keep rotation high and watch reload timing.";
  }
  if (demandMultiplier <= 0.9) {
    return "Demand is soft - slow rotation to preserve the outer layer.";
  }
  return "Demand pace matches volume - keep current speed.";
}

function getSpitAction(tone: SpitTone, outerColor: string) {
  if (tone === "critical") return "Start reload";
  if (tone === "warning" || tone === "ready") return "Shave now";
  if (outerColor === "Fresh cut") return "Recover";
  return "Wait - ready soon";
}

function totalDemandRate(state: TahiniDemoState) {
  return (
    sumBy(Object.values(BASE_SPIT_DEMAND_KG_PER_MIN), (rate) => rate) *
    state.demandMultiplier
  );
}

function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

function formatDateTime(totalMinutes: number) {
  return `Tuesday, May 12 - ${formatTimeOfDay(totalMinutes)}`;
}

function formatTimeOfDay(totalMinutes: number) {
  const normalized =
    ((Math.round(totalMinutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

function getDaypart(elapsedMinutes: number) {
  if (elapsedMinutes < 90) return " - LUNCH RUSH";
  if (elapsedMinutes < 240) return " - AFTERNOON";
  return " - DINNER BUILD";
}

function formatDemand(multiplier: number) {
  const delta = Math.round((multiplier - 1) * 100);
  if (delta === 0) return "on forecast";
  return `${delta > 0 ? "+" : ""}${delta}% vs forecast`;
}

function formatAgo(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded === 0) return "just now";
  return `${rounded} min ago`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function TahiniDemoView() {
  const [activeScreen, setActiveScreen] = useState<TahiniScreenId>("prep");
  const [activeGrillState, setActiveGrillState] =
    useState<GrillStateId>("cooking");
  const [playing, setPlaying] = useState(false);
  const [demo, setDemo] = useState<TahiniDemoState>(INITIAL_DEMO_STATE);

  const selectedScreen = useMemo(
    () => TAHINI_SCREENS.find((screen) => screen.id === activeScreen),
    [activeScreen],
  );
  const liveProjection = useMemo(() => projectLive(demo), [demo]);
  const grillProjection = useMemo(
    () => projectGrill(demo, activeGrillState),
    [activeGrillState, demo],
  );

  useEffect(() => {
    if (!playing) return;

    const id = window.setInterval(() => {
      setDemo((prev) => advanceDemoClock(prev, AUTO_STEP_MINUTES));
    }, 1000);

    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (!demo.grillRunning) return;

    const id = window.setInterval(() => {
      setDemo((prev) => ({
        ...prev,
        grillElapsedSeconds: Math.min(prev.grillElapsedSeconds + 1, 75),
      }));
    }, 1000);

    return () => window.clearInterval(id);
  }, [demo.grillRunning]);

  function advanceMinutes(minutes: number) {
    setDemo((prev) => advanceDemoClock(prev, minutes));
  }

  function resetDemo() {
    setPlaying(false);
    setActiveScreen("prep");
    setActiveGrillState("cooking");
    setDemo(INITIAL_DEMO_STATE);
  }

  function setDemandMultiplier(next: number) {
    setDemo((prev) => ({
      ...prev,
      demandMultiplier: clamp(next, 0.7, 1.5),
    }));
  }

  function shaveSpit(spitId: string) {
    setDemo((prev) => ({
      ...prev,
      manualShavesKg: {
        ...prev.manualShavesKg,
        [spitId]: (prev.manualShavesKg[spitId] ?? 0) + 0.35,
      },
      lastShaveAtMinute: {
        ...prev.lastShaveAtMinute,
        [spitId]: prev.elapsedMinutes,
      },
    }));
  }

  function startReload() {
    setActiveScreen("stockout");
    setDemo((prev) => ({
      ...prev,
      reloadStarted: true,
      reloadStartedAtMinute: prev.reloadStartedAtMinute ?? prev.elapsedMinutes,
    }));
  }

  function confirmPrep() {
    setActiveScreen("live");
    setDemo((prev) => ({
      ...prev,
      prepConfirmed: true,
      elapsedMinutes: Math.max(prev.elapsedMinutes, 0),
    }));
  }

  function adjustForecast(deltaKg: number) {
    setDemo((prev) => ({
      ...prev,
      forecastKg: clamp(prev.forecastKg + deltaKg, 16, 26),
    }));
  }

  function chooseGrillState(stateId: GrillStateId) {
    setActiveGrillState(stateId);
    setDemo((prev) => ({
      ...prev,
      grillElapsedSeconds:
        stateId === "idle"
          ? 0
          : stateId === "cooking"
            ? 17
            : stateId === "ready"
              ? 30
              : stateId === "over"
                ? 38
                : 19,
      grillRunning: stateId === "cooking",
      grillLastUnsafe: stateId === "safety",
    }));
  }

  function startGrillBatch() {
    setActiveGrillState("cooking");
    setDemo((prev) => ({
      ...prev,
      grillElapsedSeconds: 0,
      grillRunning: true,
      grillLastUnsafe: false,
    }));
  }

  function advanceGrill(seconds: number) {
    setDemo((prev) => ({
      ...prev,
      grillElapsedSeconds: clamp(prev.grillElapsedSeconds + seconds, 0, 75),
      grillRunning: true,
      grillLastUnsafe: false,
    }));
  }

  function removeGrillBatch() {
    setDemo((prev) => {
      if (prev.grillLastUnsafe && !prev.grillRunning) {
        return {
          ...prev,
          grillElapsedSeconds: 0,
          grillLastUnsafe: false,
        };
      }

      const elapsedSeconds = prev.grillElapsedSeconds;
      const unsafe = elapsedSeconds < 30;
      const late = elapsedSeconds > 35;

      return {
        ...prev,
        grillRunning: false,
        grillBatches: prev.grillBatches + 1,
        grillTotalSeconds: prev.grillTotalSeconds + elapsedSeconds,
        grillViolations: prev.grillViolations + (unsafe ? 1 : 0),
        grillLateStreak: unsafe ? 0 : late ? prev.grillLateStreak + 1 : 0,
        grillLastUnsafe: unsafe,
        grillElapsedSeconds: unsafe ? elapsedSeconds : 0,
      };
    });
    setActiveGrillState("idle");
  }

  return (
    <section className="bg-background text-foreground min-h-[calc(100vh-96px)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="border-border bg-card text-card-foreground flex flex-col gap-4 border p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.24em] uppercase">
              Forkcast - production intelligence
            </p>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Tahini&apos;s Pilot
            </h1>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {TAHINI_SCREENS.map((screen) => (
              <button
                key={screen.id}
                type="button"
                onClick={() => setActiveScreen(screen.id)}
                aria-pressed={activeScreen === screen.id}
                className={cn(
                  "focus-visible:ring-ring flex min-h-16 items-center gap-3 border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  activeScreen === screen.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/60 hover:text-foreground",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center border border-current">
                  <screen.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold tracking-[0.18em] uppercase">
                    {screen.code}
                  </span>
                  <span className="block truncate text-sm font-semibold">
                    {screen.label}
                  </span>
                  <span className="block truncate text-xs opacity-75">
                    {screen.detail}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedScreen ? (
          <ScreenIntro
            code={selectedScreen.code}
            title={getScreenTitle(activeScreen)}
            prompt={getScreenPrompt(activeScreen)}
            window={getScreenWindow(activeScreen)}
          />
        ) : null}

        <SimulationControls
          demo={demo}
          projection={liveProjection}
          playing={playing}
          onPlayingChange={setPlaying}
          onAdvance={advanceMinutes}
          onDemandChange={setDemandMultiplier}
          onReset={resetDemo}
        />

        {activeScreen === "prep" ? (
          <MorningPrepScreen
            demo={demo}
            onAdjustForecast={adjustForecast}
            onConfirm={confirmPrep}
          />
        ) : null}
        {activeScreen === "live" ? (
          <LiveCookingScreen
            projection={liveProjection}
            onShave={shaveSpit}
            onStartReload={startReload}
          />
        ) : null}
        {activeScreen === "stockout" ? (
          <StockoutScreen
            demo={demo}
            projection={liveProjection}
            onStartReload={startReload}
            onShave={shaveSpit}
          />
        ) : null}
        {activeScreen === "grill" ? (
          <GrillScreen
            projection={grillProjection}
            activeState={activeGrillState}
            onStateChange={chooseGrillState}
            onStartBatch={startGrillBatch}
            onAdvance={advanceGrill}
            onRemove={removeGrillBatch}
          />
        ) : null}

        <OpenQuestions />
      </div>
    </section>
  );
}

function getScreenTitle(screen: TahiniScreenId) {
  if (screen === "prep") return "Morning prep";
  if (screen === "live") return "Live cooking";
  if (screen === "stockout") return "Stockout reload";
  return "Grill - 4 sub-states";
}

function getScreenPrompt(screen: TahiniScreenId) {
  if (screen === "prep") return TAHINI_PREP.prompt;
  if (screen === "live") return TAHINI_LIVE.prompt;
  if (screen === "stockout") return TAHINI_STOCKOUT.prompt;
  return "Single-batch 30s timer";
}

function getScreenWindow(screen: TahiniScreenId) {
  if (screen === "prep") return TAHINI_PREP.window;
  if (screen === "live") return TAHINI_LIVE.window;
  if (screen === "stockout") return TAHINI_STOCKOUT.window;
  return "grill-side tablet - cook-facing";
}

function ScreenIntro({
  code,
  title,
  prompt,
  window,
}: {
  code: string;
  title: string;
  prompt: string;
  window: string;
}) {
  return (
    <div className="border-border text-muted-foreground grid gap-2 border-y py-3 text-sm lg:grid-cols-[220px_1fr_260px] lg:items-center">
      <p className="font-semibold tracking-[0.2em] uppercase">
        {code} - {title}
      </p>
      <p className="text-foreground text-xl font-bold">&quot;{prompt}&quot;</p>
      <p className="text-left italic lg:text-right">{window}</p>
    </div>
  );
}

function SimulationControls({
  demo,
  projection,
  playing,
  onPlayingChange,
  onAdvance,
  onDemandChange,
  onReset,
}: {
  demo: TahiniDemoState;
  projection: LiveProjection;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onAdvance: (minutes: number) => void;
  onDemandChange: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="border-border bg-card grid gap-4 border p-4 shadow-sm xl:grid-cols-[1fr_320px] xl:items-center">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <SectionLabel>Demo clock</SectionLabel>
          <p className="text-2xl font-bold">{projection.timeLabel}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {demo.elapsedMinutes} min elapsed
          </p>
        </div>
        <div>
          <SectionLabel>Live demand</SectionLabel>
          <p className="flex items-center gap-2 text-2xl font-bold">
            <TrendingUp className="size-5 text-orange-600 dark:text-orange-300" />
            {projection.demandLabel}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {projection.portions} portions shaved
          </p>
        </div>
        <div>
          <SectionLabel>Next risk</SectionLabel>
          <p className="text-2xl font-bold">{projection.stockoutLabel}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {projection.stockoutDetail}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPlayingChange(!playing)}
          >
            {playing ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {playing ? "Pause" : "Run"}
          </Button>
          {[5, 15, 45].map((minutes) => (
            <Button
              key={minutes}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAdvance(minutes)}
            >
              <FastForward className="size-4" />+{minutes}m
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          <span className="text-muted-foreground flex items-center justify-between">
            <span>Demand pace</span>
            <span>{Math.round(demo.demandMultiplier * 100)}%</span>
          </span>
          <input
            type="range"
            min="70"
            max="150"
            step="5"
            value={Math.round(demo.demandMultiplier * 100)}
            onChange={(event) =>
              onDemandChange(Number(event.currentTarget.value) / 100)
            }
            className="accent-foreground w-full"
          />
        </label>
      </div>
    </div>
  );
}

function MorningPrepScreen({
  demo,
  onAdjustForecast,
  onConfirm,
}: {
  demo: TahiniDemoState;
  onAdjustForecast: (deltaKg: number) => void;
  onConfirm: () => void;
}) {
  const scale = demo.forecastKg / TAHINI_PREP.today.cookKg;
  const chickenKg = TAHINI_PREP.today.chickenKg * scale;
  const gyroKg = TAHINI_PREP.today.gyroKg * scale;
  const loads = TAHINI_PREP.loads.map((load) => ({
    ...load,
    kg: load.kg * scale,
  }));

  return (
    <TabletFrame>
      <DeviceHeader
        store={TAHINI_PREP.store}
        time={`${TAHINI_PREP.time}${demo.prepConfirmed ? " - CONFIRMED" : ""}`}
      />

      <div className="mt-6">
        <SectionLabel>Today</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <div className="border-foreground bg-card border-2 p-6">
            <p className="text-muted-foreground text-lg">Cook</p>
            <p className="text-foreground mt-4 text-7xl font-bold tracking-tight">
              {demo.forecastKg.toFixed(1)} kg
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              {chickenKg.toFixed(1)} kg chicken - {gyroKg.toFixed(1)} kg gyro
            </p>
          </div>

          <div className="border-border bg-card border p-6">
            <SectionLabel>Yesterday</SectionLabel>
            <MetricRow
              label="Cooked"
              value={`${TAHINI_PREP.yesterday.cookedKg.toFixed(1)} kg`}
              large
            />
            <MetricRow
              label="Sold"
              value={`${TAHINI_PREP.yesterday.soldKg.toFixed(1)} kg`}
            />
            <MetricRow
              label="Waste"
              value={`${TAHINI_PREP.yesterday.wasteKg.toFixed(1)} kg - ${TAHINI_PREP.yesterday.wastePercent}%`}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel>Load onto spits</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-3">
          {loads.map((load) => (
            <PrepLoadCard key={load.id} load={load} />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-border bg-card"
            onClick={() => onAdjustForecast(-1)}
          >
            -1 kg
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-border bg-card"
            onClick={() => onAdjustForecast(1)}
          >
            +1 kg
          </Button>
        </div>
        <Button
          type="button"
          className="bg-foreground text-background hover:bg-foreground/90"
          onClick={onConfirm}
        >
          {demo.prepConfirmed ? "Confirmed" : "Confirm & start prep"}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </TabletFrame>
  );
}

function LiveCookingScreen({
  projection,
  onShave,
  onStartReload,
}: {
  projection: LiveProjection;
  onShave: (spitId: string) => void;
  onStartReload: () => void;
}) {
  return (
    <TabletFrame>
      <DeviceHeader store={TAHINI_LIVE.store} time={projection.timeLabel} />
      <KpiStrip
        items={[
          {
            label: "Remaining on spits",
            value: `${projection.remainingKg.toFixed(1)} kg`,
            detail: "across 3 spits",
          },
          {
            label: "Shaved today",
            value: `${projection.shavedKg.toFixed(1)} kg`,
            detail: `~ ${projection.portions} portions - ${projection.demandLabel}`,
          },
          {
            label: "Est. stockout",
            value: projection.stockoutLabel,
            detail: projection.stockoutDetail,
          },
        ]}
        highlightLast={projection.riskSpit != null}
      />
      <SectionLabel className="mt-6">Spits - live</SectionLabel>
      <div className="grid gap-4 xl:grid-cols-3">
        {projection.spits.map((spit) => (
          <LiveSpitCard
            key={spit.id}
            spit={spit}
            onAction={() =>
              spit.tone === "critical" ? onStartReload() : onShave(spit.id)
            }
          />
        ))}
      </div>
    </TabletFrame>
  );
}

function StockoutScreen({
  demo,
  projection,
  onStartReload,
  onShave,
}: {
  demo: TahiniDemoState;
  projection: LiveProjection;
  onStartReload: () => void;
  onShave: (spitId: string) => void;
}) {
  const fallbackRisk =
    projection.spits
      .filter((spit) => spit.protein === "Chicken")
      .sort((a, b) => a.remainingKg - b.remainingKg)[0] ?? projection.spits[0];
  const riskSpit = projection.riskSpit ?? fallbackRisk;
  const stockoutSpit = toStockoutSpit(riskSpit, demo);
  const remainingSpits = projection.spits
    .filter((spit) => spit.id !== riskSpit.id)
    .map((spit) => toStockoutSpit(spit, demo));
  const projectedEmpty = formatTimeOfDay(
    BASE_TIME_MINUTES +
      demo.elapsedMinutes +
      getProjectedEmptyMinutes(riskSpit, demo),
  );

  return (
    <TabletFrame>
      <DeviceHeader store={TAHINI_STOCKOUT.store} time={projection.timeLabel} />

      <div className="border-foreground bg-card mt-5 flex flex-col gap-3 border-2 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <AlertTriangle className="mt-1 size-5 shrink-0 text-orange-600 dark:text-orange-300" />
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-orange-700 uppercase dark:text-orange-200">
              {projection.riskSpit
                ? TAHINI_STOCKOUT.alert.label
                : "Reload monitor - chicken"}
            </p>
            <p className="text-muted-foreground mt-2 max-w-2xl text-base font-semibold">
              {riskSpit.id} projected empty at ~{projectedEmpty}.{" "}
              {projection.riskSpit
                ? "Start a new cone now to stay inside the buffer."
                : "Demand has not crossed the buffer yet."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" className="text-muted-foreground">
            Snooze 15m
          </Button>
          <Button
            type="button"
            className="bg-foreground text-background hover:bg-foreground/90"
            onClick={onStartReload}
          >
            {demo.reloadStarted ? "Reload cooking" : "Start reload"}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <KpiStrip
        items={[
          {
            label: "Remaining on spits",
            value: `${projection.remainingKg.toFixed(1)} kg`,
            detail: "across 3 spits",
          },
          {
            label: "Shaved today",
            value: `${projection.shavedKg.toFixed(1)} kg`,
            detail: `~ ${projection.portions} portions - ${projection.demandLabel}`,
          },
          {
            label: "Est. stockout",
            value: projectedEmpty,
            detail: `${riskSpit.id.toLowerCase()} - ${riskSpit.protein.toLowerCase()}`,
          },
        ]}
        highlightLast
      />

      <SectionLabel className="mt-6">Spits - live</SectionLabel>
      <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.9fr)_minmax(240px,1fr)_minmax(220px,0.9fr)_minmax(220px,0.9fr)]">
        <StockoutSpitCard
          spit={stockoutSpit}
          onShave={() => onShave(riskSpit.id)}
        />
        <ReloadCard demo={demo} onStartReload={onStartReload} />
        {remainingSpits.map((spit) => (
          <StockoutSpitCard
            key={spit.id}
            spit={spit}
            onShave={() => onShave(spit.id)}
          />
        ))}
      </div>
    </TabletFrame>
  );
}

function GrillScreen({
  projection,
  activeState,
  onStateChange,
  onStartBatch,
  onAdvance,
  onRemove,
}: {
  projection: GrillProjection;
  activeState: GrillStateId;
  onStateChange: (state: GrillStateId) => void;
  onStartBatch: () => void;
  onAdvance: (seconds: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-3">
        <GrillDevice state={projection.state} />
        <div className="border-border bg-card flex flex-wrap items-center gap-2 border p-3">
          <Button type="button" onClick={onStartBatch}>
            <Play className="size-4" />
            Start batch
          </Button>
          <Button type="button" variant="outline" onClick={() => onAdvance(5)}>
            <TimerReset className="size-4" />
            +5s
          </Button>
          <Button
            type="button"
            variant={
              projection.state.tone === "safety" ? "destructive" : "outline"
            }
            onClick={onRemove}
          >
            {projection.state.tone === "safety"
              ? "Log corrective"
              : "Remove now"}
          </Button>
          <span className="text-muted-foreground ml-auto text-sm">
            {projection.running
              ? `${projection.elapsedSeconds}s on grill`
              : "timer idle"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="border-border bg-card border p-3">
          <SectionLabel>Grill sub-state</SectionLabel>
          <div className="mt-3 grid gap-2">
            {TAHINI_GRILL_STATES.map((state) => {
              const Icon = TAHINI_GRILL_ICON_BY_TONE[state.tone];
              const active = state.id === activeState;

              return (
                <button
                  key={state.id}
                  type="button"
                  onClick={() => onStateChange(state.id)}
                  aria-pressed={active}
                  className={cn(
                    "focus-visible:ring-ring grid min-h-20 grid-cols-[40px_1fr] items-center gap-3 border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/60 hover:text-foreground",
                  )}
                >
                  <span className="flex size-10 items-center justify-center border border-current">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="text-xs font-semibold tracking-[0.2em] uppercase">
                      {state.code}
                    </span>
                    <span className="block text-sm font-semibold">
                      {state.title}
                    </span>
                    <span className="block text-xs opacity-75">
                      {state.caption}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {TAHINI_GRILL_STATES.map((state) => (
            <GrillMiniCard
              key={state.id}
              state={state}
              active={state.id === activeState}
              onClick={() => onStateChange(state.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DeviceHeader({
  store,
  time,
  role = "GM",
  station,
}: {
  store: string;
  time: string;
  role?: string;
  station?: string;
}) {
  return (
    <div className="border-border bg-card grid gap-3 border p-3 text-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3 font-semibold">
        <span className="border-border border px-3 py-1 text-xs tracking-[0.18em] uppercase">
          Logo
        </span>
        <span className="truncate">{store}</span>
      </div>
      <span className="text-muted-foreground">{time}</span>
      <span className="border-border text-muted-foreground inline-flex w-fit items-center gap-2 border px-3 py-1 text-xs font-medium tracking-[0.16em] uppercase">
        {station ? null : <UserRound className="size-3" />}
        {station ?? role}
      </span>
    </div>
  );
}

function TabletFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-foreground bg-card border-2 p-4 shadow-xl shadow-slate-900/10 sm:p-6 dark:shadow-black/30",
        "rounded-[28px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground mb-3 text-xs font-semibold tracking-[0.24em] uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

function PrepLoadCard({ load }: { load: PrepLoad }) {
  return (
    <div
      className={cn(
        "bg-card flex min-h-64 flex-col items-center justify-between border-2 p-5 text-center",
        load.tentative
          ? "border-foreground/60 border-dashed"
          : "border-foreground",
      )}
    >
      <div>
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.18em] uppercase">
          {load.id}
        </p>
        <p className="mt-4 text-xl font-semibold">{load.protein}</p>
      </div>
      <SpitVisual
        protein={load.protein}
        tone={load.tentative ? "reload" : "neutral"}
      />
      <p className="text-5xl font-bold tracking-tight">
        {load.kg.toFixed(1)} kg
      </p>
    </div>
  );
}

function KpiStrip({
  items,
  highlightLast = false,
}: {
  items: Array<{ label: string; value: string; detail: string }>;
  highlightLast?: boolean;
}) {
  return (
    <div className="border-border bg-card mt-4 grid border md:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "border-border p-4 md:border-r md:last:border-r-0",
            highlightLast && index > 0
              ? "text-orange-600 dark:text-orange-300"
              : "text-foreground",
          )}
        >
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-bold">{item.value}</p>
          <p className="text-muted-foreground mt-1 text-sm">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function LiveSpitCard({
  spit,
  onAction,
}: {
  spit: LiveSpit;
  onAction: () => void;
}) {
  const styles = TONE_STYLES[spit.tone];

  return (
    <div
      className={cn(
        "bg-card flex min-h-[560px] flex-col border-2 p-4",
        styles.border,
      )}
    >
      <SpitCardHeader
        id={spit.id}
        protein={spit.protein}
        status={spit.status}
        tone={spit.tone}
      />
      <CameraPanel tone={spit.tone} protein={spit.protein} />

      <div className="border-border mt-4 grid gap-2 border-b pb-3 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
            Est. remaining
          </p>
          <p className={cn("text-4xl font-bold", styles.accent)}>
            {spit.remainingKg.toFixed(1)} kg
          </p>
        </div>
        <div className="text-muted-foreground text-sm sm:text-right">
          <p>loaded {spit.loadedKg.toFixed(1)} kg</p>
          <p>shaved {spit.shavedKg.toFixed(1)} kg</p>
        </div>
      </div>

      <MetricRow label="Outer color" value={spit.outerColor} />
      <MetricRow label="Last shave" value={spit.lastShave} />
      <SpeedBox
        rotation={spit.rotation}
        suggested={spit.suggested}
        note={spit.note}
        tone={spit.tone}
      />

      <button
        type="button"
        className={cn(
          "mt-auto min-h-12 border px-4 py-3 text-sm font-bold tracking-[0.16em] uppercase",
          styles.action,
        )}
        onClick={onAction}
      >
        {spit.action}
      </button>
    </div>
  );
}

function StockoutSpitCard({
  spit,
  onShave,
}: {
  spit: StockoutSpit;
  onShave: () => void;
}) {
  const styles = TONE_STYLES[spit.tone];

  return (
    <div
      className={cn(
        "bg-card flex min-h-[500px] flex-col border-2 p-4",
        styles.border,
      )}
    >
      <SpitCardHeader
        id={spit.id}
        protein={spit.protein}
        status={spit.status}
        tone={spit.tone}
      />
      <CameraPanel tone={spit.tone} protein={spit.protein} compact />
      <div className="border-border mt-3 border-b pb-3">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
          Remaining
        </p>
        <p className={cn("text-4xl font-bold", styles.accent)}>
          {spit.remainingKg.toFixed(1)} kg
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          loaded {spit.loadedKg.toFixed(1)} - shaved {spit.shavedKg.toFixed(1)}
        </p>
      </div>
      <MetricRow label="Sales pace" value={spit.salesPace} tone={spit.tone} />
      <MetricRow
        label="Empty est."
        value={spit.emptyEstimate}
        tone={spit.tone}
      />
      <MetricRow label="Last shave" value={spit.lastShave} />
      <Button
        type="button"
        variant={spit.tone === "critical" ? "default" : "outline"}
        className={cn(
          "mt-auto",
          spit.tone === "critical"
            ? "dark:text-background bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-400"
            : "border-border bg-card",
        )}
        onClick={onShave}
      >
        Shave 0.35 kg
      </Button>
    </div>
  );
}

function ReloadCard({
  demo,
  onStartReload,
}: {
  demo: TahiniDemoState;
  onStartReload: () => void;
}) {
  const reload = TAHINI_STOCKOUT.reload;
  const elapsed =
    demo.reloadStartedAtMinute == null
      ? 0
      : Math.max(0, demo.elapsedMinutes - demo.reloadStartedAtMinute);
  const progress = clamp(elapsed / RELOAD_LEAD_MINUTES, 0, 1);
  const readyAt =
    demo.reloadStartedAtMinute == null
      ? null
      : formatTimeOfDay(
          BASE_TIME_MINUTES + demo.reloadStartedAtMinute + RELOAD_LEAD_MINUTES,
        );

  return (
    <div className="border-foreground/70 bg-card flex min-h-[500px] flex-col border-2 border-dashed p-4 text-center">
      <div className="border-border flex items-center justify-between gap-3 border-b pb-3 text-left">
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.18em] uppercase">
          Reload
        </p>
        <p className="font-medium">{reload.protein}</p>
      </div>
      <Badge
        variant="outline"
        className="border-border mx-auto mt-5 px-3 py-1 tracking-[0.18em] uppercase"
      >
        Start new cone
      </Badge>
      <div className="mx-auto mt-6">
        <SpitVisual protein={reload.protein} tone="reload" />
      </div>
      <p className="text-muted-foreground mt-5 text-xs font-semibold tracking-[0.2em] uppercase">
        Load
      </p>
      <p className="text-5xl font-bold">{reload.loadKg.toFixed(1)} kg</p>
      <p className="text-muted-foreground mt-1 text-sm">
        {reload.layers} - sized to remaining demand
      </p>

      <div className="border-border mt-5 border-y py-4">
        <p className="text-muted-foreground/70 text-xs font-semibold tracking-[0.2em] uppercase">
          {demo.reloadStarted ? "Cooking progress" : "Start cooking by"}
        </p>
        <p className="text-muted-foreground mt-1 text-2xl font-bold">
          {demo.reloadStarted
            ? `${Math.round(progress * 100)}%`
            : reload.startCookingBy}
        </p>
        <p className="text-muted-foreground/70 mt-1 text-sm">
          {readyAt ? `ready by ${readyAt}` : reload.readyBy}
        </p>
        <div className="bg-muted mt-3 h-2 overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <p className="border-border text-muted-foreground mt-5 border p-3 text-sm italic">
        {reload.note}
      </p>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <Button variant="outline" className="border-border bg-card">
          Adjust
        </Button>
        <Button
          type="button"
          className="bg-foreground text-background hover:bg-foreground/90"
          onClick={onStartReload}
        >
          {demo.reloadStarted ? "Cooking" : "Start reload"}
        </Button>
      </div>
    </div>
  );
}

function GrillDevice({ state }: { state: GrillState }) {
  const styles = GRILL_TONE_STYLES[state.tone];

  return (
    <TabletFrame className="bg-card">
      <DeviceHeader store={TAHINI_PREP.store} time="12:34 PM" station="GRILL" />

      <div className={cn("mt-5 border-2 p-5 text-center", styles.panel)}>
        <Badge
          variant="outline"
          className={cn("px-4 py-1 tracking-[0.22em] uppercase", styles.badge)}
        >
          {state.status}
        </Badge>
        <GrillCamera state={state} />
        <p
          className={cn(
            "mt-6 font-bold tracking-tight uppercase",
            state.timeValue === "Ready" ? "text-4xl" : "text-8xl",
            styles.text,
          )}
        >
          {state.timeValue}
        </p>
        <p className="text-muted-foreground mt-2 text-xs font-semibold tracking-[0.28em] uppercase">
          {state.timeLabel}
        </p>
        <p className={cn("mt-6 text-xl font-bold", styles.text)}>
          {state.command}
        </p>
      </div>

      <div className="border-border bg-card mt-4 grid border md:grid-cols-3">
        <GrillStat
          label="Shift total"
          value={`${state.batches} batches`}
          detail="since 8 AM"
        />
        <GrillStat
          label="Avg time"
          value={state.averageTime}
          detail={state.averageDetail}
          tone={state.tone}
        />
        <GrillStat
          label="Violations"
          value={state.violations}
          detail={state.violationsDetail}
          tone={state.tone === "safety" ? "safety" : "neutral"}
        />
      </div>

      {state.note ? (
        <div className="mt-4 flex gap-3 border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{state.note}</p>
        </div>
      ) : null}
    </TabletFrame>
  );
}

function GrillMiniCard({
  state,
  active,
  onClick,
}: {
  state: GrillState;
  active: boolean;
  onClick: () => void;
}) {
  const styles = GRILL_TONE_STYLES[state.tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-card focus-visible:ring-ring min-h-28 border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        active ? "border-foreground shadow-sm" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
          {state.code}
        </p>
        <span className={cn("text-sm font-bold", styles.text)}>
          {state.timeValue}
        </span>
      </div>
      <p className="mt-2 font-semibold">{state.title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{state.caption}</p>
    </button>
  );
}

function GrillStat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "over" | "safety" | "ready";
}) {
  const toneClass =
    tone === "over"
      ? "text-orange-600 dark:text-orange-300"
      : tone === "safety"
        ? "text-red-800 dark:text-red-200"
        : "text-foreground";

  return (
    <div className="border-border p-4 md:border-r md:last:border-r-0">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
        {label}
      </p>
      <p className={cn("mt-2 text-2xl font-bold", toneClass)}>{value}</p>
      <p className="text-muted-foreground mt-1 text-sm">{detail}</p>
    </div>
  );
}

function SpitCardHeader({
  id,
  protein,
  status,
  tone,
}: {
  id: string;
  protein: string;
  status: string;
  tone: SpitTone;
}) {
  const styles = TONE_STYLES[tone];
  const isReady = tone === "ready";
  const isRisk = tone === "warning" || tone === "critical";

  return (
    <div>
      <div className="border-border flex items-center justify-between gap-3 border-b pb-3">
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.18em] uppercase">
          {id}
        </p>
        <p className="font-medium">{protein}</p>
      </div>
      <div className="mt-3 flex min-h-9 items-center justify-center">
        <Badge
          variant="outline"
          className={cn("px-3 py-1 tracking-[0.14em] uppercase", styles.badge)}
        >
          {isReady ? <CheckCircle2 className="size-3" /> : null}
          {isRisk ? <AlertTriangle className="size-3" /> : null}
          {!isReady && !isRisk ? (
            <Circle className="size-2 fill-current" />
          ) : null}
          {status}
        </Badge>
      </div>
    </div>
  );
}

function CameraPanel({
  tone,
  protein,
  compact = false,
}: {
  tone: SpitTone;
  protein: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border bg-muted/40 relative mt-3 flex items-center justify-center border border-dashed",
        compact ? "h-36" : "h-44",
      )}
    >
      <LiveCamBadge />
      <SpitVisual protein={protein} tone={tone} />
    </div>
  );
}

function GrillCamera({ state }: { state: GrillState }) {
  const unsafe = state.id === "safety";

  return (
    <div className="border-border bg-muted/40 relative mx-auto mt-8 flex h-44 max-w-md items-center justify-center border border-dashed">
      <LiveCamBadge />
      <div className="border-border relative h-16 w-56 border bg-[repeating-linear-gradient(0deg,#e5e7eb_0,#e5e7eb_9px,#cbd5e1_10px,#cbd5e1_11px)]">
        {state.id !== "idle" ? (
          <div
            className={cn(
              "absolute top-1/2 left-1/2 h-12 w-28 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2",
              state.tone === "over" || state.tone === "safety"
                ? "border-foreground bg-muted-foreground/80"
                : "border-muted-foreground bg-muted-foreground/45",
              unsafe ? "outline outline-2 outline-red-600" : "",
            )}
          />
        ) : null}
        {unsafe ? (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-800 uppercase dark:text-red-200">
            Removed at 19s
          </span>
        ) : null}
      </div>
    </div>
  );
}

function LiveCamBadge() {
  return (
    <span className="border-border bg-card text-muted-foreground absolute top-3 left-3 inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase">
      <Camera className="size-3" />
      Live cam
    </span>
  );
}

function SpitVisual({ protein, tone }: { protein: string; tone: SpitTone }) {
  const styles = TONE_STYLES[tone];
  const dark = tone === "warning";
  const hot = tone === "critical";

  return (
    <div className="relative flex h-32 w-16 items-center justify-center">
      <div className="bg-muted-foreground absolute h-full w-1" />
      <div className="bg-muted-foreground absolute top-0 size-2 rounded-full" />
      <div className="bg-muted-foreground absolute bottom-0 size-2 rounded-full" />
      <div
        aria-label={`${protein} cone`}
        className={cn(
          "border-muted-foreground relative h-20 w-9 border",
          styles.visual,
          dark ? "bg-muted-foreground/80 dark:bg-muted-foreground/60" : "",
          hot
            ? "border-orange-500 bg-orange-100 dark:border-orange-400 dark:bg-orange-950"
            : "",
          tone === "reload" || tone === "neutral"
            ? "bg-[repeating-linear-gradient(115deg,transparent_0,transparent_5px,#cbd5e1_6px,#cbd5e1_7px)]"
            : "",
        )}
      />
    </div>
  );
}

function MetricRow({
  label,
  value,
  large = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  large?: boolean;
  tone?: SpitTone;
}) {
  const accent =
    tone === "critical"
      ? "text-orange-600 dark:text-orange-300"
      : tone === "warning"
        ? "text-foreground"
        : "";

  return (
    <div className="border-border/60 flex min-h-10 items-center justify-between gap-3 border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right font-semibold",
          large ? "text-2xl" : "",
          accent,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SpeedBox({
  rotation,
  suggested,
  note,
  tone,
}: {
  rotation: RotationSpeed;
  suggested: RotationSpeed;
  note: string;
  tone: SpitTone;
}) {
  return (
    <div
      className={cn(
        "mt-4 border p-3 text-sm",
        tone === "ready"
          ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/40"
          : "border-border bg-muted/40",
      )}
    >
      <SpeedRow label="Rotating" speed={rotation} />
      <SpeedRow
        label="Suggested"
        speed={suggested}
        checked={rotation === suggested}
      />
      <p
        className={cn(
          "border-border mt-3 border-t pt-3 text-xs italic",
          tone === "ready"
            ? "text-orange-700 dark:text-orange-200"
            : "text-muted-foreground",
        )}
      >
        {note}
      </p>
    </div>
  );
}

function SpeedRow({
  label,
  speed,
  checked = false,
}: {
  label: string;
  speed: RotationSpeed;
  checked?: boolean;
}) {
  return (
    <div className="grid grid-cols-[82px_1fr_74px] items-center gap-2 py-1">
      <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
        {label}
      </span>
      <div className="flex gap-1">
        {(["LOW", "MEDIUM", "HIGH"] satisfies RotationSpeed[]).map((level) => (
          <span
            key={level}
            className={cn(
              "border-muted-foreground h-2.5 w-8 border",
              speedToIndex(speed) >= speedToIndex(level)
                ? "bg-foreground"
                : "bg-card",
            )}
          />
        ))}
      </div>
      <span className="inline-flex items-center justify-end gap-1 text-xs font-bold">
        {speed}
        {checked ? <CheckCircle2 className="size-3" /> : null}
      </span>
    </div>
  );
}

function speedToIndex(speed: RotationSpeed) {
  if (speed === "LOW") return 0;
  if (speed === "MEDIUM") return 1;
  return 2;
}

function OpenQuestions() {
  return (
    <div className="border-border bg-card hidden border p-5">
      <SectionLabel>
        Open questions / config decisions to confirm with Tahini&apos;s
      </SectionLabel>
      <div className="grid gap-2 md:grid-cols-2">
        {TAHINI_OPEN_QUESTIONS.map((question) => (
          <div
            key={question}
            className="text-muted-foreground flex gap-2 text-sm"
          >
            <span className="bg-muted/400 mt-2 size-1.5 shrink-0 rounded-full" />
            <p>{question}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
