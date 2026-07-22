import AsyncStorage from '@react-native-async-storage/async-storage';

import { decodeBase64, encodeBase64 } from './base64';

// Übertragung von Lern-/Betfortschritt zwischen Geräten (Handy<->Handy,
// Handy<->Web) OHNE Server/Account/Kosten: der Nutzer exportiert einen Code
// (Text), überträgt ihn selbst (Kopieren+Einfügen in eine Notiz/Nachricht/
// E-Mail an sich selbst — beliebiger Kanal, den der Nutzer schon hat) und
// importiert ihn auf dem Zielgerät. Bewusst NUR echte Fortschritts-Domänen —
// keine Geräte-Einstellungen (Sprache/Rezitator/Theme bleiben pro Gerät) und
// kein Offline-Audio-Cache-Index (kein Fortschritt, einfach neu ladbar).
export const SYNC_STORAGE_KEYS = [
  'salatibox:quran-progress',
  'salatibox:learn-progress',
  'salatibox:hifz-progress',
  'salatibox:khatmah',
  'salatibox:prayer-tracker',
  'salatibox:tasbih',
  'salatibox:fasting',
  'salatibox:practice-stats',
  'salatibox:review',
  'salatibox:mistakes',
] as const;

export type SyncStorageKey = (typeof SYNC_STORAGE_KEYS)[number];

export interface SyncPayload {
  v: 1;
  exportedAt: string;
  data: Partial<Record<SyncStorageKey, string>>;
}

/** Reiner Aufbau des Payload-Objekts aus bereits gelesenen Werten — ohne AsyncStorage, daher ohne Mock testbar. */
export function buildSyncPayload(values: Partial<Record<SyncStorageKey, string | null>>): SyncPayload {
  const data: Partial<Record<SyncStorageKey, string>> = {};
  for (const key of SYNC_STORAGE_KEYS) {
    const value = values[key];
    if (value != null) data[key] = value;
  }
  return { v: 1, exportedAt: new Date().toISOString(), data };
}

export function encodeSyncPayload(payload: SyncPayload): string {
  return encodeBase64(JSON.stringify(payload));
}

export class InvalidSyncCodeError extends Error {
  constructor() {
    super('invalid_sync_code');
  }
}

/** Wirft InvalidSyncCodeError bei kaputtem/fremdem Code statt eines kryptischen JSON-Fehlers. */
export function decodeSyncPayload(code: string): SyncPayload {
  let json: string;
  try {
    json = decodeBase64(code.trim());
  } catch {
    throw new InvalidSyncCodeError();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidSyncCodeError();
  }
  const data = (parsed as { data?: unknown } | null)?.data;
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { v?: unknown }).v !== 1 ||
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data)
  ) {
    throw new InvalidSyncCodeError();
  }
  return parsed as SyncPayload;
}

export async function exportProgressCode(): Promise<string> {
  const entries = await AsyncStorage.multiGet(SYNC_STORAGE_KEYS);
  const values: Partial<Record<SyncStorageKey, string | null>> = {};
  for (const [key, value] of entries) {
    values[key as SyncStorageKey] = value;
  }
  return encodeSyncPayload(buildSyncPayload(values));
}

/** Schreibt die im Code enthaltenen Domänen zurück in AsyncStorage. Bereits
 * laufende Screens lesen ihre Daten teils nur einmalig beim Start — ein
 * Neustart der App nach dem Import stellt sicher, dass alles greift. */
export async function importProgressCode(code: string): Promise<{ restoredKeys: SyncStorageKey[] }> {
  const payload = decodeSyncPayload(code);
  const restoredKeys = Object.keys(payload.data) as SyncStorageKey[];
  const validKeys = restoredKeys.filter((k) => (SYNC_STORAGE_KEYS as readonly string[]).includes(k));
  await AsyncStorage.multiSet(validKeys.map((k) => [k, payload.data[k] as string]));
  return { restoredKeys: validKeys };
}
