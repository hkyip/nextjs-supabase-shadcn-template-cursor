"use client";

import { useCallback, useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

import {
  AlertBanner,
  type ShownAlertInstance,
} from "@/components/production/alert-banner";
import { CommandOverlay } from "@/components/production/command-overlay";
import { CookingColumn } from "@/components/production/cooking-column";
import { HeldColumn } from "@/components/production/held-column";
import { WasteColumn } from "@/components/production/waste-column";
import { WhatToCookColumn } from "@/components/production/what-to-cook-column";
import { Button } from "@/components/ui/button";
import type { RemoteCommand } from "@/lib/demo-commands";
import { DEMO_ALERTS } from "@/lib/mock-data";
import { useRemoteChannel } from "@/lib/realtime";
import { useProduction } from "@/lib/use-production-state";
import { cn } from "@/lib/utils";

type Props = {
  room: string;
};

export function ProductionBoard({ room }: Props) {
  const { state, startCooking, confirmDisposal } = useProduction();
  const [fullscreen, setFullscreen] = useState(false);
  const [alertInstances, setAlertInstances] = useState<ShownAlertInstance[]>([]);

  const dismissAlertInstance = useCallback((instanceKey: number) => {
    setAlertInstances((prev) => prev.filter((i) => i.instanceKey !== instanceKey));
  }, []);

  /** Banner UI only — state is updated by {@link ProductionRemoteBridge} in the demo layout. */
  const handleRemoteAlertUi = useCallback((command: RemoteCommand) => {
    if (command.type !== "dynamic-alert") return;
    const def = DEMO_ALERTS.find((a) => a.id === command.alertId);
    if (def) {
      setAlertInstances((prev) => [
        ...prev,
        { instanceKey: Date.now(), alert: def },
      ]);
    }
  }, []);

  useRemoteChannel({ room, onCommand: handleRemoteAlertUi });

  // Keep local state in sync with the browser Fullscreen API (Esc key, OS chrome, etc.)
  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const next = !fullscreen;
    setFullscreen(next);
    try {
      if (next && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else if (!next && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Browser may reject (iframe, sandbox, iOS Safari) — CSS presentation mode still works.
    }
  }, [fullscreen]);

  // Only turn each column into its own scroll container when we actually have a
  // height cap (fullscreen, or lg+ screens). On smaller screens without a cap the
  // page scrolls and sticky column headers anchor to the viewport instead of a
  // zero-height scroll parent.
  const columnScroll = fullscreen
    ? "flex min-h-0 flex-col gap-3 overflow-y-auto max-h-[calc(100vh-7rem)]"
    : "flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:max-h-[calc(100vh-10rem)]";

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        fullscreen &&
          "bg-background fixed inset-0 z-40 overflow-auto p-3 lg:p-4",
      )}
    >
      <CommandOverlay />

      <Button
        variant={fullscreen ? "secondary" : "default"}
        className="fixed right-3 bottom-3 z-50 size-11 rounded-full p-0 shadow-lg lg:right-4 lg:bottom-4"
        onClick={() => void toggleFullscreen()}
        aria-pressed={fullscreen}
        aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {fullscreen ? (
          <Minimize2 className="size-5" />
        ) : (
          <Maximize2 className="size-5" />
        )}
      </Button>

      <AlertBanner
        instances={alertInstances}
        onDismissInstance={dismissAlertInstance}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={columnScroll}>
          <WhatToCookColumn
            items={state.whatToCook}
            onStartCooking={startCooking}
          />
        </div>
        <div className={columnScroll}>
          <CookingColumn batches={state.cooking} />
        </div>
        <div className={columnScroll}>
          <HeldColumn batches={state.held} />
        </div>
        <div className={columnScroll}>
          <WasteColumn
            entries={state.waste}
            onConfirmDisposal={confirmDisposal}
          />
        </div>
      </div>
    </div>
  );
}
