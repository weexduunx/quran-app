import { TafsirContent, TafsirBook } from '@/stores/tafsirStore';

class TafsirApiService {
  private baseUrl = 'https://api.quranunlocked.com'; // API exemple

  // Méthode pour récupérer le contenu d'un tafsir
  async getTafsirContent(bookId: number, surahId: number, verseId: number): Promise<TafsirContent | null> {
    try {
      // Pour le moment, simulons des données
      // Dans une vraie application, vous feriez un appel API ici
      const mockTafsirData = await this.getMockTafsirData(bookId, surahId, verseId);
      return mockTafsirData;
    } catch (error) {
      console.error('Erreur lors de la récupération du tafsir:', error);
      return null;
    }
  }

  // Méthode pour récupérer tout le tafsir d'une sourate
  async getSurahTafsir(bookId: number, surahId: number): Promise<TafsirContent[]> {
    try {
      // Simulation d'un appel API pour récupérer tout le tafsir d'une sourate
      const mockData: TafsirContent[] = [];

      // Générer des données simulées pour 10 versets par exemple
      for (let verseId = 1; verseId <= 10; verseId++) {
        const content = await this.getMockTafsirData(bookId, surahId, verseId);
        if (content) {
          mockData.push(content);
        }
      }

      return mockData;
    } catch (error) {
      console.error('Erreur lors de la récupération du tafsir de la sourate:', error);
      return [];
    }
  }

  // Données simulées pour les différents tafsirs
  private async getMockTafsirData(bookId: number, surahId: number, verseId: number): Promise<TafsirContent | null> {
    const tafsirContents: { [key: number]: (surahId: number, verseId: number) => TafsirContent } = {
      // Ibn Kathir
      1: (surahId, verseId) => ({
        id: parseInt(`${bookId}${surahId}${verseId}`),
        bookId,
        surahId,
        verseId,
        content: `Tafsir Ibn Kathir pour la sourate ${surahId}, verset ${verseId}: Ce verset révèle la miséricorde d'Allah et appelle les croyants à la réflexion sur Ses signes dans la création. Les compagnons du Prophète (paix et bénédictions sur lui) ont rapporté que ce passage était souvent récité lors des prières de nuit.`,
        contentArabic: 'قال ابن كثير رحمه الله: هذه الآية تدل على رحمة الله الواسعة وتدعو المؤمنين إلى التفكر في آيات الله في الخلق',
        reference: 'Tafsir Ibn Kathir, Vol. 1, p. 234'
      }),

      // At-Tabari
      2: (surahId, verseId) => ({
        id: parseInt(`${bookId}${surahId}${verseId}`),
        bookId,
        surahId,
        verseId,
        content: `Tafsir At-Tabari pour la sourate ${surahId}, verset ${verseId}: At-Tabari explique que ce verset établit un principe fondamental de la foi islamique. Il cite plusieurs hadiths authentiques du Prophète (paix et bénédictions sur lui) qui élucident le sens profond de ces paroles divines.`,
        contentArabic: 'قال الطبري رحمه الله: هذه الآية تؤسس مبدأ أساسيا من مبادئ العقيدة الإسلامية',
        reference: 'Jami\' al-Bayan, At-Tabari'
      }),

      // Hady Niasse (en Wolof avec audio)
      6: (surahId, verseId) => ({
        id: parseInt(`${bookId}${surahId}${verseId}`),
        bookId,
        surahId,
        verseId,
        content: `Tafsir bu Serigne Hady Niasse ci sourate ${surahId}, verset ${verseId}: Boole ayah bi dafay wone ne Allah subhanahu wa ta'ala dafay wax ak nun ci seen dooleel ak seen gongue. Mu dafay jaay nun bañ tàng ci lu nekk, bañ xool ay alama yu Allah defar ci alamdun. Seen yaram ak yaram ñu nekk nala nu jang ni Allah moo feeñal ak ni nu war a toppat doolee géej gii.

        Serigne Hady Niasse dafay wax ni verset bii dafay jaay nun baax lepp-lepp, ndax am na enjoo yu gudde yu ñu mën a gis ci biir Islam ak ci biir séne kàddu.`,
        reference: 'Tafsir Hady Niasse - Explication en Wolof',
        audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3',
        audioDuration: 180
      }),

      // Imam Moustapha Gueye (en Wolof avec audio)
      7: (surahId, verseId) => ({
        id: parseInt(`${bookId}${surahId}${verseId}`),
        bookId,
        surahId,
        verseId,
        content: `Xibar wu Imam Moustapha Gueye ci sourate ${surahId}, verset ${verseId}: Ayah bii dafay jar nun ak yoon wi nettali Islam. Mu dafay jaay nun ni nu war a defar gëstu yalla, te ni Allah subhanahu wa ta'ala dafay feeñal ak yaram yu nekk ci suuf.

        Imam Moustapha Gueye dafay wax ni ayah bii am na jaay juróom ñenti: juróom ji ci biir tawheed, ji ci biir akhlaq, te ji ci biir seen yakar. Te Yalla dafay jaay nun ak mooy seen Borom ak seen Jàng.

        Sama yaram ñu nekk, nu tàng ne jaay gii nekk na ci anam bi lepp.`,
        reference: 'Imam Moustapha Gueye - Tafsir en Wolof',
        audioUrl: 'https://sample-videos.com/zip/10/mp3/mp3-sample-1.mp3',
        audioDuration: 240
      }),

      // Sayyid Qutb
      4: (surahId, verseId) => ({
        id: parseInt(`${bookId}${surahId}${verseId}`),
        bookId,
        surahId,
        verseId,
        content: `Analyse de Sayyid Qutb pour la sourate ${surahId}, verset ${verseId}: Ce verset présente une vision holistique de la vie islamique, intégrant la spiritualité dans tous les aspects de l'existence humaine. Qutb souligne comment ce passage établit les fondements d'une société islamique juste et équilibrée.

        L'auteur met l'accent sur l'application pratique de ces enseignements dans le contexte moderne, montrant comment les principes coraniques restent pertinents pour résoudre les défis contemporains.`,
        contentArabic: 'يقول سيد قطب: هذه الآية تقدم رؤية شاملة للحياة الإسلامية',
        reference: 'Fi Zilal al-Quran, Sayyid Qutb'
      })
    };

    const contentGenerator = tafsirContents[bookId];
    if (contentGenerator) {
      return contentGenerator(surahId, verseId);
    }

    // Cas spécial pour Cheikh Ahmadou Bamba
    if (bookId === 8) {
      return this.getAhmadouBambaTafsir(surahId, verseId);
    }

    return null;
  }

  // Ajouter un tafsir pour Cheikh Ahmadou Bamba
  private getAhmadouBambaTafsir(surahId: number, verseId: number): TafsirContent {
    return {
      id: parseInt(`8${surahId}${verseId}`),
      bookId: 8,
      surahId,
      verseId,
      content: `Tafsir bu Cheikh Ahmadou Bamba ci sourate ${surahId}, verset ${verseId}: Boole ayah bi dafay jar ak hikma yu Yalla defar seen khalq yi. Cheikh Ahmadou Bamba dafay jaay nun ni Islam dafay am ja ci biir tasawwuf ak tawheed. Mu dafay wax ni verset bii dafay jaay nun bañ toppat Allah ñaay ñu, bañ def seen kàddu.

      Ci biir tariqat Mouride, ayah bii dafay jaay nun ni khidma ak seen Borom moo nekk seen njuumaante yu wëy. Dooleel gii ci Alquraan bi, dafay jar seen yakar ci biir seen dém.`,
      reference: 'Archives Mourides - Touba',
      audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg',
      audioDuration: 300
    };
  }

  // Méthode pour rechercher dans les tafsirs
  async searchTafsir(query: string, bookId?: number): Promise<TafsirContent[]> {
    try {
      // Simulation d'une recherche
      const results: TafsirContent[] = [];

      // Dans une vraie application, vous feriez une recherche dans la base de données
      // ou via une API de recherche

      return results;
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      return [];
    }
  }

  // Méthode pour précharger le contenu audio
  async preloadAudioContent(bookId: number, surahId: number, verseId: number): Promise<boolean> {
    try {
      const content = await this.getTafsirContent(bookId, surahId, verseId);
      return !!(content && content.audioUrl);
    } catch (error) {
      console.error('Erreur lors du préchargement audio:', error);
      return false;
    }
  }

  // Méthode pour obtenir la liste des versets disponibles pour un tafsir audio
  async getAvailableAudioVerses(bookId: number, surahId: number): Promise<number[]> {
    // Pour les tafsirs wolof, on simule la disponibilité de tous les versets
    if (bookId >= 6 && bookId <= 8) {
      // Retourner une liste d'exemple de versets disponibles
      return Array.from({ length: 20 }, (_, i) => i + 1); // Versets 1-20 disponibles
    }
    return [];
  }

  // Vérifier si un tafsir a du contenu audio
  isAudioTafsir(bookId: number): boolean {
    return bookId >= 6 && bookId <= 8; // Tafsirs wolof ont l'audio
  }
}

export const tafsirApi = new TafsirApiService();