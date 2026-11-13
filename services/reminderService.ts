/**
 * Rappels locaux (aucun serveur) :
 * - heures de prière de la ville choisie, programmées pour les 7 prochains jours
 *   (iOS limite à 64 notifications en attente : 5 × 7 + 1 = 36)
 * - rappel quotidien de lecture
 * La programmation est refaite à chaque ouverture de l'app et à chaque changement de réglage.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { prayerTimesService, type PrayerCalcOptions } from '@/services/prayerTimesService';
import { placeLabel, type Place } from '@/utils/cities';
import { resolveAdhan } from '@/utils/adhan';
import { surahTransliteration } from '@/utils/surahNames';
import type { PrayerKey, PrayerReminders, ReadingReminder } from '@/stores/settingsStore';

const DAYS_AHEAD = 7;
const CHANNEL_PRAYER = 'prieres';
const CHANNEL_READING = 'lecture';

export const PRAYER_LABELS: Record<PrayerKey, { fr: string; wo: string }> = {
  fajr: { fr: 'Fajr', wo: 'Subha' },
  dhuhr: { fr: 'Dhuhr', wo: 'Tisbar' },
  asr: { fr: 'Asr', wo: 'Takussan' },
  maghrib: { fr: 'Maghrib', wo: 'Timis' },
  isha: { fr: 'Isha', wo: 'Gué' },
};

let configured = false;
const adhanChannels = new Set<string>();

/**
 * Android fige le son d'un canal à sa création : un canal par muezzin
 * (et par variante du Fajr). Renvoie l'id du canal à utiliser.
 */
async function adhanChannel(file: string | null): Promise<string> {
  if (!file || Platform.OS !== 'android') return CHANNEL_PRAYER;
  const id = `adhan_${file.replace(/\.[a-z0-9]+$/i, '')}`;
  if (!adhanChannels.has(id)) {
    await Notifications.setNotificationChannelAsync(id, {
      name: 'Adhan',
      importance: Notifications.AndroidImportance.MAX,
      sound: file,
      vibrationPattern: [0, 250, 250, 250],
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM, contentType: Notifications.AndroidAudioContentType.MUSIC },
    });
    adhanChannels.add(id);
  }
  return id;
}

export const reminderService = {
  configure() {
    if (configured) return;
    configured = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(CHANNEL_PRAYER, {
        name: 'Heures de prière',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      }).catch(() => {});
      Notifications.setNotificationChannelAsync(CHANNEL_READING, {
        name: 'Rappel de lecture',
        importance: Notifications.AndroidImportance.DEFAULT,
      }).catch(() => {});
    }
  },

  /** Demande l'autorisation (à appeler quand l'utilisateur active un rappel). */
  async requestPermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  },

  async sync(opts: {
    place: Place;
    calc: PrayerCalcOptions;
    adhanId: string;
    prayer: PrayerReminders;
    reading: ReadingReminder;
    lastRead?: { surahNumber: number; surahId: number; verseNumber: number } | null;
  }) {
    this.configure();

    // On ne remplace que nos propres rappels
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => ['prayer', 'reading'].includes(String(n.content.data?.kind)))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;

    const location = opts.place;
    const where = placeLabel(location);
    const now = Date.now();

    if (opts.prayer.enabled) {
      // L'adhan ne sonne qu'à l'heure exacte ; un rappel « X min avant » garde le son par défaut
      const adhan = opts.prayer.minutesBefore === 0 ? resolveAdhan(opts.adhanId) : null;
      const sound = (key: PrayerKey) => (adhan ? (key === 'fajr' && adhan.fajrFile) || adhan.file : null);
      const channels: Partial<Record<PrayerKey, string>> = {};
      for (const key of Object.keys(PRAYER_LABELS) as PrayerKey[]) channels[key] = await adhanChannel(sound(key));

      for (let d = 0; d < DAYS_AHEAD; d++) {
        const day = new Date();
        day.setDate(day.getDate() + d);
        const times = prayerTimesService.calculatePrayerTimes(day, location, opts.calc);
        for (const key of Object.keys(PRAYER_LABELS) as PrayerKey[]) {
          if (!opts.prayer.prayers[key]) continue;
          const at = times[key].timeDate.getTime() - opts.prayer.minutesBefore * 60_000;
          if (at <= now + 30_000) continue;
          const label = PRAYER_LABELS[key];
          await Notifications.scheduleNotificationAsync({
            content: {
              title: opts.prayer.minutesBefore
                ? `${label.wo} dans ${opts.prayer.minutesBefore} min · ${times[key].time}`
                : `C'est l'heure de ${label.wo} · ${times[key].time}`,
              body: `Prière de ${label.fr} à ${where}.`,
              data: { kind: 'prayer', url: '/' },
              sound: sound(key) ?? 'default',
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: channels[key] },
          });
        }
      }
    }

    if (opts.reading.enabled) {
      const last = opts.lastRead;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Votre moment avec le Coran',
          body: last
            ? `Reprenez ${surahTransliteration(last.surahNumber)} au verset ${last.verseNumber}.`
            : 'Quelques versets aujourd’hui ? Commencez par Al-Fatiha.',
          data: {
            kind: 'reading',
            url: last ? `/surah/${last.surahId}?verse=${last.verseNumber}` : '/surah/1',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: opts.reading.hour,
          minute: opts.reading.minute,
          channelId: CHANNEL_READING,
        },
      });
    }
  },
};
