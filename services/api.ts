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