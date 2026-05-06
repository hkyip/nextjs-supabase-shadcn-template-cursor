"use client";

import { Activity, Tv2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ForecastResult } from "@/lib/wings/forecast";

interface Props {
  forecast: ForecastResult;
  gameEndingAtMs: number | null;
  nowMs: number;
}

export function DemandPulseCard({ forecast, gameEndingAtMs, nowMs }: Props) {
  const max = Math.max(
    forecast.capacityLbsPerBucket,
    ...forecast.buckets.map((b) => b.projectedLbs),
  );

  const minutesUntilGame =
    gameEndingAtMs != null
      ? Math.max(0, Math.round((gameEndingAtMs - nowMs) / 60_000))
      : null;
  const gameInWindow = minutesUntilGame != null && minutesUntilGame <= 15;

  return (
    <Card className={cn(forecast.anyBucketOverCapacity ? "border-rose-400/70" : "border-border")}>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="size-4 text-emerald-600" aria-hidden />
            Next 15 min · demand pulse
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {gameInWindow ? (
              <Badge className="bg-violet-600 text-[10px] text-white hover:bg-violet-700">
                <Tv2 className="mr-1 size-3" /> game in {minutesUntilGame}m
              </Badge>
            ) : null}
            <Badge variant="outline" className="font-mono text-[10px]">
              total {forecast.total15Lbs} lb
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              cap {forecast.capacityLbsPerBucket} lb / 5m
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-3 gap-3">
          {forecast.buckets.map((b) => {
            const over = b.projectedLbs > forecast.capacityLbsPerBucket;
            const heightPct = max > 0 ? (b.projectedLbs / max) * 100 : 0;
            const capPct =
              max > 0 ? (forecast.capacityLbsPerBucket / max) * 100 : 0;

            return (
              <div key={b.startMinAhead} className="space-y-1.5">
                <div className="relative h-20 overflow-hidden rounded-md border bg-muted/40">
                  {/* Capacity reference line */}
                  <div
                    className="absolute inset-x-0 z-10 border-t border-dashed border-amber-500/70"
                    style={{ bottom: `${capPct}%` }}
                  />
                  {/* Demand bar */}
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 transition-[height]",
                      over
                        ? "bg-gradient-to-t from-rose-500 to-rose-400"
                        : "bg-gradient-to-t from-emerald-500 to-emerald-400",
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-[10px] font-mono text-muted-foreground">
                    +{b.startMinAhead}m
                  </p>
                  <p
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      over ? "text-rose-600" : "text-foreground",
                    )}
                  >
                    {b.projectedLbs}
                    <span className="text-[10px] text-muted-foreground"> lb</span>
                  </p>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground">
                  {b.label}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
