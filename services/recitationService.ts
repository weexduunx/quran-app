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
import { VERSE_COUNTS, globalVerseNumber } from '@/utils/quranMeta';

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
/** Mots déjà chargés, lisibles sans attendre (clé `récitateur|sourate:verset`) */
const wordsReady = new Map<string, VerseWord[]>();

/**
 * Audio de toute une sourate (une seule requête Quran.com), gardé en mémoire
 * pour pouvoir passer au verset suivant sans réseau ni attente.
 *
 * Indispensable en arrière-plan sur Android : React Native y gèle les
 * minuteries, et `fetch` (polyfill whatwg-fetch) ne se résout qu'à travers un
 * setTimeout. Un verset qui attendrait le réseau pour démarrer ne démarrerait
 * qu'au retour dans l'app.
 */
type ChapterAudio = Record<number, { url: string; segments: WordSegment[] }>;
const chapterReady = new Map<string, ChapterAudio>();
const chapterLoading = new Map<string, Promise<void>>();

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
    words = parseWords(verse);
    if (reciter.quranComId && verse?.audio?.url) {
      url = absoluteUrl(verse.audio.url);
      segments = parseSegments(verse.audio.segments);
    }
  } catch (e) {
    console.warn('[recitation] Quran.com indisponible, repli sur islamic.network', e);
  }

  return { url: url ?? fallbackUrl(reciter, globalNumber), segments, words };
}

async function loadChapter(reciter: Reciter, surah: number) {
  const data = await fetchJson(
    `${QURAN_COM_API}/recitations/${reciter.quranComId}/by_chapter/${surah}?per_page=300&fields=segments`,
    15000
  );
  const map: ChapterAudio = {};
  for (const f of data?.audio_files ?? []) {
    const ayah = Number(String(f.verse_key ?? '').split(':')[1]);
    if (!ayah || !f.url) continue;
    map[ayah] = { url: absoluteUrl(f.url), segments: parseSegments(f.segments) };
  }
  if (!Object.keys(map).length) throw new Error('Sourate sans audio');
  chapterReady.set(`${reciter.id}|${surah}`, map);
}

const parseWords = (verse: any): VerseWord[] =>
  (verse?.words ?? [])
    .filter((w: any) => w.char_type_name === 'word')
    .map((w: any) => ({
      position: w.position,
      arabic: w.text_uthmani ?? w.text,
      transliteration: w.transliteration?.text ?? undefined,
      translation: w.translation?.text ?? undefined,
    }));

/** Mot à mot de toute la sourate (50 versets par page), pour l'avoir même écran éteint */
async function loadChapterWords(reciter: Reciter, surah: number) {
  const pages = Math.ceil((VERSE_COUNTS[surah - 1] ?? 0) / 50);
  await Promise.all(
    Array.from({ length: pages }, async (_, i) => {
      const data = await fetchJson(
        `${QURAN_COM_API}/verses/by_chapter/${surah}?words=true&word_fields=text_uthmani&per_page=50&page=${i + 1}`,
        15000
      );
      for (const v of data?.verses ?? []) {
        const words = parseWords(v);
        if (words.length) wordsReady.set(`${reciter.id}|${v.verse_key}`, words);
      }
    })
  );
}

export const recitationService = {
  /** Nombre de versets d'une sourate */
  verseCount: (surah: number) => VERSE_COUNTS[surah - 1] ?? 0,

  /**
   * Charge à l'avance l'audio, les horodatages et le mot à mot de toute une
   * sourate (à appeler au premier plan, quand le réseau répond normalement).
   * Sans effet si c'est déjà fait.
   */
  prefetchChapter(reciter: Reciter, surah: number): Promise<void> {
    if (surah < 1 || surah > 114) return Promise.resolve();
    const key = `${reciter.id}|${surah}`;
    if ((chapterReady.has(key) || !reciter.quranComId) && wordsReady.has(`${key}:1`)) return Promise.resolve();
    let p = chapterLoading.get(key);
    if (!p) {
      p = Promise.all([
        reciter.quranComId && !chapterReady.has(key) ? loadChapter(reciter, surah) : null,
        wordsReady.has(`${key}:1`) ? null : loadChapterWords(reciter, surah),
      ])
        .then(() => {})
        .catch((e) => console.warn('[recitation] sourate non préchargée', surah, e))
        .finally(() => chapterLoading.delete(key));
      chapterLoading.set(key, p);
    }
    return p;
  },

  /**
   * Audio d'un verset disponible TOUT DE SUITE, sans réseau : fichier
   * téléchargé, sourate préchargée, ou à défaut l'URL calculée du CDN
   * islamic.network (même récitateur, sans mot à mot).
   */
  verseAudioNow(reciter: Reciter, surah: number, ayah: number): VerseAudio {
    const local = offlineReader.verseAudio(reciter.id, surah, ayah);
    if (local) return local;
    const words = wordsReady.get(`${reciter.id}|${surah}:${ayah}`) ?? [];
    const chapter = chapterReady.get(`${reciter.id}|${surah}`)?.[ayah];
    if (chapter) return { url: chapter.url, segments: chapter.segments, words };
    return { url: fallbackUrl(reciter, globalVerseNumber(surah, ayah)), segments: [], words };
  },


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
      p.then((a) => a.words.length && wordsReady.set(key, a.words)).catch(() => {});
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
