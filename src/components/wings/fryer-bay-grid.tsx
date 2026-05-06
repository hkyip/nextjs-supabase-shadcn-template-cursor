"use client";

import { Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FryerBasketCard } from "@/components/wings/fryer-basket-card";
import type { FryerBasket, WingsConfigV1 } from "@/lib/wings/types";

interface Props {
  baskets: FryerBasket[];
  config: WingsConfigV1;
  onDrop: (basketId: string, lbs: number) => void;
  onPull: (basketId: string) => void;
}

export function FryerBayGrid({ baskets, config, onDrop, onPull }: Props) {
  const fryingCount = baskets.filter((b) => b.status === "frying").length;
  const readyCount = baskets.filter((b) => b.status === "ready").length;
  const overcookCount = baskets.filter((b) => b.status === "overcook").length;

  // Pick a layout: keep ~2-3 per row
  const cols =
    config.basketCount <= 2
      ? "sm:grid-cols-2"
      : config.basketCount <= 4
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="size-4 text-orange-600" aria-hidden />
            Fryer bays
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="font-mono text-[10px]">
              {fryingCount} frying
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {readyCount} ready
            </Badge>
            {overcookCount > 0 ? (
              <Badge className="bg-rose-600 text-[10px] text-white hover:bg-rose-700">
                {overcookCount} overcook
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`grid gap-2 ${cols}`}>
        {baskets.map((b) => (
          <FryerBasketCard
            key={b.id}
            basket={b}
            config={config}
            onDrop={onDrop}
            onPull={onPull}
          />
        ))}
      </CardContent>
    </Card>
  );
}
