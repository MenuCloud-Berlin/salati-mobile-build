import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Modell-Download-Verwaltung für die native Salati-KI (llama.rn). Bewusst
// NICHT im App-Bundle (Store-Größenlimits + nicht jeder Nutzer will die KI) —
// einmaliger optionaler Download ins Dokumentverzeichnis, danach komplett
// offline nutzbar. Gleiches Modell wie die Web-Version (public/ki.html
// Standard-Einstellung "1B"): Qwen2.5-1.5B-Instruct, hier als GGUF Q4_K_M
// (llama.cpp-Format, von llama.rn geladen statt WebLLM/WebGPU im Browser).

export const MODELL_ID = 'Qwen2.5-1.5B-Instruct-Q4_K_M';
export const MODELL_DATEINAME = 'qwen2.5-1.5b-instruct-q4_k_m.gguf';
// HuggingFace-Repo Qwen/Qwen2.5-1.5B-Instruct-GGUF, offizielle Qwen-Quantisierung.
export const MODELL_URL = `https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/${MODELL_DATEINAME}`;
// Größe laut HuggingFace-Repo (Stand Recherche) — nur als Fallback für die
// Fortschrittsanzeige, falls der Server keinen Content-Length-Header liefert.
export const MODELL_GROESSE_BYTES = 1_120_000_000;

function modellVerzeichnis(): string {
  return `${FileSystem.documentDirectory}ki-modell/`;
}

export function modellPfad(): string {
  return `${modellVerzeichnis()}${MODELL_DATEINAME}`;
}

/** Web hat kein Dateisystem für große Modell-Downloads — dort bleibt es bei der Browser-Version (WebLLM). */
export function nativeKiUnterstuetzt(): boolean {
  return Platform.OS !== 'web';
}

export async function istModellHeruntergeladen(): Promise<boolean> {
  if (!nativeKiUnterstuetzt()) return false;
  const info = await FileSystem.getInfoAsync(modellPfad());
  return info.exists && (info.size ?? 0) > 0;
}

export interface DownloadFortschritt {
  bytesGeladen: number;
  bytesGesamt: number;
  anteil: number; // 0..1
}

/**
 * Lädt das GGUF-Modell mit Byte-Fortschritt herunter. Wirft bei Netzwerkfehlern
 * (Aufrufer zeigt dann einen Fehler + "Erneut versuchen"-Button, siehe app/ki-native.tsx).
 */
export async function modellHerunterladen(onProgress: (p: DownloadFortschritt) => void): Promise<void> {
  await FileSystem.makeDirectoryAsync(modellVerzeichnis(), { intermediates: true }).catch(() => {});
  const ziel = modellPfad();
  // Unvollständigen Download von einem vorherigen Versuch (App-Kill, Fehler) nicht als "fertig" akzeptieren.
  await FileSystem.deleteAsync(ziel, { idempotent: true }).catch(() => {});

  const resumable = FileSystem.createDownloadResumable(MODELL_URL, ziel, {}, (data) => {
    const bytesGesamt = data.totalBytesExpectedToWrite > 0 ? data.totalBytesExpectedToWrite : MODELL_GROESSE_BYTES;
    onProgress({
      bytesGeladen: data.totalBytesWritten,
      bytesGesamt,
      anteil: Math.min(1, data.totalBytesWritten / bytesGesamt),
    });
  });

  const result = await resumable.downloadAsync();
  if (!result || result.status !== 200) {
    await FileSystem.deleteAsync(ziel, { idempotent: true }).catch(() => {});
    throw new Error(`Download fehlgeschlagen (Status ${result?.status ?? 'unbekannt'})`);
  }
}

export async function modellLoeschen(): Promise<void> {
  await FileSystem.deleteAsync(modellPfad(), { idempotent: true }).catch(() => {});
}

export function formatiereBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / 1_000_000;
  if (mb < 1000) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1000).toFixed(2)} GB`;
}
