import { Separator } from "@/components/ui/separator";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata = {
  title: "Dashboard — Forkcast",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Management Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Performance metrics and reporting — Store #142
        </p>
      </div>

      <Separator />

      <DashboardShell />
    </div>
  );
}
