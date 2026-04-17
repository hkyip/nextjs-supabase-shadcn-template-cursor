"use client";

import { Camera, Hand, Mic } from "lucide-react";
import { useEffect, useState } from "react";

import {
  CaptureMethodHintRow,
  formatWallClockMs,
} from "@/components/production/capture-method-affordance";
import { TimerDisplay } from "@/components/production/timer-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CookingBatch } from "@/lib/mock-data";
import { MENU_ITEMS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const METHOD_ICON = {
  camera: Camera,
  voice: Mic,
  manual: Hand,
} as const;

const METHOD_LABEL = {
  camera: "Camera",
  voice: "Voice",
  manual: "Manual",
} as const;

type Props = {
  batches: CookingBatch[];
};

export function CookingColumn({ batches }: Props) {
  const [wallClockMs, setWallClockMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setWallClockMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-background sticky top-0 z-20 -mx-1 flex items-center justify-between border-b px-1 py-2">
        <h2 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
          In Progress
        </h2>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {batches.length} {batches.length === 1 ? "batch" : "batches"}
        </Badge>
      </div>

      {batches.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No items cooking
        </div>
      )}

      {batches.map((batch) => {
        const mi = MENU_ITEMS.find((m) => m.id === batch.menuItemId)!;
        const elapsed = Math.max(0, batch.startedAtSeconds);
        const progress = Math.min(
          100,
          Math.round((batch.startedAtSeconds / mi.cookTimeSeconds) * 100),
        );
        const Icon = METHOD_ICON[batch.captureMethod];
        const done = batch.startedAtSeconds >= mi.cookTimeSeconds;
        const almostDone =
          !done && batch.startedAtSeconds >= mi.cookTimeSeconds - 30;
        const late =
          !done &&
          wallClockMs > batch.targetReadyAtMs &&
          batch.targetReadyAtMs > 0;

        return (
          <Card
            key={batch.id}
            className={cn(
              "border-2 transition-colors",
              late
                ? "border-red-500/60 bg-red-500/5"
                : done
                  ? "border-green-500/50 bg-green-500/5"
                  : almostDone
                    ? "border-yellow-500/50 bg-yellow-500/5"
                    : "border-blue-500/30 bg-blue-500/5",
            )}
          >
            <CardContent className="space-y-3 p-4 lg:p-5">
              <div className="flex items-start justify-between gap-2">
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
                  <p className="text-muted-foreground mt-2 text-[11px] tabular-nums">
                    <span className="text-foreground font-semibold">
                      Ready by
                    </span>{" "}
                    {formatWallClockMs(batch.targetReadyAtMs)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {late && (
                    <Badge
                      variant="outline"
                      className="border-red-500/50 bg-red-500/10 text-xs text-red-800 dark:text-red-200"
                    >
                      Late
                    </Badge>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Icon className="text-muted-foreground size-4" />
                    <span className="text-muted-foreground text-xs">
                      {METHOD_LABEL[batch.captureMethod]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                {done ? (
                  <p className="text-5xl leading-none font-black tracking-tight text-green-600 lg:text-6xl dark:text-green-400">
                    DONE
                  </p>
                ) : (
                  <TimerDisplay
                    seconds={elapsed}
                    className={cn(
                      "text-6xl lg:text-7xl",
                      almostDone && "text-yellow-600 dark:text-yellow-400",
                    )}
                  />
                )}
                <p className="text-muted-foreground mt-2 text-xs tracking-wider uppercase">
                  {done ? "Ready for hold" : "elapsed"}
                </p>
              </div>

              <Progress
                value={progress}
                className={cn(
                  "h-2",
                  done && "[&>div]:bg-green-500",
                  almostDone && !done && "[&>div]:bg-yellow-500",
                  !almostDone && !done && "[&>div]:bg-blue-500",
                )}
              />

              <CaptureMethodHintRow />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
