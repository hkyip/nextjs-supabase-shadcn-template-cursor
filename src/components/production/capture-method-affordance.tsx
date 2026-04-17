"use client";

import { Camera, Hand, Mic } from "lucide-react";

import type { CaptureMethod } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const METHOD_BUTTONS: Array<{
  method: CaptureMethod;
  label: string;
  icon: typeof Camera;
  className: string;
}> = [
  {
    method: "camera",
    label: "Camera",
    icon: Camera,
    className:
      "border-purple-400/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 dark:text-purple-100",
  },
  {
    method: "voice",
    label: "Voice",
    icon: Mic,
    className:
      "border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-900 dark:text-blue-100",
  },
  {
    method: "manual",
    label: "Manual",
    icon: Hand,
    className:
      "border-muted-foreground/30 bg-muted hover:bg-muted/80 text-foreground",
  },
];

export function formatWallClockMs(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Non-interactive Camera / Voice / Manual row matching incoming-order styling. */
export function CaptureMethodHintRow({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex gap-2", className)}
      role="note"
      aria-label="Next step can be logged with Camera, Voice, or Manual"
    >
      {METHOD_BUTTONS.map(({ method, label, icon: Icon, className: chip }) => (
        <div
          key={method}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-medium select-none",
            chip,
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </div>
      ))}
    </div>
  );
}
