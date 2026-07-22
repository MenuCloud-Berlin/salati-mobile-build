// Podcast-Daten: der deutsche Quran-Arabisch-Podcast (15 Folgen). Audio,
// Cover, Transkript und Metadaten liegen im OeFFENTLICHEN Supabase-Storage-
// Bucket `podcasts` und werden ueber eine einzige index.json geladen — kein
// Supabase-Client noetig (gleiches Muster wie fetchRadios: nur `fetch`).
// Erzeugt/gepflegt von podcast/scripts/upload.py.

const PODCAST_BASE =
  'https://oulyzhselufekxekkqjp.supabase.co/storage/v1/object/public/podcasts';
export const PODCAST_INDEX_URL = `${PODCAST_BASE}/index.json`;

/** Ein Transkript-Segment: deutscher Erzaehltext oder arabische Rezitation.
 *  `ar`-Segmente werden im Reader RTL + mit der Koran-Schrift gerendert. */
export interface TranscriptSegment {
  type: 'de' | 'ar';
  text: string;
  /** Startzeit im Audio (ms), falls die Vertonung Zeitmarken geliefert hat —
   *  ermoeglicht synchrones Mitlesen (Segment-Highlight). Optional. */
  start_ms?: number;
  end_ms?: number;
}

export interface PodcastEpisode {
  episode_no: number;
  title: string;
  description?: string;
  topics: string[];
  duration_sec: number;
  audio_url: string;
  cover_url: string;
  transcript: TranscriptSegment[];
}

export interface PodcastSeries {
  title: string;
  subtitle: string;
  description: string;
  cover_url: string;
}

export interface PodcastIndex {
  updated_at: string;
  series: PodcastSeries;
  episodes: PodcastEpisode[];
}

export async function fetchPodcastIndex(): Promise<PodcastIndex> {
  const r = await fetch(PODCAST_INDEX_URL, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`podcast_index_${r.status}`);
  const j = (await r.json()) as PodcastIndex;
  j.episodes = (j.episodes ?? []).sort((a, b) => a.episode_no - b.episode_no);
  return j;
}

/** mm:ss aus Sekunden. */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
