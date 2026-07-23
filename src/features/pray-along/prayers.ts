import type { IconName } from '@/components/ui/icon-symbol';
import type { LocalizedText } from '@/features/guides/hooks';

// ─────────────────────────────────────────────────────────────────────────────
// "Gebet mitbeten" (Pray-Along) — feste Gebetstexte + Ablauf-Generierung.
//
// QUELLEN DER ARABISCHEN TEXTE UND UMSCHRIFT (nichts frei erfunden/paraphrasiert):
//  • Al-Fatiha (arabic + translit)  → aus der bereits geprüften App-Daten
//    src/features/learn/data/fatiha-deep.json (Token-weise, hier Vers für Vers
//    verbatim zusammengesetzt).
//  • Takbir, Sana (Istiftah), Ruku-/Sujud-Tasbih, Sami'Allah/Rabbana, Jalsa-
//    Bittgebet, Tashahhud (At-Tahiyyat), Salawat (Ibrahim-Formel), Zuflucht-
//    Bittgebet vor dem Salam  → aus src/features/learn/data/salah-words.json
//    (Zeilen-Umschrift verbatim übernommen und zu vollständigen Phrasen
//    zusammengefügt).
//  • Salam  → aus src/features/guides/guides.json (Guide "how-to-pray", Schritt 10).
//  • Ablauf/Rak'ah-Zählung + Madhhab-Hinweise folgen der verbreiteten
//    (hanafitischen) Zählung derselben Guides.
//
// Die Umschrift nutzt das akademische System der App-Lern-Module (ḥ, ẓ, ā, ʿ …)
// — konsistent zu fatiha-deep.json / salah-words.json, damit Nutzer, die dort
// üben, dieselbe Schreibweise wiederfinden.
//
// Übersetzungen liegen (wie in guides.json) für de/en/tr/ar/es/fr vor; für die
// übrigen UI-Sprachen greift resolveText() auf Englisch/Deutsch zurück.
//
// WICHTIG: Vor dem Store-Launch religiös gegenprüfen (siehe USER-TODO, gleiches
// Verfahren wie bei guides.json / duas.json).
// ─────────────────────────────────────────────────────────────────────────────

export const PRAY_ALONG_SOURCE_NOTE =
  'Gebetstexte aus den geprüften App-Daten (Al-Fatiha: fatiha-deep.json; feste Dhikr: salah-words.json; Salam: guides.json). Ablauf nach verbreiteter (hanafitischer) Zählung; Unterschiede der Rechtsschulen sind als Hinweis markiert. Vor Store-Launch religiös gegenprüfen.';

export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'witr';

export type Posture =
  | 'takbir'
  | 'qiyam'
  | 'ruku'
  | 'itidal'
  | 'sujud'
  | 'jalsa'
  | 'tashahhud'
  | 'salam';

export const POSTURE_ICON: Record<Posture, IconName> = {
  takbir: 'hand-left',
  qiyam: 'body',
  ruku: 'arrow-down',
  itidal: 'arrow-up',
  sujud: 'arrow-down-circle',
  jalsa: 'ellipsis-horizontal',
  tashahhud: 'finger-print',
  salam: 'checkmark-done',
};

export interface PrayStep {
  posture: Posture;
  /** Aktions-/Haltungs-Titel (z. B. „Ruku – Verbeugung"). */
  label: LocalizedText;
  /** Arabischer Wortlaut (verbatim aus geprüften App-Daten). */
  arabic?: string;
  /** Lateinische Umschrift zum Mitsprechen. */
  transliteration?: string;
  /** Kurze Übersetzung / bei textlosen Schritten die Handlungsanweisung. */
  translation: LocalizedText;
  /** Physische Ausführung + Sunnah-/Madhhab-Hinweise. */
  note?: LocalizedText;
  /** z. B. „×3" für Tasbih-Wiederholungen. */
  repeat?: string;
  /** Rak'ah-Nummer (für die Fortschrittsanzeige), fehlt bei Rahmen-Schritten. */
  rakah?: number;
  /** true für die kurzen Suren-Schritte (Al-Ikhlas/Al-Kawthar), z. B. für die
   *  Lern-Ansicht, die Kern-Texte gesondert präsentiert. Rein additiv. */
  isSurah?: boolean;
}

export interface PrayerDef {
  id: PrayerId;
  name: LocalizedText;
  /** Zeit-/Kontext-Untertitel. */
  timeName: LocalizedText;
  /** Anzahl Fard-Rak'ah (bei Witr: Wajib/Sunnah nach Madhhab). */
  rakahs: number;
  icon: IconName;
  witr?: boolean;
}

// ── Gebets-Auswahl (Schritt 1) ───────────────────────────────────────────────
export const PRAYERS: PrayerDef[] = [
  {
    id: 'fajr',
    rakahs: 2,
    icon: 'partly-sunny',
    name: { de: 'Fajr', en: 'Fajr', tr: 'Sabah', ar: 'الفجر', es: 'Fayr', fr: 'Fajr' },
    timeName: {
      de: '2 Rak’ah Fard · Morgengebet',
      en: '2 rak’ah fard · dawn prayer',
      tr: '2 rekât farz · sabah namazı',
      ar: 'ركعتان فرض · صلاة الفجر',
      es: '2 rakat fard · oración del alba',
      fr: '2 rak’a fard · prière de l’aube',
    },
  },
  {
    id: 'dhuhr',
    rakahs: 4,
    icon: 'sunny',
    name: { de: 'Dhuhr', en: 'Dhuhr', tr: 'Öğle', ar: 'الظهر', es: 'Dhuhr', fr: 'Dhuhr' },
    timeName: {
      de: '4 Rak’ah Fard · Mittagsgebet',
      en: '4 rak’ah fard · noon prayer',
      tr: '4 rekât farz · öğle namazı',
      ar: 'أربع ركعات فرض · صلاة الظهر',
      es: '4 rakat fard · oración del mediodía',
      fr: '4 rak’a fard · prière de midi',
    },
  },
  {
    id: 'asr',
    rakahs: 4,
    icon: 'contrast',
    name: { de: 'Asr', en: 'Asr', tr: 'İkindi', ar: 'العصر', es: 'Asr', fr: 'Asr' },
    timeName: {
      de: '4 Rak’ah Fard · Nachmittagsgebet',
      en: '4 rak’ah fard · afternoon prayer',
      tr: '4 rekât farz · ikindi namazı',
      ar: 'أربع ركعات فرض · صلاة العصر',
      es: '4 rakat fard · oración de la tarde',
      fr: '4 rak’a fard · prière de l’après-midi',
    },
  },
  {
    id: 'maghrib',
    rakahs: 3,
    icon: 'moon-outline',
    name: { de: 'Maghrib', en: 'Maghrib', tr: 'Akşam', ar: 'المغرب', es: 'Magrib', fr: 'Maghrib' },
    timeName: {
      de: '3 Rak’ah Fard · Abendgebet',
      en: '3 rak’ah fard · sunset prayer',
      tr: '3 rekât farz · akşam namazı',
      ar: 'ثلاث ركعات فرض · صلاة المغرب',
      es: '3 rakat fard · oración del ocaso',
      fr: '3 rak’a fard · prière du coucher du soleil',
    },
  },
  {
    id: 'isha',
    rakahs: 4,
    icon: 'moon',
    name: { de: 'Isha', en: 'Isha', tr: 'Yatsı', ar: 'العشاء', es: 'Isha', fr: 'Isha' },
    timeName: {
      de: '4 Rak’ah Fard · Nachtgebet',
      en: '4 rak’ah fard · night prayer',
      tr: '4 rekât farz · yatsı namazı',
      ar: 'أربع ركعات فرض · صلاة العشاء',
      es: '4 rakat fard · oración de la noche',
      fr: '4 rak’a fard · prière de la nuit',
    },
  },
  {
    id: 'witr',
    rakahs: 3,
    icon: 'star-outline',
    witr: true,
    name: { de: 'Witr', en: 'Witr', tr: 'Vitir', ar: 'الوتر', es: 'Witr', fr: 'Witr' },
    timeName: {
      de: '3 Rak’ah · nach Isha (hanafitisch Wajib)',
      en: '3 rak’ah · after isha (Hanafi: wajib)',
      tr: '3 rekât · yatsıdan sonra (Hanefî: vacip)',
      ar: 'ثلاث ركعات · بعد العشاء (واجب عند الحنفية)',
      es: '3 rakat · después de Isha (hanafí: wayib)',
      fr: '3 rak’a · après Isha (hanafite : wajib)',
    },
  },
];

export function prayerById(id: string): PrayerDef | undefined {
  return PRAYERS.find((p) => p.id === id);
}

// ── Feste Bausteine (verbatim aus geprüften App-Daten, s. Kopf-Kommentar) ─────

const AL_FATIHA_ARABIC = [
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  'الرَّحْمَٰنِ الرَّحِيمِ',
  'مَالِكِ يَوْمِ الدِّينِ',
  'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
  'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
].join('\n');

const AL_FATIHA_TRANSLIT = [
  'bismi llāhi r-raḥmāni r-raḥīm',
  'al-ḥamdu lillāhi rabbi l-ʿālamīn',
  'ar-raḥmāni r-raḥīm',
  'māliki yawmi d-dīn',
  'iyyāka naʿbudu wa-iyyāka nastaʿīn',
  'ihdinā ṣ-ṣirāṭa l-mustaqīm',
  'ṣirāṭa lladhīna anʿamta ʿalayhim ghayri l-maghḍūbi ʿalayhim wa-lā ḍ-ḍāllīn',
].join('\n');

const AL_FATIHA_TRANSLATION: LocalizedText = {
  de: 'Im Namen Allahs, des Allerbarmers, des Barmherzigen. Alles Lob gebührt Allah, dem Herrn der Welten, dem Allerbarmer, dem Barmherzigen, dem Herrscher am Tag des Gerichts. Dir allein dienen wir, und Dich allein bitten wir um Hilfe. Leite uns den geraden Weg, den Weg derer, die Du begnadet hast, nicht derer, die (Deinen) Zorn erregt haben, und nicht der Irregehenden.',
  en: 'In the name of Allah, the Most Gracious, the Most Merciful. All praise belongs to Allah, Lord of the worlds, the Most Gracious, the Most Merciful, Master of the Day of Judgment. You alone we worship, and You alone we ask for help. Guide us to the straight path — the path of those You have blessed, not of those who earned Your anger, nor of those who go astray.',
  tr: 'Rahman ve Rahim olan Allah’ın adıyla. Hamd, âlemlerin Rabbi Allah’a mahsustur; O Rahman’dır, Rahim’dir, din gününün sahibidir. Yalnız Sana kulluk eder ve yalnız Senden yardım dileriz. Bizi doğru yola ilet; nimet verdiklerinin yoluna, gazaba uğrayanların ve sapmışların yoluna değil.',
  ar: 'بسم الله الرحمن الرحيم. الحمد لله رب العالمين، الرحمن الرحيم، مالك يوم الدين. إياك نعبد وإياك نستعين. اهدنا الصراط المستقيم، صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين.',
  es: 'En el nombre de Alá, el Clementísimo, el Misericordiosísimo. Toda alabanza pertenece a Alá, Señor de los mundos, el Clementísimo, el Misericordiosísimo, Soberano del Día del Juicio. Solo a Ti adoramos y solo a Ti pedimos ayuda. Guíanos por el camino recto, el camino de aquellos a quienes agraciaste, no de los que incurrieron en ira ni de los extraviados.',
  fr: 'Au nom d’Allah, le Tout Miséricordieux, le Très Miséricordieux. Louange à Allah, Seigneur des mondes, le Tout Miséricordieux, le Très Miséricordieux, Souverain du Jour de la rétribution. C’est Toi seul que nous adorons et c’est Toi seul dont nous implorons le secours. Guide-nous sur le droit chemin, le chemin de ceux que Tu as comblés de bienfaits, non de ceux qui ont encouru Ta colère ni des égarés.',
};

function takbirStep(): PrayStep {
  return {
    posture: 'takbir',
    label: {
      de: 'Takbir – Eröffnung',
      en: 'Takbir – opening',
      tr: 'İftitah Tekbiri',
      ar: 'تكبيرة الإحرام',
      es: 'Takbir de apertura',
      fr: 'Takbir d’ouverture',
    },
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'allāhu akbar',
    translation: {
      de: 'Allah ist am größten.',
      en: 'Allah is the greatest.',
      tr: 'Allah en büyüktür.',
      ar: 'الله أكبر.',
      es: 'Alá es el más grande.',
      fr: 'Allah est le plus grand.',
    },
    note: {
      de: 'Im Stehen die Hände auf Schulter-/Ohrhöhe heben und „Allahu Akbar" sagen. Damit beginnt das Gebet; danach die rechte Hand über die linke legen.',
      en: 'Standing, raise the hands to shoulder/ear level and say “Allahu Akbar”. The prayer now begins; then place the right hand over the left.',
      tr: 'Ayakta ellerini omuz/kulak hizasına kaldır ve „Allahu Ekber" de. Namaz başlar; sonra sağ elini sol elinin üzerine koy.',
      ar: 'قائماً ارفع يديك حذو منكبيك وقل „الله أكبر". تبدأ الصلاة، ثم ضع يمينك على شمالك.',
      es: 'De pie, levanta las manos a la altura de los hombros/orejas y di «Allahu Akbar». Comienza la oración; luego coloca la mano derecha sobre la izquierda.',
      fr: 'Debout, lève les mains à hauteur des épaules/oreilles et dis « Allahu Akbar ». La prière commence ; place ensuite la main droite sur la gauche.',
    },
  };
}

function sanaStep(): PrayStep {
  return {
    posture: 'qiyam',
    label: {
      de: 'Sana – Eröffnungsbittgebet (Sunnah)',
      en: 'Sana – opening supplication (sunnah)',
      tr: 'Sübhaneke (sünnet)',
      ar: 'دعاء الاستفتاح (سنة)',
      es: 'Sana – súplica de apertura (sunna)',
      fr: 'Sana – invocation d’ouverture (sunna)',
    },
    arabic:
      'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَلَا إِلَٰهَ غَيْرُكَ',
    transliteration:
      'subḥānaka llāhumma wa-biḥamdika wa-tabāraka smuka wa-taʿālā jadduka wa-lā ilāha ghayruka',
    translation: {
      de: 'Gepriesen bist Du, o Allah, und Dir gebührt Lob; gesegnet ist Dein Name und erhaben Deine Majestät, und es gibt keinen Gott außer Dir.',
      en: 'Glory be to You, O Allah, and praise; blessed is Your name and exalted is Your majesty, and there is no god but You.',
      tr: 'Sen her eksiklikten uzaksın Allah’ım, Sana hamd olsun; adın mübarektir, şanın yücedir ve Senden başka ilah yoktur.',
      ar: 'سبحانك اللهم وبحمدك، وتبارك اسمك، وتعالى جدك، ولا إله غيرك.',
      es: 'Gloria a Ti, oh Alá, y alabanza; bendito sea Tu nombre y exaltada Tu majestad, y no hay más dios que Tú.',
      fr: 'Gloire et louange à Toi, ô Allah ; béni soit Ton nom et exaltée Ta majesté, et il n’y a de divinité que Toi.',
    },
    note: {
      de: 'Leise im Stehen, direkt nach dem Takbir.',
      en: 'Said quietly while standing, right after the takbir.',
      tr: 'Ayakta, tekbirden hemen sonra sessizce.',
      ar: 'يُقال سراً في القيام بعد التكبير مباشرة.',
      es: 'Se dice en voz baja de pie, justo después del takbir.',
      fr: 'À dire à voix basse, debout, juste après le takbir.',
    },
  };
}

// Kurze Anfänger-Suren für die ersten beiden Rak'ah (nach Al-Fatiha). Arabisch
// verbatim aus api.alquran.cloud (quran-uthmani; Basmala-Präfix entfernt, weil
// sie leise separat gesagt wird), Übersetzungen aus den dortigen Editionen,
// Umschrift in der App-Konvention (vgl. sanaStep). Religiöse Gegenprüfung: s.
// PRAY_ALONG_SOURCE_NOTE / USER-TODO.
const AL_IKHLAS: Pick<PrayStep, 'arabic' | 'transliteration' | 'translation'> = {
  arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ ٱللَّهُ ٱلصَّمَدُ لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
  transliteration:
    'qul huwa llāhu aḥad · allāhu ṣ-ṣamad · lam yalid wa-lam yūlad · wa-lam yakun lahū kufuwan aḥad',
  translation: {
    de: 'Sprich: „Er ist Allah, ein Einziger. Allah, der Absolute. Er zeugt nicht und ist nicht gezeugt worden, und keiner ist Ihm ebenbürtig."',
    en: 'Say, "He is Allah, [who is] One, Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent."',
    tr: 'De ki: O Allah birdir. Allah her şeyden müstağnidir, her şey O’na muhtaçtır. O doğurmamış ve doğmamıştır. Hiçbir şey O’na denk değildir.',
    ar: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ ٱللَّهُ ٱلصَّمَدُ لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
    es: 'Di: "Él es Al-lah, Uno. Al-lah es el Absoluto. No engendró ni fue engendrado. Y no hay nada ni nadie semejante a Él."',
    fr: 'Dis : « Il est Allah, Unique. Allah, Le Seul à être imploré. Il n’a pas engendré et n’a pas été engendré, et nul n’est égal à Lui. »',
  },
};
const AL_KAWTHAR: Pick<PrayStep, 'arabic' | 'transliteration' | 'translation'> = {
  arabic: 'إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ فَصَلِّ لِرَبِّكَ وَٱنْحَرْ إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ',
  transliteration: 'innā aʿṭaynāka l-kawthar · fa-ṣalli li-rabbika wa-nḥar · inna shāniʾaka huwa l-abtar',
  translation: {
    de: 'Wir haben dir die Überfülle (al-Kauthar) gegeben. So bete zu deinem Herrn und opfere. Wahrlich, dein Hasser ist der Abgeschnittene.',
    en: 'Indeed, We have granted you al-Kawthar. So pray to your Lord and sacrifice. Indeed, your enemy is the one cut off.',
    tr: 'Doğrusu biz sana Kevser’i verdik. Öyleyse Rabbin için namaz kıl ve kurban kes. Doğrusu sana kin besleyen, soyu kesik olanın ta kendisidir.',
    ar: 'إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ فَصَلِّ لِرَبِّكَ وَٱنْحَرْ إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ',
    es: 'Te hemos concedido la abundancia (al-Kawthar). Reza a tu Señor y sacrifica. Porque quien te odia será el que quede sin descendencia.',
    fr: 'Nous t’avons certes accordé l’Abondance. Accomplis la Salât pour ton Seigneur et sacrifie. Celui qui te hait sera privé de postérité.',
  },
};

// Eigener Schritt für die kurze Sure nach Al-Fatiha (Rak'ah 1 → Al-Ikhlas,
// Rak'ah 2 → Al-Kawthar): die beiden, die Anfänger zuerst lernen.
function shortSurahStep(rakah: number): PrayStep {
  const isKawthar = rakah === 2;
  const sura = isKawthar ? AL_KAWTHAR : AL_IKHLAS;
  const name = isKawthar ? 'Al-Kawthar' : 'Al-Ikhlas';
  const nameAr = isKawthar ? 'الكوثر' : 'الإخلاص';
  return {
    posture: 'qiyam',
    rakah,
    isSurah: true,
    label: {
      de: `Kurze Sure – ${name}`,
      en: `Short surah – ${name}`,
      tr: `Kısa sure – ${name}`,
      ar: `سورة قصيرة – ${nameAr}`,
      es: `Sura corta – ${name}`,
      fr: `Courte sourate – ${name}`,
    },
    arabic: sura.arabic,
    transliteration: sura.transliteration,
    translation: sura.translation!,
    note: {
      de: 'Nach Al-Fatiha (nur 1. + 2. Rak’ah). Zuvor leise „Bismillāh ar-Raḥmān ar-Raḥīm". Al-Ikhlas und Al-Kawthar gehören zu den ersten Suren, die man auswendig lernt.',
      en: 'After Al-Fatiha (1st + 2nd rakah only). Quietly say "Bismillah ar-Rahman ar-Rahim" first. Al-Ikhlas and Al-Kawthar are among the first surahs one memorizes.',
      tr: 'Fâtiha’dan sonra (yalnız 1. + 2. rekât). Önce sessizce „Bismillâhi’r-Rahmâni’r-Rahîm". İhlâs ve Kevser ilk ezberlenen surelerdendir.',
      ar: 'بعد الفاتحة (في الركعتين الأوليين فقط). قل سراً „بسم الله الرحمن الرحيم" أولاً. الإخلاص والكوثر من أوائل ما يُحفظ.',
      es: 'Tras Al-Fatiha (solo 1.ª + 2.ª raka). Di antes en voz baja "Bismillah ar-Rahman ar-Rahim". Al-Ikhlas y Al-Kawthar están entre las primeras suras que se memorizan.',
      fr: 'Après Al-Fatiha (1re + 2e rak’a seulement). Dis d’abord à voix basse « Bismillah ar-Rahman ar-Rahim ». Al-Ikhlas et Al-Kawthar sont parmi les premières sourates mémorisées.',
    },
  };
}

function recitationStep(rakah: number, withSurah: boolean): PrayStep {
  return {
    posture: 'qiyam',
    rakah,
    label: withSurah
      ? {
          de: 'Qiyam – Al-Fatiha + Sure',
          en: 'Qiyam – Al-Fatiha + surah',
          tr: 'Kıyam – Fâtiha + sure',
          ar: 'القيام – الفاتحة وسورة',
          es: 'Qiyam – Al-Fatiha + sura',
          fr: 'Qiyam – Al-Fatiha + sourate',
        }
      : {
          de: 'Qiyam – Al-Fatiha',
          en: 'Qiyam – Al-Fatiha',
          tr: 'Kıyam – Fâtiha',
          ar: 'القيام – الفاتحة',
          es: 'Qiyam – Al-Fatiha',
          fr: 'Qiyam – Al-Fatiha',
        },
    arabic: AL_FATIHA_ARABIC,
    transliteration: AL_FATIHA_TRANSLIT,
    translation: AL_FATIHA_TRANSLATION,
    note: withSurah
      ? {
          de: 'Al-Fatiha ist in jeder Rak’ah Pflicht. In den ersten beiden Rak’ah folgt danach eine kurze Sure oder einige Verse (z. B. Al-Ikhlas) – im Lern-Modul zu üben.',
          en: 'Al-Fatiha is required in every rakah. In the first two rakahs, add a short surah or a few verses (e.g. Al-Ikhlas) — practice these in the learning course.',
          tr: 'Fâtiha her rekâtta farzdır. İlk iki rekâtta ardından kısa bir sure veya birkaç ayet eklenir (örn. İhlâs) – öğrenme bölümünde çalış.',
          ar: 'الفاتحة ركن في كل ركعة. وفي الركعتين الأوليين تُضاف سورة قصيرة أو آيات (مثل الإخلاص).',
          es: 'Al-Fatiha es obligatoria en cada raka. En las dos primeras se añade una sura corta o algunos versículos (p. ej. Al-Ikhlas).',
          fr: 'Al-Fatiha est obligatoire à chaque rak’a. Dans les deux premières, ajoute une courte sourate ou quelques versets (p. ex. Al-Ikhlas).',
        }
      : {
          de: 'In der 3. und 4. Rak’ah wird nur Al-Fatiha rezitiert, ohne zusätzliche Sure.',
          en: 'In the 3rd and 4th rakah only Al-Fatiha is recited, without an additional surah.',
          tr: '3. ve 4. rekâtta sadece Fâtiha okunur, ek sure olmadan.',
          ar: 'في الركعة الثالثة والرابعة تُقرأ الفاتحة فقط دون سورة.',
          es: 'En la 3.ª y 4.ª raka solo se recita Al-Fatiha, sin sura adicional.',
          fr: 'Aux 3e et 4e rak’a, on ne récite qu’Al-Fatiha, sans sourate supplémentaire.',
        },
  };
}

// Dua al-Qunut (hanafitischer Wortlaut, „Allāhumma innā nastaʿīnuka …"), wird
// im Witr in der 3. Rak'ah nach Al-Fatiha gesprochen. Arabisch + Umschrift
// verbatim aus der etablierten Fassung; religiöse Gegenprüfung s.
// PRAY_ALONG_SOURCE_NOTE / USER-TODO.
function qunutStep(rakah: number): PrayStep {
  return {
    posture: 'qiyam',
    rakah,
    label: {
      de: 'Dua al-Qunut (nur Witr)',
      en: 'Dua al-Qunut (witr only)',
      tr: 'Kunut Duası (yalnız vitir)',
      ar: 'دعاء القنوت (في الوتر)',
      es: 'Dua al-Qunut (solo witr)',
      fr: 'Dua al-Qunut (witr uniquement)',
    },
    arabic:
      'اللَّهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ وَنُؤْمِنُ بِكَ وَنَتَوَكَّلُ عَلَيْكَ وَنُثْنِي عَلَيْكَ الْخَيْرَ، وَنَشْكُرُكَ وَلَا نَكْفُرُكَ، وَنَخْلَعُ وَنَتْرُكُ مَنْ يَفْجُرُكَ. اللَّهُمَّ إِيَّاكَ نَعْبُدُ وَلَكَ نُصَلِّي وَنَسْجُدُ، وَإِلَيْكَ نَسْعَى وَنَحْفِدُ، نَرْجُو رَحْمَتَكَ وَنَخْشَى عَذَابَكَ، إِنَّ عَذَابَكَ بِالْكُفَّارِ مُلْحِقٌ',
    transliteration:
      'allāhumma innā nastaʿīnuka wa-nastaghfiruka wa-nuʾminu bika wa-natawakkalu ʿalayka wa-nuthnī ʿalayka l-khayr, wa-nashkuruka wa-lā nakfuruka, wa-nakhlaʿu wa-natruku man yafjuruk. allāhumma iyyāka naʿbudu wa-laka nuṣallī wa-nasjud, wa-ilayka nasʿā wa-naḥfid, narjū raḥmataka wa-nakhshā ʿadhābak, inna ʿadhābaka bi-l-kuffāri mulḥiq',
    translation: {
      de: 'O Allah, wir bitten Dich um Hilfe und um Vergebung, glauben an Dich und vertrauen auf Dich; wir loben Dich auf das Beste, danken Dir und sind nicht undankbar. Wir sagen uns los von jedem, der Dir ungehorsam ist, und lassen ihn. O Allah, Dir allein dienen wir, für Dich beten und werfen wir uns nieder, zu Dir eilen und streben wir; wir erhoffen Deine Barmherzigkeit und fürchten Deine Strafe. Wahrlich, Deine Strafe ereilt die Ungläubigen.',
      en: 'O Allah, we seek Your help and Your forgiveness, we believe in You and rely upon You; we praise You in the best way, thank You and are not ungrateful. We forsake and abandon whoever disobeys You. O Allah, You alone we worship, for You we pray and prostrate, to You we strive and hasten; we hope for Your mercy and fear Your punishment. Truly, Your punishment will reach the disbelievers.',
      tr: 'Allah’ım! Senden yardım ve bağışlanma dileriz; Sana inanır, Sana tevekkül ederiz. Seni en güzel şekilde över, Sana şükreder, nankörlük etmeyiz. Sana isyan edeni bırakır ve terk ederiz. Allah’ım! Yalnız Sana ibadet eder, yalnız Senin için namaz kılar ve secde ederiz; Sana koşar, Sana yöneliriz. Rahmetini umar, azabından korkarız. Şüphesiz Senin azabın kâfirlere ulaşır.',
      ar: 'اللهم إنا نستعينك ونستغفرك ونؤمن بك ونتوكل عليك ونثني عليك الخير، ونشكرك ولا نكفرك، ونخلع ونترك من يفجرك. اللهم إياك نعبد ولك نصلي ونسجد، وإليك نسعى ونحفد، نرجو رحمتك ونخشى عذابك، إن عذابك بالكفار ملحق.',
      es: 'Oh Alá, buscamos Tu ayuda y Tu perdón, creemos en Ti y confiamos en Ti; Te alabamos del mejor modo, Te agradecemos y no somos ingratos. Nos desligamos y abandonamos a quien Te desobedece. Oh Alá, solo a Ti adoramos, para Ti rezamos y nos postramos, hacia Ti nos esforzamos y acudimos; esperamos Tu misericordia y tememos Tu castigo. En verdad, Tu castigo alcanzará a los incrédulos.',
      fr: 'Ô Allah, nous implorons Ton aide et Ton pardon, nous croyons en Toi et plaçons notre confiance en Toi ; nous Te louons de la meilleure façon, Te remercions et ne renions pas Tes bienfaits. Nous délaissons et abandonnons quiconque Te désobéit. Ô Allah, c’est Toi seul que nous adorons, pour Toi que nous prions et nous prosternons, vers Toi que nous nous empressons ; nous espérons Ta miséricorde et craignons Ton châtiment. En vérité, Ton châtiment atteindra les mécréants.',
    },
    note: {
      de: 'Nur im Witr, in der 3. Rak’ah: nach Al-Fatiha (ohne weitere Sure) „Allahu Akbar" sagen, die Hände heben und dieses Bittgebet leise sprechen, danach in den Ruku gehen. Hanafitisch VOR dem Ruku; andere Rechtsschulen sprechen den Qunut nach dem Ruku bzw. v. a. in der zweiten Ramadan-Hälfte.',
      en: 'Witr only, in the 3rd rakah: after Al-Fatiha (no additional surah) say “Allahu Akbar”, raise the hands and recite this supplication quietly, then go into ruku. Hanafi: BEFORE ruku; other schools recite it after ruku, or mainly in the second half of Ramadan.',
      tr: 'Yalnız vitirde, 3. rekâtta: Fâtiha’dan sonra (ek sure olmadan) „Allahu Ekber" de, elleri kaldır ve bu duayı sessizce oku, sonra rükûya git. Hanefî: rükûdan ÖNCE; diğer mezhepler rükûdan sonra ya da özellikle Ramazan’ın ikinci yarısında okur.',
      ar: 'في الوتر فقط، في الركعة الثالثة: بعد الفاتحة (دون سورة أخرى) قل „الله أكبر" وارفع يديك واقرأ هذا الدعاء سراً، ثم اركع. عند الحنفية قبل الركوع؛ وغيرهم يقنت بعد الركوع أو في النصف الثاني من رمضان.',
      es: 'Solo en witr, en la 3.ª raka: tras Al-Fatiha (sin sura adicional) di «Allahu Akbar», levanta las manos y recita esta súplica en voz baja, luego inclínate en ruku. Hanafí: ANTES del ruku; otras escuelas lo recitan tras el ruku, o sobre todo en la segunda mitad del Ramadán.',
      fr: 'Uniquement au witr, à la 3e rak’a : après Al-Fatiha (sans autre sourate), dis « Allahu Akbar », lève les mains et récite cette invocation à voix basse, puis effectue le ruku. Hanafite : AVANT le ruku ; les autres écoles la récitent après le ruku, ou surtout dans la seconde moitié du Ramadan.',
    },
  };
}

function rukuStep(rakah: number): PrayStep {
  return {
    posture: 'ruku',
    rakah,
    label: {
      de: 'Ruku – Verbeugung',
      en: 'Ruku – bowing',
      tr: 'Rükû',
      ar: 'الركوع',
      es: 'Ruku – inclinación',
      fr: 'Ruku – inclinaison',
    },
    arabic: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ',
    transliteration: 'subḥāna rabbiya l-ʿaẓīm',
    repeat: '×3',
    translation: {
      de: 'Gepriesen sei mein Herr, der Gewaltige.',
      en: 'Glory to my Lord, the Magnificent.',
      tr: 'Yüce Rabbimi tesbih ederim.',
      ar: 'سبحان ربي العظيم.',
      es: 'Gloria a mi Señor, el Grandioso.',
      fr: 'Gloire à mon Seigneur, le Grandiose.',
    },
    note: {
      de: 'Mit „Allahu Akbar" verbeugen: Rücken gerade, Hände auf den Knien. Mindestens dreimal wiederholen.',
      en: 'Bow saying “Allahu Akbar”: back straight, hands on the knees. Repeat at least three times.',
      tr: '„Allahu Ekber" ile eğil: sırt düz, eller dizlerde. En az üç kez tekrarla.',
      ar: 'اركع بـ„الله أكبر": الظهر مستوٍ واليدان على الركبتين. كرّر ثلاثاً على الأقل.',
      es: 'Inclínate diciendo «Allahu Akbar»: espalda recta, manos sobre las rodillas. Repite al menos tres veces.',
      fr: 'Incline-toi en disant « Allahu Akbar » : dos droit, mains sur les genoux. Répète au moins trois fois.',
    },
  };
}

function itidalStep(rakah: number): PrayStep {
  return {
    posture: 'itidal',
    rakah,
    label: {
      de: 'I’tidal – Aufrichten',
      en: 'I’tidal – standing up',
      tr: 'Kavme – doğrulma',
      ar: 'الاعتدال – الرفع من الركوع',
      es: 'I’tidal – levantarse',
      fr: 'I’tidal – se relever',
    },
    arabic: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ · رَبَّنَا وَلَكَ الْحَمْدُ',
    transliteration: 'samiʿa llāhu li-man ḥamidah · rabbanā wa-laka l-ḥamd',
    translation: {
      de: 'Allah hört den, der Ihn lobt. – Unser Herr, Dir gebührt das Lob.',
      en: 'Allah hears the one who praises Him. — Our Lord, to You belongs all praise.',
      tr: 'Allah kendisine hamd edeni işitir. – Rabbimiz, hamd Sanadır.',
      ar: 'سمع الله لمن حمده. – ربنا ولك الحمد.',
      es: 'Alá escucha a quien Lo alaba. – Señor nuestro, a Ti pertenece toda alabanza.',
      fr: 'Allah entend celui qui Le loue. – Notre Seigneur, à Toi appartient la louange.',
    },
    note: {
      de: 'Beim Aufrichten „Sami’Allahu liman hamidah" sagen, im vollständigen Stand „Rabbana wa lakal-hamd".',
      en: 'While rising say “Sami‘Allahu liman hamidah”, and when fully upright “Rabbana wa lakal-hamd”.',
      tr: 'Doğrulurken „Semi’allahu limen hamideh", tam ayaktayken „Rabbena leke’l-hamd".',
      ar: 'ترفع قائلاً „سمع الله لمن حمده"، وعند الاعتدال „ربنا ولك الحمد".',
      es: 'Al levantarte di «Sami‘Allahu liman hamidah» y ya erguido «Rabbana wa lakal-hamd».',
      fr: 'En te relevant, dis « Sami‘Allahu liman hamidah », puis debout « Rabbana wa lakal-hamd ».',
    },
  };
}

function sujudStep(rakah: number, order: 1 | 2): PrayStep {
  return {
    posture: 'sujud',
    rakah,
    label: {
      de: `Sujud – Niederwerfung (${order}. von 2)`,
      en: `Sujud – prostration (${order} of 2)`,
      tr: `Secde (${order}. / 2)`,
      ar: `السجود (${order} من 2)`,
      es: `Sujud – postración (${order} de 2)`,
      fr: `Sujud – prosternation (${order} sur 2)`,
    },
    arabic: 'سُبْحَانَ رَبِّيَ الْأَعْلَى',
    transliteration: 'subḥāna rabbiya l-aʿlā',
    repeat: '×3',
    translation: {
      de: 'Gepriesen sei mein Herr, der Höchste.',
      en: 'Glory to my Lord, the Most High.',
      tr: 'En yüce Rabbimi tesbih ederim.',
      ar: 'سبحان ربي الأعلى.',
      es: 'Gloria a mi Señor, el Altísimo.',
      fr: 'Gloire à mon Seigneur, le Très-Haut.',
    },
    note: {
      de: 'Mit „Allahu Akbar" niederwerfen – Stirn, Nase, beide Handflächen, Knie und Zehenspitzen berühren den Boden. Mindestens dreimal wiederholen.',
      en: 'Prostrate saying “Allahu Akbar” — forehead, nose, both palms, knees and toes touch the ground. Repeat at least three times.',
      tr: '„Allahu Ekber" ile secdeye git – alın, burun, iki avuç, dizler ve ayak parmakları yerde. En az üç kez tekrarla.',
      ar: 'اسجد بـ„الله أكبر": الجبهة والأنف والكفان والركبتان وأطراف القدمين على الأرض. كرّر ثلاثاً على الأقل.',
      es: 'Póstrate diciendo «Allahu Akbar»: frente, nariz, ambas palmas, rodillas y dedos de los pies tocan el suelo. Repite al menos tres veces.',
      fr: 'Prosterne-toi en disant « Allahu Akbar » : front, nez, les deux paumes, genoux et orteils au sol. Répète au moins trois fois.',
    },
  };
}

function jalsaStep(rakah: number): PrayStep {
  return {
    posture: 'jalsa',
    rakah,
    label: {
      de: 'Jalsa – Sitzen zwischen den Niederwerfungen',
      en: 'Jalsa – sitting between prostrations',
      tr: 'Celse – iki secde arası oturuş',
      ar: 'الجلسة بين السجدتين',
      es: 'Jalsa – sentarse entre las postraciones',
      fr: 'Jalsa – s’asseoir entre les prosternations',
    },
    arabic: 'رَبِّ اغْفِرْ لِي',
    transliteration: 'rabbi ghfir lī',
    translation: {
      de: 'Mein Herr, vergib mir.',
      en: 'My Lord, forgive me.',
      tr: 'Rabbim, beni bağışla.',
      ar: 'رب اغفر لي.',
      es: 'Señor mío, perdóname.',
      fr: 'Mon Seigneur, pardonne-moi.',
    },
    note: {
      de: 'Mit „Allahu Akbar" kurz aufsitzen, um Vergebung bitten, danach folgt die zweite Niederwerfung.',
      en: 'Sit up briefly with “Allahu Akbar”, ask for forgiveness, then the second prostration follows.',
      tr: '„Allahu Ekber" ile kısaca otur, bağışlanma dile, sonra ikinci secde gelir.',
      ar: 'اجلس قليلاً بـ„الله أكبر" واطلب المغفرة، ثم تأتي السجدة الثانية.',
      es: 'Siéntate brevemente con «Allahu Akbar», pide perdón y luego viene la segunda postración.',
      fr: 'Assieds-toi brièvement avec « Allahu Akbar », demande pardon, puis vient la seconde prosternation.',
    },
  };
}

function tashahhudStep(rakah: number, final: boolean): PrayStep {
  return {
    posture: 'tashahhud',
    rakah,
    label: final
      ? {
          de: 'Tashahhud – letztes Sitzen',
          en: 'Tashahhud – final sitting',
          tr: 'Tahiyyat – son oturuş',
          ar: 'التشهد – الجلوس الأخير',
          es: 'Tashahhud – sesión final',
          fr: 'Tashahhud – dernière position assise',
        }
      : {
          de: 'Tashahhud – erstes Sitzen',
          en: 'Tashahhud – first sitting',
          tr: 'Tahiyyat – ilk oturuş',
          ar: 'التشهد – الجلوس الأول',
          es: 'Tashahhud – primera sesión',
          fr: 'Tashahhud – première position assise',
        },
    arabic:
      'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration:
      'at-taḥiyyātu lillāh, waṣ-ṣalawātu waṭ-ṭayyibāt, as-salāmu ʿalayka ayyuhā n-nabiyyu wa-raḥmatu llāhi wa-barakātuh, as-salāmu ʿalaynā wa-ʿalā ʿibādi llāhi ṣ-ṣāliḥīn, ashhadu an lā ilāha illā llāh wa-ashhadu anna muḥammadan ʿabduhū wa-rasūluh',
    translation: {
      de: 'Alle Ehrerbietungen, Gebete und guten Taten gehören Allah. Friede sei auf dir, o Prophet, und die Barmherzigkeit Allahs und Seine Segnungen. Friede sei auf uns und auf den rechtschaffenen Dienern Allahs. Ich bezeuge, dass es keinen Gott gibt außer Allah, und ich bezeuge, dass Muhammad Sein Diener und Gesandter ist.',
      en: 'All greetings, prayers and good deeds belong to Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and messenger.',
      tr: 'Bütün tahiyyeler, salavatlar ve güzel işler Allah’a mahsustur. Selam, rahmet ve bereket sana olsun ey Peygamber. Selam bize ve Allah’ın salih kullarına olsun. Şehadet ederim ki Allah’tan başka ilah yoktur ve şehadet ederim ki Muhammed O’nun kulu ve elçisidir.',
      ar: 'التحيات لله والصلوات والطيبات، السلام عليك أيها النبي ورحمة الله وبركاته، السلام علينا وعلى عباد الله الصالحين، أشهد أن لا إله إلا الله وأشهد أن محمداً عبده ورسوله.',
      es: 'Todos los saludos, oraciones y buenas obras pertenecen a Alá. La paz sea contigo, oh Profeta, y la misericordia de Alá y Sus bendiciones. La paz sea con nosotros y con los siervos justos de Alá. Atestiguo que no hay más dios que Alá y atestiguo que Muhammad es Su siervo y mensajero.',
      fr: 'Toutes les salutations, prières et bonnes actions appartiennent à Allah. Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde d’Allah et Ses bénédictions. Que la paix soit sur nous et sur les serviteurs vertueux d’Allah. J’atteste qu’il n’y a de divinité qu’Allah et j’atteste que Muhammad est Son serviteur et Son messager.',
    },
    note: final
      ? {
          de: 'Im Sitzen leise sprechen. Beim Schahada-Teil den rechten Zeigefinger heben (Sunnah). Danach folgen Salawat und der Salam.',
          en: 'Recited quietly while sitting. Raise the right index finger at the shahada part (sunnah). Salawat and the salam follow.',
          tr: 'Otururken sessizce oku. Şehadet kısmında sağ işaret parmağını kaldır (sünnet). Sonra salavat ve selam gelir.',
          ar: 'يُقال سراً في الجلوس. عند الشهادة يُرفع السبابة اليمنى (سنة). ثم تأتي الصلاة الإبراهيمية والتسليم.',
          es: 'Se recita en voz baja sentado. En la shahada levanta el índice derecho (sunna). Siguen la salawat y el salam.',
          fr: 'À réciter à voix basse, assis. Lève l’index droit lors de la shahada (sunna). Suivent la salawat et le salam.',
        }
      : {
          de: 'Nach der zweiten Rak’ah im Sitzen leise sprechen. Beim Schahada-Teil den rechten Zeigefinger heben (Sunnah). Danach zur nächsten Rak’ah aufstehen.',
          en: 'After the second rakah, recited quietly while sitting. Raise the right index finger at the shahada part (sunnah). Then stand up for the next rakah.',
          tr: 'İkinci rekâttan sonra otururken sessizce oku. Şehadette sağ işaret parmağını kaldır (sünnet). Sonra bir sonraki rekât için ayağa kalk.',
          ar: 'بعد الركعة الثانية يُقال سراً في الجلوس. عند الشهادة يُرفع السبابة (سنة). ثم تقوم للركعة التالية.',
          es: 'Tras la segunda raka, se recita sentado en voz baja. En la shahada levanta el índice (sunna). Luego levántate para la siguiente raka.',
          fr: 'Après la deuxième rak’a, à réciter assis à voix basse. Lève l’index lors de la shahada (sunna). Lève-toi ensuite pour la rak’a suivante.',
        },
  };
}

function salawatStep(rakah: number): PrayStep {
  return {
    posture: 'tashahhud',
    rakah,
    label: {
      de: 'Salawat – Segenswünsche auf den Propheten ﷺ',
      en: 'Salawat – blessings upon the Prophet ﷺ',
      tr: 'Salli-Barik – Peygamber’e ﷺ salavat',
      ar: 'الصلاة الإبراهيمية',
      es: 'Salawat – bendiciones sobre el Profeta ﷺ',
      fr: 'Salawat – bénédictions sur le Prophète ﷺ',
    },
    arabic:
      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ. اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration:
      'allāhumma ṣalli ʿalā muḥammadin wa-ʿalā āli muḥammad, kamā ṣallayta ʿalā ibrāhīma wa-ʿalā āli ibrāhīm, innaka ḥamīdun majīd. allāhumma bārik ʿalā muḥammadin wa-ʿalā āli muḥammad, kamā bārakta ʿalā ibrāhīma wa-ʿalā āli ibrāhīm, innaka ḥamīdun majīd',
    translation: {
      de: 'O Allah, segne Muhammad und die Familie Muhammads, wie Du Ibrahim und die Familie Ibrahims gesegnet hast; wahrlich, Du bist lobenswert, ruhmreich. O Allah, sei gnädig zu Muhammad und der Familie Muhammads, wie Du Ibrahim und der Familie Ibrahims gnädig warst; wahrlich, Du bist lobenswert, ruhmreich.',
      en: 'O Allah, send blessings upon Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; indeed, You are praiseworthy, glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; indeed, You are praiseworthy, glorious.',
      tr: 'Allah’ım, İbrahim’e ve İbrahim’in ailesine salat ettiğin gibi Muhammed’e ve ailesine salat et; şüphesiz Sen övgüye layıksın, şanlısın. Allah’ım, İbrahim’i ve ailesini mübarek kıldığın gibi Muhammed’i ve ailesini mübarek kıl; şüphesiz Sen övgüye layıksın, şanlısın.',
      ar: 'اللهم صل على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد. اللهم بارك على محمد وعلى آل محمد كما باركت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد.',
      es: 'Oh Alá, bendice a Muhammad y a la familia de Muhammad, como bendijiste a Ibrahim y a la familia de Ibrahim; en verdad, Tú eres digno de alabanza, glorioso. Oh Alá, colma de gracia a Muhammad y a su familia, como lo hiciste con Ibrahim y su familia; en verdad, Tú eres digno de alabanza, glorioso.',
      fr: 'Ô Allah, bénis Muhammad et la famille de Muhammad, comme Tu as béni Ibrahim et la famille d’Ibrahim ; en vérité, Tu es digne de louange, glorieux. Ô Allah, accorde Ta grâce à Muhammad et à sa famille, comme Tu l’as fait pour Ibrahim et sa famille ; en vérité, Tu es digne de louange, glorieux.',
    },
    note: {
      de: 'Im letzten Sitzen direkt nach dem Tashahhud.',
      en: 'In the final sitting, directly after the tashahhud.',
      tr: 'Son oturuşta, tahiyyattan hemen sonra.',
      ar: 'في الجلوس الأخير بعد التشهد مباشرة.',
      es: 'En la sesión final, justo después del tashahhud.',
      fr: 'Dans la dernière position assise, juste après le tashahhud.',
    },
  };
}

function refugeDuaStep(rakah: number): PrayStep {
  return {
    posture: 'tashahhud',
    rakah,
    label: {
      de: 'Bittgebet vor dem Salam (Sunnah)',
      en: 'Supplication before the salam (sunnah)',
      tr: 'Selamdan önce dua (sünnet)',
      ar: 'دعاء قبل السلام (سنة)',
      es: 'Súplica antes del salam (sunna)',
      fr: 'Invocation avant le salam (sunna)',
    },
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، وَمِنْ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ',
    transliteration:
      'allāhumma innī aʿūdhu bika min ʿadhābi l-qabr, wa-min fitnati l-masīḥi d-dajjāl, wa-min fitnati l-maḥyā wa-l-mamāt',
    translation: {
      de: 'O Allah, ich suche Zuflucht bei Dir vor der Strafe des Grabes, vor der Versuchung des Dajjal und vor der Versuchung des Lebens und des Todes.',
      en: 'O Allah, I seek refuge in You from the punishment of the grave, from the trial of the Dajjal, and from the trial of life and death.',
      tr: 'Allah’ım, kabir azabından, Deccal fitnesinden ve hayat ile ölüm fitnesinden Sana sığınırım.',
      ar: 'اللهم إني أعوذ بك من عذاب القبر، ومن فتنة المسيح الدجال، ومن فتنة المحيا والممات.',
      es: 'Oh Alá, busco refugio en Ti del castigo de la tumba, de la prueba del Dajjal y de la prueba de la vida y de la muerte.',
      fr: 'Ô Allah, je cherche refuge auprès de Toi contre le châtiment de la tombe, contre l’épreuve du Dajjal et contre l’épreuve de la vie et de la mort.',
    },
    note: {
      de: 'Empfohlen (Sunnah) im letzten Sitzen nach der Salawat, vor dem Salam. Danach darf man mit eigenen Worten bitten.',
      en: 'Recommended (sunnah) in the final sitting after the salawat, before the salam. You may then make your own supplication.',
      tr: 'Son oturuşta salavattan sonra, selamdan önce müstehaptır. Ardından kendi sözlerinle dua edebilirsin.',
      ar: 'يُستحب في الجلوس الأخير بعد الصلاة الإبراهيمية وقبل السلام. ثم تدعو بما شئت.',
      es: 'Recomendada (sunna) en la sesión final tras la salawat, antes del salam. Luego puedes suplicar con tus propias palabras.',
      fr: 'Recommandée (sunna) dans la dernière position assise après la salawat, avant le salam. Tu peux ensuite invoquer avec tes propres mots.',
    },
  };
}

function salamStep(rakah: number): PrayStep {
  return {
    posture: 'salam',
    rakah,
    label: {
      de: 'Salam – Abschluss',
      en: 'Salam – closing',
      tr: 'Selam – bitiriş',
      ar: 'التسليم',
      es: 'Salam – cierre',
      fr: 'Salam – clôture',
    },
    arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',
    transliteration: 'as-salāmu ʿalaykum wa-raḥmatullāh',
    translation: {
      de: 'Friede sei mit euch und die Barmherzigkeit Allahs.',
      en: 'Peace be upon you and the mercy of Allah.',
      tr: 'Selam ve Allah’ın rahmeti üzerinize olsun.',
      ar: 'السلام عليكم ورحمة الله.',
      es: 'La paz sea con vosotros y la misericordia de Alá.',
      fr: 'Que la paix soit sur vous et la miséricorde d’Allah.',
    },
    note: {
      de: 'Den Kopf nach rechts drehen und den Friedensgruß sprechen, dann nach links wiederholen. Das Gebet ist damit beendet.',
      en: 'Turn the head to the right with the greeting of peace, then repeat to the left. The prayer is now complete.',
      tr: 'Başını sağa çevirip selam ver, sonra sola tekrarla. Namaz tamamlandı.',
      ar: 'التفت بوجهك يميناً بالسلام ثم كرّر يساراً. بهذا تمت الصلاة.',
      es: 'Gira la cabeza a la derecha con el saludo de paz y repite a la izquierda. La oración ha terminado.',
      fr: 'Tourne la tête vers la droite avec la salutation de paix, puis répète vers la gauche. La prière est terminée.',
    },
  };
}

/**
 * Baut die vollständige Schrittfolge für ein Gebet nach verbreiteter
 * (hanafitischer) Ordnung. Ablauf je Rak'ah: Rezitation → (Witr: Qunut in
 * Rak'ah 3) → Ruku → I'tidal → Sujud 1 → Jalsa → Sujud 2. Nach der 2. Rak'ah
 * (bei Gebeten mit > 2 Rak'ah bzw. Witr) folgt das erste Tashahhud; in der
 * letzten Rak'ah das abschließende Tashahhud + Salawat + Zuflucht-Bittgebet +
 * Salam.
 */
export function buildSteps(id: PrayerId, opts?: { witrSurahInThird?: boolean }): PrayStep[] {
  const prayer = prayerById(id);
  if (!prayer) return [];
  const { rakahs, witr } = prayer;
  const steps: PrayStep[] = [takbirStep(), sanaStep()];

  for (let r = 1; r <= rakahs; r++) {
    // Die zusätzliche Sure nach Al-Fatiha wird standardmäßig NUR in den ersten
    // beiden Rak'ah gelesen. Für Witr kann der Nutzer – je nach Rechtsschule –
    // optional auch in der 3. Rak'ah (vor dem Qunut) eine Sure aktivieren
    // (opts.witrSurahInThird). Der In-App-Hinweis empfiehlt dazu einen Gelehrten.
    const withSurah = r <= 2 || (!!witr && r === 3 && !!opts?.witrSurahInThird);
    steps.push(recitationStep(r, withSurah));
    // Nach Al-Fatiha die kurze Sure als eigener Schritt (Rak'ah 1 → Al-Ikhlas,
    // Rak'ah 2 → Al-Kawthar).
    if (withSurah) steps.push(shortSurahStep(r));
    if (witr && r === 3) steps.push(qunutStep(r));
    steps.push(rukuStep(r), itidalStep(r), sujudStep(r, 1), jalsaStep(r), sujudStep(r, 2));

    const isFinal = r === rakahs;
    if (isFinal) {
      steps.push(tashahhudStep(r, true), salawatStep(r), refugeDuaStep(r), salamStep(r));
    } else if (r === 2) {
      // Erstes Sitzen nach der 2. Rak'ah (bei 3/4-Rak'ah-Gebeten und Witr).
      steps.push(tashahhudStep(r, false));
    }
  }

  return steps;
}

// ── Kern-Texte für die Lern-Ansicht ("Beten lernen") ─────────────────────────
// Die drei Texte, die Anfänger als Erstes vollständig können müssen: die
// komplette Al-Fatiha (7 Verse, in jeder Rak'ah Pflicht) sowie die beiden
// kürzesten Suren Al-Ikhlas und Al-Kawthar. Alle drei stammen 1:1 aus den
// oben geprüften Konstanten/Schritten — hier wird nichts dupliziert.
const AL_FATIHA_LABEL: LocalizedText = {
  de: 'Al-Fatiha – die Eröffnende (Pflicht in jeder Rak’ah)',
  en: 'Al-Fatiha – the Opening (required in every rakah)',
  tr: 'Fâtiha – açılış suresi (her rekâtta farz)',
  ar: 'الفاتحة – فاتحة الكتاب (ركن في كل ركعة)',
  es: 'Al-Fatiha – la Apertura (obligatoria en cada raka)',
  fr: 'Al-Fatiha – l’Ouverture (obligatoire à chaque rak’a)',
};

export const LEARN_CORE_TEXTS: PrayStep[] = [
  {
    posture: 'qiyam',
    isSurah: true,
    label: AL_FATIHA_LABEL,
    arabic: AL_FATIHA_ARABIC,
    transliteration: AL_FATIHA_TRANSLIT,
    translation: AL_FATIHA_TRANSLATION,
  },
  shortSurahStep(1), // Al-Ikhlas
  shortSurahStep(2), // Al-Kawthar
];

// ── UI-Texte (inline lokalisiert, keine i18n-Keys → keine locales/*.json-Änderung,
//    resolveText fällt für nicht abgedeckte Sprachen auf en/de zurück, wie bei
//    guides.json) ───────────────────────────────────────────────────────────
export const PRAY_ALONG_ENTRY = {
  title: {
    de: 'Gebet mitbeten',
    en: 'Pray along',
    tr: 'Namaza eşlik et',
    ar: 'صلِّ خطوة بخطوة',
    es: 'Reza paso a paso',
    fr: 'Prier pas à pas',
  } as LocalizedText,
  subtitle: {
    de: 'Halte den Bildschirm während des Gebets offen und folge Wortlaut und Haltung Schritt für Schritt.',
    en: 'Keep the screen open during prayer and follow the words and postures step by step.',
    tr: 'Namaz boyunca ekranı açık tut; sözleri ve hareketleri adım adım takip et.',
    ar: 'أبقِ الشاشة مفتوحة أثناء الصلاة وتابع النص والحركات خطوة بخطوة.',
    es: 'Mantén la pantalla abierta durante la oración y sigue las palabras y posturas paso a paso.',
    fr: 'Garde l’écran ouvert pendant la prière et suis les paroles et les postures étape par étape.',
  } as LocalizedText,
};

export const PRAY_ALONG_UI = {
  title: PRAY_ALONG_ENTRY.title,
  pickPrompt: {
    de: 'Welches Gebet möchtest du mitbeten?',
    en: 'Which prayer would you like to pray along?',
    tr: 'Hangi namaza eşlik etmek istersin?',
    ar: 'أي صلاة تريد أن تتابعها؟',
    es: '¿Qué oración quieres seguir?',
    fr: 'Quelle prière veux-tu suivre ?',
  } as LocalizedText,
  disclaimer: {
    de: 'Ablauf nach verbreiteter (hanafitischer) Zählung; Unterschiede der Rechtsschulen sind als Hinweis markiert. Nur die Fard-Rak’ah werden gezeigt.',
    en: 'Sequence follows the widespread (Hanafi) count; differences between schools are marked as hints. Only the fard rakahs are shown.',
    tr: 'Sıra yaygın (Hanefî) sayıma göredir; mezhep farkları hinweis olarak işaretlidir. Yalnız farz rekâtlar gösterilir.',
    ar: 'الترتيب على المشهور عند الحنفية؛ اختلاف المذاهب مذكور كتنبيه. تُعرض ركعات الفرض فقط.',
    es: 'La secuencia sigue el recuento (hanafí) más extendido; las diferencias entre escuelas se marcan como notas. Solo se muestran las rakat fard.',
    fr: 'La séquence suit le décompte (hanafite) répandu ; les différences entre écoles sont indiquées. Seules les rak’a fard sont montrées.',
  } as LocalizedText,
  step: {
    de: 'Schritt',
    en: 'Step',
    tr: 'Adım',
    ar: 'خطوة',
    es: 'Paso',
    fr: 'Étape',
  } as LocalizedText,
  rakahLabel: {
    de: 'Rak’ah',
    en: 'Rak’ah',
    tr: 'Rekât',
    ar: 'ركعة',
    es: 'Raka',
    fr: 'Rak’a',
  } as LocalizedText,
  next: {
    de: 'Weiter',
    en: 'Next',
    tr: 'İleri',
    ar: 'التالي',
    es: 'Siguiente',
    fr: 'Suivant',
  } as LocalizedText,
  prev: {
    de: 'Zurück',
    en: 'Back',
    tr: 'Geri',
    ar: 'السابق',
    es: 'Atrás',
    fr: 'Précédent',
  } as LocalizedText,
  finish: {
    de: 'Beenden',
    en: 'Finish',
    tr: 'Bitir',
    ar: 'إنهاء',
    es: 'Terminar',
    fr: 'Terminer',
  } as LocalizedText,
  change: {
    de: 'Gebet wechseln',
    en: 'Change prayer',
    tr: 'Namazı değiştir',
    ar: 'تغيير الصلاة',
    es: 'Cambiar oración',
    fr: 'Changer de prière',
  } as LocalizedText,
  tapToHear: {
    de: 'Zum Anhören auf den arabischen Text tippen',
    en: 'Tap the Arabic text to listen',
    tr: 'Dinlemek için Arapça metne dokun',
    ar: 'انقر على النص العربي للاستماع',
    es: 'Toca el texto árabe para escuchar',
    fr: 'Touche le texte arabe pour écouter',
  } as LocalizedText,
  // Witr-spezifische Option + Hinweis (nur im Witr sichtbar).
  witrSurahLabel: {
    de: 'Witr: Sure auch in der 3. Rak’ah',
    en: 'Witr: surah also in the 3rd rakah',
    tr: 'Vitir: 3. rekâtta da sure',
    ar: 'الوتر: سورة في الركعة الثالثة أيضاً',
    es: 'Witr: sura también en la 3.ª raka',
    fr: 'Witr : sourate aussi à la 3e rak’a',
  } as LocalizedText,
  witrScholarNote: {
    de: 'Die Form des Witr – besonders ob in der 3. Rak’ah nach Al-Fatiha eine Sure folgt und wo der Qunut steht – unterscheidet sich je nach Rechtsschule. Richte dich nach deiner Rechtsschule und frage im Zweifel einen Gelehrten.',
    en: 'The form of witr – especially whether a surah follows Al-Fatiha in the 3rd rakah and where the qunut is placed – differs between the schools of law. Follow your own school and, when in doubt, ask a scholar.',
    tr: 'Vitrin şekli – özellikle 3. rekâtta Fâtiha’dan sonra sure okunup okunmayacağı ve Kunut’un yeri – mezhebe göre değişir. Kendi mezhebine uy ve şüphe hâlinde bir âlime danış.',
    ar: 'تختلف صفة الوتر بين المذاهب – خاصة هل تُقرأ سورة بعد الفاتحة في الركعة الثالثة وأين يكون القنوت. اتبع مذهبك، وعند الشك اسأل عالماً.',
    es: 'La forma del witr – en especial si tras Al-Fatiha se recita una sura en la 3.ª raka y dónde se coloca el qunut – varía según la escuela jurídica. Sigue tu escuela y, en caso de duda, consulta a un sabio.',
    fr: 'La forme du witr – notamment si une sourate suit Al-Fatiha à la 3e rak’a et où se place le qunut – diffère selon les écoles juridiques. Suis ton école et, en cas de doute, demande à un savant.',
  } as LocalizedText,
};
