import { Surah, Verse, Tafsir } from '../stores/quranStore';
import { CacheService, CACHE_KEYS } from './cacheService';
import { API_CONFIG } from '../config/api';

import { withSurahNames } from '@/utils/surahNames';
import { offlineReader, saveTextLocally } from '@/services/offlineService';
import { quranPublicApi } from '@/services/quranPublicApi';

const fixVerse = (v: Verse): Verse => (v?.surah ? { ...v, surah: withSurahNames(v.surah) } : v);
const fixSurah = <T extends Surah & { verses?: Verse[] }>(s: T): T => {
  const fixed = withSurahNames(s);
  return fixed?.verses ? { ...fixed, verses: fixed.verses.map(fixVerse) } : fixed;
};

const API_BASE_URL = API_CONFIG.BACKEND_URL;
const BACKEND_TIMEOUT_MS = 6000;
let backendDownUntil = 0;

/**
 * Backend d'abord, puis Quran.com (l'app marche partout), puis les fichiers
 * enregistrés sur le téléphone (hors ligne).
 */
async function withFallback<T>(primary: () => Promise<T>, publicSource: () => Promise<T>, offline: () => T | null): Promise<T> {
  try {
    return await primary();
  } catch (backendError) {
    try {
      return await publicSource();
    } catch {
      const local = offline();
      if (local) return local;
      throw backendError;
    }
  }
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class QuranApiService {
  private async fetchApi<T>(endpoint: string, cacheKey?: string, cacheExpiry?: number): Promise<T> {
    // Vérifier d'abord le cache si une clé est fournie
    if (cacheKey) {
      const cachedData = await CacheService.get<T>(cacheKey);
      if (cachedData) {
        console.log(`Données récupérées du cache: ${cacheKey}`);
        return cachedData;
      }
    }

    // Vérifier la connectivité
    const isOnline = await CacheService.isOnline();
    if (!isOnline && cacheKey) {
      // Si hors ligne et pas de cache, essayer de récupérer une version expirée
      const expiredData = await CacheService.get<T>(cacheKey);
      if (expiredData) {
        console.log(`Utilisation du cache expiré en mode hors ligne: ${cacheKey}`);
        return expiredData;
      }
      throw new Error('Aucune donnée disponible en mode hors ligne');
    }

    // Backend injoignable récemment : on ne le réessaie pas avant 5 min
    if (Date.now() < backendDownUntil) throw new Error('Backend indisponible');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, { signal: controller.signal });
      } catch (networkError) {
        backendDownUntil = Date.now() + 5 * 60_000;
        throw networkError;
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const textResponse = await response.text();
      let result: ApiResponse<T>;

      try {
        // Nettoyage robuste pour éviter les erreurs JSON
        let cleanedText = textResponse
          // Supprimer tous les caractères de contrôle et invisibles
          .replace(/[\u0000-\u001F\u007F-\u009F\uFEFF\uFFFE\uFFFF]/g, '')
          // Supprimer les séquences unicode malformées
          .replace(/\\u[\dA-Fa-f]{0,3}(?![0-9A-Fa-f])/g, '')
          // Nettoyer les caractères NUL
          .replace(/\0/g, '')
          .replace(/\x00/g, '');

        // Convertir les séquences unicode valides
        cleanedText = cleanedText.replace(/\\u([\dA-Fa-f]{4})/g, function(match, grp) {
          try {
            return String.fromCharCode(parseInt(grp, 16));
          } catch (e) {
            return ''; // Supprimer si conversion échoue
          }
        });

        // Vérifier que le texte est un JSON valide
        cleanedText = cleanedText.trim();
        if (!cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
          // Chercher le début du JSON dans la réponse
          const jsonStart = cleanedText.search(/[{\[]/);
          if (jsonStart > 0) {
            cleanedText = cleanedText.substring(jsonStart);
            console.log('Found JSON start at position:', jsonStart);
          } else {
            throw new Error('No valid JSON structure found in response');
          }
        }

        result = JSON.parse(cleanedText);
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError);
        console.error('Response length:', textResponse.length);
        console.error('First 300 chars:', textResponse.substring(0, 300));

        // En cas d'erreur JSON, vider le cache pour cette clé
        if (cacheKey) {
          console.log('Clearing corrupted cache for key:', cacheKey);
          await CacheService.remove(cacheKey);
        }

        throw new Error(`JSON Parse error: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
      }

      if (!result.success) {
        throw new Error(result.message || 'API request failed');
      }

      // Mettre en cache la réponse si une clé est fournie
      if (cacheKey) {
        await CacheService.set(cacheKey, result.data, cacheExpiry);
        console.log(`Données mises en cache: ${cacheKey}`);
      }

      return result.data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);

      // En cas d'erreur réseau, essayer le cache même expiré
      if (cacheKey) {
        const fallbackData = await CacheService.get<T>(cacheKey);
        if (fallbackData) {
          console.log(`Utilisation du cache de secours: ${cacheKey}`);
          return fallbackData;
        }
      }

      throw error;
    }
  }

  async getSurahs(): Promise<Surah[]> {
    const list = await withFallback(
      () => this.fetchApi<Surah[]>('/surahs', CACHE_KEYS.SURAHS, 7 * 24 * 60 * 60 * 1000), // Cache 7 jours
      async () => {
        const fresh = await quranPublicApi.surahs();
        await CacheService.set(CACHE_KEYS.SURAHS, fresh, 7 * 24 * 60 * 60 * 1000);
        return fresh;
      },
      () => offlineReader.surahs()
    );
    const named = list.map(withSurahNames);
    saveTextLocally('list', named);
    return named;
  }

  async getSurah(id: number): Promise<Surah & { verses: Verse[] }> {
    const surah = fixSurah(
      await withFallback(
        () => this.fetchApi<Surah & { verses: Verse[] }>(`/surahs/${id}`, CACHE_KEYS.VERSES(id)),
        async () => {
          const [info, verses] = await Promise.all([quranPublicApi.surah(id), quranPublicApi.verses(id)]);
          return { ...info, verses };
        },
        () => {
          const verses = offlineReader.verses(id);
          const info = offlineReader.surahs()?.find((x) => x.number === id || x.id === id);
          return verses?.length && info ? { ...info, verses } : null;
        }
      )
    );
    if (surah?.verses?.length) saveTextLocally(surah.number ?? id, surah.verses);
    return surah;
  }

  async getSurahByNumber(number: number): Promise<Surah & { verses: Verse[] }> {
    return this.getSurah(number);
  }

  async getVersesBySurah(surahId: number): Promise<Verse[]> {
    const verses = (
      await withFallback(
        () => this.fetchApi<Verse[]>(`/verses/surah/${surahId}`, CACHE_KEYS.VERSES_LIST(surahId)),
        async () => {
          const fresh = await quranPublicApi.verses(surahId);
          await CacheService.set(CACHE_KEYS.VERSES_LIST(surahId), fresh);
          return fresh;
        },
        () => offlineReader.verses(surahId)
      )
    ).map(fixVerse);
    if (verses.length) saveTextLocally(surahId, verses);
    return verses;
  }

  async getVerse(id: number): Promise<Verse> {
    return fixVerse(
      await withFallback(
        () => this.fetchApi<Verse>(`/verses/${id}`, `verse_${id}`),
        () => quranPublicApi.verseByGlobal(id),
        () => null
      )
    );
  }

  async getVerseByGlobalNumber(globalNumber: number): Promise<Verse> {
    return fixVerse(
      await withFallback(
        () => this.fetchApi<Verse>(`/verses/global/${globalNumber}`, `verse_global_${globalNumber}`),
        () => quranPublicApi.verseByGlobal(globalNumber),
        () => null
      )
    );
  }

  async searchSurahs(query: string): Promise<Surah[]> {
    const searchKey = CACHE_KEYS.SEARCH_RESULTS(`surahs_${query}`);
    const list = await this.fetchApi<Surah[]>(`/surahs/search?q=${encodeURIComponent(query)}`, searchKey, 60 * 60 * 1000); // Cache 1 heure
    return list.map(withSurahNames);
  }

  async searchVerses(query: string, page: number = 1): Promise<{
    data: Verse[];
    current_page: number;
    last_page: number;
    total: number;
  }> {
    const searchKey = CACHE_KEYS.SEARCH_RESULTS(`verses_${query}_p${page}`);
    return this.fetchApi(`/verses/search?q=${encodeURIComponent(query)}&page=${page}`, searchKey, 60 * 60 * 1000);
  }

  async getTafsirsForSurah(surahId: number): Promise<Tafsir[]> {
    return this.fetchApi<Tafsir[]>(`/tafsirs/surah/${surahId}`, CACHE_KEYS.TAFSIR_BY_SURAH(surahId));
  }

  async getTafsir(id: number): Promise<Tafsir> {
    return this.fetchApi<Tafsir>(`/tafsirs/${id}`, `tafsir_${id}`);
  }

  async clearCache(): Promise<void> {
    await CacheService.clear();
  }

  async forceClearCache(): Promise<void> {
    await CacheService.forceClear();
  }

  async getCacheInfo(): Promise<{
    itemCount: number;
    sizeInBytes: number;
    sizeInMB: string;
  }> {
    return CacheService.getCacheInfo();
  }

  async isOnline(): Promise<boolean> {
    return CacheService.isOnline();
  }
}

export const quranApi = new QuranApiService();