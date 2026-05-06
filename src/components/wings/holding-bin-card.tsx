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
import type { HoldingBin, WingsConfigV1 } from "@/lib/wings/types";

interface Props {
  bin: HoldingBin;
  config: WingsConfigV1;
  nowMs: number;
}

export function HoldingBinCard({ bin, config, nowMs }: Props) {
  const ageMin =
    bin.oldestBatchAtMs != null
      ? Math.max(0, (nowMs - bin.oldestBatchAtMs) / 60_000)
      : 0;
  const decayPct = Math.min(1, ageMin / config.holdDecayMinutes);
  const lbsRounded = Math.round(bin.weightLbs * 10) / 10;
  const wings = Math.floor(bin.weightLbs * config.wingsPerLb);

  const tone =
    decayPct >= 1
      ? { fill: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", label: "REMAKE", badge: "bg-rose-600 text-white hover:bg-rose-700", border: "border-rose-400/70" }
      : decayPct >= 0.7
        ? { fill: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", label: "AGING", badge: "bg-amber-500 text-white hover:bg-amber-600", border: "border-amber-300/70" }
        : { fill: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", label: "FRESH", badge: "bg-emerald-600 text-white hover:bg-emerald-700", border: "border-emerald-300/60" };

  return (
    <Card className={cn("border", tone.border)}>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Drumstick className="size-4 text-amber-700" aria-hidden />
            Holding bin
          </CardTitle>
          <Badge className={cn("text-[10px]", tone.badge)}>{tone.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <div className="flex items-baseline gap-2">
          <p className={cn("font-mono text-3xl font-extrabold leading-none tabular-nums", tone.text)}>
            {lbsRounded}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            lb · ~{wings} wings
          </p>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
          oldest batch · {ageMin.toFixed(1)} min old (decay at {config.holdDecayMinutes}m)
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-[width]", tone.fill)}
            style={{ width: `${decayPct * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
