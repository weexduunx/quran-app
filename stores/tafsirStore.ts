import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TafsirBook {
  id: number;
  title: string;
  titleArabic: string;
  author: string;
  authorArabic: string;
  description: string;
  language: 'arabic' | 'french' | 'wolof' | 'both';
  category: 'classical' | 'modern' | 'contemporary';
  featured?: boolean;
  available?: boolean;
  apiId?: string; // Pour les API externes
}

export interface TafsirContent {
  id: number;
  bookId: number;
  surahId: number;
  verseId: number;
  content: string;
  contentArabic?: string;
  reference?: string;
  audioUrl?: string; // URL de l'audio du tafsir
  audioDuration?: number; // Durée en secondes
}

interface TafsirState {
  books: TafsirBook[];
  selectedBook: TafsirBook | null;
  favoriteBooks: number[];
  tafsirContent: { [key: string]: TafsirContent }; // key: "bookId-surahId-verseId"
  isLoading: boolean;
  error: string | null;

  // Actions
  setBooks: (books: TafsirBook[]) => void;
  setSelectedBook: (book: TafsirBook | null) => void;
  addToFavorites: (bookId: number) => void;
  removeFromFavorites: (bookId: number) => void;
  isFavorite: (bookId: number) => boolean;
  setTafsirContent: (key: string, content: TafsirContent) => void;
  getTafsirContent: (bookId: number, surahId: number, verseId: number) => TafsirContent | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Liste des livres de Tafsir disponibles
// Les tafsirs audio en wolof (Baye Niasse, Moustapha Gueye) sont mis en avant en premier
export const tafsirBooks: TafsirBook[] = [
  {
    id: 6,
    title: 'Tafsir Baye Niasse',
    titleArabic: 'تفسير الشيخ إبراهيم نياس',
    author: 'Cheikh Ibrahima Niasse (Baye Niasse)',
    authorArabic: 'الشيخ إبراهيم نياس',
    description: "Tafsir audio en wolof par le fondateur du mouvement niassène, sourate par sourate.",
    language: 'wolof',
    category: 'contemporary',
    featured: true,
    available: true,
    apiId: 'baye-niasse'
  },
  {
    id: 7,
    title: 'Tafsir Imam Moustapha Gueye',
    titleArabic: 'تفسير الإمام مصطفى غاي',
    author: 'Imam Moustapha Gueye',
    authorArabic: 'الإمام مصطفى غاي',
    description: 'Explications audio du Coran en wolof par un éminent savant sénégalais, adapté au contexte local.',
    language: 'wolof',
    category: 'contemporary',
    featured: true,
    available: true,
    apiId: 'moustapha-gueye'
  },
  {
    id: 1,
    title: 'Tafsir Ibn Kathir',
    titleArabic: 'تفسير ابن كثير',
    author: 'Ibn Kathir',
    authorArabic: 'ابن كثير',
    description: "L'un des tafsirs les plus respectés, basé sur le Coran, la Sunnah et les paroles des Compagnons.",
    language: 'both',
    category: 'classical',
    featured: true,
    available: true,
    apiId: 'ibn-kathir'
  },
  {
    id: 2,
    title: 'Tafsir At-Tabari',
    titleArabic: 'تفسير الطبري',
    author: 'At-Tabari',
    authorArabic: 'الطبري',
    description: 'Le plus ancien tafsir complet existant, source de référence pour tous les commentaires ultérieurs.',
    language: 'arabic',
    category: 'classical',
    featured: true,
    available: true,
    apiId: 'at-tabari'
  },
  {
    id: 3,
    title: 'Tafsir Al-Qurtubi',
    titleArabic: 'تفسير القرطبي',
    author: 'Al-Qurtubi',
    authorArabic: 'القرطبي',
    description: 'Excellent pour comprendre les règles juridiques dérivées du Coran.',
    language: 'arabic',
    category: 'classical',
    available: true,
    apiId: 'al-qurtubi'
  },
  {
    id: 4,
    title: 'Fi Zilal Al-Quran',
    titleArabic: 'في ظلال القرآن',
    author: 'Sayyid Qutb',
    authorArabic: 'سيد قطب',
    description: "Tafsir moderne qui met l'accent sur l'application pratique du Coran dans la vie contemporaine.",
    language: 'both',
    category: 'modern',
    available: true,
    apiId: 'sayyid-qutb'
  },
  {
    id: 5,
    title: "Tafsir As-Sa'di",
    titleArabic: 'تفسير السعدي',
    author: "Abdur-Rahman As-Sa'di",
    authorArabic: 'عبد الرحمن السعدي',
    description: 'Tafsir concis et clair, idéal pour les débutants.',
    language: 'arabic',
    category: 'contemporary',
    available: true,
    apiId: 'as-sadi'
  }
];

export const useTafsirStore = create<TafsirState>()(
  persist(
    (set, get) => ({
      books: tafsirBooks,
      selectedBook: null,
      favoriteBooks: [],
      tafsirContent: {},
      isLoading: false,
      error: null,

      setBooks: (books) => set({ books }),

      setSelectedBook: (book) => set({ selectedBook: book }),

      addToFavorites: (bookId) =>
        set((state) => ({
          favoriteBooks: state.favoriteBooks.includes(bookId)
            ? state.favoriteBooks
            : [...state.favoriteBooks, bookId]
        })),

      removeFromFavorites: (bookId) =>
        set((state) => ({
          favoriteBooks: state.favoriteBooks.filter(id => id !== bookId)
        })),

      isFavorite: (bookId) => {
        const state = get();
        return state.favoriteBooks.includes(bookId);
      },

      setTafsirContent: (key, content) =>
        set((state) => ({
          tafsirContent: {
            ...state.tafsirContent,
            [key]: content
          }
        })),

      getTafsirContent: (bookId, surahId, verseId) => {
        const state = get();
        const key = `${bookId}-${surahId}-${verseId}`;
        return state.tafsirContent[key] || null;
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),
    }),
    {
      name: 'tafsir-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1, // Nouvel ordre des tafsirs + Baye Niasse/Ahmadou Bamba mis à jour
      migrate: (persistedState: any, version) => {
        if (version < 1) {
          return { ...persistedState, books: tafsirBooks };
        }
        return persistedState;
      },
    }
  )
);