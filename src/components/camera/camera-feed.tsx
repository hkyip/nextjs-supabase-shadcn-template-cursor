"use client";

import {
  useCallback,
  useEffect,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  Camera,
  Flame,
  Hand,
  Mic,
  PackageCheck,
  Thermometer,
  Trash2,
} from "lucide-react";

import { LiveFeedCanvas } from "@/components/camera/live-feed-canvas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RemoteCommand } from "@/lib/demo-commands";
import type { CaptureMethod, DetectionEventType } from "@/lib/mock-data";
import { useRemoteChannel } from "@/lib/realtime";
import { useProduction } from "@/lib/use-production-state";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Bounding-box overlay (AI detection regions drawn on top of the canvas).
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

// ---------------------------------------------------------------------------
// Draggable pieces — positions mirror the procedural layout in
// live-feed-canvas.tsx so the handles sit exactly on top of the rendered food.
// Values are percentages of the camera frame.
// ---------------------------------------------------------------------------

type DragItemKind = "chicken" | "pie";

type Piece = {
  id: string;
  x: number;
  y: number;
  kind: DragItemKind;
};

// Chicken region: { x: 0.08, y: 0.15, w: 0.28, h: 0.3 } → 2 rows × 4 cols grid.
const CHICKEN_PIECES: Piece[] = [
  { id: "chicken-00", x: 11.5, y: 22.5, kind: "chicken" },
  { id: "chicken-01", x: 18.5, y: 22.5, kind: "chicken" },
  { id: "chicken-02", x: 25.5, y: 22.5, kind: "chicken" },
  { id: "chicken-03", x: 32.5, y: 22.5, kind: "chicken" },
  { id: "chicken-10", x: 11.5, y: 37.5, kind: "chicken" },
  { id: "chicken-11", x: 18.5, y: 37.5, kind: "chicken" },
  { id: "chicken-12", x: 25.5, y: 37.5, kind: "chicken" },
  { id: "chicken-13", x: 32.5, y: 37.5, kind: "chicken" },
];

// Pie region: { x: 0.66, y: 0.18, w: 0.26, h: 0.28 } → 3 turnovers in a triangle.
const PIE_PIECES: Piece[] = [
  { id: "pie-0", x: 73.8, y: 27.8, kind: "pie" },
  { id: "pie-1", x: 84.2, y: 27.8, kind: "pie" },
  { id: "pie-2", x: 79.0, y: 38.2, kind: "pie" },
];

const DRAGGABLE_PIECES: Piece[] = [...CHICKEN_PIECES, ...PIE_PIECES];

// Custom MIME type avoids collisions with browser-level drag payloads (images,
// text, etc.) and lets us round-trip a small JSON envelope.
const DRAG_MIME = "application/x-forkcast-piece";

type DragPayload = { kind: DragItemKind };

function encodePayload(payload: DragPayload): string {
  return JSON.stringify(payload);
}

function decodePayload(raw: string): DragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "kind" in parsed &&
      ((parsed as { kind: unknown }).kind === "chicken" ||
        (parsed as { kind: unknown }).kind === "pie")
    ) {
      return parsed as DragPayload;
    }
  } catch {
    // fall through
  }
  return null;
}

type DropAction = "cook" | "hold" | "serve" | "dispose";

// Batch sizes mirror MENU_ITEMS.batchSize in src/lib/mock-data.ts. Duplicated
// here intentionally so the camera overlay stays decoupled from the menu data
// module; if batch sizes change, update both or lift to a shared constant.
const COOK_QUANTITY: Record<DragItemKind, number> = {
  chicken: 8,
  pie: 4,
};

function buildCommand(kind: DragItemKind, action: DropAction): RemoteCommand {
  const menuItemId = kind === "chicken" ? "original-chicken" : "apple-pie";
  // Label casing matches the substring checks used by the production UI to
  // pulse the matching bounding box ("Chicken", "Apple Pie").
  const item = kind === "chicken" ? "Chicken" : "Apple Pie";
  switch (action) {
    case "cook": {
      const quantity = COOK_QUANTITY[kind];
      const unit = kind === "chicken" ? "pieces" : "pies";
      return {
        type: "cook-start",
        menuItemId,
        quantity,
        method: "camera",
        narration: `Detected ${quantity} ${item.toLowerCase()} ${unit} on cooking surface`,
      };
    }
    case "hold": {
      const quantity = COOK_QUANTITY[kind];
      return {
        type: "hot-hold",
        menuItemId,
        quantity,
        method: "camera",
        narration: `Detected ${item} transfer to hot hold`,
      };
    }
    case "serve":
      return {
        type: "served",
        menuItemId,
        quantity: 1,
        method: "camera",
        narration: `Detected 1 ${item} being served`,
      };
    case "dispose":
      return {
        type: "disposal",
        menuItemId,
        method: "camera",
        narration: `Detected ${item} disposal`,
      };
  }
}

// ---------------------------------------------------------------------------
// Capture-method / event-type theming (unchanged).
// ---------------------------------------------------------------------------

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

type Props = {
  room: string;
};

export function CameraFeed({ room }: Props) {
  const { state, applyCommand } = useProduction();
  const { publish } = useRemoteChannel({ room });
  const [now, setNow] = useState<number>(() => Date.now());
  const [draggingKind, setDraggingKind] = useState<DragItemKind | null>(null);
  const [flashZone, setFlashZone] = useState<DropAction | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pulse the matching bounding box when a recent event touches that item.
  const recentEvent = state.events[0];
  const pulseChicken = recentEvent?.label.includes("Chicken");
  const pulseFries = recentEvent?.label.includes("Fries");
  const pulsePie = recentEvent?.label.includes("Apple Pie");

  // -------------------------------------------------------------------------
  // Drag handlers
  //
  // We always (a) apply locally so the `/camera` tab's own event feed shows
  // the change immediately, and (b) publish over Supabase Realtime so a
  // `/production?room=…` tab elsewhere picks it up. `self: false` on the
  // channel means there's no echo back to us.
  // -------------------------------------------------------------------------

  const handleDragStart = useCallback(
    (piece: Piece) => (event: DragEvent<HTMLButtonElement>) => {
      const data = encodePayload({ kind: piece.kind });
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(DRAG_MIME, data);
      event.dataTransfer.setData("text/plain", piece.kind);
      setDraggingKind(piece.kind);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingKind(null);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (action: DropAction) => (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDraggingKind(null);

      const rawCustom = event.dataTransfer.getData(DRAG_MIME);
      let payload = decodePayload(rawCustom);
      if (!payload) {
        const fallback = event.dataTransfer.getData("text/plain");
        if (fallback === "chicken" || fallback === "pie") {
          payload = { kind: fallback };
        }
      }
      if (!payload) return;

      const command = buildCommand(payload.kind, action);
      applyCommand(command, "local");
      void publish(command);

      setFlashZone(action);
      window.setTimeout(() => setFlashZone(null), 450);
    },
    [applyCommand, publish],
  );

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
                      "pointer-events-none absolute border-2 transition-all",
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

              {DRAGGABLE_PIECES.map((piece) => (
                <DraggablePiece
                  key={piece.id}
                  piece={piece}
                  onDragStart={handleDragStart(piece)}
                  onDragEnd={handleDragEnd}
                />
              ))}

              <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 font-mono text-xs text-white">
                CAM-01 · {formatTimestamp(now)}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DropZone
                action="cook"
                label="Cook Start"
                description="Add a new cooking batch"
                icon={<Flame className="size-4" />}
                accent="amber"
                active={draggingKind !== null}
                flashing={flashZone === "cook"}
                onDragOver={handleDragOver}
                onDrop={handleDrop("cook")}
              />
              <DropZone
                action="hold"
                label="Hot Hold"
                description="Promote cooking to held"
                icon={<Thermometer className="size-4" />}
                accent="blue"
                active={draggingKind !== null}
                flashing={flashZone === "hold"}
                onDragOver={handleDragOver}
                onDrop={handleDrop("hold")}
              />
              <DropZone
                action="serve"
                label="Serve"
                description="Deduct 1 from hot hold"
                icon={<PackageCheck className="size-4" />}
                accent="emerald"
                active={draggingKind !== null}
                flashing={flashZone === "serve"}
                onDragOver={handleDragOver}
                onDrop={handleDrop("serve")}
              />
              <DropZone
                action="dispose"
                label="Dispose"
                description="Log a disposal event"
                icon={<Trash2 className="size-4" />}
                accent="red"
                active={draggingKind !== null}
                flashing={flashZone === "dispose"}
                onDragOver={handleDragOver}
                onDrop={handleDrop("dispose")}
              />
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
              <span className="ml-auto text-[11px]">
                Drag chicken or apple pie to a zone — syncs to{" "}
                <span className="font-mono">/production?room={room}</span>
              </span>
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

// ---------------------------------------------------------------------------
// Presentational sub-components
// ---------------------------------------------------------------------------

const PIECE_SIZE_PCT = { chicken: 6, pie: 8 } as const;

function DraggablePiece({
  piece,
  onDragStart,
  onDragEnd,
}: {
  piece: Piece;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}) {
  const size = PIECE_SIZE_PCT[piece.kind];
  const ringColor =
    piece.kind === "chicken"
      ? "ring-emerald-400/60 hover:ring-emerald-300/90"
      : "ring-purple-400/60 hover:ring-purple-300/90";
  const aria =
    piece.kind === "chicken" ? "Chicken piece" : "Apple pie";
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={`Drag ${aria}`}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-transparent ring-2 transition-all active:cursor-grabbing active:scale-95 active:ring-white",
        ringColor,
      )}
      style={{
        left: `${piece.x}%`,
        top: `${piece.y}%`,
        width: `${size}%`,
        // Maintain a circular handle by sizing height off width via padding-top.
        aspectRatio: "1 / 1",
      }}
    />
  );
}

type ZoneAccent = "amber" | "blue" | "emerald" | "red";

const ZONE_ACCENT: Record<
  ZoneAccent,
  { base: string; active: string; flash: string; iconBg: string }
> = {
  amber: {
    base: "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-100",
    active: "border-amber-400 bg-amber-500/15",
    flash: "border-amber-400 bg-amber-500/30",
    iconBg: "bg-amber-500/20",
  },
  blue: {
    base: "border-blue-500/40 bg-blue-500/5 text-blue-900 dark:text-blue-100",
    active: "border-blue-400 bg-blue-500/15",
    flash: "border-blue-400 bg-blue-500/30",
    iconBg: "bg-blue-500/20",
  },
  emerald: {
    base: "border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100",
    active: "border-emerald-400 bg-emerald-500/15",
    flash: "border-emerald-400 bg-emerald-500/30",
    iconBg: "bg-emerald-500/20",
  },
  red: {
    base: "border-red-500/40 bg-red-500/5 text-red-900 dark:text-red-100",
    active: "border-red-400 bg-red-500/15",
    flash: "border-red-400 bg-red-500/30",
    iconBg: "bg-red-500/20",
  },
};

function DropZone({
  action,
  label,
  description,
  icon,
  accent,
  active,
  flashing,
  onDragOver,
  onDrop,
}: {
  action: DropAction;
  label: string;
  description: string;
  icon: ReactNode;
  accent: ZoneAccent;
  active: boolean;
  flashing: boolean;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const palette = ZONE_ACCENT[accent];
  return (
    <div
      role="button"
      aria-label={`${label} drop zone`}
      data-action={action}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[72px] items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-all",
        palette.base,
        active && palette.active,
        flashing && palette.flash,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          palette.iconBg,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[11px] opacity-80">{description}</div>
      </div>
    </div>
  );
}
