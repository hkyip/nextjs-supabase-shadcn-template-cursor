"use client";

import { ChevronDown, Flame, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  computeRecommendedSpitLbs,
  DEMO_FORECAST_INPUTS,
} from "@/lib/chicken-spit/forecast";

interface SpitPlanRow {
  slot: string;
  startedAt: string;
  lbs: number;
  state: "carryover" | "active" | "planned";
  note: string;
}

const PLAN_ROWS: SpitPlanRow[] = [
  {
    slot: "Carryover",
    startedAt: "Yesterday 9:30pm",
    lbs: 4,
    state: "carryover",
    note: "Use first — yesterday's leftover spit, refrigerated.",
  },
  {
    slot: "Spit A · Active",
    startedAt: "10:30am",
    lbs: 12,
    state: "active",
    note: "Loaded for lunch rush — currently shaving.",
  },
  {
    slot: "Spit B · Lunch refill",
    startedAt: "Plan for 1:15pm",
    lbs: 8,
    state: "planned",
    note: "Forecast covers 1pm–4pm window.",
  },
  {
    slot: "Spit C · Dinner",
    startedAt: "Plan for 4:30pm",
    lbs: 14,
    state: "planned",
    note: "Dinner peak — patio + nearby event lift.",
  },
];

export function SpitPlanCard() {
  const forecast = computeRecommendedSpitLbs(DEMO_FORECAST_INPUTS);
  const totalDayLbs = PLAN_ROWS.reduce((sum, r) => sum + r.lbs, 0);

  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Flame className="size-4 text-orange-600" aria-hidden />
            <span className="text-sm font-semibold">Today&apos;s spit plan</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {totalDayLbs} lb total
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              next 4h: {forecast.recommendedLbs} lb
            </Badge>
          </div>
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-3">
            <Stat label="Baseline (next 4h)" value={`${forecast.baselineLbs} lb`} />
            <Stat
              label="Weather Δ"
              value={`${forecast.weatherDeltaLbs >= 0 ? "+" : ""}${forecast.weatherDeltaLbs} lb`}
            />
            <Stat label="Event Δ" value={`+${forecast.eventDeltaLbs} lb`} />
          </div>

          <ul className="space-y-1 text-xs text-muted-foreground">
            {forecast.reasonLines.map((line, i) => (
              <li key={i} className="flex gap-1.5">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-amber-500" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Slot</TableHead>
                  <TableHead className="text-xs">Start</TableHead>
                  <TableHead className="text-right text-xs">lb</TableHead>
                  <TableHead className="text-xs">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLAN_ROWS.map((row) => (
                  <TableRow key={row.slot}>
                    <TableCell className="text-xs font-medium">
                      <span className="inline-flex items-center gap-2">
                        <StateBadge state={row.state} />
                        {row.slot}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.startedAt}
                    </TableCell>
                    <TableCell className="font-mono text-right text-sm font-semibold tabular-nums">
                      {row.lbs}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.note}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </details>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StateBadge({ state }: { state: SpitPlanRow["state"] }) {
  if (state === "carryover")
    return (
      <Badge variant="outline" className="text-[9px]">
        carryover
      </Badge>
    );
  if (state === "active")
    return (
      <Badge className="bg-orange-500 text-[9px] text-white hover:bg-orange-600">
        on rotisserie
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-[9px]">
      planned
    </Badge>
  );
}
