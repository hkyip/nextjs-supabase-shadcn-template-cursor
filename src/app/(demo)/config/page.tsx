import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfigShell } from "@/components/config/config-shell";

export const metadata = {
  title: "Configuration — Forkcast",
};

export default function ConfigPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
          <Badge variant="outline">Read-only</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Back-end data that drives the production screen
        </p>
      </div>

      <Separator />

      <ConfigShell />
    </div>
  );
}
