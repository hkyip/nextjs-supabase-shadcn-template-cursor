"use client";

import { AlertTriangle, ChefHat, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DepletionChart } from "@/components/chicken-spit/depletion-chart";
import type { DepletionAnalysis } from "@/lib/chicken-spit/depletion";
import type { ChickenSpitConfigV1 } from "@/lib/chicken-spit/types";
import { cn } from "@/lib/utils";

interface Props {
  analysis: DepletionAnalysis;
  config: ChickenSpitConfigV1;
  posVelocityPerMin: number;
  onStartNewSpit: (lbs: number) => void;
  newSpitInProgress: boolean;
}

export function ReprepTriggerCard({
  analysis,
  config,
  posVelocityPerMin,
  onStartNewSpit,
  newSpitInProgress,
}: Props) {
  const urgent = analysis.shouldReprep;
  const stockoutLabel =
    analysis.stockoutAtMs != null
      ? new Date(analysis.stockoutAtMs).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";

  return (
    <Card className={cn(urgent ? "border-rose-400/80 ring-1 ring-rose-400/40" : "border-amber-300/70")}>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            {urgent ? (
              <AlertTriangle className="size-4 text-rose-600" aria-hidden />
            ) : (
              <TrendingDown className="size-4 text-amber-600" aria-hidden />
            )}
            {urgent ? "Reprep NOW" : "Reprep watch"}
          </CardTitle>
          <Badge
            className={cn(
              "text-[10px] uppercase tracking-wider",
              urgent
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-amber-500 text-white hover:bg-amber-600",
            )}
          >
            {urgent ? "URGENT" : "WATCH"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {/* Compact stat row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Mini label="Accessible" value={`${analysis.accessibleLbs}`} unit="lb" sub={`${analysis.accessiblePortions} portions`} />
          <Mini label="POS rate" value={`${posVelocityPerMin}`} unit="/min" sub="last 5m" />
          <Mini
            label="Stockout"
            value={stockoutLabel}
            sub={analysis.minutesUntilStockout != null ? `in ${analysis.minutesUntilStockout}m` : "outside 90m"}
            highlight={urgent}
          />
          <Mini label="New spit lead" value={`${config.newSpitLeadMinutes}`} unit="min" sub="load+cook" />
        </div>

        {/* Inline chart */}
        <div className="rounded-md border bg-muted/20 px-1 py-1">
          <DepletionChart
            curve={analysis.curve}
            stockoutMinutesAhead={analysis.minutesUntilStockout}
            leadTimeMinutes={config.newSpitLeadMinutes}
          />
        </div>

        {/* Verdict line + CTA */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={cn(
              "flex-1 rounded-md border-l-2 pl-2 text-xs leading-snug",
              urgent
                ? "border-rose-500 text-rose-900 dark:text-rose-100"
                : "border-amber-400 text-amber-900 dark:text-amber-100",
            )}
          >
            {urgent
              ? `Stockout in ${analysis.minutesUntilStockout ?? "?"}m — that's ${Math.max(
                  0,
                  config.newSpitLeadMinutes - (analysis.minutesUntilStockout ?? 0),
                )}m before a fresh spit can land. Build now.`
              : `On-track for the next 90m. Keep shaving from active spit.`}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={newSpitInProgress}
            onClick={() => onStartNewSpit(analysis.recommendedNewSpitLbs)}
            className={cn(
              "shrink-0 text-white",
              urgent ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            <ChefHat className="mr-1.5 size-3.5" aria-hidden />
            {newSpitInProgress ? "Spit B loading…" : `Start ${analysis.recommendedNewSpitLbs} lb NOW`}
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
  sub,
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border bg-background px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "flex items-baseline gap-0.5 font-mono font-semibold tabular-nums leading-tight",
          highlight ? "text-rose-600" : "text-foreground",
        )}
      >
        <span className="text-base">{value}</span>
        {unit ? <span className="text-[10px] font-medium text-muted-foreground">{unit}</span> : null}
      </p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
