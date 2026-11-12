/**
 * Source publique de secours : API Quran.com v4.
 * Utilisée quand le backend Laravel ne répond pas, pour que l'app fonctionne
 * partout. Même traduction française que le backend (Muhammad Hamidullah, id 31),
 * translittération latine (id 57).
 */
import type { Surah, Verse } from '@/stores/quranStore';
import { VERSE_COUNTS } from '@/utils/quranMeta';

const BASE = 'https://api.quran.com/api/v4';
const FR_HAMIDULLAH = 31;
const TRANSLITERATION = 57;

async function get(path: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Quran.com HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Retire les appels de note (<sup>…</sup>) et toute balise HTML */
const clean = (html?: string) =>
  (html ?? '')
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function toSurah(c: any): Surah {
  return {
    id: c.id,
    number: c.id,
    name_arabic: c.name_arabic,
    name_french: c.translated_name?.name ?? c.name_simple,
    name_transliteration: c.name_simple,
    verses_count: c.verses_count,
    revelation_type: c.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
  };
}

function toVerse(v: any, surah: number): Verse {
  const tr = (id: number) => v.translations?.find((t: any) => t.resource_id === id)?.text;
  return {
    id: v.id,
    surah_id: surah,
    verse_number: v.verse_number,
    global_number: v.id,
    text_arabic: v.text_uthmani,
    text_uthmani: v.text_uthmani,
    text_french: clean(tr(FR_HAMIDULLAH)),
    text_transliteration: clean(tr(TRANSLITERATION)),
    juz: v.juz_number,
    hizb: v.hizb_number,
    page: v.page_number,
  };
}

const VERSE_QUERY = `translations=${FR_HAMIDULLAH},${TRANSLITERATION}&fields=text_uthmani`;

export const quranPublicApi = {
  async surahs(): Promise<Surah[]> {
    const data = await get('/chapters?language=fr');
    return (data.chapters ?? []).map(toSurah);
  },

  async surah(n: number): Promise<Surah> {
    const data = await get(`/chapters/${n}?language=fr`);
    return toSurah(data.chapter);
  },

  async verses(n: number): Promise<Verse[]> {
    const out: Verse[] = [];
    let page = 1;
    // 50 versets par page au maximum : Al-Baqara demande 6 appels
    for (;;) {
      const data = await get(`/verses/by_chapter/${n}?${VERSE_QUERY}&per_page=50&page=${page}`);
      out.push(...(data.verses ?? []).map((v: any) => toVerse(v, n)));
      const next = data.pagination?.next_page;
      if (!next) break;
      page = next;
    }
    return out;
  },

  async verseByGlobal(global: number): Promise<Verse> {
    let rest = global;
    let surah = 1;
    while (surah <= 114 && rest > VERSE_COUNTS[surah - 1]) {
      rest -= VERSE_COUNTS[surah - 1];
      surah += 1;
    }
    const data = await get(`/verses/by_key/${surah}:${rest}?${VERSE_QUERY}`);
    return { ...toVerse(data.verse, surah), surah: { id: surah, number: surah } as Surah };
  },
};
