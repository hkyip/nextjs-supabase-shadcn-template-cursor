"use client";

import { useKeyedQuantityPulse } from "@/components/production/use-keyed-quantity-pulse";
import { TimerDisplay } from "@/components/production/timer-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { HeldBatch } from "@/lib/mock-data";
import { MENU_ITEMS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function holdUrgency(remaining: number, total: number) {
  const pct = remaining / total;
  if (pct > 0.5) return "green" as const;
  if (pct > 0.2) return "yellow" as const;
  return "red" as const;
}

const URGENCY_STYLE = {
  green: {
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    text: "text-green-600 dark:text-green-400",
    bar: "[&>div]:bg-green-500",
    label: "Fresh",
    badgeClass:
      "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  },
  yellow: {
    border: "border-yellow-500/40",
    bg: "bg-yellow-500/5",
    text: "text-yellow-600 dark:text-yellow-400",
    bar: "[&>div]:bg-yellow-500",
    label: "Use Soon",
    badgeClass:
      "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  red: {
    border: "border-red-500/50",
    bg: "bg-red-500/5",
    text: "text-red-600 dark:text-red-400",
    bar: "[&>div]:bg-red-500",
    label: "Expiring",
    badgeClass:
      "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  },
} as const;

type Props = {
  batches: HeldBatch[];
};

export function HeldColumn({ batches }: Props) {
  const totalUnits = batches.reduce((sum, b) => sum + b.quantity, 0);
  const pulsing = useKeyedQuantityPulse(batches, {
    pulseOnAdd: false,
    pulseOnDecrease: true,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-background sticky top-0 z-20 -mx-1 flex items-center justify-between border-b px-1 py-2">
        <h2 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
          Being Held
        </h2>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {totalUnits} units
        </Badge>
      </div>

      {batches.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No items in hold
        </div>
      )}

      {batches.map((batch) => {
        const mi = MENU_ITEMS.find((m) => m.id === batch.menuItemId)!;
        const remaining = batch.holdTimeSeconds - batch.heldAtSeconds;
        const urgency = holdUrgency(remaining, batch.holdTimeSeconds);
        const style = URGENCY_STYLE[urgency];
        const progress = Math.min(
          100,
          Math.round((batch.heldAtSeconds / batch.holdTimeSeconds) * 100),
        );

        return (
          <Card
            key={batch.id}
            className={cn(
              "border-2 transition-colors transition-shadow",
              style.border,
              style.bg,
              pulsing.has(batch.id) && "animate-production-card-pulse",
            )}
          >
            <CardContent className="space-y-2 p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold lg:text-lg">{mi.name}</p>
                  <p className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-lg leading-none font-black tabular-nums">
                      {batch.quantity}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                      {mi.batchMeasurement}
                    </span>
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs", style.badgeClass)}
                >
                  {style.label}
                </Badge>
              </div>

              <div className="text-center">
                <TimerDisplay
                  seconds={Math.max(0, remaining)}
                  className={cn("text-6xl lg:text-7xl", style.text)}
                />
                <p className="text-muted-foreground mt-2 text-xs tracking-wider uppercase">
                  remaining
                </p>
              </div>

              <Progress value={progress} className={cn("h-2", style.bar)} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
