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
}

class PrayerTimesService {
  private defaultLocation: Location = {
    latitude: 14.6928, // Dakar, Sénégal
    longitude: -17.4467,
    timezone: 'Africa/Dakar'
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
    const prayerArray = Object.values(times);

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
   * Calcul des heures de prière basé sur la position solaire (méthode MWL)
   */
  private calculateSolarPrayerTimes(date: Date, location: Location) {
    const { latitude, longitude } = location;

    // Calcul du jour de l'année
    const dayOfYear = this.getDayOfYear(date);

    // Déclinaison solaire
    const declination = 23.45 * Math.sin(Math.PI * (284 + dayOfYear) / 365 * Math.PI / 180);

    // Équation du temps (approximation simple)
    const equationOfTime = 4 * (longitude - 15 * 0); // GMT offset pour Dakar

    // Calcul des heures
    const latRad = latitude * Math.PI / 180;
    const declRad = declination * Math.PI / 180;

    // Midi solaire
    const solarNoon = 12 - equationOfTime / 60;

    // Sunrise/Maghrib (angle -0.833° pour la réfraction)
    const sunriseAngle = -0.833;
    const timeCorrection = Math.acos(-Math.tan(latRad) * Math.tan(declRad) +
                                     Math.sin(sunriseAngle * Math.PI / 180) /
                                     (Math.cos(latRad) * Math.cos(declRad))) * 12 / Math.PI;

    const sunrise = solarNoon - timeCorrection;
    const maghrib = solarNoon + timeCorrection;

    // Fajr (MWL: -18°)
    const fajrAngle = -18;
    const fajrCorrection = Math.acos(-Math.tan(latRad) * Math.tan(declRad) +
                                     Math.sin(fajrAngle * Math.PI / 180) /
                                     (Math.cos(latRad) * Math.cos(declRad))) * 12 / Math.PI;
    const fajr = solarNoon - fajrCorrection;

    // Isha (MWL: -17°)
    const ishaAngle = -17;
    const ishaCorrection = Math.acos(-Math.tan(latRad) * Math.tan(declRad) +
                                     Math.sin(ishaAngle * Math.PI / 180) /
                                     (Math.cos(latRad) * Math.cos(declRad))) * 12 / Math.PI;
    const isha = solarNoon + ishaCorrection;

    // Asr (Shafi: longueur d'ombre = longueur objet + longueur d'ombre à midi)
    const asrAngle = Math.atan(1 + Math.tan(Math.abs(latRad - declRad))) * 180 / Math.PI;
    const asrCorrection = Math.acos((Math.sin(asrAngle * Math.PI / 180) -
                                     Math.sin(latRad) * Math.sin(declRad)) /
                                     (Math.cos(latRad) * Math.cos(declRad))) * 12 / Math.PI;
    const asr = solarNoon + asrCorrection;

    return {
      fajr: this.formatTimeDecimal(fajr),
      sunrise: this.formatTimeDecimal(sunrise),
      dhuhr: this.formatTimeDecimal(solarNoon),
      asr: this.formatTimeDecimal(asr),
      maghrib: this.formatTimeDecimal(maghrib),
      isha: this.formatTimeDecimal(isha)
    };
  }

  /**
   * Convertit une heure décimale en format HH:MM
   */
  private formatTimeDecimal(timeDecimal: number): string {
    const hours = Math.floor(timeDecimal);
    const minutes = Math.round((timeDecimal - hours) * 60);
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
  private parseTimeToDate(timeString: string, year: number, month: number, day: number): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(year, month, day, hours, minutes);
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