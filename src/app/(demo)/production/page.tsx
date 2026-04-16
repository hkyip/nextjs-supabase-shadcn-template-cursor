import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductionBoard } from "@/components/production/production-board";
import { LiveClock } from "@/components/station/live-clock";

export const metadata = {
  title: "Production Screen — Forkcast",
};

const DEMO_CHOICES = [
  "Single-tablet layout (all four columns on one screen)",
  "Alerts: visual-only, manual dismiss, stacked in arrival order",
  "Camera fallback: auto-promote on timer completion; manual button fallback everywhere",
  "Remote commands broadcast over Supabase Realtime; production tablet is read/write, /remote is write-only",
] as const;

type Props = {
  searchParams: Promise<{ room?: string | string[] }>;
};

function pickRoom(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() || "demo";
  return value?.trim() || "demo";
}

export default async function ProductionPage({ searchParams }: Props) {
  const params = await searchParams;
  const room = pickRoom(params.room);

  return (
    <div className="mx-auto max-w-[1800px] space-y-3 px-3 py-3 lg:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            Production Screen
          </h1>
          <Badge className="bg-orange-500 text-white hover:bg-orange-600">
            Lunch Rush
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            Room: {room}
          </Badge>
        </div>
        <LiveClock />
      </div>

      <ProductionBoard room={room} />
    </div>
  );
}
