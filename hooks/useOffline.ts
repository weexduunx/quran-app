import { useCallback } from 'react';
import { downloadKey, useOfflineStore } from '@/stores/offlineStore';
import { Reciter, useReciterStore } from '@/stores/reciterStore';
import { offlineService } from '@/services/offlineService';
import { recitationService } from '@/services/recitationService';
import { quranApi } from '@/services/api';

const deps = {
  getVerses: (n: number) => quranApi.getVersesBySurah(n),
  getVerseAudio: (r: Reciter, s: number, a: number, g: number) => recitationService.getRemoteVerseAudio(r, s, a, g),
  surahAudioUrl: (r: Reciter, s: number) => recitationService.remoteSurahAudioUrl(r, s),
};

export function downloadSurah(reciter: Reciter, surah: number) {
  return offlineService.downloadSurah(reciter, surah, deps);
}

/** Télécharge plusieurs sourates l'une après l'autre (sans bloquer l'interface). */
export async function downloadSurahs(reciter: Reciter, surahs: number[]) {
  for (const s of surahs) {
    const entry = useOfflineStore.getState().downloads[downloadKey(reciter.id, s)];
    if (entry?.status === 'done') continue;
    await downloadSurah(reciter, s);
  }
}

/** État de téléchargement d'une sourate pour le récitateur choisi. */
export function useSurahDownload(surah: number) {
  const reciter = useReciterStore((s) => s.getSelectedReciter());
  const entry = useOfflineStore((s) => s.downloads[downloadKey(reciter.id, surah)]);

  const start = useCallback(() => downloadSurah(reciter, surah), [reciter, surah]);
  const cancel = useCallback(() => offlineService.cancel(reciter.id, surah), [reciter.id, surah]);
  const remove = useCallback(() => offlineService.remove(reciter.id, surah), [reciter.id, surah]);

  return { reciter, entry, start, cancel, remove };
}

export const formatBytes = (b: number) =>
  b >= 1e9 ? `${(b / 1e9).toFixed(1).replace('.', ',')} Go` : b >= 1e6 ? `${Math.round(b / 1e6)} Mo` : `${Math.max(1, Math.round(b / 1e3))} Ko`;
