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

interface Location {
  latitude: number;
  longitude: number;
  timezone: string;
  /** Décalage UTC en heures du lieu (Dakar : 0) */
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
  calculatePrayerTimes(date: Date = new Date(), location?: Location): DailyPrayerTimes {
    const loc = location || this.defaultLocation;

    // Calcul basé sur la méthode MWL (Muslim World League)
    // Standard utilisé au Sénégal pour les horaires de prière officiels
    const baseYear = date.getFullYear();
    const baseMonth = date.getMonth();
    const baseDay = date.getDate();

    // Calcul des heures de prière selon la position solaire pour Dakar
    const calculatedTimes = this.calculateSolarPrayerTimes(date, loc);

    const times = {
      fajr: {
        name: 'Subha',
        nameArabic: 'الفَجْر',
        time: calculatedTimes.fajr,
        timeDate: this.parseTimeToDate(calculatedTimes.fajr, baseYear, baseMonth, baseDay),
        isCurrent: false,
        isNext: false,
      },
      sunrise: {
        name: 'Lever du soleil',
        nameArabic: 'الشُرُوق',
        time: calculatedTimes.sunrise,
        timeDate: this.parseTimeToDate(calculatedTimes.sunrise, baseYear, baseMonth, baseDay),
        isCurrent: false,
        isNext: false,
      },
      dhuhr: {
        name: 'Tisbar',
        nameArabic: 'الظُهر',
        time: calculatedTimes.dhuhr,
        timeDate: this.parseTimeToDate(calculatedTimes.dhuhr, baseYear, baseMonth, baseDay),
        isCurrent: false,
        isNext: false,
      },
      asr: {
        name: 'Takussan',
        nameArabic: 'العَصر',
        time: calculatedTimes.asr,
        timeDate: this.parseTimeToDate(calculatedTimes.asr, baseYear, baseMonth, baseDay),
        isCurrent: false,
        isNext: false,
      },
      maghrib: {
        name: 'Timis',
        nameArabic: 'المَغرِب',
        time: calculatedTimes.maghrib,
        timeDate: this.parseTimeToDate(calculatedTimes.maghrib, baseYear, baseMonth, baseDay),
        isCurrent: false,
        isNext: false,
      },
      isha: {
        name: 'Gué',
        nameArabic: 'العِشَاء',
        time: calculatedTimes.isha,
        timeDate: this.parseTimeToDate(calculatedTimes.isha, baseYear, baseMonth, baseDay),
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
          const tomorrowFajr = this.calculateSolarPrayerTimes(new Date(baseYear, baseMonth, baseDay + 1), loc);
          nextPrayer = {
            ...times.fajr,
            time: tomorrowFajr.fajr,
            timeDate: this.parseTimeToDate(tomorrowFajr.fajr, baseYear, baseMonth, baseDay + 1)
          };
        }
        break;
      }
    }

    // Si aucune prière n'est passée, on est avant Subha (Fajr)
    if (!currentPrayer) {
      // Prière actuelle = Gué (Isha) d'hier
      const yesterdayIsha = this.calculateSolarPrayerTimes(new Date(baseYear, baseMonth, baseDay - 1), loc);
      currentPrayer = {
        ...times.isha,
        time: yesterdayIsha.isha,
        timeDate: this.parseTimeToDate(yesterdayIsha.isha, baseYear, baseMonth, baseDay - 1)
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
  private calculateSolarPrayerTimes(date: Date, location: Location) {
    const { latitude: lat, longitude: lon } = location;
    const utcOffset = location.utcOffset ?? 0;
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

    // Asr (école malikite/chaféite : ombre = 1 × objet + ombre de midi)
    const asrAngle = -Math.atan(1 / (1 + Math.tan(Math.abs(lat - decl) * d2r))) * r2d;

    const local = (h: number) => h + utcOffset;

    return {
      fajr: this.formatTimeDecimal(local(noon - T(18))),
      sunrise: this.formatTimeDecimal(local(noon - T(0.833))),
      dhuhr: this.formatTimeDecimal(local(noon)),
      asr: this.formatTimeDecimal(local(noon + T(asrAngle))),
      maghrib: this.formatTimeDecimal(local(noon + T(0.833))),
      isha: this.formatTimeDecimal(local(noon + T(17))),
    };
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