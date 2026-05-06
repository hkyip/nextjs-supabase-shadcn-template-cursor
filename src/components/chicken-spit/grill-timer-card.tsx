"use client";

import { Flame, Play, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GrillTimer } from "@/lib/chicken-spit/types";

interface Props {
  timer: GrillTimer;
  minSeconds: number;
  onStart: () => void;
  onPlate: () => void;
  onReset: () => void;
}

export function GrillTimerCard({
  timer,
  minSeconds,
  onStart,
  onPlate,
  onReset,
}: Props) {
  const elapsed = Math.max(0, timer.elapsedSeconds);
  const remaining = Math.max(0, minSeconds - elapsed);
  const overshoot = Math.max(0, elapsed - minSeconds);
  const isCounting = timer.status === "searing";
  const isOvershoot = timer.status === "overshoot";

  // SVG circle
  const R = 38;
  const C = 2 * Math.PI * R;
  const progress = isCounting
    ? Math.min(1, elapsed / minSeconds)
    : isOvershoot
      ? 1
      : 0;
  const dash = C * progress;

  const tone = isOvershoot
    ? { ring: "stroke-rose-600", text: "text-rose-700 dark:text-rose-300", border: "border-rose-400/70", badge: "bg-rose-600 text-white hover:bg-rose-700" }
    : isCounting && remaining <= 5
      ? { ring: "stroke-amber-500", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300/70", badge: "bg-amber-500 text-white hover:bg-amber-600" }
      : isCounting
        ? { ring: "stroke-emerald-500", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300/60", badge: "bg-emerald-600 text-white hover:bg-emerald-700" }
        : { ring: "stroke-zinc-400", text: "text-zinc-700 dark:text-zinc-300", border: "border-border", badge: "bg-zinc-500 text-white hover:bg-zinc-600" };

  const label = isOvershoot ? "OVERSHOOT" : isCounting ? "SEARING" : "EMPTY";

  return (
    <Card className={cn("border", tone.border)}>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="size-4 text-orange-600" aria-hidden />
            Grill · 30s sear
          </CardTitle>
          <Badge className={cn("text-[10px] uppercase tracking-wider", tone.badge)}>{label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-4">
          {/* Compact circle */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" className="stroke-muted" />
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                className={cn("transition-[stroke-dashoffset]", tone.ring)}
                strokeDasharray={`${dash} ${C}`}
              />
            </svg>
            <div className="text-center">
              <p className={cn("font-mono text-2xl font-extrabold tabular-nums leading-none", tone.text)}>
                {isOvershoot ? `+${overshoot.toString().padStart(2, "0")}` : remaining.toString().padStart(2, "0")}
              </p>
              <p className="text-[8px] uppercase tracking-widest text-muted-foreground">
                {isOvershoot ? "over" : "sec"}
              </p>
            </div>
          </div>

          {/* Status + actions */}
          <div className="flex flex-1 flex-col gap-2">
            <p className={cn("text-xs leading-snug", tone.text)}>
              {isOvershoot
                ? `On grill ${elapsed}s — past ${minSeconds}s line. Plate now.`
                : isCounting && remaining <= 5
                  ? "Sear nearly done — get ready to plate."
                  : isCounting
                    ? `Searing · ${elapsed}s elapsed.`
                    : `Place chicken, then start. Min ${minSeconds}s sear (food safety).`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {!isCounting && !isOvershoot ? (
                <Button type="button" size="sm" className="h-7 text-xs" onClick={onStart}>
                  <Play className="mr-1 size-3" /> Start sear
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    "h-7 text-xs text-white",
                    isOvershoot ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700",
                  )}
                  onClick={onPlate}
                >
                  <Square className="mr-1 size-3" /> Plate
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={onReset}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
