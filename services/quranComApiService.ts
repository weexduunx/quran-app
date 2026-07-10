/**
 * Service pour l'API officielle de Quran.com
 * Fournit des données word-by-word précises et fiables
 */

export interface QuranComWord {
  id: number;
  position: number;
  audio_url?: string;
  char_type_name: string;
  text_uthmani: string;
  page_number: number;
  line_number: number;
  translation: {
    text: string;
    language_name: string;
  };
  transliteration?: {
    text: string;
    language_name: string;
  };
}

export interface QuranComVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  chapter_id: number;
  page_number: number;
  juz_number: number;
  text_uthmani: string;
  words: QuranComWord[];
  translations: Array<{
    id: number;
    text: string;
    language_name: string;
    resource_name: string;
  }>;
}

export interface QuranComResponse {
  verse?: QuranComVerse;
  verses?: QuranComVerse[];
  pagination?: {
    per_page: number;
    current_page: number;
    next_page: number | null;
    prev_page: number | null;
    total_pages: number;
    total_records: number;
  };
}

export interface QuranComWordWithTiming extends QuranComWord {
  timing?: {
    start_time: number;
    end_time: number;
    duration: number;
    confidence: number;
  };
}

class QuranComApiService {
  private baseUrl = 'https://api.quran.com/api/v4';
  private cache = new Map<string, any>();

  // Translation IDs for different languages
  private translations = {
    en: '131',  // English - Sahih International
    fr: '136',  // French - Muhammad Hamidullah
    wo: 'custom_wolof'  // Wolof - Custom implementation needed
  };

  // Fallback translations for unsupported languages
  private fallbackTranslations = {
    wo: 'fr'  // Use French as fallback for Wolof
  };

  /**
   * Récupère un verset spécifique avec données word-by-word
   */
  async getVerseWordByWord(
    surahNumber: number,
    verseNumber: number,
    language: 'en' | 'fr' | 'wo' = 'fr'
  ): Promise<QuranComVerse | null> {
    const cacheKey = `verse_${surahNumber}_${verseNumber}_${language}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `${this.baseUrl}/verses/by_key/${surahNumber}:${verseNumber}`;
      const params = new URLSearchParams({
        words: 'true',
        translations: this.translations[language],
        language: language,
        word_fields: `text_uthmani,translation`
      });

      console.log(`🌐 Fetching from Quran.com API: ${surahNumber}:${verseNumber}`);

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'QuranApp/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: QuranComResponse = await response.json();

      if (data.verse) {
        console.log(`✅ Quran.com API: Found verse ${surahNumber}:${verseNumber} with ${data.verse.words.length} words`);

        // Debug: log first word to see structure
        if (data.verse.words.length > 0) {
          const firstWord = data.verse.words[0];
          console.log(`📝 Sample word: "${firstWord.text_uthmani}" -> "${firstWord.translation?.text}"`);
        }

        this.cache.set(cacheKey, data.verse);
        return data.verse;
      }

      return null;
    } catch (error) {
      console.error(`❌ Quran.com API error for verse ${surahNumber}:${verseNumber}:`, error);
      return null;
    }
  }

  /**
   * Récupère plusieurs versets d'une sourate
   */
  async getSurahVerses(
    surahNumber: number,
    language: 'en' | 'fr' | 'wo' = 'fr',
    page: number = 1,
    perPage: number = 20
  ): Promise<QuranComVerse[]> {
    const cacheKey = `surah_${surahNumber}_${language}_${page}_${perPage}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `${this.baseUrl}/verses/by_chapter/${surahNumber}`;
      const params = new URLSearchParams({
        words: 'true',
        translations: this.translations[language],
        language: language,
        page: page.toString(),
        per_page: perPage.toString(),
        word_fields: 'text_uthmani,translation'
      });

      console.log(`🌐 Fetching surah ${surahNumber} from Quran.com API`);

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'QuranApp/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: QuranComResponse = await response.json();

      if (data.verses) {
        console.log(`✅ Quran.com API: Found ${data.verses.length} verses for surah ${surahNumber}`);
        this.cache.set(cacheKey, data.verses);
        return data.verses;
      }

      return [];
    } catch (error) {
      console.error(`❌ Quran.com API error for surah ${surahNumber}:`, error);
      return [];
    }
  }

  /**
   * Convertit les données Quran.com vers le format de notre app
   * Filtre les mots pour exclure la ponctuation et les caractères spéciaux
   */
  convertToAppFormat(verse: QuranComVerse): QuranComWordWithTiming[] {
    // Filtrer seulement les vrais mots (exclure ponctuation, pause, etc.)
    const actualWords = verse.words.filter(word =>
      word.char_type_name === 'word' &&
      word.text_uthmani &&
      word.text_uthmani.trim().length > 0
    );

    console.log(`🔤 Filtered ${actualWords.length} actual words from ${verse.words.length} total items`);

    return actualWords.map((word, index) => ({
      ...word,
      // Timing sera calculé dans loadWordsFromQuranCom avec la durée audio réelle
      timing: {
        start_time: index * 1000, // Timing temporaire
        end_time: (index + 1) * 1000,
        duration: 1000,
        confidence: 0.5
      }
    }));
  }

  /**
   * Améliore les mots avec des données de timing de notre backend
   */
  async enhanceWithTiming(
    words: QuranComWordWithTiming[],
    globalVerseNumber: number,
    reciterCode: string,
    audioDuration: number
  ): Promise<QuranComWordWithTiming[]> {
    try {
      // Utiliser notre backend pour obtenir un meilleur timing
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      if (!apiUrl) {
        console.warn('⚠️ API URL not configured, using basic timing');
        return this.generateBasicTiming(words, audioDuration);
      }

      // Timeout controller pour éviter les longues attentes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 secondes max

      const response = await fetch(`${apiUrl}/v1/word-sync/timing-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          global_number: globalVerseNumber,
          reciter_code: reciterCode,
          arabic_text: words.map(w => w.text_uthmani).join(' '),
          audio_duration: audioDuration,
          word_count: words.length
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Timing API failed: ${response.status}`);
      }

      const timingData = await response.json();

      if (timingData.data?.words && timingData.data.words.length === words.length) {
        console.log(`✅ Enhanced timing applied to ${words.length} words`);

        return words.map((word, index) => ({
          ...word,
          timing: {
            start_time: timingData.data.words[index].start_time,
            end_time: timingData.data.words[index].end_time,
            duration: timingData.data.words[index].duration,
            confidence: timingData.data.words[index].confidence || 0.8
          }
        }));
      }

      throw new Error('Timing data mismatch');

    } catch (error) {
      console.warn('⚠️ Timing enhancement failed, using basic timing:', error.message);
      return this.generateBasicTiming(words, audioDuration);
    }
  }

  /**
   * Génère un timing simple basé sur le script original
   */
  private generateBasicTiming(words: QuranComWordWithTiming[], audioDuration: number): QuranComWordWithTiming[] {
    if (words.length === 0) return words;

    // Timing simple et équitable comme dans le script JS
    const timePerWord = audioDuration / words.length;

    console.log(`⏱️ Script-based timing: ${audioDuration}ms total, ${timePerWord.toFixed(0)}ms per word`);

    return words.map((word, index) => ({
      ...word,
      timing: {
        start_time: index * timePerWord,
        end_time: (index + 1) * timePerWord,
        duration: timePerWord,
        confidence: 0.9
      }
    }));
  }

  /**
   * Trouve le mot actuel basé sur le temps de lecture avec amélioration progressive
   */
  getCurrentWordIndex(words: QuranComWordWithTiming[], currentTime: number, previousIndex: number = -1): number {
    // Logique ultra-simple : progression strictement vers l'avant seulement
    const timePerWord = words.length > 0 && words[0]?.timing ? words[0].timing.duration : 1000;

    // Calcul simple basé sur le temps
    let calculatedIndex = Math.floor(currentTime / timePerWord);

    // S'assurer qu'on reste dans les limites
    calculatedIndex = Math.max(0, Math.min(calculatedIndex, words.length - 1));

    // RÈGLE STRICTE : ne jamais reculer (sauf restart)
    if (previousIndex >= 0 && currentTime > 1000) {
      calculatedIndex = Math.max(previousIndex, calculatedIndex);
    }

    // Debug occasionnel
    if (calculatedIndex !== previousIndex) {
      console.log(`📍 Word progression: ${previousIndex} -> ${calculatedIndex} (time: ${currentTime.toFixed(0)}ms)`);
    }

    return calculatedIndex;
  }

  /**
   * Nettoie le cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Statistiques du cache
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const quranComApiService = new QuranComApiService();
export default quranComApiService;