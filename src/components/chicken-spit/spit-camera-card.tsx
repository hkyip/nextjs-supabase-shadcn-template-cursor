"use client";

import { Eye, FastForward, Scissors } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TimerDisplay } from "@/components/production/timer-display";
import { cn } from "@/lib/utils";
import {
  SPIT_STATE_HINT,
  SPIT_STATE_LABEL,
  deriveSpitState,
  secondsUntilNextStateChange,
} from "@/lib/chicken-spit/readiness";
import type {
  ChickenSpitConfigV1,
  Spit,
} from "@/lib/chicken-spit/types";

interface Props {
  spit: Spit;
  config: ChickenSpitConfigV1;
  onAdvance: (seconds: number) => void;
  onShave?: (lbs: number) => void;
  /** When true, render a smaller, less chromed version (sidebar / secondary). */
  dense?: boolean;
}

export function SpitCameraCard({
  spit,
  config,
  onAdvance,
  onShave,
  dense = false,
}: Props) {
  const state = deriveSpitState(spit.cookProgress);
  const tone = stateColorClass(state);
  const secondsUntilNext = secondsUntilNextStateChange(spit.cookProgress, config);
  const canShave =
    spit.active &&
    spit.remainingLbs > 0 &&
    (state === "ready" || state === "overcooking");
  const shaveAmountLbs = Math.min(1, Math.max(0.1, spit.remainingLbs));

  return (
    <Card className={cn("overflow-hidden", "border", tone.border)}>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-mono uppercase tracking-wider">{spit.id.replace("-", " ")}</span>
          </CardTitle>
          <Badge className={cn("text-[10px] uppercase tracking-wider", tone.badge)}>
            {SPIT_STATE_LABEL[state]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {/* Visual */}
        <div
          className={cn(
            "relative flex items-center justify-center overflow-hidden rounded-md",
            dense ? "h-32" : "h-40",
          )}
          style={{ background: backgroundForProgress(spit.cookProgress) }}
        >
          <div className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-zinc-900/50" aria-hidden />
          <div
            className={cn(
              "relative flex items-center justify-center rounded-[40%] shadow-2xl",
              dense ? "h-24 w-20" : "h-32 w-24",
            )}
            style={{ background: chickenGradientForProgress(spit.cookProgress) }}
          >
            <div className="text-center">
              <p className="font-mono text-[8px] uppercase tracking-widest text-white/85">lbs</p>
              <p className={cn("font-mono font-extrabold text-white drop-shadow", dense ? "text-xl" : "text-2xl")}>
                {spit.remainingLbs.toFixed(1)}
              </p>
            </div>
          </div>
          <div className="absolute inset-x-2 bottom-1.5 flex items-center justify-between font-mono text-[9px] text-white/80">
            <span>cook {Math.round(spit.cookProgress * 100)}%</span>
            <span>shaved {(spit.initialLbs - spit.remainingLbs).toFixed(1)}lb</span>
          </div>
          {state === "overcooking" && (
            <div className="absolute inset-0 animate-pulse bg-orange-500/15" aria-hidden />
          )}
        </div>

        {/* Cook progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full transition-[width]", tone.fill)}
              style={{ width: `${Math.min(100, spit.cookProgress * 100)}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("text-xs font-medium leading-tight", tone.text)}>
              {SPIT_STATE_HINT[state]}
            </p>
            <div className="shrink-0 text-right">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {state === "overcooking" ? "over window" : "next state"}
              </p>
              <TimerDisplay
                seconds={secondsUntilNext}
                className={cn("text-lg leading-none", tone.text)}
              />
            </div>
          </div>
        </div>

        {/* Action row: primary shave + demo fast-forward */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onShave && spit.active ? (
            <Button
              type="button"
              size="sm"
              disabled={!canShave}
              onClick={() => onShave(shaveAmountLbs)}
              className={cn(
                "h-7 text-xs font-semibold text-white",
                state === "ready"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : state === "overcooking"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-zinc-400",
              )}
            >
              <Scissors className="mr-1 size-3" />
              Shave {shaveAmountLbs.toFixed(1)} lb
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              advance
            </span>
            {[60, 300, 900].map((sec) => (
              <Button
                key={sec}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] font-mono"
                onClick={() => onAdvance(sec)}
              >
                <FastForward className="mr-0.5 size-2.5" />
                {sec === 60 ? "1m" : sec === 300 ? "5m" : "15m"}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function backgroundForProgress(progress: number): string {
  const heat = Math.min(1, progress);
  const r = Math.round(40 + 60 * heat);
  const g = Math.round(20 + 20 * heat);
  return `radial-gradient(ellipse at center, rgba(${r},${g},0,0.55), rgba(15,15,15,0.96))`;
}

function chickenGradientForProgress(progress: number): string {
  if (progress < 0.3) return "linear-gradient(160deg, #f4e0c2 0%, #e8c79a 60%, #c69a64 100%)";
  if (progress < 0.82) return "linear-gradient(160deg, #e8b465 0%, #c98432 60%, #8b5413 100%)";
  if (progress < 1.0) return "linear-gradient(160deg, #c47a23 0%, #8a4a14 50%, #5a2f0d 100%)";
  return "linear-gradient(160deg, #823e10 0%, #4f230a 50%, #2b1305 100%)";
}

function stateColorClass(state: ReturnType<typeof deriveSpitState>) {
  switch (state) {
    case "loading":
      return {
        badge: "bg-zinc-500 text-white hover:bg-zinc-600",
        border: "border-border",
        text: "text-zinc-700 dark:text-zinc-300",
        fill: "bg-zinc-400",
      };
    case "undercooked":
      return {
        badge: "bg-rose-600 text-white hover:bg-rose-700",
        border: "border-rose-300/60 dark:border-rose-900/50",
        text: "text-rose-700 dark:text-rose-300",
        fill: "bg-rose-500",
      };
    case "ready":
      return {
        badge: "bg-emerald-600 text-white hover:bg-emerald-700",
        border: "border-emerald-300/70 dark:border-emerald-900/50",
        text: "text-emerald-700 dark:text-emerald-300",
        fill: "bg-emerald-500",
      };
    case "overcooking":
      return {
        badge: "bg-orange-600 text-white hover:bg-orange-700",
        border: "border-orange-400/70 ring-1 ring-orange-400/30 dark:border-orange-900/60",
        text: "text-orange-700 dark:text-orange-300",
        fill: "bg-orange-500",
      };
  }
}
