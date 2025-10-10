import { Surah, Verse, Tafsir } from '../stores/quranStore';
import { CacheService, CACHE_KEYS } from './cacheService';

const API_BASE_URL = 'http://192.168.1.47:8000/api/v1';

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

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<T> = await response.json();

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
    return this.fetchApi<Surah[]>('/surahs', CACHE_KEYS.SURAHS, 7 * 24 * 60 * 60 * 1000); // Cache 7 jours
  }

  async getSurah(id: number): Promise<Surah & { verses: Verse[] }> {
    return this.fetchApi<Surah & { verses: Verse[] }>(`/surahs/${id}`, CACHE_KEYS.VERSES(id));
  }

  async getSurahByNumber(number: number): Promise<Surah & { verses: Verse[] }> {
    return this.fetchApi<Surah & { verses: Verse[] }>(`/surahs/number/${number}`, `surah_number_${number}`);
  }

  async getVersesBySurah(surahId: number): Promise<Verse[]> {
    return this.fetchApi<Verse[]>(`/verses/surah/${surahId}`, CACHE_KEYS.VERSES(surahId));
  }

  async getVerse(id: number): Promise<Verse> {
    return this.fetchApi<Verse>(`/verses/${id}`, `verse_${id}`);
  }

  async getVerseByGlobalNumber(globalNumber: number): Promise<Verse> {
    return this.fetchApi<Verse>(`/verses/global/${globalNumber}`, `verse_global_${globalNumber}`);
  }

  async searchSurahs(query: string): Promise<Surah[]> {
    const searchKey = CACHE_KEYS.SEARCH_RESULTS(`surahs_${query}`);
    return this.fetchApi<Surah[]>(`/surahs/search?q=${encodeURIComponent(query)}`, searchKey, 60 * 60 * 1000); // Cache 1 heure
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