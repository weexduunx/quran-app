/**
 * Service Tajweed pour l'apprentissage correct du Quran
 * Respecte les règles de récitation et les styles des Hafiz
 */

export interface TajweedRule {
  name: string;
  pattern: RegExp;
  elongationFactor: number; // Multiplicateur de durée
  pauseAfter?: number; // Pause en ms après le mot
  color?: string; // Couleur pour l'affichage
  description: string;
}

export interface ReciterStyle {
  id: string;
  name: string;
  nameArabic: string;
  category: 'hafiz' | 'qari' | 'imam';
  baseSpeed: number; // mots par minute
  tajweedEmphasis: number; // 1-3, niveau d'emphase sur le Tajweed
  characteristics: {
    maddDuration: number; // Durée des elongations (1-3)
    pauseDuration: number; // Durée des pauses (1-3)
    ghunnaDuration: number; // Durée du ghunna (1-3)
    qalqalahEmphasis: number; // Emphase sur qalqalah (1-3)
  };
}

export class TajweedService {
  // Règles principales du Tajweed
  private static readonly TAJWEED_RULES: TajweedRule[] = [
    // Madd (Elongations)
    {
      name: 'Madd Tabii',
      pattern: /[اوي](?=[^اوي\u064B-\u065F])|آ/g,
      elongationFactor: 1.5,
      color: '#4CAF50',
      description: 'Elongation naturelle (2 harakat)'
    },
    {
      name: 'Madd Wajib',
      pattern: /[اوي]ء/g,
      elongationFactor: 2.0,
      color: '#FF9800',
      description: 'Elongation obligatoire (4-6 harakat)'
    },
    {
      name: 'Madd Lazim',
      pattern: /[اوي](?=.*ّ.*ْ)|[اوي](?=.*ْ.*ّ)/g,
      elongationFactor: 2.5,
      color: '#F44336',
      description: 'Elongation nécessaire (6 harakat)'
    },

    // Ghunna (Nasalisation)
    {
      name: 'Ghunna',
      pattern: /[نم](?=[بپتثجحخدذرزسشصضطظعغفقكگلمنوهي])|ں|ن(?=ّ)|م(?=ّ)/g,
      elongationFactor: 1.3,
      color: '#9C27B0',
      description: 'Nasalisation'
    },

    // Qalqalah (Rebondissement)
    {
      name: 'Qalqalah',
      pattern: /[قطبجد](?=ْ)|[قطبجد]$/g,
      elongationFactor: 1.2,
      pauseAfter: 100,
      color: '#607D8B',
      description: 'Letters qui rebondissent'
    },

    // Ra (R roulé ou doux)
    {
      name: 'Ra Mufakham',
      pattern: /ر(?=[اوي])|ر(?=.*[اوي])/g,
      elongationFactor: 1.1,
      color: '#795548',
      description: 'Ra épais'
    },

    // Waqf (Arrêts)
    {
      name: 'Waqf Lazim',
      pattern: /م(?=\s|$)/g,
      elongationFactor: 1.0,
      pauseAfter: 300,
      color: '#E91E63',
      description: 'Arrêt obligatoire'
    },
    {
      name: 'Waqf Jaiz',
      pattern: /ج(?=\s|$)/g,
      elongationFactor: 1.0,
      pauseAfter: 200,
      color: '#FFC107',
      description: 'Arrêt permis'
    }
  ];

  // Styles de récitation des Hafiz et Qaris
  private static readonly RECITER_STYLES: Record<string, ReciterStyle> = {
    'ar.alafasy': {
      id: 'ar.alafasy',
      name: 'Mishary Rashid Alafasy',
      nameArabic: 'مشاري بن راشد العفاسي',
      category: 'qari',
      baseSpeed: 130,
      tajweedEmphasis: 3,
      characteristics: {
        maddDuration: 2.5,
        pauseDuration: 2,
        ghunnaDuration: 2,
        qalqalahEmphasis: 3
      }
    },
    'ar.sudais': {
      id: 'ar.sudais',
      name: 'Abdul Rahman Al-Sudais',
      nameArabic: 'عبد الرحمن السديس',
      category: 'imam',
      baseSpeed: 140,
      tajweedEmphasis: 2,
      characteristics: {
        maddDuration: 2,
        pauseDuration: 2,
        ghunnaDuration: 2,
        qalqalahEmphasis: 2
      }
    },
    'ar.husary': {
      id: 'ar.husary',
      name: 'Mahmoud Khalil Al-Husary',
      nameArabic: 'محمود خليل الحصري',
      category: 'hafiz',
      baseSpeed: 110,
      tajweedEmphasis: 3,
      characteristics: {
        maddDuration: 3,
        pauseDuration: 3,
        ghunnaDuration: 3,
        qalqalahEmphasis: 3
      }
    },
    'ar.ahmedalajamy': {
      id: 'ar.ahmedalajamy',
      name: 'Ahmed Al-Ajamy',
      nameArabic: 'أحمد بن علي العجمي',
      category: 'hafiz',
      baseSpeed: 120,
      tajweedEmphasis: 3,
      characteristics: {
        maddDuration: 2.5,
        pauseDuration: 2.5,
        ghunnaDuration: 2.5,
        qalqalahEmphasis: 3
      }
    }
  };

  /**
   * Analyse un texte arabe et applique les règles Tajweed
   */
  static analyzeTajweed(arabicText: string): Array<{
    text: string;
    rules: TajweedRule[];
    adjustedDuration: number;
    pauseAfter: number;
  }> {
    const words = arabicText.split(/\s+/).filter(word => word.trim().length > 0);

    return words.map(word => {
      const applicableRules: TajweedRule[] = [];
      let totalElongation = 1.0;
      let totalPause = 0;

      // Appliquer chaque règle Tajweed
      this.TAJWEED_RULES.forEach(rule => {
        if (rule.pattern.test(word)) {
          applicableRules.push(rule);
          totalElongation *= rule.elongationFactor;
          if (rule.pauseAfter) {
            totalPause = Math.max(totalPause, rule.pauseAfter);
          }
        }
      });

      return {
        text: word,
        rules: applicableRules,
        adjustedDuration: totalElongation,
        pauseAfter: totalPause
      };
    });
  }

  /**
   * Génère un timing respectueux du Tajweed pour un récitateur donné
   */
  static generateTajweedTiming(
    arabicText: string,
    totalDuration: number,
    reciterId: string
  ): Array<{
    text: string;
    startTime: number;
    endTime: number;
    tajweedRules: string[];
    color?: string;
  }> {
    const reciterStyle = this.RECITER_STYLES[reciterId] || this.RECITER_STYLES['ar.alafasy'];
    const tajweedAnalysis = this.analyzeTajweed(arabicText);

    // Calculer la durée totale ajustée
    const totalAdjustedDuration = tajweedAnalysis.reduce((sum, word) =>
      sum + word.adjustedDuration + (word.pauseAfter / 1000), 0
    );

    const timeScale = totalDuration / (totalAdjustedDuration * 1000);

    let currentTime = 0;

    return tajweedAnalysis.map(word => {
      const baseDuration = (word.adjustedDuration * timeScale * 1000);

      // Ajuster selon le style du récitateur
      const styleFactor = reciterStyle.characteristics.maddDuration / 2;
      const adjustedDuration = baseDuration * styleFactor;

      const startTime = currentTime;
      const endTime = currentTime + adjustedDuration;

      currentTime = endTime + (word.pauseAfter * reciterStyle.characteristics.pauseDuration / 2);

      return {
        text: word.text,
        startTime,
        endTime,
        tajweedRules: word.rules.map(rule => rule.name),
        color: word.rules[0]?.color || '#FFFFFF'
      };
    });
  }

  /**
   * Obtient les informations de style d'un récitateur
   */
  static getReciterStyle(reciterId: string): ReciterStyle {
    return this.RECITER_STYLES[reciterId] || this.RECITER_STYLES['ar.alafasy'];
  }

  /**
   * Obtient toutes les règles Tajweed
   */
  static getTajweedRules(): TajweedRule[] {
    return [...this.TAJWEED_RULES];
  }

  /**
   * Vérifie si un récitateur est un Hafiz
   */
  static isHafiz(reciterId: string): boolean {
    const style = this.getReciterStyle(reciterId);
    return style.category === 'hafiz';
  }

  /**
   * Obtient la couleur pour une règle Tajweed
   */
  static getTajweedColor(rules: string[]): string {
    const rule = this.TAJWEED_RULES.find(r => rules.includes(r.name));
    return rule?.color || '#FFFFFF';
  }
}