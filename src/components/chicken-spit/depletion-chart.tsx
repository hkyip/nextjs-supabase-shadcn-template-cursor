"use client";

import { useMemo } from "react";

import type { DepletionPoint } from "@/lib/chicken-spit/depletion";

interface Props {
  curve: DepletionPoint[];
  /** Minutes-ahead value to draw the stockout marker at (null = no stockout in window) */
  stockoutMinutesAhead: number | null;
  /** Lead time for new spit, in minutes — drawn as a vertical reference line */
  leadTimeMinutes: number;
}

/**
 * Tiny inline SVG depletion chart — portions remaining vs. minutes ahead.
 * Avoids a chart library to keep the demo bundle lean.
 */
export function DepletionChart({
  curve,
  stockoutMinutesAhead,
  leadTimeMinutes,
}: Props) {
  const W = 640;
  const H = 96;
  const PAD_L = 30;
  const PAD_R = 10;
  const PAD_T = 8;
  const PAD_B = 18;

  const { path, maxPortions, maxMin } = useMemo(() => {
    const maxPortions = Math.max(
      1,
      ...curve.map((p) => p.portionsRemaining),
    );
    const maxMin = Math.max(1, ...curve.map((p) => p.minutesAhead));
    const x = (m: number) =>
      PAD_L + ((W - PAD_L - PAD_R) * m) / maxMin;
    const y = (p: number) =>
      H - PAD_B - ((H - PAD_T - PAD_B) * p) / maxPortions;
    const d = curve
      .map((pt, i) =>
        `${i === 0 ? "M" : "L"} ${x(pt.minutesAhead).toFixed(1)} ${y(
          pt.portionsRemaining,
        ).toFixed(1)}`,
      )
      .join(" ");
    return { path: d, maxPortions, maxMin };
  }, [curve]);

  const stockoutX =
    stockoutMinutesAhead != null
      ? PAD_L + ((W - PAD_L - PAD_R) * stockoutMinutesAhead) / maxMin
      : null;
  const leadX =
    PAD_L +
    ((W - PAD_L - PAD_R) * Math.min(leadTimeMinutes, maxMin)) / maxMin;

  return (
    <svg
      role="img"
      aria-label="Projected steam-table portions remaining over the next 90 minutes"
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
    >
      {/* Y axis grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = H - PAD_B - (H - PAD_T - PAD_B) * t;
        const v = Math.round(maxPortions * t);
        return (
          <g key={t}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <text
              x={PAD_L - 6}
              y={y + 4}
              fontSize={10}
              textAnchor="end"
              className="fill-muted-foreground font-mono"
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* X axis labels (every 15 min) */}
      {[0, 15, 30, 45, 60, 75, 90].filter((m) => m <= maxMin).map((m) => {
        const x = PAD_L + ((W - PAD_L - PAD_R) * m) / maxMin;
        return (
          <text
            key={m}
            x={x}
            y={H - 6}
            fontSize={10}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
          >
            +{m}m
          </text>
        );
      })}

      {/* Lead-time reference */}
      <line
        x1={leadX}
        x2={leadX}
        y1={PAD_T}
        y2={H - PAD_B}
        stroke="rgb(245 158 11)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <text
        x={leadX + 4}
        y={PAD_T + 10}
        fontSize={10}
        className="fill-amber-600 font-mono"
      >
        +{leadTimeMinutes}m lead time
      </text>

      {/* Stockout marker */}
      {stockoutX != null ? (
        <>
          <line
            x1={stockoutX}
            x2={stockoutX}
            y1={PAD_T}
            y2={H - PAD_B}
            stroke="rgb(220 38 38)"
            strokeWidth={1.5}
          />
          <text
            x={stockoutX + 4}
            y={PAD_T + 22}
            fontSize={10}
            className="fill-rose-600 font-mono font-semibold"
          >
            stockout
          </text>
        </>
      ) : null}

      {/* Curve */}
      <path
        d={path}
        fill="none"
        stroke="rgb(16 185 129)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
