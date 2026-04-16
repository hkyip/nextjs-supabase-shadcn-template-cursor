"use client";

import { Camera, Hand, Mic } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CookingBatch } from "@/lib/mock-data";
import { MENU_ITEMS } from "@/lib/mock-data";
import { formatTimer } from "@/lib/format-time";
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          In Progress
        </h2>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {batches.length} {batches.length === 1 ? "batch" : "batches"}
        </Badge>
      </div>

      {batches.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No items cooking
        </div>
      )}

      {batches.map((batch) => {
        const mi = MENU_ITEMS.find((m) => m.id === batch.menuItemId)!;
        const remaining = mi.cookTimeSeconds - batch.startedAtSeconds;
        const progress = Math.min(
          100,
          Math.round((batch.startedAtSeconds / mi.cookTimeSeconds) * 100),
        );
        const Icon = METHOD_ICON[batch.captureMethod];
        const almostDone = remaining <= 30 && remaining > 0;
        const done = remaining <= 0;

        return (
          <Card
            key={batch.id}
            className={cn(
              "border-2 transition-colors",
              done
                ? "border-green-500/50 bg-green-500/5"
                : almostDone
                  ? "border-yellow-500/50 bg-yellow-500/5"
                  : "border-blue-500/30 bg-blue-500/5",
            )}
          >
            <CardContent className="space-y-3 p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold lg:text-lg">{mi.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {batch.quantity} {mi.batchMeasurement}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {METHOD_LABEL[batch.captureMethod]}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p
                  className={cn(
                    "font-mono text-4xl font-black tabular-nums leading-none lg:text-5xl",
                    done
                      ? "text-green-600 dark:text-green-400"
                      : almostDone
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "",
                  )}
                >
                  {done ? "DONE" : formatTimer(remaining)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {done ? "Ready for hold" : "remaining"}
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
