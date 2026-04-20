"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForecastExplainer } from "@/components/forecast/forecast-explainer";
import {
  FORECAST_DEFAULT_WINDOW_MINUTES,
  forecastUnitsInWindow,
  intradayBucketsForDate,
} from "@/lib/forecast";
import { FORECAST_DEMO_UNIT_SCALE, MENU_ITEMS, STORE } from "@/lib/mock-data";

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

type BucketMin = 5 | 30;

export function ForecastView() {
  const [now, setNow] = useState(() => new Date());
  const [menuItemId, setMenuItemId] = useState(MENU_ITEMS[0]!.id);
  const [bucketMinutes, setBucketMinutes] = useState<BucketMin>(30);

  const selectedItem = useMemo(
    () => MENU_ITEMS.find((m) => m.id === menuItemId) ?? MENU_ITEMS[0]!,
    [menuItemId],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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
        units: Math.round(b.units),
        inNextWindow: overlapsNextWindow,
      };
    });
  }, [menuItemId, now, bucketMinutes]);

  /** Sliding-window integral for the selected item only (matches top cards). */
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

  return (
    <div className="space-y-8">
      <ForecastExplainer menuItemId={menuItemId} />

      <div className="text-muted-foreground text-sm">
        Forecast magnitudes use a demo scale ({FORECAST_DEMO_UNIT_SCALE}×) so
        numbers stay small and easy to sanity-check. Time zone: {STORE.timezone}.
        Values update every 30s (sliding {FORECAST_DEFAULT_WINDOW_MINUTES}-minute
        window). Today chart:{" "}
        <span className="text-foreground font-medium">
          {windowRangeLabel}
        </span>{" "}
        is highlighted on the bars.
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Next {FORECAST_DEFAULT_WINDOW_MINUTES} minutes (all items)
        </h2>
        <p className="text-muted-foreground text-sm">
          Each card uses that item&apos;s own demand curve. The Today chart below
          zooms one product at a time — select a tab to match.
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
                  expected units · {row.batchMeasurement}
                </p>
                <p className="text-muted-foreground mt-2 text-[11px]">
                  Click to show in Today chart
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Today</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Chart and Y scale are for{" "}
              <span className="text-foreground font-medium">
                {selectedItem.name}
              </span>{" "}
              only — switch the tab to load each product&apos;s curve.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={menuItemId}
              onValueChange={setMenuItemId}
            >
              <TabsList className="h-9 flex-wrap">
                {MENU_ITEMS.map((mi) => (
                  <TabsTrigger key={mi.id} value={mi.id} className="text-xs">
                    {mi.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs
              value={String(bucketMinutes)}
              onValueChange={(v) => setBucketMinutes(Number(v) as BucketMin)}
            >
              <TabsList className="h-9">
                <TabsTrigger value="5">5 min</TabsTrigger>
                <TabsTrigger value="30">30 min</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedItem.name} — expected demand by bucket
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Bar heights use this item&apos;s forecast weights. Highlighted bars
              overlap the current window ({windowRangeLabel} · {STORE.timezone}
              ).
            </p>
            <p className="text-foreground mt-2 text-sm font-semibold tabular-nums">
              Next {FORECAST_DEFAULT_WINDOW_MINUTES} min (this product):{" "}
              {selectedNext30Integral}{" "}
              <span className="text-muted-foreground font-normal">
                {selectedItem.batchMeasurement} · same sliding integral as the
                card above
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              key={`${menuItemId}-${bucketMinutes}`}
              config={unitsConfig}
              className="h-[320px] w-full"
            >
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
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
                  domain={[0, "auto"]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="units" radius={[4, 4, 0, 0]} name="units">
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
    </div>
  );
}
