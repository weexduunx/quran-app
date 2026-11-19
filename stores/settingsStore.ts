import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PRAYER_OPTIONS, recommendedMethod, type PrayerCalcOptions } from '@/services/prayerTimesService';
import { DEFAULT_PLACE, findCity, type Place } from '@/utils/cities';

export type ThemeMode = 'system' | 'light' | 'dark';
export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/** Adhan intégré, adhan ajouté par l'utilisateur (`custom-<id>`) ou son normal */
export type AdhanSound = 'senegal' | 'reunion' | 'none' | `custom-${string}`;

/** Adhan importé par l'utilisateur (Android) : son copié + canal de notification dédié */
export interface CustomAdhan {
  id: string;
  label: string;
  /** Canal Android créé avec ce son */
  channel: string;
  /** URI content:// du son dans les sonneries de notification */
  uri: string;
}

export interface PrayerReminders {
  enabled: boolean;
  prayers: Record<PrayerKey, boolean>;
  /** Minutes avant l'heure (0 = à l'heure) */
  minutesBefore: number;
  /** Adhan joué à l'heure de la prière (absent dans les anciens réglages : Sénégal) */
  adhan?: AdhanSound;
  /**
   * Prières où l'adhan retentit ; les autres prières notifiées gardent le son
   * de rappel (absent dans les anciens réglages : adhan pour toutes)
   */
  adhanPrayers?: Record<PrayerKey, boolean>;
}

export const ALL_PRAYERS_ON: Record<PrayerKey, boolean> = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };

/** Réglages du calcul des heures de prière */
export type PrayerCalc = typeof DEFAULT_PRAYER_OPTIONS;

export interface ReadingReminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

/** Notification du verset du jour */
export type VerseReminder = ReadingReminder;

/** Rappels d'invocations : matin et soir suivent les heures de prière du lieu */
export interface AdhkarReminders {
  /** 20 min après Subha */
  morning: boolean;
  /** 20 min après Takussan */
  evening: boolean;
  sleep: boolean;
  sleepHour: number;
  sleepMinute: number;
  /** Vendredi matin : Al-Kahf et prière sur le Prophète ﷺ */
  friday: boolean;
}

/** Rappel d'une invocation du quotidien (jours : 1 = dimanche … 7 = samedi) */
export interface DuaReminder {
  hour: number;
  minute: number;
  days: number[];
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
  verseReminder: VerseReminder;
  adhkarReminders: AdhkarReminders;
  /** Invocations du quotidien programmées, par identifiant */
  duaReminders: Record<string, DuaReminder>;
  prayerCalc: PrayerCalc;
  /** Adhans ajoutés par l'utilisateur */
  customAdhans: CustomAdhan[];

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
  setVerseReminder: (patch: Partial<VerseReminder>) => void;
  setAdhkarReminders: (patch: Partial<AdhkarReminders>) => void;
  setDuaReminder: (id: string, reminder: DuaReminder | null) => void;
  setPrayerCalc: (patch: Partial<PrayerCalc>) => void;
  setPrayerOffset: (key: keyof PrayerCalc['offsets'], minutes: number) => void;
  addCustomAdhan: (adhan: CustomAdhan) => void;
  removeCustomAdhan: (id: string) => void;
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
    prayers: { ...ALL_PRAYERS_ON },
    minutesBefore: 0,
    adhan: 'senegal',
    adhanPrayers: { ...ALL_PRAYERS_ON },
  } as PrayerReminders,
  readingReminder: { enabled: false, hour: 20, minute: 0 } as ReadingReminder,
  verseReminder: { enabled: false, hour: 7, minute: 30 } as VerseReminder,
  adhkarReminders: { morning: false, evening: false, sleep: false, sleepHour: 22, sleepMinute: 30, friday: false } as AdhkarReminders,
  duaReminders: {} as Record<string, DuaReminder>,
  prayerCalc: DEFAULT_PRAYER_OPTIONS as PrayerCalc,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      hasOnboarded: false,
      customAdhans: [],
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
      setVerseReminder: (patch) => set((s) => ({ verseReminder: { ...s.verseReminder, ...patch } })),
      setAdhkarReminders: (patch) => set((s) => ({ adhkarReminders: { ...s.adhkarReminders, ...patch } })),
      setDuaReminder: (id, reminder) =>
        set((s) => {
          const next = { ...s.duaReminders };
          if (reminder && reminder.days.length) next[id] = reminder;
          else delete next[id];
          return { duaReminders: next };
        }),
      setPrayerCalc: (patch) =>
        set((s) => ({ prayerCalc: { ...s.prayerCalc, ...patch }, methodChosen: s.methodChosen || 'method' in patch })),
      setPrayerOffset: (key, minutes) =>
        set((s) => ({
          prayerCalc: { ...s.prayerCalc, offsets: { ...s.prayerCalc.offsets, [key]: clamp(minutes, -30, 30) } },
        })),
      addCustomAdhan: (adhan) =>
        set((s) => ({
          customAdhans: [...s.customAdhans, adhan],
          prayerReminders: { ...s.prayerReminders, adhan: `custom-${adhan.id}` },
        })),
      removeCustomAdhan: (id) =>
        set((s) => ({
          customAdhans: s.customAdhans.filter((a) => a.id !== id),
          // L'adhan supprimé était choisi : retour à l'adhan sénégalais
          prayerReminders:
            s.prayerReminders.adhan === `custom-${id}` ? { ...s.prayerReminders, adhan: 'senegal' } : s.prayerReminders,
        })),
      // La réinitialisation ne rejoue pas l'onboarding et garde les adhans importés (fichiers sur le téléphone)
      reset: () => set((s) => ({ ...defaults, customAdhans: s.customAdhans })),
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
          customAdhans: p.customAdhans ?? [],
          // L'adhan de Touba a été retiré : ceux qui l'avaient passent à l'adhan sénégalais
          prayerReminders: {
            ...current.prayerReminders,
            ...p.prayerReminders,
            adhan: (p.prayerReminders?.adhan as string) === 'touba' ? 'senegal' : (p.prayerReminders?.adhan ?? 'senegal'),
            adhanPrayers: { ...ALL_PRAYERS_ON, ...p.prayerReminders?.adhanPrayers },
          },
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
