/**
 * Service coordinateur pour la synchronisation des données Coran
 * Combine l'API Quran Foundation et le stockage local
 * Gère la synchronisation mot par mot avec timing audio
 */

import { quranFoundationAPI, QuranFoundationVerse, QuranFoundationReciter } from './quranFoundationAPI';
import { localQuranStorage, LocalVerse, LocalWord } from './localQuranStorage';

// Interface pour les données de timing mot par mot optimisées
export interface WordTimingData {
  wordIndex: number;
  arabicText: string;
  startTime: number; // calculé à partir de la position et de la durée
  endTime: number;
  duration: number;
  audioUrl: string;
  confidence: number; // basé sur les données API disponibles
  position: number;
}

export interface VerseWithTiming {
  verseKey: string;
  globalNumber: number;
  chapterNumber: number;
  verseNumber: number;
  arabicText: string;
  audioUrl: string;
  audioDuration: number;
  words: WordTimingData[];
  recitationId: number;
  source: 'local' | 'api';
  lastUpdated: string;
}

export interface SyncProgress {
  total: number;
  completed: number;
  current: string;
  percentage: number;
}

class QuranSyncService {
  private isInitialized = false;
  private onProgressCallback: ((progress: SyncProgress) => void) | null = null;

  /**
   * Initialise les services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialiser le stockage local
      await localQuranStorage.initializeDatabase();

      // Configurer les credentials API (à remplacer par les vrais)
      quranFoundationAPI.setCredentials('your_client_id', 'your_client_secret');

      this.isInitialized = true;
      console.log('✅ QURAN SYNC: Service initialized successfully');
    } catch (error) {
      console.error('❌ QURAN SYNC: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Configure le callback de progression
   */
  setProgressCallback(callback: (progress: SyncProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Récupère et stocke les récitateurs
   */
  async syncReciters(): Promise<QuranFoundationReciter[]> {
    if (!this.isInitialized) await this.initialize();

    try {
      console.log('🔄 QURAN SYNC: Syncing reciters...');

      // Récupérer depuis l'API
      const reciters = await quranFoundationAPI.getRecitations();

      // Stocker localement
      await localQuranStorage.storeReciters(reciters);

      console.log(`✅ QURAN SYNC: Synced ${reciters.length} reciters`);
      return reciters;
    } catch (error) {
      console.error('❌ QURAN SYNC: Error syncing reciters:', error);

      // Fallback vers les données locales
      const localReciters = await localQuranStorage.getStoredReciters();
      console.log(`⚠️ QURAN SYNC: Using ${localReciters.length} local reciters as fallback`);

      return localReciters.map(r => ({
        id: r.id,
        reciter_name: r.name,
        style: r.style,
        translated_name: {
          name: r.name,
          language_name: r.language
        }
      }));
    }
  }

  /**
   * Récupère un verset avec timing optimisé (local d'abord, puis API)
   */
  async getVerseWithTiming(
    verseKey: string,
    recitationId: number = 7
  ): Promise<VerseWithTiming> {
    if (!this.isInitialized) await this.initialize();

    try {
      // 1. Vérifier en local d'abord
      const localVerse = await localQuranStorage.getStoredVerse(verseKey, recitationId);

      if (localVerse) {
        console.log(`📁 QURAN SYNC: Using cached verse ${verseKey}`);

        const words = await localQuranStorage.getVerseWords(localVerse.id);
        return this.convertLocalToTimingFormat(localVerse, words);
      }

      // 2. Récupérer depuis l'API
      console.log(`🌐 QURAN SYNC: Fetching verse ${verseKey} from API`);
      const apiVerse = await quranFoundationAPI.getVerseByKey(verseKey, recitationId);

      // 3. Stocker localement pour la prochaine fois
      await localQuranStorage.storeVerse(apiVerse, recitationId);

      return this.convertApiToTimingFormat(apiVerse, recitationId);

    } catch (error) {
      console.error(`❌ QURAN SYNC: Error getting verse ${verseKey}:`, error);
      throw error;
    }
  }

  /**
   * Synchronise un chapitre entier avec progression
   */
  async syncChapter(
    chapterNumber: number,
    recitationId: number = 7,
    forceRefresh = false
  ): Promise<VerseWithTiming[]> {
    if (!this.isInitialized) await this.initialize();

    try {
      // Vérifier si déjà en local (sauf si forceRefresh)
      if (!forceRefresh) {
        const isStored = await localQuranStorage.isChapterStored(chapterNumber, recitationId);
        if (isStored) {
          console.log(`📁 QURAN SYNC: Using cached chapter ${chapterNumber}`);
          return await this.getLocalChapterWithTiming(chapterNumber, recitationId);
        }
      }

      console.log(`🌐 QURAN SYNC: Syncing chapter ${chapterNumber} from API...`);

      // Récupérer depuis l'API avec pagination
      let allVerses: QuranFoundationVerse[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        this.notifyProgress({
          total: 100, // estimation
          completed: (page - 1) * 20,
          current: `Loading page ${page}...`,
          percentage: Math.min(((page - 1) * 20), 90)
        });

        const response = await quranFoundationAPI.getChapterVerses(chapterNumber, recitationId, {
          page,
          perPage: 20
        });

        allVerses = allVerses.concat(response.verses || []);

        hasMore = response.meta.next_page !== null;
        page++;

        console.log(`📦 QURAN SYNC: Loaded ${allVerses.length} verses so far...`);
      }

      // Stocker localement
      this.notifyProgress({
        total: allVerses.length,
        completed: 0,
        current: 'Storing locally...',
        percentage: 95
      });

      await localQuranStorage.storeChapterVerses(allVerses, recitationId);

      // Convertir au format avec timing
      const versesWithTiming = allVerses.map(verse =>
        this.convertApiToTimingFormat(verse, recitationId)
      );

      this.notifyProgress({
        total: allVerses.length,
        completed: allVerses.length,
        current: 'Complete!',
        percentage: 100
      });

      console.log(`✅ QURAN SYNC: Successfully synced chapter ${chapterNumber} with ${allVerses.length} verses`);

      return versesWithTiming;

    } catch (error) {
      console.error(`❌ QURAN SYNC: Error syncing chapter ${chapterNumber}:`, error);

      // Fallback vers les données locales existantes
      console.log(`⚠️ QURAN SYNC: Falling back to local data for chapter ${chapterNumber}`);
      return await this.getLocalChapterWithTiming(chapterNumber, recitationId);
    }
  }

  /**
   * Calcule le timing intelligent des mots basé sur la durée audio et la position
   */
  private calculateWordTiming(
    words: { position: number; text: string; audioUrl: string }[],
    totalDuration: number
  ): WordTimingData[] {
    const totalWords = words.length;

    return words.map((word, index) => {
      // Calcul basique basé sur la position relative
      // On peut l'améliorer avec l'analyse de la longueur des mots
      const startPercentage = index / totalWords;
      const endPercentage = (index + 1) / totalWords;

      const startTime = Math.round(startPercentage * totalDuration);
      const endTime = Math.round(endPercentage * totalDuration);
      const duration = endTime - startTime;

      return {
        wordIndex: index,
        arabicText: word.text,
        startTime,
        endTime,
        duration,
        audioUrl: word.audioUrl,
        confidence: 0.7, // Estimation basée sur la position
        position: word.position
      };
    });
  }

  /**
   * Convertit les données API au format avec timing
   */
  private convertApiToTimingFormat(verse: QuranFoundationVerse, recitationId: number): VerseWithTiming {
    const [chapterNumber, verseNumber] = verse.verse_key.split(':').map(Number);

    const words = this.calculateWordTiming(
      verse.words.map(w => ({
        position: w.position,
        text: w.text_uthmani,
        audioUrl: w.audio_url
      })),
      verse.audio.duration
    );

    return {
      verseKey: verse.verse_key,
      globalNumber: verse.id,
      chapterNumber,
      verseNumber,
      arabicText: verse.words.map(w => w.text_uthmani).join(' '),
      audioUrl: verse.audio.url,
      audioDuration: verse.audio.duration,
      words,
      recitationId,
      source: 'api',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Convertit les données locales au format avec timing
   */
  private convertLocalToTimingFormat(verse: LocalVerse, words: LocalWord[]): VerseWithTiming {
    const timingWords = this.calculateWordTiming(
      words.map(w => ({
        position: w.position,
        text: w.text_uthmani,
        audioUrl: w.audio_url
      })),
      verse.audio_duration
    );

    return {
      verseKey: verse.verse_key,
      globalNumber: verse.id,
      chapterNumber: verse.chapter_number,
      verseNumber: verse.verse_number,
      arabicText: verse.text_uthmani,
      audioUrl: verse.audio_url,
      audioDuration: verse.audio_duration,
      words: timingWords,
      recitationId: verse.recitation_id,
      source: 'local',
      lastUpdated: verse.updated_at
    };
  }

  /**
   * Récupère un chapitre depuis le stockage local
   */
  private async getLocalChapterWithTiming(
    chapterNumber: number,
    recitationId: number
  ): Promise<VerseWithTiming[]> {
    const versesData = await localQuranStorage.getChapterVerses(chapterNumber, recitationId);

    return versesData.map(({ verse, words }) =>
      this.convertLocalToTimingFormat(verse, words)
    );
  }

  /**
   * Trouve le mot actuel basé sur le temps
   */
  findCurrentWord(verseData: VerseWithTiming, currentTime: number): number {
    for (let i = 0; i < verseData.words.length; i++) {
      const word = verseData.words[i];
      if (currentTime >= word.startTime && currentTime <= word.endTime) {
        return i;
      }
    }

    // Si aucun mot exact, trouver le plus proche
    for (let i = 0; i < verseData.words.length; i++) {
      if (verseData.words[i].startTime > currentTime) {
        return Math.max(0, i - 1);
      }
    }

    return verseData.words.length - 1;
  }

  /**
   * Notifie la progression
   */
  private notifyProgress(progress: SyncProgress): void {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }

  /**
   * Obtient les statistiques
   */
  async getStats(): Promise<{
    local: {
      totalVerses: number;
      totalWords: number;
      totalReciters: number;
      totalChapters: number;
    };
    lastSync: string | null;
  }> {
    if (!this.isInitialized) await this.initialize();

    const localStats = await localQuranStorage.getStorageStats();

    return {
      local: localStats,
      lastSync: null // TODO: implémenter le tracking de la dernière sync
    };
  }

  /**
   * Nettoie toutes les données
   */
  async clearAllData(): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    await localQuranStorage.clearDatabase();
    console.log('✅ QURAN SYNC: All data cleared');
  }
}

export const quranSyncService = new QuranSyncService();