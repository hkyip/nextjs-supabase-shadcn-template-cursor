"use client";

import { useState } from "react";
import { Activity, AlertTriangle, DollarSign, Target, Trash2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardPeriod } from "@/lib/mock-data";
import {
  DASHBOARD_KPIS,
  FORECAST_VS_ACTUAL,
  WASTE_BY_PRODUCT,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const KPI_ICONS = [Target, Activity, DollarSign, AlertTriangle] as const;

const forecastConfig = {
  forecast: { label: "Forecast", color: "oklch(0.65 0.2 250)" },
  actual: { label: "Actual", color: "oklch(0.7 0.18 145)" },
} satisfies ChartConfig;

const wasteConfig = {
  cost: { label: "Waste Cost ($)", color: "oklch(0.65 0.24 30)" },
} satisfies ChartConfig;

export function DashboardShell() {
  const [period, setPeriod] = useState<DashboardPeriod>("day");

  const kpis = DASHBOARD_KPIS[period];
  const forecastData = FORECAST_VS_ACTUAL[period];
  const wasteData = WASTE_BY_PRODUCT[period];
  const totalWasteCost = wasteData.reduce((s, w) => s + w.cost, 0);

  return (
    <div className="space-y-6">
      {/* Period tabs */}
      <Tabs
        value={period}
        onValueChange={(v) => setPeriod(v as DashboardPeriod)}
      >
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => {
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
                  {kpi.unit === "$" ? `$${kpi.value.toLocaleString()}` : kpi.value.toLocaleString()}
                  {kpi.unit !== "$" && (
                    <span className="text-lg font-normal text-muted-foreground">
                      {" "}{kpi.unit}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    kpi.positive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {kpi.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Forecast vs Actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Forecast vs. Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={forecastConfig} className="h-[280px] w-full">
              <AreaChart
                data={forecastData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--color-forecast)"
                  fill="var(--color-forecast)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-actual)"
                  fill="var(--color-actual)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Waste by Product */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Waste by Product</CardTitle>
            <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
              ${totalWasteCost.toFixed(2)} total
            </span>
          </CardHeader>
          <CardContent>
            <ChartContainer config={wasteConfig} className="h-[280px] w-full">
              <BarChart
                data={wasteData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cost" fill="var(--color-cost)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Waste detail table */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Trash2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Waste Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity Wasted</TableHead>
                <TableHead className="text-right">Waste Cost</TableHead>
                <TableHead className="text-right">Cost / Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wasteData.map((item) => (
                <TableRow key={item.menuItemId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                    ${item.cost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    ${(item.cost / item.quantity).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
