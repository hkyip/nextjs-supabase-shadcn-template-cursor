"use client";

import { Gauge } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WingsAdherence } from "@/lib/wings/types";

interface Props {
  adherence: WingsAdherence;
}

export function AdherenceMeter({ adherence }: Props) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="size-4 text-violet-600" aria-hidden />
          SOP adherence
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pb-4">
        <Dial
          label="Timer started ≤30s"
          target={95}
          value={Math.round(adherence.timerPercent)}
          help="PRD ≥95%"
        />
        <Dial
          label="Cooked exact 7:30"
          target={100}
          value={Math.round(adherence.cookPercent)}
          help="PRD 100%"
        />
      </CardContent>
    </Card>
  );
}

function Dial({
  label,
  value,
  target,
  help,
}: {
  label: string;
  value: number;
  target: number;
  help: string;
}) {
  const onTarget = value >= target - 1;
  const tone = onTarget
    ? { stroke: "stroke-emerald-500", text: "text-emerald-700 dark:text-emerald-300" }
    : value >= target - 6
      ? { stroke: "stroke-amber-500", text: "text-amber-700 dark:text-amber-300" }
      : { stroke: "stroke-rose-500", text: "text-rose-700 dark:text-rose-300" };
  const R = 28;
  const C = 2 * Math.PI * R;
  const dash = (Math.min(100, value) / 100) * C;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <svg
          viewBox="0 0 70 70"
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx="35"
            cy="35"
            r={R}
            fill="none"
            strokeWidth="5"
            className="stroke-muted"
          />
          <circle
            cx="35"
            cy="35"
            r={R}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className={cn("transition-[stroke-dashoffset]", tone.stroke)}
            strokeDasharray={`${dash} ${C}`}
          />
        </svg>
        <p
          className={cn(
            "font-mono text-sm font-extrabold tabular-nums",
            tone.text,
          )}
        >
          {value}%
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-tight">{label}</p>
        <p className="text-[10px] text-muted-foreground">{help}</p>
      </div>
    </div>
  );
}
