import * as quranWords from '@kmaslesa/holy-quran-word-by-word-full-data';
import { repairArabicText } from '../utils/textUtils';
import quranComApiService, { QuranComWordWithTiming } from './quranComApiService';

// Types from the package
export interface QuranData {
  ayahs?: Ayah[] | null;
  page: number;
}

export interface Ayah {
  words?: (Word | null)[] | null;
  metaData: MetaData;
}

export interface Word {
  id: number;
  position: number;
  audio_url?: string | null;
  char_type_name: string;
  code_v1: string;
  page_number: number;
  line_number: number;
  text: string;
  translation: Translation;
  transliteration: Transliteration;
  parentAyahVerseKey: string;
  ayahIndex: number;
}

export interface Translation {
  text: string;
  language_name: string;
}

export interface Transliteration {
  text: string;
  language_name: string;
}

export interface MetaData {
  verse_key: string;
  verse_number: number;
  surah_number: number;
  page_number: number;
  juz_number: number;
  hizb_number: number;
  rub_number: number;
  manzil_number: number;
  sajdah_number?: number | null;
}

// Enhanced word interface for our app
export interface EnhancedWord extends Word {
  timing?: {
    start_time: number;
    end_time: number;
    duration: number;
    confidence: number;
  };
  tajweed_info?: {
    type: string;
    weight: number;
  };
}

class WordByWordService {
  private cache = new Map<string, QuranData>();

  /**
   * Get all Quran words data
   */
  async getAllQuranWords(): Promise<QuranData> {
    const cacheKey = 'all_words';

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const data = await quranWords.getAllQuranWords();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching all Quran words:', error);
      throw error;
    }
  }

  /**
   * Get words by page (1-604)
   */
  async getWordsByPage(page: number): Promise<QuranData> {
    if (page < 1 || page > 604) {
      throw new Error('Page number must be between 1 and 604');
    }

    const cacheKey = `page_${page}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const data = await quranWords.getWordsByPage(page);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error fetching words for page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Get words for a specific verse using Quran.com API (preferred method)
   */
  async getWordsForVerseFromQuranCom(
    surahNumber: number,
    ayahNumber: number,
    language: 'en' | 'fr' | 'ur' = 'fr'
  ): Promise<QuranComWordWithTiming[]> {
    try {
      console.log(`🌐 Trying Quran.com API for verse ${surahNumber}:${ayahNumber}`);

      const verse = await quranComApiService.getVerseWordByWord(surahNumber, ayahNumber, language);

      if (verse && verse.words.length > 0) {
        console.log(`✅ Quran.com API: Found ${verse.words.length} words for verse ${surahNumber}:${ayahNumber}`);

        // Convertir au format de notre app
        const wordsWithTiming = quranComApiService.convertToAppFormat(verse);

        return wordsWithTiming;
      }

      throw new Error('No data from Quran.com API');
    } catch (error) {
      console.warn(`⚠️ Quran.com API failed for ${surahNumber}:${ayahNumber}, falling back to package data`);

      // Fallback vers l'ancien système
      const packageWords = await this.getWordsForVerse(surahNumber, ayahNumber);

      // Convertir vers le nouveau format
      return packageWords.map((word, index) => ({
        id: word.id,
        position: word.position,
        audio_url: word.audio_url,
        char_type_name: word.char_type_name,
        text_uthmani: word.text, // Mapping du champ text vers text_uthmani
        page_number: word.page_number,
        line_number: word.line_number,
        translation: word.translation,
        transliteration: word.transliteration,
        timing: {
          start_time: index * 1000,
          end_time: (index + 1) * 1000,
          duration: 1000,
          confidence: 0.5
        }
      }));
    }
  }

  /**
   * Get words for a specific verse (legacy method using @kmaslesa package)
   */
  async getWordsForVerse(surahNumber: number, ayahNumber: number): Promise<Word[]> {
    const cacheKey = `verse_${surahNumber}_${ayahNumber}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      console.log(`🔍 Searching for verse ${surahNumber}:${ayahNumber} in package data...`);

      // Try alternative search method using parentAyahVerseKey
      const targetVerseKey = `${surahNumber}:${ayahNumber}`;
      let foundWords: Word[] = [];

      // Search through likely pages first
      const commonPages = this.getCommonPagesForSurah(surahNumber);
      let found = false;

      for (const page of commonPages) {
        try {
          const pageData = await this.getWordsByPage(page);
          console.log(`🔍 Checking page ${page} for verse ${surahNumber}:${ayahNumber}...`);

          if (pageData.ayahs && Array.isArray(pageData.ayahs)) {
            for (const ayah of pageData.ayahs) {
              if (ayah?.words && Array.isArray(ayah.words)) {
                // Try to find words by parentAyahVerseKey
                const wordsForVerse = ayah.words.filter((word): word is Word =>
                  word !== null && word.parentAyahVerseKey === targetVerseKey
                );

                if (wordsForVerse.length > 0) {
                  foundWords = wordsForVerse;
                  found = true;
                  console.log(`✅ Found verse ${surahNumber}:${ayahNumber} on page ${page} with ${foundWords.length} words using parentAyahVerseKey`);
                  break;
                }
              }

              // Fallback: try old method with metaData
              if (ayah?.metaData) {
                console.log(`📄 Page ${page}: Found ayah ${ayah.metaData.surah_number}:${ayah.metaData.verse_number}`);

                if (ayah.metaData.surah_number === surahNumber &&
                    ayah.metaData.verse_number === ayahNumber) {
                  foundWords = ayah.words?.filter((word): word is Word => word !== null) || [];
                  found = true;
                  console.log(`✅ Found verse ${surahNumber}:${ayahNumber} on page ${page} with ${foundWords.length} words using metaData`);
                  break;
                }
              }
            }
          } else {
            console.log(`⚠️ Page ${page} has no ayahs or ayahs is not an array`);
          }

          if (found) break;
        } catch (pageError) {
          console.warn(`⚠️ Error checking page ${page}:`, pageError);
          continue;
        }
      }

      // If not found in common pages, search all pages (fallback)
      if (!found) {
        console.log(`🔍 Not found in common pages, searching all pages for ${surahNumber}:${ayahNumber}...`);

        for (let page = 1; page <= 604 && !found; page++) {
          if (commonPages.includes(page)) continue; // Skip already checked pages

          try {
            const pageData = await this.getWordsByPage(page);

            if (pageData.ayahs && Array.isArray(pageData.ayahs)) {
              for (const ayah of pageData.ayahs) {
                if (ayah?.words && Array.isArray(ayah.words)) {
                  // Try to find words by parentAyahVerseKey
                  const wordsForVerse = ayah.words.filter((word): word is Word =>
                    word !== null && word.parentAyahVerseKey === targetVerseKey
                  );

                  if (wordsForVerse.length > 0) {
                    foundWords = wordsForVerse;
                    found = true;
                    console.log(`✅ Found verse ${surahNumber}:${ayahNumber} on page ${page} with ${foundWords.length} words using parentAyahVerseKey`);
                    break;
                  }
                }

                // Fallback: try old method with metaData
                if (ayah?.metaData?.surah_number === surahNumber &&
                    ayah?.metaData?.verse_number === ayahNumber) {
                  foundWords = ayah.words?.filter((word): word is Word => word !== null) || [];
                  found = true;
                  console.log(`✅ Found verse ${surahNumber}:${ayahNumber} on page ${page} with ${foundWords.length} words using metaData`);
                  break;
                }
              }
            }

            if (found) break;
          } catch (pageError) {
            console.warn(`⚠️ Error checking page ${page}:`, pageError);
            continue;
          }
        }
      }

      if (!found || foundWords.length === 0) {
        console.warn(`⚠️ ENHANCED: No package words found for verse ${surahNumber}:${ayahNumber}, using fallback`);
        // Return empty array instead of throwing error to allow fallback
        return [];
      }

      // Debug: log translation languages and word structure
      if (foundWords.length > 0) {
        const firstWord = foundWords[0];
        console.log(`🌍 Translation language: ${firstWord.translation?.language_name}`);
        console.log(`🔤 Sample translation: "${firstWord.translation?.text}"`);
        console.log(`📝 Raw word text: "${firstWord.text}"`);
        console.log(`📝 Character codes:`, firstWord.text.split('').map(c => c.charCodeAt(0)));
        console.log(`🔧 Repaired text: "${repairArabicText(firstWord.text)}"`);

        // Log all words to see structure
        foundWords.forEach((word, index) => {
          console.log(`Word ${index + 1}: "${word.text}" -> "${repairArabicText(word.text)}"`);
        });
      }

      // Cache the result
      this.cache.set(cacheKey, foundWords);
      return foundWords;

    } catch (error) {
      console.error(`❌ Error fetching words for verse ${surahNumber}:${ayahNumber}:`, error);
      // Return empty array to allow fallback instead of throwing
      return [];
    }
  }

  /**
   * Get common pages for a surah to optimize search
   */
  private getCommonPagesForSurah(surahNumber: number): number[] {
    // This is a rough mapping of surah starting pages - can be optimized
    const surahPageMap: { [key: number]: number[] } = {
      1: [1], // Al-Fatiha
      2: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49], // Al-Baqarah (longest)
      3: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76], // Al-Imran
      4: [77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106], // An-Nisa
      5: [106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121], // Al-Maidah
      // Add more mappings as needed
    };

    return surahPageMap[surahNumber] || [1, 2, 3]; // Default fallback
  }

  /**
   * Enhance words with timing data from our enhanced backend API
   */
  async enhanceWordsWithTiming(
    words: Word[],
    globalVerseNumber: number,
    reciterCode: string,
    audioDuration: number
  ): Promise<EnhancedWord[]> {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      if (!apiUrl) {
        console.warn('⚠️ EXPO_PUBLIC_API_URL not configured, using basic timing generation');
        return this.generateBasicTiming(words, audioDuration);
      }

      console.log(`🔄 Trying enhanced timing API: ${apiUrl}/v1/enhanced-word-sync/timing-data`);

      // Call our enhanced backend API with package word data
      const response = await fetch(`${apiUrl}/v1/enhanced-word-sync/timing-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          global_number: globalVerseNumber,
          reciter_code: reciterCode,
          package_words: words,
          audio_duration: audioDuration
        }),
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        console.warn(`⚠️ Enhanced API failed (${response.status}), falling back to basic API`);
        return this.fallbackToBasicTiming(words, globalVerseNumber, reciterCode, audioDuration);
      }

      const timingResponse = await response.json();
      const timingWords = timingResponse.data.words;

      console.log(`✅ Enhanced timing API succeeded with ${timingWords.length} words`);

      // Enhance words with timing data from the enhanced API
      return words.map((word, index) => {
        const timingData = timingWords[index];

        return {
          ...word,
          timing: timingData ? {
            start_time: timingData.start_time,
            end_time: timingData.end_time,
            duration: timingData.duration,
            confidence: timingData.confidence
          } : undefined,
          tajweed_info: timingData?.tajweed_info
        };
      });
    } catch (error) {
      console.warn('⚠️ Network/API error with enhanced timing, falling back:', error.message);
      // Fallback to basic timing if enhanced fails
      return this.fallbackToBasicTiming(words, globalVerseNumber, reciterCode, audioDuration);
    }
  }

  /**
   * Fallback to basic timing API
   */
  private async fallbackToBasicTiming(
    words: Word[],
    globalVerseNumber: number,
    reciterCode: string,
    audioDuration: number
  ): Promise<EnhancedWord[]> {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      if (!apiUrl) {
        console.warn('⚠️ EXPO_PUBLIC_API_URL not configured, skipping API timing');
        return this.generateBasicTiming(words, audioDuration);
      }

      console.log(`🔄 Trying basic timing API: ${apiUrl}/v1/word-sync/timing-data`);

      const response = await fetch(`${apiUrl}/v1/word-sync/timing-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          global_number: globalVerseNumber,
          reciter_code: reciterCode,
          arabic_text: words.map(w => w.text).join(' '),
          audio_duration: audioDuration
        }),
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
      }

      const timingResponse = await response.json();
      const timingWords = timingResponse.data.words;

      console.log(`✅ Basic timing API succeeded with ${timingWords.length} words`);

      return words.map((word, index) => {
        const timingData = timingWords[index];

        return {
          ...word,
          timing: timingData ? {
            start_time: timingData.start_time,
            end_time: timingData.end_time,
            duration: timingData.duration,
            confidence: timingData.confidence
          } : undefined,
          tajweed_info: timingData?.tajweed_info
        };
      });
    } catch (error) {
      console.warn('⚠️ Network/API error, using basic timing generation:', error.message);
      // Generate basic timing locally if API fails
      return this.generateBasicTiming(words, audioDuration);
    }
  }

  /**
   * Generate basic timing data locally when API is unavailable
   */
  private generateBasicTiming(words: Word[], audioDuration: number): EnhancedWord[] {
    console.log(`🔧 Generating basic timing for ${words.length} words over ${audioDuration}ms`);

    const wordDuration = audioDuration / words.length;

    return words.map((word, index) => ({
      ...word,
      timing: {
        start_time: index * wordDuration,
        end_time: (index + 1) * wordDuration,
        duration: wordDuration,
        confidence: 0.5 // Lower confidence for generated timing
      }
    }));
  }

  /**
   * Get current word based on audio time
   */
  getCurrentWordIndex(enhancedWords: EnhancedWord[] | QuranComWordWithTiming[], currentTime: number, previousIndex: number = -1): number {
    // Utiliser la méthode améliorée du service Quran.com si disponible
    if ('getCurrentWordIndex' in quranComApiService) {
      return quranComApiService.getCurrentWordIndex(enhancedWords as QuranComWordWithTiming[], currentTime, previousIndex);
    }

    // Fallback ultra-simple : progression linéaire
    const firstWord = enhancedWords[0];
    const timePerWord = firstWord?.timing ? firstWord.timing.duration : (currentTime / enhancedWords.length);

    let calculatedIndex = Math.floor(currentTime / timePerWord);
    calculatedIndex = Math.max(0, Math.min(calculatedIndex, enhancedWords.length - 1));

    // Ne jamais reculer
    if (previousIndex >= 0 && currentTime > 1000) {
      calculatedIndex = Math.max(previousIndex, calculatedIndex);
    }

    return calculatedIndex;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Debug method to inspect package structure
   */
  async debugPackageStructure(page: number = 1): Promise<void> {
    try {
      console.log(`🔧 DEBUG: Inspecting package structure for page ${page}...`);
      const pageData = await this.getWordsByPage(page);

      console.log(`📊 Page ${page} structure:`, {
        hasAyahs: !!pageData.ayahs,
        ayahsIsArray: Array.isArray(pageData.ayahs),
        ayahsLength: pageData.ayahs?.length || 0,
        pageNumber: pageData.page
      });

      if (pageData.ayahs && Array.isArray(pageData.ayahs) && pageData.ayahs.length > 0) {
        // Log all ayahs to understand the structure
        console.log(`📄 All ayahs on page ${page}:`);
        pageData.ayahs.forEach((ayah, index) => {
          console.log(`  Ayah ${index}:`, {
            metaData: ayah?.metaData,
            hasWords: !!ayah?.words,
            wordsLength: ayah?.words?.length || 0,
            firstWordSample: ayah?.words?.[0] ? {
              id: ayah.words[0].id,
              text: ayah.words[0].text,
              parentAyahVerseKey: ayah.words[0].parentAyahVerseKey
            } : null
          });
        });
      }
    } catch (error) {
      console.error(`❌ Error debugging page ${page}:`, error);
    }
  }

  /**
   * Met à jour le timing des mots Quran.com avec la durée audio réelle
   */
  updateQuranComWordsWithAudioDuration(
    words: QuranComWordWithTiming[],
    audioDuration: number
  ): QuranComWordWithTiming[] {
    if (!words.length || !audioDuration) return words;

    console.log(`⏱️ Updating timing for ${words.length} words with audio duration ${audioDuration}ms`);

    // Timing simple et équitable
    const timePerWord = audioDuration / words.length;

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
}

export const wordByWordService = new WordByWordService();
export default wordByWordService;