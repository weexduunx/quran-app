import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Paliers de taille pour le texte arabe et la traduction */
export const ARABIC_SIZES = [22, 26, 30, 34, 40] as const;
export const TRANSLATION_SIZES = [14, 15, 16, 18, 20] as const;

interface SettingsState {
  themeMode: ThemeMode;
  arabicSizeIndex: number;
  translationSizeIndex: number;
  showTransliteration: boolean;
  showTranslation: boolean;
  /** Décalage en jours appliqué au calendrier hégirien calculé (observation locale) */
  hijriOffset: number;
  city: string;

  setThemeMode: (mode: ThemeMode) => void;
  setArabicSizeIndex: (i: number) => void;
  setTranslationSizeIndex: (i: number) => void;
  toggleTransliteration: () => void;
  toggleTranslation: () => void;
  setHijriOffset: (n: number) => void;
  reset: () => void;
}

const defaults = {
  themeMode: 'system' as ThemeMode,
  arabicSizeIndex: 2,
  translationSizeIndex: 2,
  showTransliteration: true,
  showTranslation: true,
  hijriOffset: -1,
  city: 'Dakar',
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setThemeMode: (themeMode) => set({ themeMode }),
      setArabicSizeIndex: (i) => set({ arabicSizeIndex: clamp(i, 0, ARABIC_SIZES.length - 1) }),
      setTranslationSizeIndex: (i) =>
        set({ translationSizeIndex: clamp(i, 0, TRANSLATION_SIZES.length - 1) }),
      toggleTransliteration: () => set((s) => ({ showTransliteration: !s.showTransliteration })),
      toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
      setHijriOffset: (n) => set({ hijriOffset: clamp(n, -2, 2) }),
      reset: () => set(defaults),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const useArabicFontSize = () => ARABIC_SIZES[useSettingsStore((s) => s.arabicSizeIndex)];
export const useTranslationFontSize = () =>
  TRANSLATION_SIZES[useSettingsStore((s) => s.translationSizeIndex)];
