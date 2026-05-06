import type { EventSignal } from "@/lib/salata/types";
import { SALATA_STORE_COORDS } from "@/lib/salata/types";

/** OSM export embed docs: https://wiki.openstreetmap.org/wiki/Browsing#Export */
export function salataOsmEmbedUrlForPoint(
  lat: number,
  lng: number,
  pads?: { padLat?: number; padLon?: number },
): string {
  const padLat = pads?.padLat ?? 0.007;
  const padLon = pads?.padLon ?? 0.01;
  const minLon = lng - padLon;
  const minLat = lat - padLat;
  const maxLon = lng + padLon;
  const maxLat = lat + padLat;

  const params = new URLSearchParams({
    bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
    layer: "mapnik",
    marker: `${lat},${lng}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

/**
 * Tight framing for thumbnail-style iframes in signal cards (~block radius).
 */
export function salataOsmEmbedThumbnailUrl(lat: number, lng: number): string {
  return salataOsmEmbedUrlForPoint(lat, lng, { padLat: 0.0028, padLon: 0.0035 });
}

/**
 * Builds the official OSM embed URL for {@link SALATA_STORE_COORDS}
 * ({@link https://wiki.openstreetmap.org/wiki/Browsing#Export Export / embed }).
 */
export function salataOsmEmbedUrl(): string {
  const { lat, lng } = SALATA_STORE_COORDS;
  return salataOsmEmbedUrlForPoint(lat, lng, { padLat: 0.007, padLon: 0.01 });
}

/** Map centre for previews: explicit signal point or demo store. */
export function salataSignalMapCenter(signal: EventSignal): { lat: number; lng: number } {
  return signal.mapCenter ?? SALATA_STORE_COORDS;
}

/** Larger map centred on a point (interactive on openstreetmap.org). */
export function salataOsmMapPageUrlFor(lat: number, lng: number, zoom = 17): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

/** Larger map centred on the store (interactive on openstreetmap.org). */
export function salataOsmMapPageUrl(zoom = 17): string {
  const { lat, lng } = SALATA_STORE_COORDS;
  return salataOsmMapPageUrlFor(lat, lng, zoom);
}
