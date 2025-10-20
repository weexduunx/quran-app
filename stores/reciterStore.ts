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
  audioApiId: string; // ID utilisé pour l'API audio
  style?: string; // Style de récitation (Hafs, Warsh, etc.)
}

interface ReciterState {
  reciters: Reciter[];
  selectedReciter: Reciter | null;
  favoriteReciters: number[];

  // Actions
  setReciters: (reciters: Reciter[]) => void;
  setSelectedReciter: (reciter: Reciter) => void;
  getSelectedReciter: () => Reciter;
  addToFavorites: (reciterId: number) => void;
  removeFromFavorites: (reciterId: number) => void;
  isFavorite: (reciterId: number) => boolean;
  resetStore: () => void;
}

// Liste des réciteurs populaires avec les IDs API alquran.cloud originaux
export const popularReciters: Reciter[] = [
  {
    id: 1,
    name: 'Mishary Rashid Al-Afasy',
    nameArabic: 'مشاري بن راشد العفاسي',
    country: 'Koweït',
    description: "L'une des voix les plus célèbres du monde islamique",
    featured: true,
    audioApiId: 'ar.alafasy', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 2,
    name: 'Abdul Rahman Al-Sudais',
    nameArabic: 'عبد الرحمن السديس',
    country: 'Arabie Saoudite',
    description: 'Imam de la Grande Mosquée de La Mecque',
    featured: true,
    audioApiId: 'ar.abdurrahmaansudais', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 3,
    name: 'Saad Al-Ghamidi',
    nameArabic: 'سعد الغامدي',
    country: 'Arabie Saoudite',
    description: 'Réputé pour sa voix mélodieuse et émouvante',
    audioApiId: 'ar.saadalghamdi', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 4,
    name: 'Ahmed Ali Al-Ajmi',
    nameArabic: 'أحمد علي العجمي',
    country: 'Arabie Saoudite',
    description: 'Connu pour ses récitations expressives',
    audioApiId: 'ar.ahmedalajamy', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 5,
    name: 'Maher Al-Muaiqly',
    nameArabic: 'ماهر المعيقلي',
    country: 'Arabie Saoudite',
    description: 'Imam de la Mosquée du Prophète à Médine',
    audioApiId: 'ar.maheralmuaiqly', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 6,
    name: 'Nasser Al-Qatami',
    nameArabic: 'ناصر القطامي',
    country: 'Arabie Saoudite',
    description: 'Voix puissante et récitation précise',
    audioApiId: 'ar.naseralqatami', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 7,
    name: 'Abdul Basit Abdul Samad',
    nameArabic: 'عبد الباسط عبد الصمد',
    country: 'Égypte',
    description: 'Maître de la récitation, voix légendaire',
    audioApiId: 'ar.abdulbasitmurattal', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 8,
    name: 'Mohamed Siddiq Al-Minshawi',
    nameArabic: 'محمد صديق المنشاوي',
    country: 'Égypte',
    description: 'Une des plus belles voix de l\'histoire islamique',
    audioApiId: 'ar.minshawi', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 9,
    name: 'Yasser Al-Dosari',
    nameArabic: 'ياسر الدوسري',
    country: 'Arabie Saoudite',
    description: 'Jeune récitateur avec une voix exceptionnelle',
    audioApiId: 'ar.yasserdosari', // Format API alquran.cloud
    style: 'Hafs'
  },
  {
    id: 10,
    name: 'Hani Ar-Rifai',
    nameArabic: 'هاني الرفاعي',
    country: 'Arabie Saoudite',
    description: 'Récitation douce et apaisante',
    audioApiId: 'ar.hanirifai', // Format API alquran.cloud
    style: 'Hafs'
  }
];

export const useReciterStore = create<ReciterState>()(
  persist(
    (set, get) => ({
      reciters: popularReciters,
      selectedReciter: popularReciters[0], // Mishary Al-Afasy par défaut
      favoriteReciters: [],

      setReciters: (reciters) => set({ reciters }),

      setSelectedReciter: (reciter) => set({ selectedReciter: reciter }),

      getSelectedReciter: () => {
        const state = get();
        return state.selectedReciter || popularReciters[0];
      },

      addToFavorites: (reciterId) =>
        set((state) => ({
          favoriteReciters: state.favoriteReciters.includes(reciterId)
            ? state.favoriteReciters
            : [...state.favoriteReciters, reciterId]
        })),

      removeFromFavorites: (reciterId) =>
        set((state) => ({
          favoriteReciters: state.favoriteReciters.filter(id => id !== reciterId)
        })),

      isFavorite: (reciterId) => {
        const state = get();
        return state.favoriteReciters.includes(reciterId);
      },

      resetStore: () => set({
        reciters: popularReciters,
        selectedReciter: popularReciters[0],
        favoriteReciters: [],
      }),
    }),
    {
      name: 'reciter-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3, // Retour aux IDs API alquran.cloud originaux
    }
  )
);