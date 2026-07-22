// OpenStreetMap Overpass API (overpass-api.de) — Fair-Use 10.000 Queries/Tag +
// 1GB/Tag laut Betreiber-Policy, kein Key nötig, aber eigener User-Agent
// vorgeschrieben. Daten stehen unter ODbL — Attribution ist im UI Pflicht
// (siehe mosques.tsx). Cache über AsyncStorage vermeidet wiederholte Queries
// für dieselbe Region.

import AsyncStorage from '@react-native-async-storage/async-storage';

export { distanceKm } from './geo';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'SalatiboxApp/1.0 (+https://salatibox.de)';
const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // OSM-Daten ändern sich selten

export interface Mosque {
  id: number;
  lat: number;
  lon: number;
  name: string;
  address?: string;
  openingHours?: string;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function buildQuery(lat: number, lon: number, radiusMeters: number): string {
  return `[out:json][timeout:25];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${lat},${lon});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${lat},${lon});
);
out center;`;
}

function toMosque(el: OverpassElement): Mosque | null {
  const point = el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : el.center;
  if (!point) return null;
  const tags = el.tags ?? {};
  const addressParts = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(
    Boolean,
  );
  return {
    id: el.id,
    lat: point.lat,
    lon: point.lon,
    name: tags.name || tags['name:en'] || 'Moschee',
    address: addressParts.length > 0 ? addressParts.join(' ') : undefined,
    openingHours: tags.opening_hours,
  };
}

function cacheKey(lat: number, lon: number, radiusMeters: number): string {
  return `salatibox:mosques:${lat.toFixed(2)}:${lon.toFixed(2)}:${radiusMeters}`;
}

export interface HalalPlace extends Mosque {
  cuisine?: string;
}

function buildHalalQuery(lat: number, lon: number, radiusMeters: number): string {
  return `[out:json][timeout:25];
(
  node["amenity"~"restaurant|fast_food|cafe"]["diet:halal"~"yes|only"](around:${radiusMeters},${lat},${lon});
  way["amenity"~"restaurant|fast_food|cafe"]["diet:halal"~"yes|only"](around:${radiusMeters},${lat},${lon});
);
out center;`;
}

/** Halal-Restaurants/Imbisse via OSM (diet:halal=yes|only) — gleiche Cache-Logik. */
export async function fetchNearbyHalal(
  lat: number,
  lon: number,
  radiusMeters: number,
): Promise<HalalPlace[]> {
  const key = `salatibox:halal:${lat.toFixed(2)}:${lon.toFixed(2)}:${radiusMeters}`;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as { savedAt: number; places: HalalPlace[] };
      if (Date.now() - parsed.savedAt < CACHE_TTL_MS) return parsed.places;
    }
  } catch {
    // Cache-Lesefehler ignorieren
  }

  const r = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'User-Agent': USER_AGENT },
    body: buildHalalQuery(lat, lon, radiusMeters),
  });
  if (!r.ok) throw new Error(`overpass_${r.status}`);
  const data = (await r.json()) as OverpassResponse;
  const places = data.elements
    .map((el) => {
      const base = toMosque(el);
      if (!base) return null;
      return { ...base, name: el.tags?.name || 'Halal', cuisine: el.tags?.cuisine } as HalalPlace;
    })
    .filter((p): p is HalalPlace => p !== null);

  try {
    await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), places }));
  } catch {
    // best-effort
  }

  return places;
}

export async function fetchNearbyMosques(
  lat: number,
  lon: number,
  radiusMeters: number,
): Promise<Mosque[]> {
  const key = cacheKey(lat, lon, radiusMeters);
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as { savedAt: number; mosques: Mosque[] };
      if (Date.now() - parsed.savedAt < CACHE_TTL_MS) return parsed.mosques;
    }
  } catch {
    // Cache-Lesefehler ignorieren, einfach neu laden
  }

  const r = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'User-Agent': USER_AGENT },
    body: buildQuery(lat, lon, radiusMeters),
  });
  if (!r.ok) throw new Error(`overpass_${r.status}`);
  const data = (await r.json()) as OverpassResponse;
  const mosques = data.elements.map(toMosque).filter((m): m is Mosque => m !== null);

  try {
    await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), mosques }));
  } catch {
    // Speicher voll o.ä. — Cache ist best-effort
  }

  return mosques;
}
