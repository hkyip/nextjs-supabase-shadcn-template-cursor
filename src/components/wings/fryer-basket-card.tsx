"use client";

import { ArrowDownToLine, Flame, Hand } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BASKET_STATE_LABEL,
  basketRemainingSeconds,
} from "@/lib/wings/basket-state";
import type { FryerBasket, WingsConfigV1 } from "@/lib/wings/types";

interface Props {
  basket: FryerBasket;
  config: WingsConfigV1;
  onDrop: (basketId: string, lbs: number) => void;
  onPull: (basketId: string) => void;
}

export function FryerBasketCard({ basket, config, onDrop, onPull }: Props) {
  const remaining = basketRemainingSeconds(basket, config);
  const status = basket.status;

  const tone = toneFor(status);
  const progress =
    status === "empty"
      ? 0
      : Math.min(
          1,
          basket.elapsedSeconds /
            (config.cookSeconds + config.cookOvershootSeconds),
        );

  // SVG circle math
  const R = 26;
  const C = 2 * Math.PI * R;
  const dash = C * progress;

  const mm = Math.floor(Math.abs(remaining) / 60);
  const ss = Math.abs(remaining) % 60;
  const display =
    status === "empty"
      ? "—"
      : status === "overcook"
        ? `+${mm}:${ss.toString().padStart(2, "0")}`
        : `${mm}:${ss.toString().padStart(2, "0")}`;

  return (
    <Card className={cn("border", tone.border)}>
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold">
            B{basket.index + 1}
          </span>
          <Badge className={cn("text-[9px] uppercase tracking-wider", tone.badge)}>
            {BASKET_STATE_LABEL[status]}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg viewBox="0 0 70 70" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="35" cy="35" r={R} fill="none" strokeWidth="5" className="stroke-muted" />
              <circle
                cx="35"
                cy="35"
                r={R}
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                className={cn("transition-[stroke-dashoffset]", tone.ring)}
                strokeDasharray={`${dash} ${C}`}
              />
            </svg>
            <div className="text-center">
              <p
                className={cn(
                  "font-mono text-sm font-extrabold tabular-nums leading-none",
                  tone.text,
                )}
              >
                {display}
              </p>
              <p className="text-[8px] uppercase tracking-widest text-muted-foreground">
                {status === "empty"
                  ? "ready"
                  : status === "overcook"
                    ? "over"
                    : "left"}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {status === "empty"
                ? `cap ${config.basketCapacityLbs} lb`
                : `${basket.weightLbs} lb in basket`}
            </p>
            {status === "empty" ? (
              <Button
                type="button"
                size="sm"
                className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                onClick={() => onDrop(basket.id, config.basketCapacityLbs)}
              >
                <ArrowDownToLine className="mr-1 size-3" /> Drop {config.basketCapacityLbs} lb
              </Button>
            ) : status === "frying" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onPull(basket.id)}
              >
                <Hand className="mr-1 size-3" /> Pull early
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className={cn(
                  "h-7 text-xs text-white",
                  status === "overcook"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700",
                )}
                onClick={() => onPull(basket.id)}
              >
                <Flame className="mr-1 size-3" /> Pull to bin
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function toneFor(status: FryerBasket["status"]) {
  switch (status) {
    case "empty":
      return {
        border: "border-border",
        badge: "bg-zinc-500 text-white hover:bg-zinc-600",
        text: "text-muted-foreground",
        ring: "stroke-zinc-300",
      };
    case "frying":
      return {
        border: "border-amber-300/70",
        badge: "bg-amber-500 text-white hover:bg-amber-600",
        text: "text-amber-700 dark:text-amber-300",
        ring: "stroke-amber-500",
      };
    case "ready":
      return {
        border: "border-emerald-300/70",
        badge: "bg-emerald-600 text-white hover:bg-emerald-700",
        text: "text-emerald-700 dark:text-emerald-300",
        ring: "stroke-emerald-500",
      };
    case "overcook":
      return {
        border: "border-rose-400/70 ring-1 ring-rose-400/30",
        badge: "bg-rose-600 text-white hover:bg-rose-700",
        text: "text-rose-700 dark:text-rose-300",
        ring: "stroke-rose-600",
      };
  }
}
