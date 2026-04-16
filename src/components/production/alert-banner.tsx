"use client";

import { useEffect, useState } from "react";
import { CloudRain, TrendingDown, Trophy, X } from "lucide-react";

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

export function AlertBanner() {
  const [visibleAlerts, setVisibleAlerts] = useState<DynamicAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const alert of DEMO_ALERTS) {
      const timer = setTimeout(() => {
        setVisibleAlerts((prev) => {
          if (prev.some((a) => a.id === alert.id)) return prev;
          return [...prev, alert];
        });
      }, alert.delayMs);
      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  const activeAlerts = visibleAlerts.filter((a) => !dismissed.has(a.id));

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeAlerts.map((alert) => {
        const style = ALERT_STYLE[alert.type];
        const Icon = ALERT_ICON[alert.icon as keyof typeof ALERT_ICON];

        return (
          <div
            key={alert.id}
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
