"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Camera,
  ClipboardList,
  Clock,
  CloudRain,
  Gauge,
  Hand,
  Mic,
  Plus,
  Radio,
  Signal,
  Timer,
  SignalZero,
  TrendingDown,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DEMO_TIME_SCALES,
  type DemoTimeScale,
} from "@/lib/demo-clock";
import {
  DEMO_SCRIPTS,
  type DemoScript,
  type DemoScriptKind,
  type RemoteCommand,
} from "@/lib/demo-commands";
import { DEMO_ALERTS, MENU_ITEMS, STORE } from "@/lib/mock-data";
import { statusLabel, useRemoteChannel } from "@/lib/realtime";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";

type SentEntry =
  | {
      id: string;
      variant: "script";
      script: DemoScript;
      at: number;
      ok: boolean;
    }
  | {
      id: string;
      variant: "serving";
      title: string;
      detail: string;
      at: number;
      ok: boolean;
    }
  | {
      id: string;
      variant: "forecast-alert";
      title: string;
      detail: string;
      at: number;
      ok: boolean;
    };

/** Overrides Button’s default `whitespace-nowrap` so multi-line labels stay inside the card. */
const ACTION_BTN =
  "w-full min-w-0 max-w-full gap-3 whitespace-normal rounded-xl border py-3.5 pl-3.5 pr-3 text-left shadow-sm transition-[box-shadow,transform,background-color] duration-200 h-auto min-h-[3.5rem] items-start justify-start hover:shadow-md active:scale-[0.99]";

const FORECAST_ALERT_META: Record<
  (typeof DEMO_ALERTS)[number]["type"],
  { icon: typeof CloudRain; shell: string; iconWrap: string }
> = {
  weather: {
    icon: CloudRain,
    shell:
      "border-blue-500/30 bg-blue-500/[0.07] hover:bg-blue-500/[0.12] dark:border-blue-400/25 dark:bg-blue-500/10",
    iconWrap:
      "bg-blue-500/15 text-blue-700 shadow-inner shadow-blue-900/5 dark:text-blue-300",
  },
  event: {
    icon: Trophy,
    shell:
      "border-orange-500/30 bg-orange-500/[0.07] hover:bg-orange-500/[0.12] dark:border-orange-400/25 dark:bg-orange-500/10",
    iconWrap:
      "bg-orange-500/15 text-orange-800 shadow-inner shadow-orange-900/5 dark:text-orange-200",
  },
  demand: {
    icon: TrendingDown,
    shell:
      "border-purple-500/30 bg-purple-500/[0.07] hover:bg-purple-500/[0.12] dark:border-purple-400/25 dark:bg-purple-500/10",
    iconWrap:
      "bg-purple-500/15 text-purple-800 shadow-inner shadow-purple-900/5 dark:text-purple-200",
  },
};

const KIND_META: Record<
  DemoScriptKind,
  {
    label: string;
    icon: typeof Camera;
    shell: string;
    iconWrap: string;
  }
> = {
  voice: {
    label: "Voice",
    icon: Mic,
    shell:
      "border-sky-500/30 bg-sky-500/[0.06] hover:bg-sky-500/[0.11] dark:border-sky-400/25 dark:bg-sky-950/40",
    iconWrap: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  },
  camera: {
    label: "Camera",
    icon: Camera,
    shell:
      "border-violet-500/30 bg-violet-500/[0.06] hover:bg-violet-500/[0.11] dark:border-violet-400/25 dark:bg-violet-950/40",
    iconWrap: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
  },
  manual: {
    label: "Manual",
    icon: Hand,
    shell:
      "border-border bg-muted/40 hover:bg-muted/70 dark:bg-muted/25",
    iconWrap: "bg-muted text-foreground/80 ring-1 ring-border/60",
  },
};

const SERVE_SHELL =
  "border-cyan-500/30 bg-cyan-500/[0.06] hover:bg-cyan-500/[0.11] dark:border-cyan-400/20 dark:bg-cyan-950/35";
const SERVE_ICON_WRAP =
  "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200";

function groupScripts(): Record<DemoScriptKind, DemoScript[]> {
  const groups: Record<DemoScriptKind, DemoScript[]> = {
    voice: [],
    camera: [],
    manual: [],
  };
  for (const s of DEMO_SCRIPTS) groups[s.kind].push(s);
  return groups;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function RemoteSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="border-b border-border/60 bg-gradient-to-br from-muted/50 via-muted/25 to-transparent px-4 py-3.5 sm:px-5">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/90 text-foreground shadow-sm ring-1 ring-border/60">
            <Icon className="size-[18px] opacity-90" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[0.8125rem] font-semibold leading-none tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-1.5 text-pretty text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-2.5 p-4 sm:p-5">{children}</div>
    </section>
  );
}

type Props = {
  room: string;
};

export function RemoteConsole({ room }: Props) {
  const { status, publish } = useRemoteChannel({ room });
  const [sent, setSent] = useState<SentEntry[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const groups = groupScripts();

  const dispatchScript = useCallback(
    async (script: DemoScript) => {
      setPendingId(script.id);
      if (script.kind === "voice") {
        speak(script.command.narration, { lang: "en-US" });
      }
      const ok = await publish(script.command as RemoteCommand);
      setPendingId(null);
      setSent((prev): SentEntry[] =>
        [
          {
            id: `${script.id}-${Date.now()}`,
            variant: "script" as const,
            script,
            at: Date.now(),
            ok,
          },
          ...prev,
        ].slice(0, 12),
      );
    },
    [publish],
  );

  const dispatchServingOrder = useCallback(
    async (menuItemId: string, name: string) => {
      const key = `serve:${menuItemId}`;
      setPendingId(key);
      const command: RemoteCommand = {
        type: "served",
        menuItemId,
        quantity: 1,
        method: "manual",
        narration: `Remote serving order — 1× ${name}`,
        orderSource: "remote",
      };
      const ok = await publish(command);
      setPendingId(null);
      setSent((prev): SentEntry[] =>
        [
          {
            id: `${key}-${Date.now()}`,
            variant: "serving" as const,
            title: "Serving order",
            detail: `1× ${name} → Incoming on production`,
            at: Date.now(),
            ok,
          },
          ...prev,
        ].slice(0, 12),
      );
    },
    [publish],
  );

  const dispatchSetDemoTime = useCallback(
    async (hour: number, minute: number, label: string) => {
      const key = `time:${hour}:${minute}`;
      setPendingId(key);
      const command: RemoteCommand = {
        type: "set-demo-time",
        hour,
        minute,
        method: "manual",
        narration: `Remote — demo clock → ${label}`,
      };
      const ok = await publish(command);
      setPendingId(null);
      setSent((prev): SentEntry[] =>
        [
          {
            id: `${key}-${Date.now()}`,
            variant: "serving" as const,
            title: "Demo store time",
            detail: `${label} · local ${hour}:${minute.toString().padStart(2, "0")}`,
            at: Date.now(),
            ok,
          },
          ...prev,
        ].slice(0, 12),
      );
    },
    [publish],
  );

  const dispatchSetDemoNow = useCallback(async () => {
    const key = "time:now";
    setPendingId(key);
    const command: RemoteCommand = {
      type: "set-demo-now",
      method: "manual",
      narration: `Remote — demo clock → NOW (${STORE.timezone})`,
    };
    const ok = await publish(command);
    setPendingId(null);
    setSent((prev): SentEntry[] =>
      [
        {
          id: `${key}-${Date.now()}`,
          variant: "serving" as const,
          title: "Demo store time",
          detail: `NOW · same instant as store wall (${STORE.timezone})`,
          at: Date.now(),
          ok,
        },
        ...prev,
      ].slice(0, 12),
    );
  }, [publish]);

  const dispatchSetDemoTimeScale = useCallback(
    async (timeScale: DemoTimeScale) => {
      const key = `scale:${timeScale}`;
      setPendingId(key);
      const command: RemoteCommand = {
        type: "set-demo-time-scale",
        timeScale,
        method: "manual",
        narration: `Remote — timeline ${timeScale}× wall`,
      };
      const ok = await publish(command);
      setPendingId(null);
      setSent((prev): SentEntry[] =>
        [
          {
            id: `${key}-${Date.now()}`,
            variant: "serving" as const,
            title: "Timeline speed",
            detail: `${timeScale}× wall clock`,
            at: Date.now(),
            ok,
          },
          ...prev,
        ].slice(0, 12),
      );
    },
    [publish],
  );

  const dispatchForecastAlert = useCallback(
    async (alert: (typeof DEMO_ALERTS)[number]) => {
      const key = `alert:${alert.id}`;
      setPendingId(key);
      const command: RemoteCommand = {
        type: "dynamic-alert",
        alertId: alert.id,
        method: "manual",
        narration: `Remote — ${alert.title}`,
      };
      const ok = await publish(command);
      setPendingId(null);
      setSent((prev): SentEntry[] =>
        [
          {
            id: `${key}-${Date.now()}`,
            variant: "forecast-alert" as const,
            title: alert.title,
            detail: `${alert.trigger} ${alert.impact}`.trim(),
            at: Date.now(),
            ok,
          },
          ...prev,
        ].slice(0, 12),
      );
    },
    [publish],
  );

  const disabled = status === "disabled";

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-gradient-to-b from-muted/60 via-background to-muted/30 dark:from-muted/20 dark:via-background dark:to-muted/10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(var(--primary)/0.18),transparent)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_-30%,hsl(var(--primary)/0.22),transparent)]"
        aria-hidden
      />

      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-6 pb-[max(3.5rem,env(safe-area-inset-bottom,0px))] pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:max-w-2xl sm:px-5 md:max-w-3xl lg:max-w-4xl xl:max-w-6xl xl:px-8"
      >
        <header className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Forkcast
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Remote
              </h1>
              <p className="max-w-[20rem] text-pretty text-sm leading-snug text-muted-foreground sm:max-w-none lg:text-base lg:leading-relaxed">
                Drive the production board from a phone or second browser — same
                room as{" "}
                <span className="font-mono text-foreground/80">/production</span>.
              </p>
            </div>
            <StatusPill className="w-fit shrink-0 sm:ml-auto" status={status} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-sm dark:bg-card/80 dark:ring-white/[0.06]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Active room
              </span>
              <span className="truncate font-mono text-sm font-semibold tracking-tight text-foreground">
                {room}
              </span>
            </div>
            <Separator className="my-3 bg-border/70" />
            <p className="text-pretty text-[11px] leading-relaxed text-muted-foreground">
              Open{" "}
              <span className="break-all rounded bg-muted/80 px-1 py-0.5 font-mono text-[10px] text-foreground/90">
                /production?room={room}
              </span>{" "}
              on the line display.
            </p>
          </div>

          {disabled && (
            <div className="rounded-2xl border border-amber-500/35 bg-amber-500/[0.08] p-4 text-xs leading-relaxed text-amber-950 shadow-sm dark:text-amber-50">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Realtime is off
              </p>
              <p className="mt-1.5 text-[11px] text-amber-900/90 dark:text-amber-100/90">
                Buttons stay visible for the demo, but commands will not reach
                production until{" "}
                <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="font-mono">
                  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                </span>{" "}
                are configured.
              </p>
            </div>
          )}
        </header>

        <main className="flex flex-1 flex-col gap-5">
          <div className="flex min-w-0 flex-col gap-5 xl:grid xl:grid-cols-2 xl:gap-6 xl:items-start">
            <div className="flex min-w-0 flex-col gap-5">
              <RemoteSection
                icon={ClipboardList}
                title="Serving orders"
                description="Queue one item at a time into Incoming orders (same behavior as /pos). The line fulfills from hot hold with Camera, Voice, or Manual."
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {MENU_ITEMS.map((mi) => (
                    <Button
                      key={mi.id}
                      variant="outline"
                      className={cn(ACTION_BTN, SERVE_SHELL, "text-foreground")}
                      disabled={disabled || pendingId === `serve:${mi.id}`}
                      onClick={() => void dispatchServingOrder(mi.id, mi.name)}
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-inner",
                          SERVE_ICON_WRAP,
                        )}
                      >
                        <Plus className="size-5" strokeWidth={2.25} />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="block text-sm font-semibold leading-tight">
                          1× {mi.name}
                        </span>
                        <span className="block break-words text-[11px] font-normal leading-snug text-muted-foreground">
                          Remote queue · <span className="font-mono">{mi.id}</span>
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </RemoteSection>

              <RemoteSection
                icon={Bell}
                title="Forecast alerts"
                description="Push coaching banners to production when you want each scenario — no automatic timers."
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {DEMO_ALERTS.map((alert) => {
                    const meta = FORECAST_ALERT_META[alert.type];
                    const Icon = meta.icon;
                    return (
                      <Button
                        key={alert.id}
                        variant="outline"
                        className={cn(ACTION_BTN, meta.shell, "text-foreground")}
                        disabled={disabled || pendingId === `alert:${alert.id}`}
                        onClick={() => void dispatchForecastAlert(alert)}
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            meta.iconWrap,
                          )}
                        >
                          <Icon className="size-5" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="block text-sm font-semibold leading-tight">
                            {alert.title}
                          </span>
                          <span className="block text-pretty text-[11px] font-normal leading-relaxed text-muted-foreground">
                            {alert.trigger} {alert.impact}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </RemoteSection>

              <RemoteSection
                icon={Clock}
                title="Demo store time"
                description="Jump the store clock and set how fast demo time runs vs wall clock (same session as /fry-kitchen). Does not change your device clock."
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className={cn(
                      ACTION_BTN,
                      "border-teal-500/30 bg-teal-500/[0.06] hover:bg-teal-500/[0.11] dark:border-teal-400/20 dark:bg-teal-950/35",
                      "text-foreground sm:col-span-2",
                    )}
                    disabled={disabled || pendingId === "time:now"}
                    onClick={() => void dispatchSetDemoNow()}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-800 shadow-inner dark:text-teal-200">
                      <Timer className="size-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1 text-left">
                      <span className="block text-sm font-semibold leading-tight">
                        NOW
                      </span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {`Match real store wall time (${STORE.timezone})`}
                      </span>
                    </div>
                  </Button>
                  {(
                    [
                      { h: 8, m: 0, label: "Breakfast" },
                      { h: 12, m: 0, label: "Lunch peak" },
                      { h: 17, m: 30, label: "Dinner" },
                      { h: 21, m: 0, label: "Late night" },
                    ] as const
                  ).map((p) => (
                    <Button
                      key={`${p.h}-${p.m}`}
                      variant="outline"
                      className={cn(
                        ACTION_BTN,
                        "border-teal-500/30 bg-teal-500/[0.06] hover:bg-teal-500/[0.11] dark:border-teal-400/20 dark:bg-teal-950/35",
                        "text-foreground",
                      )}
                      disabled={disabled || pendingId === `time:${p.h}:${p.m}`}
                      onClick={() =>
                        void dispatchSetDemoTime(p.h, p.m, p.label)
                      }
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-800 shadow-inner dark:text-teal-200">
                        <Clock className="size-5" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1 text-left">
                        <span className="block text-sm font-semibold leading-tight">
                          {p.label}
                        </span>
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          Local {p.h}:{p.m.toString().padStart(2, "0")}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="border-t border-border/60 pt-4 space-y-2.5">
                  <p className="text-[11px] font-medium leading-snug text-muted-foreground">
                    Timeline vs wall clock (cook timers, forecast buckets)
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {DEMO_TIME_SCALES.map((scale) => (
                      <Button
                        key={scale}
                        variant="outline"
                        className={cn(
                          ACTION_BTN,
                          "border-amber-500/30 bg-amber-500/[0.06] hover:bg-amber-500/[0.11] dark:border-amber-400/20 dark:bg-amber-950/35",
                          "text-foreground",
                        )}
                        disabled={disabled || pendingId === `scale:${scale}`}
                        onClick={() => void dispatchSetDemoTimeScale(scale)}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-900 shadow-inner dark:text-amber-200">
                          <Gauge className="size-5" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1 text-left">
                          <span className="block text-sm font-semibold leading-tight">
                            {scale}× wall
                          </span>
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            {scale === 1
                              ? "Real-time pacing (default)"
                              : "Fast demo"}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </RemoteSection>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              {(Object.keys(groups) as DemoScriptKind[]).map((kind) => {
                const meta = KIND_META[kind];
                const scripts = groups[kind];
                if (scripts.length === 0) return null;
                const SectionIcon = meta.icon;
                return (
                  <RemoteSection
                    key={kind}
                    icon={SectionIcon}
                    title={meta.label}
                    description={
                      kind === "voice"
                        ? "Simulate chef narration — speaks on this device and sends the matching command."
                        : kind === "camera"
                          ? "Simulate vision detections on the production timeline."
                          : "Simulate explicit taps from the command deck."
                    }
                  >
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {scripts.map((script) => {
                        const BtnIcon = meta.icon;
                        return (
                          <Button
                            key={script.id}
                            variant="outline"
                            className={cn(
                              ACTION_BTN,
                              meta.shell,
                              "text-foreground",
                            )}
                            disabled={disabled || pendingId === script.id}
                            onClick={() => void dispatchScript(script)}
                          >
                            <span
                              className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                                meta.iconWrap,
                              )}
                            >
                              <BtnIcon className="size-5" strokeWidth={2} />
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <span className="block text-sm font-semibold leading-tight">
                                {script.label}
                              </span>
                              <span className="block break-all text-[11px] font-normal leading-snug text-muted-foreground sm:break-words">
                                {commandSummary(script.command as RemoteCommand)}
                              </span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </RemoteSection>
                );
              })}
            </div>
          </div>

          <RemoteSection
            icon={Radio}
            title="Activity"
            description="Recent broadcasts to this room (newest first)."
          >
            {sent.length === 0 ? (
              <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
                Nothing sent yet. Use the controls above — each tap appears here
                after the broadcast returns.
              </p>
            ) : (
              <ul className="space-y-2">
                {sent.map((entry) => (
                  <SentRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </RemoteSection>
        </main>

        <footer className="border-t border-border/60 pt-6 text-center text-[11px] text-muted-foreground">
          Forkcast V0 · Remote control
        </footer>
      </div>
    </div>
  );
}

function SentRow({ entry }: { entry: SentEntry }) {
  if (entry.variant === "forecast-alert") {
    return (
      <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-muted/25 p-3 sm:flex-row sm:items-start sm:gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-700 dark:text-violet-300">
          <Bell className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <span className="block text-[13px] font-medium leading-snug">
            {entry.title}
          </span>
          <span className="block text-pretty text-[11px] leading-relaxed text-muted-foreground">
            {entry.detail}
          </span>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
          <span className="tabular-nums text-[11px] text-muted-foreground">
            {formatTime(entry.at)}
          </span>
          <Badge
            variant={entry.ok ? "secondary" : "destructive"}
            className="h-5 text-[10px] font-medium"
          >
            {entry.ok ? "Sent" : "Failed"}
          </Badge>
        </div>
      </li>
    );
  }
  if (entry.variant === "serving") {
    return (
      <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-muted/25 p-3 sm:flex-row sm:items-start sm:gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/12 text-cyan-800 dark:text-cyan-200">
          <ClipboardList className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <span className="block text-[13px] font-medium leading-snug">
            {entry.title}
          </span>
          <span className="block text-pretty text-[11px] leading-relaxed text-muted-foreground">
            {entry.detail}
          </span>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
          <span className="tabular-nums text-[11px] text-muted-foreground">
            {formatTime(entry.at)}
          </span>
          <Badge
            variant={entry.ok ? "secondary" : "destructive"}
            className="h-5 text-[10px] font-medium"
          >
            {entry.ok ? "Sent" : "Failed"}
          </Badge>
        </div>
      </li>
    );
  }
  const meta = KIND_META[entry.script.kind];
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-muted/25 p-3 sm:flex-row sm:items-start sm:gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          meta.iconWrap,
        )}
      >
        <meta.icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium leading-snug">
          {entry.script.label}
        </span>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
        <span className="tabular-nums text-[11px] text-muted-foreground">
          {formatTime(entry.at)}
        </span>
        <Badge
          variant={entry.ok ? "secondary" : "destructive"}
          className="h-5 text-[10px] font-medium"
        >
          {entry.ok ? "Sent" : "Failed"}
        </Badge>
      </div>
    </li>
  );
}

function StatusPill({
  status,
  className,
}: {
  status: ReturnType<typeof useRemoteChannel>["status"];
  className?: string;
}) {
  const ok = status === "connected";
  const dead = status === "error" || status === "disabled";
  const Icon = ok ? Signal : dead ? SignalZero : Signal;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm",
        ok &&
          "border-emerald-500/45 bg-emerald-500/[0.12] text-emerald-900 dark:text-emerald-100",
        status === "connecting" &&
          "border-amber-500/45 bg-amber-500/[0.12] text-amber-900 dark:text-amber-100",
        status === "error" &&
          "border-red-500/45 bg-red-500/[0.12] text-red-900 dark:text-red-100",
        status === "disabled" &&
          "border-muted-foreground/35 bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon
        className={cn(
          "size-3.5",
          status === "connecting" && "animate-pulse",
          ok && "animate-pulse",
        )}
      />
      {statusLabel(status)}
    </span>
  );
}

function commandSummary(command: RemoteCommand): string {
  switch (command.type) {
    case "cook-start":
      return `cook-start · ${command.menuItemId} × ${command.quantity}`;
    case "hot-hold":
      return `hot-hold · ${command.menuItemId} × ${command.quantity}`;
    case "served":
      if (command.orderSource === "pos") {
        return `served (POS queue) · ${command.menuItemId} × ${command.quantity}`;
      }
      if (command.orderSource === "remote") {
        return `served (remote queue) · ${command.menuItemId} × ${command.quantity}`;
      }
      return `served · ${command.menuItemId} × ${command.quantity}`;
    case "disposal":
      return command.menuItemId
        ? `disposal · ${command.menuItemId}`
        : "disposal · any";
    case "dynamic-alert":
      return `forecast alert · ${command.alertId}`;
    case "set-demo-time":
      return `set-demo-time · ${command.hour}:${command.minute.toString().padStart(2, "0")} local`;
    case "set-demo-time-scale":
      return `set-demo-time-scale · ${command.timeScale}× wall`;
    case "set-demo-now":
      return "set-demo-now · wall time";
  }
}
