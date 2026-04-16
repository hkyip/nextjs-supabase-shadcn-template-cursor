"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Camera,
  Copy,
  ExternalLink,
  Hand,
  Mic,
  Smartphone,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEMO_SCRIPTS,
  type DemoScript,
  type DemoScriptKind,
} from "@/lib/demo-commands";
import { speak } from "@/lib/speech";
import { useProduction } from "@/lib/use-production-state";
import { cn } from "@/lib/utils";

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
      "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-900 dark:text-blue-100",
  },
  camera: {
    label: "Camera",
    icon: Camera,
    buttonClass:
      "border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 dark:text-purple-100",
  },
  manual: {
    label: "Manual",
    icon: Hand,
    buttonClass:
      "border-muted-foreground/30 bg-muted hover:bg-muted/80 text-foreground",
  },
};

type Props = {
  room: string;
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

const subscribeNoop = () => () => {};

export function CommandDeck({ room }: Props) {
  const { applyCommand } = useProduction();
  const groups = groupScripts();
  const [copied, setCopied] = useState(false);

  // useSyncExternalStore gives us a null server snapshot and a client snapshot
  // derived from window.location — no setState-in-effect dance required.
  const getRemoteUrl = useCallback(() => {
    const url = new URL("/remote", window.location.origin);
    url.searchParams.set("room", room);
    return url.toString();
  }, [room]);
  const remoteUrl = useSyncExternalStore<string | null>(
    subscribeNoop,
    getRemoteUrl,
    () => null,
  );

  const handleCopy = async () => {
    if (!remoteUrl) return;
    try {
      await navigator.clipboard.writeText(remoteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permissions may be unavailable in some browsers; ignore
    }
  };

  return (
    <section
      aria-label="Demo command deck"
      className="bg-card rounded-lg border p-3 shadow-sm"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
            Command Deck
          </h2>
          <Badge variant="secondary" className="text-[10px] tabular-nums">
            Room: {room}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          Simulate inbound voice/camera commands — or pair a phone to drive them
          remotely
        </p>
      </div>

      <div className="space-y-2">
        {(Object.keys(groups) as DemoScriptKind[]).map((kind) => {
          const meta = KIND_META[kind];
          const scripts = groups[kind];
          if (scripts.length === 0) return null;
          const Icon = meta.icon;
          return (
            <div key={kind} className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground flex w-20 shrink-0 items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                <Icon className="size-3.5" />
                {meta.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {scripts.map((script) => (
                  <Button
                    key={script.id}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-auto min-h-[36px] border text-xs",
                      meta.buttonClass,
                    )}
                    onClick={() => {
                      if (script.kind === "voice") {
                        speak(script.command.narration, { lang: "en-US" });
                      }
                      applyCommand(script.command, "local");
                    }}
                  >
                    {script.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <details className="group bg-muted/40 mt-3 rounded-md border px-3 py-2">
        <summary className="text-foreground flex cursor-pointer items-center gap-2 text-xs font-medium">
          <Smartphone className="size-3.5" />
          Pair a remote controller
          <span className="text-muted-foreground ml-auto text-[11px] group-open:hidden">
            scan QR or copy link
          </span>
        </summary>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center justify-center rounded-md bg-white p-3 sm:self-start">
            {remoteUrl ? (
              <QRCodeSVG value={remoteUrl} size={140} level="M" />
            ) : (
              <div className="bg-muted size-[140px] animate-pulse rounded" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-xs">
            <p className="text-muted-foreground">
              Open this URL on a phone to turn it into the demo remote. Both
              screens stay in sync over Supabase Realtime.
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-background flex-1 truncate rounded px-2 py-1 font-mono text-[11px]">
                {remoteUrl ?? ""}
              </code>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 gap-1.5 text-[11px]"
                onClick={handleCopy}
                disabled={!remoteUrl}
              >
                <Copy className="size-3" />
                {copied ? "Copied" : "Copy"}
              </Button>
              {remoteUrl && (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 text-[11px]"
                >
                  <a href={remoteUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3" />
                    Open
                  </a>
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-[11px]">
              Room code{" "}
              <span className="bg-background rounded px-1 py-0.5 font-mono">
                {room}
              </span>{" "}
              — anyone with this code on the same Supabase project can drive the
              screen. Running multiple production tablets on one room will cause
              state drift.
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}
