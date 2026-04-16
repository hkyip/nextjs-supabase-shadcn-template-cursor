"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { HourlyDemand } from "@/lib/mock-data";

const chartConfig = {
  predicted: { label: "Predicted", color: "oklch(0.65 0.2 250)" },
  actual: { label: "Actual", color: "oklch(0.7 0.18 145)" },
} satisfies ChartConfig;

export function DemandCurveChart({ data }: { data: HourlyDemand[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Today&apos;s Demand Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="predicted"
              stackId="a"
              stroke="var(--color-predicted)"
              fill="var(--color-predicted)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stackId="b"
              stroke="var(--color-actual)"
              fill="var(--color-actual)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
