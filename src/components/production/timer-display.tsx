import { cn } from "@/lib/utils";

type Props = {
  seconds: number;
  className?: string;
};

/**
 * Large countdown numerals for production cards.
 *
 * We render `M`, `:`, `SS` as separate spans so we can:
 *   - Keep digits on `tabular-nums` (aligned column widths while ticking)
 *   - Make the colon narrow and muted (instead of a full-width mono cell)
 *   - Stay in the display sans-serif — no `font-mono` drift
 */
export function TimerDisplay({ seconds, className }: Props) {
  const abs = Math.max(0, Math.abs(seconds));
  const minutes = Math.floor(abs / 60);
  const secs = abs % 60;
  const negative = seconds < 0;

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-black leading-none tracking-tight tabular-nums",
        className,
      )}
      aria-label={`${negative ? "minus " : ""}${minutes} minutes ${secs} seconds`}
    >
      {negative && <span className="mr-0.5">−</span>}
      <span>{minutes}</span>
      <span aria-hidden="true" className="mx-[0.08em] opacity-60">
        :
      </span>
      <span>{secs.toString().padStart(2, "0")}</span>
    </span>
  );
}
