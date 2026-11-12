/**
 * Calendrier hégirien tabulaire (algorithme « koweïtien »).
 * Il peut différer d'un jour de l'observation du croissant : l'utilisateur
 * corrige avec le réglage `hijriOffset` (−2 … +2 jours).
 */

export const HIJRI_MONTHS_FR = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Joumada al-Oula',
  'Joumada al-Akhira',
  'Rajab',
  "Cha'ban",
  'Ramadan',
  'Chawwal',
  "Dhou al-Qi'da",
  'Dhou al-Hijja',
];

export interface HijriDate {
  day: number;
  month: number; // 1-12
  year: number;
  monthName: string;
}

export function toHijri(input: Date, offsetDays = 0): HijriDate {
  const date = new Date(input);
  date.setDate(date.getDate() + offsetDays);

  const day = date.getDate();
  let m = date.getMonth() + 1;
  let y = date.getFullYear();
  if (m < 3) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;

  const iyear = 10631 / 30;
  const shift1 = 8.01 / 60;
  let z = jd - 1948084;
  const cyc = Math.floor(z / 10631);
  z -= 10631 * cyc;
  const j = Math.floor((z - shift1) / iyear);
  const year = 30 * cyc + j;
  z -= Math.floor(j * iyear + shift1);
  let month = Math.floor((z + 28.5001) / 29.5);
  if (month === 13) month = 12;
  const hDay = z - Math.floor(29.5001 * month - 29);

  return { day: hDay, month, year, monthName: HIJRI_MONTHS_FR[month - 1] };
}

export const formatHijri = (h: HijriDate) => `${h.day} ${h.monthName} ${h.year}`;
