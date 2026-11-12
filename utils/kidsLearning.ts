/**
 * Espace enfants · phase 2 : alphabet et invocations du quotidien.
 * Contenu validé par l'enseignant (fiche « Contenu de Bayân Enfants »).
 *
 * Audio : fichiers déposés dans assets/audio/kids/ puis indexés par
 * `python scripts/build-kids-audio.py` (voir assets/audio/kids/LISEZMOI.md).
 */
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { KIDS_AUDIO } from '@/utils/kidsAudioManifest';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface KidsLetter {
  n: number;
  slug: string;
  letter: string;
  name: string;
  nameAr: string;
  sound: string;
  vowels: [string, string, string];
  vowelsTr: [string, string, string];
  word: string;
  wordTr: string;
  wordFr: string;
  icon: IconName;
}

const L = (
  n: number,
  slug: string,
  letter: string,
  name: string,
  nameAr: string,
  sound: string,
  tr: [string, string, string],
  word: string,
  wordTr: string,
  wordFr: string,
  icon: IconName
): KidsLetter => ({
  n,
  slug,
  letter,
  name,
  nameAr,
  sound,
  vowels: [`${letter}َ`, `${letter}ِ`, `${letter}ُ`],
  vowelsTr: tr,
  word,
  wordTr,
  wordFr,
  icon,
});

export const KIDS_LETTERS: KidsLetter[] = [
  L(1, 'alif', 'ا', 'Alif', 'ألف', 'a', ['a', 'i', 'ou'], 'أَسَد', 'asad', 'le lion', 'paw'),
  L(2, 'ba', 'ب', 'Bâ', 'باء', 'b', ['ba', 'bi', 'bou'], 'بَيْت', 'bayt', 'la maison', 'home'),
  L(3, 'ta', 'ت', 'Tâ', 'تاء', 't', ['ta', 'ti', 'tou'], 'تُفَّاح', 'tuffâḥ', 'la pomme', 'nutrition'),
  L(4, 'tha', 'ث', 'Thâ', 'ثاء', 'th anglais de « think »', ['tha', 'thi', 'thou'], 'ثَعْلَب', 'thaʿlab', 'le renard', 'paw'),
  L(5, 'jim', 'ج', 'Jîm', 'جيم', 'dj', ['dja', 'dji', 'djou'], 'جَمَل', 'jamal', 'le chameau', 'paw'),
  L(6, 'ha', 'ح', 'Ḥâ', 'حاء', 'h soufflé du fond de la gorge', ['ḥa', 'ḥi', 'ḥou'], 'حَلِيب', 'ḥalîb', 'le lait', 'water'),
  L(7, 'kha', 'خ', 'Khâ', 'خاء', 'j espagnol, comme un r raclé', ['kha', 'khi', 'khou'], 'خُبْز', 'khubz', 'le pain', 'restaurant'),
  L(8, 'dal', 'د', 'Dâl', 'دال', 'd', ['da', 'di', 'dou'], 'دَجَاجَة', 'dajâja', 'la poule', 'egg'),
  L(9, 'dhal', 'ذ', 'Dhâl', 'ذال', 'th anglais de « this »', ['dha', 'dhi', 'dhou'], 'ذَهَب', 'dhahab', 'l’or', 'diamond'),
  L(10, 'ra', 'ر', 'Râ', 'راء', 'r roulé', ['ra', 'ri', 'rou'], 'رُمَّان', 'rummân', 'la grenade', 'nutrition'),
  L(11, 'zay', 'ز', 'Zây', 'زاي', 'z', ['za', 'zi', 'zou'], 'زَيْتُون', 'zaytûn', 'l’olive', 'leaf'),
  L(12, 'sin', 'س', 'Sîn', 'سين', 's', ['sa', 'si', 'sou'], 'سَمَك', 'samak', 'le poisson', 'fish'),
  L(13, 'shin', 'ش', 'Shîn', 'شين', 'ch', ['cha', 'chi', 'chou'], 'شَمْس', 'shams', 'le soleil', 'sunny'),
  L(14, 'sad', 'ص', 'Ṣâd', 'صاد', 's appuyé (emphatique)', ['ṣa', 'ṣi', 'ṣou'], 'صَقْر', 'ṣaqr', 'le faucon', 'paw'),
  L(15, 'dad', 'ض', 'Ḍâd', 'ضاد', 'd appuyé (emphatique)', ['ḍa', 'ḍi', 'ḍou'], 'ضِفْدَع', 'ḍifdaʿ', 'la grenouille', 'paw'),
  L(16, 'taa', 'ط', 'Ṭâ', 'طاء', 't appuyé (emphatique)', ['ṭa', 'ṭi', 'ṭou'], 'طَائِرَة', 'ṭâʾira', 'l’avion', 'airplane'),
  L(17, 'zaa', 'ظ', 'Ẓâ', 'ظاء', 'th de « this », appuyé', ['ẓa', 'ẓi', 'ẓou'], 'ظَرْف', 'ẓarf', 'l’enveloppe', 'mail'),
  L(18, 'ayn', 'ع', 'ʿAyn', 'عين', 'son de gorge, sans équivalent en français', ['ʿa', 'ʿi', 'ʿou'], 'عِنَب', 'ʿinab', 'le raisin', 'nutrition'),
  L(19, 'ghayn', 'غ', 'Ghayn', 'غين', 'r grasseyé', ['gha', 'ghi', 'ghou'], 'غَيْمَة', 'ghayma', 'le nuage', 'cloud'),
  L(20, 'fa', 'ف', 'Fâ', 'فاء', 'f', ['fa', 'fi', 'fou'], 'فِيل', 'fîl', 'l’éléphant', 'paw'),
  L(21, 'qaf', 'ق', 'Qâf', 'قاف', 'k du fond de la gorge', ['qa', 'qi', 'qou'], 'قَمَر', 'qamar', 'la lune', 'moon'),
  L(22, 'kaf', 'ك', 'Kâf', 'كاف', 'k', ['ka', 'ki', 'kou'], 'كِتَاب', 'kitâb', 'le livre', 'book'),
  L(23, 'lam', 'ل', 'Lâm', 'لام', 'l', ['la', 'li', 'lou'], 'لَيْمُون', 'laymûn', 'le citron', 'nutrition'),
  L(24, 'mim', 'م', 'Mîm', 'ميم', 'm', ['ma', 'mi', 'mou'], 'مَاء', 'mâʾ', 'l’eau', 'water'),
  L(25, 'nun', 'ن', 'Nûn', 'نون', 'n', ['na', 'ni', 'nou'], 'نَجْمَة', 'najma', 'l’étoile', 'star'),
  L(26, 'haa', 'ه', 'Hâ', 'هاء', 'h léger, expiré', ['ha', 'hi', 'hou'], 'هِلَال', 'hilâl', 'le croissant de lune', 'moon'),
  L(27, 'waw', 'و', 'Wâw', 'واو', 'w (ou)', ['wa', 'wi', 'wou'], 'وَرْدَة', 'warda', 'la rose', 'rose'),
  L(28, 'ya', 'ي', 'Yâ', 'ياء', 'y', ['ya', 'yi', 'you'], 'يَد', 'yad', 'la main', 'hand-left'),
];

export type LetterPart = 'nom' | 'voyelles' | 'mot';
export const letterAudio = (l: KidsLetter, part: LetterPart): number | undefined =>
  KIDS_AUDIO[`lettres/${String(l.n).padStart(2, '0')}-${l.slug}-${part}`];

// ---------------------------------------------------------------------------
// Invocations
// ---------------------------------------------------------------------------
export interface DuaText {
  ar: string;
  tr: string;
  fr: string;
}

export interface KidsDua extends DuaText {
  n: number;
  slug: string;
  moment: string;
  short: string;
  icon: IconName;
  src: string;
  extra?: DuaText & { label: string };
}

export const KIDS_DUAS: KidsDua[] = [
  { n: 1, slug: 'manger', moment: 'Avant de manger', short: 'Manger', icon: 'restaurant-outline', ar: 'بِسْمِ اللَّهِ', tr: 'Bismillâh', fr: 'Au nom d’Allah.', src: 'Bukhârî 5376 · Muslim 2022',
    extra: { label: 'Si on a oublié', ar: 'بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ', tr: 'Bismillâhi awwalahû wa âkhirah', fr: 'Au nom d’Allah, au début et à la fin.' } },
  { n: 2, slug: 'apres-manger', moment: 'Après avoir mangé', short: 'Fini !', icon: 'happy-outline', ar: 'الْحَمْدُ لِلَّهِ', tr: 'Al-ḥamdu lillâh', fr: 'Louange à Allah.', src: 'Muslim 2734',
    extra: { label: 'Pour les plus grands', ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', tr: 'Al-ḥamdu lillâhi lladhî aṭʿamanî hâdhâ wa razaqanîhi min ghayri ḥawlin minnî wa lâ quwwa', fr: 'Louange à Allah qui m’a nourri de ceci et me l’a accordé sans force ni puissance de ma part.' } },
  { n: 3, slug: 'dormir', moment: 'Avant de dormir', short: 'Dormir', icon: 'moon-outline', ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', tr: 'Bismika Allâhumma amûtu wa aḥyâ', fr: 'En Ton nom, ô Allah, je meurs et je vis.', src: 'Bukhârî 6324' },
  { n: 4, slug: 'reveil', moment: 'Au réveil', short: 'Réveil', icon: 'sunny-outline', ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', tr: 'Al-ḥamdu lillâhi lladhî aḥyânâ baʿda mâ amâtanâ wa ilayhi n-nushûr', fr: 'Louange à Allah qui nous a rendu la vie après nous avoir fait mourir, et c’est vers Lui la résurrection.', src: 'Bukhârî 6324' },
  { n: 5, slug: 'sortir-maison', moment: 'En sortant de la maison', short: 'Sortir', icon: 'exit-outline', ar: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', tr: 'Bismillâh, tawakkaltu ʿala-llâh, wa lâ ḥawla wa lâ quwwata illâ billâh', fr: 'Au nom d’Allah, je place ma confiance en Allah ; il n’y a de force ni de puissance qu’en Allah.', src: 'Abû Dâwud 5095 · Tirmidhî 3426' },
  { n: 6, slug: 'entrer-maison', moment: 'En entrant à la maison', short: 'Maison', icon: 'home-outline', ar: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا', tr: 'Bismillâhi walajnâ, wa bismillâhi kharajnâ, wa ʿalâ rabbinâ tawakkalnâ', fr: 'Au nom d’Allah nous entrons, au nom d’Allah nous sortons, et en notre Seigneur nous plaçons notre confiance.', src: 'Abû Dâwud 5096' },
  { n: 7, slug: 'entrer-toilettes', moment: 'En entrant aux toilettes', short: 'Toilettes', icon: 'water-outline', ar: 'بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ', tr: 'Bismillâh, Allâhumma innî aʿûdhu bika mina l-khubuthi wa l-khabâʾith', fr: 'Au nom d’Allah. Ô Allah, je cherche refuge auprès de Toi contre les démons, mâles et femelles.', src: 'Bukhârî 142 · Muslim 375' },
  { n: 8, slug: 'sortir-toilettes', moment: 'En sortant des toilettes', short: 'Après', icon: 'sparkles-outline', ar: 'غُفْرَانَكَ', tr: 'Ghufrânak', fr: '(Je demande) Ton pardon.', src: 'Abû Dâwud 30 · Tirmidhî 7' },
  { n: 9, slug: 'eternuer', moment: 'Quand on éternue', short: 'Atchoum', icon: 'flower-outline', ar: 'الْحَمْدُ لِلَّهِ', tr: 'Al-ḥamdu lillâh', fr: 'Louange à Allah.', src: 'Bukhârî 6224',
    extra: { label: 'On lui répond, puis il répond', ar: 'يَرْحَمُكَ اللَّهُ · يَهْدِيكُمُ اللَّهُ وَيُصْلِحُ بَالَكُمْ', tr: 'Yarḥamuka-llâh · Yahdîkumu-llâhu wa yuṣliḥu bâlakum', fr: 'Qu’Allah te fasse miséricorde. · Qu’Allah vous guide et améliore votre état.' } },
  { n: 10, slug: 'saluer', moment: 'Pour saluer', short: 'Salam', icon: 'hand-right-outline', ar: 'السَّلَامُ عَلَيْكُمْ', tr: 'As-salâmu ʿalaykum', fr: 'Que la paix soit sur vous.', src: 'Muslim 54',
    extra: { label: 'On répond', ar: 'وَعَلَيْكُمُ السَّلَامُ', tr: 'Wa ʿalaykumu s-salâm', fr: 'Et sur vous la paix.' } },
  { n: 11, slug: 'remercier', moment: 'Pour remercier', short: 'Merci', icon: 'heart-outline', ar: 'جَزَاكَ اللَّهُ خَيْرًا', tr: 'Jazâka-llâhu khayran', fr: 'Qu’Allah te récompense par le bien.', src: 'Tirmidhî 2035' },
  { n: 12, slug: 'voyage', moment: 'En voiture ou en voyage', short: 'Voyage', icon: 'car-outline', ar: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ', tr: 'Subḥâna lladhî sakhkhara lanâ hâdhâ wa mâ kunnâ lahû muqrinîn, wa innâ ilâ rabbinâ la-munqalibûn', fr: 'Gloire à Celui qui a mis ceci à notre service alors que nous n’étions pas capables de le dominer ; et c’est vers notre Seigneur que nous retournerons.', src: 'Coran 43:13-14 · Muslim 1342' },
];

export type DuaLang = 'ar' | 'fr' | 'wo';
export const duaAudio = (d: KidsDua, lang: DuaLang): number | undefined =>
  KIDS_AUDIO[`invocations/${String(d.n).padStart(2, '0')}-${d.slug}-${lang}`];

/** Combien d'enregistrements sont déjà dans l'app (pour l'espace parents) */
export function kidsAudioCoverage() {
  const keys = Object.keys(KIDS_AUDIO);
  return {
    letters: keys.filter((k) => k.startsWith('lettres/')).length,
    lettersTotal: KIDS_LETTERS.length * 3,
    duas: keys.filter((k) => k.startsWith('invocations/')).length,
    duasTotal: KIDS_DUAS.length * 3,
  };
}
