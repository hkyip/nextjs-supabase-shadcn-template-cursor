"use client";

import { DollarSign, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Deck pricing — $33.99 / 2 lb published */
const DOLLARS_PER_LB = 33.99 / 2;
/** Deck network: 80 locations */
const NETWORK_LOCATIONS = 80;

interface Props {
  /** lbs sold today in the running session (computed live) */
  wingsSoldLbsToday: number;
  /** baseline lb/day pre-AI (hardcoded from deck assumptions) */
  baselineLbsPerDay: number;
}

export function RevenueCard({ wingsSoldLbsToday, baselineLbsPerDay }: Props) {
  const lbsDelta = Math.max(0, wingsSoldLbsToday - baselineLbsPerDay);
  const dollarsToday = lbsDelta * DOLLARS_PER_LB;
  const dollarsNetworkDay = dollarsToday * NETWORK_LOCATIONS;
  const dollarsAnnualNetwork = dollarsNetworkDay * 365;

  return (
    <Card className="border-emerald-300/60">
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <DollarSign className="size-4 text-emerald-600" aria-hidden />
            Revenue opportunity
          </CardTitle>
          <Badge variant="outline" className="font-mono text-[10px]">
            ${DOLLARS_PER_LB.toFixed(2)} / lb
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 pb-4">
        <Tile
          label="Per location · today"
          value={fmtMoney(dollarsToday)}
          sub={`+${lbsDelta.toFixed(1)} lb vs baseline`}
        />
        <Tile
          label="Network · per day"
          value={fmtMoney(dollarsNetworkDay)}
          sub={`× ${NETWORK_LOCATIONS} locations`}
        />
        <Tile
          label="Network · annualized"
          value={fmtMoney(dollarsAnnualNetwork)}
          sub="365-day extrapolation"
          accent
        />
      </CardContent>
    </Card>
  );
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-muted/20 p-2.5",
        accent ? "border-emerald-400/70" : "",
      )}
    >
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {accent ? <TrendingUp className="size-3" /> : null}
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-lg font-extrabold tabular-nums leading-none",
          accent ? "text-emerald-700 dark:text-emerald-300" : "",
        )}
      >
        {value}
      </p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${n.toFixed(2)}`;
}
