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
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  },
  soon: {
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/5",
    label: "Cook Soon",
    badgeClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  urgent: {
    border: "border-red-500/50",
    bg: "bg-red-500/5",
    label: "Cook Now",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
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
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          What to Cook
        </h2>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {items.filter((i) => i.cookQuantity > 0).length} items
        </Badge>
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
                  <p className="text-xs text-muted-foreground">
                    Cook time: {Math.round(mi.cookTimeSeconds / 60)}min
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-xs", style.badgeClass)}>
                  {style.label}
                </Badge>
              </div>

              <div className="text-center">
                <p className="text-5xl font-black tabular-nums leading-none lg:text-6xl">
                  {item.cookQuantity}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mi.batchMeasurement} / {item.batchCount}{" "}
                  {item.batchCount === 1 ? "batch" : "batches"}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Forecast: {item.forecastedDemand}</span>
                <span>Hold: {item.currentHoldInventory}</span>
                <span>Cooking: {item.currentlyCooking}</span>
              </div>

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
