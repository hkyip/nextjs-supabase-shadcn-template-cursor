import { Activity, DollarSign, Target, Timer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DemandCurveChart } from "@/components/shift/demand-curve-chart";
import { ItemBreakdownTable } from "@/components/shift/item-breakdown-table";
import { ITEM_FORECASTS, KPIS, SHIFT_DEMAND_CURVE } from "@/lib/mock-data";

export const metadata = {
  title: "Shift Overview — FryQ",
};

const KPI_ICONS = [Target, DollarSign, Timer, Activity] as const;

export default function ShiftPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Overview</h1>
        <p className="text-sm text-muted-foreground">
          Today&apos;s performance at a glance — Store #142
        </p>
      </div>

      <Separator />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi, i) => {
          const Icon = KPI_ICONS[i];
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">
                  {kpi.value}
                  <span className="text-lg font-normal text-muted-foreground">
                    {" "}
                    {kpi.unit}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Demand Curve */}
      <DemandCurveChart data={SHIFT_DEMAND_CURVE} />

      {/* Item Breakdown Table */}
      <ItemBreakdownTable items={ITEM_FORECASTS} />
    </div>
  );
}
