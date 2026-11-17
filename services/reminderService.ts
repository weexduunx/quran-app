/**
 * Rappels locaux (aucun serveur) :
 * - heures de prière de la ville choisie, programmées pour les jours à venir
 *   (iOS limite à 64 notifications en attente : voir daysAhead)
 * - adhan joué à l'heure exacte de la prière ; si l'utilisateur veut être
 *   prévenu N minutes avant, ce rappel-là garde le son normal
 *   (un adhan avant l'heure induirait en erreur)
 * - rappel quotidien de lecture
 * La programmation est refaite à chaque ouverture de l'app et à chaque changement de réglage.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { prayerTimesService, type PrayerCalcOptions } from '@/services/prayerTimesService';
import { placeLabel, type Place } from '@/utils/cities';
import { surahTransliteration } from '@/utils/surahNames';
import type { AdhanSound, PrayerKey, PrayerReminders, ReadingReminder } from '@/stores/settingsStore';

const CHANNEL_PRAYER = 'prieres';
const CHANNEL_READING = 'lecture';

/**
 * Sur Android le son appartient au canal et ne peut plus changer après sa
 * création : un canal par adhan. Fichiers déclarés dans app.json
 * (plugin expo-notifications) ; iOS limite le son à 30 s, d'où un extrait.
 */
export const ADHANS: Record<Exclude<AdhanSound, 'none'>, { label: string; channel: string; android: string; ios: string }> = {
  touba: { label: 'Touba', channel: 'adhan-touba', android: 'adhan_touba.mp3', ios: 'adhan_touba_ios.caf' },
  senegal: { label: 'Sénégal', channel: 'adhan-senegal', android: 'adhan_senegal.mp3', ios: 'adhan_senegal_ios.caf' },
  reunion: { label: 'Réunion', channel: 'adhan-reunion', android: 'adhan_reunion.mp3', ios: 'adhan_reunion_ios.caf' },
};

export const PRAYER_LABELS: Record<PrayerKey, { fr: string; wo: string }> = {
  fajr: { fr: 'Fajr', wo: 'Subha' },
  dhuhr: { fr: 'Dhuhr', wo: 'Tisbar' },
  asr: { fr: 'Asr', wo: 'Takussan' },
  maghrib: { fr: 'Maghrib', wo: 'Timis' },
  isha: { fr: 'Isha', wo: 'Gué' },
};

let configured = false;
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
      for (const a of Object.values(ADHANS)) {
        Notifications.setNotificationChannelAsync(a.channel, {
          name: `Adhan · ${a.label}`,
          description: "Appel à la prière joué à l'heure de chaque prière",
          importance: Notifications.AndroidImportance.MAX,
          sound: a.android,
          vibrationPattern: [0, 400, 200, 400],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.NOTIFICATION,
            contentType: Notifications.AndroidAudioContentType.MUSIC,
          },
        }).catch(() => {});
      }
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
      const adhanKey = opts.prayer.adhan ?? 'touba';
      const adhan = adhanKey === 'none' ? null : ADHANS[adhanKey];
      const early = opts.prayer.minutesBefore > 0;
      // 5 prières × jours × (1 ou 2 notifications) + rappel de lecture ≤ 64 (iOS)
      const daysAhead = adhan && early ? 6 : 7;
      for (let d = 0; d < daysAhead; d++) {
        const day = new Date();
        day.setDate(day.getDate() + d);
        const times = prayerTimesService.calculatePrayerTimes(day, location, opts.calc);
        for (const key of Object.keys(PRAYER_LABELS) as PrayerKey[]) {
          if (!opts.prayer.prayers[key]) continue;
          const label = PRAYER_LABELS[key];
          const time = times[key].timeDate.getTime();

          // Rappel N minutes avant : son normal
          const before = time - opts.prayer.minutesBefore * 60_000;
          if (early && before > now + 30_000) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${label.wo} dans ${opts.prayer.minutesBefore} min · ${times[key].time}`,
                body: `Prière de ${label.fr} à ${location.name}.`,
                data: { kind: 'prayer', url: '/' },
                sound: 'default',
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: before, channelId: CHANNEL_PRAYER },
            });
          }

          // À l'heure : l'adhan choisi (ou le son normal si « aucun »)
          if ((!early || adhan) && time > now + 30_000) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `C'est l'heure de ${label.wo} · ${times[key].time}`,
                body: `Prière de ${label.fr} à ${location.name}.`,
                data: { kind: 'prayer', url: '/' },
                sound: adhan ? (Platform.OS === 'ios' ? adhan.ios : adhan.android) : 'default',
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: time,
                channelId: adhan ? adhan.channel : CHANNEL_PRAYER,
              },
            });
          }
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
