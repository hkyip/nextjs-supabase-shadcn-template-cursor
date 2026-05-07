"use client";

import { Gauge, RefreshCw, Repeat, Target } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WingsKpis } from "@/lib/wings/types";

interface Props {
  kpis: WingsKpis;
  /** session-running wings sold today (count) — used for "sold delta" tile */
  wingsSoldToday: number;
  /** baseline wings/day hardcoded for delta calc */
  baselineWingsPerDay: number;
}

export function WingsKpiStrip({ kpis, wingsSoldToday, baselineWingsPerDay }: Props) {
  // Approx 4 dine-in covers ≈ 1 table turn (4-top average).
  const tableTurns = Math.floor(kpis.dineinServed / 4);
  const tableTurnsTarget = "+1 turn / peak hr";

  // Forecast accuracy (1 - MAPE)
  const accuracy = computeForecastAccuracy(kpis);

  // Wings sold delta vs baseline
  const delta = wingsSoldToday - baselineWingsPerDay;
  const deltaPct =
    baselineWingsPerDay === 0
      ? 0
      : Math.round((delta / baselineWingsPerDay) * 100);

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="size-4 text-violet-600" aria-hidden />
          Pilot KPIs
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 pb-4">
        <Tile
          icon={<Repeat className="size-3.5" />}
          label="Table turns"
          value={`${tableTurns}`}
          sub={tableTurnsTarget}
          tone={tableTurns > 0 ? "ok" : "warn"}
        />
        <Tile
          icon={<Target className="size-3.5" />}
          label="Forecast accuracy"
          value={`${accuracy}%`}
          sub="forecast vs. actual"
          tone={accuracy >= 90 ? "ok" : accuracy >= 80 ? "warn" : "bad"}
        />
        <Tile
          icon={<RefreshCw className="size-3.5" />}
          label="Wings sold delta"
          value={delta >= 0 ? `+${delta}` : `${delta}`}
          sub={`${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs baseline`}
          tone={delta > 0 ? "ok" : delta === 0 ? "warn" : "bad"}
        />
      </CardContent>
    </Card>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "warn" | "bad";
}) {
  const t =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-300 border-emerald-300/60"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-300 border-amber-300/70"
        : "text-rose-700 dark:text-rose-300 border-rose-400/70";
  return (
    <div className={cn("space-y-1 rounded-md border bg-muted/20 p-2.5", t)}>
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="font-mono text-lg font-extrabold tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function computeForecastAccuracy(kpis: WingsKpis): number {
  const samples = kpis.forecastVsActual.slice(-6);
  if (samples.length === 0) return 100;
  let totalForecast = 0;
  let totalAbsErr = 0;
  for (const s of samples) {
    totalForecast += s.forecastLbs;
    totalAbsErr += Math.abs(s.forecastLbs - s.actualLbs);
  }
  if (totalForecast === 0) return 100;
  const errPct = (totalAbsErr / totalForecast) * 100;
  return Math.max(0, Math.min(100, Math.round(100 - errPct)));
}
