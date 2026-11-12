/** Métadonnées statiques du Coran (disponibles hors ligne). */

/** Nombre de versets par sourate (Hafs, 6236 au total). */
export const VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112,
  78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37,
  35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8,
  19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

/** Numéro global (1…6236) d'un verset à partir de sourate:verset. */
export function globalVerseNumber(surah: number, verse: number): number {
  let n = 0;
  for (let i = 0; i < surah - 1; i++) n += VERSE_COUNTS[i];
  return n + verse;
}

/** Versets courts et parlants, adaptés à une méditation quotidienne. */
const DAILY_VERSES: [number, number][] = [
  [2, 152], [2, 186], [2, 286], [3, 139], [3, 159], [13, 28], [94, 5], [94, 6], [65, 3],
  [39, 53], [2, 153], [29, 69], [16, 97], [20, 114], [40, 60], [8, 46], [49, 13], [33, 41],
  [17, 80], [21, 87], [11, 88], [18, 10], [14, 7], [3, 8], [25, 74], [7, 23], [2, 201],
  [93, 5], [62, 10], [55, 13],
];

export function verseOfTheDay(date: Date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  const [surah, verse] = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
  return { surah, verse, global: globalVerseNumber(surah, verse) };
}

export const revelationLabel = (type?: string) => {
  const t = (type || '').toLowerCase();
  if (t.startsWith('mec') || t.startsWith('mak')) return 'Mecquoise';
  if (t.startsWith('med')) return 'Médinoise';
  return type || '';
};

export const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
