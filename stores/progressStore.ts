import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LastRead {
  surahId: number;
  surahNumber: number;
  surahName: string;
  surahNameArabic: string;
  verseNumber: number;
  versesCount: number;
  updatedAt: number;
}

export interface Bookmark {
  key: string; // `${surahId}:${verseNumber}`
  surahId: number;
  surahName: string;
  verseNumber: number;
  textArabic: string;
  textFrench: string;
  createdAt: number;
}

interface ProgressState {
  lastRead: LastRead | null;
  bookmarks: Bookmark[];
  /** Jours (YYYY-MM-DD) où l'utilisateur a lu au moins un verset */
  readingDays: string[];

  setLastRead: (lr: Omit<LastRead, 'updatedAt'>) => void;
  toggleBookmark: (b: Omit<Bookmark, 'key' | 'createdAt'>) => void;
  removeBookmark: (key: string) => void;
  clearAll: () => void;
}

export const bookmarkKey = (surahId: number, verseNumber: number) => `${surahId}:${verseNumber}`;

export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      lastRead: null,
      bookmarks: [],
      readingDays: [],

      setLastRead: (lr) => {
        const today = dayKey();
        const days = get().readingDays;
        set({
          lastRead: { ...lr, updatedAt: Date.now() },
          readingDays: days.includes(today) ? days : [...days.slice(-59), today],
        });
      },

      toggleBookmark: (b) => {
        const key = bookmarkKey(b.surahId, b.verseNumber);
        const exists = get().bookmarks.some((x) => x.key === key);
        set({
          bookmarks: exists
            ? get().bookmarks.filter((x) => x.key !== key)
            : [{ ...b, key, createdAt: Date.now() }, ...get().bookmarks],
        });
      },

      removeBookmark: (key) => set({ bookmarks: get().bookmarks.filter((x) => x.key !== key) }),

      clearAll: () => set({ lastRead: null, bookmarks: [], readingDays: [] }),
    }),
    {
      name: 'progress-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Nombre de jours consécutifs de lecture (jusqu'à aujourd'hui ou hier) */
export function computeStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const set = new Set(days);
  const cursor = new Date();
  if (!set.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
