import { useEffect, useState } from 'react';
import { useQuranStore, Surah, Verse } from '@/stores/quranStore';
import { quranApi } from '@/services/api';

/** Liste des 114 sourates (store partagé, chargée une seule fois). */
export function useSurahs() {
  const surahs = useQuranStore((s) => s.surahs);
  const setSurahs = useQuranStore((s) => s.setSurahs);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (surahs.length) return;
    let alive = true;
    quranApi
      .getSurahs()
      .then((list) => alive && setSurahs(list))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [surahs.length, setSurahs]);

  return { surahs, error };
}

const versesCache = new Map<number, Promise<Verse[]>>();

/** Versets d'une sourate (mémoire partagée entre écrans). */
export function useSurahVerses(surahNumber: number) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(false);
    let p = versesCache.get(surahNumber);
    if (!p) {
      p = quranApi.getVersesBySurah(surahNumber);
      p.catch(() => versesCache.delete(surahNumber));
      versesCache.set(surahNumber, p);
    }
    p.then((v) => alive && setVerses(v)).catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [surahNumber]);

  return { verses, error };
}

export type { Surah };
