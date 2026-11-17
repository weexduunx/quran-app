/**
 * Invocations rythmées par la journée du musulman : les rappels suivent les
 * heures de prière calculées pour le lieu de l'utilisateur (après Subha pour
 * le matin, après Takussan pour le soir), pas une heure fixe.
 *
 * Textes et références à faire relire par une personne qualifiée avant publication.
 */

export type AdhkarMoment = 'quotidien' | 'matin' | 'soir' | 'coucher' | 'vendredi';

export interface Dhikr {
  id: string;
  /** Titre court affiché au-dessus du texte */
  title: string;
  ar?: string;
  tr?: string;
  fr: string;
  /** Nombre de répétitions recommandé */
  repeat: number;
  src: string;
  /** Passage du Coran à ouvrir dans le lecteur plutôt que recopié ici */
  quran?: { surah: number; verse?: number; label: string };
  /** Invocation du quotidien : heure et jours proposés pour son rappel (1 = dimanche … 7 = samedi) */
  suggested?: { hour: number; minute: number; days: number[] };
}

export const WEEKDAYS = [2, 3, 4, 5, 6];
export const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
/** Initiales des jours, de dimanche (1) à samedi (7) */
export const DAY_LABELS = ['', 'D', 'L', 'M', 'M', 'J', 'V', 'S'];

export const ADHKAR_MOMENTS: { id: AdhkarMoment; label: string; icon: 'walk-outline' | 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' | 'star-outline'; hint: string }[] = [
  { id: 'quotidien', label: 'Quotidien', icon: 'walk-outline', hint: 'Programmez un rappel à l’heure où vous en avez besoin' },
  { id: 'matin', label: 'Matin', icon: 'sunny-outline', hint: 'Après la prière de Subha, jusqu’au lever du soleil' },
  { id: 'soir', label: 'Soir', icon: 'partly-sunny-outline', hint: 'Après la prière de Takussan, jusqu’au coucher du soleil' },
  { id: 'coucher', label: 'Coucher', icon: 'moon-outline', hint: 'Avant de dormir' },
  { id: 'vendredi', label: 'Vendredi', icon: 'star-outline', hint: 'Le jour de la Jumu‘a' },
];

const KURSI: Dhikr = {
  id: 'kursi',
  title: 'Âyat al-Kursî',
  fr: 'Le verset du Trône, lu une fois.',
  repeat: 1,
  src: 'Nasâ’î, ‘Amal al-yawm 100 · Bukhârî 2311 (coucher)',
  quran: { surah: 2, verse: 255, label: 'Lire Al-Baqara 2:255' },
};

const QULS: Dhikr = {
  id: 'quls',
  title: 'Les trois sourates protectrices',
  fr: 'Al-Ikhlâs, Al-Falaq et An-Nâs, chacune trois fois.',
  repeat: 3,
  src: 'Abû Dâwud 5082 · Tirmidhî 3575',
  quran: { surah: 112, label: 'Lire Al-Ikhlâs' },
};

const ISTIGHFAR: Dhikr = {
  id: 'sayyid-istighfar',
  title: 'Le maître des demandes de pardon',
  ar: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
  tr: 'Allâhumma anta rabbî lâ ilâha illâ ant, khalaqtanî wa ana ʿabduk, wa ana ʿalâ ʿahdika wa waʿdika mâ-staṭaʿt, aʿûdhu bika min sharri mâ ṣanaʿt, abû’u laka bi-niʿmatika ʿalayy, wa abû’u bi-dhanbî, fa-ghfir lî, fa-innahû lâ yaghfiru dh-dhunûba illâ ant',
  fr: 'Ô Allah, Tu es mon Seigneur, il n’y a de divinité que Toi. Tu m’as créé et je suis Ton serviteur ; je respecte mon engagement et ma promesse envers Toi autant que je le peux. Je cherche refuge auprès de Toi contre le mal de ce que j’ai fait. Je reconnais Tes bienfaits envers moi et je reconnais mon péché : pardonne-moi, car nul ne pardonne les péchés en dehors de Toi.',
  repeat: 1,
  src: 'Bukhârî 6306',
};

const BISMILLAH_PROTECTION: Dhikr = {
  id: 'bismillah-protection',
  title: 'Protection du jour et de la nuit',
  ar: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ، وَهُوَ السَّمِيعُ الْعَلِيمُ',
  tr: 'Bismi-llâhi lladhî lâ yaḍurru maʿa-smihî shay’un fi l-arḍi wa lâ fi s-samâ’, wa huwa s-samîʿu l-ʿalîm',
  fr: 'Au nom d’Allah, avec le nom de Qui rien ne peut nuire, ni sur terre ni dans le ciel. Il est Celui qui entend tout, Celui qui sait tout.',
  repeat: 3,
  src: 'Abû Dâwud 5088 · Tirmidhî 3388',
};

const RADITU: Dhikr = {
  id: 'raditu',
  title: 'Satisfait de ma foi',
  ar: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
  tr: 'Raḍîtu bi-llâhi rabbâ, wa bi-l-islâmi dînâ, wa bi-Muḥammadin ṣalla-llâhu ʿalayhi wa sallama nabiyyâ',
  fr: 'J’agrée Allah comme Seigneur, l’islam comme religion et Muhammad ﷺ comme prophète.',
  repeat: 3,
  src: 'Abû Dâwud 5072 · Tirmidhî 3389',
};

const SUBHANALLAH: Dhikr = {
  id: 'subhanallah-100',
  title: 'Glorification',
  ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
  tr: 'Subḥâna-llâhi wa bi-ḥamdih',
  fr: 'Gloire et louange à Allah.',
  repeat: 100,
  src: 'Muslim 2692',
};

const DAILY: Dhikr[] = [
  {
    id: 'reveil',
    title: 'Au réveil',
    ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    tr: 'Al-ḥamdu li-llâhi lladhî aḥyânâ baʿda mâ amâtanâ wa ilayhi n-nushûr',
    fr: 'Louange à Allah qui nous a rendu la vie après nous avoir fait mourir, et c’est vers Lui la résurrection.',
    repeat: 1,
    src: 'Bukhârî 6324',
    suggested: { hour: 6, minute: 30, days: EVERY_DAY },
  },
  {
    id: 'sortir-maison',
    title: 'En sortant de la maison',
    ar: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    tr: 'Bismi-llâh, tawakkaltu ʿala-llâh, wa lâ ḥawla wa lâ quwwata illâ bi-llâh',
    fr: 'Au nom d’Allah, je place ma confiance en Allah ; il n’y a de force ni de puissance qu’en Allah.',
    repeat: 1,
    src: 'Abû Dâwud 5095 · Tirmidhî 3426',
    suggested: { hour: 7, minute: 45, days: WEEKDAYS },
  },
  {
    id: 'vehicule',
    title: 'En montant en voiture ou dans un transport',
    ar: 'بِسْمِ اللَّهِ، الْحَمْدُ لِلَّهِ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    tr: 'Bismi-llâh, al-ḥamdu li-llâh, subḥâna lladhî sakhkhara lanâ hâdhâ wa mâ kunnâ lahû muqrinîn, wa innâ ilâ rabbinâ la-munqalibûn',
    fr: 'Au nom d’Allah, louange à Allah. Gloire à Celui qui a mis ceci à notre service alors que nous n’en étions pas capables ; c’est vers notre Seigneur que nous retournerons.',
    repeat: 1,
    src: 'Coran 43:13-14 · Abû Dâwud 2602 · Tirmidhî 3446',
    suggested: { hour: 7, minute: 50, days: WEEKDAYS },
  },
  {
    id: 'entrer-mosquee',
    title: 'En entrant à la mosquée',
    ar: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    tr: 'Allâhumma-ftaḥ lî abwâba raḥmatik',
    fr: 'Ô Allah, ouvre-moi les portes de Ta miséricorde.',
    repeat: 1,
    src: 'Muslim 713',
    suggested: { hour: 13, minute: 30, days: [6] },
  },
  {
    id: 'sortir-mosquee',
    title: 'En sortant de la mosquée',
    ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    tr: 'Allâhumma innî as’aluka min faḍlik',
    fr: 'Ô Allah, je Te demande de Ta grâce.',
    repeat: 1,
    src: 'Muslim 713',
    suggested: { hour: 14, minute: 30, days: [6] },
  },
  {
    id: 'manger',
    title: 'Avant de manger',
    ar: 'بِسْمِ اللَّهِ',
    tr: 'Bismi-llâh',
    fr: 'Au nom d’Allah. Si on a oublié : « Bismi-llâhi awwalahû wa âkhirah » (au nom d’Allah, au début et à la fin).',
    repeat: 1,
    src: 'Bukhârî 5376 · Abû Dâwud 3767',
    suggested: { hour: 13, minute: 0, days: EVERY_DAY },
  },
  {
    id: 'entrer-maison',
    title: 'En rentrant à la maison',
    ar: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا',
    tr: 'Bismi-llâhi walajnâ, wa bismi-llâhi kharajnâ, wa ʿalâ rabbinâ tawakkalnâ',
    fr: 'Au nom d’Allah nous entrons, au nom d’Allah nous sortons, et en notre Seigneur nous plaçons notre confiance.',
    repeat: 1,
    src: 'Abû Dâwud 5096',
    suggested: { hour: 18, minute: 30, days: WEEKDAYS },
  },
];

/** Invocations du quotidien, par identifiant (pour les rappels) */
export const DAILY_DUAS: Record<string, Dhikr> = Object.fromEntries(DAILY.map((d) => [d.id, d]));

export const ADHKAR: Record<AdhkarMoment, Dhikr[]> = {
  quotidien: DAILY,
  matin: [
    KURSI,
    QULS,
    {
      id: 'bika-asbahna',
      title: 'En Ton nom, ce matin',
      ar: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
      tr: 'Allâhumma bika aṣbaḥnâ, wa bika amsaynâ, wa bika naḥyâ, wa bika namût, wa ilayka n-nushûr',
      fr: 'Ô Allah, c’est par Toi que nous atteignons le matin et le soir, par Toi que nous vivons et mourons, et vers Toi est la résurrection.',
      repeat: 1,
      src: 'Tirmidhî 3391 · Abû Dâwud 5068',
    },
    ISTIGHFAR,
    BISMILLAH_PROTECTION,
    RADITU,
    SUBHANALLAH,
  ],
  soir: [
    KURSI,
    QULS,
    {
      id: 'bika-amsayna',
      title: 'En Ton nom, ce soir',
      ar: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
      tr: 'Allâhumma bika amsaynâ, wa bika aṣbaḥnâ, wa bika naḥyâ, wa bika namût, wa ilayka l-maṣîr',
      fr: 'Ô Allah, c’est par Toi que nous atteignons le soir et le matin, par Toi que nous vivons et mourons, et vers Toi est le retour.',
      repeat: 1,
      src: 'Tirmidhî 3391 · Abû Dâwud 5068',
    },
    ISTIGHFAR,
    BISMILLAH_PROTECTION,
    RADITU,
    SUBHANALLAH,
  ],
  coucher: [
    KURSI,
    {
      id: 'fin-baqara',
      title: 'Les deux derniers versets d’Al-Baqara',
      fr: 'Celui qui les récite la nuit, ils lui suffisent.',
      repeat: 1,
      src: 'Bukhârî 5009 · Muslim 807',
      quran: { surah: 2, verse: 285, label: 'Lire Al-Baqara 2:285-286' },
    },
    { ...QULS, fr: 'Al-Ikhlâs, Al-Falaq et An-Nâs, en soufflant dans ses mains puis en les passant sur le corps, trois fois.', src: 'Bukhârî 5017' },
    {
      id: 'tasbih-coucher',
      title: 'Glorification avant de dormir',
      ar: 'سُبْحَانَ اللَّهِ · الْحَمْدُ لِلَّهِ · اللَّهُ أَكْبَرُ',
      tr: 'Subḥâna-llâh (33) · Al-ḥamdu li-llâh (33) · Allâhu akbar (34)',
      fr: 'Gloire à Allah, louange à Allah, Allah est le plus grand : 33, 33 et 34 fois.',
      repeat: 100,
      src: 'Bukhârî 3705 · Muslim 2727',
    },
    {
      id: 'bismika-amutu',
      title: 'Au moment de dormir',
      ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
      tr: 'Bismika Allâhumma amûtu wa aḥyâ',
      fr: 'En Ton nom, ô Allah, je meurs et je vis.',
      repeat: 1,
      src: 'Bukhârî 6324',
    },
  ],
  vendredi: [
    {
      id: 'kahf',
      title: 'Sourate Al-Kahf',
      fr: 'La lire le vendredi est une lumière jusqu’au vendredi suivant.',
      repeat: 1,
      src: 'Hâkim 3392 · Bayhaqî, Sunan 5996',
      quran: { surah: 18, label: 'Lire Al-Kahf' },
    },
    {
      id: 'salawat',
      title: 'Prière sur le Prophète ﷺ',
      ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
      tr: 'Allâhumma ṣalli ʿalâ Muḥammadin wa ʿalâ âli Muḥammad',
      fr: 'Ô Allah, prie sur Muhammad et sur la famille de Muhammad. À multiplier le vendredi.',
      repeat: 100,
      src: 'Abû Dâwud 1047 · Bukhârî 3370',
    },
  ],
};
