/**
 * Accès aux tafsirs réels.
 * - Texte : API Quran.com v4 (`/tafsirs/{id}/by_ayah/{s:a}`), HTML converti en blocs.
 * - Audio wolof : collections Internet Archive (Baye Niasse, Oustaz Ibrahima Fall).
 *   Pour ajouter un tafsir audio : un livre `kind: 'audio'` dans tafsirStore
 *   + une entrée dans AUDIO_SOURCES ci-dessous.
 */
import type { TafsirBook } from '@/stores/tafsirStore';

const QURAN_COM_API = 'https://api.quran.com/api/v4';

export type TafsirBlock = { type: 'heading' | 'paragraph'; text: string };

export interface TafsirText {
  blocks: TafsirBlock[];
  /** Versets couverts par ce commentaire (ex. ['2:1', '2:2']) */
  verseKeys: string[];
}

const textCache = new Map<string, Promise<TafsirText>>();

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');

/** Convertit le HTML de Quran.com en titres + paragraphes lisibles. */
export function htmlToBlocks(html: string): TafsirBlock[] {
  const blocks: TafsirBlock[] = [];
  const marked = html
    .replace(/<h[1-6][^>]*>/gi, '\n\u0001')
    .replace(/<\/h[1-6]>/gi, '\u0002\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  for (const raw of decodeEntities(marked).split('\n')) {
    const isHeading = raw.includes('\u0001');
    const text = raw.replace(/[\u0001\u0002]/g, '').replace(/[ \t]+/g, ' ').trim();
    if (!text) continue;
    blocks.push({ type: isHeading ? 'heading' : 'paragraph', text });
  }
  return blocks;
}

async function fetchText(resourceId: number, verseKey: string): Promise<TafsirText> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${QURAN_COM_API}/tafsirs/${resourceId}/by_ayah/${verseKey}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const t = json?.tafsir;
    return {
      blocks: htmlToBlocks(t?.text ?? ''),
      verseKeys: Object.keys(t?.verses ?? {}),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Audio wolof — Cheikh Ibrahima Niasse
// https://archive.org/details/Tafsir-Baye-NIASS (sourates 41 à 43 absentes)
// ---------------------------------------------------------------------------
const BAYE_NIASSE_BASE = 'https://archive.org/download/Tafsir-Baye-NIASS';
const BAYE_NIASSE_FILES: Record<number, string> = {
  1: '001 - Fatiha.mp3',
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

/** Remarques sur les enregistrements partiels (d'après les noms de fichiers) */
const PARTIAL_NOTES: Record<number, string> = {
  37: 'Enregistrement des versets 1 à 144',
  38: 'Enregistrement des versets 36 à 88',
  40: 'Enregistrement des versets 1 à 19',
  52: 'Enregistrement du verset 22 à la fin',
};

export interface AudioTrack {
  title: string;
  url: string;
}

const archiveUrl = (file: string) => `${BAYE_NIASSE_BASE}/${encodeURIComponent(file)}`;

// Oustaz Ibrahima Fall — https://archive.org/details/tafsirfall (114 sourates)
const ibrahimaFallTracks = (surah: number): AudioTrack[] => [
  {
    title: 'Sourate complète',
    url: `https://archive.org/download/tafsirfall/S${String(surah).padStart(3, '0')}_Tafsir_Coran_de_Oustaz_Ibrahima_Fall.mp3`,
  },
];

function bayeNiasseTracks(surah: number): AudioTrack[] {
  if (surah === 2) {
    return [
      { title: 'Partie 1 · versets 1–58', url: archiveUrl('002 - Baqara 1.mp3') },
      { title: 'Partie 2 · versets 59–141', url: archiveUrl('002 - Baqara 2.mp3') },
      { title: 'Partie 3 · versets 142–238', url: archiveUrl('002 - Baqara 3.mp3') },
      { title: 'Partie 4 · versets 239–286', url: archiveUrl('002 - Baqara 4.mp3') },
    ];
  }
  const file = BAYE_NIASSE_FILES[surah];
  return file ? [{ title: PARTIAL_NOTES[surah] ?? 'Sourate complète', url: archiveUrl(file) }] : [];
}

/** Pistes audio par livre : (sourate) → pistes ([] si non disponible) */
const AUDIO_SOURCES: Record<string, (surah: number) => AudioTrack[]> = {
  'baye-niasse': bayeNiasseTracks,
  'ibrahima-fall': ibrahimaFallTracks,
};

export const tafsirApi = {
  getText(book: TafsirBook, surah: number, verse: number): Promise<TafsirText> {
    if (!book.quranComId) return Promise.reject(new Error('Livre sans texte'));
    const key = `${book.quranComId}|${surah}:${verse}`;
    let p = textCache.get(key);
    if (!p) {
      p = fetchText(book.quranComId, `${surah}:${verse}`);
      p.catch(() => textCache.delete(key));
      textCache.set(key, p);
    }
    return p;
  },

  /** Pistes audio d'un livre pour une sourate (Al-Baqara de Baye Niasse : 4 parties). */
  getAudioTracks(bookId: string, surah: number): AudioTrack[] {
    return AUDIO_SOURCES[bookId]?.(surah) ?? [];
  },

  hasAudio(bookId: string, surah: number) {
    return this.getAudioTracks(bookId, surah).length > 0;
  },
};
