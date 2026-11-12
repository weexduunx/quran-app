/**
 * Villes proposées pour le calcul des heures de prière.
 * Le Sénégal est à UTC+0 toute l'année (pas d'heure d'été).
 */
export interface City {
  name: string;
  latitude: number;
  longitude: number;
  utcOffset: number;
  timezone: string;
}

const SN = (name: string, latitude: number, longitude: number): City => ({
  name,
  latitude,
  longitude,
  utcOffset: 0,
  timezone: 'Africa/Dakar',
});

export const CITIES: City[] = [
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

export const findCity = (name?: string) => CITIES.find((c) => c.name === name) ?? CITIES[0];
