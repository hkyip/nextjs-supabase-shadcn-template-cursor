"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import type { StoreVenue } from "@/lib/salata/types";
import { SALATA_STORE_COORDS } from "@/lib/salata/types";

import "leaflet/dist/leaflet.css";

const MILES_TO_METERS = 1609.344;

/** Keep pin labels self-contained (no default Leaflet image sprites). */
function storeIconHtml(): string {
  return `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#059669;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.42)"></span>`;
}

function venueIconHtml(): string {
  return `<span style="display:block;width:12px;height:12px;border-radius:9999px;background:#0284c7;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.38)"></span>`;
}

export function SalataStoreOverviewMap({
  venues,
  walkableRadiusMiles,
  className,
}: {
  venues: StoreVenue[];
  walkableRadiusMiles: number;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let cancelled = false;
    let mapRm: (() => void) | null = null;

    void import("leaflet").then((Lmod) => {
      if (cancelled) return;
      const L = Lmod.default ?? Lmod;

      const { lat: storeLat, lng: storeLng } = SALATA_STORE_COORDS;
      const radiusMeters = Math.max(
        (Number.isFinite(walkableRadiusMiles) ? walkableRadiusMiles : 1) * MILES_TO_METERS,
        250,
      );

      const map = L.map(el, {
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        maxZoom: 19,
      }).addTo(map);

      const group = L.featureGroup();

      L.circle([storeLat, storeLng], {
        radius: radiusMeters,
        color: "#059669",
        weight: 2,
        fillColor: "#10b981",
        fillOpacity: 0.075,
      }).addTo(group);

      L.marker([storeLat, storeLng], {
        zIndexOffset: 500,
        icon: L.divIcon({
          className: "salata-leaflet-marker",
          html: storeIconHtml(),
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      })
        .bindPopup("<strong>Demo store</strong><br/>Prep location")
        .addTo(group);

      for (const v of venues) {
        const label = v.address ? `${v.name}<br/><span style="opacity:.85">${v.address}</span>` : v.name;
        L.marker([v.latitude, v.longitude], {
          icon: L.divIcon({
            className: "salata-leaflet-marker",
            html: venueIconHtml(),
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .bindPopup(label)
          .addTo(group);
      }

      group.addTo(map);

      const fitPoints: Array<[number, number]> = [[storeLat, storeLng]];
      for (const v of venues) fitPoints.push([v.latitude, v.longitude]);
      const latDelta = radiusMeters / 111_320;
      const cosLat = Math.cos((storeLat * Math.PI) / 180);
      const lngDelta = radiusMeters / (111_320 * Math.max(0.2, cosLat));
      fitPoints.push(
        [storeLat + latDelta, storeLng],
        [storeLat - latDelta, storeLng],
        [storeLat, storeLng + lngDelta],
        [storeLat, storeLng - lngDelta],
      );
      map.fitBounds(fitPoints, { padding: [36, 36], maxZoom: 15 });

      const onResize = (): void => {
        void map.invalidateSize();
      };
      window.addEventListener("resize", onResize);
      const t = window.setTimeout(() => {
        void map.invalidateSize();
      }, 50);

      mapRm = (): void => {
        window.removeEventListener("resize", onResize);
        window.clearTimeout(t);
        map.remove();
      };

      if (cancelled) {
        mapRm();
        mapRm = null;
      }
    });

    return (): void => {
      cancelled = true;
      mapRm?.();
      mapRm = null;
    };
  }, [venues, walkableRadiusMiles]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "isolate z-0 min-h-[240px] w-full overflow-hidden rounded-lg border bg-muted",
        "aspect-[16/10] max-h-[min(340px,50vh)]",
        className,
      )}
      role="region"
      aria-label="Map showing demo store, walk-radius ring, and tracked venue pins"
    />
  );
}
