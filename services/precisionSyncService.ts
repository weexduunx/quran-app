/**
 * Service de synchronisation haute précision pour alignement parfait audio-texte
 * Utilise des techniques avancées pour éliminer complètement le retard
 */

export interface PrecisionWordTiming {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number; // 0-1
  isActive: boolean;
}

export interface PrecisionSyncConfig {
  audioBuffer: number; // Buffer audio en ms (défaut: 0)
  updateInterval: number; // Intervalle de mise à jour en ms (défaut: 16ms = 60fps)
  lookAheadTime: number; // Anticipation en ms (défaut: 50ms)
  precisionMode: boolean; // Mode haute précision
}

export class PrecisionSyncService {
  private words: PrecisionWordTiming[] = [];
  private currentWordIndex: number = -1;
  private audioStartTime: number = 0;
  private lastUpdateTime: number = 0;
  private config: PrecisionSyncConfig;
  private animationFrameId: number | null = null;

  // Performance optimizations
  private wordMap: Map<number, PrecisionWordTiming> = new Map();
  private sortedStartTimes: number[] = [];

  constructor(config: Partial<PrecisionSyncConfig> = {}) {
    this.config = {
      audioBuffer: 0, // Pas de buffer par défaut
      updateInterval: 16, // 60 FPS pour fluidité maximale
      lookAheadTime: 50, // Anticipation légère
      precisionMode: true,
      ...config
    };
  }

  /**
   * Initialise le service avec des données de timing précises
   */
  initialize(
    words: string[],
    totalDuration: number,
    reciterSpeed: number = 120 // Mots par minute
  ): PrecisionWordTiming[] {
    console.log(`🎯 PRECISION SYNC: Initializing with ${words.length} words`);

    // Nettoyage
    this.clearAnimationFrame();
    this.words = [];
    this.wordMap.clear();
    this.sortedStartTimes = [];
    this.currentWordIndex = -1;

    // Calcul de timing optimisé basé sur la vitesse réelle du récitateur
    const effectiveSpeed = this.calculateEffectiveSpeed(reciterSpeed);
    const timings = this.generateOptimizedTiming(words, totalDuration, effectiveSpeed);

    this.words = timings;

    // Créer une map pour accès O(1)
    timings.forEach(word => {
      this.wordMap.set(word.index, word);
      this.sortedStartTimes.push(word.startTime);
    });

    // Trier les temps de début pour recherche binaire
    this.sortedStartTimes.sort((a, b) => a - b);

    console.log(`✅ PRECISION SYNC: Initialized with timing optimization`);
    return this.words;
  }

  /**
   * Calcule la vitesse effective basée sur les caractéristiques du récitateur
   */
  private calculateEffectiveSpeed(baseSpeed: number): number {
    // Ajustements basés on les patterns observés des récitateurs
    const patterns = {
      fast: { min: 140, factor: 1.1 },
      medium: { min: 100, max: 140, factor: 1.0 },
      slow: { max: 100, factor: 0.9 }
    };

    if (baseSpeed >= patterns.fast.min) {
      return baseSpeed * patterns.fast.factor;
    } else if (baseSpeed <= patterns.slow.max!) {
      return baseSpeed * patterns.slow.factor;
    }

    return baseSpeed * patterns.medium.factor;
  }

  /**
   * Génère un timing optimisé avec distribution intelligente - VERSION RESTAURÉE
   */
  private generateOptimizedTiming(
    words: string[],
    totalDuration: number,
    effectiveSpeed: number
  ): PrecisionWordTiming[] {
    const timings: PrecisionWordTiming[] = [];

    // Calcul des poids intelligents pour chaque mot
    const weightedWords = words.map((word, index) => ({
      text: word,
      index,
      weight: this.calculateIntelligentWeight(word, index, words),
      difficulty: this.calculatePronunciationDifficulty(word)
    }));

    const totalWeight = weightedWords.reduce((sum, w) => sum + w.weight, 0);
    const baseTimePerUnit = totalDuration / totalWeight;

    let currentTime = 0;

    console.log(`🔧 INTELLIGENT TIMING: ${words.length} words, totalDuration: ${totalDuration}ms, totalWeight: ${totalWeight.toFixed(2)}`);

    weightedWords.forEach((wordData) => {
      // Calcul de durée avec compensation de latence
      const baseDuration = baseTimePerUnit * wordData.weight;
      const adjustedDuration = this.applyLatencyCompensation(baseDuration, wordData.difficulty);

      const startTime = Math.round(currentTime);
      const endTime = Math.round(currentTime + adjustedDuration);

      timings.push({
        index: wordData.index,
        text: wordData.text,
        startTime,
        endTime,
        confidence: this.calculateConfidence(wordData.weight, wordData.difficulty),
        isActive: false
      });

      console.log(`📍 Word ${wordData.index + 1}: "${wordData.text}" = ${startTime}-${endTime}ms (weight: ${wordData.weight.toFixed(2)}, duration: ${adjustedDuration.toFixed(0)}ms)`);

      currentTime += adjustedDuration;
    });

    return timings;
  }

  /**
   * Calcul intelligent du poids des mots - VERSION SIMPLIFIÉE pour meilleure distribution
   */
  private calculateIntelligentWeight(word: string, index: number, allWords: string[]): number {
    let weight = 1.0;

    // Simplifier les calculs pour une distribution plus équitable
    const length = word.length;
    if (length > 8) weight += 0.1;
    if (length <= 3) weight *= 0.8;

    // Mots très courants plus rapides
    const commonWords = ['في', 'من', 'إلى', 'على', 'مع', 'لا', 'ما'];
    if (commonWords.includes(word)) {
      weight *= 0.7;
    }

    // Garder les poids plus proches de 1.0 pour une distribution équitable
    return Math.max(0.6, Math.min(1.4, weight));
  }

  /**
   * Calcule la difficulté de prononciation
   */
  private calculatePronunciationDifficulty(word: string): number {
    let difficulty = 1.0;

    // Lettres difficiles à prononcer
    const difficultLetters = ['ع', 'غ', 'ق', 'ح', 'خ', 'ص', 'ض', 'ط', 'ظ'];
    const difficultCount = difficultLetters.reduce((count, letter) =>
      count + (word.split(letter).length - 1), 0
    );

    difficulty += difficultCount * 0.1;

    // Consonnes groupées
    const consonantGroups = word.match(/[بتثجحخدذرزسشصضطظعغفقكلمنهوي]{3,}/g);
    if (consonantGroups) {
      difficulty += consonantGroups.length * 0.15;
    }

    return Math.max(0.8, Math.min(1.5, difficulty));
  }

  /**
   * Applique la compensation de latence - VERSION CORRIGÉE
   */
  private applyLatencyCompensation(baseDuration: number, difficulty: number): number {
    // Compensation plus conservative pour éviter les décalages
    const latencyCompensation = -this.config.lookAheadTime * 0.5; // Réduction de moitié
    const difficultyAdjustment = baseDuration * (difficulty - 1) * 0.05; // Réduction de moitié

    return Math.max(100, baseDuration + latencyCompensation + difficultyAdjustment);
  }

  /**
   * Calcule le niveau de confiance
   */
  private calculateConfidence(weight: number, difficulty: number): number {
    const baseConfidence = 0.8;
    const weightFactor = Math.abs(weight - 1.0) * 0.1;
    const difficultyFactor = (difficulty - 1.0) * 0.1;

    return Math.max(0.3, Math.min(1.0, baseConfidence - weightFactor - difficultyFactor));
  }

  /**
   * Mise à jour haute précision avec requestAnimationFrame
   */
  startPrecisionTracking(getCurrentTime: () => number, onWordChange: (index: number) => void): void {
    this.clearAnimationFrame();

    const updateLoop = () => {
      const currentTime = getCurrentTime() - this.config.audioBuffer;
      const newWordIndex = this.findCurrentWordOptimized(currentTime);

      if (newWordIndex !== this.currentWordIndex && newWordIndex >= 0) {
        this.currentWordIndex = newWordIndex;

        // Marquer le mot comme actif
        this.words.forEach((word, index) => {
          word.isActive = index === newWordIndex;
        });

        onWordChange(newWordIndex);

        // Log pour debug
        const currentWord = this.words[newWordIndex];
        console.log(`🎯 PRECISION: Word ${newWordIndex + 1}/${this.words.length}: "${currentWord.text}" at ${currentTime.toFixed(1)}ms (${currentWord.startTime}-${currentWord.endTime}) [Conf: ${currentWord.confidence.toFixed(2)}]`);

        // Log détaillé des timings pour debug
        console.log(`📊 ALL WORD TIMINGS:`, this.words.map((w, i) => `Word ${i+1}: ${w.startTime}-${w.endTime}ms "${w.text}"`));
      }

      this.lastUpdateTime = performance.now();
      this.animationFrameId = requestAnimationFrame(updateLoop);
    };

    updateLoop();
  }

  /**
   * Recherche optimisée avec correction du bug de progression
   */
  private findCurrentWordOptimized(currentTime: number): number {
    if (this.words.length === 0) return -1;

    // Compensation d'anticipation légère
    const compensatedTime = currentTime + this.config.lookAheadTime;

    // Recherche séquentielle avec correction pour les zones de transition
    for (let i = 0; i < this.words.length; i++) {
      const word = this.words[i];

      // Log détaillé uniquement pour transitions importantes
      if (i === 0 || Math.abs(compensatedTime - word.startTime) < 200 || Math.abs(compensatedTime - word.endTime) < 200) {
        console.log(`🔍 Check word ${i + 1}: ${compensatedTime.toFixed(0)}ms vs ${word.startTime}-${word.endTime}ms "${word.text}"`);
      }

      // Condition principale: dans la plage du mot
      if (compensatedTime >= word.startTime && compensatedTime < word.endTime) {
        if (i !== this.currentWordIndex) {
          console.log(`✅ FOUND: Word ${i + 1} at ${compensatedTime.toFixed(0)}ms`);
        }
        return i;
      }
    }

    // Si on dépasse le dernier mot, retourner le dernier
    const lastWord = this.words[this.words.length - 1];
    if (compensatedTime >= lastWord.startTime) {
      console.log(`🏁 END: Using last word ${this.words.length} at ${compensatedTime.toFixed(0)}ms`);
      return this.words.length - 1;
    }

    // Si on est avant le premier mot, retourner le premier
    if (compensatedTime < this.words[0].startTime) {
      return 0;
    }

    console.log(`❌ NO MATCH: ${compensatedTime.toFixed(0)}ms`);
    return -1;
  }

  /**
   * Arrête le tracking
   */
  stopPrecisionTracking(): void {
    this.clearAnimationFrame();
  }

  /**
   * Nettoie les ressources
   */
  private clearAnimationFrame(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Force la synchronisation sur un mot spécifique
   */
  forceSyncToWord(audioTime: number, wordIndex: number): void {
    if (wordIndex >= 0 && wordIndex < this.words.length) {
      this.currentWordIndex = wordIndex;

      // Marquer comme actif
      this.words.forEach((word, index) => {
        word.isActive = index === wordIndex;
      });

      console.log(`🎯 PRECISION FORCE SYNC: Word ${wordIndex + 1} "${this.words[wordIndex].text}" at ${audioTime.toFixed(0)}ms`);
    }
  }

  /**
   * Obtient les statistiques de performance
   */
  getPerformanceStats() {
    const activeWord = this.words.find(w => w.isActive);
    const avgConfidence = this.words.reduce((sum, w) => sum + w.confidence, 0) / this.words.length;

    return {
      totalWords: this.words.length,
      currentWordIndex: this.currentWordIndex,
      currentWord: activeWord?.text || '',
      averageConfidence: avgConfidence,
      config: this.config,
      lastUpdateTime: this.lastUpdateTime
    };
  }

  /**
   * Obtient les données actuelles
   */
  getCurrentWords(): PrecisionWordTiming[] {
    return this.words;
  }

  /**
   * Reset complet
   */
  reset(): void {
    this.stopPrecisionTracking();
    this.words = [];
    this.wordMap.clear();
    this.sortedStartTimes = [];
    this.currentWordIndex = -1;
    this.lastUpdateTime = 0;
    console.log('🔄 PRECISION SYNC: Complete reset');
  }
}

// Instance singleton avec configuration haute performance
export const precisionSyncService = new PrecisionSyncService({
  audioBuffer: 0, // Pas de buffer pour réactivité maximale
  updateInterval: 16, // 60 FPS
  lookAheadTime: 30, // Anticipation réduite pour plus de précision
  precisionMode: true
});