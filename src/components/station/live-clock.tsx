"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <span className="font-mono text-lg font-semibold tabular-nums">{time}</span>
  );
}
