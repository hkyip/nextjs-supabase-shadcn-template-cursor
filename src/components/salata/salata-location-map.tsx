"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MapPinned } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SalataStoreOverviewMap } from "@/components/salata/salata-store-overview-map";
import { SALATA_DEMO_ADDRESS, type StoreVenue } from "@/lib/salata/types";
import { salataOsmMapPageUrl } from "@/lib/salata/openstreetmap";

export function SalataLocationMap({
  venues,
  walkableRadiusMiles,
}: {
  venues: StoreVenue[];
  walkableRadiusMiles: number;
}) {
  const radius =
    Number.isFinite(walkableRadiusMiles) && walkableRadiusMiles > 0
      ? walkableRadiusMiles
      : 1;

  return (
    <Card id="salata-location-preview">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPinned className="size-5 shrink-0 text-emerald-600" aria-hidden />
          Store location preview (OpenStreetMap)
        </CardTitle>
        <CardDescription>
          {SALATA_DEMO_ADDRESS} — emerald ring = configured walk radius (~{radius}&nbsp;mi straight-line). Pins: store
          (green) vs tracked venues (blue). Tiles ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            OpenStreetMap contributors
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SalataStoreOverviewMap venues={venues} walkableRadiusMiles={radius} />
        <p className="text-muted-foreground text-[11px] leading-snug">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block size-2.5 shrink-0 rounded-full bg-emerald-600 ring-2 ring-white" />
            Store
          </span>
          <span className="mx-2 text-border">·</span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block size-2 shrink-0 rounded-full bg-sky-600 ring-2 ring-white" />
            Venues ({venues.length})
          </span>
          <span className="mx-2 text-border">·</span>
          Drag to pan · scroll zoom off (use +/− on the map).
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3 border-t pt-6 text-[11px] text-muted-foreground">
        <span>
          Coordinates approximate (nearest building footprint on OSM varies). Radius is illustrative, not a drive-time
          isochrone.
        </span>
        <ButtonLink href={salataOsmMapPageUrl()}>Open interactive map (store) →</ButtonLink>
      </CardFooter>
    </Card>
  );
}

function ButtonLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline underline-offset-2 hover:text-primary"
    >
      {children}
    </Link>
  );
}
