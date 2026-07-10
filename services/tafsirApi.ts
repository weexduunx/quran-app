import { TafsirContent, TafsirBook } from '@/stores/tafsirStore';

// Fichiers réels du tafsir audio en wolof de Cheikh Ibrahima Niasse (Baye Niasse),
// hébergés sur Internet Archive : https://archive.org/details/Tafsir-Baye-NIASS
// Sourates 41, 42 et 43 ne sont pas disponibles dans cette collection.
const BAYE_NIASSE_ARCHIVE_BASE = 'https://archive.org/download/Tafsir-Baye-NIASS';
const BAYE_NIASSE_FILES: { [surahNumber: number]: string } = {
  1: '001 - Fatiha.mp3',
  // La sourate 2 (Baqara) est découpée en 4 fichiers, gérée séparément ci-dessous
  3: '003 - Al Imrâne.mp3',
  4: '004 - An Nissa.mp3',
  5: '005 - Mâ idah.mp3',
  6: '006 - An Ame.mp3',
  7: '007 - Al Ahraf.mp3',
  8: '008 - AL Anfal.mp3',
  9: '009 - Tawba.mp3',
  10: '010 - Yunuss.mp3',
  11: '011 - Houd.mp3',
  12: '012 - Youssoufa.mp3',
  13: "013 - Ar- Ra'ad.mp3",
  14: '014 - Ibrahima.mp3',
  15: '015 - Al Hijr.mp3',
  16: '016 - An Nahl.mp3',
  17: '017 - Al Isra.mp3',
  18: '018 - Al Kahf.mp3',
  19: '019 - Maryam_.mp3',
  20: '020 - Taahaa.mp3',
  21: '021 - Al Anbiyaa.mp3',
  22: '022 - Al Hajji.mp3',
  23: '023 - Muminune.mp3',
  24: '024 - An Nur.mp3',
  25: '025 - Fourkhân.mp3',
  26: "026 - Chou'anrâ'i.mp3",
  27: '027 - An Naml.mp3',
  28: '028 - Al Khassas.mp3',
  29: '029 - Al Ankabout.mp3',
  30: '030 - Ar Roum.mp3',
  31: '031 - Louqman.mp3',
  32: '032 - As Sadjdatou.mp3',
  33: '033 - Al Ahzab.mp3',
  34: '034 - Sabâ.mp3',
  35: '035 - Fâtiroun.mp3',
  36: '036 - Yâ-sin.mp3',
  37: '037 - As Saffat_a1-a144.mp3',
  38: '038 - Saad_a36-88.mp3',
  39: '039 - Az Zumar.mp3',
  40: '040 - Ghaafir_a1-19.mp3',
  // 41, 42, 43 : non disponibles dans cette collection
  44: '044 - Ad Doukhaane.mp3',
  45: '045 - Al Jâthiya.mp3',
  46: '046 - Al Ahqaf.mp3',
  47: '047 - Mouhammad.mp3',
  48: '048 - Al Fath.mp3',
  49: '049 - Al Hujurat.mp3',
  50: '050 - Qaf.mp3',
  51: '051 - Adh Dhariyat.mp3',
  52: '052 - At Tur_a22-fin.mp3',
  53: '053 - An Nadjm.mp3',
  54: '054 - Al Qamar.mp3',
  55: '055 - Ar Rahmane.mp3',
  56: "056 - Al Waaqi'a.mp3",
  57: '057 - Al Hadiid.mp3',
  58: '058 - Al Mujadala.mp3',
  59: '059 - Al Hashr.mp3',
  60: '060 - Al Mumtahana.mp3',
  61: '061 - As Saffi.mp3',
  62: "062 - Al Jumu'a.mp3",
  63: '063 - Al Munafiquna.mp3',
  64: '064 - Taghabuni.mp3',
  65: '065 - At Talâqi.mp3',
  66: '066 - At Tahrîm.mp3',
  67: '067 - Al Mulk.mp3',
  68: '068 - Al Qalam.mp3',
  69: '069 - Al Haaqqah.mp3',
  70: "070 - Al Ma'anriji.mp3",
  71: '071 - Nûh.mp3',
  72: '072 - Al Jinn.mp3',
  73: '073 - Al Muzamillu.mp3',
  74: '074 - Al Mudasiru.mp3',
  75: '075 - Al Qiyaama.mp3',
  76: '076 - Al Insaan.mp3',
  77: '077 - Al Mursalaat.mp3',
  78: '078 - An Naba-i.mp3',
  79: "079 - An Naazi'a.mp3",
  80: '080 - Abasa.mp3',
  81: '081 - At Takwiir.mp3',
  82: '082 - Al Infitaar.mp3',
  83: '083 - Al Mutaffifiin.mp3',
  84: '084 - Al Inshiqaaq.mp3',
  85: '085 - Al Buruuji.mp3',
  86: '086 - At Taariqi.mp3',
  87: "087 - Al A'laa.mp3",
  88: '088 - Al Ghaashiya.mp3',
  89: '089 - Al Fajr.mp3',
  90: '090 - Al Balad.mp3',
  91: '091 - Al Shamsu.mp3',
  92: '092 - Al leyli.mp3',
  93: '093 - Ad Duhaa.mp3',
  94: '094 - Alam Nashrah.mp3',
  95: '095 - At Tiini.mp3',
  96: '096 - Al Alaqi.mp3',
  97: '097 - Al Qadr.mp3',
  98: '098 - Al Baynatu.mp3',
  99: '099 - Az Zulzilatu.mp3',
  100: '100 - Al Adiyaat.mp3',
  101: "101 - Al Qari'aat.mp3",
  102: '102 - At Takasuru.mp3',
  103: '103 - Al Asr.mp3',
  104: '104 - Al Hummazati.mp3',
  105: '105 - Al Fiili.mp3',
  106: '106 - Al Qurayshi.mp3',
  107: "107 - Al Mâ'uun.mp3",
  108: '108 - Al Kawsara.mp3',
  109: '109 - Al Kaafirun.mp3',
  110: '110 - An Nasr.mp3',
  111: '111 - Al Masad.mp3',
  112: '112 - Al Ikhlass.mp3',
  113: '113 - Al Falaq.mp3',
  114: '114 - An Naas.mp3',
};

function getBayeNiasseAudioUrl(surahId: number, verseId: number): string | undefined {
  let filename: string | undefined;

  if (surahId === 2) {
    // Al-Baqara est découpée en 4 fichiers par plage de versets
    if (verseId <= 58) filename = '002 - Baqara 1.mp3';
    else if (verseId <= 141) filename = '002 - Baqara 2.mp3';
    else if (verseId <= 238) filename = '002 - Baqara 3.mp3';
    else filename = '002 - Baqara 4.mp3';
  } else {
    filename = BAYE_NIASSE_FILES[surahId];
  }

  return filename ? `${BAYE_NIASSE_ARCHIVE_BASE}/${encodeURIComponent(filename)}` : undefined;
}

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

      // Cheikh Ibrahima Niasse / Baye Niasse (en Wolof avec audio réel, sourate par sourate)
      6: (surahId, verseId) => ({
        id: parseInt(`${bookId}${surahId}${verseId}`),
        bookId,
        surahId,
        verseId,
        content: `Tafsir bu Cheikh Ibrahima Niasse (Baye Niasse) ci sourate ${surahId}: Boole ayah bi dafay wone ne Allah subhanahu wa ta'ala dafay wax ak nun ci seen dooleel ak seen gongue. Mu dafay jaay nun bañ tàng ci lu nekk, bañ xool ay alama yu Allah defar ci alamdun.`,
        reference: 'Tafsir Baye Niasse - Explication en Wolof (Internet Archive)',
        audioUrl: getBayeNiasseAudioUrl(surahId, verseId),
      }),

      // Imam Moustapha Gueye (en Wolof) : pas encore de fichier audio téléchargeable
      // directement identifié pour ce tafsir (uniquement des vidéos YouTube),
      // donc pas d'audioUrl pour l'instant - le lecteur affichera "audio bientôt disponible"
      7: (surahId, verseId) => ({
        id: parseInt(`${bookId}${surahId}${verseId}`),
        bookId,
        surahId,
        verseId,
        content: `Xibar wu Imam Moustapha Gueye ci sourate ${surahId}, verset ${verseId}: Ayah bii dafay jar nun ak yoon wi nettali Islam. Mu dafay jaay nun ni nu war a defar gëstu yalla, te ni Allah subhanahu wa ta'ala dafay feeñal ak yaram yu nekk ci suuf.`,
        reference: 'Imam Moustapha Gueye - Tafsir en Wolof',
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

    return null;
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
    if (bookId >= 6 && bookId <= 7) {
      // Retourner une liste d'exemple de versets disponibles
      return Array.from({ length: 20 }, (_, i) => i + 1); // Versets 1-20 disponibles
    }
    return [];
  }

  // Vérifier si un tafsir a du contenu audio
  isAudioTafsir(bookId: number): boolean {
    return bookId >= 6 && bookId <= 7; // Tafsirs wolof ont l'audio
  }
}

export const tafsirApi = new TafsirApiService();