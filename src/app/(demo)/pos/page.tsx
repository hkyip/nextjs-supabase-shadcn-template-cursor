import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PosSimulator } from "@/components/pos/pos-simulator";

export const metadata = {
  title: "POS — Forkcast",
};

type Props = {
  searchParams: Promise<{ room?: string | string[] }>;
};

function pickRoom(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() || "demo";
  return value?.trim() || "demo";
}

export default async function PosPage({ searchParams }: Props) {
  const params = await searchParams;
  const room = pickRoom(params.room);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Point of sale</h1>
          <p className="text-sm text-muted-foreground">
            Completing a sale broadcasts <span className="font-mono text-xs">served</span>{" "}
            so tickets land in <strong>Incoming orders</strong> on production; the line
            fulfills from <strong>Hot holding</strong> with Camera / Voice / Manual.{" "}
            <span className="font-mono text-xs">/remote</span> Serving orders queues the
            same way. Same <span className="font-mono text-xs">room</span> as{" "}
            <span className="font-mono text-xs">/production</span>.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 font-mono text-xs">
          room={room}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Open{" "}
        <span className="font-mono">
          /production?room={room}
        </span>{" "}
        alongside{" "}
        <span className="font-mono">
          /pos?room={room}
        </span>{" "}
        (or use <span className="font-mono">/remote?room={room}</span> for scripted
        commands).
      </p>

      <Separator />

      <PosSimulator room={room} />
    </div>
  );
}
