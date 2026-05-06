"use client";

import { Timer, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  avgSeconds: number;
  /** target — the PRD references "12-min" Wingstop benchmark, default 12 min */
  targetSeconds?: number;
}

export function ServiceTimeKpi({ avgSeconds, targetSeconds = 12 * 60 }: Props) {
  const ratio = avgSeconds / targetSeconds;
  const onTarget = avgSeconds <= targetSeconds;
  const mm = Math.floor(avgSeconds / 60);
  const ss = avgSeconds % 60;
  const tone = onTarget
    ? { ring: "border-emerald-300/60", text: "text-emerald-700 dark:text-emerald-300", trend: TrendingDown, badge: "bg-emerald-600 text-white hover:bg-emerald-700", label: "ON TARGET" }
    : { ring: "border-rose-400/70", text: "text-rose-700 dark:text-rose-300", trend: TrendingUp, badge: "bg-rose-600 text-white hover:bg-rose-700", label: "OVER" };
  const Icon = tone.trend;

  return (
    <Card className={cn("border", tone.ring)}>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Timer className="size-4 text-sky-600" aria-hidden />
            Service time · order → table
          </CardTitle>
          <Badge className={cn("text-[10px]", tone.badge)}>{tone.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-baseline gap-3">
          <p className={cn("font-mono text-3xl font-extrabold leading-none tabular-nums", tone.text)}>
            {mm}:{ss.toString().padStart(2, "0")}
          </p>
          <Icon className={cn("size-4", tone.text)} aria-hidden />
          <p className="text-[11px] text-muted-foreground">
            avg last 30 orders · target {Math.floor(targetSeconds / 60)}:00
          </p>
        </div>

        {/* Tiny target gauge */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full",
              onTarget ? "bg-emerald-500" : "bg-rose-500",
            )}
            style={{ width: `${Math.min(140, ratio * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {onTarget
            ? "Service is on track — table flips supported."
            : `Currently ${Math.round((ratio - 1) * 100)}% over target — fewer turns per peak hour.`}
        </p>
      </CardContent>
    </Card>
  );
}
