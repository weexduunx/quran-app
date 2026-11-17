import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PRAYER_OPTIONS, recommendedMethod, type PrayerCalcOptions } from '@/services/prayerTimesService';
import { DEFAULT_PLACE, findCity, type Place } from '@/utils/cities';

export type ThemeMode = 'system' | 'light' | 'dark';
export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type AdhanSound = 'touba' | 'senegal' | 'reunion' | 'none';

export interface PrayerReminders {
  enabled: boolean;
  prayers: Record<PrayerKey, boolean>;
  /** Minutes avant l'heure (0 = à l'heure) */
  minutesBefore: number;
  /** Adhan joué à l'heure de la prière (absent dans les anciens réglages : Touba) */
  adhan?: AdhanSound;
}

/** Réglages du calcul des heures de prière */
export type PrayerCalc = typeof DEFAULT_PRAYER_OPTIONS;

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
  /** Nom du lieu (affichage) — toujours égal à place.name */
  city: string;
  /** Lieu exact des heures de prière : coordonnées + fuseau */
  place: Place;
  /** L'utilisateur a choisi lui-même la convention (sinon elle suit le pays) */
  methodChosen: boolean;
  /** L'onboarding du premier lancement a été vu */
  hasOnboarded: boolean;
  prayerReminders: PrayerReminders;
  readingReminder: ReadingReminder;
  prayerCalc: PrayerCalc;

  setThemeMode: (mode: ThemeMode) => void;
  setArabicSizeIndex: (i: number) => void;
  setTranslationSizeIndex: (i: number) => void;
  toggleTransliteration: () => void;
  toggleTranslation: () => void;
  setHijriOffset: (n: number) => void;
  setPlace: (place: Place) => void;
  completeOnboarding: () => void;
  setPrayerReminders: (patch: Partial<PrayerReminders>) => void;
  setReadingReminder: (patch: Partial<ReadingReminder>) => void;
  setPrayerCalc: (patch: Partial<PrayerCalc>) => void;
  setPrayerOffset: (key: keyof PrayerCalc['offsets'], minutes: number) => void;
  reset: () => void;
}

const defaults = {
  themeMode: 'system' as ThemeMode,
  arabicSizeIndex: 2,
  translationSizeIndex: 2,
  showTransliteration: true,
  showTranslation: true,
  hijriOffset: -1,
  city: DEFAULT_PLACE.name,
  place: DEFAULT_PLACE,
  methodChosen: false,
  prayerReminders: {
    enabled: false,
    prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    minutesBefore: 0,
    adhan: 'touba',
  } as PrayerReminders,
  readingReminder: { enabled: false, hour: 20, minute: 0 } as ReadingReminder,
  prayerCalc: DEFAULT_PRAYER_OPTIONS as PrayerCalc,
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
      setPlace: (place) =>
        set((s) => ({
          place,
          city: place.name,
          // La convention suit le pays tant que l'utilisateur ne l'a pas choisie
          prayerCalc: s.methodChosen ? s.prayerCalc : { ...s.prayerCalc, method: recommendedMethod(place.countryCode) },
        })),
      completeOnboarding: () => set({ hasOnboarded: true }),
      setPrayerReminders: (patch) => set((s) => ({ prayerReminders: { ...s.prayerReminders, ...patch } })),
      setReadingReminder: (patch) => set((s) => ({ readingReminder: { ...s.readingReminder, ...patch } })),
      setPrayerCalc: (patch) =>
        set((s) => ({ prayerCalc: { ...s.prayerCalc, ...patch }, methodChosen: s.methodChosen || 'method' in patch })),
      setPrayerOffset: (key, minutes) =>
        set((s) => ({
          prayerCalc: { ...s.prayerCalc, offsets: { ...s.prayerCalc.offsets, [key]: clamp(minutes, -30, 30) } },
        })),
      // La réinitialisation ne rejoue pas l'onboarding
      reset: () => set(defaults),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Les réglages enregistrés avant l'ajout du calcul gardent les valeurs par défaut manquantes
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        // Ancienne version : seul le nom de la ville était enregistré
        const place = p.place ?? findCity(p.city);
        return {
          ...current,
          ...p,
          place,
          city: place.name,
          prayerCalc: {
            ...DEFAULT_PRAYER_OPTIONS,
            ...p.prayerCalc,
            offsets: { ...DEFAULT_PRAYER_OPTIONS.offsets, ...p.prayerCalc?.offsets },
          },
        };
      },
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

/** Options de calcul à passer à prayerTimesService */
export const usePrayerCalc = (): PrayerCalcOptions => useSettingsStore((s) => s.prayerCalc);
