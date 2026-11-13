/**
 * Trouver le lieu exact de l'utilisateur, partout dans le monde :
 * - position GPS du téléphone (le fuseau est celui du téléphone)
 * - recherche de ville en ligne (Open-Meteo, gratuit, sans clé ; renvoie le fuseau IANA)
 */
import * as Location from 'expo-location';

import { deviceTimezone, utcOffsetFor, type Place } from '@/utils/cities';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  country_code?: string;
  admin1?: string;
}

export type GpsError = 'denied' | 'unavailable';

export const placeService = {
  /** Recherche de villes du monde entier (au moins 2 lettres) */
  async search(query: string, signal?: AbortSignal): Promise<Place[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const url = `${GEOCODING_URL}?name=${encodeURIComponent(q)}&count=15&language=fr&format=json`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Recherche indisponible (${res.status})`);
    const json = (await res.json()) as { results?: GeoResult[] };
    const now = new Date();
    return (json.results ?? [])
      .filter((r) => r.timezone)
      .map((r) => ({
        name: r.name,
        country: [r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(', '),
        countryCode: (r.country_code ?? '').toUpperCase(),
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone!,
        utcOffset: utcOffsetFor(r.timezone, now, 0),
        source: 'search' as const,
      }));
  },

  /** Position actuelle du téléphone, avec le nom de la ville si possible */
  async current(): Promise<Place | GpsError> {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return 'denied';
    try {
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const { latitude, longitude } = pos.coords;
      let name = 'Ma position';
      let country = '';
      let countryCode = '';
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          name = geo.city ?? geo.subregion ?? geo.district ?? geo.region ?? name;
          country = geo.country ?? '';
          countryCode = (geo.isoCountryCode ?? '').toUpperCase();
        }
      } catch {
        // Pas de nom de ville (hors ligne) : les coordonnées suffisent pour le calcul
      }
      const timezone = deviceTimezone();
      return {
        name,
        country,
        countryCode,
        latitude: Math.round(latitude * 10000) / 10000,
        longitude: Math.round(longitude * 10000) / 10000,
        timezone,
        utcOffset: -new Date().getTimezoneOffset() / 60,
        source: 'gps',
      };
    } catch {
      return 'unavailable';
    }
  },
};
