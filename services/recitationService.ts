/**
 * Audio des versets + découpage mot à mot.
 *
 * Source principale : API publique Quran.com v4, qui fournit pour chaque verset
 * l'URL audio du récitateur ET les horodatages de chaque mot (segments). On a
 * donc un surlignage mot à mot réellement synchronisé avec la voix, sans
 * dépendre du backend.
 *
 * Pour les récitateurs absents de Quran.com, on utilise le CDN islamic.network
 * (alquran.cloud) : audio uniquement, mots affichés sans synchronisation.
 */
import type { Reciter } from '@/stores/reciterStore';
import { offlineReader } from '@/services/offlineService';

const QURAN_COM_API = 'https://api.quran.com/api/v4';
const QURAN_COM_AUDIO = 'https://verses.quran.com/';
const ISLAMIC_NETWORK_AUDIO = 'https://cdn.islamic.network/quran/audio';

export interface VerseWord {
  position: number; // 1-based
  arabic: string;
  transliteration?: string;
  translation?: string;
}

export interface WordSegment {
  position: number; // position du mot (1-based)
  startMs: number;
  endMs: number;
}

export interface VerseAudio {
  url: string;
  segments: WordSegment[]; // vide si pas de synchronisation disponible
  words: VerseWord[];
}

const cache = new Map<string, Promise<VerseAudio>>();

function absoluteUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return QURAN_COM_AUDIO + url.replace(/^\//, '');
}

/** Les segments arrivent sous la forme [index, position, début, fin] ou [position, début, fin]. */
function parseSegments(raw: unknown): WordSegment[] {
  if (!Array.isArray(raw)) return [];
  const out: WordSegment[] = [];
  for (const seg of raw) {
    if (!Array.isArray(seg)) continue;
    const n = seg.map(Number);
    if (n.some((x) => Number.isNaN(x))) continue;
    if (n.length >= 4) out.push({ position: n[1], startMs: n[2], endMs: n[3] });
    else if (n.length === 3) out.push({ position: n[0], startMs: n[1], endMs: n[2] });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

async function fetchJson(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function fallbackUrl(reciter: Reciter, globalNumber: number) {
  const edition = reciter.audioApiId || 'ar.alafasy';
  const bitrate = reciter.bitrate ?? 128;
  return `${ISLAMIC_NETWORK_AUDIO}/${bitrate}/${edition}/${globalNumber}.mp3`;
}

async function load(reciter: Reciter, surah: number, ayah: number, globalNumber: number): Promise<VerseAudio> {
  const key = `${surah}:${ayah}`;
  const audioParam = reciter.quranComId ? `&audio=${reciter.quranComId}` : '';
  let words: VerseWord[] = [];
  let segments: WordSegment[] = [];
  let url: string | undefined;

  try {
    const data = await fetchJson(
      `${QURAN_COM_API}/verses/by_key/${key}?words=true&word_fields=text_uthmani${audioParam}`
    );
    const verse = data?.verse;
    words = (verse?.words ?? [])
      .filter((w: any) => w.char_type_name === 'word')
      .map((w: any) => ({
        position: w.position,
        arabic: w.text_uthmani ?? w.text,
        transliteration: w.transliteration?.text ?? undefined,
        translation: w.translation?.text ?? undefined,
      }));
    if (reciter.quranComId && verse?.audio?.url) {
      url = absoluteUrl(verse.audio.url);
      segments = parseSegments(verse.audio.segments);
    }
  } catch (e) {
    console.warn('[recitation] Quran.com indisponible, repli sur islamic.network', e);
  }

  return { url: url ?? fallbackUrl(reciter, globalNumber), segments, words };
}

export const recitationService = {
  /** URL distante d'une sourate entière (récitateurs en mode « sourate ») */
  remoteSurahAudioUrl(reciter: Reciter, surah: number): string | undefined {
    return reciter.surahAudioBase ? `${reciter.surahAudioBase}${String(surah).padStart(3, '0')}.mp3` : undefined;
  },

  /** Sourate entière : fichier téléchargé s'il existe, sinon l'URL distante */
  surahAudioUrl(reciter: Reciter, surah: number): string | undefined {
    if (!reciter.surahAudioBase) return undefined;
    return offlineReader.surahAudio(reciter.id, surah) ?? this.remoteSurahAudioUrl(reciter, surah);
  },

  getVerseAudio(reciter: Reciter, surah: number, ayah: number, globalNumber: number): Promise<VerseAudio> {
    // Verset téléchargé : lecture locale, mots et horodatages compris
    const local = offlineReader.verseAudio(reciter.id, surah, ayah);
    if (local) return Promise.resolve(local);
    return this.getRemoteVerseAudio(reciter, surah, ayah, globalNumber);
  },

  getRemoteVerseAudio(reciter: Reciter, surah: number, ayah: number, globalNumber: number) {
    const key = `${reciter.id}|${surah}:${ayah}`;
    let p = cache.get(key);
    if (!p) {
      p = load(reciter, surah, ayah, globalNumber);
      // En cas d'échec on n'empoisonne pas le cache
      p.catch(() => cache.delete(key));
      cache.set(key, p);
    }
    return p;
  },

  /** URL de repli si la source principale ne se charge pas. */
  fallbackUrl,

  /** Index (0-based dans `words`) du mot prononcé à `ms`, ou -1. */
  wordIndexAt(audio: VerseAudio, ms: number): number {
    if (!audio.segments.length) return -1;
    let current: WordSegment | undefined;
    for (const s of audio.segments) {
      if (s.startMs <= ms) current = s;
      else break;
    }
    if (!current) return -1;
    return audio.words.findIndex((w) => w.position === current!.position);
  },
};
