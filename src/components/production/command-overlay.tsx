"use client";

import { useEffect, useState } from "react";
import { Camera, Hand, Mic, Radio } from "lucide-react";

import type { CaptureMethod } from "@/lib/mock-data";
import { useProduction } from "@/lib/use-production-state";
import { cn } from "@/lib/utils";

const OVERLAY_DURATION_MS = 3200;

const METHOD_META: Record<
  CaptureMethod,
  { icon: typeof Camera; label: string; className: string }
> = {
  camera: {
    icon: Camera,
    label: "Camera",
    className:
      "border-purple-400/50 bg-purple-500/95 text-white",
  },
  voice: {
    icon: Mic,
    label: "Voice",
    className: "border-blue-400/50 bg-blue-500/95 text-white",
  },
  manual: {
    icon: Hand,
    label: "Manual",
    className: "border-slate-400/50 bg-slate-700/95 text-white",
  },
};

export function CommandOverlay() {
  const { state } = useProduction();
  const overlay = state.overlay;
  // Track the most recent overlay id that has aged out; we show whenever the
  // current overlay's id !== hiddenId. setState only runs inside a timer, which
  // avoids the synchronous set-state-in-effect anti-pattern.
  const [hiddenId, setHiddenId] = useState<string | null>(null);

  useEffect(() => {
    if (!overlay) return;
    // Only surface commands that came in from the remote controller. Local taps on the
    // Command Deck already provide their own button-press feedback.
    if (overlay.origin !== "remote") return;

    const timer = window.setTimeout(
      () => setHiddenId(overlay.id),
      OVERLAY_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [overlay]);

  const visible =
    overlay !== null &&
    overlay.origin === "remote" &&
    overlay.id !== hiddenId;

  if (!overlay || !visible) return null;

  const meta = METHOD_META[overlay.method];
  const Icon = meta.icon;

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-md items-center gap-3 rounded-full border px-4 py-2 shadow-xl backdrop-blur",
          "animate-in fade-in slide-in-from-top-4 duration-300",
          meta.className,
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
            <Radio className="size-3 animate-pulse" />
            Remote · {meta.label}
          </div>
          <div className="truncate text-sm font-medium">
            &ldquo;{overlay.narration}&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}
