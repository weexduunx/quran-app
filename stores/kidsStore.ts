import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type KidsMode = 'repeat' | 'listen';

interface KidsState {
  /** Étoiles gagnées par sourate (0 à 3) */
  stars: Record<number, number>;
  /** Nombre de séances terminées par sourate */
  sessions: Record<number, number>;
  mode: KidsMode;
  /** L'app reste dans l'espace enfants, même après redémarrage, jusqu'à la sortie parent */
  locked: boolean;

  completeSession: (surah: number) => number;
  setMode: (mode: KidsMode) => void;
  setLocked: (locked: boolean) => void;
  resetProgress: () => void;
}

export const useKidsStore = create<KidsState>()(
  persist(
    (set, get) => ({
      stars: {},
      sessions: {},
      mode: 'repeat',
      locked: false,

      /** Une étoile par séance terminée, jusqu'à 3. Renvoie le nouveau total d'étoiles. */
      completeSession: (surah) => {
        const stars = Math.min(3, (get().stars[surah] ?? 0) + 1);
        set((s) => ({
          stars: { ...s.stars, [surah]: stars },
          sessions: { ...s.sessions, [surah]: (s.sessions[surah] ?? 0) + 1 },
        }));
        return stars;
      },
      setMode: (mode) => set({ mode }),
      setLocked: (locked) => set({ locked }),
      resetProgress: () => set({ stars: {}, sessions: {} }),
    }),
    { name: 'kids-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
