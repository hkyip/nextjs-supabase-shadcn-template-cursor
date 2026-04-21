import Link from "next/link";

import { FORECAST_DEFAULT_WINDOW_MINUTES } from "@/lib/forecast";

/**
 * Plain-language intro for visitors without a tech background.
 */
export function ForecastPlainGuide() {
  const w = FORECAST_DEFAULT_WINDOW_MINUTES;

  return (
    <aside
      className="rounded-xl border border-sky-500/25 bg-sky-500/[0.07] px-4 py-4 text-sm leading-relaxed"
      aria-labelledby="forecast-plain-guide-title"
    >
      <p
        id="forecast-plain-guide-title"
        className="text-foreground mb-3 font-semibold tracking-tight"
      >
        New here? Read this first.
      </p>
      <div className="text-muted-foreground space-y-3 [&_strong]:text-foreground">
        <p>
          <strong>Forkcast</strong> walks you through a full restaurant day in your browser. The store
          clock can move faster than your wall clock, and{" "}
          <span className="font-mono text-foreground">/remote</span> lets you jump to another time of
          day—like skipping ahead in a walkthrough. The numbers are{" "}
          <strong>sample data</strong> so you can learn the screens; they are not wired to a live
          store.
        </p>
        <p>
          <strong>This Forecast page</strong> asks: for each menu item, about how many might we sell
          in roughly the <strong>next {w} minutes</strong>, based on &quot;what this hour is usually
          like&quot;? Think of it as a starting guess from the day&apos;s rhythm (busy lunch, quiet
          afternoon). Then a few simple rules <strong>nudge</strong> that guess if sales look hotter
          or slower, if a special situation is on, or if we recently had food go bad on the shelf.
        </p>
        <p>
          <strong>The colored bars and the big math row</strong> show that story in numbers. When
          you want to see orders in line, food waiting, and what to actually cook, open{" "}
          <Link
            href="/production"
            className="text-foreground font-medium underline decoration-dotted underline-offset-2"
          >
            Production
          </Link>
          — that screen is the &quot;kitchen view&quot; on top of the <strong>same session</strong>{" "}
          you have open here.
        </p>
      </div>
    </aside>
  );
}
