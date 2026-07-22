import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// OTA-Content-Updates für die Studium-Kurse (Nutzerwunsch 2026-07-22).
//
// Warum: Die Kurs-JSONs (src/features/study/data/*.json, ~6,8 MB) sind im App-
// Bundle gebündelt und sofort OFFLINE verfügbar — das bleibt so (Offline-First
// ist Pflicht, s. docs/SUPABASE-AUSLAGERUNG.md). Diese Schicht legt NUR eine
// Aktualisierungs-Möglichkeit obendrauf: ist Internet da und liegt in Supabase
// eine NEUERE Version eines Kurses als die gebündelte, wird sie einmalig ins
// Dokumentverzeichnis geladen und danach bevorzugt gelesen. So lassen sich
// Kursinhalte korrigieren/erweitern OHNE Store-Release. Kein Netz / kein
// neueres Manifest → unverändert das gebündelte JSON. Die APK wird dadurch NICHT
// kleiner (Seed bleibt gebündelt) — der Gewinn ist die Update-Fähigkeit.
//
// Public Bucket, nur per fetch gelesen (kein Supabase-Client, kein Key nötig) —
// gleiches Muster wie der Podcast-Index (features/podcast/data.ts).
const REMOTE_BASE =
  'https://oulyzhselufekxekkqjp.supabase.co/storage/v1/object/public/study';
const MANIFEST_URL = `${REMOTE_BASE}/manifest.json`;

// Version, die das GEBÜNDELTE JSON repräsentiert. Bei einem App-Release mit
// aktualisierten Kurs-Daten hier UND im Bundle hochzählen — dann ignoriert der
// Client einen älteren zwischengespeicherten Download automatisch (ein neueres
// Bundle schlägt immer einen älteren Cache).
export const COURSE_BUNDLED_VERSION = 1;

const CACHE_DIR = `${FileSystem.documentDirectory}study-courses/`;
const verKey = (id: string) => `salatibox:course-ver-${id}`;
const cachePath = (id: string) => `${CACHE_DIR}${id}.json`;

interface CourseManifest {
  versions?: Record<string, number>;
}

/** Version des zwischengespeicherten Kurs-JSONs (0 = kein Cache). */
async function cachedVersion(id: string): Promise<number> {
  const raw = await AsyncStorage.getItem(verKey(id)).catch(() => null);
  const v = raw ? Number(raw) : 0;
  return Number.isFinite(v) ? v : 0;
}

/**
 * Liefert das zwischengespeicherte Kurs-JSON (geparst) ODER null. null, wenn:
 * Web (kein Dateisystem), kein neuerer Cache als das Bundle, Datei fehlt/kaputt.
 * courses.ts fällt bei null auf den gebündelten dynamic import() zurück.
 */
export async function loadCachedCourseJson(id: string): Promise<unknown | null> {
  if (Platform.OS === 'web') return null;
  try {
    // Ein Cache zählt nur, wenn er NEUER als das gebündelte JSON ist — sonst ist
    // das (evtl. per App-Update erneuerte) Bundle aktueller.
    if ((await cachedVersion(id)) <= COURSE_BUNDLED_VERSION) return null;
    const info = await FileSystem.getInfoAsync(cachePath(id));
    if (!info.exists) return null;
    const text = await FileSystem.readAsStringAsync(cachePath(id));
    const parsed = JSON.parse(text);
    // Minimal-Validierung: muss ein lessons-Array haben, sonst Bundle bevorzugen.
    if (!parsed || !Array.isArray((parsed as { lessons?: unknown }).lessons)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let syncLaufend: Promise<void> | null = null;

/**
 * Prüft einmalig das Supabase-Manifest und lädt jeden Kurs nach, dessen
 * Remote-Version NEUER ist als die gebündelte UND als der vorhandene Cache.
 * Läuft beim App-Start fire-and-forget (native, mit Netz); wirft nie, blockiert
 * nichts. Mehrfachaufrufe teilen sich denselben Lauf.
 */
export function syncCoursesFromRemote(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (syncLaufend) return syncLaufend;
  syncLaufend = (async () => {
    try {
      const r = await fetch(MANIFEST_URL, { cache: 'no-cache' });
      if (!r.ok) return;
      const manifest = (await r.json()) as CourseManifest;
      const versions = manifest.versions ?? {};
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});
      for (const [id, remoteRaw] of Object.entries(versions)) {
        const remote = Number(remoteRaw);
        if (!Number.isFinite(remote)) continue;
        const haveVersion = Math.max(COURSE_BUNDLED_VERSION, await cachedVersion(id));
        if (remote <= haveVersion) continue;
        try {
          const cr = await fetch(`${REMOTE_BASE}/${id}.json`, { cache: 'no-cache' });
          if (!cr.ok) continue;
          const text = await cr.text();
          const parsed = JSON.parse(text);
          if (!parsed || !Array.isArray((parsed as { lessons?: unknown }).lessons)) continue;
          await FileSystem.writeAsStringAsync(cachePath(id), text);
          await AsyncStorage.setItem(verKey(id), String(remote));
        } catch {
          // Einzelner Kurs fehlgeschlagen — nächster; Bundle bleibt gültig.
        }
      }
    } catch {
      // Kein Netz / Manifest-Fehler → gebündelte Kurse bleiben unverändert.
    } finally {
      syncLaufend = null;
    }
  })();
  return syncLaufend;
}
