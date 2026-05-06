import Link from "next/link";

import { cn } from "@/lib/utils";
import type { EventSignal } from "@/lib/salata/types";
import {
  salataOsmMapPageUrlFor,
  salataOsmEmbedThumbnailUrl,
  salataSignalMapCenter,
} from "@/lib/salata/openstreetmap";

export function SalataMiniOsmAtPoint({
  lat,
  lng,
  iframeTitle,
  footnoteLeft,
  className,
}: {
  lat: number;
  lng: number;
  iframeTitle: string;
  footnoteLeft: string;
  className?: string;
}) {
  const embedSrc = salataOsmEmbedThumbnailUrl(lat, lng);
  const fullMapHref = salataOsmMapPageUrlFor(lat, lng, 17);

  return (
    <div
      className={cn("flex w-full shrink-0 flex-col gap-2 sm:w-[16rem]", className)}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border-2 border-border bg-muted shadow-inner sm:aspect-auto sm:h-[9.5rem]">
        <iframe
          title={iframeTitle}
          className="pointer-events-none absolute inset-0 size-full border-0 saturate-110 contrast-110"
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{footnoteLeft}</span>
        <Link
          href={fullMapHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-2 hover:text-primary"
        >
          OSM →
        </Link>
      </div>
    </div>
  );
}

export function SalataMiniOsmMap({
  signal,
  className,
}: {
  signal: EventSignal;
  className?: string;
}) {
  const { lat, lng } = salataSignalMapCenter(signal);
  const usingStoreFallback = signal.mapCenter == null;

  return (
    <SalataMiniOsmAtPoint
      lat={lat}
      lng={lng}
      iframeTitle={`OpenStreetMap · ${signal.name}`}
      footnoteLeft={usingStoreFallback ? "Area (store)" : "Venue"}
      className={className}
    />
  );
}
