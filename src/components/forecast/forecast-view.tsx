"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";

import { ForecastExplainer } from "@/components/forecast/forecast-explainer";
import { ForecastFactorImpact } from "@/components/forecast/forecast-factor-impact";
import { ForecastPlainGuide } from "@/components/forecast/forecast-plain-guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeForecastBreakdown } from "@/lib/forecast-breakdown";
import {
  FORECAST_DEFAULT_WINDOW_MINUTES,
  forecastUnitsInWindow,
  intradayBucketsForDate,
} from "@/lib/forecast";
import { DEMO_TIME_SCALE_DEFAULT } from "@/lib/demo-clock";
import { FORECAST_DEMO_UNIT_SCALE, MENU_ITEMS, STORE } from "@/lib/mock-data";
import { useProduction } from "@/lib/use-production-state";

const unitsConfig = {
  units: { label: "Expected units", color: "oklch(0.62 0.18 250)" },
  nextWindow: {
    label: "Next 30 min (now → +30m)",
    color: "oklch(0.72 0.17 160)",
  },
} satisfies ChartConfig;

function formatWindowRange(
  start: Date,
  windowMinutes: number,
  timeZone: string,
): string {
  const end = new Date(start.getTime() + windowMinutes * 60_000);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatDemoClock(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

type BucketMin = 5 | 30;

export function ForecastView() {
  const { state, demoNow } = useProduction();
  const [menuItemId, setMenuItemId] = useState(MENU_ITEMS[0]!.id);
  const [bucketMinutes, setBucketMinutes] = useState<BucketMin>(30);

  const now = demoNow;

  const breakdownCtx = useMemo(
    () => ({
      elapsed: state.elapsed,
      timeScale: state.demoClock.timeScale,
      velocityHistory: state.velocityHistory,
      activeForecastModifiers: state.activeForecastModifiers.filter(
        (m) => m.untilElapsed > state.elapsed,
      ),
      wasteHistory: state.wasteHistory,
    }),
    [
      state.elapsed,
      state.demoClock.timeScale,
      state.velocityHistory,
      state.activeForecastModifiers,
      state.wasteHistory,
    ],
  );

  const breakdown = useMemo(
    () => computeForecastBreakdown(menuItemId, now, breakdownCtx),
    [menuItemId, now, breakdownCtx],
  );

  const selectedItem = useMemo(
    () => MENU_ITEMS.find((m) => m.id === menuItemId) ?? MENU_ITEMS[0]!,
    [menuItemId],
  );

  const windowRangeLabel = useMemo(
    () =>
      formatWindowRange(now, FORECAST_DEFAULT_WINDOW_MINUTES, STORE.timezone),
    [now],
  );

  const chartData = useMemo(() => {
    const t0 = now.getTime();
    const t1 = t0 + FORECAST_DEFAULT_WINDOW_MINUTES * 60_000;
    return intradayBucketsForDate(menuItemId, now, bucketMinutes).map((b) => {
      const overlapsNextWindow =
        b.start.getTime() < t1 && b.end.getTime() > t0;
      return {
        label: b.label,
        /** Keep fractional units: rounding to integers hid most buckets at this scale. */
        units: b.units,
        inNextWindow: overlapsNextWindow,
      };
    });
  }, [menuItemId, now, bucketMinutes]);

  const selectedNext30Integral = useMemo(
    () =>
      Math.round(
        forecastUnitsInWindow(
          menuItemId,
          now,
          FORECAST_DEFAULT_WINDOW_MINUTES,
        ),
      ),
    [menuItemId, now],
  );

  const nextWindow = useMemo(() => {
    return MENU_ITEMS.map((mi) => ({
      id: mi.id,
      name: mi.name,
      batchMeasurement: mi.batchMeasurement,
      units: Math.round(
        forecastUnitsInWindow(mi.id, now, FORECAST_DEFAULT_WINDOW_MINUTES),
      ),
    }));
  }, [now]);

  const bucketIndexRange = useMemo(() => {
    const t0 = now.getTime();
    const t1 = t0 + FORECAST_DEFAULT_WINDOW_MINUTES * 60_000;
    const buckets = intradayBucketsForDate(menuItemId, now, bucketMinutes);
    let i0 = -1;
    let i1 = -1;
    buckets.forEach((b, i) => {
      if (b.start.getTime() < t1 && b.end.getTime() > t0) {
        if (i0 < 0) i0 = i;
        i1 = i;
      }
    });
    return { i0: i0 < 0 ? 0 : i0, i1: i1 < 0 ? 0 : i1 };
  }, [menuItemId, now, bucketMinutes]);

  /** Explicit max so Y-axis rescales when switching SKU (Recharts "auto" can stick). */
  const intradayYMax = useMemo(() => {
    let m = 0;
    for (const d of chartData) m = Math.max(m, d.units);
    if (m <= 0) return 1;
    return m * 1.08;
  }, [chartData]);

  const nextWinBandGradientId = `forecastNextWinBand-${menuItemId.replace(/[^a-zA-Z0-9-_]/g, "")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-emerald-500/20 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            Store time · {STORE.timezone}
          </p>
          <p className="text-foreground text-xl font-bold tabular-nums sm:text-2xl">
            {formatDemoClock(now, STORE.timezone)}
          </p>
        </div>
        <p className="text-muted-foreground text-xs sm:text-right">
          Timeline runs at {state.demoClock.timeScale}× wall speed (default{" "}
          {DEMO_TIME_SCALE_DEFAULT}×) ·{" "}
          <span className="font-mono text-foreground">/remote</span> for time of
          day and 1× / 10× speed (same session as{" "}
          <span className="font-mono text-foreground">/fry-kitchen</span>)
        </p>
      </div>

      <ForecastPlainGuide />

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Product
        </p>
        <Tabs value={menuItemId} onValueChange={setMenuItemId}>
          <TabsList className="h-9 w-full flex-wrap justify-start sm:w-auto">
            {MENU_ITEMS.map((mi) => (
              <TabsTrigger key={mi.id} value={mi.id} className="text-xs">
                {mi.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <section className="space-y-3" aria-labelledby="forecast-adjusted-heading">
        <h2 id="forecast-adjusted-heading" className="text-lg font-semibold tracking-tight">
          Adjusted next-window demand
        </h2>
        <ForecastFactorImpact
          breakdown={breakdown}
          productName={selectedItem.name}
          windowRangeLabel={windowRangeLabel}
          demoUnitScale={FORECAST_DEMO_UNIT_SCALE}
          timeZone={STORE.timezone}
        />
      </section>

      <section className="space-y-3" aria-labelledby="forecast-intraday-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="forecast-intraday-heading" className="text-lg font-semibold tracking-tight">
            Intraday curve
          </h2>
          <Tabs
            value={String(bucketMinutes)}
            onValueChange={(v) => setBucketMinutes(Number(v) as BucketMin)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="5">5 min buckets</TabsTrigger>
              <TabsTrigger value="30">30 min buckets</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedItem.name} — expected units per bucket
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              Band = same next {FORECAST_DEFAULT_WINDOW_MINUTES} min window as above (
              {windowRangeLabel}).
            </p>
            <p className="text-foreground mt-1 text-sm font-semibold tabular-nums">
              Next {FORECAST_DEFAULT_WINDOW_MINUTES} min baseline integral: {selectedNext30Integral}{" "}
              <span className="text-muted-foreground font-normal">
                {selectedItem.batchMeasurement}
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              key={`${menuItemId}-${bucketMinutes}`}
              config={unitsConfig}
              className="h-[320px] w-full min-w-0"
            >
              <BarChart
                key={`intraday-barchart-${menuItemId}-${bucketMinutes}`}
                data={chartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={nextWinBandGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="oklch(0.72 0.17 160)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.72 0.17 160)"
                      stopOpacity={0.08}
                    />
                  </linearGradient>
                </defs>
                {bucketIndexRange.i0 >= 0 && (
                  <ReferenceArea
                    x1={chartData[bucketIndexRange.i0]?.label}
                    x2={chartData[bucketIndexRange.i1]?.label}
                    fill={`url(#${nextWinBandGradientId})`}
                    stroke="oklch(0.55 0.14 160)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.9}
                  />
                )}
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={72}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  domain={[0, intradayYMax]}
                  tickFormatter={(v) =>
                    typeof v === "number" && Number.isFinite(v)
                      ? v >= 1
                        ? v.toFixed(1)
                        : v.toFixed(2)
                      : ""
                  }
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  key={`intraday-bar-${menuItemId}-${bucketMinutes}`}
                  dataKey="units"
                  radius={[4, 4, 0, 0]}
                  name="units"
                  isAnimationActive={false}
                >
                  {chartData.map((row, i) => (
                    <Cell
                      key={`${menuItemId}-bar-${i}-${row.label}`}
                      fill={
                        row.inNextWindow
                          ? "var(--color-nextWindow)"
                          : "var(--color-units)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-sm bg-[oklch(0.62_0.18_250)]"
                  aria-hidden
                />
                Other buckets
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-sm bg-[oklch(0.72_0.17_160)]"
                  aria-hidden
                />
                Overlaps next {FORECAST_DEFAULT_WINDOW_MINUTES} min
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="forecast-baseline-cards-heading">
        <h2 id="forecast-baseline-cards-heading" className="text-lg font-semibold tracking-tight">
          Baseline next {FORECAST_DEFAULT_WINDOW_MINUTES} min — all SKUs
        </h2>
        <p className="text-muted-foreground text-xs">
          Curve integral only (no velocity / alerts). Click a card to select product.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {nextWindow.map((row) => (
            <Card
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => setMenuItemId(row.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setMenuItemId(row.id);
                }
              }}
              className={cn(
                "cursor-pointer transition-shadow hover:shadow-md",
                row.id === menuItemId &&
                  "ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-background",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{row.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-black tabular-nums">{row.units}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  baseline units · {row.batchMeasurement}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <ForecastExplainer menuItemId={menuItemId} />
    </div>
  );
}
