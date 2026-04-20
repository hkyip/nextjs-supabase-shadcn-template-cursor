import { ForecastView } from "@/components/forecast/forecast-view";
import { LiveClock } from "@/components/station/live-clock";

export const metadata = {
  title: "Forecast — Forkcast",
};

export default function ForecastPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-3 py-3 lg:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
          Demand forecast
        </h1>
        <LiveClock />
      </div>
      <ForecastView />
    </div>
  );
}
