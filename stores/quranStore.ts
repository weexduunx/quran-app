import { create } from 'zustand';

export interface Surah {
  id: number;
  number: number;
  name_arabic: string;
  name_french: string;
  name_transliteration: string;
  verses_count: number;
  revelation_type: string;
}

export interface Verse {
  id: number;
  surah_id: number;
  verse_number: number;
  global_number: number;
  text_arabic: string;
  text_uthmani?: string;
  text_french: string;
  text_transliteration?: string;
  juz?: number;
  hizb?: number;
  rub?: number;
  page?: number;
  surah?: Surah;
}

export interface Tafsir {
  id: number;
  surah_id: number;
  hafiz_name: string;
  audio_file_path: string;
  audio_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  language: string;
  description?: string;
  is_available: boolean;
}

interface QuranState {
  surahs: Surah[];
  currentSurah: Surah | null;
  verses: Verse[];
  currentVerse: Verse | null;
  tafsirs: Tafsir[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;

  // Actions
  setSurahs: (surahs: Surah[]) => void;
  setCurrentSurah: (surah: Surah | null) => void;
  setVerses: (verses: Verse[]) => void;
  setCurrentVerse: (verse: Verse | null) => void;
  setTafsirs: (tafsirs: Tafsir[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setOffline: (offline: boolean) => void;
}

export const useQuranStore = create<QuranState>((set) => ({
  surahs: [],
  currentSurah: null,
  verses: [],
  currentVerse: null,
  tafsirs: [],
  isLoading: false,
  error: null,
  isOffline: false,

  setSurahs: (surahs) => set({ surahs }),
  setCurrentSurah: (surah) => set({ currentSurah: surah }),
  setVerses: (verses) => set({ verses }),
  setCurrentVerse: (verse) => set({ currentVerse: verse }),
  setTafsirs: (tafsirs) => set({ tafsirs }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setOffline: (offline) => set({ isOffline: offline }),
}));