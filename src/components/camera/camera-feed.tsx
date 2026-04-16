"use client";

import { useEffect, useState } from "react";
import { Camera, Hand, Mic } from "lucide-react";

import { LiveFeedCanvas } from "@/components/camera/live-feed-canvas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CaptureMethod, DetectionEventType } from "@/lib/mock-data";
import { useProduction } from "@/lib/use-production-state";
import { cn } from "@/lib/utils";

type BoundingBox = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
};

const BOXES: BoundingBox[] = [
  { id: "bb-1", label: "Chicken (8 pcs)", x: 8, y: 15, w: 28, h: 30, color: "rgb(34, 197, 94)" },
  { id: "bb-2", label: "Fries (6 portions)", x: 40, y: 20, w: 22, h: 25, color: "rgb(234, 179, 8)" },
  { id: "bb-3", label: "Apple Pie (3 pcs)", x: 66, y: 18, w: 26, h: 28, color: "rgb(168, 85, 247)" },
  { id: "bb-4", label: "Hot Hold Station", x: 5, y: 58, w: 90, h: 35, color: "rgb(59, 130, 246)" },
];

const METHOD_ICON: Record<CaptureMethod, typeof Camera> = {
  camera: Camera,
  voice: Mic,
  manual: Hand,
};
const METHOD_LABEL: Record<CaptureMethod, string> = {
  camera: "Camera",
  voice: "Voice",
  manual: "Manual",
};

const TYPE_STYLE: Record<DetectionEventType, string> = {
  "cook-start": "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  "hot-hold": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  inventory: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
  disposal: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
};

const TYPE_LABEL: Record<DetectionEventType, string> = {
  "cook-start": "Cook Start",
  "hot-hold": "Hot Hold Transfer",
  inventory: "Inventory Track",
  disposal: "Disposal",
};

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function CameraFeed() {
  const { state } = useProduction();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pulse the matching bounding box when a recent event touches that item.
  const recentEvent = state.events[0];
  const pulseChicken = recentEvent?.label.includes("Chicken");
  const pulseFries = recentEvent?.label.includes("Fries");
  const pulsePie = recentEvent?.label.includes("Apple Pie");

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="size-2.5 animate-pulse rounded-full bg-red-500" />
              <CardTitle className="text-base">
                Camera Feed — Kitchen Station 1
              </CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {state.cooking.length} cooking · {state.held.length} held
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-neutral-900">
              <LiveFeedCanvas />

              <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white">
                <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                REC
              </div>

              {BOXES.map((box) => {
                const pulses =
                  (box.id === "bb-1" && pulseChicken) ||
                  (box.id === "bb-2" && pulseFries) ||
                  (box.id === "bb-3" && pulsePie);
                return (
                  <div
                    key={box.id}
                    className={cn(
                      "absolute border-2 transition-all",
                      pulses && "animate-pulse",
                    )}
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.w}%`,
                      height: `${box.h}%`,
                      borderColor: box.color,
                    }}
                  >
                    <span
                      className="absolute -top-5 left-0 rounded px-1.5 py-0.5 text-[11px] font-bold text-white"
                      style={{ backgroundColor: box.color }}
                    >
                      {box.label}
                    </span>
                  </div>
                );
              })}

              <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 font-mono text-xs text-white">
                CAM-01 · {formatTimestamp(now)}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {(["camera", "voice", "manual"] as const).map((m) => {
                const Icon = METHOD_ICON[m];
                return (
                  <span key={m} className="flex items-center gap-1.5">
                    <Icon className="size-3.5" />
                    {METHOD_LABEL[m]}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Detection Events</CardTitle>
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {state.events.length} recent
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.events.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Waiting for detection events…
              </div>
            )}
            {state.events.map((event) => {
              const Icon = METHOD_ICON[event.method];
              return (
                <div
                  key={event.id}
                  className="animate-in fade-in slide-in-from-top-1 space-y-1 rounded-lg border p-3 duration-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", TYPE_STYLE[event.type])}
                    >
                      {TYPE_LABEL[event.type]}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatTimestamp(event.timestampMs)}
                    </span>
                  </div>
                  <p className="text-sm">{event.label}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Icon className="size-3" />
                      {METHOD_LABEL[event.method]}
                    </span>
                    <span>
                      Confidence: {Math.round(event.confidence * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
