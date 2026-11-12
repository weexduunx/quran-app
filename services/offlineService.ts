/**
 * Téléchargement hors ligne : texte + audio d'une sourate pour un récitateur.
 *
 * Arborescence (dans le dossier documents de l'app, jamais vidé par le système) :
 *   offline/text/surahs.json            liste des sourates
 *   offline/text/<n>.json               versets de la sourate n
 *   offline/audio/<reciter>/<n>/<a>.mp3 un fichier par verset (+ meta.json : mots et horodatages)
 *   offline/audio/<reciter>/<n>/surah.mp3  récitateurs « sourate entière »
 */
import { Directory, File, Paths } from 'expo-file-system';

import type { Surah, Verse } from '@/stores/quranStore';
import type { Reciter } from '@/stores/reciterStore';
import { downloadKey, useOfflineStore } from '@/stores/offlineStore';
import type { VerseAudio } from '@/services/recitationService';

const root = () => new Directory(Paths.document, 'offline');
const textDir = () => new Directory(root(), 'text');
const audioDir = (reciterId: number, surah: number) =>
  new Directory(root(), 'audio', String(reciterId), String(surah));

function ensure(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function readJson<T>(file: File): T | null {
  try {
    return file.exists ? (JSON.parse(file.textSync()) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(file: File, data: unknown) {
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data));
}

function dirSize(dir: Directory): number {
  if (!dir.exists) return 0;
  let total = 0;
  for (const item of dir.list()) total += item instanceof Directory ? dirSize(item) : item.size ?? 0;
  return total;
}

type VerseMeta = Record<number, Pick<VerseAudio, 'segments' | 'words'>>;

// ---------------------------------------------------------------------------
// Lecture (utilisée par l'API et le lecteur quand un fichier local existe)
// ---------------------------------------------------------------------------
export const offlineReader = {
  surahs(): Surah[] | null {
    return readJson<Surah[]>(new File(textDir(), 'surahs.json'));
  },
  verses(surah: number): Verse[] | null {
    return readJson<Verse[]>(new File(textDir(), `${surah}.json`));
  },
  verseAudio(reciterId: number, surah: number, ayah: number): VerseAudio | null {
    const dir = audioDir(reciterId, surah);
    const file = new File(dir, `${ayah}.mp3`);
    if (!file.exists) return null;
    const meta = readJson<VerseMeta>(new File(dir, 'meta.json'))?.[ayah];
    return { url: file.uri, segments: meta?.segments ?? [], words: meta?.words ?? [] };
  },
  surahAudio(reciterId: number, surah: number): string | null {
    const file = new File(audioDir(reciterId, surah), 'surah.mp3');
    return file.exists ? file.uri : null;
  },
};

/** Sauvegarde du texte dès qu'il est chargé en ligne : lecture hors ligne même sans téléchargement explicite. */
export function saveTextLocally(surah: number | 'list', data: Surah[] | Verse[]) {
  try {
    ensure(textDir());
    writeJson(new File(textDir(), surah === 'list' ? 'surahs.json' : `${surah}.json`), data);
  } catch (e) {
    console.warn('[offline] texte non sauvegardé', e);
  }
}

// ---------------------------------------------------------------------------
// Téléchargement
// ---------------------------------------------------------------------------
const CONCURRENCY = 4;
const running = new Map<string, { cancelled: boolean }>();

async function pool<T>(items: T[], worker: (item: T) => Promise<void>, ctl: { cancelled: boolean }) {
  let i = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (i < items.length && !ctl.cancelled) {
      const item = items[i++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

async function downloadTo(url: string, file: File) {
  if (file.exists && file.size > 0) return;
  if (file.exists) file.delete();
  await File.downloadFileAsync(url, file, { idempotent: true });
}

export const offlineService = {
  isRunning: (reciterId: number, surah: number) => running.has(downloadKey(reciterId, surah)),

  /**
   * Télécharge une sourate (texte + audio du récitateur).
   * `getVerses` et `getVerseAudio` sont injectés pour éviter les dépendances circulaires.
   */
  async downloadSurah(
    reciter: Reciter,
    surah: number,
    deps: {
      getVerses: (n: number) => Promise<Verse[]>;
      getVerseAudio: (r: Reciter, s: number, a: number, g: number) => Promise<VerseAudio>;
      surahAudioUrl: (r: Reciter, s: number) => string | undefined;
    }
  ) {
    const key = downloadKey(reciter.id, surah);
    if (running.has(key)) return;
    const ctl = { cancelled: false };
    running.set(key, ctl);
    const store = useOfflineStore.getState();
    store.upsert({ surah, reciterId: reciter.id, status: 'downloading', progress: 0, bytes: 0, updatedAt: Date.now() });

    try {
      const verses = await deps.getVerses(surah);
      saveTextLocally(surah, verses);
      const dir = ensure(audioDir(reciter.id, surah));

      const surahUrl = deps.surahAudioUrl(reciter, surah);
      if (surahUrl) {
        await downloadTo(surahUrl, new File(dir, 'surah.mp3'));
      } else {
        const meta: VerseMeta = readJson<VerseMeta>(new File(dir, 'meta.json')) ?? {};
        let done = 0;
        await pool(
          verses,
          async (v) => {
            const audio = await deps.getVerseAudio(reciter, surah, v.verse_number, v.global_number);
            await downloadTo(audio.url, new File(dir, `${v.verse_number}.mp3`));
            meta[v.verse_number] = { segments: audio.segments, words: audio.words };
            done += 1;
            useOfflineStore.getState().patch(key, { progress: done / verses.length });
          },
          ctl
        );
        writeJson(new File(dir, 'meta.json'), meta);
      }

      if (ctl.cancelled) {
        if (dir.exists) dir.delete();
        useOfflineStore.getState().remove(key);
      } else {
        useOfflineStore.getState().patch(key, { status: 'done', progress: 1, bytes: dirSize(dir) });
      }
    } catch (e) {
      console.warn('[offline] échec du téléchargement', surah, e);
      useOfflineStore.getState().patch(key, { status: 'error' });
    } finally {
      running.delete(key);
    }
  },

  cancel(reciterId: number, surah: number) {
    const ctl = running.get(downloadKey(reciterId, surah));
    if (ctl) ctl.cancelled = true;
  },

  remove(reciterId: number, surah: number) {
    this.cancel(reciterId, surah);
    const dir = audioDir(reciterId, surah);
    if (dir.exists) dir.delete();
    useOfflineStore.getState().remove(downloadKey(reciterId, surah));
  },

  removeAll() {
    const audio = new Directory(root(), 'audio');
    if (audio.exists) audio.delete();
    useOfflineStore.getState().clear();
  },

  totalBytes() {
    return dirSize(root());
  },
};
