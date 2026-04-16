import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ItemForecast } from "@/lib/mock-data";

export function ItemBreakdownTable({ items }: { items: ItemForecast[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Item Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Forecast</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">Waste (lbs)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.itemId}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.forecasted}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.actual}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    item.variance > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {item.variance > 0 ? "+" : ""}
                  {item.variance.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.wasteLbs.toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
