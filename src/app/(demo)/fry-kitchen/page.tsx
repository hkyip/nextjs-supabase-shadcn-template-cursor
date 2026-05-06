import { ForecastView } from "@/components/forecast/forecast-view";
import { LiveClock } from "@/components/station/live-clock";

export const metadata = {
  title: "Fry kitchen — Forkcast",
};

export default function FryKitchenPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-3 py-3 lg:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            Fry kitchen forecast
          </h1>
          <p className="text-muted-foreground text-xs">
            Statistical demand curve for fry / hot-side demo (formerly on{" "}
            <span className="font-mono text-foreground/80">/forecast</span>).
          </p>
        </div>
        <LiveClock />
      </div>
      <ForecastView />
    </div>
  );
}
