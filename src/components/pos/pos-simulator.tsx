"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Signal, SignalZero } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RemoteCommand } from "@/lib/demo-commands";
import { MENU_ITEMS } from "@/lib/mock-data";
import { statusLabel, useRemoteChannel } from "@/lib/realtime";
import { cn } from "@/lib/utils";

/** Retail-style prices for the demo POS; ids match `MENU_ITEMS` for production sync. */
const PRICE_CENTS: Record<string, number> = {
  "original-chicken": 899,
  "french-fries": 449,
  "apple-pie": 599,
};

type MenuItem = {
  id: string;
  name: string;
  priceCents: number;
};

const MENU: MenuItem[] = MENU_ITEMS.map((mi) => ({
  id: mi.id,
  name: mi.name,
  priceCents: PRICE_CENTS[mi.id] ?? 599,
}));

type LineKey = string;

type CartLine = {
  key: LineKey;
  item: MenuItem;
  qty: number;
};

type SaleRecord = {
  id: string;
  at: Date;
  lines: { name: string; qty: number }[];
  totalCents: number;
  /** Broadcast to production: ok / partial fail / not configured */
  remote: "na" | "ok" | "partial";
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function makeLineKey(itemId: string): LineKey {
  return itemId;
}

function PosStatusPill({
  status,
}: {
  status: ReturnType<typeof useRemoteChannel>["status"];
}) {
  const ok = status === "connected";
  const dead = status === "error" || status === "disabled";
  const Icon = ok ? Signal : dead ? SignalZero : Signal;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        ok && "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
        status === "connecting" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        status === "error" &&
          "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100",
        status === "disabled" &&
          "border-muted-foreground/30 bg-muted text-muted-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-3",
          (status === "connecting" || ok) && "animate-pulse",
        )}
      />
      {statusLabel(status)}
    </span>
  );
}

type Props = {
  room: string;
};

export function PosSimulator({ room }: Props) {
  const autoLabelId = useId();
  const { status, publish } = useRemoteChannel({ room });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [recent, setRecent] = useState<SaleRecord[]>([]);
  const [autoDemo, setAutoDemo] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const finalizingRef = useRef(false);

  const cartRef = useRef(cart);
  cartRef.current = cart;

  const subtotalCents = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.priceCents * line.qty, 0),
    [cart],
  );

  const broadcastServed = useCallback(
    async (lines: CartLine[]): Promise<"na" | "ok" | "partial"> => {
      if (status === "disabled") return "na";
      let okCount = 0;
      for (const line of lines) {
        const command: RemoteCommand = {
          type: "served",
          menuItemId: line.item.id,
          quantity: line.qty,
          method: "manual",
          narration: `POS sale — ${line.qty}× ${line.item.name}`,
          orderSource: "pos",
        };
        const ok = await publish(command);
        if (ok) okCount += 1;
      }
      if (okCount === lines.length) return "ok";
      if (okCount === 0) return "partial";
      return "partial";
    },
    [publish, status],
  );

  const finalizeSale = useCallback(
    async (lines: CartLine[]): Promise<boolean> => {
      if (lines.length === 0) return false;
      if (finalizingRef.current) return false;
      finalizingRef.current = true;
      setCheckoutPending(true);
      try {
        const totalCents = lines.reduce(
          (sum, line) => sum + line.item.priceCents * line.qty,
          0,
        );
        const remote = await broadcastServed(lines);
        const sale: SaleRecord = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          at: new Date(),
          lines: lines.map((l) => ({ name: l.item.name, qty: l.qty })),
          totalCents,
          remote,
        };
        setRecent((r) => [sale, ...r].slice(0, 20));
        return true;
      } finally {
        finalizingRef.current = false;
        setCheckoutPending(false);
      }
    },
    [broadcastServed],
  );

  const addItem = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const key = makeLineKey(item.id);
      const idx = prev.findIndex((l) => l.key === key);
      if (idx === -1) {
        return [...prev, { key, item, qty: 1 }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
  }, []);

  const completeSale = useCallback(async () => {
    const lines = cartRef.current;
    if (lines.length === 0) return;
    const done = await finalizeSale(lines);
    if (done) setCart([]);
  }, [finalizeSale]);

  const clearCart = useCallback(() => setCart([]), []);

  useEffect(() => {
    if (!autoDemo) return;
    const tick = async () => {
      if (finalizingRef.current) return;
      const current = cartRef.current;
      const shouldCheckout =
        current.length > 0 && (current.length >= 3 || Math.random() < 0.35);
      if (shouldCheckout) {
        const done = await finalizeSale(current);
        if (done) setCart([]);
        return;
      }
      const pick = MENU[Math.floor(Math.random() * MENU.length)]!;
      setCart((prev) => {
        const key = makeLineKey(pick.id);
        const idx = prev.findIndex((l) => l.key === key);
        if (idx === -1) return [...prev, { key, item: pick, qty: 1 }];
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      });
    };
    const id = window.setInterval(() => void tick(), 2200);
    return () => window.clearInterval(id);
  }, [autoDemo, finalizeSale]);

  const realtimeDisabled = status === "disabled";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/40 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Quick keys</CardTitle>
              <CardDescription>
                Tap to add — completing a sale broadcasts{" "}
                <span className="font-mono text-[11px]">served</span> to{" "}
                <strong>Incoming orders</strong> on production; the line pulls from hot
                hold when they tap Camera / Voice / Manual (same room as Remote)
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PosStatusPill status={status} />
              <Badge variant="secondary" className="font-mono text-xs">
                Room: {room}
              </Badge>
              <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                <input
                  id={autoLabelId}
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={autoDemo}
                  onChange={(e) => setAutoDemo(e.target.checked)}
                />
                <label htmlFor={autoLabelId} className="text-sm">
                  Auto-simulate sales
                </label>
              </div>
            </div>
          </div>
        </CardHeader>
        {realtimeDisabled && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-xs text-amber-900 dark:text-amber-100">
            Realtime is not configured — sales complete locally only until{" "}
            <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>{" "}
            are set.
          </div>
        )}
        <CardContent className="pt-6">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {MENU.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addItem(item)}
                className={cn(
                  "flex flex-col items-start rounded-lg border bg-card p-4 text-left shadow-sm transition-colors",
                  "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="font-medium">{item.name}</span>
                <span className="mt-1 text-sm text-muted-foreground">
                  {formatMoney(item.priceCents)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current ticket</CardTitle>
            <CardDescription>
              Completing the ticket queues lines on production; hold is not reduced until
              someone fulfills each line from <strong>Incoming orders</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((line) => (
                    <TableRow key={line.key}>
                      <TableCell className="font-medium">{line.item.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.qty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(line.item.priceCents * line.qty)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(subtotalCents)}
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              className="flex-1 min-w-[8rem]"
              onClick={() => void completeSale()}
              disabled={cart.length === 0 || checkoutPending}
            >
              {checkoutPending ? "Sending…" : "Complete sale"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearCart}
              disabled={cart.length === 0 || checkoutPending}
            >
              Clear
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent sales</CardTitle>
            <CardDescription>
              Last completed tickets — realtime delivery status (kitchen still fulfills
              from hold separately)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Completed sales appear here.
              </p>
            ) : (
              <ul className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {recent.map((sale) => (
                  <li
                    key={sale.id}
                    className="rounded-md border bg-muted/30 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {sale.at.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        {sale.remote === "ok" && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal text-emerald-700 dark:text-emerald-300"
                          >
                            Kitchen received
                          </Badge>
                        )}
                        {sale.remote === "partial" && (
                          <Badge variant="destructive" className="text-[10px] font-normal">
                            Sync partial
                          </Badge>
                        )}
                        {sale.remote === "na" && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            Local only
                          </Badge>
                        )}
                        <span className="font-semibold tabular-nums">
                          {formatMoney(sale.totalCents)}
                        </span>
                      </div>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-muted-foreground">
                      {sale.lines.map((l, i) => (
                        <li key={`${sale.id}-${i}`}>
                          {l.qty}× {l.name}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
