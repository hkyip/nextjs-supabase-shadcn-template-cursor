"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Row = { id: string; quantity: number };

type Options = {
  /** Pulse when a new id appears (e.g. new incoming ticket). */
  pulseOnAdd?: boolean;
  /** Pulse when quantity drops for an existing id (fulfill, sell from hold). */
  pulseOnDecrease?: boolean;
};

const defaultOptions: Required<Options> = {
  pulseOnAdd: true,
  pulseOnDecrease: true,
};

/**
 * Detects add / quantity-down transitions between snapshots so cards can flash briefly.
 * Uses a content signature so parent re-renders every TICK do not retrigger the effect.
 */
export function useKeyedQuantityPulse(
  rows: Row[],
  options: Options = {},
): Set<string> {
  const { pulseOnAdd, pulseOnDecrease } = { ...defaultOptions, ...options };
  const signature = useMemo(
    () => rows.map((r) => `${r.id}:${r.quantity}`).join("|"),
    [rows],
  );
  const rowsRef = useRef(rows);
  const prev = useRef<Map<string, number>>(new Map());
  const isFirst = useRef(true);
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    rowsRef.current = rows;
  });

  useEffect(() => {
    const current = rowsRef.current;
    const next = new Map(current.map((r) => [r.id, r.quantity]));

    if (isFirst.current) {
      isFirst.current = false;
      prev.current = next;
      return;
    }

    const touched = new Set<string>();
    for (const [id, qty] of next) {
      const pq = prev.current.get(id);
      if (pq === undefined) {
        if (pulseOnAdd) touched.add(id);
      } else if (pulseOnDecrease && qty < pq) {
        touched.add(id);
      }
    }

    prev.current = next;

    if (touched.size === 0) return;

    let aborted = false;
    let clearPulse: number | undefined;
    queueMicrotask(() => {
      if (aborted) return;
      setPulsing(touched);
      clearPulse = window.setTimeout(() => {
        if (!aborted) setPulsing(new Set());
      }, 850) as unknown as number;
    });
    return () => {
      aborted = true;
      if (clearPulse !== undefined) window.clearTimeout(clearPulse);
    };
  }, [signature, pulseOnAdd, pulseOnDecrease]);

  return pulsing;
}
