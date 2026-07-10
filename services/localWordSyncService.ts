/**
 * Service de synchronisation mot par mot local (sans API)
 * Calcule les timings intelligemment basé sur les caractéristiques des mots arabes
 */

export interface LocalWordTiming {
  wordIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number;
  arabicText: string;
  weight: number;
}

export interface LocalSyncResult {
  words: LocalWordTiming[];
  totalDuration: number;
  averageConfidence: number;
}

class LocalWordSyncService {

  /**
   * Génère des timings intelligents pour les mots d'un verset
   */
  generateWordTimings(
    words: string[],
    audioDuration: number,
    reciterStyle: 'slow' | 'moderate' | 'fast' = 'moderate'
  ): LocalSyncResult {
    console.log(`🎯 LOCAL SYNC: Generating timings for ${words.length} words over ${audioDuration}ms`);

    if (!words.length) {
      return { words: [], totalDuration: audioDuration, averageConfidence: 0 };
    }

    // Calculer le poids de chaque mot
    const wordWeights = words.map((word, index) => this.calculateWordWeight(word, index, words));
    const totalWeight = wordWeights.reduce((sum, weight) => sum + weight, 0);

    // Appliquer le style du récitateur
    const styleMultiplier = this.getStyleMultiplier(reciterStyle);
    const adjustedDuration = audioDuration * styleMultiplier;

    // Générer les timings
    const wordTimings: LocalWordTiming[] = [];
    let currentTime = 0;

    words.forEach((word, index) => {
      const wordWeight = wordWeights[index];
      const baseDuration = (adjustedDuration / totalWeight) * wordWeight;

      // Ajustements spéciaux
      const adjustedWordDuration = this.applySpecialAdjustments(
        word,
        baseDuration,
        index,
        words,
        reciterStyle
      );

      const startTime = Math.round(currentTime);
      const endTime = Math.round(currentTime + adjustedWordDuration);

      wordTimings.push({
        wordIndex: index,
        startTime,
        endTime,
        duration: endTime - startTime,
        confidence: this.calculateConfidence(word, index, words),
        arabicText: word,
        weight: wordWeight
      });

      currentTime += adjustedWordDuration;
    });

    // Normaliser pour s'assurer qu'on ne dépasse pas la durée audio
    this.normalizeTimings(wordTimings, audioDuration);

    const averageConfidence = wordTimings.reduce((sum, w) => sum + w.confidence, 0) / wordTimings.length;

    console.log(`✅ LOCAL SYNC: Generated ${wordTimings.length} word timings (avg confidence: ${(averageConfidence * 100).toFixed(0)}%)`);

    // Debug: Afficher quelques timings pour vérification
    if (wordTimings.length > 0) {
      console.log(`📊 Sample timings:`);
      const samples = [0, Math.floor(wordTimings.length / 2), wordTimings.length - 1];
      samples.forEach(i => {
        if (wordTimings[i]) {
          const w = wordTimings[i];
          console.log(`   Word ${i + 1}: "${w.arabicText}" → ${w.startTime}-${w.endTime}ms (${w.duration}ms, weight: ${w.weight.toFixed(2)})`);
        }
      });
    }

    return {
      words: wordTimings,
      totalDuration: audioDuration,
      averageConfidence
    };
  }

  /**
   * Trouve le mot actuel basé sur le temps de lecture avec progression monotone
   */
  getCurrentWordIndex(
    wordTimings: LocalWordTiming[],
    currentTime: number,
    previousWordIndex: number = -1
  ): number {
    if (!wordTimings.length || currentTime < 0) return -1;

    // RÈGLE 1: Ne jamais reculer (progression monotone comme QuranWBW)
    // Sauf si l'utilisateur a fait un seek manuel (détection d'un saut important)
    const hasUserSeeked = previousWordIndex >= 0 && Math.abs(currentTime - (wordTimings[previousWordIndex]?.startTime || 0)) > 2000;

    if (!hasUserSeeked && previousWordIndex >= 0) {
      // Chercher seulement en avant du mot actuel
      for (let i = previousWordIndex; i < wordTimings.length; i++) {
        const word = wordTimings[i];
        if (currentTime >= word.startTime && currentTime < word.endTime) {
          return i;
        }
        // Si on est passé le mot actuel, passer au suivant
        if (currentTime >= word.endTime && i === previousWordIndex) {
          continue;
        }
        // Si on est dans la zone du mot suivant
        if (currentTime >= word.startTime) {
          return i;
        }
      }

      // Si on n'a rien trouvé en avant, rester sur le mot actuel
      return previousWordIndex;
    }

    // RÈGLE 2: Recherche normale (pour le premier mot ou après un seek)
    for (let i = 0; i < wordTimings.length; i++) {
      const word = wordTimings[i];
      if (currentTime >= word.startTime && currentTime < word.endTime) {
        return i;
      }
    }

    // RÈGLE 3: Si pas de correspondance exacte, utiliser une logique progressive
    if (previousWordIndex >= 0 && !hasUserSeeked) {
      // Regarder si on est dans la zone de transition vers le mot suivant
      const currentWord = wordTimings[previousWordIndex];
      const nextWord = wordTimings[previousWordIndex + 1];

      if (currentWord && currentTime >= currentWord.endTime - 200) { // 200ms avant la fin
        if (nextWord && currentTime >= nextWord.startTime - 200) { // 200ms avant le début suivant
          return previousWordIndex + 1;
        }
      }

      return previousWordIndex; // Rester sur le mot actuel
    }

    // RÈGLE 4: Fallback - trouver le plus proche mais favoriser la progression
    let bestIndex = -1;
    let smallestDistance = Infinity;

    for (let i = Math.max(0, previousWordIndex); i < wordTimings.length; i++) {
      const word = wordTimings[i];
      const wordCenter = (word.startTime + word.endTime) / 2;
      const distance = Math.abs(currentTime - wordCenter);

      if (distance < smallestDistance) {
        smallestDistance = distance;
        bestIndex = i;
      }
    }

    return Math.max(bestIndex, previousWordIndex); // Ne jamais reculer
  }

  /**
   * Calcule le poids d'un mot basé sur ses caractéristiques
   */
  private calculateWordWeight(word: string, index: number, allWords: string[]): number {
    let weight = 1.0;

    // Poids basé sur la longueur visible (caractères réels, pas les diacritiques)
    const cleanWord = this.cleanArabicWord(word);
    const length = cleanWord.length;

    if (length <= 1) {
      weight = 0.4; // Très courts (articles, prépositions)
    } else if (length <= 2) {
      weight = 0.7; // Courts
    } else if (length <= 4) {
      weight = 1.0; // Moyens
    } else if (length <= 6) {
      weight = 1.4; // Longs
    } else {
      weight = 1.8; // Très longs
    }

    // Détection des marqueurs spéciaux
    if (this.isVerseSeparator(word)) {
      weight = 2.2; // Pause longue pour les séparateurs
    } else if (this.isPauseMarker(word)) {
      weight = 1.6; // Pause moyenne
    } else if (this.isSajdaMarker(word)) {
      weight = 2.8; // Pause très longue pour sajda
    }

    // Ajustements positionnels plus réalistes
    if (index === 0) {
      weight *= 1.3; // Premier mot plus lent (bismillah, etc.)
    }
    if (index === allWords.length - 1) {
      weight *= 1.4; // Dernier mot avec pause finale
    }

    // Milieu de verset souvent plus fluide
    const isMiddle = index > allWords.length * 0.3 && index < allWords.length * 0.7;
    if (isMiddle) {
      weight *= 0.95; // Légèrement plus rapide au milieu
    }

    // Détection des caractères de tajweed
    if (this.hasTajweedMarkers(word)) {
      weight *= 1.15; // Règles de tajweed ralentissent plus
    }

    // Mots avec beaucoup de consonnes (plus difficiles)
    const consonantRatio = this.getConsonantRatio(word);
    if (consonantRatio > 0.7) {
      weight *= 1.1;
    }

    return Math.max(0.3, Math.min(3.5, weight)); // Limiter entre 0.3 et 3.5
  }

  /**
   * Nettoie un mot arabe des diacritiques pour compter les vraies lettres
   */
  private cleanArabicWord(word: string): string {
    // Supprimer les diacritiques arabes
    return word.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
  }

  /**
   * Calcule le ratio de consonnes dans un mot
   */
  private getConsonantRatio(word: string): number {
    const cleanWord = this.cleanArabicWord(word);
    const vowels = ['ا', 'و', 'ي', 'ى', 'ة']; // Voyelles arabes approximatives
    let consonantCount = 0;

    for (const char of cleanWord) {
      if (!vowels.includes(char) && char.match(/[\u0600-\u06FF]/)) {
        consonantCount++;
      }
    }

    return cleanWord.length > 0 ? consonantCount / cleanWord.length : 0;
  }

  /**
   * Applique des ajustements spéciaux selon le contexte
   */
  private applySpecialAdjustments(
    word: string,
    baseDuration: number,
    index: number,
    allWords: string[],
    reciterStyle: string
  ): number {
    let adjustedDuration = baseDuration;

    // Ajustements selon le style du récitateur
    switch (reciterStyle) {
      case 'slow':
        adjustedDuration *= 1.4;
        break;
      case 'fast':
        adjustedDuration *= 0.7;
        break;
      default:
        // moderate - pas d'ajustement
        break;
    }

    // Ajustements selon la position dans le verset
    const isNearEnd = index > allWords.length * 0.8;
    if (isNearEnd) {
      adjustedDuration *= 1.1; // Fin de verset souvent plus lente
    }

    return adjustedDuration;
  }

  /**
   * Calcule la confiance de prédiction pour un mot
   */
  private calculateConfidence(word: string, index: number, allWords: string[]): number {
    let confidence = 0.7; // Base confidence

    // Plus de confiance pour les mots plus longs (plus prévisibles)
    if (word.length > 4) {
      confidence += 0.1;
    }

    // Plus de confiance pour les marqueurs spéciaux
    if (this.isVerseSeparator(word) || this.isPauseMarker(word)) {
      confidence += 0.2;
    }

    // Moins de confiance pour les mots très courts
    if (word.length <= 2) {
      confidence -= 0.1;
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Normalise les timings pour respecter la durée totale
   */
  private normalizeTimings(wordTimings: LocalWordTiming[], targetDuration: number): void {
    if (!wordTimings.length) return;

    const lastWord = wordTimings[wordTimings.length - 1];
    const currentTotalDuration = lastWord.endTime;

    if (Math.abs(currentTotalDuration - targetDuration) > 100) { // Plus de 100ms de différence
      const scaleFactor = targetDuration / currentTotalDuration;

      wordTimings.forEach(word => {
        word.startTime = Math.round(word.startTime * scaleFactor);
        word.endTime = Math.round(word.endTime * scaleFactor);
        word.duration = word.endTime - word.startTime;
      });

      console.log(`🔧 LOCAL SYNC: Normalized timings by factor ${scaleFactor.toFixed(3)}`);
    }
  }

  /**
   * Obtient le multiplicateur selon le style du récitateur
   */
  private getStyleMultiplier(style: string): number {
    switch (style) {
      case 'slow': return 1.2;
      case 'fast': return 0.85;
      default: return 1.0;
    }
  }

  /**
   * Détecte si un "mot" est un séparateur de verset
   */
  private isVerseSeparator(word: string): boolean {
    // Caractères couramment utilisés pour marquer la fin de verset
    const separatorChars = ['۝', '۞', '۩', '۪', '۫', '۬', 'ۭ', '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return separatorChars.some(char => word.includes(char));
  }

  /**
   * Détecte les marqueurs de pause
   */
  private isPauseMarker(word: string): boolean {
    const pauseChars = ['ۚ', '۝', '۞', '󠇄', '◯'];
    return pauseChars.some(char => word.includes(char));
  }

  /**
   * Détecte les marqueurs de sajda (prostration)
   */
  private isSajdaMarker(word: string): boolean {
    const sajdaChars = ['۩', '⋆'];
    return sajdaChars.some(char => word.includes(char)) || word.includes('سجدة');
  }

  /**
   * Détecte la présence de marqueurs de tajweed
   */
  private hasTajweedMarkers(word: string): boolean {
    // Détection basique des caractères de tajweed et diacritiques
    const tajweedChars = ['ً', 'ٌ', 'ٍ', 'َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ۡ', 'ۢ', 'ۣ', 'ۤ', 'ۥ', 'ۦ', 'ۧ', 'ۨ'];
    return tajweedChars.some(char => word.includes(char));
  }
}

// Instance singleton
export const localWordSyncService = new LocalWordSyncService();