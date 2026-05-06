import { describe, expect, it } from "vitest";

import type { EventSignal } from "@/lib/salata/types";
import { SALATA_STORE_COORDS } from "@/lib/salata/types";
import {
  salataOsmEmbedThumbnailUrl,
  salataOsmEmbedUrl,
  salataOsmEmbedUrlForPoint,
  salataOsmMapPageUrl,
  salataOsmMapPageUrlFor,
  salataSignalMapCenter,
} from "@/lib/salata/openstreetmap";

function stubSignal(override: Partial<EventSignal> & Pick<EventSignal, "id">): EventSignal {
  return {
    storeId: "s",
    name: "n",
    type: "weather",
    venueName: null,
    startTime: "2026-05-01T12:00:00",
    endTime: null,
    distanceMiles: null,
    walkabilityStrength: "global",
    expectedAttendance: null,
    confidence: "medium",
    source: "mock",
    impactWindow: "lunch",
    impactPercent: 0,
    cappedImpactPercent: 0,
    applied: false,
    ignored: false,
    explanation: "",
    ...override,
  };
}

describe("openstreetmap helpers", () => {
  it("embed URL wraps bbox and marker around SALATA_STORE_COORDS", () => {
    const u = salataOsmEmbedUrl();
    expect(u.startsWith("https://www.openstreetmap.org/export/embed.html?")).toBe(true);
    const parsed = new URL(u);
    expect(parsed.searchParams.get("layer")).toBe("mapnik");
    expect(parsed.searchParams.get("bbox")).not.toBeNull();
    expect(parsed.searchParams.get("marker")).toBe(`${SALATA_STORE_COORDS.lat},${SALATA_STORE_COORDS.lng}`);
  });

  it("thumbnail embed differs from default padding for same point", () => {
    const { lat, lng } = SALATA_STORE_COORDS;
    const thumb = salataOsmEmbedThumbnailUrl(lat, lng);
    const def = salataOsmEmbedUrlForPoint(lat, lng);
    expect(new URL(thumb).searchParams.get("bbox")).not.toBe(new URL(def).searchParams.get("bbox"));
    expect(thumb.includes("marker=")).toBe(true);
  });

  it("map page URL includes mlat/mlon anchors", () => {
    const u = salataOsmMapPageUrl();
    expect(u.includes(`mlat=${SALATA_STORE_COORDS.lat}`)).toBe(true);
    expect(u.includes(`mlon=${SALATA_STORE_COORDS.lng}`)).toBe(true);
    expect(u.includes(`#map=`)).toBe(true);
  });

  it("map page URL for arbitrary point", () => {
    const u = salataOsmMapPageUrlFor(34.04, -118.27, 16);
    expect(u).toContain("mlat=34.04");
    expect(u).toContain("mlon=-118.27");
    expect(u).toContain("#map=16");
  });

  it("salataSignalMapCenter uses mapCenter when set", () => {
    const c = salataSignalMapCenter(
      stubSignal({
        id: "a",
        mapCenter: { lat: 10, lng: 20 },
      }),
    );
    expect(c).toEqual({ lat: 10, lng: 20 });
  });

  it("salataSignalMapCenter falls back to store", () => {
    const c = salataSignalMapCenter(stubSignal({ id: "b" }));
    expect(c).toEqual(SALATA_STORE_COORDS);
  });
});
