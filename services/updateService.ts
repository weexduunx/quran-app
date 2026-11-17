/**
 * Mise à jour de l'APK distribué hors store : le site publie la dernière version
 * (digitalspiritsn.com/applications/bayan/version.json) et l'app la compare
 * à son propre versionCode Android.
 */
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VERSION_URL = 'https://digitalspiritsn.com/applications/bayan/version.json';
const DISMISSED_KEY = 'update-dismissed-version-code';

export interface AvailableUpdate {
  version: string;
  versionCode: number;
  downloadUrl: string;
  pageUrl: string;
}

/** versionCode de l'APK installé (0 si inconnu) */
export const installedVersionCode = () => Number(Application.nativeBuildVersion) || 0;

export const updateService = {
  /** Renvoie la mise à jour proposée, ou null (à jour, déjà refusée, hors ligne, iOS…). */
  async check(): Promise<AvailableUpdate | null> {
    if (Platform.OS !== 'android') return null;
    const installed = installedVersionCode();
    if (!installed) return null;

    try {
      const res = await fetch(VERSION_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = (await res.json()) as { version?: string; version_code?: number; download_url?: string; page_url?: string };
      const latest = Number(data.version_code);
      if (!latest || latest <= installed || !data.download_url) return null;

      const dismissed = Number(await AsyncStorage.getItem(DISMISSED_KEY));
      if (dismissed >= latest) return null;

      return {
        version: String(data.version ?? ''),
        versionCode: latest,
        downloadUrl: data.download_url,
        pageUrl: data.page_url ?? data.download_url,
      };
    } catch {
      return null;
    }
  },

  /** « Plus tard » : on ne repropose que pour une version encore plus récente. */
  async dismiss(versionCode: number) {
    await AsyncStorage.setItem(DISMISSED_KEY, String(versionCode)).catch(() => {});
  },
};
