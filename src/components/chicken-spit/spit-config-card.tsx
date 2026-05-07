"use client";

import { ChevronDown, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ChickenSpitConfigV1,
  CookSpeed,
  SpitScenario,
} from "@/lib/chicken-spit/types";

interface Props {
  config: ChickenSpitConfigV1;
  onConfigChange: (next: Partial<ChickenSpitConfigV1>) => void;
  onApplyScenario: (s: SpitScenario) => void;
}

const NUM_SPITS_OPTIONS: ChickenSpitConfigV1["numSpits"][] = [1, 2, 3];
const COOK_SPEEDS: { id: CookSpeed; label: string; sub: string }[] = [
  { id: "low", label: "Low", sub: "slowest cook · longest hold" },
  { id: "medium", label: "Medium", sub: "default" },
  { id: "high", label: "High", sub: "fastest · risk of overcook" },
];
const SCENARIOS: { id: SpitScenario; label: string; sub: string }[] = [
  { id: "calm", label: "Calm", sub: "off-peak, low POS" },
  { id: "lunch", label: "Lunch", sub: "11–2 rush" },
  { id: "dinner-rush", label: "Dinner rush", sub: "carryover spent, fresh spit cooking" },
];

export function SpitConfigCard({
  config,
  onConfigChange,
  onApplyScenario,
}: Props) {
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">Daily setup</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {config.numSpits} spit{config.numSpits === 1 ? "" : "s"}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {config.cookSpeed} cook
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {config.scenario}
            </Badge>
            {config.carryoverEnabled ? (
              <Badge variant="outline" className="font-mono text-[10px]">
                carryover ON
              </Badge>
            ) : null}
          </div>
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <CardContent className="space-y-5 pt-0">
          <Row label="Number of spits" sub="Built in the AM (deck §1)">
            <div className="flex flex-wrap gap-1.5">
              {NUM_SPITS_OPTIONS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={config.numSpits === n ? "default" : "outline"}
                  className="h-7 px-2 font-mono text-[11px]"
                  onClick={() => onConfigChange({ numSpits: n })}
                >
                  {n}
                </Button>
              ))}
            </div>
          </Row>

          <Row label="Cook speed" sub="Low / Medium / High (deck §1)">
            <div className="flex flex-wrap gap-1.5">
              {COOK_SPEEDS.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  size="sm"
                  variant={config.cookSpeed === c.id ? "default" : "outline"}
                  className="h-auto flex-col items-start gap-0 px-3 py-1.5 text-left"
                  onClick={() => onConfigChange({ cookSpeed: c.id })}
                >
                  <span className="text-xs font-semibold">{c.label}</span>
                  <span
                    className={cn(
                      "text-[9px] font-normal",
                      config.cookSpeed === c.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {c.sub}
                  </span>
                </Button>
              ))}
            </div>
          </Row>

          <Row label="Carryover from prior night" sub="Pre-loaded spit on rotisserie at open">
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={config.carryoverEnabled ? "default" : "outline"}
                className="h-7 px-3 text-[11px]"
                onClick={() => onConfigChange({ carryoverEnabled: true })}
              >
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!config.carryoverEnabled ? "default" : "outline"}
                className="h-7 px-3 text-[11px]"
                onClick={() => onConfigChange({ carryoverEnabled: false })}
              >
                No
              </Button>
            </div>
          </Row>

          <Row label="Scenario" sub="Reseeds the demo state">
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
