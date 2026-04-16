import {
  CloudRain,
  Calendar,
  LineChart,
  Megaphone,
  Minus,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DemandFactor } from "@/lib/mock-data";
import { DEMAND_FACTORS, MENU_ITEMS, STORE } from "@/lib/mock-data";

const FACTOR_ICON: Record<DemandFactor["id"] | string, typeof TrendingUp> = {
  historical: LineChart,
  "pos-velocity": TrendingUp,
  weather: CloudRain,
  "day-date": Calendar,
  "local-event": Trophy,
  promotion: Megaphone,
};

const TREND_ICON = {
  up: TrendingUp,
  down: Minus,
  neutral: Minus,
} as const;

const TREND_STYLE = {
  up: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  down: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  neutral:
    "bg-muted text-muted-foreground border-border",
} as const;

function minutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function ConfigShell() {
  return (
    <div className="space-y-6">
      {/* Store Setup */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Store Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </p>
              <p className="mt-1 text-sm font-medium">{STORE.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Address
              </p>
              <p className="mt-1 text-sm font-medium">{STORE.address}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Time zone
              </p>
              <p className="mt-1 text-sm font-medium">{STORE.timezone}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hours of Operation
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-7">
              {STORE.hoursOfOperation.map((h) => (
                <div key={h.day} className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">
                    {h.day.slice(0, 3)}
                  </span>
                  <span className="tabular-nums">
                    {h.open}–{h.close}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Item Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Cook Time</TableHead>
                <TableHead className="text-right">Hold Time</TableHead>
                <TableHead className="text-right">Batch Size</TableHead>
                <TableHead className="text-right">Food Cost / Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MENU_ITEMS.map((mi) => (
                <TableRow key={mi.id}>
                  <TableCell className="font-medium">{mi.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {minutes(mi.cookTimeSeconds)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {minutes(mi.holdTimeSeconds)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {mi.batchSize} {mi.batchMeasurement}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    ${mi.foodCostPerUnit.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Demand Factors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Demand Factors</CardTitle>
          <p className="text-xs text-muted-foreground">
            Six live inputs feed the forecast. Values below are the current demo
            snapshot.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEMAND_FACTORS.map((f) => {
              const Icon = FACTOR_ICON[f.id] ?? TrendingUp;
              const TrendIcon = TREND_ICON[f.trend];
              return (
                <div
                  key={f.id}
                  className="flex gap-3 rounded-lg border p-3"
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{f.label}</p>
                      <Badge
                        variant="outline"
                        className={`ml-auto text-[10px] ${TREND_STYLE[f.trend]}`}
                      >
                        <TrendIcon className="mr-1 size-3" />
                        {f.value}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
