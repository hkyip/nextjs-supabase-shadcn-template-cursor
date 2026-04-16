"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CloudRain,
  TrendingDown,
  Trophy,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DynamicAlert } from "@/lib/mock-data";
import { DEMO_ALERTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const ALERT_ICON = {
  "cloud-rain": CloudRain,
  trophy: Trophy,
  "trending-down": TrendingDown,
} as const;

const ALERT_STYLE = {
  weather: {
    border: "border-blue-500/50",
    bg: "bg-blue-500/10",
    icon: "text-blue-500",
    title: "text-blue-700 dark:text-blue-300",
  },
  event: {
    border: "border-orange-500/50",
    bg: "bg-orange-500/10",
    icon: "text-orange-500",
    title: "text-orange-700 dark:text-orange-300",
  },
  demand: {
    border: "border-purple-500/50",
    bg: "bg-purple-500/10",
    icon: "text-purple-500",
    title: "text-purple-700 dark:text-purple-300",
  },
} as const;

/** Short two-tone chime synthesized with the Web Audio API — no external asset needed. */
function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const tones: Array<[number, number]> = [
      [880, now],
      [1320, now + 0.14],
    ];
    for (const [freq, start] of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    }
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Audio is a progressive enhancement; swallow environment errors silently.
  }
}

export function AlertBanner() {
  const [visibleAlerts, setVisibleAlerts] = useState<DynamicAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [soundOn, setSoundOn] = useState(false);
  const soundOnRef = useRef(soundOn);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const alert of DEMO_ALERTS) {
      const timer = setTimeout(() => {
        setVisibleAlerts((prev) => {
          if (prev.some((a) => a.id === alert.id)) return prev;
          if (soundOnRef.current) playChime();
          return [...prev, alert];
        });
      }, alert.delayMs);
      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  const activeAlerts = visibleAlerts.filter((a) => !dismissed.has(a.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            if (next) playChime();
          }}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute alert chime" : "Enable alert chime"}
        >
          {soundOn ? (
            <Bell className="size-3.5" />
          ) : (
            <BellOff className="size-3.5" />
          )}
          Alert sound: {soundOn ? "on" : "off"}
        </Button>
      </div>

      {activeAlerts.map((alert) => {
        const style = ALERT_STYLE[alert.type];
        const Icon = ALERT_ICON[alert.icon as keyof typeof ALERT_ICON];

        return (
          <div
            key={alert.id}
            role="alert"
            className={cn(
              "relative rounded-lg border-2 p-4 animate-in fade-in slide-in-from-top-2 duration-300",
              style.border,
              style.bg,
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 size-7 p-0"
              onClick={() =>
                setDismissed((prev) => new Set([...prev, alert.id]))
              }
              aria-label="Dismiss alert"
            >
              <X className="size-4" />
            </Button>

            <div className="flex gap-3 pr-8">
              {Icon && <Icon className={cn("mt-0.5 size-5 shrink-0", style.icon)} />}
              <div className="space-y-1">
                <p className={cn("text-sm font-bold uppercase tracking-wider", style.title)}>
                  {alert.title}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">{alert.trigger}</span>{" "}
                  {alert.impact}
                </p>
                <p className="text-sm font-medium">{alert.action}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
