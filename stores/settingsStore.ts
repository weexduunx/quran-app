import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';
export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerReminders {
  enabled: boolean;
  prayers: Record<PrayerKey, boolean>;
  /** Minutes avant l'heure (0 = à l'heure) */
  minutesBefore: number;
}

export interface ReadingReminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

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
  /** L'onboarding du premier lancement a été vu */
  hasOnboarded: boolean;
  prayerReminders: PrayerReminders;
  readingReminder: ReadingReminder;

  setThemeMode: (mode: ThemeMode) => void;
  setArabicSizeIndex: (i: number) => void;
  setTranslationSizeIndex: (i: number) => void;
  toggleTransliteration: () => void;
  toggleTranslation: () => void;
  setHijriOffset: (n: number) => void;
  setCity: (city: string) => void;
  completeOnboarding: () => void;
  setPrayerReminders: (patch: Partial<PrayerReminders>) => void;
  setReadingReminder: (patch: Partial<ReadingReminder>) => void;
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
  prayerReminders: {
    enabled: false,
    prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    minutesBefore: 0,
  } as PrayerReminders,
  readingReminder: { enabled: false, hour: 20, minute: 0 } as ReadingReminder,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      hasOnboarded: false,
      setThemeMode: (themeMode) => set({ themeMode }),
      setArabicSizeIndex: (i) => set({ arabicSizeIndex: clamp(i, 0, ARABIC_SIZES.length - 1) }),
      setTranslationSizeIndex: (i) =>
        set({ translationSizeIndex: clamp(i, 0, TRANSLATION_SIZES.length - 1) }),
      toggleTransliteration: () => set((s) => ({ showTransliteration: !s.showTransliteration })),
      toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
      setHijriOffset: (n) => set({ hijriOffset: clamp(n, -2, 2) }),
      setCity: (city) => set({ city }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      setPrayerReminders: (patch) => set((s) => ({ prayerReminders: { ...s.prayerReminders, ...patch } })),
      setReadingReminder: (patch) => set((s) => ({ readingReminder: { ...s.readingReminder, ...patch } })),
      // La réinitialisation ne rejoue pas l'onboarding
      reset: () => set(defaults),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Vrai une fois les réglages relus depuis le stockage (évite un onboarding à tort). */
export function useSettingsHydrated() {
  const [hydrated, setHydrated] = useState(() => useSettingsStore.persist.hasHydrated());
  useEffect(() => {
    if (useSettingsStore.persist.hasHydrated()) setHydrated(true);
    return useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

export const useArabicFontSize = () => ARABIC_SIZES[useSettingsStore((s) => s.arabicSizeIndex)];
export const useTranslationFontSize = () =>
  TRANSLATION_SIZES[useSettingsStore((s) => s.translationSizeIndex)];
