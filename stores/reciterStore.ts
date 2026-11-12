import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Reciter {
  id: number;
  name: string;
  nameArabic: string;
  country: string;
  description: string;
  featured?: boolean;
  /** Récitation pédagogique (lente, idéale pour apprendre / mémoriser) */
  learning?: boolean;
  /** ID de récitation Quran.com : audio + synchronisation mot à mot */
  quranComId?: number;
  /** Édition islamic.network / alquran.cloud (repli, ou source unique) */
  audioApiId: string;
  bitrate?: number;
  style?: string;
  /**
   * Récitateur disponible uniquement par sourate entière : dossier contenant
   * 001.mp3 … 114.mp3. Le lecteur passe alors en mode « sourate entière ».
   */
  surahAudioBase?: string;
}

/**
 * Toutes les sources ont été vérifiées (HTTP 200). Les anciens identifiants
 * « ar.saadalghamdi », « ar.yasserdosari », « ar.naseralqatami »… n'existaient
 * pas : l'app basculait silencieusement sur Al-Afasy.
 */
export const popularReciters: Reciter[] = [
  {
    id: 1,
    name: 'Mishary Rashid Al-Afasy',
    nameArabic: 'مشاري بن راشد العفاسي',
    country: 'Koweït',
    description: "L'une des voix les plus écoutées au monde, claire et posée.",
    featured: true,
    quranComId: 7,
    audioApiId: 'ar.alafasy',
    style: 'Murattal',
  },
  {
    id: 12,
    name: 'Mahmoud Khalil Al-Husary — Enseignement',
    nameArabic: 'محمود خليل الحصري - المعلم',
    country: 'Égypte',
    description: 'Récitation lente et articulée, pensée pour apprendre et répéter.',
    featured: true,
    learning: true,
    quranComId: 12,
    audioApiId: 'ar.husary',
    style: 'Muallim',
  },
  {
    id: 20,
    name: 'Mouhamed Hady Touré',
    nameArabic: 'محمد الهادي توري',
    country: 'Sénégal',
    description: 'Hafiz sénégalais. Coran complet, récité sourate par sourate.',
    featured: true,
    audioApiId: '',
    surahAudioBase: 'https://archive.org/download/mohamedelhaditoure/',
  },
  {
    id: 7,
    name: 'Abdul Basit Abdul Samad',
    nameArabic: 'عبد الباسط عبد الصمد',
    country: 'Égypte',
    description: 'Voix légendaire, récitation murattal.',
    featured: true,
    quranComId: 2,
    audioApiId: 'ar.abdulbasitmurattal',
    bitrate: 192,
    style: 'Murattal',
  },
  {
    id: 11,
    name: 'Mahmoud Khalil Al-Husary',
    nameArabic: 'محمود خليل الحصري',
    country: 'Égypte',
    description: 'Référence de la récitation précise selon les règles du tajwid.',
    quranComId: 6,
    audioApiId: 'ar.husary',
    style: 'Murattal',
  },
  {
    id: 8,
    name: 'Mohamed Siddiq Al-Minshawi',
    nameArabic: 'محمد صديق المنشاوي',
    country: 'Égypte',
    description: "Une des plus belles voix de l'histoire de la récitation.",
    quranComId: 9,
    audioApiId: 'ar.minshawi',
    style: 'Murattal',
  },
  {
    id: 2,
    name: 'Abdul Rahman Al-Sudais',
    nameArabic: 'عبد الرحمن السديس',
    country: 'Arabie saoudite',
    description: 'Imam de la Grande Mosquée de La Mecque.',
    quranComId: 3,
    audioApiId: 'ar.abdurrahmaansudais',
    bitrate: 192,
  },
  {
    id: 14,
    name: 'Saoud Al-Shuraym',
    nameArabic: 'سعود الشريم',
    country: 'Arabie saoudite',
    description: 'Imam de la Grande Mosquée de La Mecque, rythme soutenu.',
    quranComId: 10,
    audioApiId: 'ar.saoodshuraym',
    bitrate: 64,
  },
  {
    id: 13,
    name: 'Abu Bakr Al-Shatri',
    nameArabic: 'أبو بكر الشاطري',
    country: 'Arabie saoudite',
    description: 'Voix douce et émouvante.',
    quranComId: 4,
    audioApiId: 'ar.shaatree',
  },
  {
    id: 10,
    name: 'Hani Ar-Rifai',
    nameArabic: 'هاني الرفاعي',
    country: 'Arabie saoudite',
    description: 'Récitation douce et apaisante.',
    quranComId: 5,
    audioApiId: 'ar.hanirifai',
    bitrate: 192,
  },
  {
    id: 15,
    name: 'Al-Minshawi — Mujawwad',
    nameArabic: 'المنشاوي - مجود',
    country: 'Égypte',
    description: 'Récitation mélodique et lente (mujawwad).',
    quranComId: 8,
    audioApiId: 'ar.minshawimujawwad',
    bitrate: 64,
    style: 'Mujawwad',
  },
  {
    id: 5,
    name: 'Maher Al-Muaiqly',
    nameArabic: 'ماهر المعيقلي',
    country: 'Arabie saoudite',
    description: 'Imam de la Grande Mosquée de La Mecque.',
    audioApiId: 'ar.mahermuaiqly',
  },
  {
    id: 4,
    name: 'Ahmed Al-Ajmi',
    nameArabic: 'أحمد بن علي العجمي',
    country: 'Arabie saoudite',
    description: 'Connu pour ses récitations expressives.',
    audioApiId: 'ar.ahmedajamy',
  },
];

const DEFAULT = popularReciters[0];

interface ReciterState {
  reciters: Reciter[];
  selectedReciter: Reciter | null;
  favoriteReciters: number[];

  setSelectedReciter: (reciter: Reciter) => void;
  getSelectedReciter: () => Reciter;
  addToFavorites: (reciterId: number) => void;
  removeFromFavorites: (reciterId: number) => void;
  toggleFavorite: (reciterId: number) => void;
  isFavorite: (reciterId: number) => boolean;
  resetStore: () => void;
}

export const useReciterStore = create<ReciterState>()(
  persist(
    (set, get) => ({
      reciters: popularReciters,
      selectedReciter: DEFAULT,
      favoriteReciters: [],

      setSelectedReciter: (reciter) => set({ selectedReciter: reciter }),

      // Toujours résolu depuis la liste du code : une version persistée
      // obsolète (anciens IDs audio) ne peut plus casser la lecture.
      getSelectedReciter: () => {
        const id = get().selectedReciter?.id;
        return popularReciters.find((r) => r.id === id) ?? DEFAULT;
      },

      addToFavorites: (reciterId) =>
        set((s) => ({
          favoriteReciters: s.favoriteReciters.includes(reciterId)
            ? s.favoriteReciters
            : [...s.favoriteReciters, reciterId],
        })),

      removeFromFavorites: (reciterId) =>
        set((s) => ({ favoriteReciters: s.favoriteReciters.filter((id) => id !== reciterId) })),

      toggleFavorite: (reciterId) =>
        get().isFavorite(reciterId) ? get().removeFromFavorites(reciterId) : get().addToFavorites(reciterId),

      isFavorite: (reciterId) => get().favoriteReciters.includes(reciterId),

      resetStore: () => set({ reciters: popularReciters, selectedReciter: DEFAULT, favoriteReciters: [] }),
    }),
    {
      name: 'reciter-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      // On ne persiste que les choix de l'utilisateur, jamais la liste elle-même
      partialize: (s) => ({ selectedReciter: s.selectedReciter, favoriteReciters: s.favoriteReciters }),
      migrate: (persisted: any) => {
        const selected = popularReciters.find((r) => r.id === persisted?.selectedReciter?.id) ?? DEFAULT;
        const favs: number[] = (persisted?.favoriteReciters ?? []).filter((id: number) =>
          popularReciters.some((r) => r.id === id)
        );
        return { selectedReciter: selected, favoriteReciters: favs };
      },
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        reciters: popularReciters,
        selectedReciter:
          popularReciters.find((r) => r.id === persisted?.selectedReciter?.id) ?? current.selectedReciter,
      }),
    }
  )
);
