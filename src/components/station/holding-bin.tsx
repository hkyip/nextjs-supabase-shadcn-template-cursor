import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { HoldingBinEntry } from "@/lib/mock-data";

const STATUS_STYLES: Record<string, { label: string; color: string; badgeClass: string }> = {
  fresh: { label: "Fresh", color: "text-green-600", badgeClass: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400" },
  good: { label: "Good", color: "text-yellow-600", badgeClass: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
  stale: { label: "Stale!", color: "text-red-600", badgeClass: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400" },
};

export function HoldingBin({ entries }: { entries: HoldingBinEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Holding Bin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => {
          const style = STATUS_STYLES[entry.status];
          const holdPct = Math.min(
            100,
            Math.round((entry.cookedMinutesAgo / entry.maxHoldMinutes) * 100),
          );

          return (
            <div key={entry.itemId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{entry.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {entry.quantity} {entry.unit}
                  </span>
                </div>
                <Badge variant="outline" className={cn("text-xs", style.badgeClass)}>
                  {style.label} · {entry.cookedMinutesAgo}m ago
                </Badge>
              </div>
              <Progress
                value={holdPct}
                className={cn(
                  "h-1.5",
                  entry.status === "stale" && "[&>div]:bg-red-500",
                  entry.status === "good" && "[&>div]:bg-yellow-500",
                  entry.status === "fresh" && "[&>div]:bg-green-500",
                )}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
