import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropNowCard } from "@/components/station/drop-now-card";
import { HoldingBin } from "@/components/station/holding-bin";
import { DemandTimeline } from "@/components/station/demand-timeline";
import { LiveClock } from "@/components/station/live-clock";
import { DROP_NOW, HOLDING_BIN, UPCOMING_DEMAND } from "@/lib/mock-data";

export const metadata = {
  title: "Fry Station — FryQ",
};

export default function StationPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Fry Station</h1>
          <Badge className="bg-orange-500 text-white hover:bg-orange-600">
            Lunch Rush
          </Badge>
        </div>
        <LiveClock />
      </div>

      <Separator />

      {/* Main grid: Drop Now + Holding Bin */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Drop Now section — wider */}
        <div className="space-y-4 lg:col-span-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Drop Now
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {DROP_NOW.map((item) => (
              <DropNowCard key={item.itemId} item={item} />
            ))}
          </div>
        </div>

        {/* Holding Bin — narrower */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Holding Bin Status
          </h2>
          <HoldingBin entries={HOLDING_BIN} />
        </div>
      </div>

      {/* Upcoming demand timeline */}
      <DemandTimeline slots={UPCOMING_DEMAND} />
    </div>
  );
}
