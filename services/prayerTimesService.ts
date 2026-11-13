import { utcOffsetFor } from '@/utils/cities';

/**
 * Service pour calculer les heures de prière
 * Utilise l'algorithme de calcul islamique standard
 */

export interface PrayerTime {
  name: string;
  nameArabic: string;
  time: string;
  timeDate: Date;
  isCurrent: boolean;
  isNext: boolean;
}

export interface DailyPrayerTimes {
  fajr: PrayerTime;
  sunrise: PrayerTime;
  dhuhr: PrayerTime;
  asr: PrayerTime;
  maghrib: PrayerTime;
  isha: PrayerTime;
  currentPrayer: PrayerTime | null;
  nextPrayer: PrayerTime | null;
  date: string;
}

export type PrayerMethodId = 'mwl' | 'egypt' | 'umm_al_qura' | 'karachi' | 'isna' | 'morocco' | 'uoif' | 'custom';
export type AsrSchool = 'standard' | 'hanafi';
type TimeKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerMethod {
  id: PrayerMethodId;
  name: string;
  description: string;
  fajrAngle: number;
  /** Angle d'Isha, ou durée fixe après Maghrib (Umm al-Qura) */
  ishaAngle?: number;
  ishaMinutes?: number;
}

/** Conventions de calcul reconnues (angles du soleil sous l'horizon) */
export const PRAYER_METHODS: PrayerMethod[] = [
  { id: 'mwl', name: 'Ligue Islamique Mondiale', description: 'Fajr 18° · Isha 17° — référence au Sénégal', fajrAngle: 18, ishaAngle: 17 },
  { id: 'egypt', name: 'Autorité égyptienne', description: 'Fajr 19,5° · Isha 17,5°', fajrAngle: 19.5, ishaAngle: 17.5 },
  { id: 'umm_al_qura', name: 'Umm al-Qura (La Mecque)', description: 'Fajr 18,5° · Isha 90 min après Maghrib', fajrAngle: 18.5, ishaMinutes: 90 },
  { id: 'karachi', name: 'Université de Karachi', description: 'Fajr 18° · Isha 18°', fajrAngle: 18, ishaAngle: 18 },
  { id: 'isna', name: 'ISNA (Amérique du Nord)', description: 'Fajr 15° · Isha 15°', fajrAngle: 15, ishaAngle: 15 },
  { id: 'morocco', name: 'Ministère des Habous (Maroc)', description: 'Fajr 19° · Isha 17°', fajrAngle: 19, ishaAngle: 17 },
  { id: 'uoif', name: 'Musulmans de France (UOIF)', description: 'Fajr 12° · Isha 12°', fajrAngle: 12, ishaAngle: 12 },
  { id: 'custom', name: 'Personnalisée', description: 'Vos propres angles', fajrAngle: 18, ishaAngle: 17 },
];

/** Convention conseillée selon le pays (ISO 2 lettres) ; MWL ailleurs, dont le Sénégal et l'Europe */
export function recommendedMethod(countryCode?: string): PrayerMethodId {
  switch ((countryCode ?? '').toUpperCase()) {
    case 'MA':
      return 'morocco';
    case 'EG':
    case 'SD':
    case 'LY':
      return 'egypt';
    case 'SA':
    case 'YE':
      return 'umm_al_qura';
    case 'US':
    case 'CA':
      return 'isna';
    case 'PK':
    case 'IN':
    case 'BD':
    case 'AF':
      return 'karachi';
    default:
      return 'mwl';
  }
}

export interface PrayerCalcOptions {
  method?: PrayerMethodId;
  /** Angles utilisés quand method = 'custom' */
  customFajrAngle?: number;
  customIshaAngle?: number;
  /** standard = Maliki/Chafi'i/Hanbali (ombre × 1) · hanafi = ombre × 2 */
  asrSchool?: AsrSchool;
  /** Ajustement en minutes par prière (ex. +2 pour une marge de précaution) */
  offsets?: Partial<Record<TimeKey, number>>;
}

export const DEFAULT_PRAYER_OPTIONS: Required<Omit<PrayerCalcOptions, 'offsets'>> & { offsets: Record<TimeKey, number> } = {
  method: 'mwl',
  customFajrAngle: 18,
  customIshaAngle: 17,
  asrSchool: 'standard',
  offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
};

export interface Location {
  latitude: number;
  longitude: number;
  /** Fuseau IANA (Europe/Paris…) : donne l'heure locale exacte, heure d'été comprise */
  timezone: string;
  /** Décalage UTC de secours en heures (Dakar : 0) */
  utcOffset?: number;
}

class PrayerTimesService {
  private defaultLocation: Location = {
    latitude: 14.6928, // Dakar, Sénégal
    longitude: -17.4467,
    timezone: 'Africa/Dakar',
    utcOffset: 0,
  };

  /**
   * Calcule les heures de prière pour une date et localisation donnée
   * Utilise la méthode MWL (Ligue Mondiale Islamique) standard au Sénégal
   * Angle Fajr: -18°, Angle Isha: -17°
   */
  calculatePrayerTimes(date: Date = new Date(), location?: Location, options?: PrayerCalcOptions): DailyPrayerTimes {
    const loc = location || this.defaultLocation;
    const offsetOn = (d: Date) => utcOffsetFor(loc.timezone, d, loc.utcOffset ?? 0);
    const off = offsetOn(date);
    const solar = (d: Date) => this.calculateSolarPrayerTimes(d, loc, options, offsetOn(d));

    // Calcul basé sur la méthode MWL (Muslim World League)
    // Standard utilisé au Sénégal pour les horaires de prière officiels
    const baseYear = date.getFullYear();
    const baseMonth = date.getMonth();
    const baseDay = date.getDate();

    // Calcul des heures de prière selon la position solaire pour Dakar
    const calculatedTimes = solar(date);

    const times = {
      fajr: {
        name: 'Subha',
        nameArabic: 'الفَجْر',
        time: calculatedTimes.fajr,
        timeDate: this.parseTimeToDate(calculatedTimes.fajr, baseYear, baseMonth, baseDay, off),
        isCurrent: false,
        isNext: false,
      },
      sunrise: {
        name: 'Lever du soleil',
        nameArabic: 'الشُرُوق',
        time: calculatedTimes.sunrise,
        timeDate: this.parseTimeToDate(calculatedTimes.sunrise, baseYear, baseMonth, baseDay, off),
        isCurrent: false,
        isNext: false,
      },
      dhuhr: {
        name: 'Tisbar',
        nameArabic: 'الظُهر',
        time: calculatedTimes.dhuhr,
        timeDate: this.parseTimeToDate(calculatedTimes.dhuhr, baseYear, baseMonth, baseDay, off),
        isCurrent: false,
        isNext: false,
      },
      asr: {
        name: 'Takussan',
        nameArabic: 'العَصر',
        time: calculatedTimes.asr,
        timeDate: this.parseTimeToDate(calculatedTimes.asr, baseYear, baseMonth, baseDay, off),
        isCurrent: false,
        isNext: false,
      },
      maghrib: {
        name: 'Timis',
        nameArabic: 'المَغرِب',
        time: calculatedTimes.maghrib,
        timeDate: this.parseTimeToDate(calculatedTimes.maghrib, baseYear, baseMonth, baseDay, off),
        isCurrent: false,
        isNext: false,
      },
      isha: {
        name: 'Gué',
        nameArabic: 'العِشَاء',
        time: calculatedTimes.isha,
        timeDate: this.parseTimeToDate(calculatedTimes.isha, baseYear, baseMonth, baseDay, off),
        isCurrent: false,
        isNext: false,
      }
    };

    // Déterminer la prière actuelle et la suivante
    const now = new Date();
    const prayerArray = Object.values(times).filter((p) => p !== times.sunrise);

    let currentPrayer: PrayerTime | null = null;
    let nextPrayer: PrayerTime | null = null;

    // Trouver la prière actuelle (la dernière passée)
    for (let i = prayerArray.length - 1; i >= 0; i--) {
      if (now >= prayerArray[i].timeDate) {
        currentPrayer = prayerArray[i];
        currentPrayer.isCurrent = true;

        // La prière suivante est la prochaine dans la liste
        if (i < prayerArray.length - 1) {
          nextPrayer = prayerArray[i + 1];
        } else {
          // Si c'est Gué (Isha), la prochaine est Subha (Fajr) du lendemain
          const tomorrowFajr = solar(new Date(baseYear, baseMonth, baseDay + 1));
          nextPrayer = {
            ...times.fajr,
            time: tomorrowFajr.fajr,
            timeDate: this.parseTimeToDate(tomorrowFajr.fajr, baseYear, baseMonth, baseDay + 1, off)
          };
        }
        break;
      }
    }

    // Si aucune prière n'est passée, on est avant Subha (Fajr)
    if (!currentPrayer) {
      // Prière actuelle = Gué (Isha) d'hier
      const yesterdayIsha = solar(new Date(baseYear, baseMonth, baseDay - 1));
      currentPrayer = {
        ...times.isha,
        time: yesterdayIsha.isha,
        timeDate: this.parseTimeToDate(yesterdayIsha.isha, baseYear, baseMonth, baseDay - 1, off)
      };
      currentPrayer.isCurrent = true;

      // Prochaine = Subha (Fajr)
      nextPrayer = times.fajr;
    }

    if (nextPrayer) {
      nextPrayer.isNext = true;
    }

    return {
      ...times,
      currentPrayer,
      nextPrayer,
      date: date.toLocaleDateString('fr-FR')
    };
  }

  /**
   * Calcul des heures de prière basé sur la position solaire (méthode MWL).
   * Formules astronomiques standard (PrayTimes / NOAA) : déclinaison et
   * équation du temps calculées à partir de la date julienne.
   * Les heures renvoyées sont exprimées dans le fuseau du lieu (utcOffset).
   */
  private calculateSolarPrayerTimes(date: Date, location: Location, options?: PrayerCalcOptions, utcOffset = location.utcOffset ?? 0) {
    const opts = { ...DEFAULT_PRAYER_OPTIONS, ...options };
    const method = PRAYER_METHODS.find((m) => m.id === opts.method) ?? PRAYER_METHODS[0];
    const fajrAngle = method.id === 'custom' ? opts.customFajrAngle : method.fajrAngle;
    const ishaAngle = method.id === 'custom' ? opts.customIshaAngle : method.ishaAngle;
    const shadow = opts.asrSchool === 'hanafi' ? 2 : 1;
    const { latitude: lat, longitude: lon } = location;
    const d2r = Math.PI / 180;
    const r2d = 180 / Math.PI;
    const fix = (a: number, b: number) => {
      const r = a - b * Math.floor(a / b);
      return r < 0 ? r + b : r;
    };

    // Position du soleil à midi UTC
    const jd = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) / 86400000 + 2440587.5;
    const D = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * D, 360);
    const q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * Math.sin(g * d2r) + 0.02 * Math.sin(2 * g * d2r), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = fix((Math.atan2(Math.cos(e * d2r) * Math.sin(L * d2r), Math.cos(L * d2r)) * r2d) / 15, 24);
    const decl = Math.asin(Math.sin(e * d2r) * Math.sin(L * d2r)) * r2d;
    let eqt = q / 15 - RA;
    eqt -= 24 * Math.round(eqt / 24);

    const noon = 12 - lon / 15 - eqt; // heure UTC du midi solaire

    // Durée (h) entre le midi solaire et l'instant où le soleil est à `angle`° sous l'horizon
    const T = (angle: number) =>
      (Math.acos(
        (-Math.sin(angle * d2r) - Math.sin(decl * d2r) * Math.sin(lat * d2r)) /
          (Math.cos(decl * d2r) * Math.cos(lat * d2r))
      ) * r2d) / 15;

    // Asr : ombre = shadow × objet + ombre de midi (1 = malikite/chaféite, 2 = hanafite)
    const asrAngle = -Math.atan(1 / (shadow + Math.tan(Math.abs(lat - decl) * d2r))) * r2d;

    const sunrise = noon - T(0.833);
    const maghrib = noon + T(0.833);
    let fajr = noon - T(fajrAngle);
    let isha = method.ishaMinutes ? maghrib + method.ishaMinutes / 60 : noon + T(ishaAngle ?? 17);

    // Latitudes élevées (Europe du Nord, été) : le soleil ne descend pas assez sous l'horizon.
    // Règle « angle/60 de la nuit » (PrayTimes) : Fajr et Isha ne s'éloignent pas plus
    // du lever / coucher que cette fraction de la nuit.
    const night = sunrise + 24 - maghrib;
    const fajrMax = (fajrAngle / 60) * night;
    if (!Number.isFinite(fajr) || sunrise - fajr > fajrMax) fajr = sunrise - fajrMax;
    if (!method.ishaMinutes) {
      const ishaMax = ((ishaAngle ?? 17) / 60) * night;
      if (!Number.isFinite(isha) || isha - maghrib > ishaMax) isha = maghrib + ishaMax;
    }

    const raw: Record<TimeKey, number> = { fajr, sunrise, dhuhr: noon, asr: noon + T(asrAngle), maghrib, isha };

    // Heure locale + ajustement manuel (minutes)
    const out = {} as Record<TimeKey, string>;
    for (const k of Object.keys(raw) as TimeKey[]) {
      out[k] = this.formatTimeDecimal(raw[k] + utcOffset + (opts.offsets?.[k] ?? 0) / 60);
    }
    return out;
  }

  /**
   * Convertit une heure décimale en format HH:MM (arrondi à la minute, sans « 12:60 »)
   */
  private formatTimeDecimal(timeDecimal: number): string {
    const totalMinutes = ((Math.round(timeDecimal * 60) % 1440) + 1440) % 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Obtient le jour de l'année (1-365)
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Parse une heure string vers un objet Date
   */
  private parseTimeToDate(
    timeString: string,
    year: number,
    month: number,
    day: number,
    utcOffset: number = this.defaultLocation.utcOffset ?? 0
  ): Date {
    // Instant absolu : l'heure affichée est celle du lieu, quel que soit le fuseau du téléphone
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(Date.UTC(year, month, day, hours, minutes) - utcOffset * 3600000);
  }

  /**
   * Met à jour les heures de prière en temps réel
   */
  getCurrentPrayerStatus(): { current: PrayerTime | null; next: PrayerTime | null } {
    const dailyTimes = this.calculatePrayerTimes();
    return {
      current: dailyTimes.currentPrayer,
      next: dailyTimes.nextPrayer
    };
  }

  /**
   * Calcule le temps restant jusqu'à la prochaine prière
   */
  getTimeUntilNextPrayer(): { hours: number; minutes: number; seconds: number } {
    const { next } = this.getCurrentPrayerStatus();

    if (!next) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }

    const now = new Date();
    const diff = next.timeDate.getTime() - now.getTime();

    if (diff < 0) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }

  /**
   * Formate l'heure pour affichage
   */
  formatTime(time: string | Date, is24Hour: boolean = false): string {
    let date: Date;

    if (typeof time === 'string') {
      const [hours, minutes] = time.split(':').map(Number);
      date = new Date();
      date.setHours(hours, minutes, 0, 0);
    } else {
      date = time;
    }

    if (is24Hour) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  /**
   * Obtient le nom de la ville basé sur la localisation
   */
  getCityName(location?: Location): string {
    const loc = location || this.defaultLocation;

    // Base de données simple pour les villes principales
    const cities = [
      { name: 'Dakar', lat: 14.6928, lon: -17.4467, radius: 0.5 },
      { name: 'Casablanca', lat: 33.5731, lon: -7.5898, radius: 0.5 },
      { name: 'Tunis', lat: 36.8065, lon: 10.1815, radius: 0.5 },
      { name: 'Cairo', lat: 30.0444, lon: 31.2357, radius: 0.5 },
      { name: 'Mecca', lat: 21.3891, lon: 39.8579, radius: 0.5 },
      { name: 'Medina', lat: 24.5247, lon: 39.5692, radius: 0.5 },
      { name: 'Paris', lat: 48.8566, lon: 2.3522, radius: 0.5 },
    ];

    for (const city of cities) {
      const distance = this.calculateDistance(
        loc.latitude, loc.longitude,
        city.lat, city.lon
      );

      if (distance <= city.radius) {
        return city.name;
      }
    }

    return 'Localisation actuelle';
  }

  /**
   * Calcule la distance entre deux points (formule de haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Vérifie si c'est l'heure de prière
   */
  isPrayerTime(): boolean {
    const now = new Date();
    const dailyTimes = this.calculatePrayerTimes();
    const prayers = Object.values(dailyTimes).filter(p => p.timeDate);

    for (const prayer of prayers) {
      const prayerTime = prayer.timeDate;
      const diff = Math.abs(now.getTime() - prayerTime.getTime());

      // Si on est à moins de 2 minutes de l'heure de prière
      if (diff <= 2 * 60 * 1000) {
        return true;
      }
    }

    return false;
  }

  /**
   * Obtient des notifications de prière
   */
  getPrayerNotifications(): {
    shouldNotify: boolean;
    message: string;
    prayerName: string;
  } {
    const { current, next } = this.getCurrentPrayerStatus();
    const timeUntil = this.getTimeUntilNextPrayer();

    // Notification 10 minutes avant la prière
    if (timeUntil.hours === 0 && timeUntil.minutes === 10) {
      return {
        shouldNotify: true,
        message: `${next?.name} dans 10 minutes`,
        prayerName: next?.name || ''
      };
    }

    // Notification à l'heure de prière
    if (this.isPrayerTime()) {
      return {
        shouldNotify: true,
        message: `C'est l'heure de ${current?.name}`,
        prayerName: current?.name || ''
      };
    }

    return {
      shouldNotify: false,
      message: '',
      prayerName: ''
    };
  }
}

export const prayerTimesService = new PrayerTimesService();