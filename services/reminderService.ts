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
import { quranApi } from '@/services/api';
import { DAILY_DUAS } from '@/utils/adhkar';
import { verseOfTheDay } from '@/utils/quranMeta';
import type {
  AdhanSound,
  AdhkarReminders,
  DuaReminder,
  PrayerKey,
  PrayerReminders,
  ReadingReminder,
  VerseReminder,
} from '@/stores/settingsStore';

// Android fige le son d'un canal à sa création : changer le suffixe (-v2…)
// force la création d'un canal neuf quand sa configuration sonore change.
const CHANNEL_PRAYER = 'prieres-v2';
/** Anciens canaux de prière / d'adhan à supprimer (son figé, parfois muet). */
const isLegacyPrayerChannel = (id: string) =>
  id === 'prieres' || id.startsWith('adhan_') || /^adhan-[a-z]+$/.test(id);
const CHANNEL_READING = 'lecture';
const CHANNEL_ADHKAR = 'invocations';

/** iOS garde au plus 64 notifications en attente */
const MAX_PENDING = 64;
const MAX_DAYS = 7;
const OUR_KINDS = ['prayer', 'reading', 'verse', 'adhkar', 'dua'];

const DATE = Notifications.SchedulableTriggerInputTypes.DATE;

/** Texte court pour le corps d'une notification */
const short = (t: string, max = 140) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

/** Français du verset, si on peut l'obtenir vite (cache ou réseau) ; sinon null */
async function verseText(global: number): Promise<string | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
  const fetchText = quranApi
    .getVerseByGlobalNumber(global)
    .then((v) => v?.text_french || null)
    .catch(() => null);
  return Promise.race([fetchText, timeout]);
}

/**
 * Sur Android le son appartient au canal et ne peut plus changer après sa
 * création : un canal par adhan. Fichiers déclarés dans app.json
 * (plugin expo-notifications) ; iOS limite le son à 30 s, d'où un extrait.
 */
export const ADHANS: Record<Exclude<AdhanSound, 'none'>, { label: string; channel: string; android: string; ios: string }> = {
  touba: { label: 'Touba', channel: 'adhan-touba-v2', android: 'adhan_touba.mp3', ios: 'adhan_touba_ios.caf' },
  senegal: { label: 'Sénégal', channel: 'adhan-senegal-v2', android: 'adhan_senegal.mp3', ios: 'adhan_senegal_ios.caf' },
  reunion: { label: 'Réunion', channel: 'adhan-reunion-v2', android: 'adhan_reunion.mp3', ios: 'adhan_reunion_ios.caf' },
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
      Notifications.getNotificationChannelsAsync()
        .then((channels) =>
          Promise.all(
            channels
              .filter((ch) => isLegacyPrayerChannel(ch.id))
              .map((ch) => Notifications.deleteNotificationChannelAsync(ch.id)),
          ),
        )
        .catch(() => {});
      // Pas de clé `sound` : sur un canal, 'default' serait pris pour un
      // fichier « default » introuvable ; sans la clé, Android met le son par défaut.
      Notifications.setNotificationChannelAsync(CHANNEL_PRAYER, {
        name: 'Heures de prière',
        importance: Notifications.AndroidImportance.HIGH,
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
        name: 'Lecture et verset du jour',
        importance: Notifications.AndroidImportance.DEFAULT,
      }).catch(() => {});
      Notifications.setNotificationChannelAsync(CHANNEL_ADHKAR, {
        name: 'Invocations',
        description: 'Invocations du matin, du soir, du coucher et du quotidien',
        importance: Notifications.AndroidImportance.HIGH,
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
    prayer: PrayerReminders;
    reading: ReadingReminder;
    verse: VerseReminder;
    adhkar: AdhkarReminders;
    duas: Record<string, DuaReminder>;
    lastRead?: { surahNumber: number; surahId: number; verseNumber: number } | null;
  }) {
    this.configure();

    // On ne remplace que nos propres rappels
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => OUR_KINDS.includes(String(n.content.data?.kind)))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;

    const location = opts.place;
    const where = placeLabel(location);
    const now = Date.now();
    const later = (t: number) => t > now + 30_000;

    // Rappels répétés : un seul emplacement chacun, quel que soit le nombre de jours
    const duaEntries = Object.entries(opts.duas).filter(([id, r]) => DAILY_DUAS[id] && r.days.length);
    let repeating = 0;
    if (opts.reading.enabled) repeating += 1;
    if (opts.adhkar.sleep) repeating += 1;
    if (opts.adhkar.friday) repeating += 1;
    for (const [, r] of duaEntries) repeating += r.days.length === 7 ? 1 : r.days.length;

    // Rappels datés, recalculés chaque jour : heures de prière, adhkâr matin/soir, verset du jour
    const adhanKey = opts.prayer.adhan ?? 'touba';
    const adhan = adhanKey === 'none' ? null : ADHANS[adhanKey];
    const early = opts.prayer.minutesBefore > 0;
    const prayersOn = opts.prayer.enabled ? Object.values(opts.prayer.prayers).filter(Boolean).length : 0;
    const perDay =
      prayersOn * (early && adhan ? 2 : 1) +
      (opts.adhkar.morning ? 1 : 0) +
      (opts.adhkar.evening ? 1 : 0) +
      (opts.verse.enabled ? 1 : 0);
    // Autant de jours que la limite d'iOS le permet ; l'app reprogramme à chaque ouverture
    const daysAhead = perDay ? Math.max(1, Math.min(MAX_DAYS, Math.floor((MAX_PENDING - repeating) / perDay))) : 0;

    for (let d = 0; d < daysAhead; d++) {
      const day = new Date();
      day.setDate(day.getDate() + d);
      const times = prayerTimesService.calculatePrayerTimes(day, location, opts.calc);

      if (opts.prayer.enabled) {
        for (const key of Object.keys(PRAYER_LABELS) as PrayerKey[]) {
          if (!opts.prayer.prayers[key]) continue;
          const label = PRAYER_LABELS[key];
          const time = times[key].timeDate.getTime();

          // Rappel N minutes avant : son normal
          const before = time - opts.prayer.minutesBefore * 60_000;
          if (early && later(before)) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${label.wo} dans ${opts.prayer.minutesBefore} min · ${times[key].time}`,
                body: `Prière de ${label.fr} à ${where}.`,
                data: { kind: 'prayer', url: '/' },
                sound: 'default',
              },
              trigger: { type: DATE, date: before, channelId: CHANNEL_PRAYER },
            });
          }

          // À l'heure : l'adhan choisi (ou le son normal si « aucun »)
          if ((!early || adhan) && later(time)) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `C'est l'heure de ${label.wo} · ${times[key].time}`,
                body: `Prière de ${label.fr} à ${where}.`,
                data: { kind: 'prayer', url: '/' },
                sound: adhan ? (Platform.OS === 'ios' ? adhan.ios : adhan.android) : 'default',
              },
              trigger: { type: DATE, date: time, channelId: adhan ? adhan.channel : CHANNEL_PRAYER },
            });
          }
        }
      }

      // Invocations du matin et du soir : 20 min après Subha et Takussan du lieu choisi
      const adhkarAt = [
        {
          on: opts.adhkar.morning,
          moment: 'matin',
          at: times.fajr.timeDate.getTime() + 20 * 60_000,
          title: 'Invocations du matin',
          body: 'Âyat al-Kursî, les trois sourates protectrices et les adhkâr du matin, avant le lever du soleil.',
        },
        {
          on: opts.adhkar.evening,
          moment: 'soir',
          at: times.asr.timeDate.getTime() + 20 * 60_000,
          title: 'Invocations du soir',
          body: 'Les adhkâr du soir, avant le coucher du soleil.',
        },
      ];
      for (const a of adhkarAt) {
        if (!a.on || !later(a.at)) continue;
        await Notifications.scheduleNotificationAsync({
          content: { title: a.title, body: a.body, data: { kind: 'adhkar', url: `/adhkar?moment=${a.moment}` } },
          trigger: { type: DATE, date: a.at, channelId: CHANNEL_ADHKAR },
        });
      }

      // Verset du jour : un verset différent chaque jour, d'où une notification datée
      if (opts.verse.enabled) {
        const at = new Date(day);
        at.setHours(opts.verse.hour, opts.verse.minute, 0, 0);
        if (later(at.getTime())) {
          const v = verseOfTheDay(day);
          const text = await verseText(v.global);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Verset du jour · ${surahTransliteration(v.surah)} ${v.surah}:${v.verse}`,
              body: text ? short(`« ${text} »`) : 'Touchez pour le lire, l’écouter et le méditer.',
              data: { kind: 'verse', url: `/surah/${v.surah}?verse=${v.verse}` },
            },
            trigger: { type: DATE, date: at, channelId: CHANNEL_READING },
          });
        }
      }
    }

    if (opts.adhkar.sleep) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Invocations du coucher',
          body: 'Âyat al-Kursî, la fin d’Al-Baqara et « Bismika Allâhumma amûtu wa aḥyâ ».',
          data: { kind: 'adhkar', url: '/adhkar?moment=coucher' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: opts.adhkar.sleepHour,
          minute: opts.adhkar.sleepMinute,
          channelId: CHANNEL_ADHKAR,
        },
      });
    }

    if (opts.adhkar.friday) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Jumu‘a Mubârak',
          body: 'Lisez la sourate Al-Kahf et multipliez la prière sur le Prophète ﷺ.',
          data: { kind: 'adhkar', url: '/adhkar?moment=vendredi' },
        },
        // 6 = vendredi (1 = dimanche)
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour: 9, minute: 0, channelId: CHANNEL_ADHKAR },
      });
    }

    // Invocations du quotidien, aux heures et jours choisis par l'utilisateur
    for (const [id, r] of duaEntries) {
      const dua = DAILY_DUAS[id];
      const content = {
        title: dua.title,
        body: short(dua.tr ? `${dua.tr} — ${dua.fr}` : dua.fr),
        data: { kind: 'dua', url: `/adhkar?moment=quotidien&dua=${id}` },
      };
      if (r.days.length === 7) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL_ADHKAR },
        });
        continue;
      }
      for (const weekday of r.days) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: r.hour,
            minute: r.minute,
            channelId: CHANNEL_ADHKAR,
          },
        });
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
