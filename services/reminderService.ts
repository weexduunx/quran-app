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
import { hasBundledSound } from '@/modules/adhan-sound';
import type {
  AdhanSound,
  CustomAdhan,
  AdhkarReminders,
  DuaReminder,
  PrayerKey,
  PrayerReminders,
  ReadingReminder,
  VerseReminder,
} from '@/stores/settingsStore';

// Android fige le son d'un canal à sa création : changer le suffixe (-v2…)
// force la création d'un canal neuf quand sa configuration sonore change.
// v3 : son de rappel intégré à l'APK. Le « son par défaut » d'Android dépend
// du téléphone (souvent « aucun ») : les rappels restaient muets chez les testeurs.
//
// Un client construit avant l'ajout de rappel.wav ne l'a pas : on garde alors
// les anciens canaux (son par défaut). Créer les canaux v3 sans le fichier
// figerait pour toujours le son par défaut, même après mise à jour de l'APK.
const reminderSoundBundled = Platform.OS !== 'android' || hasBundledSound('rappel');
const CHANNEL_PRAYER = reminderSoundBundled ? 'prieres-v3' : 'prieres-v2';
const CHANNEL_READING = reminderSoundBundled ? 'lecture-v2' : 'lecture';
const CHANNEL_ADHKAR = reminderSoundBundled ? 'invocations-v2' : 'invocations';
/** Son des notifications sans adhan (fichier déclaré dans app.json) */
const REMINDER_SOUND = reminderSoundBundled ? 'rappel.wav' : 'default';
/**
 * Anciens canaux à supprimer (son figé, parfois muet, ou adhan de Touba
 * retiré). Jamais les canaux des adhans importés (adhan-perso-…).
 */
const LEGACY_CHANNELS = new Set(
  reminderSoundBundled ? ['prieres', 'prieres-v2', 'lecture', 'invocations', 'adhan-touba-v2'] : ['prieres', 'adhan-touba-v2']
);
const isLegacyChannel = (id: string) => LEGACY_CHANNELS.has(id) || id.startsWith('adhan_') || /^adhan-[a-z]+$/.test(id);

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
export type BuiltinAdhan = 'senegal' | 'reunion';
export const ADHANS: Record<BuiltinAdhan, { label: string; channel: string; android: string; ios: string }> = {
  senegal: { label: 'Sénégal', channel: 'adhan-senegal-v2', android: 'adhan_senegal.mp3', ios: 'adhan_senegal_ios.caf' },
  reunion: { label: 'Réunion', channel: 'adhan-reunion-v2', android: 'adhan_reunion.mp3', ios: 'adhan_reunion_ios.caf' },
};

/**
 * Son et canal de l'adhan choisi. Adhan importé : son canal Android porte le
 * son (le champ `sound` ne sert pas) ; sur iOS, ou s'il a disparu, son normal.
 */
function resolveAdhan(key: AdhanSound, custom: CustomAdhan[]): { channel: string; android?: string; ios?: string } | null {
  if (key === 'none') return null;
  if (key.startsWith('custom-')) {
    const found = Platform.OS === 'android' ? custom.find((a) => `custom-${a.id}` === key) : undefined;
    return found ? { channel: found.channel } : null;
  }
  return ADHANS[key as BuiltinAdhan] ?? ADHANS.senegal;
}

export const PRAYER_LABELS: Record<PrayerKey, { fr: string; wo: string }> = {
  fajr: { fr: 'Fajr', wo: 'Subha' },
  dhuhr: { fr: 'Dhuhr', wo: 'Tisbar' },
  asr: { fr: 'Asr', wo: 'Takussan' },
  maghrib: { fr: 'Maghrib', wo: 'Timis' },
  isha: { fr: 'Isha', wo: 'Gué' },
};

type SyncOptions = {
  place: Place;
  calc: PrayerCalcOptions;
  prayer: PrayerReminders;
  reading: ReadingReminder;
  verse: VerseReminder;
  adhkar: AdhkarReminders;
  duas: Record<string, DuaReminder>;
  lastRead?: { surahNumber: number; surahId: number; verseNumber: number } | null;
  customAdhans: CustomAdhan[];
};

/** Prévenus après chaque vérification de l'autorisation (bandeau des réglages) */
const permissionListeners = new Set<() => void>();
const notifyPermissionListeners = () => permissionListeners.forEach((l) => l());
export const onPermissionChecked = (l: () => void) => {
  permissionListeners.add(l);
  return () => {
    permissionListeners.delete(l);
  };
};

let running: Promise<void> | null = null;
let queued: SyncOptions | null = null;

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
              .filter((ch) => isLegacyChannel(ch.id))
              .map((ch) => Notifications.deleteNotificationChannelAsync(ch.id)),
          ),
        )
        .catch(() => {});
      const reminderChannel = {
        importance: Notifications.AndroidImportance.HIGH,
        // Sans le fichier : pas de clé `sound`, Android met son son par défaut
        ...(reminderSoundBundled ? { sound: REMINDER_SOUND } : {}),
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
      };
      Notifications.setNotificationChannelAsync(CHANNEL_PRAYER, {
        ...reminderChannel,
        name: 'Heures de prière (sans adhan)',
        description: "Rappel avant la prière, et prières pour lesquelles l'adhan est désactivé",
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
        ...reminderChannel,
        name: 'Lecture et verset du jour',
      }).catch(() => {});
      Notifications.setNotificationChannelAsync(CHANNEL_ADHKAR, {
        ...reminderChannel,
        name: 'Invocations',
        description: 'Invocations du matin, du soir, du coucher et du quotidien',
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

  /**
   * Reprogramme tous les rappels. Une seule synchronisation à la fois : une
   * demande arrivée pendant ce temps est rejouée ensuite avec ses réglages.
   */
  sync(opts: SyncOptions): Promise<void> {
    queued = opts;
    if (!running) {
      running = (async () => {
        while (queued) {
          const next = queued;
          queued = null;
          try {
            await this.syncNow(next);
          } catch (e) {
            console.warn('[rappels]', e);
          }
        }
      })().finally(() => {
        running = null;
      });
    }
    return running;
  },

  async syncNow(opts: SyncOptions) {
    this.configure();
    const requests: Notifications.NotificationRequestInput[] = [];

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
    const adhan = resolveAdhan(opts.prayer.adhan ?? 'senegal', opts.customAdhans);
    const early = opts.prayer.minutesBefore > 0;
    const prayerKeys = Object.keys(PRAYER_LABELS) as PrayerKey[];
    // Adhan seulement pour les prières choisies ; les autres sonnent avec le rappel
    const adhanFor = (key: PrayerKey) => (adhan && opts.prayer.adhanPrayers?.[key] !== false ? adhan : null);
    const prayerSlots = opts.prayer.enabled
      ? prayerKeys.filter((k) => opts.prayer.prayers[k]).reduce((n, k) => n + (early && adhanFor(k) ? 2 : 1), 0)
      : 0;
    const perDay =
      prayerSlots +
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
        for (const key of prayerKeys) {
          if (!opts.prayer.prayers[key]) continue;
          const label = PRAYER_LABELS[key];
          const prayerAdhan = adhanFor(key);
          const time = times[key].timeDate.getTime();

          // Rappel N minutes avant : son normal
          const before = time - opts.prayer.minutesBefore * 60_000;
          if (early && later(before)) {
            requests.push({
              content: {
                title: `${label.wo} dans ${opts.prayer.minutesBefore} min · ${times[key].time}`,
                body: `Prière de ${label.fr} à ${where}.`,
                data: { kind: 'prayer', url: '/' },
                sound: REMINDER_SOUND,
              },
              trigger: { type: DATE, date: before, channelId: CHANNEL_PRAYER },
            });
          }

          // À l'heure : l'adhan choisi pour cette prière (ou le son de rappel)
          if ((!early || prayerAdhan) && later(time)) {
            requests.push({
              content: {
                title: `C'est l'heure de ${label.wo} · ${times[key].time}`,
                body: `Prière de ${label.fr} à ${where}.`,
                data: { kind: 'prayer', url: '/' },
                sound: prayerAdhan
                  ? ((Platform.OS === 'ios' ? prayerAdhan.ios : prayerAdhan.android) ?? REMINDER_SOUND)
                  : REMINDER_SOUND,
              },
              trigger: { type: DATE, date: time, channelId: prayerAdhan ? prayerAdhan.channel : CHANNEL_PRAYER },
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
        requests.push({
          content: { title: a.title, body: a.body, data: { kind: 'adhkar', url: `/adhkar?moment=${a.moment}` }, sound: REMINDER_SOUND },
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
          requests.push({
            content: {
              title: `Verset du jour · ${surahTransliteration(v.surah)} ${v.surah}:${v.verse}`,
              body: text ? short(`« ${text} »`) : 'Touchez pour le lire, l’écouter et le méditer.',
              data: { kind: 'verse', url: `/surah/${v.surah}?verse=${v.verse}` },
              sound: REMINDER_SOUND,
            },
            trigger: { type: DATE, date: at, channelId: CHANNEL_READING },
          });
        }
      }
    }

    if (opts.adhkar.sleep) {
      requests.push({
        content: {
          title: 'Invocations du coucher',
          body: 'Âyat al-Kursî, la fin d’Al-Baqara et « Bismika Allâhumma amûtu wa aḥyâ ».',
          data: { kind: 'adhkar', url: '/adhkar?moment=coucher' },
          sound: REMINDER_SOUND,
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
      requests.push({
        content: {
          title: 'Jumu‘a Mubârak',
          body: 'Lisez la sourate Al-Kahf et multipliez la prière sur le Prophète ﷺ.',
          data: { kind: 'adhkar', url: '/adhkar?moment=vendredi' },
          sound: REMINDER_SOUND,
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
        sound: REMINDER_SOUND,
      };
      if (r.days.length === 7) {
        requests.push({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL_ADHKAR },
        });
        continue;
      }
      for (const weekday of r.days) {
        requests.push({
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
      requests.push({
        content: {
          title: 'Votre moment avec le Coran',
          body: last
            ? `Reprenez ${surahTransliteration(last.surahNumber)} au verset ${last.verseNumber}.`
            : 'Quelques versets aujourd’hui ? Commencez par Al-Fatiha.',
          data: {
            kind: 'reading',
            url: last ? `/surah/${last.surahId}?verse=${last.verseNumber}` : '/surah/1',
          },
          sound: REMINDER_SOUND,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: opts.reading.hour,
          minute: opts.reading.minute,
          channelId: CHANNEL_READING,
        },
      });
    }

    // Tout est prêt (textes compris) : on remplace nos rappels d'un coup. Rien
    // n'est annulé avant, pour ne pas rester sans rappels si l'app passe en
    // arrière-plan pendant la préparation (minuteries et réseau y sont gelés).
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => OUR_KINDS.includes(String(n.content.data?.kind)))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    // Rappels activés mais notifications non autorisées (réinstallation,
    // sauvegarde restaurée, Android 13+ qui ne les accorde jamais d'office) :
    // on redemande, sinon rien ne serait programmé, sans le moindre signe.
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && requests.length && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    notifyPermissionListeners();
    if (!permission.granted) return;

    // Les plus proches d'abord
    const at = (r: Notifications.NotificationRequestInput) => {
      const t = r.trigger as { date?: number | Date } | null;
      return t?.date ? new Date(t.date).getTime() : Number.MAX_SAFE_INTEGER;
    };
    requests.sort((a, b) => at(a) - at(b));
    for (const r of requests) {
      await Notifications.scheduleNotificationAsync(r);
    }
  },
};
