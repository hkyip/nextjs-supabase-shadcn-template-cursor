"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { HeldBatch } from "@/lib/mock-data";
import { MENU_ITEMS } from "@/lib/mock-data";
import { formatTimer } from "@/lib/format-time";
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
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  },
  yellow: {
    border: "border-yellow-500/40",
    bg: "bg-yellow-500/5",
    text: "text-yellow-600 dark:text-yellow-400",
    bar: "[&>div]:bg-yellow-500",
    label: "Use Soon",
    badgeClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  red: {
    border: "border-red-500/50",
    bg: "bg-red-500/5",
    text: "text-red-600 dark:text-red-400",
    bar: "[&>div]:bg-red-500",
    label: "Expiring",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  },
} as const;

type Props = {
  batches: HeldBatch[];
};

export function HeldColumn({ batches }: Props) {
  const totalUnits = batches.reduce((sum, b) => sum + b.quantity, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Being Held
        </h2>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {totalUnits} units
        </Badge>
      </div>

      {batches.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
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
            className={cn("border-2 transition-colors", style.border, style.bg)}
          >
            <CardContent className="space-y-2 p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold lg:text-lg">{mi.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {batch.quantity} {mi.batchMeasurement}
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-xs", style.badgeClass)}>
                  {style.label}
                </Badge>
              </div>

              <div className="text-center">
                <p
                  className={cn(
                    "font-mono text-4xl font-black tabular-nums leading-none lg:text-5xl",
                    style.text,
                  )}
                >
                  {formatTimer(Math.max(0, remaining))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">remaining</p>
              </div>

              <Progress value={progress} className={cn("h-2", style.bar)} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
