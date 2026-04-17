import { Badge } from "@/components/ui/badge";
import { ProductionBoard } from "@/components/production/production-board";
import { LiveClock } from "@/components/station/live-clock";

export const metadata = {
  title: "Production Screen — Forkcast",
};

type Props = {
  searchParams: Promise<{ room?: string | string[] }>;
};

function pickRoom(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() || "demo";
  return value?.trim() || "demo";
}

export default async function ProductionPage({ searchParams }: Props) {
  const params = await searchParams;
  const room = pickRoom(params.room);

  return (
    <div className="mx-auto max-w-[1800px] space-y-3 px-3 py-3 lg:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            Production Screen
          </h1>
          <Badge className="bg-orange-500 text-white hover:bg-orange-600">
            Lunch Rush
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            Room: {room}
          </Badge>
        </div>
        <LiveClock />
      </div>

      <ProductionBoard room={room} />
    </div>
  );
}
