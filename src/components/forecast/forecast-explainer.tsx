"use client";

import Link from "next/link";
import { ArrowRight, ChefHat, LineChart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FORECAST_DEFAULT_WINDOW_MINUTES } from "@/lib/forecast";
import { MENU_ITEMS, STORE } from "@/lib/mock-data";
import { useProduction } from "@/lib/use-production-state";

type Props = {
  /** Which product tab is selected — drives the live bridge row. */
  menuItemId: string;
};

export function ForecastExplainer({ menuItemId }: Props) {
  const { state } = useProduction();
  const wtc = state.whatToCook.find((w) => w.menuItemId === menuItemId);
  const mi = MENU_ITEMS.find((m) => m.id === menuItemId);

  return (
    <Card className="border-emerald-500/25 bg-emerald-500/[0.04]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">How this demo works</CardTitle>
        <p className="text-muted-foreground text-sm font-normal leading-relaxed">
          Two ideas run in parallel: a <strong>time-based forecast</strong> (does
          not react to individual sales) and <strong>operations</strong> (queue &
          lane shortfall) on the Production screen.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-background/80 space-y-2 rounded-lg border p-4">
            <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Track A — Statistical forecast
            </p>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                {STORE.timezone}
              </span>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                Intraday curve per SKU
              </span>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-semibold">
                Next {FORECAST_DEFAULT_WINDOW_MINUTES}m expected units
              </span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              This page’s cards and bar chart show that curve. Green bars mark
              buckets overlapping <strong>now → +{FORECAST_DEFAULT_WINDOW_MINUTES} min</strong>.
            </p>
          </div>
          <div className="bg-background/80 space-y-2 rounded-lg border p-4">
            <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Track B — Operations (does not change Track A)
            </p>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                POS queue + lane backlog
              </span>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
              <span className="flex items-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 font-semibold">
                <ChefHat className="size-3.5" />
                Cook target on /production
              </span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Real tickets and lane shortfall add <strong>Queue</strong> /{" "}
              <strong>Lane</strong> on the line — they do <strong>not</strong> bump
              the statistical “Next 30m” number.
            </p>
          </div>
        </div>

        <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
          <li>
            Switching the product tab loads a <strong>different curve</strong> for
            the same store clock.
          </li>
          <li>
            Open{" "}
            <Link
              href="/production"
              className="text-foreground font-medium underline decoration-dotted underline-offset-2"
            >
              Production
            </Link>{" "}
            to see cook quantity combine forecast, hold, cooking, queue, and lane.
          </li>
        </ul>

        <details className="group rounded-lg border bg-background/60">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <LineChart className="size-4 text-emerald-600" />
              Live bridge — selected product vs Production state
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </span>
          </summary>
          <div className="border-t px-4 py-3">
            {!wtc || !mi ? (
              <p className="text-muted-foreground text-sm">No row for this item.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{mi.name}</strong> — values
                  from the shared demo session (same as{" "}
                  <Link
                    href="/production"
                    className="text-foreground underline decoration-dotted underline-offset-2"
                  >
                    /production
                  </Link>
                  ).
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground text-xs">Next 30m (forecast)</dt>
                    <dd className="font-semibold tabular-nums">
                      {Math.round(wtc.forecastedDemand)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Queue</dt>
                    <dd className="font-semibold tabular-nums">{wtc.queuedUnits}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Lane</dt>
                    <dd className="font-semibold tabular-nums">
                      {wtc.laneBacklogUnits}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Hold</dt>
                    <dd className="font-semibold tabular-nums">
                      {wtc.currentHoldInventory}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Cooking</dt>
                    <dd className="font-semibold tabular-nums">
                      {wtc.currentlyCooking}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Cook qty</dt>
                    <dd className="font-semibold tabular-nums">{wtc.cookQuantity}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
