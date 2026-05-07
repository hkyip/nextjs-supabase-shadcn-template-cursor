"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  /** Bumped each time we want a new toast to fire. */
  triggerKey: number;
  /** Toast text body — what the camera "saw". */
  message: string;
  /** Auto-dismiss after this many ms. Defaults to 2200. */
  durationMs?: number;
}

/** Subtle 2-sec corner toast emulating Vision-AI confirming a basket drop. */
export function VisionToast({
  triggerKey,
  message,
  durationMs = 2200,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (triggerKey <= 0) return;
    // Defer setState through setTimeout(0) — keeps the effect body free of
    // synchronous render-triggering state updates per react-hooks/set-state-in-effect.
    const t0 = window.setTimeout(() => setVisible(true), 0);
    const t1 = window.setTimeout(() => setVisible(false), durationMs);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [triggerKey, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-emerald-400/70 bg-emerald-50/95 px-3 py-2 text-xs font-medium text-emerald-900 shadow-lg backdrop-blur transition-all duration-300 dark:bg-emerald-950/90 dark:text-emerald-100",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0",
      )}
    >
      <Camera className="size-3.5" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
