import { distanceMiles } from "@/lib/salata/geo";
import {
  SALATA_DEMO_STORE_ID,
  SALATA_STORE_COORDS,
  type EventSignal,
  type SalataPrepItemId,
  type StoreVenue,
} from "@/lib/salata/types";

export const PREP_ITEM_ORDER: SalataPrepItemId[] = ["lettuce", "onion", "tomato"];

/** 14 weekdays of mock usage (Mon=0 .. Sun=6), last 2 cycles for demo average. */
export const MOCK_USAGE_LAST_14_BY_WEEKDAY: Record<
  SalataPrepItemId,
  [number, number, number, number, number, number, number]
> = {
  lettuce: [48, 52, 46, 51, 62, 58, 42],
  onion: [14, 15, 13, 14, 18, 17, 11],
  tomato: [22, 24, 21, 23, 28, 26, 18],
};

/** Same-day on-hand (Units). */
export const MOCK_ON_HAND: Record<SalataPrepItemId, number> = {
  lettuce: 22,
  onion: 5,
  tomato: 9,
};

const VENUE_POINTS: Array<{
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  manuallyImportant?: boolean;
  notes?: string;
}> = [
  {
    id: "lacc",
    name: "Los Angeles Convention Center",
    address: "1201 S Figueroa St, Los Angeles, CA",
    latitude: 34.0403,
    longitude: -118.2677,
    manuallyImportant: true,
    notes: "Convention lunch traffic when halls are active.",
  },
  {
    id: "crypto-com",
    name: "Crypto.com Arena",
    address: "1111 S Figueroa St, Los Angeles, CA",
    latitude: 34.043,
    longitude: -118.2673,
    manuallyImportant: true,
  },
  {
    id: "peacock",
    name: "Peacock Theater / L.A. Live",
    address: "1000 W 7th St, Los Angeles, CA",
    latitude: 34.0453,
    longitude: -118.2664,
  },
  {
    id: "orpheum",
    name: "Orpheum Theatre",
    address: "842 S Broadway, Los Angeles, CA",
    latitude: 34.0454,
    longitude: -118.2515,
    manuallyImportant: true,
    notes: "Walkable Broadway crowds.",
  },
  {
    id: "mayan",
    name: "The Mayan",
    address: "1038 S Hill St, Los Angeles, CA",
    latitude: 34.0443,
    longitude: -118.258,
  },
  {
    id: "wdch",
    name: "Walt Disney Concert Hall",
    address: "111 S Grand Ave, Los Angeles, CA",
    latitude: 34.0553,
    longitude: -118.2499,
    manuallyImportant: true,
  },
  {
    id: "dodgers",
    name: "Dodger Stadium",
    address: "1000 Vin Scully Ave, Los Angeles, CA",
    latitude: 34.0736,
    longitude: -118.2401,
  },
];

export function seedVenues(): StoreVenue[] {
  return VENUE_POINTS.map((v) => ({
    id: v.id,
    storeId: SALATA_DEMO_STORE_ID,
    name: v.name,
    address: v.address,
    latitude: v.latitude,
    longitude: v.longitude,
    manuallyImportant: Boolean(v.manuallyImportant),
    notes: v.notes,
  }));
}

/** Base mock signals; UI may clone and override applied/ignored. */
export function seedEventSignals(prepDateIso: string): EventSignal[] {
  const dayStart = prepDateIso;

  const dist = (lat: number, lng: number) =>
    round1(distanceMiles(SALATA_STORE_COORDS, { lat, lng }));

  const cap = (raw: number, maxPct: number) =>
    Math.min(Math.max(raw, -maxPct), maxPct);

  const walk = (mi: number): EventSignal["walkabilityStrength"] => {
    if (mi <= 0.25) return "strong";
    if (mi <= 0.5) return "medium";
    if (mi <= 1) return "weak";
    return "global";
  };

  const lacc = {
    lat: 34.0403,
    lng: -118.2677,
  };
  const orpheum = { lat: 34.0454, lng: -118.2515 };
  const crypto = { lat: 34.043, lng: -118.2673 };

  const dLacc = dist(lacc.lat, lacc.lng);
  const dOrpheum = dist(orpheum.lat, orpheum.lng);
  const dCrypto = dist(crypto.lat, crypto.lng);

  const rawConv = 14;
  const rawOrph = 8;

  return [
    {
      id: "mock-lacc-expo",
      storeId: SALATA_DEMO_STORE_ID,
      name: "TechWest Expo — floor day 1",
      type: "convention",
      venueName: "Los Angeles Convention Center",
      startTime: `${dayStart}T11:00:00`,
      endTime: `${dayStart}T17:00:00`,
      distanceMiles: dLacc,
      walkabilityStrength: walk(dLacc),
      expectedAttendance: 12000,
      confidence: "high",
      source: "mock",
      impactWindow: "lunch",
      impactPercent: rawConv,
      cappedImpactPercent: cap(rawConv, 25),
      applied: true,
      ignored: false,
      explanation:
        "Large convention crowds within walkable distance; expect elevated lunch salad demand.",
      mapCenter: { lat: lacc.lat, lng: lacc.lng },
    },
    {
      id: "mock-orpheum-matinee",
      storeId: SALATA_DEMO_STORE_ID,
      name: "Broadway matinee",
      type: "theater",
      venueName: "Orpheum Theatre",
      startTime: `${dayStart}T13:30:00`,
      endTime: `${dayStart}T16:00:00`,
      distanceMiles: dOrpheum,
      walkabilityStrength: walk(dOrpheum),
      expectedAttendance: 2200,
      confidence: "medium",
      source: "mock",
      impactWindow: "afternoon",
      impactPercent: rawOrph,
      cappedImpactPercent: cap(rawOrph, 25),
      applied: true,
      ignored: false,
      explanation: "Afternoon theater foot traffic near Broadway.",
      mapCenter: { lat: orpheum.lat, lng: orpheum.lng },
    },
    {
      id: "mock-drizzle",
      storeId: SALATA_DEMO_STORE_ID,
      name: "Light afternoon drizzle",
      type: "weather",
      venueName: null,
      startTime: `${dayStart}T14:00:00`,
      endTime: `${dayStart}T19:00:00`,
      distanceMiles: null,
      walkabilityStrength: "global",
      expectedAttendance: null,
      confidence: "medium",
      source: "weather",
      impactWindow: "lunch",
      impactPercent: -5,
      cappedImpactPercent: cap(-5, 25),
      applied: true,
      ignored: false,
      explanation: "Light rain may reduce walk-in lunch traffic slightly downtown.",
      mapCenter: { lat: SALATA_STORE_COORDS.lat, lng: SALATA_STORE_COORDS.lng },
    },
    {
      id: "mock-lakers-live",
      storeId: SALATA_DEMO_STORE_ID,
      name: "Lakers home game — possible overtime",
      type: "sports",
      venueName: "Crypto.com Arena",
      startTime: `${dayStart}T19:30:00`,
      endTime: null,
      distanceMiles: dCrypto,
      walkabilityStrength: walk(dCrypto),
      expectedAttendance: 18000,
      confidence: "high",
      source: "mock",
      impactWindow: "live-watch",
      impactPercent: 10,
      cappedImpactPercent: cap(10, 25),
      applied: false,
      ignored: false,
      explanation:
        "Late game flow; Live Watch only. If OT extends, post-event demand may spike.",
      mapCenter: { lat: crypto.lat, lng: crypto.lng },
    },
    {
      id: "mock-thunder-watch",
      storeId: SALATA_DEMO_STORE_ID,
      name: "Severe thunderstorm watch — evening",
      type: "weather",
      venueName: null,
      startTime: `${dayStart}T17:00:00`,
      endTime: `${dayStart}T23:00:00`,
      distanceMiles: null,
      walkabilityStrength: "global",
      expectedAttendance: null,
      confidence: "medium",
      source: "weather",
      impactWindow: "live-watch",
      impactPercent: -7,
      cappedImpactPercent: cap(-7, 25),
      applied: false,
      ignored: false,
      explanation: "Evening weather risk may shift dine-in vs delivery; monitor Live Watch.",
      mapCenter: { lat: SALATA_STORE_COORDS.lat, lng: SALATA_STORE_COORDS.lng },
    },
    {
      id: "mock-low-confidence-festival",
      storeId: SALATA_DEMO_STORE_ID,
      name: "Unverified street festival (web rumor)",
      type: "citywide",
      venueName: null,
      startTime: `${dayStart}T12:00:00`,
      endTime: `${dayStart}T15:00:00`,
      distanceMiles: 0.6,
      walkabilityStrength: "weak",
      expectedAttendance: null,
      confidence: "low",
      source: "web-search",
      impactWindow: "lunch",
      impactPercent: 18,
      cappedImpactPercent: cap(18, 25),
      applied: false,
      ignored: false,
      explanation: "Low confidence candidate; show but do not auto-apply until confirmed.",
      mapCenter: { lat: 34.0562, lng: -118.2467 },
    },
  ];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Simulated web refresh candidates (merged by client). */
export function fakeWebSearchCandidates(prepDateIso: string): EventSignal[] {
  const dayStart = prepDateIso;
  return [
    {
      id: `web-${prepDateIso}-night-market`,
      storeId: SALATA_DEMO_STORE_ID,
      name: "Downtown night market (search hit — verify)",
      type: "citywide",
      venueName: "Grand Park",
      startTime: `${dayStart}T18:00:00`,
      endTime: `${dayStart}T22:00:00`,
      distanceMiles: 0.7,
      walkabilityStrength: "weak",
      expectedAttendance: 4000,
      confidence: "low",
      source: "web-search",
      sourceUrl: "https://example.com/demo-only",
      fetchedAt: new Date().toISOString(),
      impactWindow: "dinner",
      impactPercent: 9,
      cappedImpactPercent: 9,
      applied: false,
      ignored: false,
      explanation: "Synthetic search result for demo; confirm with a primary calendar source.",
      mapCenter: { lat: 34.0562, lng: -118.2467 },
    },
    {
      id: `web-${prepDateIso}-film-premiere`,
      storeId: SALATA_DEMO_STORE_ID,
      name: "Red carpet premiere — traffic cordons nearby",
      type: "cinema",
      venueName: "L.A. Live",
      startTime: `${dayStart}T17:45:00`,
      endTime: `${dayStart}T21:00:00`,
      distanceMiles: 0.45,
      walkabilityStrength: "medium",
      expectedAttendance: 3500,
      confidence: "medium",
      source: "web-search",
      sourceUrl: "https://example.com/demo-only",
      fetchedAt: new Date().toISOString(),
      impactWindow: "dinner",
      impactPercent: 6,
      cappedImpactPercent: 6,
      applied: false,
      ignored: false,
      explanation: "Traffic and egress patterns may affect pickup and late salad orders.",
      mapCenter: { lat: 34.0453, lng: -118.2664 },
    },
  ];
}
