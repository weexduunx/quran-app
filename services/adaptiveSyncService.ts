/**
 * Service de synchronisation adaptive pour un alignement parfait audio-texte
 * Se calibre automatiquement en temps réel sur l'audio
 */

export interface AdaptiveWordTiming {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
  actualStartTime?: number; // Temps réel détecté
  actualEndTime?: number;   // Temps réel détecté
  isCalibrated: boolean;
  confidence: number; // 0-1, fiabilité de la détection
}

export interface AdaptiveSyncData {
  verseId: number;
  words: AdaptiveWordTiming[];
  totalDuration: number;
  calibrationFactor: number; // Facteur de correction globale
  isFullyCalibrated: boolean;
  lastUpdateTime: number;
}

export class AdaptiveSyncService {
  private syncData: Map<string, AdaptiveSyncData> = new Map();
  private currentSyncData: AdaptiveSyncData | null = null;
  private calibrationPoints: Array<{time: number, wordIndex: number}> = [];
  private audioStartTime: number = 0;

  /**
   * Démarre une nouvelle session de synchronisation
   */
  startNewSession(verseId: number, words: string[], totalDuration: number): AdaptiveSyncData {
    console.log(`🎯 ADAPTIVE SYNC: Starting new session for verse ${verseId} with ${words.length} words`);

    // Créer un timing initial uniforme comme base
    const baseWordDuration = totalDuration / words.length;

    const adaptiveWords: AdaptiveWordTiming[] = words.map((word, index) => ({
      index,
      text: word,
      startTime: index * baseWordDuration,
      endTime: (index + 1) * baseWordDuration,
      isCalibrated: false,
      confidence: 0.1 // Très faible confiance au début
    }));

    this.currentSyncData = {
      verseId,
      words: adaptiveWords,
      totalDuration,
      calibrationFactor: 1.0,
      isFullyCalibrated: false,
      lastUpdateTime: Date.now()
    };

    this.calibrationPoints = [];
    this.audioStartTime = Date.now();

    return this.currentSyncData;
  }

  /**
   * Met à jour la synchronisation en temps réel
   */
  updateSync(currentAudioTime: number, forcedWordIndex?: number): number {
    if (!this.currentSyncData) return -1;

    const now = Date.now();

    // Si un index de mot est forcé (détection manuelle), l'utiliser pour calibrer
    if (forcedWordIndex !== undefined && forcedWordIndex >= 0) {
      this.addCalibrationPoint(currentAudioTime, forcedWordIndex);
    }

    // Recalculer le timing si nous avons des points de calibration
    if (this.calibrationPoints.length > 0) {
      this.recalibrateFromPoints();
    }

    // Trouver le mot actuel avec le timing recalibré
    const currentWordIndex = this.findCurrentWordWithAdaptation(currentAudioTime);

    // Logging détaillé pour debug
    if (currentWordIndex >= 0 && this.currentSyncData.words[currentWordIndex]) {
      const word = this.currentSyncData.words[currentWordIndex];
      console.log(`🎵 ADAPTIVE: Audio ${currentAudioTime.toFixed(0)}ms → Word ${currentWordIndex + 1}/${this.currentSyncData.words.length}: "${word.text}" (${word.startTime.toFixed(0)}-${word.endTime.toFixed(0)}ms) [Conf: ${word.confidence.toFixed(2)}]`);
    }

    return currentWordIndex;
  }

  /**
   * Ajoute un point de calibration pour améliorer la synchronisation
   */
  private addCalibrationPoint(audioTime: number, wordIndex: number): void {
    this.calibrationPoints.push({ time: audioTime, wordIndex });

    // Garder seulement les 10 derniers points pour éviter la dérive
    if (this.calibrationPoints.length > 10) {
      this.calibrationPoints = this.calibrationPoints.slice(-10);
    }

    console.log(`📍 CALIBRATION: Added point at ${audioTime.toFixed(0)}ms for word ${wordIndex + 1}`);
  }

  /**
   * Recalibre le timing basé sur les points de référence
   */
  private recalibrateFromPoints(): void {
    if (!this.currentSyncData || this.calibrationPoints.length < 2) return;

    // Calculer la régression linéaire pour déterminer le facteur de correction
    const points = this.calibrationPoints;
    const n = points.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    points.forEach(point => {
      const expectedTime = this.currentSyncData!.words[point.wordIndex]?.startTime || 0;
      sumX += expectedTime;
      sumY += point.time;
      sumXY += expectedTime * point.time;
      sumXX += expectedTime * expectedTime;
    });

    // Calcul de la pente (facteur de correction)
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Appliquer la correction à tous les mots
    this.currentSyncData.words.forEach((word, index) => {
      const correctedStart = word.startTime * slope + intercept;
      const correctedEnd = word.endTime * slope + intercept;

      word.startTime = correctedStart;
      word.endTime = correctedEnd;
      word.confidence = Math.min(1.0, 0.3 + (this.calibrationPoints.length * 0.1));
      word.isCalibrated = true;
    });

    this.currentSyncData.calibrationFactor = slope;
    this.currentSyncData.isFullyCalibrated = this.calibrationPoints.length >= 5;

    console.log(`🔧 RECALIBRATION: Applied factor ${slope.toFixed(3)}, offset ${intercept.toFixed(0)}ms with ${points.length} points`);
  }

  /**
   * Trouve le mot actuel avec adaptation dynamique
   */
  private findCurrentWordWithAdaptation(currentTime: number): number {
    if (!this.currentSyncData) return -1;

    const words = this.currentSyncData.words;

    // Recherche directe avec timing calibré
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (currentTime >= word.startTime && currentTime < word.endTime) {
        return i;
      }
    }

    // Si pas de correspondance exacte, trouver le mot le plus proche
    let closestIndex = -1;
    let smallestDistance = Infinity;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const distance = Math.abs(currentTime - (word.startTime + word.endTime) / 2);

      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  /**
   * Force la synchronisation sur un mot spécifique
   */
  forceSyncToWord(audioTime: number, wordIndex: number): void {
    if (!this.currentSyncData || wordIndex < 0 || wordIndex >= this.currentSyncData.words.length) {
      return;
    }

    this.addCalibrationPoint(audioTime, wordIndex);
    console.log(`🎯 FORCE SYNC: Manually synced word ${wordIndex + 1} at ${audioTime.toFixed(0)}ms`);
  }

  /**
   * Obtient les statistiques de synchronisation
   */
  getSyncStats(): {
    calibrationFactor: number;
    calibrationPoints: number;
    isFullyCalibrated: boolean;
    averageConfidence: number;
  } {
    if (!this.currentSyncData) {
      return {
        calibrationFactor: 1.0,
        calibrationPoints: 0,
        isFullyCalibrated: false,
        averageConfidence: 0
      };
    }

    const avgConfidence = this.currentSyncData.words.reduce((sum, word) => sum + word.confidence, 0) / this.currentSyncData.words.length;

    return {
      calibrationFactor: this.currentSyncData.calibrationFactor,
      calibrationPoints: this.calibrationPoints.length,
      isFullyCalibrated: this.currentSyncData.isFullyCalibrated,
      averageConfidence: avgConfidence
    };
  }

  /**
   * Prédit la fin probable de l'audio basé sur la progression actuelle
   */
  predictAudioEnd(currentTime: number, currentWordIndex: number): number {
    if (!this.currentSyncData || currentWordIndex < 0) {
      return this.currentSyncData?.totalDuration || 0;
    }

    const words = this.currentSyncData.words;
    const remainingWords = words.length - currentWordIndex - 1;

    if (remainingWords <= 0) {
      return currentTime + 100; // Presque fini
    }

    // Estimer le temps restant basé sur la vitesse actuelle
    const wordsProgressed = currentWordIndex + 1;
    const timePerWord = currentTime / wordsProgressed;
    const predictedEnd = currentTime + (remainingWords * timePerWord);

    return predictedEnd;
  }

  /**
   * Reset pour un nouveau verset
   */
  reset(): void {
    this.currentSyncData = null;
    this.calibrationPoints = [];
    this.audioStartTime = 0;
    console.log('🔄 ADAPTIVE SYNC: Reset for new verse');
  }

  /**
   * Obtient les données de synchronisation actuelles
   */
  getCurrentSyncData(): AdaptiveSyncData | null {
    return this.currentSyncData;
  }
}

// Instance singleton
export const adaptiveSyncService = new AdaptiveSyncService();