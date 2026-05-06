"use client";

import { Drumstick } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  portionsRemaining: number;
  capacity: number;
  portionLbs: number;
  posVelocityPerMin: number;
}

export function SteamTableCard({
  portionsRemaining,
  capacity,
  portionLbs,
  posVelocityPerMin,
}: Props) {
  // Display only whole portions — fractional ones aren't actionable.
  const portionsDisplay = Math.floor(portionsRemaining);
  const pct = Math.max(0, Math.min(1, portionsRemaining / capacity));
  const minutesLeft =
    posVelocityPerMin > 0
      ? Math.round(portionsRemaining / posVelocityPerMin)
      : null;
  const lbs = Math.round(portionsRemaining * portionLbs * 10) / 10;

  const tone =
    portionsDisplay <= 2
      ? { fill: "bg-rose-500", border: "border-rose-400/70", text: "text-rose-700 dark:text-rose-300", label: "CRITICAL", badge: "bg-rose-600 text-white hover:bg-rose-700" }
      : portionsDisplay <= 6
        ? { fill: "bg-amber-500", border: "border-amber-300/70", text: "text-amber-700 dark:text-amber-300", label: "LOW", badge: "bg-amber-500 text-white hover:bg-amber-600" }
        : { fill: "bg-emerald-500", border: "border-emerald-300/60", text: "text-emerald-700 dark:text-emerald-300", label: "OK", badge: "bg-emerald-600 text-white hover:bg-emerald-700" };

  return (
    <Card className={cn("border", tone.border)}>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Drumstick className="size-4 text-amber-700" aria-hidden />
            Steam table
          </CardTitle>
          <Badge className={cn("text-[10px]", tone.badge)}>{tone.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "font-mono text-3xl font-extrabold leading-none tabular-nums",
              tone.text,
            )}
          >
            {portionsDisplay}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            portions
          </p>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {lbs.toFixed(1)} lb · cap {capacity}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-[width]", tone.fill)}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {minutesLeft != null
            ? `≈ ${minutesLeft} min left at ${posVelocityPerMin}/min`
            : "—"}
        </p>
      </CardContent>
    </Card>
  );
}
