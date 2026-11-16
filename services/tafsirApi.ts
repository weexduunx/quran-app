/**
 * Accès aux tafsirs réels.
 * - Texte : API Quran.com v4 (`/tafsirs/{id}/by_ayah/{s:a}`), HTML converti en blocs.
 * - Audio wolof : collection Internet Archive (Oustaz Ibrahima Fall).
 *   Pour ajouter un tafsir audio : un livre `kind: 'audio'` dans tafsirStore
 *   + une entrée dans AUDIO_SOURCES ci-dessous.
 */
import type { TafsirBook } from '@/stores/tafsirStore';

const QURAN_COM_API = 'https://api.quran.com/api/v4';

export type TafsirBlock = { type: 'heading' | 'paragraph'; text: string };

export interface TafsirText {
  blocks: TafsirBlock[];
  /** Versets couverts par ce commentaire (ex. ['2:1', '2:2']) */
  verseKeys: string[];
}

const textCache = new Map<string, Promise<TafsirText>>();

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');

/** Convertit le HTML de Quran.com en titres + paragraphes lisibles. */
export function htmlToBlocks(html: string): TafsirBlock[] {
  const blocks: TafsirBlock[] = [];
  const marked = html
    .replace(/<h[1-6][^>]*>/gi, '\n\u0001')
    .replace(/<\/h[1-6]>/gi, '\u0002\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  for (const raw of decodeEntities(marked).split('\n')) {
    const isHeading = raw.includes('\u0001');
    const text = raw.replace(/[\u0001\u0002]/g, '').replace(/[ \t]+/g, ' ').trim();
    if (!text) continue;
    blocks.push({ type: isHeading ? 'heading' : 'paragraph', text });
  }
  return blocks;
}

async function fetchText(resourceId: number, verseKey: string): Promise<TafsirText> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${QURAN_COM_API}/tafsirs/${resourceId}/by_ayah/${verseKey}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const t = json?.tafsir;
    return {
      blocks: htmlToBlocks(t?.text ?? ''),
      verseKeys: Object.keys(t?.verses ?? {}),
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface AudioTrack {
  title: string;
  url: string;
}

// Oustaz Ibrahima Fall — https://archive.org/details/tafsirfall (114 sourates)
const ibrahimaFallTracks = (surah: number): AudioTrack[] => [
  {
    title: 'Sourate complète',
    url: `https://archive.org/download/tafsirfall/S${String(surah).padStart(3, '0')}_Tafsir_Coran_de_Oustaz_Ibrahima_Fall.mp3`,
  },
];

/** Pistes audio par livre : (sourate) → pistes ([] si non disponible) */
const AUDIO_SOURCES: Record<string, (surah: number) => AudioTrack[]> = {
  'ibrahima-fall': ibrahimaFallTracks,
};

export const tafsirApi = {
  getText(book: TafsirBook, surah: number, verse: number): Promise<TafsirText> {
    if (!book.quranComId) return Promise.reject(new Error('Livre sans texte'));
    const key = `${book.quranComId}|${surah}:${verse}`;
    let p = textCache.get(key);
    if (!p) {
      p = fetchText(book.quranComId, `${surah}:${verse}`);
      p.catch(() => textCache.delete(key));
      textCache.set(key, p);
    }
    return p;
  },

  /** Pistes audio d'un livre pour une sourate. */
  getAudioTracks(bookId: string, surah: number): AudioTrack[] {
    return AUDIO_SOURCES[bookId]?.(surah) ?? [];
  },

  hasAudio(bookId: string, surah: number) {
    return this.getAudioTracks(bookId, surah).length > 0;
  },
};
