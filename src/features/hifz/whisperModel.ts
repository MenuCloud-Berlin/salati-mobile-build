import * as FileSystem from 'expo-file-system/legacy';

// Modell-Download-Verwaltung für den Hifz-Rezitations-Check (whisper.rn, s.
// whisperCheck.ts). Modelle sind NICHT gebündelt (Store-Größenlimits), sondern
// werden einmalig ins Dokumentverzeichnis geladen und sind danach offline
// nutzbar.
//
// MODELL-WAHL (Nutzerwunsch 2026-07-22): Der Nutzer wählt in den Einstellungen
// (settings.recitationModel), welches Modell geladen wird — Kompromiss zwischen
// Genauigkeit, Download-Größe und Handy-Tempo. Auf dem Gerät ist immer nur EIN
// Modell gespeichert (beim Wechsel wird das alte gelöscht, s.
// whisperModellHerunterladen).
//
// Der eigentliche Genauigkeits-Hebel ist NICHT die Modellgröße, sondern die
// Alignment-Methode (s. speech.ts): der erwartete Vers-Text geht als
// `initialPrompt` ins Modell und wird Wort-für-Wort abgeglichen — das zieht
// selbst ein generisches Whisper stark auf die korrekten Koran-Wörter.
//
// KRITISCH (Header-Regel, s. Memory project_salati_whisper_model_ntextctx):
// Jedes GGML-Modell MUSS n_text_ctx=448 haben (Whisper-Standard), sonst kann
// whisper.rn es nicht laden. Alle drei Modelle unten wurden am Header geprüft.
//   base  = tarteel-ai-Koran-Finetune (bashir-manafikhi, F16, ~148 MB) —
//           Koran-optimiert, klein, läuft flüssig auf JEDEM Gerät. Standard.
//   turbo = Whisper large-v3-turbo (ggerganov, q5_0, ~574 MB) — distilliertes
//           Grossmodell, generisch (nicht Koran-tuned), für starke Geräte.
// (large-v3 wurde auf Nutzerwunsch 2026-07-22 wieder entfernt — 1 GB zu gross
// und als generisches Modell nicht koran-genauer; der Conditioning-Hebel wirkt
// modell-unabhängig.)
export type RecitationModelId = 'base' | 'turbo';

const BASHIR_REV = '6f5d283a8de44a6cb4fa89e1c07d9cfe0ac40eab';
const GG = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

export interface RecitationModel {
  id: RecitationModelId;
  dateiname: string;
  url: string;
  /** Fallback für die Fortschrittsanzeige, falls der Server kein Content-Length liefert. */
  groesse: number;
}

export const RECITATION_MODELS: Record<RecitationModelId, RecitationModel> = {
  base: {
    id: 'base',
    dateiname: 'tarteel-whisper-base-ar-quran.bin',
    url: `https://huggingface.co/bashir-manafikhi/quran-whisper-ggml/resolve/${BASHIR_REV}/tarteel-whisper-base-ar-quran.bin`,
    groesse: 147_951_465,
  },
  turbo: {
    id: 'turbo',
    dateiname: 'ggml-large-v3-turbo-q5_0.bin',
    url: `${GG}/ggml-large-v3-turbo-q5_0.bin`,
    groesse: 574_041_195,
  },
};

// In-Memory-Spiegel der Einstellung: der Settings-Store ruft setRecitationModel()
// beim Laden und bei jeder Änderung auf (store.tsx). So bleiben die Pfad-/
// Download-Funktionen synchron und müssen nicht bei jedem Aufruf AsyncStorage lesen.
let currentModelId: RecitationModelId = 'base';

export function setRecitationModel(id: RecitationModelId | undefined): void {
  if (id && id in RECITATION_MODELS) currentModelId = id;
}

export function getRecitationModel(): RecitationModel {
  return RECITATION_MODELS[currentModelId];
}

function whisperModellVerzeichnis(): string {
  return `${FileSystem.documentDirectory}whisper-modell/`;
}

export function whisperModellPfad(): string {
  return `${whisperModellVerzeichnis()}${getRecitationModel().dateiname}`;
}

/** Grösse des AKTUELL gewählten Modells (für Anzeige/Speicher). */
export function aktuelleModellGroesse(): number {
  return getRecitationModel().groesse;
}

// Toleranz: der lokale File kann minimal von der erwarteten Größe abweichen
// (Header/Server-Rundung). >= 98 % gilt als vollständig, < 98 % als Teil-Datei.
const VOLLSTAENDIG_ANTEIL = 0.98;

/**
 * true NUR, wenn die Datei existiert UND (nahezu) die erwartete Modellgröße hat.
 * WICHTIG (User-Bug): früher galt jede Datei > 0 Byte als „fertig" — ein
 * abgebrochener Download (z. B. 30 MB) wurde dann fälschlich als vollständiges
 * Modell behandelt und ließ sich nicht weiterladen.
 */
export async function istWhisperModellHeruntergeladen(): Promise<boolean> {
  const model = getRecitationModel();
  const info = await FileSystem.getInfoAsync(whisperModellPfad());
  return info.exists && (info.size ?? 0) >= model.groesse * VOLLSTAENDIG_ANTEIL;
}

export interface WhisperDownloadFortschritt {
  bytesGeladen: number;
  bytesGesamt: number;
  anteil: number; // 0..1
}

// Modul-Singleton: der Download läuft UNABHÄNGIG vom Screen, der ihn gestartet
// hat (User-Bug: Zurück-Navigieren brach den Download ab). Mehrere Screens
// (Einstellungen, Onboarding, Aufsagen) können denselben laufenden Download
// mit-beobachten; er läuft bis Ende weiter, egal welcher Screen gerade lebt.
interface LaufenderDownload {
  modelId: RecitationModelId;
  promise: Promise<void>;
  fortschritt: WhisperDownloadFortschritt;
  subscribers: Set<(p: WhisperDownloadFortschritt) => void>;
}
let laufenderDownload: LaufenderDownload | null = null;

/** Läuft aktuell ein Download (des aktuell gewählten Modells)? */
export function whisperDownloadLaeuft(): boolean {
  return laufenderDownload !== null && laufenderDownload.modelId === getRecitationModel().id;
}

/** Aktueller Fortschritt eines laufenden Downloads (oder null). */
export function whisperDownloadFortschritt(): WhisperDownloadFortschritt | null {
  return whisperDownloadLaeuft() ? laufenderDownload!.fortschritt : null;
}

/**
 * Lädt das GGML-Modell herunter — persistent (Modul-Singleton). Läuft schon ein
 * Download desselben Modells, wird er nur mit-abonniert (kein Neustart, kein
 * Abbruch). Nach dem Download wird die Dateigröße geprüft; ein unvollständiger
 * Download wird gelöscht und als Fehler gemeldet (nicht als „fertig").
 */
export function whisperModellHerunterladen(
  onProgress: (p: WhisperDownloadFortschritt) => void,
): Promise<void> {
  const model = getRecitationModel();

  if (laufenderDownload && laufenderDownload.modelId === model.id) {
    laufenderDownload.subscribers.add(onProgress);
    onProgress(laufenderDownload.fortschritt);
    return laufenderDownload.promise;
  }

  const dl: LaufenderDownload = {
    modelId: model.id,
    fortschritt: { bytesGeladen: 0, bytesGesamt: model.groesse, anteil: 0 },
    subscribers: new Set([onProgress]),
    promise: Promise.resolve(),
  };
  const emit = (p: WhisperDownloadFortschritt) => {
    dl.fortschritt = p;
    for (const s of dl.subscribers) {
      try {
        s(p);
      } catch {
        // Screen evtl. unmounted — egal, Download läuft weiter.
      }
    }
  };

  dl.promise = (async () => {
    // Verzeichnis leeren: unvollständige Reste + ein ANDERES Modell einer
    // früheren Wahl entfernen (immer nur EIN Modell auf dem Gerät).
    await FileSystem.deleteAsync(whisperModellVerzeichnis(), { idempotent: true }).catch(() => {});
    await FileSystem.makeDirectoryAsync(whisperModellVerzeichnis(), { intermediates: true }).catch(() => {});
    const ziel = whisperModellPfad();

    const resumable = FileSystem.createDownloadResumable(model.url, ziel, {}, (data) => {
      const bytesGesamt =
        data.totalBytesExpectedToWrite > 0 ? data.totalBytesExpectedToWrite : model.groesse;
      emit({
        bytesGeladen: data.totalBytesWritten,
        bytesGesamt,
        anteil: Math.min(1, data.totalBytesWritten / bytesGesamt),
      });
    });

    const result = await resumable.downloadAsync();
    if (!result || result.status !== 200) {
      await FileSystem.deleteAsync(ziel, { idempotent: true }).catch(() => {});
      throw new Error(`Whisper-Modell-Download fehlgeschlagen (Status ${result?.status ?? 'unbekannt'})`);
    }
    // Vollständigkeit prüfen — sonst gilt eine Teil-Datei fälschlich als fertig.
    const info = await FileSystem.getInfoAsync(ziel);
    if (!info.exists || (info.size ?? 0) < model.groesse * VOLLSTAENDIG_ANTEIL) {
      await FileSystem.deleteAsync(ziel, { idempotent: true }).catch(() => {});
      throw new Error('Whisper-Modell-Download unvollständig');
    }
    emit({ bytesGeladen: info.size ?? model.groesse, bytesGesamt: model.groesse, anteil: 1 });
  })().finally(() => {
    laufenderDownload = null;
  });

  laufenderDownload = dl;
  return dl.promise;
}

export async function whisperModellLoeschen(): Promise<void> {
  // Ganzes Verzeichnis: egal welches Modell gerade gewählt ist.
  await FileSystem.deleteAsync(whisperModellVerzeichnis(), { idempotent: true }).catch(() => {});
}
