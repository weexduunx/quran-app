/**
 * Service de gestion des tafsirs audio en wolof
 */

export interface TafsirAudio {
  id: number;
  surahId: number;
  verseNumber?: number; // Si null, c'est pour toute la sourate
  hafizName: string;
  hafizNameArabic: string;
  duration: number; // en secondes
  audioUrl: string;
  language: 'wolof' | 'french' | 'arabic';
  title: string;
  description?: string;
  isLocal?: boolean; // Si le fichier est stocké localement
}

export interface TafsirHafiz {
  id: number;
  name: string;
  nameArabic: string;
  country: string;
  biography?: string;
  specialization: string; // Ex: "Tafsir en wolof", "Commentaires coraniques"
  audioCount: number; // Nombre de tafsirs disponibles
  featured?: boolean;
}

// Base de données temporaire des hafiz sénégalais (à remplacer par une vraie API)
export const senegalHafiz: TafsirHafiz[] = [
  {
    id: 1,
    name: 'Cheikh Ahmadou Bamba Mbacké',
    nameArabic: 'الشيخ أحمد بامبا أمباكي',
    country: 'Sénégal',
    biography: 'Fondateur de la confrérie mouride, grand érudit et poète.',
    specialization: 'Tafsir soufi en wolof',
    audioCount: 15,
    featured: true,
  },
  {
    id: 2,
    name: 'Cheikh Abdou Lahad Mbacké',
    nameArabic: 'الشيخ عبد الأحد أمباكي',
    country: 'Sénégal',
    biography: 'Fils du fondateur, continuateur de l\'œuvre de son père.',
    specialization: 'Commentaires coraniques en wolof',
    audioCount: 12,
    featured: true,
  },
  {
    id: 3,
    name: 'Cheikh Moutapha Sy',
    nameArabic: 'الشيخ مصطفى سي',
    country: 'Sénégal',
    biography: 'Grand maître de la Tijaniyya au Sénégal.',
    specialization: 'Tafsir tijani en wolof',
    audioCount: 8,
  },
  {
    id: 4,
    name: 'Cheikh Ahmed Tidiane Sy',
    nameArabic: 'الشيخ أحمد التجاني سي',
    country: 'Sénégal',
    biography: 'Érudit tijani, spécialisé dans l\'exégèse coranique.',
    specialization: 'Exégèse moderne en wolof',
    audioCount: 10,
  },
  {
    id: 5,
    name: 'Cheikh Omar Foutiyou Tall',
    nameArabic: 'الشيخ عمر الفوتي طال',
    country: 'Sénégal/Mali',
    biography: 'Conquérant et réformateur, grand connaisseur du Coran.',
    specialization: 'Jihad spirituel et tafsir',
    audioCount: 6,
  },
];

// Échantillon de tafsirs audio (simulation)
const sampleTafsirs: TafsirAudio[] = [
  {
    id: 1,
    surahId: 1,
    hafizName: 'Cheikh Ahmadou Bamba Mbacké',
    hafizNameArabic: 'الشيخ أحمد بامبا أمباكي',
    duration: 1200, // 20 minutes
    audioUrl: 'https://example.com/tafsir/al-fatiha-bamba.mp3',
    language: 'wolof',
    title: 'Tafsir de Al-Fatiha en wolof',
    description: 'Explication spirituelle de la sourate d\'ouverture selon l\'enseignement mouride.',
  },
  {
    id: 2,
    surahId: 2,
    verseNumber: 255, // Ayat Al-Kursi
    hafizName: 'Cheikh Moutapha Sy',
    hafizNameArabic: 'الشيخ مصطفى سي',
    duration: 1800, // 30 minutes
    audioUrl: 'https://example.com/tafsir/ayat-kursi-sy.mp3',
    language: 'wolof',
    title: 'Explication d\'Ayat Al-Kursi',
    description: 'Commentaire approfondi du verset du Trône selon la tradition tijane.',
  },
  {
    id: 3,
    surahId: 112,
    hafizName: 'Cheikh Ahmed Tidiane Sy',
    hafizNameArabic: 'الشيخ أحمد التجاني سي',
    duration: 900, // 15 minutes
    audioUrl: 'https://example.com/tafsir/al-ikhlas-tidiane.mp3',
    language: 'wolof',
    title: 'Tafsir de Al-Ikhlas',
    description: 'L\'unicité divine expliquée en langue wolof.',
  },
  {
    id: 4,
    surahId: 36,
    hafizName: 'Cheikh Abdou Lahad Mbacké',
    hafizNameArabic: 'الشيخ عبد الأحد أمباكي',
    duration: 2400, // 40 minutes
    audioUrl: 'https://example.com/tafsir/ya-sin-abdoulahad.mp3',
    language: 'wolof',
    title: 'Commentaire de Sourate Ya-Sin',
    description: 'Explication détaillée du "cœur du Coran" en wolof.',
  }
];

class TafsirService {
  private tafsirs: TafsirAudio[] = sampleTafsirs;
  private hafiz: TafsirHafiz[] = senegalHafiz;

  /**
   * Récupère tous les hafiz disponibles
   */
  getHafizList(): TafsirHafiz[] {
    return this.hafiz.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Recherche les tafsirs pour une sourate
   */
  getTafsirsBySurah(surahId: number): TafsirAudio[] {
    return this.tafsirs.filter(tafsir => tafsir.surahId === surahId);
  }

  /**
   * Recherche les tafsirs pour un verset spécifique
   */
  getTafsirsByVerse(surahId: number, verseNumber: number): TafsirAudio[] {
    return this.tafsirs.filter(tafsir =>
      tafsir.surahId === surahId &&
      (tafsir.verseNumber === verseNumber || tafsir.verseNumber === undefined)
    );
  }

  /**
   * Récupère tous les tafsirs d'un hafiz
   */
  getTafsirsByHafiz(hafizId: number): TafsirAudio[] {
    const hafiz = this.hafiz.find(h => h.id === hafizId);
    if (!hafiz) return [];

    return this.tafsirs.filter(tafsir => tafsir.hafizName === hafiz.name);
  }

  /**
   * Recherche des tafsirs par mot-clé
   */
  searchTafsirs(query: string): TafsirAudio[] {
    const searchTerm = query.toLowerCase();
    return this.tafsirs.filter(tafsir =>
      tafsir.title.toLowerCase().includes(searchTerm) ||
      tafsir.hafizName.toLowerCase().includes(searchTerm) ||
      tafsir.description?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Récupère un tafsir par son ID
   */
  getTafsirById(id: number): TafsirAudio | undefined {
    return this.tafsirs.find(tafsir => tafsir.id === id);
  }

  /**
   * Récupère les tafsirs populaires/recommandés
   */
  getFeaturedTafsirs(): TafsirAudio[] {
    // Retourne les tafsirs des hafiz "featured"
    const featuredHafizNames = this.hafiz
      .filter(h => h.featured)
      .map(h => h.name);

    return this.tafsirs.filter(tafsir =>
      featuredHafizNames.includes(tafsir.hafizName)
    );
  }

  /**
   * Vérifie si un tafsir est disponible pour une sourate
   */
  hasTafsirForSurah(surahId: number): boolean {
    return this.tafsirs.some(tafsir => tafsir.surahId === surahId);
  }

  /**
   * Construit l'URL de streaming pour un tafsir
   */
  getTafsirStreamUrl(tafsirId: number): string | null {
    const tafsir = this.getTafsirById(tafsirId);
    if (!tafsir) return null;

    // En développement, on peut retourner une URL de test
    if (__DEV__) {
      return `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${tafsirId}.mp3`;
    }

    return tafsir.audioUrl;
  }

  /**
   * Formate la durée en format lisible
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m ${secs}s`;
    }
  }

  /**
   * Récupère les statistiques
   */
  getStats(): {
    totalTafsirs: number;
    totalHafiz: number;
    averageDuration: number;
    byLanguage: { [lang: string]: number };
  } {
    const byLanguage = this.tafsirs.reduce((acc, tafsir) => {
      acc[tafsir.language] = (acc[tafsir.language] || 0) + 1;
      return acc;
    }, {} as { [lang: string]: number });

    const averageDuration = this.tafsirs.reduce((sum, tafsir) => sum + tafsir.duration, 0) / this.tafsirs.length;

    return {
      totalTafsirs: this.tafsirs.length,
      totalHafiz: this.hafiz.length,
      averageDuration: Math.round(averageDuration),
      byLanguage
    };
  }
}

export const tafsirService = new TafsirService();