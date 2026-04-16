"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { UpcomingSlot } from "@/lib/mock-data";

const INTENSITY_COLORS: Record<string, string> = {
  low: "var(--color-muted-foreground)",
  medium: "oklch(0.75 0.15 85)",
  high: "oklch(0.7 0.18 55)",
  peak: "oklch(0.65 0.24 30)",
};

const chartConfig = {
  totalOrders: { label: "Expected Orders" },
} satisfies ChartConfig;

export function DemandTimeline({ slots }: { slots: UpcomingSlot[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Upcoming Demand — Next 30 Min</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={slots} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="totalOrders" radius={[6, 6, 0, 0]}>
              {slots.map((slot) => (
                <Cell
                  key={slot.label}
                  fill={INTENSITY_COLORS[slot.intensity]}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="mt-2 flex justify-between px-2 text-xs font-medium">
          {slots.map((slot) => (
            <span
              key={slot.label}
              className={
                slot.intensity === "peak"
                  ? "font-bold text-orange-500"
                  : slot.intensity === "high"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }
            >
              {slot.intensity.toUpperCase()}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
