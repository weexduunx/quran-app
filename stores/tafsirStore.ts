import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TafsirLanguage = 'arabic' | 'english' | 'wolof';

export interface TafsirBook {
  id: string;
  title: string;
  titleArabic: string;
  author: string;
  description: string;
  language: TafsirLanguage;
  kind: 'text' | 'audio';
  /** Ressource tafsir de l'API Quran.com v4 (livres écrits) */
  quranComId?: number;
  /** Mention de la source affichée sous le lecteur (livres audio) */
  sourceNote?: string;
  level?: 'débutant' | 'intermédiaire' | 'approfondi';
}

/**
 * Uniquement des contenus réels et vérifiés :
 * - livres écrits : API publique Quran.com (textes intégraux, par verset)
 * - tafsirs wolof : enregistrements audio de Cheikh Ibrahima Niasse et d'Oustaz
 *   Ibrahima Fall (Internet Archive)
 *
 * Aucun tafsir écrit en français n'est disponible librement : les livres
 * proposés sont en arabe et en anglais. Le texte du verset reste affiché en
 * français au-dessus du commentaire.
 */
export const tafsirBooks: TafsirBook[] = [
  {
    id: 'baye-niasse',
    title: 'Tafsir Baye Niasse',
    titleArabic: 'تفسير الشيخ إبراهيم نياس',
    author: 'Cheikh Ibrahima Niasse',
    description: 'Le Coran expliqué en wolof, sourate par sourate. Enregistrements audio.',
    language: 'wolof',
    kind: 'audio',
    sourceNote: 'Sourates 41 à 43 absentes de la collection. Source : Internet Archive (Tafsir Baye NIASS).',
  },
  {
    id: 'ibrahima-fall',
    title: 'Tafsir Oustaz Ibrahima Fall',
    titleArabic: 'تفسير الشيخ إبراهيم فال',
    author: 'Oustaz Ibrahima Fall (Ndar)',
    description: 'Tafsir complet en wolof : les 114 sourates, environ 90 heures d’explications.',
    language: 'wolof',
    kind: 'audio',
    sourceNote: 'Les 114 sourates. Source : Internet Archive (Tafsir Coran de Oustaz Ibrahima Fall).',
  },
  {
    id: 'muyassar',
    title: 'At-Tafsir Al-Muyassar',
    titleArabic: 'التفسير الميسر',
    author: 'Complexe du Roi Fahd',
    description: 'Explication courte et simple de chaque verset. Idéal pour commencer.',
    language: 'arabic',
    kind: 'text',
    quranComId: 16,
    level: 'débutant',
  },
  {
    id: 'ibn-kathir-en',
    title: 'Ibn Kathir (abrégé)',
    titleArabic: 'تفسير ابن كثير - مختصر',
    author: 'Ibn Kathir',
    description: 'La version anglaise abrégée du tafsir le plus lu au monde.',
    language: 'english',
    kind: 'text',
    quranComId: 169,
    level: 'intermédiaire',
  },
  {
    id: 'saadi',
    title: "Tafsir As-Sa'di",
    titleArabic: 'تفسير السعدي',
    author: "Abd ar-Rahman As-Sa'di",
    description: 'Clair et accessible, centré sur le sens et les leçons des versets.',
    language: 'arabic',
    kind: 'text',
    quranComId: 91,
    level: 'intermédiaire',
  },
  {
    id: 'ibn-kathir',
    title: 'Tafsir Ibn Kathir',
    titleArabic: 'تفسير ابن كثير',
    author: 'Ibn Kathir',
    description: 'Explique le Coran par le Coran, la Sunna et les paroles des Compagnons.',
    language: 'arabic',
    kind: 'text',
    quranComId: 14,
    level: 'approfondi',
  },
  {
    id: 'tabari',
    title: 'Tafsir At-Tabari',
    titleArabic: 'تفسير الطبري',
    author: 'At-Tabari',
    description: 'Le plus ancien grand tafsir complet, référence des commentateurs.',
    language: 'arabic',
    kind: 'text',
    quranComId: 15,
    level: 'approfondi',
  },
  {
    id: 'qurtubi',
    title: 'Tafsir Al-Qurtubi',
    titleArabic: 'تفسير القرطبي',
    author: 'Al-Qurtubi',
    description: 'Très riche sur les règles juridiques tirées des versets.',
    language: 'arabic',
    kind: 'text',
    quranComId: 90,
    level: 'approfondi',
  },
];

export const getTafsirBook = (id?: string) => tafsirBooks.find((b) => b.id === id);

export const languageLabel: Record<TafsirLanguage, string> = {
  arabic: 'Arabe',
  english: 'Anglais',
  wolof: 'Wolof · audio',
};

interface TafsirState {
  favoriteBooks: string[];
  /** Dernier livre écrit consulté : ouvert depuis le bouton « Tafsir » d'un verset */
  preferredTextBook: string;
  toggleFavorite: (id: string) => void;
  setPreferredTextBook: (id: string) => void;
}

export const useTafsirStore = create<TafsirState>()(
  persist(
    (set) => ({
      favoriteBooks: [],
      preferredTextBook: 'muyassar',
      toggleFavorite: (id) =>
        set((s) => ({
          favoriteBooks: s.favoriteBooks.includes(id)
            ? s.favoriteBooks.filter((b) => b !== id)
            : [...s.favoriteBooks, id],
        })),
      setPreferredTextBook: (id) => set({ preferredTextBook: id }),
    }),
    {
      name: 'tafsir-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // Les anciennes données (contenus simulés, IDs numériques) sont abandonnées
      migrate: () => ({ favoriteBooks: [], preferredTextBook: 'muyassar' }),
    }
  )
);
