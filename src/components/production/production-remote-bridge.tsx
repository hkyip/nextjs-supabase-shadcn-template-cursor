"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

import type { RemoteCommand } from "@/lib/demo-commands";
import { useRemoteChannel } from "@/lib/realtime";
import { useProduction } from "@/lib/use-production-state";

function pickRoom(raw: string | null): string {
  return raw?.trim() || "demo";
}

/**
 * Subscribes to Supabase remote commands for the current URL `room` (default `demo`)
 * on every demo route, so `/fry-kitchen` (demand curve) and `/production` stay aligned without mounting
 * {@link ProductionBoard}.
 */
export function ProductionRemoteBridge() {
  const searchParams = useSearchParams();
  const room = pickRoom(searchParams.get("room"));
  const { applyCommand } = useProduction();

  const onCommand = useCallback(
    (command: RemoteCommand) => {
      applyCommand(command, "remote");
    },
    [applyCommand],
  );

  useRemoteChannel({ room, onCommand });
  return null;
}
