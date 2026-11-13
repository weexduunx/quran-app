// Fichier généré par scripts/build-adhan-audio.py : ne pas modifier à la main.
/* eslint-disable @typescript-eslint/no-require-imports */
export interface AdhanEntry {
  id: string;
  name: string;
  origin: string;
  isDefault: boolean;
  /** Nom du fichier, utilisé comme son de notification */
  file: string;
  source: number;
  fajrFile?: string;
  fajrSource?: number;
}

export const ADHANS: AdhanEntry[] = [
  {
    id: "touba_grande_mosquee",
    name: "Grande Mosquée de Touba",
    origin: "Touba, Sénégal",
    isDefault: true,
    file: "touba_grande_mosquee.mp3",
    source: require('../assets/audio/adhan/touba_grande_mosquee.mp3'),
  },
  {
    id: "senegal_adhan",
    name: "Adhan du Sénégal",
    origin: "Sénégal",
    isDefault: false,
    file: "senegal_adhan.mp3",
    source: require('../assets/audio/adhan/senegal_adhan.mp3'),
  },
];
