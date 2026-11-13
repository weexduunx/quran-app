/**
 * Lieux utilisés pour le calcul des heures de prière.
 * - liste intégrée (hors ligne) : Sénégal en premier, puis grandes villes du monde
 * - recherche en ligne (n'importe quelle ville) et position GPS : voir services/placeService.ts
 *
 * Le fuseau IANA (`timezone`) donne l'heure locale exacte, heure d'été comprise.
 * `utcOffset` n'est qu'une valeur de secours si le téléphone ne sait pas convertir le fuseau.
 */
export interface Place {
  name: string;
  /** Région / pays affiché sous le nom */
  country: string;
  /** Code ISO à 2 lettres (SN, FR, ES…) */
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffset: number;
  source?: 'list' | 'search' | 'gps';
}

/** Compatibilité avec l'ancien nom */
export type City = Place;

const P = (countryCode: string, country: string, timezone: string, utcOffset: number) =>
  (name: string, latitude: number, longitude: number): Place => ({
    name,
    country,
    countryCode,
    latitude,
    longitude,
    timezone,
    utcOffset,
    source: 'list',
  });

const SN = P('SN', 'Sénégal', 'Africa/Dakar', 0);
const FR = P('FR', 'France', 'Europe/Paris', 1);
const ES = P('ES', 'Espagne', 'Europe/Madrid', 1);
const IT = P('IT', 'Italie', 'Europe/Rome', 1);
const BE = P('BE', 'Belgique', 'Europe/Brussels', 1);

export const SENEGAL_CITIES: Place[] = [
  SN('Dakar', 14.6928, -17.4467),
  SN('Touba', 14.85, -15.8833),
  SN('Thiès', 14.791, -16.9359),
  SN('Tivaouane', 14.95, -16.8167),
  SN('Kaolack', 14.1652, -16.0726),
  SN('Saint-Louis', 16.0326, -16.4818),
  SN('Mbour', 14.4198, -16.9693),
  SN('Diourbel', 14.655, -16.2314),
  SN('Louga', 15.6144, -16.2286),
  SN('Fatick', 14.339, -16.4111),
  SN('Kaffrine', 14.1059, -15.5508),
  SN('Ziguinchor', 12.5833, -16.2719),
  SN('Kolda', 12.8939, -14.9414),
  SN('Sédhiou', 12.7081, -15.5569),
  SN('Tambacounda', 13.7707, -13.6673),
  SN('Kédougou', 12.5556, -12.1744),
  SN('Matam', 15.6559, -13.2554),
];

export const WORLD_CITIES: Place[] = [
  // Afrique
  P('GM', 'Gambie', 'Africa/Banjul', 0)('Banjul', 13.4549, -16.579),
  P('MR', 'Mauritanie', 'Africa/Nouakchott', 0)('Nouakchott', 18.0735, -15.9582),
  P('ML', 'Mali', 'Africa/Bamako', 0)('Bamako', 12.6392, -8.0029),
  P('GN', 'Guinée', 'Africa/Conakry', 0)('Conakry', 9.6412, -13.5784),
  P('GW', 'Guinée-Bissau', 'Africa/Bissau', 0)('Bissau', 11.8817, -15.617),
  P('CI', 'Côte d’Ivoire', 'Africa/Abidjan', 0)('Abidjan', 5.36, -4.0083),
  P('BF', 'Burkina Faso', 'Africa/Ouagadougou', 0)('Ouagadougou', 12.3714, -1.5197),
  P('NE', 'Niger', 'Africa/Niamey', 1)('Niamey', 13.5116, 2.1254),
  P('NG', 'Nigeria', 'Africa/Lagos', 1)('Lagos', 6.5244, 3.3792),
  P('CM', 'Cameroun', 'Africa/Douala', 1)('Douala', 4.0511, 9.7679),
  P('GA', 'Gabon', 'Africa/Libreville', 1)('Libreville', 0.4162, 9.4673),
  P('MA', 'Maroc', 'Africa/Casablanca', 1)('Casablanca', 33.5731, -7.5898),
  P('MA', 'Maroc', 'Africa/Casablanca', 1)('Rabat', 34.0209, -6.8416),
  P('DZ', 'Algérie', 'Africa/Algiers', 1)('Alger', 36.7538, 3.0588),
  P('TN', 'Tunisie', 'Africa/Tunis', 1)('Tunis', 36.8065, 10.1815),
  P('EG', 'Égypte', 'Africa/Cairo', 2)('Le Caire', 30.0444, 31.2357),
  // Europe
  FR('Paris', 48.8566, 2.3522),
  FR('Marseille', 43.2965, 5.3698),
  FR('Lyon', 45.764, 4.8357),
  FR('Toulouse', 43.6047, 1.4442),
  FR('Lille', 50.6292, 3.0573),
  FR('Bordeaux', 44.8378, -0.5792),
  FR('Nantes', 47.2184, -1.5536),
  FR('Strasbourg', 48.5734, 7.7521),
  FR('Nice', 43.7102, 7.262),
  FR('Montpellier', 43.6108, 3.8767),
  ES('Madrid', 40.4168, -3.7038),
  ES('Barcelone', 41.3874, 2.1686),
  ES('Valence', 39.4699, -0.3763),
  ES('Séville', 37.3891, -5.9845),
  ES('Malaga', 36.7213, -4.4214),
  ES('Saragosse', 41.6488, -0.8891),
  ES('Bilbao', 43.263, -2.935),
  IT('Rome', 41.9028, 12.4964),
  IT('Milan', 45.4642, 9.19),
  IT('Turin', 45.0703, 7.6869),
  BE('Bruxelles', 50.8503, 4.3517),
  BE('Liège', 50.6326, 5.5797),
  P('CH', 'Suisse', 'Europe/Zurich', 1)('Genève', 46.2044, 6.1432),
  P('DE', 'Allemagne', 'Europe/Berlin', 1)('Berlin', 52.52, 13.405),
  P('NL', 'Pays-Bas', 'Europe/Amsterdam', 1)('Amsterdam', 52.3676, 4.9041),
  P('PT', 'Portugal', 'Europe/Lisbon', 0)('Lisbonne', 38.7223, -9.1393),
  P('GB', 'Royaume-Uni', 'Europe/London', 0)('Londres', 51.5074, -0.1278),
  P('TR', 'Turquie', 'Europe/Istanbul', 3)('Istanbul', 41.0082, 28.9784),
  // Amérique
  P('US', 'États-Unis', 'America/New_York', -5)('New York', 40.7128, -74.006),
  P('US', 'États-Unis', 'America/New_York', -5)('Washington', 38.9072, -77.0369),
  P('CA', 'Canada', 'America/Toronto', -5)('Montréal', 45.5019, -73.5674),
  P('CA', 'Canada', 'America/Toronto', -5)('Toronto', 43.6532, -79.3832),
  // Moyen-Orient
  P('SA', 'Arabie saoudite', 'Asia/Riyadh', 3)('La Mecque', 21.3891, 39.8579),
  P('SA', 'Arabie saoudite', 'Asia/Riyadh', 3)('Médine', 24.5247, 39.5692),
  P('AE', 'Émirats arabes unis', 'Asia/Dubai', 4)('Dubaï', 25.2048, 55.2708),
];

export const CITIES: Place[] = [...SENEGAL_CITIES, ...WORLD_CITIES];

/** Ancien réglage (nom seul) → lieu complet ; Dakar par défaut */
export const findCity = (name?: string) => CITIES.find((c) => c.name === name) ?? CITIES[0];

export const DEFAULT_PLACE: Place = CITIES[0];

/** Libellé court : « Dakar » au Sénégal, « Madrid, Espagne » ailleurs */
export const placeLabel = (p: Place) => (p.countryCode === 'SN' || !p.country ? p.name : `${p.name}, ${p.country}`);

export const samePlace = (a: Place, b: Place) =>
  Math.abs(a.latitude - b.latitude) < 0.001 && Math.abs(a.longitude - b.longitude) < 0.001;

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Filtre la liste intégrée (sans accent, sur la ville ou le pays) */
export const searchBuiltInPlaces = (query: string) => {
  const q = fold(query.trim());
  if (!q) return CITIES;
  return CITIES.filter((c) => fold(c.name).includes(q) || fold(c.country).includes(q));
};

// ---------------------------------------------------------------------------
// Fuseau horaire : décalage UTC (heures) d'un fuseau IANA à une date donnée
// ---------------------------------------------------------------------------
const formatters = new Map<string, Intl.DateTimeFormat>();

export function utcOffsetFor(timezone: string | undefined, date: Date, fallback = 0): number {
  if (!timezone) return fallback;
  try {
    let f = formatters.get(timezone);
    if (!f) {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      formatters.set(timezone, f);
    }
    // Midi UTC du jour demandé, lu dans le fuseau du lieu
    const ref = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
    const parts: Record<string, number> = {};
    for (const p of f.formatToParts(ref)) if (p.type !== 'literal') parts[p.type] = Number(p.value);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute);
    const offset = Math.round(((asUtc - ref.getTime()) / 3600000) * 4) / 4; // au quart d'heure
    return Number.isFinite(offset) && Math.abs(offset) <= 14 ? offset : fallback;
  } catch {
    // Fuseau inconnu du téléphone : si c'est celui de l'appareil, on le connaît quand même
    return timezone === deviceTimezone() ? -date.getTimezoneOffset() / 60 : fallback;
  }
}

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
