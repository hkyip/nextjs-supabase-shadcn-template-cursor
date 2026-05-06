"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CoachEvent } from "@/lib/wings/types";

interface Props {
  events: CoachEvent[];
  acknowledgedIds: string[];
  onAcknowledge: (id: string) => void;
}

export function CoachFeedCard({ events, acknowledgedIds, onAcknowledge }: Props) {
  const ack = new Set(acknowledgedIds);
  const live = events.filter((e) => !ack.has(e.id));
  const past = events.filter((e) => ack.has(e.id)).slice(-3).reverse();

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
          <span className="flex items-center gap-2">
            <MessageCircle className="size-4 text-violet-600" aria-hidden />
            Coach feed
          </span>
          {live.length > 0 ? (
            <Badge className="bg-rose-600 text-[10px] text-white hover:bg-rose-700">
              {live.length}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              all clear
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-4">
        {live.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No coaching cues right now.
          </p>
        ) : (
          live.slice(0, 4).map((e) => (
            <Row key={e.id} ev={e} onAcknowledge={onAcknowledge} />
          ))
        )}
        {past.length > 0 ? (
          <div className="space-y-1 border-t border-border/60 pt-2 mt-2">
            {past.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <CheckCircle2 className="size-3 shrink-0 text-emerald-500" aria-hidden />
                <span className="truncate">{e.message}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Row({
  ev,
  onAcknowledge,
}: {
  ev: CoachEvent;
  onAcknowledge: (id: string) => void;
}) {
  const tone =
    ev.severity === "critical"
      ? { ring: "border-rose-400/70", bg: "bg-rose-50/70 dark:bg-rose-950/30", text: "text-rose-800 dark:text-rose-200", Icon: AlertTriangle, iconColor: "text-rose-600" }
      : ev.severity === "warning"
        ? { ring: "border-amber-300/70", bg: "bg-amber-50/70 dark:bg-amber-950/30", text: "text-amber-800 dark:text-amber-100", Icon: AlertCircle, iconColor: "text-amber-600" }
        : { ring: "border-sky-300/60", bg: "bg-sky-50/60 dark:bg-sky-950/30", text: "text-sky-800 dark:text-sky-200", Icon: AlertCircle, iconColor: "text-sky-600" };
  const Icon = tone.Icon;
  return (
    <div className={cn("flex items-start gap-2 rounded-md border px-2 py-1.5", tone.ring, tone.bg)}>
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone.iconColor)} aria-hidden />
      <p className={cn("flex-1 text-[11px] leading-snug font-medium", tone.text)}>
        {ev.message}
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-[10px]"
        onClick={() => onAcknowledge(ev.id)}
      >
        Ack
      </Button>
    </div>
  );
}
