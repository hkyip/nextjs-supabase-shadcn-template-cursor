"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DropNowItem } from "@/lib/mock-data";

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DropNowCard({ item }: { item: DropNowItem }) {
  const [secondsLeft, setSecondsLeft] = useState(item.demandInSeconds);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : item.demandInSeconds));
    }, 1000);
    return () => clearInterval(id);
  }, [item.demandInSeconds]);

  const confidencePct = Math.round(item.confidence * 100);

  return (
    <Card className="relative overflow-hidden border-2 border-orange-500/40 bg-orange-500/5">
      <div className="absolute top-0 right-0 left-0 h-1 bg-orange-500" />
      <CardContent className="flex flex-col items-center gap-2 p-6">
        <Flame className="size-8 text-orange-500" />
        <p className="text-5xl font-black tabular-nums leading-none">
          {item.quantity}
        </p>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {item.unit}
        </p>
        <p className="text-lg font-semibold">{item.name}</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="tabular-nums">
            Demand in {formatCountdown(secondsLeft)}
          </Badge>
          <Badge variant="secondary">{confidencePct}%</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
