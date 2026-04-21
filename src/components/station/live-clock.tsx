"use client";

import { useEffect, useState } from "react";

import { STORE } from "@/lib/mock-data";
import { useProduction } from "@/lib/use-production-state";
import { cn } from "@/lib/utils";

/** Same calendar wall fields for real vs demo instants so they compare 1:1 in the store TZ. */
function formatStoreLocal(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

/**
 * Real clock and **demo store** clock, both shown in {@link STORE.timezone}, so after
 * **NOW** on `/remote` the two lines match (until accelerated demo time pulls ahead).
 */
export function LiveClock({ className }: { className?: string }) {
  const { demoNow, state } = useProduction();
  const [wallLabel, setWallLabel] = useState<string>("");

  useEffect(() => {
    function tick() {
      setWallLabel(formatStoreLocal(new Date(), STORE.timezone));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const demoLabel = formatStoreLocal(demoNow, STORE.timezone);

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-right",
        className,
      )}
    >
      <div className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Store wall
        </span>
        <span
          className="font-mono text-lg font-semibold tabular-nums text-foreground"
          title={`Real time in ${STORE.timezone}`}
          suppressHydrationWarning
        >
          {wallLabel || "—"}
        </span>
      </div>
      <span
        className="hidden text-muted-foreground/50 sm:inline"
        aria-hidden
      >
        ·
      </span>
      <div className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Demo store
        </span>
        <span
          className="font-mono text-lg font-semibold tabular-nums text-foreground"
          title={`Virtual clock in ${STORE.timezone} · ${state.demoClock.timeScale}× wall`}
          suppressHydrationWarning
        >
          {demoLabel}
        </span>
      </div>
    </div>
  );
}
