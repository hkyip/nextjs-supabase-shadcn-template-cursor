"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";

import type { RemoteCommand } from "@/lib/demo-commands";
import { parseRemoteCommand } from "@/lib/demo-commands";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Remote channel hook
//
// Wraps a single Supabase Realtime broadcast channel per room. Soft-degrades
// when env vars are missing so the local Command Deck keeps working.
// ---------------------------------------------------------------------------

export type RemoteStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "error";

const BROADCAST_EVENT = "command";

function channelName(room: string): string {
  return `forkcast:room:${room}`;
}

function tryCreateClient(): SupabaseClient | null {
  try {
    return createClient();
  } catch {
    // Env vars not configured — realtime silently disabled.
    return null;
  }
}

type Options = {
  room: string;
  onCommand?: (command: RemoteCommand) => void;
};

export type UseRemoteChannel = {
  status: RemoteStatus;
  publish: (command: RemoteCommand) => Promise<boolean>;
};

export function useRemoteChannel({
  room,
  onCommand,
}: Options): UseRemoteChannel {
  // Create the Supabase client once per hook instance so we can short-circuit
  // when the realtime env vars are missing without calling setState in an effect.
  const client = useMemo<SupabaseClient | null>(() => tryCreateClient(), []);
  const [status, setStatus] = useState<RemoteStatus>(() =>
    client ? "connecting" : "disabled",
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onCommandRef = useRef(onCommand);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    if (!client) return;

    const channel = client.channel(channelName(room), {
      config: { broadcast: { self: false, ack: true } },
    });

    channel.on("broadcast", { event: BROADCAST_EVENT }, (message) => {
      const command = parseRemoteCommand(message.payload);
      if (!command) {
        // Unknown payload — ignore but keep the channel healthy.
        return;
      }
      onCommandRef.current?.(command);
    });

    channel.subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") setStatus("connected");
      else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
        setStatus("error");
      } else if (subStatus === "CLOSED") {
        setStatus("connecting");
      }
    });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [client, room]);

  const publish = useCallback(
    async (command: RemoteCommand): Promise<boolean> => {
      const channel = channelRef.current;
      if (!channel) return false;
      try {
        const result = await channel.send({
          type: "broadcast",
          event: BROADCAST_EVENT,
          payload: command,
        });
        return result === "ok";
      } catch {
        return false;
      }
    },
    [],
  );

  return { status, publish };
}

export function statusLabel(status: RemoteStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "error":
      return "Connection error";
    case "disabled":
      return "Realtime disabled";
  }
}
