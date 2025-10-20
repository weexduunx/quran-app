/**
 * Service API pour la synchronisation mot par mot
 * Remplace la logique locale par des appels au backend Laravel
 */

import { API_CONFIG, buildApiUrl, getDefaultHeaders, handleApiError } from '@/config/api';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error_code?: string;
}

export interface WordTiming {
  word_index: number;
  arabic_text: string;
  start_time: number;
  end_time: number;
  duration: number;
  confidence: number;
  tajweed_info?: {
    type: 'prolongation' | 'pause' | 'emphasis' | 'normal';
    weight: number;
  };
}

export interface VerseTimingData {
  verse_id: number;
  global_number: number;
  reciter_code: string;
  total_duration: number;
  words: WordTiming[];
  source: 'quran_align' | 'estimated' | 'manual';
  accuracy: number;
  last_updated: string;
  metadata?: any;
}

export interface CurrentWordData {
  current_word_index: number;
  current_word: WordTiming | null;
  total_words: number;
  progress_percentage: number;
}

export interface ReciterProfile {
  id: number;
  code: string;
  name: string;
  average_speed: number;
  pause_multiplier: number;
  tajweed_style: 'minimal' | 'moderate' | 'extensive';
}

class WordSyncAPIService {
  private timingCache: Map<string, VerseTimingData> = new Map();

  constructor() {
    // Configuration depuis le fichier de config
  }

  /**
   * Récupère les données de timing pour un verset
   */
  async getVerseTimingData(
    globalNumber: number,
    reciterCode: string,
    arabicText: string,
    audioDuration: number
  ): Promise<VerseTimingData> {
    const cacheKey = `${globalNumber}-${reciterCode}`;

    // Vérifier le cache local
    if (this.timingCache.has(cacheKey)) {
      return this.timingCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WORD_SYNC.TIMING_DATA), {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({
          global_number: globalNumber,
          reciter_code: reciterCode,
          arabic_text: arabicText,
          audio_duration: audioDuration,
        }),
      });

      const result: APIResponse<VerseTimingData> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to fetch timing data');
      }

      // Mettre en cache
      this.timingCache.set(cacheKey, result.data);

      console.log(`✅ API SYNC: Loaded timing data for verse ${globalNumber} with reciter ${reciterCode}`);
      console.log(`📊 Source: ${result.data.source}, Accuracy: ${result.data.accuracy}`);

      return result.data;

    } catch (error) {
      console.error('❌ API SYNC: Error fetching timing data:', error);
      throw error;
    }
  }

  /**
   * Trouve le mot actuel basé sur le temps de lecture
   */
  async getCurrentWord(
    globalNumber: number,
    reciterCode: string,
    currentTime: number,
    arabicText: string,
    audioDuration: number
  ): Promise<CurrentWordData> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WORD_SYNC.CURRENT_WORD), {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({
          global_number: globalNumber,
          reciter_code: reciterCode,
          current_time: currentTime,
          arabic_text: arabicText,
          audio_duration: audioDuration,
        }),
      });

      const result: APIResponse<CurrentWordData> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to get current word');
      }

      return result.data;

    } catch (error) {
      console.error('❌ API SYNC: Error getting current word:', error);
      throw error;
    }
  }

  /**
   * Méthode locale pour trouver le mot actuel à partir des données existantes
   */
  findCurrentWordLocal(timingData: VerseTimingData, currentTime: number): number {
    const words = timingData.words;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (currentTime >= word.start_time && currentTime <= word.end_time) {
        return i;
      }
    }

    // Si aucun mot exact, trouver le plus proche
    for (let i = 0; i < words.length; i++) {
      if (words[i].start_time > currentTime) {
        return Math.max(0, i - 1);
      }
    }

    return words.length - 1;
  }

  /**
   * Récupère les profils de récitateurs disponibles
   */
  async getReciterProfiles(): Promise<ReciterProfile[]> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WORD_SYNC.RECITERS), {
        method: 'GET',
        headers: getDefaultHeaders(),
      });

      const result: APIResponse<ReciterProfile[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to fetch reciter profiles');
      }

      return result.data;

    } catch (error) {
      console.error('❌ API SYNC: Error fetching reciter profiles:', error);
      throw error;
    }
  }

  /**
   * Récupère un profil de récitateur spécifique
   */
  async getReciterProfile(code: string): Promise<ReciterProfile> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WORD_SYNC.RECITER_PROFILE + encodeURIComponent(code)), {
        method: 'GET',
        headers: getDefaultHeaders(),
      });

      const result: APIResponse<ReciterProfile> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to fetch reciter profile');
      }

      return result.data;

    } catch (error) {
      console.error('❌ API SYNC: Error fetching reciter profile:', error);
      throw error;
    }
  }

  /**
   * Nettoie le cache pour un verset spécifique ou tout le cache
   */
  async clearCache(globalNumber?: number, reciterCode?: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (globalNumber) params.append('global_number', globalNumber.toString());
      if (reciterCode) params.append('reciter_code', reciterCode);

      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.WORD_SYNC.CLEAR_CACHE) + (params.toString() ? '?' + params.toString() : ''),
        {
          method: 'DELETE',
          headers: getDefaultHeaders(),
        }
      );

      const result: APIResponse<any> = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to clear cache');
      }

      // Nettoyer aussi le cache local
      if (globalNumber && reciterCode) {
        const cacheKey = `${globalNumber}-${reciterCode}`;
        this.timingCache.delete(cacheKey);
      } else {
        this.timingCache.clear();
      }

      console.log('✅ API SYNC: Cache cleared successfully');

    } catch (error) {
      console.error('❌ API SYNC: Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques du service
   */
  async getStats(): Promise<any> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WORD_SYNC.STATS), {
        method: 'GET',
        headers: getDefaultHeaders(),
      });

      const result: APIResponse<any> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to fetch stats');
      }

      return {
        ...result.data,
        local_cache_size: this.timingCache.size,
      };

    } catch (error) {
      console.error('❌ API SYNC: Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Nettoie le cache local
   */
  clearLocalCache(): void {
    this.timingCache.clear();
  }

  /**
   * Obtient les statistiques du cache local
   */
  getLocalCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.timingCache.size,
      keys: Array.from(this.timingCache.keys())
    };
  }

  /**
   * Configure l'URL de base de l'API
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
  }
}

export const wordSyncAPIService = new WordSyncAPIService();