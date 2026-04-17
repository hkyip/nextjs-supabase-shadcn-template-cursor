"use client";

import { Radio, Store } from "lucide-react";

import {
  formatWallClockMs,
  METHOD_BUTTONS,
} from "@/components/production/capture-method-affordance";
import { useKeyedQuantityPulse } from "@/components/production/use-keyed-quantity-pulse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CaptureMethod } from "@/lib/mock-data";
import { MENU_ITEMS } from "@/lib/mock-data";
import type { IncomingOrder } from "@/lib/use-production-state";
import { cn } from "@/lib/utils";

type Props = {
  orders: IncomingOrder[];
  onFulfill: (orderId: string, method: CaptureMethod) => void;
};

export function IncomingOrdersColumn({ orders, onFulfill }: Props) {
  const pulsing = useKeyedQuantityPulse(orders, {
    pulseOnAdd: true,
    pulseOnDecrease: true,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-background sticky top-0 z-20 -mx-1 space-y-1 border-b px-1 py-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
            Incoming orders
          </h2>
          <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
            {orders.length}
          </Badge>
        </div>
        <p className="text-muted-foreground text-[10px] leading-snug"></p>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
          No queued tickets. Use <span className="font-mono">/pos</span> or{" "}
          <span className="font-mono">/remote</span> Serving orders (same room).
        </p>
      ) : (
        orders.map((order) => {
          const mi = MENU_ITEMS.find((m) => m.id === order.menuItemId)!;
          const fromPos = order.orderSource === "pos";
          return (
            <Card
              key={order.id}
              className={cn(
                "border-2 transition-shadow",
                fromPos
                  ? "border-orange-400/50 bg-orange-500/5"
                  : "border-sky-400/50 bg-sky-500/5",
                pulsing.has(order.id) && "animate-production-card-pulse",
              )}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base leading-tight font-bold">
                      {mi.name}
                    </p>
                    <p className="mt-1 text-3xl leading-none font-black tabular-nums">
                      ×{order.quantity}
                    </p>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-[11px]">
                      &ldquo;{order.narration}&rdquo;
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-muted-foreground text-[10px] tabular-nums">
                      {formatWallClockMs(order.receivedAtMs)}
                    </span>
                    {fromPos ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-[10px] text-orange-800 dark:text-orange-200"
                      >
                        <Store className="size-3" />
                        POS
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 text-[10px] text-sky-800 dark:text-sky-200"
                      >
                        <Radio className="size-3" />
                        Remote
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {METHOD_BUTTONS.map(
                    ({ method, label, icon: Icon, className }) => (
                      <Button
                        key={method}
                        variant="outline"
                        className={cn(
                          "min-h-[44px] flex-1 gap-1.5 text-xs",
                          className,
                        )}
                        onClick={() => onFulfill(order.id, method)}
                      >
                        <Icon className="size-4 shrink-0" />
                        {label}
                      </Button>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
