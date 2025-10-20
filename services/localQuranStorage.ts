/**
 * Service de stockage local pour les données du Coran
 * Utilise SQLite pour stocker les versets, mots et audio localement
 */

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuranFoundationVerse, QuranFoundationWord, QuranFoundationReciter } from './quranFoundationAPI';

// Types pour les données stockées localement
export interface LocalVerse {
  id: number;
  verse_key: string;
  chapter_number: number;
  verse_number: number;
  text_uthmani: string;
  audio_url: string;
  audio_duration: number;
  page_number: number;
  juz_number: number;
  recitation_id: number;
  created_at: string;
  updated_at: string;
}

export interface LocalWord {
  id: number;
  verse_id: number;
  position: number;
  text_uthmani: string;
  audio_url: string;
  char_type_name: string;
  line_number: number;
  page_number: number;
}

export interface LocalReciter {
  id: number;
  name: string;
  style: string;
  language: string;
  last_updated: string;
}

class LocalQuranStorageService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'quran_local.db';
  private readonly DB_VERSION = 1;

  /**
   * Initialise la base de données SQLite
   */
  async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);

      // Créer les tables
      await this.createTables();

      console.log('✅ LOCAL STORAGE: Database initialized');
    } catch (error) {
      console.error('❌ LOCAL STORAGE: Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Crée les tables nécessaires
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Table des récitateurs
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reciters (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        style TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table des versets
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY,
        verse_key TEXT NOT NULL,
        chapter_number INTEGER NOT NULL,
        verse_number INTEGER NOT NULL,
        text_uthmani TEXT NOT NULL,
        audio_url TEXT NOT NULL,
        audio_duration INTEGER NOT NULL DEFAULT 0,
        page_number INTEGER NOT NULL,
        juz_number INTEGER NOT NULL,
        recitation_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(verse_key, recitation_id),
        FOREIGN KEY (recitation_id) REFERENCES reciters (id)
      );
    `);

    // Table des mots
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        verse_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        text_uthmani TEXT NOT NULL,
        audio_url TEXT NOT NULL,
        char_type_name TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        FOREIGN KEY (verse_id) REFERENCES verses (id) ON DELETE CASCADE
      );
    `);

    // Index pour optimiser les requêtes
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_verses_chapter ON verses(chapter_number);
      CREATE INDEX IF NOT EXISTS idx_verses_recitation ON verses(recitation_id);
      CREATE INDEX IF NOT EXISTS idx_words_verse ON words(verse_id);
      CREATE INDEX IF NOT EXISTS idx_words_position ON words(verse_id, position);
    `);

    console.log('✅ LOCAL STORAGE: Tables created successfully');
  }

  /**
   * Stocke les récitateurs
   */
  async storeReciters(reciters: QuranFoundationReciter[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('BEGIN TRANSACTION;');

      for (const reciter of reciters) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO reciters (id, name, style, language, last_updated)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            reciter.id,
            reciter.reciter_name,
            reciter.style,
            reciter.translated_name.language_name,
          ]
        );
      }

      await this.db.runAsync('COMMIT;');
      console.log(`✅ LOCAL STORAGE: Stored ${reciters.length} reciters`);
    } catch (error) {
      await this.db.runAsync('ROLLBACK;');
      console.error('❌ LOCAL STORAGE: Error storing reciters:', error);
      throw error;
    }
  }

  /**
   * Stocke un verset avec ses mots
   */
  async storeVerse(verse: QuranFoundationVerse, recitationId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('BEGIN TRANSACTION;');

      // Extraire chapter et verse number du verse_key (format: "1:1")
      const [chapterNumber, verseNumber] = verse.verse_key.split(':').map(Number);

      // Stocker le verset
      await this.db.runAsync(
        `INSERT OR REPLACE INTO verses
         (id, verse_key, chapter_number, verse_number, text_uthmani, audio_url, audio_duration,
          page_number, juz_number, recitation_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          verse.id,
          verse.verse_key,
          chapterNumber,
          verseNumber,
          verse.words.map(w => w.text_uthmani).join(' '),
          verse.audio.url,
          verse.audio.duration,
          verse.page_number,
          verse.juz_number,
          recitationId,
        ]
      );

      // Supprimer les anciens mots pour ce verset
      await this.db.runAsync('DELETE FROM words WHERE verse_id = ?', [verse.id]);

      // Stocker les mots
      for (const word of verse.words) {
        await this.db.runAsync(
          `INSERT INTO words
           (verse_id, position, text_uthmani, audio_url, char_type_name, line_number, page_number)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            verse.id,
            word.position,
            word.text_uthmani,
            word.audio_url,
            word.char_type_name,
            word.line_number,
            word.page_number,
          ]
        );
      }

      await this.db.runAsync('COMMIT;');
      console.log(`✅ LOCAL STORAGE: Stored verse ${verse.verse_key} with ${verse.words.length} words`);
    } catch (error) {
      await this.db.runAsync('ROLLBACK;');
      console.error(`❌ LOCAL STORAGE: Error storing verse ${verse.verse_key}:`, error);
      throw error;
    }
  }

  /**
   * Stocke plusieurs versets d'un chapitre
   */
  async storeChapterVerses(verses: QuranFoundationVerse[], recitationId: number): Promise<void> {
    console.log(`🔄 LOCAL STORAGE: Storing ${verses.length} verses for recitation ${recitationId}`);

    for (const verse of verses) {
      await this.storeVerse(verse, recitationId);
    }

    console.log(`✅ LOCAL STORAGE: Successfully stored ${verses.length} verses`);
  }

  /**
   * Récupère un verset stocké localement
   */
  async getStoredVerse(verseKey: string, recitationId: number): Promise<LocalVerse | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(
        `SELECT * FROM verses WHERE verse_key = ? AND recitation_id = ?`,
        [verseKey, recitationId]
      ) as LocalVerse | null;

      return result;
    } catch (error) {
      console.error(`❌ LOCAL STORAGE: Error getting verse ${verseKey}:`, error);
      return null;
    }
  }

  /**
   * Récupère les mots d'un verset
   */
  async getVerseWords(verseId: number): Promise<LocalWord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.getAllAsync(
        `SELECT * FROM words WHERE verse_id = ? ORDER BY position`,
        [verseId]
      ) as LocalWord[];

      return results || [];
    } catch (error) {
      console.error(`❌ LOCAL STORAGE: Error getting words for verse ${verseId}:`, error);
      return [];
    }
  }

  /**
   * Récupère les versets d'un chapitre
   */
  async getChapterVerses(chapterNumber: number, recitationId: number): Promise<{
    verse: LocalVerse;
    words: LocalWord[];
  }[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const verses = await this.db.getAllAsync(
        `SELECT * FROM verses WHERE chapter_number = ? AND recitation_id = ? ORDER BY verse_number`,
        [chapterNumber, recitationId]
      ) as LocalVerse[];

      const versesWithWords = [];

      for (const verse of verses) {
        const words = await this.getVerseWords(verse.id);
        versesWithWords.push({ verse, words });
      }

      return versesWithWords;
    } catch (error) {
      console.error(`❌ LOCAL STORAGE: Error getting chapter ${chapterNumber} verses:`, error);
      return [];
    }
  }

  /**
   * Récupère les récitateurs stockés
   */
  async getStoredReciters(): Promise<LocalReciter[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.getAllAsync(
        'SELECT * FROM reciters ORDER BY name'
      ) as LocalReciter[];

      return results || [];
    } catch (error) {
      console.error('❌ LOCAL STORAGE: Error getting reciters:', error);
      return [];
    }
  }

  /**
   * Vérifie si un chapitre est déjà stocké pour un récitateur
   */
  async isChapterStored(chapterNumber: number, recitationId: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(
        `SELECT COUNT(*) as count FROM verses WHERE chapter_number = ? AND recitation_id = ?`,
        [chapterNumber, recitationId]
      ) as { count: number };

      return result.count > 0;
    } catch (error) {
      console.error(`❌ LOCAL STORAGE: Error checking chapter ${chapterNumber}:`, error);
      return false;
    }
  }

  /**
   * Supprime les données d'un chapitre
   */
  async deleteChapterData(chapterNumber: number, recitationId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'DELETE FROM verses WHERE chapter_number = ? AND recitation_id = ?',
        [chapterNumber, recitationId]
      );

      console.log(`✅ LOCAL STORAGE: Deleted chapter ${chapterNumber} data for recitation ${recitationId}`);
    } catch (error) {
      console.error(`❌ LOCAL STORAGE: Error deleting chapter ${chapterNumber}:`, error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques de stockage
   */
  async getStorageStats(): Promise<{
    totalVerses: number;
    totalWords: number;
    totalReciters: number;
    totalChapters: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const verseCount = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM verses') as { count: number };
      const wordCount = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM words') as { count: number };
      const reciterCount = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM reciters') as { count: number };
      const chapterCount = await this.db.getFirstAsync('SELECT COUNT(DISTINCT chapter_number) as count FROM verses') as { count: number };

      return {
        totalVerses: verseCount.count,
        totalWords: wordCount.count,
        totalReciters: reciterCount.count,
        totalChapters: chapterCount.count,
      };
    } catch (error) {
      console.error('❌ LOCAL STORAGE: Error getting stats:', error);
      return { totalVerses: 0, totalWords: 0, totalReciters: 0, totalChapters: 0 };
    }
  }

  /**
   * Nettoie complètement la base de données
   */
  async clearDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execAsync(`
        DELETE FROM words;
        DELETE FROM verses;
        DELETE FROM reciters;
      `);

      console.log('✅ LOCAL STORAGE: Database cleared');
    } catch (error) {
      console.error('❌ LOCAL STORAGE: Error clearing database:', error);
      throw error;
    }
  }
}

export const localQuranStorage = new LocalQuranStorageService();