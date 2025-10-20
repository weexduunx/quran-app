/**
 * Service de synchronisation simplifié et robuste
 * Focus sur la simplicité et la fiabilité
 */

export interface SimpleWordTiming {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  weight: number; // Facteur de durée basé sur le contenu
}

export interface SimpleTimingData {
  verseId: number;
  words: SimpleWordTiming[];
  totalDuration: number;
  averageWordDuration: number;
}

class SimpleSyncService {
  private cache = new Map<string, SimpleTimingData>();
  private lastWordIndex = -1;
  private lastUpdateTime = 0;

  /**
   * Génère un timing simplifié mais efficace
   */
  generateSimpleTiming(
    verseId: number,
    arabicText: string,
    totalDuration: number,
    reciterSpeed: number = 100 // mots par minute
  ): SimpleTimingData {

    const cacheKey = `${verseId}-${Math.round(totalDuration)}-${reciterSpeed}`;
    if (this.cache.has(cacheKey)) {
      console.log(`🔄 CACHE HIT for key: ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    console.log(`🆕 CACHE MISS, generating new timing for key: ${cacheKey}`);

    // Nettoyage et extraction des mots
    const cleanText = this.cleanArabicText(arabicText);
    const words = cleanText.split(/\s+/).filter(word => word.trim().length > 0);

    console.log(`🔧 SIMPLE SYNC: Processing ${words.length} words for verse ${verseId}`);

    // Calcul des poids pour chaque mot
    const weightedWords = words.map((word, index) => ({
      text: word,
      index,
      weight: this.calculateSimpleWeight(word, index, words.length)
    }));

    // Calcul du timing basé sur les poids
    const totalWeight = weightedWords.reduce((sum, word) => sum + word.weight, 0);
    const baseTimePerUnit = totalDuration / totalWeight;

    // Génération des timings
    let currentTime = 0;
    const wordTimings: SimpleWordTiming[] = [];

    weightedWords.forEach((wordData) => {
      const duration = Math.round(baseTimePerUnit * wordData.weight);
      const startTime = Math.round(currentTime);
      const endTime = Math.round(currentTime + duration);

      wordTimings.push({
        index: wordData.index,
        text: wordData.text,
        startTime,
        endTime,
        duration,
        weight: wordData.weight
      });

      currentTime += duration;
    });

    const result: SimpleTimingData = {
      verseId,
      words: wordTimings,
      totalDuration,
      averageWordDuration: totalDuration / words.length
    };

    // Cache le résultat
    this.cache.set(cacheKey, result);

    console.log(`✅ SIMPLE SYNC: Generated timing - First word: "${wordTimings[0]?.text}" (${wordTimings[0]?.startTime}-${wordTimings[0]?.endTime}ms)`);

    return result;
  }

  /**
   * Trouve le mot actuel avec logique anti-répétition
   */
  findCurrentWordOptimized(timingData: SimpleTimingData, currentTime: number): number {
    // Éviter les mises à jour trop fréquentes (réduit à 20ms pour meilleure synchronisation)
    if (currentTime - this.lastUpdateTime < 20) {
      return this.lastWordIndex;
    }

    // Compensation du délai de traitement (avancer de 100ms pour anticiper)
    const compensatedTime = currentTime + 100;

    let foundIndex = -1;

    // Recherche séquentielle optimisée
    for (let i = 0; i < timingData.words.length; i++) {
      const word = timingData.words[i];

      if (compensatedTime >= word.startTime && compensatedTime < word.endTime) {
        foundIndex = i;
        break;
      }
    }

    // Si aucun mot exact, chercher le plus proche
    if (foundIndex === -1) {
      // Trouver le dernier mot dépassé avec compensation
      for (let i = timingData.words.length - 1; i >= 0; i--) {
        if (compensatedTime >= timingData.words[i].startTime) {
          foundIndex = i;
          break;
        }
      }
    }

    // TOUJOURS retourner un index valide, même si c'est le même
    if (foundIndex >= 0) {
      // Si c'est un nouveau mot, on log et met à jour
      if (foundIndex !== this.lastWordIndex) {
        this.lastWordIndex = foundIndex;
        this.lastUpdateTime = currentTime;

        const currentWord = timingData.words[foundIndex];
        console.log(`🎯 WORD HIGHLIGHT: ${foundIndex + 1}/${timingData.words.length}: "${currentWord.text}" at ${currentTime}ms (${currentWord.startTime}-${currentWord.endTime})`);
      }

      return foundIndex;
    }

    // Si aucun mot trouvé, retourner le dernier index valide ou 0
    return Math.max(0, this.lastWordIndex);
  }

  /**
   * Nettoyage du texte arabe
   */
  private cleanArabicText(text: string): string {
    return text
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // Supprimer diacritiques et tatweel
      .replace(/\s{2,}/g, ' ') // Normaliser espaces
      .trim();
  }

  /**
   * Calcul de poids optimisé pour des durées plus équilibrées
   */
  private calculateSimpleWeight(word: string, index: number, totalWords: number): number {
    let weight = 1.0;

    // Longueur de base (moins d'influence)
    const baseLength = word.length;
    if (baseLength > 5) weight += 0.15; // Réduit de 0.3 à 0.15
    if (baseLength > 8) weight += 0.10; // Réduit de 0.2 à 0.10

    // Position dans le verset (RÉDUIT)
    const position = index / Math.max(1, totalWords - 1);
    if (position <= 0.1 || position >= 0.9) {
      weight *= 1.1; // Réduit de 1.2 à 1.1
    }

    // Signes de pause
    if (word.includes('ۚ') || word.includes('ۖ')) {
      weight *= 1.25; // Réduit de 1.4 à 1.25
    }

    // Mots courts courants (PLUS agressif)
    const shortCommonWords = ['في', 'من', 'إلى', 'على', 'مع', 'لا', 'ما', 'قد', 'هو', 'هي', 'أن', 'إن', 'كان'];
    if (shortCommonWords.includes(word) || word.length <= 2) {
      weight *= 0.6; // Réduit de 0.7 à 0.6
    }

    // Noms d'Allah (moins d'influence)
    if (word.includes('الله') || word.includes('رب')) {
      weight *= 1.15; // Réduit de 1.3 à 1.15
    }

    // Voyelles longues (moins d'influence)
    const longVowelCount = (word.match(/[اوي]/g) || []).length;
    if (longVowelCount > 2) {
      weight *= (1 + longVowelCount * 0.05); // Réduit de 0.1 à 0.05
    }

    // Mots très courts = plus rapides
    if (word.length <= 3) {
      weight *= 0.8;
    }

    // Limites plus strictes pour éviter des durées trop longues
    return Math.max(0.4, Math.min(1.6, weight)); // De 0.5-2.0 à 0.4-1.6
  }

  /**
   * Reset pour nouveau verset
   */
  resetForNewVerse(): void {
    this.lastWordIndex = -1;
    this.lastUpdateTime = 0;
  }

  /**
   * Nettoyage du cache
   */
  clearCache(): void {
    this.cache.clear();
    this.resetForNewVerse();
  }

  /**
   * Statistiques
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      lastWordIndex: this.lastWordIndex,
      lastUpdateTime: this.lastUpdateTime
    };
  }
}

export const simpleSyncService = new SimpleSyncService();