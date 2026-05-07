"use client";

import { Gauge, ShieldAlert, Target, TriangleAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SpitKpis } from "@/lib/chicken-spit/types";

interface Props {
  kpis: SpitKpis;
}

export function SpitKpiStrip({ kpis }: Props) {
  const overcookRate =
    kpis.totalCuts === 0
      ? 0
      : 100 - Math.round((kpis.idealCuts / kpis.totalCuts) * 100);
  const idealRate =
    kpis.totalCuts === 0
      ? 100
      : Math.round((kpis.idealCuts / kpis.totalCuts) * 100);

  // Forecast accuracy: smaller error = higher accuracy
  const accuracy = computeForecastAccuracy(kpis);

  // Shrinkage trend: rolling average of recent shrinkage entries
  const recentShrink = kpis.shrinkageHistory.slice(-10);
  const avgShrink =
    recentShrink.length === 0
      ? 0
      : Math.round(
          (recentShrink.reduce((s, r) => s + r.pct, 0) / recentShrink.length) * 10,
        ) / 10;

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="size-4 text-violet-600" aria-hidden />
          Pilot KPIs
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-5">
        <Tile
          label="Stockouts today"
          value={`${kpis.stockoutEvents}`}
          icon={<TriangleAlert className="size-3.5" />}
          tone={kpis.stockoutEvents === 0 ? "ok" : "bad"}
          target="target 0"
        />
        <Tile
          label="Cuts at ideal time"
          value={`${idealRate}%`}
          icon={<Target className="size-3.5" />}
          tone={idealRate >= 90 ? "ok" : idealRate >= 75 ? "warn" : "bad"}
          target={`overcook ${overcookRate}%`}
        />
        <Tile
          label="Food-safety violations"
          value={`${kpis.foodSafetyViolations}`}
          icon={<ShieldAlert className="size-3.5" />}
          tone={kpis.foodSafetyViolations === 0 ? "ok" : "bad"}
          target={`of ${kpis.totalGrillPulls} pulls`}
        />
        <Tile
          label="Forecast accuracy"
          value={`${accuracy}%`}
          tone={accuracy >= 90 ? "ok" : accuracy >= 80 ? "warn" : "bad"}
          target="forecast vs actual"
        />
        <Tile
          label="Avg shrinkage"
          value={recentShrink.length === 0 ? "—" : `${avgShrink}%`}
          tone={avgShrink <= 25 ? "ok" : avgShrink <= 32 ? "warn" : "bad"}
          target={`last ${recentShrink.length} cycles`}
        >
          {recentShrink.length > 0 ? (
            <ShrinkSparkline points={recentShrink.map((r) => r.pct)} />
          ) : null}
        </Tile>
      </CardContent>
    </Card>
  );
}

function Tile({
  label,
  value,
  icon,
  tone,
  target,
  children,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone: "ok" | "warn" | "bad";
  target: string;
  children?: React.ReactNode;
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
      <p className={cn("font-mono text-lg font-extrabold tabular-nums leading-none")}>
        {value}
      </p>
      <p className="text-[9px] text-muted-foreground">{target}</p>
      {children}
    </div>
  );
}

function ShrinkSparkline({ points }: { points: number[] }) {
  if (points.length === 0) return null;
  const W = 80;
  const H = 18;
  const max = Math.max(40, ...points); // scale to 40% by default
  const min = Math.min(10, ...points);
  const range = Math.max(1, max - min);
  const path = points
    .map((p, i) => {
      const x = (i / Math.max(1, points.length - 1)) * W;
      const y = H - ((p - min) / range) * H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function computeForecastAccuracy(kpis: SpitKpis): number {
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
