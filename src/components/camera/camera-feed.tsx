"use client";

import { useEffect, useState } from "react";
import { Camera, Hand, Mic } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Simulated detection events that cycle through the demo
// ---------------------------------------------------------------------------

type DetectionEvent = {
  id: string;
  timestamp: string;
  label: string;
  type: "cook-start" | "hot-hold" | "inventory" | "disposal";
  method: "camera" | "voice" | "manual";
  confidence: number;
};

const EVENTS: DetectionEvent[] = [
  { id: "ev-1", timestamp: "12:31:04 PM", label: "Cook start detected — Original Chicken (8 pcs)", type: "cook-start", method: "camera", confidence: 0.97 },
  { id: "ev-2", timestamp: "12:31:18 PM", label: "Cook start detected — French Fries (6 portions)", type: "cook-start", method: "voice", confidence: 0.94 },
  { id: "ev-3", timestamp: "12:34:42 PM", label: "Transfer to hot hold — French Fries (6 portions)", type: "hot-hold", method: "camera", confidence: 0.96 },
  { id: "ev-4", timestamp: "12:38:15 PM", label: "Inventory count — Original Chicken: 14 pcs in hold", type: "inventory", method: "camera", confidence: 0.92 },
  { id: "ev-5", timestamp: "12:41:04 PM", label: "Transfer to hot hold — Original Chicken (8 pcs)", type: "hot-hold", method: "camera", confidence: 0.98 },
  { id: "ev-6", timestamp: "12:52:30 PM", label: "Disposal confirmed — French Fries (3 portions expired)", type: "disposal", method: "manual", confidence: 1.0 },
];

// ---------------------------------------------------------------------------
// Bounding box overlays on the "camera feed"
// ---------------------------------------------------------------------------

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

const METHOD_ICON = { camera: Camera, voice: Mic, manual: Hand } as const;
const METHOD_LABEL = { camera: "Camera", voice: "Voice", manual: "Manual" } as const;

const TYPE_STYLE = {
  "cook-start": "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  "hot-hold": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  inventory: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
  disposal: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
} as const;

const TYPE_LABEL = {
  "cook-start": "Cook Start",
  "hot-hold": "Hot Hold Transfer",
  inventory: "Inventory Track",
  disposal: "Disposal",
} as const;

export function CameraFeed() {
  const [visibleCount, setVisibleCount] = useState(2);

  useEffect(() => {
    if (visibleCount >= EVENTS.length) return;
    const timer = setTimeout(
      () => setVisibleCount((c) => Math.min(c + 1, EVENTS.length)),
      5000,
    );
    return () => clearTimeout(timer);
  }, [visibleCount]);

  const visibleEvents = EVENTS.slice(0, visibleCount);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Camera viewport */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="size-2.5 animate-pulse rounded-full bg-red-500" />
              <CardTitle className="text-base">Camera Feed — Kitchen Station 1</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-neutral-900">
              {/* Simulated camera noise background */}
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-800" />

              {/* Grid overlay */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Kitchen surface areas */}
              <div className="absolute left-[6%] top-[10%] h-[42%] w-[56%] rounded border border-dashed border-white/20 bg-white/5">
                <span className="absolute left-2 top-1 text-[10px] font-medium text-white/40">
                  COOKING SURFACE
                </span>
              </div>
              <div className="absolute left-[4%] top-[55%] h-[38%] w-[92%] rounded border border-dashed border-white/20 bg-white/5">
                <span className="absolute left-2 top-1 text-[10px] font-medium text-white/40">
                  HOT HOLD STATION
                </span>
              </div>

              {/* Bounding boxes */}
              {BOXES.map((box) => (
                <div
                  key={box.id}
                  className="absolute border-2 transition-all"
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
              ))}

              {/* Timestamp overlay */}
              <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 font-mono text-xs text-white">
                CAM-01 &middot; LIVE
              </div>
            </div>

            {/* Input method legend */}
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

      {/* Event log */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detection Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleEvents.map((event) => {
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
                      {event.timestamp}
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
