"use client";

import { Bike, Car, ListChecks, ShoppingBag, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { slaRemainingSeconds } from "@/lib/wings/orders";
import { CHANNEL_LABEL } from "@/lib/wings/types";
import type { OrderChannel, WingOrder } from "@/lib/wings/types";

interface Props {
  ordersOpen: WingOrder[];
  nowMs: number;
}

const ICON_FOR: Record<OrderChannel, typeof Utensils> = {
  "dine-in": Utensils,
  "uber-eats": Bike,
  skip: Car,
  pickup: ShoppingBag,
};

const CHANNEL_TINT: Record<OrderChannel, string> = {
  "dine-in": "text-emerald-600",
  "uber-eats": "text-zinc-700 dark:text-zinc-200",
  skip: "text-orange-600",
  pickup: "text-sky-600",
};

export function OrderQueueCard({ ordersOpen, nowMs }: Props) {
  const sorted = [...ordersOpen].sort(
    (a, b) => slaRemainingSeconds(a, nowMs) - slaRemainingSeconds(b, nowMs),
  );
  const tight = sorted.filter((o) => slaRemainingSeconds(o, nowMs) < 60).length;

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-sky-600" aria-hidden />
            Open orders
          </CardTitle>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="font-mono text-[10px]">
              {ordersOpen.length} open
            </Badge>
            {tight > 0 ? (
              <Badge className="bg-rose-600 text-[10px] text-white hover:bg-rose-700">
                {tight} SLA tight
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-4">
        {sorted.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No open orders.</p>
        ) : (
          sorted.slice(0, 8).map((o) => (
            <OrderRow key={o.id} order={o} now={nowMs} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function OrderRow({ order, now }: { order: WingOrder; now: number }) {
  const remainingS = slaRemainingSeconds(order, now);
  const elapsedS = Math.round((now - order.placedAtMs) / 1000);
  const Icon = ICON_FOR[order.channel];

  const tone =
    remainingS < 0
      ? { row: "border-rose-400/70 bg-rose-50/60 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-200", label: "BREACHED" }
      : remainingS < 60
        ? { row: "border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/30", text: "text-amber-800 dark:text-amber-100", label: "TIGHT" }
        : { row: "border-border bg-background", text: "text-muted-foreground", label: "OK" };

  const slaLabel =
    remainingS < 0
      ? `${Math.abs(remainingS)}s over`
      : `${Math.floor(remainingS / 60)}:${(remainingS % 60).toString().padStart(2, "0")}`;

  return (
    <div className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5", tone.row)}>
      <Icon className={cn("size-3.5 shrink-0", CHANNEL_TINT[order.channel])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          #{order.id.split("-").pop()} · {CHANNEL_LABEL[order.channel]}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {order.weightLbs} lb · waiting {Math.floor(elapsedS / 60)}:
          {(elapsedS % 60).toString().padStart(2, "0")}
        </p>
      </div>
      <div className="text-right">
        <p className={cn("font-mono text-[11px] font-semibold tabular-nums", tone.text)}>
          {slaLabel}
        </p>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
          {tone.label}
        </p>
      </div>
    </div>
  );
}
