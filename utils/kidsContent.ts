/**
 * Espace enfants — « Mes petites sourates ».
 * Ordre d'apprentissage habituel : Al-Fatiha puis les sourates courtes de la fin.
 * Récitation : Al-Husary « Enseignement » (lente, articulée, avec mot à mot).
 */
export const KIDS_RECITER_ID = 12;

/** Couleurs douces, assez contrastées pour le texte foncé posé dessus */
export const KIDS_COLORS = [
  { bg: '#CDEBDD', ink: '#0B3D2E' }, // menthe
  { bg: '#CFE3F6', ink: '#123A5C' }, // ciel
  { bg: '#F8E1A6', ink: '#5A3F06' }, // soleil
  { bg: '#F6CFC4', ink: '#6A2416' }, // corail
  { bg: '#DDD3F2', ink: '#33215E' }, // lavande
  { bg: '#D8EBC3', ink: '#2E4A12' }, // feuille
];

export const KIDS_SURAHS: number[] = [1, 112, 113, 114, 108, 103, 110, 109, 106, 105, 107, 102];

/** Nombre d'écoutes par verset en mode « Écoute et répète » */
export const KIDS_REPETITIONS = 3;

export const kidsColor = (i: number) => KIDS_COLORS[i % KIDS_COLORS.length];
