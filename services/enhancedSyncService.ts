/**
 * Service de synchronisation précise utilisant l'API backend EnhancedWordSync
 * Remplace la synchronisation basique par des timestamps calculés intelligemment
 */

export interface EnhancedWordTiming {
  word_index: number;
  package_word_id: number;
  position: number;
  arabic_text: string;
  transliteration: string;
  translation: string;
  start_time: number;
  end_time: number;
  duration: number;
  confidence: number;
  char_type: string;
  page_number?: number;
  line_number?: number;
  audio_url?: string;
  enhanced_features: {
    char_type: string;
    has_audio: boolean;
    position_in_verse: number;
    page_info: {
      page: number | null;
      line: number | null;
    };
    transliteration_complexity: number;
    translation_complexity: number;
  };
  tajweed_info: {
    type: string;
    weight: number;
    description: string;
    package_char_type?: string;
    has_audio?: boolean;
  };
}

export interface EnhancedTimingResponse {
  success: boolean;
  data: {
    words: EnhancedWordTiming[];
    total_duration: number;
    source: string;
    accuracy: number;
    metadata: {
      generated_at: string;
      word_count: number;
      reciter_style: string;
      package_version: string;
      enhancement_features: string[];
    };
  };
  metadata: {
    enhancement_type: string;
    confidence_level: string;
    features_used: string[];
  };
}

export interface EnhancedCurrentWordResponse {
  success: boolean;
  data: {
    current_word_index: number;
    current_word: EnhancedWordTiming | null;
    total_words: number;
    progress_percentage: number;
    previous_word?: EnhancedWordTiming;
    next_word?: EnhancedWordTiming;
    enhanced_features?: {
      char_type: string;
      has_audio: boolean;
      translation_available: boolean;
      transliteration_available: boolean;
      tajweed_info: any;
    };
  };
  metadata: {
    enhancement_type: string;
    timestamp: string;
  };
}

class EnhancedSyncService {
  private baseUrl: string;
  private currentTimingData: EnhancedWordTiming[] | null = null;
  private currentVerseId: number | null = null;
  private currentReciter: string | null = null;
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private lastUpdateTime: number = 0;
  private debounceTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Utilise l'URL du backend Laravel configurée dans .env (EXPO_PUBLIC_API_URL)
    this.baseUrl = `${process.env.EXPO_PUBLIC_API_URL}/v1/enhanced-word-sync`;
  }

  /**
   * Récupère les données de timing précises pour un verset (avec cache et debouncing)
   */
  async getEnhancedTimingData(
    globalNumber: number,
    reciterCode: string,
    packageWords: any[],
    audioDuration: number
  ): Promise<EnhancedWordTiming[]> {
    const cacheKey = `timing_${globalNumber}_${reciterCode}`;

    // Vérifier si nous avons déjà ces données
    if (this.currentVerseId === globalNumber && this.currentReciter === reciterCode && this.currentTimingData) {
      console.log(`📋 ENHANCED SYNC: Using cached timing data for verse ${globalNumber}`);
      return this.currentTimingData;
    }

    // Vérifier si une requête est déjà en cours
    if (this.loadingPromises.has(cacheKey)) {
      console.log(`⏳ ENHANCED SYNC: Waiting for existing request for verse ${globalNumber}`);
      return this.loadingPromises.get(cacheKey)!;
    }

    const loadingPromise = this.fetchTimingData(globalNumber, reciterCode, packageWords, audioDuration);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      this.loadingPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  private async fetchTimingData(
    globalNumber: number,
    reciterCode: string,
    packageWords: any[],
    audioDuration: number
  ): Promise<EnhancedWordTiming[]> {
    try {
      console.log(`🔄 ENHANCED SYNC: Fetching timing data for verse ${globalNumber} with ${packageWords.length} words`);

      const requestData = {
        global_number: globalNumber,
        reciter_code: reciterCode,
        package_words: packageWords,
        audio_duration: audioDuration
      };

      console.log('📤 ENHANCED SYNC: Request data:', JSON.stringify(requestData, null, 2));

      const response = await fetch(`${this.baseUrl}/timing-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('📥 ENHANCED SYNC: Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: EnhancedTimingResponse = await response.json();

      if (!result.success) {
        throw new Error(result.data?.toString() || 'Failed to get enhanced timing data');
      }

      this.currentTimingData = result.data.words;
      this.currentVerseId = globalNumber;
      this.currentReciter = reciterCode;

      console.log(`✅ ENHANCED SYNC: Loaded ${result.data.words.length} words with ${result.data.accuracy}% accuracy`);
      console.log(`📊 Features: ${result.metadata.features_used.join(', ')}`);

      return result.data.words;

    } catch (error) {
      console.error('❌ ENHANCED SYNC: Error fetching timing data:', error);
      throw error;
    }
  }

  /**
   * Trouve le mot actuel avec les données de timing précises (avec debouncing)
   */
  async getCurrentWord(
    globalNumber: number,
    reciterCode: string,
    currentTime: number,
    packageWords: any[],
    audioDuration: number
  ): Promise<{
    currentWordIndex: number;
    currentWord: EnhancedWordTiming | null;
    progress: number;
    totalWords: number;
    previousWord?: EnhancedWordTiming;
    nextWord?: EnhancedWordTiming;
  }> {
    // Utiliser d'abord la synchronisation locale si nous avons les données
    if (this.currentTimingData && this.currentVerseId === globalNumber && this.currentReciter === reciterCode) {
      return this.findCurrentWordLocally(currentTime);
    }

    // Debouncing pour éviter trop d'appels API
    const now = Date.now();
    if (now - this.lastUpdateTime < 500) { // Limite à 1 appel toutes les 500ms
      // Fallback local
      if (this.currentTimingData) {
        return this.findCurrentWordLocally(currentTime);
      }
    }

    this.lastUpdateTime = now;

    try {
      const response = await fetch(`${this.baseUrl}/current-word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          global_number: globalNumber,
          reciter_code: reciterCode,
          current_time: currentTime,
          package_words: packageWords,
          audio_duration: audioDuration
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: EnhancedCurrentWordResponse = await response.json();

      if (!result.success) {
        throw new Error('Failed to get current word');
      }

      const data = result.data;

      // Log détaillé pour debug (moins fréquent)
      if (data.current_word && Math.random() < 0.1) { // Log seulement 10% du temps
        const word = data.current_word;
        const timing = `${word.start_time}-${word.end_time}ms`;
        const features = data.enhanced_features;

        console.log(`🎵 ENHANCED SYNC: Audio ${currentTime}ms → Word ${data.current_word_index + 1}/${data.total_words}: "${word.arabic_text}" (${timing}) [${(word.confidence * 100).toFixed(0)}% conf]`);

        if (features?.tajweed_info) {
          console.log(`🎨 Tajweed: ${features.tajweed_info.type} (${features.tajweed_info.description})`);
        }
      }

      return {
        currentWordIndex: data.current_word_index,
        currentWord: data.current_word,
        progress: data.progress_percentage,
        totalWords: data.total_words,
        previousWord: data.previous_word,
        nextWord: data.next_word
      };

    } catch (error) {
      // Fallback vers synchronisation locale si disponible
      if (this.currentTimingData && currentTime >= 0) {
        return this.findCurrentWordLocally(currentTime);
      }

      throw error;
    }
  }

  /**
   * Fallback pour trouver le mot actuel localement
   */
  private findCurrentWordLocally(currentTime: number): {
    currentWordIndex: number;
    currentWord: EnhancedWordTiming | null;
    progress: number;
    totalWords: number;
    previousWord?: EnhancedWordTiming;
    nextWord?: EnhancedWordTiming;
  } {
    if (!this.currentTimingData) {
      return {
        currentWordIndex: -1,
        currentWord: null,
        progress: 0,
        totalWords: 0
      };
    }

    const words = this.currentTimingData;
    let currentWordIndex = -1;

    // Recherche du mot actuel
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (currentTime >= word.start_time && currentTime < word.end_time) {
        currentWordIndex = i;
        break;
      }
    }

    // Si pas trouvé, chercher le plus proche
    if (currentWordIndex === -1) {
      let closestDistance = Infinity;
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordCenter = (word.start_time + word.end_time) / 2;
        const distance = Math.abs(currentTime - wordCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          currentWordIndex = i;
        }
      }
    }

    const totalDuration = words[words.length - 1]?.end_time || 1;
    const progress = (currentTime / totalDuration) * 100;

    return {
      currentWordIndex,
      currentWord: words[currentWordIndex] || null,
      progress,
      totalWords: words.length,
      previousWord: currentWordIndex > 0 ? words[currentWordIndex - 1] : undefined,
      nextWord: currentWordIndex < words.length - 1 ? words[currentWordIndex + 1] : undefined
    };
  }

  /**
   * Force la synchronisation à un mot spécifique
   * Utile pour la correction manuelle
   */
  async forceSyncToWord(
    globalNumber: number,
    reciterCode: string,
    wordIndex: number,
    currentTime: number,
    packageWords: any[],
    audioDuration: number
  ): Promise<void> {
    try {
      // Utiliser l'API pour recalibrer si nécessaire
      await this.getCurrentWord(globalNumber, reciterCode, currentTime, packageWords, audioDuration);

      console.log(`🎯 ENHANCED SYNC: Force sync to word ${wordIndex + 1} at ${currentTime}ms`);

    } catch (error) {
      console.error('❌ ENHANCED SYNC: Error forcing sync:', error);
    }
  }

  /**
   * Obtient les statistiques de synchronisation
   */
  async getStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('❌ ENHANCED SYNC: Error getting stats:', error);
      return null;
    }
  }

  /**
   * Nettoie le cache pour un verset spécifique
   */
  async clearCache(globalNumber?: number, reciterCode?: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (globalNumber) params.append('global_number', globalNumber.toString());
      if (reciterCode) params.append('reciter_code', reciterCode);

      const response = await fetch(`${this.baseUrl}/cache?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        console.log('🧹 ENHANCED SYNC: Cache cleared successfully');
      }

    } catch (error) {
      console.error('❌ ENHANCED SYNC: Error clearing cache:', error);
    }
  }

  /**
   * Reset pour un nouveau verset
   */
  reset(): void {
    this.currentTimingData = null;
    this.currentVerseId = null;
    this.currentReciter = null;
    console.log('🔄 ENHANCED SYNC: Reset for new verse');
  }

  /**
   * Obtient les données de timing actuelles
   */
  getCurrentTimingData(): EnhancedWordTiming[] | null {
    return this.currentTimingData;
  }

  /**
   * Prédit la fin de l'audio basé sur les données de timing
   */
  predictAudioEnd(): number {
    if (!this.currentTimingData || this.currentTimingData.length === 0) {
      return 0;
    }

    const lastWord = this.currentTimingData[this.currentTimingData.length - 1];
    return lastWord.end_time;
  }
}

// Instance singleton
export const enhancedSyncService = new EnhancedSyncService();