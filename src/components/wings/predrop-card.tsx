"use client";

import { ArrowDownToLine, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PredropAnalysis } from "@/lib/wings/predrop";

interface Props {
  analysis: PredropAnalysis;
  onDrop: (lbs: number) => void;
  canDrop: boolean;
}

export function PredropCard({ analysis, onDrop, canDrop }: Props) {
  const urgent = analysis.urgent;

  return (
    <Card
      className={cn(
        urgent
          ? "border-rose-400/70 ring-1 ring-rose-400/40"
          : analysis.recommendedLbs > 0
            ? "border-emerald-400/70"
            : "border-border",
      )}
    >
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-emerald-600" aria-hidden />
            Pre-drop recommendation
          </CardTitle>
          <Badge
            className={cn(
              "text-[10px] uppercase tracking-wider",
              urgent
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : analysis.recommendedLbs > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-zinc-500 text-white hover:bg-zinc-600",
            )}
          >
            {urgent
              ? "URGENT"
              : analysis.recommendedLbs > 0
                ? "PRE-DROP"
                : "ON TRACK"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <Mini label="Ready now" value={analysis.readyLbs.toFixed(1)} unit="lb" />
          <Mini label="Cooking" value={analysis.cookingLbs.toFixed(1)} unit="lb" />
          <Mini
            label="Next 5–10m"
            value={analysis.nextBucketLbs.toFixed(1)}
            unit="lb"
            highlight={urgent}
          />
        </div>

        <p
          className={cn(
            "rounded-md border-l-2 pl-2 text-xs leading-snug",
            urgent
              ? "border-rose-500 text-rose-900 dark:text-rose-100"
              : analysis.recommendedLbs > 0
                ? "border-emerald-500 text-emerald-900 dark:text-emerald-100"
                : "border-border text-muted-foreground",
          )}
        >
          {analysis.verdict}
        </p>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!canDrop || analysis.recommendedLbs <= 0}
            onClick={() => onDrop(analysis.recommendedLbs)}
            className={cn(
              "text-white",
              urgent
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            <ArrowDownToLine className="mr-1.5 size-3.5" aria-hidden />
            {analysis.recommendedLbs > 0
              ? `Pre-drop ${analysis.recommendedLbs} lb`
              : "Nothing to drop"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/20 px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "flex items-baseline gap-0.5 font-mono font-semibold tabular-nums leading-tight",
          highlight ? "text-rose-600" : "text-foreground",
        )}
      >
        <span className="text-base">{value}</span>
        <span className="text-[10px] font-medium text-muted-foreground">
          {unit}
        </span>
      </p>
    </div>
  );
}
