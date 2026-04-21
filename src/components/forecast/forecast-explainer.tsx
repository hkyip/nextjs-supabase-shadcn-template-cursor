"use client";

import Link from "next/link";
import { ArrowRight, ChefHat, ChevronDown, LineChart } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { FORECAST_DEFAULT_WINDOW_MINUTES } from "@/lib/forecast";
import { MENU_ITEMS, STORE } from "@/lib/mock-data";
import { useProduction } from "@/lib/use-production-state";
import { cn } from "@/lib/utils";

type Props = {
  menuItemId: string;
};

export function ForecastExplainer({ menuItemId }: Props) {
  const { state } = useProduction();
  const wtc = state.whatToCook.find((w) => w.menuItemId === menuItemId);
  const mi = MENU_ITEMS.find((m) => m.id === menuItemId);

  return (
    <Card className="border-border/80">
      <CardContent className="pt-4 pb-4">
        <p className="text-muted-foreground text-center text-sm leading-snug">
          Short version: this page is the &quot;how busy is it usually right now?&quot; guess.{" "}
          <Link
            href="/production"
            className="text-foreground font-medium underline decoration-dotted underline-offset-2"
          >
            Production
          </Link>{" "}
          adds the order line, shelf, grill, and cook math on top of that guess.
        </p>

        <details className="group mt-3">
          <summary
            className={cn(
              "text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center justify-center gap-1.5 py-2 text-xs transition-colors",
              "[&::-webkit-details-marker]:hidden",
            )}
          >
            <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
            How forecast and Production differ (detail)
          </summary>

          <div className="mt-3 space-y-4 border-t pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="bg-muted/30 space-y-2 rounded-lg border p-3">
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  Forecast (this page)
                </p>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono">
                    {STORE.timezone}
                  </span>
                  <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="rounded-md bg-muted px-2 py-0.5">Curve per SKU</span>
                  <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-semibold">
                    Next {FORECAST_DEFAULT_WINDOW_MINUTES}m units
                  </span>
                </div>
              </div>
              <div className="bg-muted/30 space-y-2 rounded-lg border p-3">
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  Operations (Production)
                </p>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="rounded-md bg-muted px-2 py-0.5">Queue + lane</span>
                  <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="flex items-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 font-semibold">
                    <ChefHat className="size-3" />
                    Cook target
                  </span>
                </div>
              </div>
            </div>

            <details className="rounded-lg border bg-background/60">
              <summary
                className={cn(
                  "cursor-pointer px-3 py-2.5 text-xs font-medium",
                  "list-none marker:content-none [&::-webkit-details-marker]:hidden",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <LineChart className="size-3.5 text-emerald-600" />
                  Live numbers — selected SKU vs Production
                </span>
              </summary>
              <div className="border-t px-3 py-3">
                {!wtc || !mi ? (
                  <p className="text-muted-foreground text-xs">No row for this item.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-semibold">{mi.name}</span> — same
                      session as{" "}
                      <Link
                        href="/production"
                        className="text-foreground underline decoration-dotted underline-offset-2"
                      >
                        /production
                      </Link>
                      .
                    </p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Baseline (30m)</dt>
                        <dd className="font-semibold tabular-nums">
                          {Math.round(wtc.forecastedDemand)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">× v / e / op</dt>
                        <dd className="font-semibold tabular-nums">
                          {wtc.velocityFactor.toFixed(2)} / {wtc.eventFactor.toFixed(2)} /{" "}
                          {wtc.operatorFactor.toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Adjusted plan</dt>
                        <dd className="font-semibold tabular-nums">
                          {Math.round(wtc.adjustedExpectedDemand)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Queue</dt>
                        <dd className="font-semibold tabular-nums">{wtc.queuedUnits}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Lane</dt>
                        <dd className="font-semibold tabular-nums">{wtc.laneBacklogUnits}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Hold</dt>
                        <dd className="font-semibold tabular-nums">{wtc.currentHoldInventory}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Cooking</dt>
                        <dd className="font-semibold tabular-nums">{wtc.currentlyCooking}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Cook qty</dt>
                        <dd className="font-semibold tabular-nums">{wtc.cookQuantity}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            </details>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
