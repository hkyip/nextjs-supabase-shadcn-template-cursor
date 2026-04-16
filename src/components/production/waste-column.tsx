"use client";

import { Camera, Hand, Mic, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CaptureMethod, WasteEntry } from "@/lib/mock-data";
import { MENU_ITEMS } from "@/lib/mock-data";

type Props = {
  entries: WasteEntry[];
  onConfirmDisposal: (wasteId: string, method: CaptureMethod) => void;
};

export function WasteColumn({ entries, onConfirmDisposal }: Props) {
  const totalCost = entries.reduce((sum, e) => sum + e.estimatedCost, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-20 -mx-1 flex items-center justify-between border-b bg-background px-1 py-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Waste
        </h2>
        <Badge variant="destructive" className="text-xs tabular-nums">
          ${totalCost.toFixed(2)}
        </Badge>
      </div>

      {entries.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Trash2 className="mx-auto mb-2 size-5 text-muted-foreground/50" />
          No waste items
        </div>
      )}

      {entries.map((entry) => {
        const mi = MENU_ITEMS.find((m) => m.id === entry.menuItemId)!;

        return (
          <Card key={entry.id} className="border-2 border-red-500/30 bg-red-500/5">
            <CardContent className="space-y-3 p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold lg:text-lg">{mi.name}</p>
                  <p className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-lg font-black tabular-nums leading-none">
                      {entry.quantity}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {mi.batchMeasurement}
                    </span>
                  </p>
                </div>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  ${entry.estimatedCost.toFixed(2)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">{entry.reason}</p>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="min-h-[44px] flex-1 gap-1.5"
                  onClick={() => onConfirmDisposal(entry.id, "camera")}
                >
                  <Camera className="size-4" />
                  Camera
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] flex-1 gap-1.5"
                  onClick={() => onConfirmDisposal(entry.id, "voice")}
                >
                  <Mic className="size-4" />
                  Voice
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] flex-1 gap-1.5"
                  onClick={() => onConfirmDisposal(entry.id, "manual")}
                >
                  <Hand className="size-4" />
                  Manual
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
