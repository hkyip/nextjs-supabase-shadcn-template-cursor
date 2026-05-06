"use client";

import { ChevronDown, Settings2, Tv2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScenarioPreset, WingsConfigV1 } from "@/lib/wings/types";

interface Props {
  config: WingsConfigV1;
  gameEndingAtMs: number | null;
  nowMs: number;
  onConfigChange: (next: Partial<WingsConfigV1>) => void;
  onApplyScenario: (s: ScenarioPreset) => void;
  onTriggerGameEvent: (minutesFromNow: number) => void;
  onClearGameEvent: () => void;
}

const BASKET_OPTIONS: WingsConfigV1["basketCount"][] = [2, 3, 4, 5, 6];
const HOLD_DECAY_OPTIONS = [5, 10, 15, 20];
const SCENARIOS: { id: ScenarioPreset; label: string; sub: string }[] = [
  { id: "calm", label: "Calm", sub: "mid-shift, light demand" },
  { id: "pre-rush", label: "Pre-rush", sub: "10 min before game ends" },
  { id: "peak", label: "Peak", sub: "rush in progress, baskets full" },
];

export function ConfigCard({
  config,
  gameEndingAtMs,
  nowMs,
  onConfigChange,
  onApplyScenario,
  onTriggerGameEvent,
  onClearGameEvent,
}: Props) {
  const gameLabel =
    gameEndingAtMs != null
      ? new Date(gameEndingAtMs).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
  const minutesUntilGame =
    gameEndingAtMs != null
      ? Math.round((gameEndingAtMs - nowMs) / 60_000)
      : null;

  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">Demo configuration</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {config.basketCount} baskets
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              hold {config.holdDecayMinutes}m
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {config.scenario}
            </Badge>
            {gameLabel ? (
              <Badge className="bg-violet-600 text-[10px] text-white hover:bg-violet-700">
                <Tv2 className="mr-1 size-3" /> game ends {gameLabel}
                {minutesUntilGame != null
                  ? ` · in ${minutesUntilGame}m`
                  : null}
              </Badge>
            ) : null}
          </div>
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <CardContent className="space-y-5 pt-0">
          {/* Basket count */}
          <Row label="Fryer baskets" sub="How many baskets running concurrently">
            <div className="flex flex-wrap gap-1.5">
              {BASKET_OPTIONS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={config.basketCount === n ? "default" : "outline"}
                  className="h-7 px-2 font-mono text-[11px]"
                  onClick={() => onConfigChange({ basketCount: n })}
                >
                  {n}
                </Button>
              ))}
            </div>
          </Row>

          {/* Hold decay */}
          <Row label="Hold decay window" sub="Minutes before cooked wings flag for remake">
            <div className="flex flex-wrap gap-1.5">
              {HOLD_DECAY_OPTIONS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={config.holdDecayMinutes === n ? "default" : "outline"}
                  className="h-7 px-2 font-mono text-[11px]"
                  onClick={() => onConfigChange({ holdDecayMinutes: n })}
                >
                  {n}m
                </Button>
              ))}
            </div>
          </Row>

          {/* Scenario picker */}
          <Row label="Opening scenario" sub="Reseeds the demo state">
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  size="sm"
                  variant={config.scenario === s.id ? "default" : "outline"}
                  className="h-auto flex-col items-start gap-0 px-3 py-1.5 text-left"
                  onClick={() => onApplyScenario(s.id)}
                >
                  <span className="text-xs font-semibold">{s.label}</span>
                  <span
                    className={cn(
                      "text-[9px] font-normal",
                      config.scenario === s.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {s.sub}
                  </span>
                </Button>
              ))}
            </div>
          </Row>

          {/* Game event control */}
          <Row label="Game-ending event" sub="Drives the demand surge">
            <div className="flex flex-wrap gap-1.5">
              {[5, 10, 20].map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => onTriggerGameEvent(m)}
                >
                  Trigger in {m}m
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={onClearGameEvent}
                disabled={gameEndingAtMs == null}
              >
                Clear event
              </Button>
            </div>
          </Row>
        </CardContent>
      </details>
    </Card>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
      <div className="min-w-[180px]">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
