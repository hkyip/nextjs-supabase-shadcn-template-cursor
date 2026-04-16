import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CameraFeed } from "@/components/camera/camera-feed";

export const metadata = {
  title: "Camera Monitoring — Forkcast",
};

type Props = {
  searchParams: Promise<{ room?: string | string[] }>;
};

function pickRoom(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() || "demo";
  return value?.trim() || "demo";
}

export default async function CameraPage({ searchParams }: Props) {
  const params = await searchParams;
  const room = pickRoom(params.room);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Camera Monitoring
          </h1>
          <Badge variant="outline">Demo Artifact</Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            Room: {room}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Drag items to Serve / Dispose to broadcast a camera-detected event
        </p>
      </div>

      <Separator />

      <CameraFeed room={room} />
    </div>
  );
}
