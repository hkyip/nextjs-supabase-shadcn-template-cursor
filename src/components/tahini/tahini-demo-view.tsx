"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Circle,
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

export function TahiniDemoView() {
  const [activeScreen, setActiveScreen] = useState<TahiniScreenId>("prep");
  const [activeGrillState, setActiveGrillState] =
    useState<GrillStateId>("cooking");

  const selectedScreen = useMemo(
    () => TAHINI_SCREENS.find((screen) => screen.id === activeScreen),
    [activeScreen],
  );

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

        {activeScreen === "prep" ? <MorningPrepScreen /> : null}
        {activeScreen === "live" ? <LiveCookingScreen /> : null}
        {activeScreen === "stockout" ? <StockoutScreen /> : null}
        {activeScreen === "grill" ? (
          <GrillScreen
            activeState={activeGrillState}
            onStateChange={setActiveGrillState}
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

function MorningPrepScreen() {
  return (
    <TabletFrame>
      <DeviceHeader store={TAHINI_PREP.store} time={TAHINI_PREP.time} />

      <div className="mt-6">
        <SectionLabel>Today</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <div className="border-foreground bg-card border-2 p-6">
            <p className="text-muted-foreground text-lg">Cook</p>
            <p className="text-foreground mt-4 text-7xl font-bold tracking-tight">
              {TAHINI_PREP.today.cookKg.toFixed(1)} kg
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              {TAHINI_PREP.today.chickenKg.toFixed(1)} kg chicken -{" "}
              {TAHINI_PREP.today.gyroKg.toFixed(1)} kg gyro
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
          {TAHINI_PREP.loads.map((load) => (
            <PrepLoadCard key={load.id} load={load} />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" className="border-border bg-card">
          Adjust forecast
        </Button>
        <Button className="bg-foreground text-background hover:bg-foreground/90">
          Confirm &amp; start prep
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </TabletFrame>
  );
}

function LiveCookingScreen() {
  return (
    <TabletFrame>
      <DeviceHeader store={TAHINI_LIVE.store} time={TAHINI_LIVE.time} />
      <KpiStrip items={TAHINI_LIVE.kpis} />
      <SectionLabel className="mt-6">Spits - live</SectionLabel>
      <div className="grid gap-4 xl:grid-cols-3">
        {TAHINI_LIVE.spits.map((spit) => (
          <LiveSpitCard key={spit.id} spit={spit} />
        ))}
      </div>
    </TabletFrame>
  );
}

function StockoutScreen() {
  return (
    <TabletFrame>
      <DeviceHeader store={TAHINI_STOCKOUT.store} time={TAHINI_STOCKOUT.time} />

      <div className="border-foreground bg-card mt-5 flex flex-col gap-3 border-2 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <AlertTriangle className="mt-1 size-5 shrink-0 text-orange-600 dark:text-orange-300" />
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-orange-700 uppercase dark:text-orange-200">
              {TAHINI_STOCKOUT.alert.label}
            </p>
            <p className="text-muted-foreground mt-2 max-w-2xl text-base font-semibold">
              {TAHINI_STOCKOUT.alert.message}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" className="text-muted-foreground">
            Snooze 15m
          </Button>
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            Start reload
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <KpiStrip items={TAHINI_STOCKOUT.kpis} highlightLast />

      <SectionLabel className="mt-6">Spits - live</SectionLabel>
      <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.9fr)_minmax(240px,1fr)_minmax(220px,0.9fr)_minmax(220px,0.9fr)]">
        <StockoutSpitCard spit={TAHINI_STOCKOUT.depleting} />
        <ReloadCard />
        {TAHINI_STOCKOUT.remaining.map((spit) => (
          <StockoutSpitCard key={spit.id} spit={spit} />
        ))}
      </div>
    </TabletFrame>
  );
}

function GrillScreen({
  activeState,
  onStateChange,
}: {
  activeState: GrillStateId;
  onStateChange: (state: GrillStateId) => void;
}) {
  const selected =
    TAHINI_GRILL_STATES.find((state) => state.id === activeState) ??
    TAHINI_GRILL_STATES[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <GrillDevice state={selected} />

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

function LiveSpitCard({ spit }: { spit: LiveSpit }) {
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
      >
        {spit.action}
      </button>
    </div>
  );
}

function StockoutSpitCard({ spit }: { spit: StockoutSpit }) {
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
    </div>
  );
}

function ReloadCard() {
  const reload = TAHINI_STOCKOUT.reload;

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
          Start cooking by
        </p>
        <p className="text-muted-foreground mt-1 text-2xl font-bold">
          {reload.startCookingBy}
        </p>
        <p className="text-muted-foreground/70 mt-1 text-sm">
          {reload.readyBy}
        </p>
      </div>

      <p className="border-border text-muted-foreground mt-5 border p-3 text-sm italic">
        {reload.note}
      </p>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <Button variant="outline" className="border-border bg-card">
          Adjust
        </Button>
        <Button className="bg-foreground text-background hover:bg-foreground/90">
          Start reload
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
    <div className="border-border bg-card border p-5">
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
