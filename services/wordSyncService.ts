/**
 * Service de synchronisation mot par mot pour le Coran
 * Combine plusieurs sources de données pour un timing précis
 */

export interface WordTiming {
  wordIndex: number;
  arabicText: string;
  startTime: number; // en millisecondes
  endTime: number;
  duration: number;
  confidence: number; // 0-1, précision du timing
  tajweedInfo?: {
    type: 'prolongation' | 'pause' | 'emphasis' | 'normal';
    weight: number; // multiplicateur de durée
  };
}

export interface VerseTimingData {
  verseId: number;
  globalNumber: number;
  reciterCode: string;
  totalDuration: number;
  words: WordTiming[];
  source: 'quran-align' | 'estimated' | 'manual';
  accuracy: number;
  lastUpdated: string;
}

export interface ReciterTimingProfile {
  code: string;
  name: string;
  averageSpeed: number; // mots par minute
  pauseMultiplier: number;
  tajweedStyle: 'moderate' | 'extensive' | 'minimal';
  supportedVerses: number[];
}

class WordSyncService {
  private timingCache: Map<string, VerseTimingData> = new Map();
  private reciterProfiles: Map<string, ReciterTimingProfile> = new Map();

  constructor() {
    this.initializeReciterProfiles();
  }

  /**
   * Initialise les profils des récitateurs avec leurs caractéristiques
   */
  private initializeReciterProfiles() {
    const profiles: ReciterTimingProfile[] = [
      {
        code: 'ar.alafasy',
        name: 'Mishary Rashid Alafasy',
        averageSpeed: 85, // mots par minute
        pauseMultiplier: 1.3,
        tajweedStyle: 'extensive',
        supportedVerses: [] // À remplir avec les versets disponibles
      },
      {
        code: 'ar.husary',
        name: 'Mahmoud Khalil Al-Husary',
        averageSpeed: 75,
        pauseMultiplier: 1.5,
        tajweedStyle: 'extensive',
        supportedVerses: []
      },
      {
        code: 'ar.sudais',
        name: 'Abdul Rahman Al-Sudais',
        averageSpeed: 90,
        pauseMultiplier: 1.2,
        tajweedStyle: 'moderate',
        supportedVerses: []
      }
    ];

    profiles.forEach(profile => {
      this.reciterProfiles.set(profile.code, profile);
    });
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

    // Vérifier le cache
    if (this.timingCache.has(cacheKey)) {
      return this.timingCache.get(cacheKey)!;
    }

    let timingData: VerseTimingData;

    try {
      // 1. Essayer d'obtenir les données précises de quran-align
      timingData = await this.fetchQuranAlignData(globalNumber, reciterCode);
      console.log('✅ SYNC: Using quran-align data for verse', globalNumber);
    } catch (error) {
      // 2. Fallback : générer un timing intelligent basé sur le profil du récitateur
      console.log('⚠️ SYNC: Falling back to intelligent estimation for verse', globalNumber);
      timingData = await this.generateIntelligentTiming(
        globalNumber,
        reciterCode,
        arabicText,
        audioDuration
      );
    }

    // Mettre en cache
    this.timingCache.set(cacheKey, timingData);
    return timingData;
  }

  /**
   * Récupère les données de quran-align (GitHub)
   */
  private async fetchQuranAlignData(
    globalNumber: number,
    reciterCode: string
  ): Promise<VerseTimingData> {

    // Pour le moment, on simule l'indisponibilité des données quran-align
    // car l'API GitHub nécessite une structure spécifique
    console.log(`🔍 SYNC: Attempting to fetch quran-align data for verse ${globalNumber} with reciter ${reciterCode}`);

    // TODO: Implémenter la vraie récupération quran-align quand les données seront disponibles
    // const alignDataUrl = `https://raw.githubusercontent.com/cpfair/quran-align/master/output/${this.getQuranAlignReciterCode(reciterCode)}.json`;

    // Pour l'instant, on force le fallback intelligent
    throw new Error('Quran-align data temporarily unavailable - using intelligent estimation');
  }

  /**
   * Convertit les données quran-align au format interne
   */
  private convertQuranAlignToTimingData(
    alignData: any,
    globalNumber: number,
    reciterCode: string
  ): VerseTimingData {

    const words: WordTiming[] = alignData.words.map((word: any, index: number) => ({
      wordIndex: index,
      arabicText: word.text,
      startTime: Math.round(word.start * 1000), // Convertir en millisecondes
      endTime: Math.round(word.end * 1000),
      duration: Math.round((word.end - word.start) * 1000),
      confidence: word.confidence || 0.95,
      tajweedInfo: this.detectTajweedInfo(word.text)
    }));

    return {
      verseId: globalNumber,
      globalNumber,
      reciterCode,
      totalDuration: Math.max(...words.map(w => w.endTime)),
      words,
      source: 'quran-align',
      accuracy: 0.95,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Génère un timing intelligent basé sur l'analyse du texte
   */
  private async generateIntelligentTiming(
    globalNumber: number,
    reciterCode: string,
    arabicText: string,
    audioDuration: number
  ): Promise<VerseTimingData> {

    const reciterProfile = this.reciterProfiles.get(reciterCode);

    // Nettoyer et diviser le texte en mots
    const cleanText = this.cleanArabicText(arabicText);
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);

    // Analyser chaque mot pour déterminer sa durée relative
    const wordAnalysis = words.map((word, index) => ({
      text: word,
      index,
      weight: this.calculateWordWeight(word, index, words),
      tajweedInfo: this.detectTajweedInfo(word)
    }));

    // Calculer la durée totale pondérée
    const totalWeight = wordAnalysis.reduce((sum, word) => sum + word.weight, 0);

    // Générer les timings
    const timings: WordTiming[] = [];
    let currentTime = 0;

    wordAnalysis.forEach((wordInfo) => {
      const baseDuration = (audioDuration / totalWeight) * wordInfo.weight;

      // Appliquer les modifications du profil récitateur
      let adjustedDuration = baseDuration;
      if (reciterProfile) {
        adjustedDuration *= wordInfo.tajweedInfo?.weight || 1;
        if (wordInfo.tajweedInfo?.type === 'pause') {
          adjustedDuration *= reciterProfile.pauseMultiplier;
        }
      }

      const startTime = Math.round(currentTime);
      const endTime = Math.round(currentTime + adjustedDuration);

      timings.push({
        wordIndex: wordInfo.index,
        arabicText: wordInfo.text,
        startTime,
        endTime,
        duration: endTime - startTime,
        confidence: 0.75, // Estimation intelligente
        tajweedInfo: wordInfo.tajweedInfo
      });

      currentTime += adjustedDuration;
    });

    return {
      verseId: globalNumber,
      globalNumber,
      reciterCode,
      totalDuration: audioDuration,
      words: timings,
      source: 'estimated',
      accuracy: 0.75,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Nettoie le texte arabe des signes diacritiques pour l'analyse
   */
  private cleanArabicText(text: string): string {
    // Conserver les signes tajweed importants, supprimer les diacritiques mineurs
    return text
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // Supprimer les diacritiques
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim();
  }

  /**
   * Calcule le poids d'un mot pour déterminer sa durée relative
   */
  private calculateWordWeight(word: string, index: number, allWords: string[]): number {
    let weight = 1;

    // Longueur du mot (plus précis)
    const baseLength = word.replace(/[\u064B-\u0652\u0670]/g, '').length; // Sans diacritiques
    weight += baseLength * 0.15;

    // Position dans le verset avec courbe réaliste
    const position = index / (allWords.length - 1);
    if (position < 0.1 || position > 0.9) {
      weight *= 1.3; // Premier et dernier mots plus lents
    } else if (position > 0.4 && position < 0.6) {
      weight *= 1.1; // Milieu légèrement plus lent (respiration)
    }

    // Détection de voyelles longues et signes de prolongation
    const prolongationSigns = ['ا', 'و', 'ي', 'آ', 'أ', 'إ', 'ى'];
    const prolongationCount = prolongationSigns.reduce((count, sign) =>
      count + (word.match(new RegExp(sign, 'g')) || []).length, 0
    );
    if (prolongationCount > 1) {
      weight *= (1 + prolongationCount * 0.2);
    }

    // Signes de pause et arrêt
    if (word.includes('ۚ')) weight *= 1.5; // Pause obligatoire
    if (word.includes('ۖ')) weight *= 1.3; // Pause recommandée
    if (word.includes('ۗ')) weight *= 1.2; // Pause permise
    if (word.includes('ۘ')) weight *= 1.4; // Arrêt obligatoire

    // Mots de liaison et articles plus rapides
    const quickWords = ['وَ', 'فَ', 'بِ', 'لِ', 'مِن', 'إِلَى', 'عَلَى', 'فِي', 'مَع', 'قَد', 'لَا', 'مَا'];
    if (quickWords.some(qw => word.startsWith(qw) || word === qw)) {
      weight *= 0.7;
    }

    // Noms d'Allah et mots sacrés plus lents (respect)
    const sacredWords = ['اللَّهُ', 'اللَّهِ', 'اللَّه', 'الرَّحْمَٰنِ', 'الرَّحِيمِ', 'رَبِّ'];
    if (sacredWords.some(sw => word.includes(sw.replace(/[\u064B-\u0652\u0670]/g, '')))) {
      weight *= 1.4;
    }

    // Mots complexes avec beaucoup de consonnes
    const consonantPattern = /[بتثجحخدذرزسشصضطظعغفقكلمنهوي]/g;
    const consonants = (word.match(consonantPattern) || []).length;
    if (consonants > 4) {
      weight *= (1 + consonants * 0.05);
    }

    return Math.max(0.4, Math.min(2.5, weight)); // Limites ajustées
  }

  /**
   * Détecte les informations tajweed dans un mot
   */
  private detectTajweedInfo(word: string): WordTiming['tajweedInfo'] {
    // Pauses obligatoires et arrêts (priorité la plus élevée)
    if (word.includes('ۚ') || word.includes('ۘ')) {
      return { type: 'pause', weight: 1.8 }; // Pause obligatoire
    }

    // Pauses recommandées
    if (word.includes('ۖ') || word.includes('ۗ') || word.includes('ۙ')) {
      return { type: 'pause', weight: 1.4 }; // Pause recommandée
    }

    // Prolongations naturelles (voyelles longues multiples)
    const longVowels = ['ا', 'و', 'ي', 'آ', 'أ', 'إ', 'ى', 'ؤ', 'ئ'];
    let prolongationScore = 0;
    longVowels.forEach(vowel => {
      const matches = (word.match(new RegExp(vowel, 'g')) || []).length;
      if (matches > 0) prolongationScore += matches;
    });

    if (prolongationScore >= 2) {
      return { type: 'prolongation', weight: 1.2 + (prolongationScore * 0.1) };
    }

    // Emphases et lettres solaires
    const solarLetters = ['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن'];
    const hasEmphasis = word.includes('ۧ') || word.includes('ۨ') || word.includes('۩');

    if (hasEmphasis || solarLetters.some(letter => word.startsWith('ال' + letter))) {
      return { type: 'emphasis', weight: 1.2 };
    }

    // Mots contenant des lettres de gorge (plus lents)
    const throatLetters = ['ء', 'ه', 'ع', 'ح', 'غ', 'خ'];
    if (throatLetters.some(letter => word.includes(letter))) {
      return { type: 'emphasis', weight: 1.1 };
    }

    // Mots avec shadda (gémination) nécessitant plus de temps
    if (word.includes('ّ')) {
      return { type: 'emphasis', weight: 1.15 };
    }

    return { type: 'normal', weight: 1 };
  }

  /**
   * Convertit le code récitateur vers le format quran-align
   */
  private getQuranAlignReciterCode(reciterCode: string): string {
    const mapping: { [key: string]: string } = {
      'ar.alafasy': 'Alafasy',
      'ar.husary': 'Husary',
      'ar.sudais': 'Abdurrahmaan_As-Sudais_192kbps'
    };

    return mapping[reciterCode] || 'Alafasy';
  }

  /**
   * Trouve le mot actuel basé sur le temps de lecture
   */
  findCurrentWord(timingData: VerseTimingData, currentTime: number): number {
    for (let i = 0; i < timingData.words.length; i++) {
      const word = timingData.words[i];
      if (currentTime >= word.startTime && currentTime <= word.endTime) {
        return i;
      }
    }

    // Si aucun mot exact, trouver le plus proche
    return timingData.words.findIndex(word => word.startTime > currentTime) - 1;
  }

  /**
   * Nettoie le cache (utile pour les tests)
   */
  clearCache(): void {
    this.timingCache.clear();
  }

  /**
   * Obtient les statistiques du service
   */
  getStats(): { cacheSize: number; reciterCount: number } {
    return {
      cacheSize: this.timingCache.size,
      reciterCount: this.reciterProfiles.size
    };
  }
}

export const wordSyncService = new WordSyncService();