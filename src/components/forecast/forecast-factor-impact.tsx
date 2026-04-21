"use client";

import { Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ForecastEquationStrip } from "@/components/forecast/forecast-equation-strip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { ForecastBreakdown } from "@/lib/forecast-breakdown";

const wfConfig = {
  baseline: {
    label: "Baseline (curve × window)",
    color: "oklch(0.58 0.17 250)",
  },
  up: {
    label: "Raises plan",
    color: "oklch(0.55 0.16 150)",
  },
  down: {
    label: "Lowers plan",
    color: "oklch(0.58 0.2 25)",
  },
  flat: {
    label: "No change",
    color: "oklch(0.65 0.04 250)",
  },
  total: {
    label: "Adjusted plan",
    color: "oklch(0.52 0.19 290)",
  },
} satisfies ChartConfig;

type WaterfallDatum = {
  key: string;
  label: string;
  bridge: number;
  segment: number;
  fillKey: keyof typeof wfConfig;
  runningTotal: number;
  deltaUnits?: number;
};

function buildWaterfallData(bd: ForecastBreakdown): WaterfallDatum[] {
  const b = bd.steps.baseline;
  const u1 = bd.steps.afterVelocity;
  const u2 = bd.steps.afterEvents;
  const u3 = bd.steps.afterOperator;

  const eps = 1e-6;
  const deltaFill = (before: number, after: number): keyof typeof wfConfig => {
    if (Math.abs(after - before) < eps) return "flat";
    return after >= before ? "up" : "down";
  };

  return [
    {
      key: "baseline",
      label: "Baseline",
      bridge: 0,
      segment: b,
      fillKey: "baseline",
      runningTotal: b,
    },
    {
      key: "velocity",
      label: "× velocity",
      bridge: Math.min(b, u1),
      segment: Math.abs(u1 - b),
      fillKey: deltaFill(b, u1),
      runningTotal: u1,
      deltaUnits: u1 - b,
    },
    {
      key: "events",
      label: "× events",
      bridge: Math.min(u1, u2),
      segment: Math.abs(u2 - u1),
      fillKey: deltaFill(u1, u2),
      runningTotal: u2,
      deltaUnits: u2 - u1,
    },
    {
      key: "operator",
      label: "× operator",
      bridge: Math.min(u2, u3),
      segment: Math.abs(u3 - u2),
      fillKey: deltaFill(u2, u3),
      runningTotal: u3,
      deltaUnits: u3 - u2,
    },
    {
      key: "total",
      label: "Adjusted",
      bridge: 0,
      segment: u3,
      fillKey: "total",
      runningTotal: u3,
    },
  ];
}

function fmtUnits(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10) return `${Math.round(n)}`;
  return n.toFixed(1);
}

function fmtSignedDelta(n: number): string {
  if (Math.abs(n) < 0.05) return "±0";
  const s = fmtUnits(n);
  return n > 0 ? `+${s}` : s;
}

function MultiplierTrack({
  value,
  lo,
  hi,
  neutral = 1,
}: {
  value: number;
  lo: number;
  hi: number;
  neutral?: number;
}) {
  const span = hi - lo;
  const clampPct = (x: number) =>
    Math.min(100, Math.max(0, ((x - lo) / span) * 100));
  const valuePct = clampPct(value);
  const neutralPct = clampPct(neutral);
  return (
    <div
      className="relative h-2.5 w-full rounded-full bg-muted"
      role="img"
      aria-label={`Multiplier ${value.toFixed(2)} on a scale from ${lo} to ${hi}, neutral at ${neutral}`}
    >
      <div
        className="bg-foreground/25 absolute inset-y-0 w-px -translate-x-px"
        style={{ left: `${neutralPct}%` }}
        aria-hidden
      />
      <div
        className="ring-background absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2"
        style={{ left: `${valuePct}%` }}
      />
    </div>
  );
}

type FactorRowProps = {
  title: string;
  factor: number;
  deltaUnits: number;
  detailNote: string;
  trackLo: number;
  trackHi: number;
};

function FactorRow({
  title,
  factor,
  deltaUnits,
  detailNote,
  trackLo,
  trackHi,
}: FactorRowProps) {
  return (
    <div className="bg-background/80 space-y-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-foreground text-sm font-semibold leading-tight">{title}</p>
        <div className="flex shrink-0 items-center gap-1">
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            ×{factor.toFixed(2)}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground size-7 shrink-0 p-0"
            title={detailNote}
            aria-label={`${title}: ${detailNote}`}
          >
            <Info className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
      <MultiplierTrack value={factor} lo={trackLo} hi={trackHi} />
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          deltaUnits > 0.05 && "text-emerald-700 dark:text-emerald-400",
          deltaUnits < -0.05 && "text-rose-700 dark:text-rose-400",
          Math.abs(deltaUnits) <= 0.05 && "text-muted-foreground",
        )}
      >
        {fmtSignedDelta(deltaUnits)} units
      </p>
    </div>
  );
}

type Props = {
  breakdown: ForecastBreakdown;
  productName: string;
  windowRangeLabel: string;
  demoUnitScale: number;
  timeZone: string;
};

export function ForecastFactorImpact({
  breakdown: bd,
  productName,
  windowRangeLabel,
  demoUnitScale,
  timeZone,
}: Props) {
  const wf = buildWaterfallData(bd);
  const { steps } = bd;

  return (
    <div className="space-y-4">
      <ForecastEquationStrip
        breakdown={bd}
        productName={productName}
        windowRangeLabel={windowRangeLabel}
        demoUnitScale={demoUnitScale}
        timeZone={timeZone}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">After each factor</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={wfConfig} className="h-[300px] w-full">
              <BarChart
                data={wf}
                margin={{ top: 28, right: 8, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  domain={[0, "auto"]}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as WaterfallDatum | undefined;
                    if (!row) return null;
                    return (
                      <div className="border-border/60 bg-background grid max-w-[220px] gap-1 rounded-md border px-2.5 py-2 text-xs shadow-md">
                        <p className="text-foreground font-medium">{row.label}</p>
                        {row.key === "baseline" ? (
                          <p className="text-muted-foreground">
                            Starting level:{" "}
                            <span className="text-foreground font-semibold tabular-nums">
                              {fmtUnits(row.segment)} units
                            </span>
                          </p>
                        ) : row.key === "total" ? (
                          <p className="text-muted-foreground">
                            Total after all factors:{" "}
                            <span className="text-foreground font-semibold tabular-nums">
                              {fmtUnits(row.runningTotal)} units
                            </span>
                          </p>
                        ) : (
                          <>
                            <p className="text-muted-foreground">
                              Step change:{" "}
                              <span className="text-foreground font-semibold tabular-nums">
                                {fmtSignedDelta(row.deltaUnits ?? 0)} units
                              </span>
                            </p>
                            <p className="text-muted-foreground">
                              Running total:{" "}
                              <span className="text-foreground font-semibold tabular-nums">
                                {fmtUnits(row.runningTotal)} units
                              </span>
                            </p>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="bridge"
                  stackId="wf"
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="segment"
                  stackId="wf"
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                >
                  {wf.map((row) => (
                    <Cell key={row.key} fill={`var(--color-${row.fillKey})`} />
                  ))}
                  <LabelList
                    position="top"
                    offset={6}
                    className="fill-foreground text-[11px] font-semibold"
                    valueAccessor={(entry) => {
                      const row = entry.payload as WaterfallDatum;
                      return fmtUnits(row.runningTotal);
                    }}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[oklch(0.55_0.16_150)]" aria-hidden />
                Raises
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[oklch(0.58_0.2_25)]" aria-hidden />
                Lowers
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[oklch(0.65_0.04_250)]" aria-hidden />
                Flat
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Multipliers</CardTitle>
            <p className="text-muted-foreground text-[11px]">
              Line = ×1.0 · hover{" "}
              <Info className="text-muted-foreground inline size-3 align-text-bottom" aria-hidden /> for
              detail
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <FactorRow
              title="Velocity"
              factor={bd.velocityFactor}
              deltaUnits={steps.afterVelocity - steps.baseline}
              detailNote={bd.velocityNote}
              trackLo={0.88}
              trackHi={1.18}
            />
            <FactorRow
              title="Events"
              factor={bd.eventFactor}
              deltaUnits={steps.afterEvents - steps.afterVelocity}
              detailNote={bd.eventNote}
              trackLo={0.78}
              trackHi={1.22}
            />
            <FactorRow
              title="Operator"
              factor={bd.operatorFactor}
              deltaUnits={steps.afterOperator - steps.afterEvents}
              detailNote={bd.operatorNote}
              trackLo={1}
              trackHi={1.12}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
