"use client";

import { useCallback, useState } from "react";
import {
  Camera,
  Hand,
  Mic,
  Radio,
  Signal,
  SignalZero,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEMO_SCRIPTS,
  type DemoScript,
  type DemoScriptKind,
  type RemoteCommand,
} from "@/lib/demo-commands";
import { statusLabel, useRemoteChannel } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type SentEntry = {
  id: string;
  script: DemoScript;
  at: number;
  ok: boolean;
};

const KIND_META: Record<
  DemoScriptKind,
  {
    label: string;
    icon: typeof Camera;
    buttonClass: string;
  }
> = {
  voice: {
    label: "Voice",
    icon: Mic,
    buttonClass:
      "border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-900 dark:text-blue-100",
  },
  camera: {
    label: "Camera",
    icon: Camera,
    buttonClass:
      "border-purple-400/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 dark:text-purple-100",
  },
  manual: {
    label: "Manual",
    icon: Hand,
    buttonClass:
      "border-muted-foreground/30 bg-muted hover:bg-muted/80 text-foreground",
  },
};

function groupScripts(): Record<DemoScriptKind, DemoScript[]> {
  const groups: Record<DemoScriptKind, DemoScript[]> = {
    voice: [],
    camera: [],
    manual: [],
  };
  for (const s of DEMO_SCRIPTS) groups[s.kind].push(s);
  return groups;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type Props = {
  room: string;
};

export function RemoteConsole({ room }: Props) {
  const { status, publish } = useRemoteChannel({ room });
  const [sent, setSent] = useState<SentEntry[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const groups = groupScripts();

  const dispatchScript = useCallback(
    async (script: DemoScript) => {
      setPendingId(script.id);
      const ok = await publish(script.command as RemoteCommand);
      setPendingId(null);
      setSent((prev) =>
        [
          {
            id: `${script.id}-${Date.now()}`,
            script,
            at: Date.now(),
            ok,
          },
          ...prev,
        ].slice(0, 12),
      );
    },
    [publish],
  );

  const disabled = status === "disabled";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 pb-8">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Forkcast Remote</h1>
            <p className="text-xs text-muted-foreground">
              Drive the production demo from a second device
            </p>
          </div>
          <StatusPill status={status} />
        </div>
        <div className="rounded-md border bg-card p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Room</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {room}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Keep the production screen open on{" "}
            <span className="font-mono">/production?room={room}</span>.
          </p>
        </div>
        {disabled && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">
            Supabase Realtime is not configured on this deployment. Buttons are
            visible but will not reach the production screen until{" "}
            <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>{" "}
            are set.
          </div>
        )}
      </header>

      <main className="flex-1 space-y-4">
        {(Object.keys(groups) as DemoScriptKind[]).map((kind) => {
          const meta = KIND_META[kind];
          const scripts = groups[kind];
          if (scripts.length === 0) return null;
          const Icon = meta.icon;
          return (
            <section
              key={kind}
              className="rounded-lg border bg-card p-3 shadow-sm"
            >
              <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Icon className="size-3.5" />
                {meta.label}
              </h2>
              <div className="grid gap-2">
                {scripts.map((script) => (
                  <Button
                    key={script.id}
                    variant="outline"
                    className={cn(
                      "h-auto min-h-[52px] justify-start border text-left text-sm",
                      meta.buttonClass,
                    )}
                    disabled={disabled || pendingId === script.id}
                    onClick={() => void dispatchScript(script)}
                  >
                    <div className="flex w-full flex-col gap-0.5">
                      <span className="font-medium">{script.label}</span>
                      <span className="text-[11px] font-normal opacity-70">
                        {commandSummary(script.command as RemoteCommand)}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-lg border bg-card p-3 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Radio className="size-3.5" />
            Sent
          </h2>
          {sent.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No commands sent yet. Tap a button above to broadcast it to the
              production screen.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {sent.map((entry) => {
                const meta = KIND_META[entry.script.kind];
                return (
                  <li
                    key={entry.id}
                    className="flex items-start gap-2 rounded border bg-background/60 p-2"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
                      <meta.icon className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {entry.script.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatTime(entry.at)}
                    </span>
                    <Badge
                      variant={entry.ok ? "secondary" : "destructive"}
                      className="h-4 shrink-0 text-[10px]"
                    >
                      {entry.ok ? "sent" : "failed"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <footer className="pt-2 text-center text-[11px] text-muted-foreground">
        Forkcast V0 demo remote · taps broadcast to the shared room
      </footer>
    </div>
  );
}

function StatusPill({ status }: { status: ReturnType<typeof useRemoteChannel>["status"] }) {
  const ok = status === "connected";
  const dead = status === "error" || status === "disabled";
  const Icon = ok ? Signal : dead ? SignalZero : Signal;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        ok && "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
        status === "connecting" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        status === "error" &&
          "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100",
        status === "disabled" &&
          "border-muted-foreground/30 bg-muted text-muted-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-3",
          status === "connecting" && "animate-pulse",
          ok && "animate-pulse",
        )}
      />
      {statusLabel(status)}
    </span>
  );
}

function commandSummary(command: RemoteCommand): string {
  switch (command.type) {
    case "cook-start":
      return `cook-start · ${command.menuItemId} × ${command.quantity}`;
    case "served":
      return `served · ${command.menuItemId} × ${command.quantity}`;
    case "disposal":
      return command.menuItemId
        ? `disposal · ${command.menuItemId}`
        : "disposal · any";
  }
}
