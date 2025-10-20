/**
 * Service pour l'API Quran Foundation
 * Récupère les données de versets avec audio et timing mot par mot
 */

// Types pour les données de l'API
export interface QuranFoundationWord {
  id: number;
  position: number;
  audio_url: string;
  char_type_name: string;
  text_uthmani: string;
  text_imlaei: string;
  text_indopak: string;
  line_number: number;
  page_number: number;
  code_v1: string;
  code_v2: string;
  v1_page: number;
  v2_page: number;
  translation?: {
    text: string;
    language_name: string;
  };
}

export interface QuranFoundationAudio {
  url: string;
  duration: number;
  format: string;
  segments: Array<{
    start_time: number;
    end_time: number;
    duration: number;
    verse_key: string;
  }>;
}

export interface QuranFoundationVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  juz_number: number;
  hizb_number: number;
  rub_number: number;
  sajdah_type: string | null;
  sajdah_number: number | null;
  page_number: number;
  audio: QuranFoundationAudio;
  words: QuranFoundationWord[];
}

export interface QuranFoundationReciter {
  id: number;
  reciter_name: string;
  style: string;
  translated_name: {
    name: string;
    language_name: string;
  };
}

export interface QuranFoundationResponse<T> {
  verses?: T[];
  recitations?: QuranFoundationReciter[];
  meta: {
    current_page: number;
    next_page: number | null;
    prev_page: number | null;
    total_pages: number;
    total_count: number;
    links: {
      self: string;
      first: string;
      last: string;
      prev: string | null;
      next: string | null;
    };
    filters: Record<string, any>;
  };
}

class QuranFoundationAPIService {
  private baseURL = 'https://api.quran.com/api/v4';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // Configuration OAuth2
  private clientId = 'your_client_id'; // À configurer
  private clientSecret = 'your_client_secret'; // À configurer

  /**
   * Authentification OAuth2
   */
  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return; // Token encore valide
    }

    try {
      const response = await fetch(`${this.baseURL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      const tokenData = await response.json();

      if (tokenData.access_token) {
        this.accessToken = tokenData.access_token;
        this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
        console.log('✅ QURAN API: Authentication successful');
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('❌ QURAN API: Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Headers pour les requêtes authentifiées
   */
  private async getHeaders(): Promise<Record<string, string>> {
    await this.authenticate();

    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Récupère les versets d'une sourate avec audio et mots
   */
  async getChapterVerses(
    chapterNumber: number,
    recitationId: number = 7, // Par défaut : Mishary Rashid Alafasy
    options: {
      perPage?: number;
      page?: number;
      translations?: string;
      fields?: string;
      wordFields?: string;
    } = {}
  ): Promise<QuranFoundationResponse<QuranFoundationVerse>> {
    try {
      const headers = await this.getHeaders();

      const params = new URLSearchParams({
        recitation: recitationId.toString(),
        per_page: (options.perPage || 50).toString(),
        page: (options.page || 1).toString(),
      });

      // Champs par défaut pour avoir toutes les données nécessaires
      const defaultFields = 'verse_number,verse_key,page_number,juz_number,hizb_number,rub_number,sajdah_type,sajdah_number';
      const defaultWordFields = 'text_uthmani,text_imlaei,position,audio_url,char_type_name,line_number,page_number,code_v1,code_v2';

      if (options.fields) params.append('fields', options.fields);
      else params.append('fields', defaultFields);

      if (options.wordFields) params.append('word_fields', options.wordFields);
      else params.append('word_fields', defaultWordFields);

      if (options.translations) params.append('translations', options.translations);

      const url = `${this.baseURL}/chapters/${chapterNumber}/verses?${params.toString()}`;
      console.log(`🔍 QURAN API: Fetching chapter ${chapterNumber} verses from:`, url);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ QURAN API: Loaded ${data.verses?.length || 0} verses for chapter ${chapterNumber}`);

      return data;
    } catch (error) {
      console.error(`❌ QURAN API: Error fetching chapter ${chapterNumber}:`, error);
      throw error;
    }
  }

  /**
   * Récupère un verset spécifique avec ses données audio et mots
   */
  async getVerseByKey(
    verseKey: string, // Format: "1:1" (chapter:verse)
    recitationId: number = 7,
    options: {
      translations?: string;
      wordFields?: string;
    } = {}
  ): Promise<QuranFoundationVerse> {
    try {
      const headers = await this.getHeaders();

      const params = new URLSearchParams({
        recitation: recitationId.toString(),
      });

      const defaultWordFields = 'text_uthmani,text_imlaei,position,audio_url,char_type_name,line_number,page_number';

      if (options.wordFields) params.append('word_fields', options.wordFields);
      else params.append('word_fields', defaultWordFields);

      if (options.translations) params.append('translations', options.translations);

      const url = `${this.baseURL}/verses/by_key/${verseKey}?${params.toString()}`;
      console.log(`🔍 QURAN API: Fetching verse ${verseKey} from:`, url);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ QURAN API: Loaded verse ${verseKey} with ${data.verse?.words?.length || 0} words`);

      return data.verse;
    } catch (error) {
      console.error(`❌ QURAN API: Error fetching verse ${verseKey}:`, error);
      throw error;
    }
  }

  /**
   * Récupère la liste des récitateurs disponibles
   */
  async getRecitations(language = 'en'): Promise<QuranFoundationReciter[]> {
    try {
      const headers = await this.getHeaders();

      const params = new URLSearchParams({
        language: language,
      });

      const url = `${this.baseURL}/resources/recitations?${params.toString()}`;
      console.log('🔍 QURAN API: Fetching recitations from:', url);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ QURAN API: Loaded ${data.recitations?.length || 0} recitations`);

      return data.recitations || [];
    } catch (error) {
      console.error('❌ QURAN API: Error fetching recitations:', error);
      throw error;
    }
  }

  /**
   * Convertit les données de l'API en format compatible avec l'app
   */
  convertToAppFormat(verse: QuranFoundationVerse): {
    globalNumber: number;
    verseKey: string;
    arabicText: string;
    words: Array<{
      index: number;
      text: string;
      audioUrl: string;
      position: number;
    }>;
    audio: {
      url: string;
      duration: number;
      segments: Array<{
        startTime: number;
        endTime: number;
        duration: number;
      }>;
    };
  } {
    return {
      globalNumber: verse.id,
      verseKey: verse.verse_key,
      arabicText: verse.words.map(w => w.text_uthmani).join(' '),
      words: verse.words.map((word, index) => ({
        index,
        text: word.text_uthmani,
        audioUrl: word.audio_url,
        position: word.position,
      })),
      audio: {
        url: verse.audio.url,
        duration: verse.audio.duration,
        segments: verse.audio.segments.map(seg => ({
          startTime: seg.start_time,
          endTime: seg.end_time,
          duration: seg.duration,
        })),
      },
    };
  }

  /**
   * Configure les identifiants OAuth2
   */
  setCredentials(clientId: string, clientSecret: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null; // Reset token
    this.tokenExpiry = 0;
  }
}

export const quranFoundationAPI = new QuranFoundationAPIService();