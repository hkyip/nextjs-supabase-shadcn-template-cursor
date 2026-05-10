"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Clock3,
  LineChart,
  Mic2,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WingsScreen = "forecast" | "station";
type FryerStatus = "cooking" | "ready" | "idle";

type ForecastHour = {
  hour: string;
  wings: number;
  tone: "low" | "medium" | "peak";
};

type Daypart = {
  label: string;
  wings: number;
  peak?: boolean;
};

type Signal = {
  icon: ReactNode;
  label: string;
  when: string;
};

type FryerCardModel = {
  id: string;
  status: FryerStatus;
  wingsLabel: string;
  wingsValue: string;
  dimValue?: boolean;
  timer?: string;
  timerTone?: "normal" | "warning";
  cameraLabel?: string;
  primaryAction?: string;
  secondaryAction?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

const FORECAST_HOURS: ForecastHour[] = [
  { hour: "11a", wings: 60, tone: "low" },
  { hour: "12p", wings: 120, tone: "medium" },
  { hour: "1p", wings: 112, tone: "medium" },
  { hour: "2p", wings: 76, tone: "low" },
  { hour: "3p", wings: 62, tone: "low" },
  { hour: "4p", wings: 88, tone: "low" },
  { hour: "5p", wings: 168, tone: "medium" },
  { hour: "6p", wings: 265, tone: "peak" },
  { hour: "7p", wings: 310, tone: "peak" },
  { hour: "8p", wings: 285, tone: "peak" },
  { hour: "9p", wings: 190, tone: "medium" },
  { hour: "10p", wings: 96, tone: "low" },
];

const DAYPARTS: Daypart[] = [
  { label: "Lunch", wings: 240 },
  { label: "Afternoon", wings: 180 },
  { label: "Dinner + game", wings: 1180, peak: true },
  { label: "Late", wings: 240 },
];

const SIGNALS: Signal[] = [
  {
    icon: <CalendarDays className="size-3" />,
    label: "Friday baseline - 22% higher than mid-week avg",
    when: "all day",
  },
  {
    icon: <Trophy className="size-3" />,
    label: "NHL Playoffs Game 5 - historical surge +180 wings",
    when: "7:00 PM puck drop",
  },
  {
    icon: <Sun className="size-3" />,
    label: "Weather: 22 C and clear - patio + walk-in lift expected",
    when: "5:00 PM onward",
  },
  {
    icon: <LineChart className="size-3" />,
    label: "Online order pace this morning: tracking +12% vs forecast",
    when: "live",
  },
];

const YESTERDAY_RECAP = [
  { label: "Forecasted", value: "1,420", detail: "wings" },
  { label: "Dropped", value: "1,510", detail: "wings into fryer" },
  { label: "Sold", value: "1,468", detail: "wings - +3.4% vs forecast" },
  { label: "Forecast accuracy", value: "96.7%", detail: "within target band" },
];

const INITIAL_COOK_SECONDS = 4 * 60 + 32;
const FULL_COOK_SECONDS = 7 * 60 + 30;

export function WingsView() {
  const [activeScreen, setActiveScreen] = useState<WingsScreen>("forecast");
  const [stationSeconds, setStationSeconds] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fryerOnePulledAt, setFryerOnePulledAt] = useState<number | null>(null);
  const [fryerThreeDroppedAt, setFryerThreeDroppedAt] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!playing || activeScreen !== "station") return;

    const id = window.setInterval(() => {
      setStationSeconds((seconds) => Math.min(seconds + 1, 20 * 60));
    }, 1000);

    return () => window.clearInterval(id);
  }, [activeScreen, playing]);

  const fryerModels = useMemo(
    () =>
      getFryerModels({
        stationSeconds,
        fryerOnePulledAt,
        fryerThreeDroppedAt,
        onPullFryerOne: () => setFryerOnePulledAt(stationSeconds),
        onDropFryerThree: () => setFryerThreeDroppedAt(stationSeconds),
      }),
    [fryerOnePulledAt, fryerThreeDroppedAt, stationSeconds],
  );

  const waitingWings = Math.max(
    80,
    80 + Math.floor(stationSeconds / 18) * 4 - (fryerThreeDroppedAt ? 12 : 0),
  );
  const forecastFloor = fryerThreeDroppedAt ? 104 : 110;
  const forecastCeiling = fryerThreeDroppedAt ? 122 : 130;

  function openStation() {
    setActiveScreen("station");
    setPlaying(true);
  }

  function resetStation() {
    setStationSeconds(0);
    setFryerOnePulledAt(null);
    setFryerThreeDroppedAt(null);
    setPlaying(true);
  }

  return (
    <section className="bg-background text-foreground min-h-[calc(100vh-96px)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 lg:px-8">
        <DemoHeader
          activeScreen={activeScreen}
          onScreenChange={setActiveScreen}
        />

        {activeScreen === "forecast" ? (
          <ForecastBriefing onOpenStation={openStation} />
        ) : (
          <StationView
            fryerModels={fryerModels}
            waitingWings={waitingWings}
            forecastFloor={forecastFloor}
            forecastCeiling={forecastCeiling}
            stationSeconds={stationSeconds}
            playing={playing}
            onPlayingChange={setPlaying}
            onReset={resetStation}
          />
        )}
      </div>
    </section>
  );
}

function DemoHeader({
  activeScreen,
  onScreenChange,
}: {
  activeScreen: WingsScreen;
  onScreenChange: (screen: WingsScreen) => void;
}) {
  const screens = [
    {
      id: "forecast" as const,
      code: "A",
      label: "Today's outlook",
      detail: "Pre-service forecast",
      icon: LineChart,
    },
    {
      id: "station" as const,
      code: "B",
      label: "Live fryer station",
      detail: "Drop recommendations",
      icon: Clock3,
    },
  ];

  return (
    <div className="border-border bg-card text-card-foreground flex flex-col gap-4 border p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.24em] uppercase">
          Forkcast - wing kitchen intelligence
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          St. Louis Wings - Brentwood
        </h1>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {screens.map((screen) => (
          <button
            key={screen.id}
            type="button"
            onClick={() => onScreenChange(screen.id)}
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
              <span className="block text-sm font-semibold">
                {screen.label}
              </span>
              <span className="block text-xs opacity-75">{screen.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ForecastBriefing({ onOpenStation }: { onOpenStation: () => void }) {
  return (
    <div className="grid gap-3">
      <ScreenMeta
        code="Screen A - v2"
        title="Today's outlook - pre-service forecast"
        when="opened by GM/KM at start of shift"
      />

      <TabletFrame>
        <TabletHeader
          store="St. Louis Wings - Brentwood"
          time="Friday, May 8 - 9:42 AM"
          user="GM"
        />

        <div className="p-4 sm:p-6">
          <OutlookBanner />
          <ForecastPanel />
          <YesterdayRecap />

          <div className="border-border mt-5 flex flex-col gap-3 border-t border-dashed pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              Forecast last refreshed 9:38 AM - auto-refresh every 15 min
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline">
                View week ahead
              </Button>
              <Button type="button" onClick={onOpenStation}>
                Open station view
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </TabletFrame>
    </div>
  );
}

function StationView({
  fryerModels,
  waitingWings,
  forecastFloor,
  forecastCeiling,
  stationSeconds,
  playing,
  onPlayingChange,
  onReset,
}: {
  fryerModels: FryerCardModel[];
  waitingWings: number;
  forecastFloor: number;
  forecastCeiling: number;
  stationSeconds: number;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="grid gap-3">
      <ScreenMeta
        code="Screen B - v4"
        title="Live fryer station - drop recommendations"
        when="cook-facing tablet - auto-refresh every few seconds"
      />

      <TabletFrame>
        <TabletHeader
          store="St. Louis Wings - Brentwood"
          time={`Friday, May 8 - ${formatStationTime(stationSeconds)}`}
          user="Fry Station"
        />

        <div className="p-4 sm:p-6">
          <DemandStrip
            waitingWings={waitingWings}
            forecastFloor={forecastFloor}
            forecastCeiling={forecastCeiling}
          />

          <div className="grid gap-3 lg:grid-cols-4">
            {fryerModels.map((fryer) => (
              <FryerCard key={fryer.id} fryer={fryer} />
            ))}
          </div>

          <div className="border-border mt-5 flex flex-col gap-3 border-t border-dashed pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              Recommendations refresh every 30s - camera-confirmed drops
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onPlayingChange(!playing)}
              >
                {playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {playing ? "Pause" : "Run"}
              </Button>
              <Button type="button" variant="outline" onClick={onReset}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
              <Button type="button">View today&apos;s recap</Button>
            </div>
          </div>
        </div>
      </TabletFrame>
    </div>
  );
}

function OutlookBanner() {
  return (
    <div className="border-foreground bg-muted/40 mb-5 flex flex-col gap-3 border-2 p-4 sm:flex-row sm:items-center">
      <div>
        <SectionLabel>Today&apos;s outlook</SectionLabel>
        <p className="text-lg font-bold">
          Heavy night expected - Friday + NHL Playoffs Game 5 (puck drop 7:00
          PM)
        </p>
      </div>
      <Badge className="sm:ml-auto" variant="default">
        Proactive mode
      </Badge>
    </div>
  );
}

function ForecastPanel() {
  return (
    <div className="border-border bg-card border">
      <PanelHeader
        title="Forecast - wings by hour"
        detail="continuously updated - all stations - open to close"
      />

      <div className="p-4">
        <div className="border-border grid gap-4 border-b border-dashed pb-4 md:grid-cols-3">
          <SummaryStat
            label="Predicted today"
            value="1,840"
            detail="wings - +24% vs avg Friday"
          />
          <SummaryStat
            label="Predicted peak hr"
            value="7-8 PM"
            detail="~310 wings - 41 lbs"
          />
          <SummaryStat
            label="Forecast confidence"
            value="1,780-1,920"
            detail="90% band - n=14 prior samples"
          />
        </div>

        <ForecastChart />
        <DaypartStrip />
        <SignalList />
      </div>
    </div>
  );
}

function ForecastChart() {
  const maxWings = 350;

  return (
    <div className="mt-5">
      <div className="grid grid-cols-[36px_1fr] gap-2">
        <div className="text-muted-foreground flex h-52 flex-col justify-between text-right text-[10px] tabular-nums">
          <span>350</span>
          <span>260</span>
          <span>175</span>
          <span>90</span>
          <span>0</span>
        </div>
        <div className="border-muted-foreground/70 bg-background relative flex h-52 items-end gap-1 border-b border-l px-1">
          {[25, 50, 75, 100].map((tick) => (
            <span
              key={tick}
              className="border-border absolute right-0 left-0 border-t border-dashed"
              style={{ bottom: `${tick}%` }}
            />
          ))}
          {FORECAST_HOURS.map((item) => (
            <div
              key={item.hour}
              className="relative z-10 flex h-full flex-1 items-end justify-center"
            >
              <div
                className={cn(
                  "border-muted-foreground/80 w-[72%] border transition-all",
                  item.tone === "peak"
                    ? "bg-foreground"
                    : item.tone === "medium"
                      ? "bg-muted-foreground/65"
                      : "bg-muted",
                )}
                style={{ height: `${(item.wings / maxWings) * 100}%` }}
              >
                {item.wings === 310 ? (
                  <span className="text-muted-foreground absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold">
                    310
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1 grid grid-cols-[36px_1fr] gap-2">
        <span />
        <div className="grid grid-cols-12 px-1">
          {FORECAST_HOURS.map((item) => (
            <span
              key={item.hour}
              className="text-muted-foreground text-center text-[10px]"
            >
              {item.hour}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DaypartStrip() {
  return (
    <div className="border-border mt-4 grid border text-center sm:grid-cols-4">
      {DAYPARTS.map((part) => (
        <div
          key={part.label}
          className={cn(
            "border-border p-3 sm:border-r sm:last:border-r-0",
            part.peak ? "bg-muted" : "bg-card",
          )}
        >
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
            {part.label}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {part.wings.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function SignalList() {
  return (
    <div className="border-muted-foreground/70 bg-muted/30 mt-4 border border-dashed p-3">
      <SectionLabel>Signals driving today&apos;s forecast</SectionLabel>
      <div className="grid gap-2">
        {SIGNALS.map((signal) => (
          <div
            key={signal.label}
            className="grid gap-2 text-sm sm:grid-cols-[24px_1fr_auto] sm:items-center"
          >
            <span className="border-border bg-card text-muted-foreground flex size-6 items-center justify-center border">
              {signal.icon}
            </span>
            <span>{signal.label}</span>
            <span className="text-muted-foreground text-xs">{signal.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function YesterdayRecap() {
  return (
    <div className="border-border bg-card mt-5 border">
      <PanelHeader title="Yesterday - Thursday May 7" detail="See full recap" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        {YESTERDAY_RECAP.map((item) => (
          <div
            key={item.label}
            className="border-border p-4 sm:border-r sm:last:border-r-0"
          >
            <SectionLabel>{item.label}</SectionLabel>
            <p className="text-2xl font-bold tabular-nums">{item.value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemandStrip({
  waitingWings,
  forecastFloor,
  forecastCeiling,
}: {
  waitingWings: number;
  forecastFloor: number;
  forecastCeiling: number;
}) {
  return (
    <div className="border-foreground mb-4 grid border-2 md:grid-cols-[1fr_1fr_240px]">
      <DemandCell
        label="Waiting to serve"
        value={`${waitingWings} wings`}
        detail="5 open tickets on KDS"
      />
      <DemandCell
        label="Forecast next 15m"
        value={`${forecastFloor}-${forecastCeiling}`}
        detail="wings expected"
      />
      <div className="bg-foreground text-background p-4">
        <p className="text-background/70 text-[10px] font-semibold tracking-[0.18em] uppercase">
          Mode
        </p>
        <p className="mt-1 text-lg font-bold tracking-[0.12em] uppercase">
          Proactive
        </p>
        <p className="text-background/70 mt-1 text-xs">
          adding anticipatory drops
        </p>
      </div>
    </div>
  );
}

function DemandCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-border bg-card border-b p-4 md:border-r md:border-b-0">
      <SectionLabel>{label}</SectionLabel>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
    </div>
  );
}

function FryerCard({ fryer }: { fryer: FryerCardModel }) {
  return (
    <div className="border-border bg-card flex min-h-[280px] flex-col border">
      <div className="border-border bg-muted/40 flex items-center justify-between gap-3 border-b p-3">
        <p className="font-semibold tracking-[0.08em]">{fryer.id}</p>
        <span
          className={cn(
            "border px-2 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase",
            fryer.status === "cooking"
              ? "border-muted-foreground bg-muted-foreground text-background"
              : fryer.status === "ready"
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground",
          )}
        >
          {fryer.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <p
          className={cn(
            "text-7xl leading-none font-bold tracking-tight tabular-nums",
            fryer.dimValue ? "text-muted-foreground/35" : "text-foreground",
          )}
        >
          {fryer.wingsValue}
        </p>
        <p className="text-muted-foreground mt-2 text-[10px] font-semibold tracking-[0.18em] uppercase">
          {fryer.wingsLabel}
        </p>

        {fryer.timer ? (
          <p
            className={cn(
              "mt-3 font-mono text-2xl font-bold tracking-[0.08em] tabular-nums",
              fryer.timerTone === "warning"
                ? "bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                : "text-foreground",
            )}
          >
            {fryer.timer}
          </p>
        ) : null}

        {fryer.cameraLabel ? <CameraTrust label={fryer.cameraLabel} /> : null}

        {fryer.primaryAction ? (
          <Button
            type="button"
            className="mt-4 w-full tracking-[0.14em] uppercase"
            onClick={fryer.onPrimary}
          >
            <Play className="size-4" />
            {fryer.primaryAction}
          </Button>
        ) : null}

        {fryer.secondaryAction ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full tracking-[0.12em] uppercase"
            onClick={fryer.onSecondary}
          >
            {fryer.secondaryAction}
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] tracking-[0.1em]">
              <Mic2 className="size-3" />
              voice
            </span>
          </Button>
        ) : null}

        {!fryer.primaryAction &&
        !fryer.secondaryAction &&
        !fryer.cameraLabel ? (
          <p className="text-muted-foreground/50 mt-4 tracking-[0.4em]">...</p>
        ) : null}
      </div>
    </div>
  );
}

function CameraTrust({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground mt-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
      <Camera className="size-3" />
      <span className="bg-foreground size-1.5 rounded-full" />
      {label}
    </p>
  );
}

function TabletFrame({ children }: { children: ReactNode }) {
  return (
    <div className="border-muted-foreground bg-card overflow-hidden border-2 shadow-xl shadow-slate-900/10 dark:shadow-black/30">
      {children}
    </div>
  );
}

function TabletHeader({
  store,
  time,
  user,
}: {
  store: string;
  time: string;
  user: string;
}) {
  return (
    <div className="border-border bg-muted/40 grid gap-2 border-b px-4 py-3 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
      <span className="font-semibold">[ Logo ] {store}</span>
      <span className="text-muted-foreground md:text-center">{time}</span>
      <span className="text-muted-foreground md:text-right">[ {user} ]</span>
    </div>
  );
}

function ScreenMeta({
  code,
  title,
  when,
}: {
  code: string;
  title: string;
  when: string;
}) {
  return (
    <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span className="border-border bg-card w-fit border px-2 py-1 text-xs font-semibold tracking-[0.18em] uppercase">
        {code}
      </span>
      <span className="text-foreground font-semibold tracking-[0.08em] uppercase">
        {title}
      </span>
      <span className="text-xs">{when}</span>
    </div>
  );
}

function PanelHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-border bg-muted/30 flex flex-col gap-1 border-b px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
      <p className="text-sm font-semibold tracking-[0.08em] uppercase">
        {title}
      </p>
      <p className="text-muted-foreground text-xs">{detail}</p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-[0.18em] uppercase">
      {children}
    </p>
  );
}

function getFryerModels({
  stationSeconds,
  fryerOnePulledAt,
  fryerThreeDroppedAt,
  onPullFryerOne,
  onDropFryerThree,
}: {
  stationSeconds: number;
  fryerOnePulledAt: number | null;
  fryerThreeDroppedAt: number | null;
  onPullFryerOne: () => void;
  onDropFryerThree: () => void;
}): FryerCardModel[] {
  const fryerOneRemaining = Math.max(0, INITIAL_COOK_SECONDS - stationSeconds);
  const fryerOneReady = fryerOnePulledAt != null || fryerOneRemaining === 0;
  const fryerTwoServed = Math.floor(stationSeconds / 22);
  const fryerTwoWings = Math.max(0, 18 - fryerTwoServed);
  const fryerThreeElapsed =
    fryerThreeDroppedAt == null ? 0 : stationSeconds - fryerThreeDroppedAt;
  const fryerThreeRemaining = Math.max(
    0,
    FULL_COOK_SECONDS - fryerThreeElapsed,
  );
  const fryerThreeReady =
    fryerThreeDroppedAt != null && fryerThreeRemaining === 0;

  return [
    {
      id: "FRYER 1",
      status: fryerOneReady ? "ready" : "cooking",
      wingsValue: "30",
      wingsLabel: fryerOneReady ? "wings on rest" : "wings cooking",
      timer: fryerOneReady ? undefined : formatDuration(fryerOneRemaining),
      timerTone: fryerOneRemaining <= 60 ? "warning" : "normal",
      cameraLabel: fryerOneReady ? "Sauce & serve" : "Camera - 7:30 target",
      secondaryAction: fryerOneReady ? undefined : "Pull now",
      onSecondary: onPullFryerOne,
    },
    {
      id: "FRYER 2",
      status: "ready",
      wingsValue: String(fryerTwoWings),
      wingsLabel: "wings on rest",
      cameraLabel: "Sauce & serve",
    },
    {
      id: "FRYER 3",
      status:
        fryerThreeDroppedAt == null
          ? "idle"
          : fryerThreeReady
            ? "ready"
            : "cooking",
      wingsValue: "24",
      wingsLabel:
        fryerThreeDroppedAt == null
          ? "wings to drop"
          : fryerThreeReady
            ? "wings on rest"
            : "wings cooking",
      timer:
        fryerThreeDroppedAt == null || fryerThreeReady
          ? undefined
          : formatDuration(fryerThreeRemaining),
      timerTone:
        fryerThreeDroppedAt != null && fryerThreeRemaining <= 60
          ? "warning"
          : "normal",
      cameraLabel:
        fryerThreeDroppedAt == null
          ? undefined
          : fryerThreeReady
            ? "Sauce & serve"
            : "Camera - 7:30 target",
      primaryAction: fryerThreeDroppedAt == null ? "Drop now" : undefined,
      onPrimary: onDropFryerThree,
    },
    {
      id: "FRYER 4",
      status: "idle",
      wingsValue: "-",
      wingsLabel: "no drop needed",
      dimValue: true,
    },
  ];
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatStationTime(stationSeconds: number) {
  const totalMinutes = 18 * 60 + 47 + Math.floor(stationSeconds / 60);
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}
