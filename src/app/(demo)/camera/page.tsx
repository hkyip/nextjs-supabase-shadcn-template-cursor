import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CameraFeed } from "@/components/camera/camera-feed";

export const metadata = {
  title: "Camera Monitoring — Forkcast",
};

export default function CameraPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Camera Monitoring
          </h1>
          <Badge variant="outline">Demo Artifact</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Shows how camera detection works under the hood
        </p>
      </div>

      <Separator />

      <CameraFeed />
    </div>
  );
}
