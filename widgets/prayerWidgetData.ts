/**
 * Données du widget « Heures de prière ». Calcul local (aucun réseau) : le
 * widget se met à jour seul, app fermée et hors ligne.
 */
import { prayerTimesService, type PrayerCalcOptions } from '@/services/prayerTimesService';
import { placeLabel, type Place } from '@/utils/cities';

export const PRAYER_WIDGET_NAME = 'PrayerTimes';

const KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
// Noms wolof (comme dans les notifications), puis français
const NAMES: Record<(typeof KEYS)[number], { wo: string; fr: string }> = {
  fajr: { wo: 'Subha', fr: 'Fajr' },
  dhuhr: { wo: 'Tisbar', fr: 'Dhuhr' },
  asr: { wo: 'Takussan', fr: 'Asr' },
  maghrib: { wo: 'Timis', fr: 'Maghrib' },
  isha: { wo: 'Gué', fr: 'Isha' },
};

export interface PrayerWidgetData {
  place: string;
  prayers: { key: string; name: string; time: string; next: boolean }[];
  next: { name: string; fr: string; time: string; tomorrow: boolean };
}

export function prayerWidgetData(place: Place, calc: PrayerCalcOptions, now = new Date()): PrayerWidgetData {
  const today = prayerTimesService.calculatePrayerTimes(now, place, calc);
  let nextKey = KEYS.find((k) => today[k].timeDate.getTime() > now.getTime());
  let tomorrow = false;
  let nextTime = nextKey ? today[nextKey].time : '';
  if (!nextKey) {
    // Après Gué : la prochaine est Subha de demain
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    nextKey = 'fajr';
    nextTime = prayerTimesService.calculatePrayerTimes(t, place, calc).fajr.time;
    tomorrow = true;
  }
  return {
    place: placeLabel(place),
    prayers: KEYS.map((k) => ({ key: k, name: NAMES[k].wo, time: today[k].time, next: !tomorrow && k === nextKey })),
    next: { name: NAMES[nextKey].wo, fr: NAMES[nextKey].fr, time: nextTime, tomorrow },
  };
}
