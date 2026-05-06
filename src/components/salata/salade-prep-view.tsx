"use client";

import {
  type FocusEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { Flame, Leaf, Radar, RotateCcw, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalataLocationMap } from "@/components/salata/salata-location-map";
import { SalataMiniOsmAtPoint, SalataMiniOsmMap } from "@/components/salata/salata-mini-osm-map";
import { cn } from "@/lib/utils";
import { buildPrepPlanItems } from "@/lib/salata/compute";
import { distanceMiles } from "@/lib/salata/geo";
import {
  fakeWebSearchCandidates,
  seedEventSignals,
  MOCK_ON_HAND,
  MOCK_USAGE_LAST_14_BY_WEEKDAY,
} from "@/lib/salata/mock-seed";
import {
  createSalataInitialState,
  loadSalataPersisted,
  overlaySignalDecisions,
  resetSalataPersistence,
  saveSalataPersisted,
  setManagerOverride,
} from "@/lib/salata/persistence";
import {
  SALATA_DEMO_ADDRESS,
  SALATA_DEMO_STORE_ID,
  SALATA_STORE_COORDS,
  type EventSignal,
  type SalataPersistedStateV1,
  type SalataPrepItemId,
} from "@/lib/salata/types";

function laPrepDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const LABEL: Record<SalataPrepItemId, string> = {
  lettuce: "Lettuce",
  onion: "Onion",
  tomato: "Tomato",
};

const inputClassName =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export function SaladePrepView() {
  const [hydrated, setHydrated] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, setState] = useState<SalataPersistedStateV1>(createSalataInitialState);
  const prepDate = useMemo(() => laPrepDate(new Date()), []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setState(loadSalataPersisted());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const seeded = useMemo(() => seedEventSignals(prepDate), [prepDate]);

  const allSignals = useMemo(() => {
    const seededWith = overlaySignalDecisions(
      seeded,
      state.appliedSignalIds ?? [],
      state.ignoredSignalIds ?? [],
    );
    const byId = new Map<string, EventSignal>();
    for (const s of seededWith) byId.set(s.id, s);
    for (const w of state.webCandidates ?? []) {
      if (!byId.has(w.id)) byId.set(w.id, w);
    }
    return [...byId.values()];
  }, [seeded, state.appliedSignalIds, state.ignoredSignalIds, state.webCandidates]);

  const morningPrepSignals = useMemo(
    () => allSignals.filter((s) => s.impactWindow !== "live-watch"),
    [allSignals],
  );

  const liveWatchSignals = useMemo(
    () => allSignals.filter((s) => s.impactWindow === "live-watch"),
    [allSignals],
  );

  const prepItems = useMemo(
    () =>
      buildPrepPlanItems({
        prepDate,
        usageByWeekday: MOCK_USAGE_LAST_14_BY_WEEKDAY,
        onHand: MOCK_ON_HAND,
        signals: morningPrepSignals.filter((s) => s.applied),
        config: state.config,
        managerOverrides: state.managerOverrides,
        savedFinalPrep: state.savedFinalPrep,
      }),
    [
      prepDate,
      morningPrepSignals,
      state.config,
      state.managerOverrides,
      state.savedFinalPrep,
    ],
  );

  const mergedReason =
    prepItems.find((p) => p.reason)?.reason ?? "Adjust event signals below to change recommendations.";

  const persist = useCallback((partial: Partial<SalataPersistedStateV1>) => {
    const next = saveSalataPersisted(partial);
    setState(next);
  }, []);

  const toggleApplied = useCallback(
    (id: string, apply: boolean) => {
      const ignored = new Set(state.ignoredSignalIds ?? []);
      const applied = new Set(state.appliedSignalIds ?? []);
      ignored.delete(id);
      if (apply) applied.add(id);
      else applied.delete(id);
      persist({
        appliedSignalIds: [...applied],
        ignoredSignalIds: [...ignored],
      });
    },
    [persist, state.appliedSignalIds, state.ignoredSignalIds],
  );

  const markIgnored = useCallback(
    (id: string) => {
      const ignored = new Set(state.ignoredSignalIds ?? []);
      const applied = new Set(state.appliedSignalIds ?? []);
      ignored.add(id);
      applied.delete(id);
      persist({
        ignoredSignalIds: [...ignored],
        appliedSignalIds: [...applied],
      });
    },
    [persist, state.appliedSignalIds, state.ignoredSignalIds],
  );

  const clearIgnore = useCallback(
    (id: string) => {
      const ignored = new Set(state.ignoredSignalIds ?? []);
      ignored.delete(id);
      persist({
        ignoredSignalIds: [...ignored],
      });
    },
    [persist, state.ignoredSignalIds],
  );

  const savePrep = useCallback(() => {
    const mapped: Partial<Record<SalataPrepItemId, number>> = {};
    for (const row of prepItems) {
      const ov = state.managerOverrides[row.itemId];
      mapped[row.itemId] = ov ?? row.recommendedPrep;
    }
    persist({
      savedFinalPrep: mapped,
      lastSavedAt: new Date().toISOString(),
    });
  }, [persist, prepItems, state.managerOverrides]);

  const [webLoading, setWebLoading] = useState(false);

  const runWebFetch = useCallback(async () => {
    setWebLoading(true);
    await new Promise((r) => window.setTimeout(r, 850));
    const fresh = fakeWebSearchCandidates(prepDate);
    const existing = state.webCandidates ?? [];
    const seen = new Set(existing.map((e) => e.id));
    const merged = [...existing, ...fresh.filter((x) => !seen.has(x.id))];
    persist({
      webCandidates: merged,
      lastWebFetchAt: new Date().toISOString(),
    });
    setWebLoading(false);
  }, [persist, prepDate, state.webCandidates]);

  const toggleVenueImportant = useCallback(
    (id: string, checked: boolean) => {
      const venues =
        state.venues?.map((v) =>
          v.id === id ? { ...v, manuallyImportant: checked } : v,
        ) ?? [];
      persist({ venues });
    },
    [persist, state.venues],
  );

  const dismissLive = useCallback(
    (id: string) => {
      const next = new Set(state.liveWatchDismissedIds ?? []);
      next.add(id);
      persist({ liveWatchDismissedIds: [...next] });
    },
    [persist, state.liveWatchDismissedIds],
  );

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[1200px] px-3 py-6 text-sm text-muted-foreground">
        Loading Salata prep prototype…
      </div>
    );
  }

  const dismissed = new Set(state.liveWatchDismissedIds ?? []);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-3 py-3 lg:space-y-8 lg:px-4 lg:py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Salata cold prep prototype
          </p>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Salade prep</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {SALATA_DEMO_ADDRESS} ·{" "}
            <span className="font-mono text-[11px] text-foreground/80">
              {SALATA_DEMO_STORE_ID}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="outline" className="font-mono text-[11px]">
              Prep date (LA) {prepDate}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[11px]">
              Morning cutoff {state.config?.morningPrepTime ?? "08:00"}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[11px]">
              Fry-kitchen demo →{" "}
              <Link className="underline underline-offset-2" href="/fry-kitchen">
                /fry-kitchen
              </Link>
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetSalataPersistence();
              setState(loadSalataPersisted());
              setFormKey((x) => x + 1);
            }}
          >
            <RotateCcw className="mr-2 size-4" aria-hidden />
            Reset prototype data
          </Button>
          <Button type="button" size="sm" onClick={() => void savePrep()}>
            <Save className="mr-2 size-4" aria-hidden />
            Save prep plan
          </Button>
        </div>
      </header>

      <SalataLocationMap
        venues={state.venues ?? []}
        walkableRadiusMiles={state.config?.walkableRadiusMiles ?? 1}
      />

      <Card key={formKey}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="size-5 text-emerald-600" aria-hidden />
            Morning prep
          </CardTitle>
          <CardDescription>
            Mocked weekday usage → baseline prep plus applied event / weather deltas (capped).{" "}
            <span className="font-semibold text-foreground">Demo amplification</span> is labelled in
            the UI so stakeholders understand what is amplified for storytelling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-6 lg:gap-8">
            <div className="space-y-2">
              <label htmlFor="salata-max-adjust" className="text-sm font-medium">
                Max adjustment % (cap)
              </label>
              <input
                id="salata-max-adjust"
                className={cn(inputClassName, "w-40")}
                inputMode="numeric"
                defaultValue={String(state.config?.maxAdjustmentPercent ?? 25)}
                key={state.config?.maxAdjustmentPercent ?? 25}
                onBlur={(e: FocusEvent<HTMLInputElement>) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n) || n < 1 || n > 100) return;
                  const rounded = Math.round(n);
                  persist({
                    config: {
                      ...(state.config ?? {}),
                      maxAdjustmentPercent: rounded,
                    },
                  });
                  e.target.value = String(rounded);
                }}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pt-8 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={Boolean(state.config?.demoAmplified)}
                onChange={(e) =>
                  persist({
                    config: {
                      ...(state.config ?? {}),
                      demoAmplified: e.target.checked,
                    },
                  })
                }
              />
              Demo amplification badge
            </label>
          </div>

          {Boolean(state.lastSavedAt) && (
            <p className="text-xs text-muted-foreground">
              Last saved {fmtTime(state.lastSavedAt!)} local
            </p>
          )}

          <p className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-muted-foreground">
            {mergedReason}
          </p>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">OH</TableHead>
                  <TableHead className="text-right">14-day avg</TableHead>
                  <TableHead className="text-right">Baseline prep</TableHead>
                  <TableHead className="text-right">Adj%</TableHead>
                  <TableHead className="text-right">Recommended</TableHead>
                  <TableHead className="min-w-[7rem]">Override</TableHead>
                  <TableHead className="text-right">Final prep</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prepItems.map((row) => {
                  const ov = state.managerOverrides[row.itemId];
                  const finalShown = ov ?? row.finalPrep;
                  return (
                    <TableRow key={row.itemId}>
                      <TableCell className="font-medium">{LABEL[row.itemId]}</TableCell>
                      <TableCell className="font-mono text-right tabular-nums">{row.onHand}</TableCell>
                      <TableCell className="font-mono text-right tabular-nums">
                        {row.baselineUsage}
                      </TableCell>
                      <TableCell className="font-mono text-right tabular-nums">
                        {row.baselinePrep}
                      </TableCell>
                      <TableCell className="font-mono text-right tabular-nums">
                        {row.adjustmentPercent >= 0 ? "+" : ""}
                        {row.adjustmentPercent}%
                        {Boolean(state.config?.demoAmplified) && Math.abs(row.adjustmentPercent) > 12 && (
                          <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                            amplified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-right tabular-nums">
                        {row.recommendedPrep}
                      </TableCell>
                      <TableCell>
                      <input
                        aria-label={`Override ${LABEL[row.itemId]}`}
                        className={cn(inputClassName, "h-9 text-sm")}
                        placeholder="—"
                        defaultValue={
                          ov != null ? String(ov) : ""
                        }
                        onBlur={(e: FocusEvent<HTMLInputElement>) => {
                          const next = setManagerOverride(
                            state.managerOverrides,
                            row.itemId,
                            e.target.value,
                            );
                            persist({ managerOverrides: next });
                            const v = next[row.itemId];
                            e.target.value =
                              v != null ? String(v) : "";
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-right text-base font-semibold tabular-nums">
                        {finalShown}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Prep units are mocked as generic <strong>Unit</strong> placeholders for this prototype (see Salata PDF prep sheet for production units).
          </p>
        </CardContent>
      </Card>

      <Card id="signals">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="size-5 text-sky-600" aria-hidden />
            Event intelligence (hybrid)
          </CardTitle>
          <CardDescription>
            Mock signals load deterministically — “Refresh live event candidates” simulates blended web hits and stores them beside mock data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={webLoading}
              onClick={() => void runWebFetch()}
            >
              {webLoading ? "Refreshing…" : "Refresh live event candidates"}
            </Button>
            {state.lastWebFetchAt ? (
              <span className="text-xs text-muted-foreground">
                Last refreshed {fmtTime(state.lastWebFetchAt)} local
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                No synthetic web fetch yet — click to merge demo candidates.
              </span>
            )}
          </div>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight">Applied to daytime prep math</h2>
            <div className="space-y-3">
              {morningPrepSignals.map((sig) => (
                <MorningSignalCard
                  key={sig.id}
                  signal={sig}
                  onApply={() => toggleApplied(sig.id, true)}
                  onDismiss={() => markIgnored(sig.id)}
                  onUndoIgnore={() => clearIgnore(sig.id)}
                  onRemoveApply={() => toggleApplied(sig.id, false)}
                  maxPct={state.config?.maxAdjustmentPercent ?? 25}
                />
              ))}
              {morningPrepSignals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No signals available for daytime prep adjustments.
                </p>
              )}
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-tight">Important venues (persisted)</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {(state.venues ?? []).map((v) => {
                const mi = distanceMiles(SALATA_STORE_COORDS, {
                  lat: v.latitude,
                  lng: v.longitude,
                }).toFixed(2);
                return (
                  <Card key={v.id} className="border-muted shadow-none">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0"
                          checked={v.manuallyImportant}
                          aria-label={`Pin ${v.name}`}
                          onChange={(e) => toggleVenueImportant(v.id, e.target.checked)}
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium leading-snug">{v.name}</p>
                          {v.address && (
                            <p className="text-xs text-muted-foreground">{v.address}</p>
                          )}
                          <p className="font-mono text-[11px] text-muted-foreground">
                            Straight-line mi from store · {mi} mi · pinned override for walkability boosts in future builds.
                          </p>
                        </div>
                      </div>
                      <SalataMiniOsmAtPoint
                        lat={v.latitude}
                        lng={v.longitude}
                        iframeTitle={`OpenStreetMap · ${v.name}`}
                        footnoteLeft="Venue"
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="size-5 text-orange-600" aria-hidden />
            Live Watch
          </CardTitle>
          <CardDescription>
            Does not silently rewrite saved morning prep — surfaced for staffing & small-batch decisions (NBA overtime, storm watch, egress traffic).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {liveWatchSignals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Live Watch cues for this mocked day.</p>
          ) : (
            liveWatchSignals.map((sig) => (
              <LiveWatchCard
                key={sig.id}
                signal={sig}
                dismissed={dismissed.has(sig.id)}
                onDismiss={() => dismissLive(sig.id)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MorningSignalCard({
  signal,
  maxPct,
  onApply,
  onDismiss,
  onUndoIgnore,
  onRemoveApply,
}: {
  signal: EventSignal;
  maxPct: number;
  onApply: () => void;
  onDismiss: () => void;
  onUndoIgnore: () => void;
  onRemoveApply: () => void;
}) {
  const displayPct = signal.cappedImpactPercent;
  return (
    <Card
      className={cn(
        "border-muted shadow-sm",
        signal.ignored ? "opacity-60" : null,
      )}
    >
      <CardHeader className="space-y-1 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{signal.name}</CardTitle>
            <CardDescription>
              {signal.venueName ? `${signal.venueName} · ` : ""}
              Starts {fmtTime(signal.startTime)}
              {signal.endTime ? ` → ${fmtTime(signal.endTime)}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant="secondary" className="font-mono text-[11px]">
              cap ±{maxPct}%
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              win: {signal.impactWindow}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              src: {signal.source}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              confidence: {signal.confidence}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="min-w-0 flex-1 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{signal.explanation}</p>
            <div className="flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
              <span>
                Impact {signal.impactPercent >= 0 ? "+" : ""}
                {signal.impactPercent}% · capped→{displayPct >= 0 ? "+" : ""}
                {displayPct}%
              </span>
              {signal.distanceMiles != null ? <span>{signal.distanceMiles.toFixed(2)} mi</span> : null}
              <span>walk:{signal.walkabilityStrength}</span>
            </div>
          </div>
          <SalataMiniOsmMap signal={signal} />
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-2">
        {signal.source === "web-search" && signal.sourceUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer">
              Source (demo stub)
            </a>
          </Button>
        )}
        {signal.confidence === "low" ? (
          <Badge variant="secondary">Candidate-only</Badge>
        ) : null}

        {!signal.applied ? (
          <Button size="sm" type="button" onClick={() => onApply()} disabled={signal.ignored}>
            Apply impact
          </Button>
        ) : (
          <Button size="sm" variant="secondary" type="button" onClick={() => onRemoveApply()}>
            Remove apply
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => onDismiss()}
          disabled={signal.ignored}
        >
          Ignore for today
        </Button>
        {signal.ignored ? (
          <Button size="sm" variant="ghost" type="button" onClick={() => onUndoIgnore()}>
            Undo ignore
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function LiveWatchCard({
  signal,
  dismissed,
  onDismiss,
}: {
  signal: EventSignal;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  const action =
    signal.type === "sports"
      ? "Prep a small contingency batch or align staffing for late traffic."
      : "Monitor traffic/travel apps before late-day prep pulls.";

  return (
    <Card className={dismissed ? "opacity-50" : ""}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{signal.name}</CardTitle>
        <CardDescription>
          Starts {fmtTime(signal.startTime)} · Impact {signal.cappedImpactPercent >= 0 ? "+" : ""}
          {signal.cappedImpactPercent}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="min-w-0 flex-1 space-y-4">
            <p className="text-sm text-muted-foreground">{signal.explanation}</p>
            <p className="text-sm font-medium">{action}</p>
          </div>
          <SalataMiniOsmMap signal={signal} />
        </div>
        <Separator />
        {!dismissed ? (
          <Button size="sm" variant="outline" type="button" onClick={() => onDismiss()}>
            Dismiss (persisted ACK)
          </Button>
        ) : (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dismissed for this prototype session
          </p>
        )}
      </CardContent>
    </Card>
  );
}
