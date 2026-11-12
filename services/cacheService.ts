import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry?: number;
}

/** Préfixes des clés de cache (jamais les stores utilisateur) */
export const CACHE_KEY_PREFIXES = ['quran_cache_', 'simple_sync_', 'word_sync_'];

export class CacheService {
  private static readonly CACHE_PREFIX = 'quran_cache_';
  private static readonly DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 heures

  static async set<T>(key: string, data: T, expiry?: number): Promise<void> {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: expiry || this.DEFAULT_EXPIRY,
      };

      // Vérifier que les données peuvent être sérialisées en JSON
      let serializedData: string;
      try {
        serializedData = JSON.stringify(cacheItem);
      } catch (jsonError) {
        console.error('Impossible de sérialiser les données pour le cache:', jsonError);
        return;
      }

      await AsyncStorage.setItem(
        this.CACHE_PREFIX + key,
        serializedData
      );
    } catch (error) {
      console.error('Erreur lors de la mise en cache:', error);
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) return null;

      let cacheItem: CacheItem<T>;
      try {
        cacheItem = JSON.parse(cached);
      } catch (jsonError) {
        console.error('Cache JSON parse error for key:', key, jsonError);
        // Supprimer le cache corrompu
        await this.remove(key);
        return null;
      }

      // Vérifier si le cache est expiré
      if (cacheItem.expiry && Date.now() - cacheItem.timestamp > cacheItem.expiry) {
        await this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Erreur lors de la lecture du cache:', error);
      // En cas d'erreur, supprimer la clé potentiellement corrompue
      try {
        await this.remove(key);
      } catch (removeError) {
        console.error('Erreur lors de la suppression du cache corrompu:', removeError);
      }
      return null;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_PREFIX + key);
    } catch (error) {
      console.error('Erreur lors de la suppression du cache:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache:', error);
    }
  }

  /**
   * Vidage d'urgence en cas de corruption.
   * Ne supprime QUE les données de cache : les favoris, la progression de
   * lecture et les réglages (stores persistés) sont conservés.
   */
  static async forceClear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => CACHE_KEY_PREFIXES.some((p) => key.startsWith(p)));
      if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Erreur lors du nettoyage forcé du cache:', error);
    }
  }

  static async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    // isInternetReachable vaut null tant que NetInfo n'a pas testé : on considère alors en ligne
    return netInfo.isConnected !== false && netInfo.isInternetReachable !== false;
  }

  static async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      let totalSize = 0;

      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          totalSize += new Blob([item]).size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Erreur lors du calcul de la taille du cache:', error);
      return 0;
    }
  }

  static async getCacheInfo(): Promise<{
    itemCount: number;
    sizeInBytes: number;
    sizeInMB: string;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      const sizeInBytes = await this.getCacheSize();

      return {
        itemCount: cacheKeys.length,
        sizeInBytes,
        sizeInMB: (sizeInBytes / (1024 * 1024)).toFixed(2),
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des infos du cache:', error);
      return { itemCount: 0, sizeInBytes: 0, sizeInMB: '0.00' };
    }
  }
}

export const CACHE_KEYS = {
  SURAHS: 'surahs',
  // Utilisé par quranApi.getSurah() : cache un objet Surah & { verses: Verse[] }
  VERSES: (surahId: number) => `verses_${surahId}`,
  // Utilisé par quranApi.getVersesBySurah() : cache un tableau Verse[] brut.
  // Distinct de VERSES ci-dessus (même surahId, formes de données différentes) -
  // partager la même clé provoquait un TypeError ("verses.find is not a function")
  // quand l'un était lu après avoir été peuplé par l'autre.
  VERSES_LIST: (surahId: number) => `verses_list_${surahId}`,
  TAFSIRS: 'tafsirs',
  TAFSIR_BY_SURAH: (surahId: number) => `tafsir_surah_${surahId}`,
  USER_FAVORITES: 'user_favorites',
  SEARCH_RESULTS: (query: string) => `search_${query}`,
  AUDIO_METADATA: (tafsirId: number) => `audio_meta_${tafsirId}`,
};