"use client";

import type { ForecastBreakdown } from "@/lib/forecast-breakdown";
import { FORECAST_DEFAULT_WINDOW_MINUTES } from "@/lib/forecast";
import { cn } from "@/lib/utils";

type Props = {
  breakdown: ForecastBreakdown;
  productName: string;
  windowRangeLabel: string;
  demoUnitScale: number;
  timeZone: string;
};

/** One decimal so the row matches multiply math (whole numbers were confusing). */
function formatUnitsEq(n: number): string {
  const x = Math.round(n * 10) / 10;
  return Number.isInteger(x) ? `${x}` : x.toFixed(1);
}

function StepBox({
  title,
  caption,
  value,
  unit,
  className,
}: {
  title: string;
  caption: string;
  value: string;
  unit?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/40 flex max-w-[6.5rem] min-w-[4.75rem] flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-2 text-center sm:max-w-[7.25rem] sm:min-w-[5.25rem] sm:px-2",
        className,
      )}
    >
      <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {title}
      </span>
      <span className="text-muted-foreground line-clamp-2 min-h-[2rem] text-[10px] leading-snug sm:min-h-[2.25rem]">
        {caption}
      </span>
      <span className="text-foreground text-lg font-bold tabular-nums sm:text-xl">{value}</span>
      {unit ? (
        <span className="text-muted-foreground text-[10px] tabular-nums">{unit}</span>
      ) : null}
    </div>
  );
}

export function ForecastEquationStrip({
  breakdown: bd,
  productName,
  windowRangeLabel,
  demoUnitScale,
  timeZone,
}: Props) {
  const base = formatUnitsEq(bd.steps.baseline);
  const adj = formatUnitsEq(bd.adjustedUnits);
  const v = bd.velocityFactor.toFixed(2);
  const e = bd.eventFactor.toFixed(2);
  const o = bd.operatorFactor.toFixed(2);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground mx-auto max-w-xl text-center text-xs leading-relaxed">
        <span className="text-foreground font-medium">How to read this row:</span> go left to right
        and multiply each box into the running total.{" "}
        <span className="text-foreground font-medium">×1.00</span> means &quot;this step did not
        change the number.&quot; The last box is the full chain multiplied together—not a separate
        guess typed in by hand.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-3 sm:gap-x-1">
        <StepBox
          title="Baseline"
          caption="Typical demand this part of the day"
          value={base}
          unit="units"
        />
        <span className="text-muted-foreground text-lg font-light" aria-hidden>
          ×
        </span>
        <StepBox title="Velocity" caption="Selling faster or slower than usual?" value={v} />
        <span className="text-muted-foreground text-lg font-light" aria-hidden>
          ×
        </span>
        <StepBox title="Events" caption="Crowds, weather, promos…" value={e} />
        <span className="text-muted-foreground text-lg font-light" aria-hidden>
          ×
        </span>
        <StepBox title="Operator" caption="Tiny bump from recent shelf waste" value={o} />
        <span className="text-muted-foreground px-0.5 text-lg font-semibold" aria-hidden>
          ⇒
        </span>
        <StepBox
          title="Adjusted"
          caption="All of the above combined"
          value={adj}
          unit="units"
          className="border-emerald-500/40 bg-emerald-500/10"
        />
      </div>

      <p className="text-muted-foreground text-center text-xs leading-snug">
        <span className="text-foreground font-medium">{productName}</span>
        {" · "}
        next {FORECAST_DEFAULT_WINDOW_MINUTES} min ({windowRangeLabel} · {timeZone}) · bar chart
        scale ×{demoUnitScale} so bars are easier to read
      </p>
    </div>
  );
}
