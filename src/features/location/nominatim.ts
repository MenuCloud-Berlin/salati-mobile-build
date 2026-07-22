// Muster portiert aus apps/device/src/components/Settings.tsx (Stadtsuche für
// die manuelle Standort-Auswahl, Fallback wenn Geräte-Standort nicht möglich/
// gewünscht ist).

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: { country?: string; country_code?: string };
}

// Nominatims Nutzungsrichtlinie (https://operations.osmfoundation.org/policies/nominatim/)
// verlangt einen aussagekräftigen User-Agent ODER Referer, der die Anwendung
// identifiziert - ohne einen von beidem antwortet der Dienst mit HTTP 403
// "Access denied" (verifiziert per curl: Requests ganz ohne User-Agent bzw.
// mit generischem Test-UA werden abgelehnt, derselbe Request mit
// aussagekräftigem User-Agent liefert normale Treffer). React Natives
// fetch() auf Android/iOS setzt von sich aus KEINEN aussagekräftigen
// User-Agent (z. B. okhttp/…), das führte live im Emulator zu einer leeren
// Ergebnisliste ohne jede Fehlermeldung (Audit 2026-07-21, Bereich A:
// "Mehrere gespeicherte Orte" - Stadtsuche lieferte nie Treffer).
const NOMINATIM_USER_AGENT = 'SalatiBox/1.0 (+info@menucloud-berlin.de)';

export async function searchCity(query: string, signal?: AbortSignal): Promise<NominatimResult[]> {
  if (query.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(
    query,
  )}`;
  const r = await fetch(url, {
    signal,
    headers: { 'Accept-Language': 'de', 'User-Agent': NOMINATIM_USER_AGENT },
  });
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

export function nominatimResultToLocation(r: NominatimResult) {
  const addr = r.display_name.split(',');
  const city = (addr[0] ?? r.display_name).trim();
  const country = (r.address?.country_code || '').toUpperCase() || 'DE';
  return {
    city,
    country,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    label: `${city}${r.address?.country ? ', ' + r.address.country : ''}`,
  };
}
