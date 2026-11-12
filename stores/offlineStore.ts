import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DownloadStatus = 'queued' | 'downloading' | 'done' | 'error';

export interface DownloadEntry {
  surah: number;
  reciterId: number;
  status: DownloadStatus;
  /** 0 → 1 */
  progress: number;
  bytes: number;
  updatedAt: number;
}

export const downloadKey = (reciterId: number, surah: number) => `${reciterId}:${surah}`;

interface OfflineState {
  downloads: Record<string, DownloadEntry>;
  upsert: (entry: DownloadEntry) => void;
  patch: (key: string, patch: Partial<DownloadEntry>) => void;
  remove: (key: string) => void;
  clear: () => void;
}

/** Registre des sourates téléchargées (les fichiers eux-mêmes sont sur le disque). */
export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      downloads: {},
      upsert: (entry) =>
        set((s) => ({ downloads: { ...s.downloads, [downloadKey(entry.reciterId, entry.surah)]: entry } })),
      patch: (key, patch) =>
        set((s) =>
          s.downloads[key]
            ? { downloads: { ...s.downloads, [key]: { ...s.downloads[key], ...patch, updatedAt: Date.now() } } }
            : s
        ),
      remove: (key) =>
        set((s) => {
          const next = { ...s.downloads };
          delete next[key];
          return { downloads: next };
        }),
      clear: () => set({ downloads: {} }),
    }),
    {
      name: 'offline-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Un téléchargement interrompu (app fermée) n'est pas « en cours » au redémarrage
      merge: (persisted: any, current) => {
        const downloads: Record<string, DownloadEntry> = {};
        for (const [k, d] of Object.entries<DownloadEntry>(persisted?.downloads ?? {})) {
          downloads[k] = d.status === 'done' ? d : { ...d, status: 'error' };
        }
        return { ...current, downloads };
      },
    }
  )
);
