"use client";

import { Camera, Hand, Mic } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CaptureMethod, WhatToCookItem } from "@/lib/mock-data";
import { MENU_ITEMS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const URGENCY_STYLES = {
  normal: {
    border: "border-border",
    bg: "",
    label: "On Track",
    badgeClass:
      "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  },
  soon: {
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/5",
    label: "Cook Soon",
    badgeClass:
      "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  urgent: {
    border: "border-red-500/50",
    bg: "bg-red-500/5",
    label: "Cook Now",
    badgeClass:
      "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  },
} as const;

type Props = {
  items: WhatToCookItem[];
  onStartCooking: (
    menuItemId: string,
    quantity: number,
    method: CaptureMethod,
  ) => void;
};

export function WhatToCookColumn({ items, onStartCooking }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-background sticky top-0 z-20 -mx-1 space-y-1 border-b px-1 py-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
            What to Cook
          </h2>
          <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
            {items.filter((i) => i.cookQuantity > 0).length} items
          </Badge>
        </div>
      </div>

      {items.map((item) => {
        const mi = MENU_ITEMS.find((m) => m.id === item.menuItemId)!;
        const style = URGENCY_STYLES[item.urgency];

        return (
          <Card
            key={item.menuItemId}
            className={cn("border-2", style.border, style.bg)}
          >
            <CardContent className="space-y-3 p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold lg:text-lg">{mi.name}</p>
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase tabular-nums">
                    Cook time · {Math.round(mi.cookTimeSeconds / 60)} min
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
                <p className="text-6xl leading-none font-black tracking-tight tabular-nums lg:text-7xl">
                  {item.cookQuantity}
                </p>
                <p className="text-muted-foreground mt-2 text-xs tracking-wider uppercase">
                  {mi.batchMeasurement} · {item.batchCount}{" "}
                  {item.batchCount === 1 ? "batch" : "batches"}
                </p>
              </div>

              <div className="bg-background/60 flex flex-wrap justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] leading-tight">
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-900 tabular-nums dark:text-emerald-100">
                  Base {Math.round(item.forecastedDemand)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  ×{item.velocityFactor.toFixed(2)} ×{item.eventFactor.toFixed(2)}{" "}
                  ×{item.operatorFactor.toFixed(2)}
                </span>
                <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-semibold text-violet-900 tabular-nums dark:text-violet-100">
                  Adj {Math.round(item.adjustedExpectedDemand)}
                </span>
              </div>
              <div className="bg-background/60 grid grid-cols-3 gap-1 rounded-md border p-2 text-center text-[11px] leading-tight sm:grid-cols-6">
                <div>
                  <div className="font-semibold tabular-nums">
                    {Math.round(item.adjustedExpectedDemand)}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Plan 30m
                  </div>
                </div>
                <div className="text-muted-foreground">
                  <div className="text-foreground font-semibold tabular-nums">
                    {item.queuedUnits}
                  </div>
                  <div className="text-[10px]">Queue</div>
                </div>
                <div className="text-muted-foreground">
                  <div className="text-foreground font-semibold tabular-nums">
                    {item.laneBacklogUnits}
                  </div>
                  <div className="text-[10px]">Lane</div>
                </div>
                <div className="text-muted-foreground">
                  <div className="text-foreground font-semibold tabular-nums">
                    −{item.currentHoldInventory}
                  </div>
                  <div className="text-[10px]">Hold</div>
                </div>
                <div className="text-muted-foreground">
                  <div className="text-foreground font-semibold tabular-nums">
                    −{item.currentlyCooking}
                  </div>
                  <div className="text-[10px]">Cooking</div>
                </div>
                <div className="text-muted-foreground">
                  <div className="text-foreground font-semibold tabular-nums">
                    {item.soldSinceLastCook}
                  </div>
                  <div className="text-[10px]">Sold</div>
                </div>
              </div>
              {(item.queuedUnits > 0 || item.laneBacklogUnits > 0) && (
                <p className="text-muted-foreground text-center text-[10px] leading-tight">
                  Cook target includes queue and lane on top of the adjusted plan
                  (baseline × factors).
                </p>
              )}

              {item.cookQuantity > 0 && (
                <div className="flex gap-2">
                  <Button
                    className="min-h-[44px] flex-1 gap-1.5"
                    onClick={() =>
                      onStartCooking(item.menuItemId, mi.batchSize, "camera")
                    }
                  >
                    <Camera className="size-4" />
                    Camera
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-[44px] flex-1 gap-1.5"
                    onClick={() =>
                      onStartCooking(item.menuItemId, mi.batchSize, "voice")
                    }
                  >
                    <Mic className="size-4" />
                    Voice
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[44px] flex-1 gap-1.5"
                    onClick={() =>
                      onStartCooking(item.menuItemId, mi.batchSize, "manual")
                    }
                  >
                    <Hand className="size-4" />
                    Manual
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
