// Die 99 Namen Allahs (al-Asma al-Husna) nach der verbreiteten
// Tirmidhi-Liste. Bedeutungen bewusst knapp (1 Zeile) in de/en/tr —
// es/fr fallen auf Englisch zurück, ar zeigt nur den Namen.

export interface DivineName {
  n: number;
  arabic: string;
  translit: string;
  de: string;
  en: string;
  tr: string;
}

type Row = [string, string, string, string, string];

const ROWS: Row[] = [
  ['الرَّحْمَنُ', 'Ar-Rahman', 'Der Allerbarmer', 'The Most Merciful', 'Rahmeti sonsuz olan'],
  ['الرَّحِيمُ', 'Ar-Rahim', 'Der Barmherzige', 'The Bestower of Mercy', 'Merhameti sonsuz olan'],
  ['الْمَلِكُ', 'Al-Malik', 'Der König', 'The King', 'Mülkün sahibi'],
  ['الْقُدُّوسُ', 'Al-Quddus', 'Der Heilige', 'The Most Holy', 'Her eksiklikten uzak'],
  ['السَّلَامُ', 'As-Salam', 'Der Frieden', 'The Source of Peace', 'Esenlik veren'],
  ['الْمُؤْمِنُ', 'Al-Mu’min', 'Der Sicherheit Gebende', 'The Giver of Security', 'Güven veren'],
  ['الْمُهَيْمِنُ', 'Al-Muhaymin', 'Der Bewahrer', 'The Guardian', 'Gözetip koruyan'],
  ['الْعَزِيزُ', 'Al-Aziz', 'Der Allmächtige', 'The Almighty', 'Mutlak galip'],
  ['الْجَبَّارُ', 'Al-Jabbar', 'Der Bezwinger', 'The Compeller', 'Dilediğini yaptıran'],
  ['الْمُتَكَبِّرُ', 'Al-Mutakabbir', 'Der Erhabene', 'The Supreme', 'Büyüklükte eşsiz'],
  ['الْخَالِقُ', 'Al-Khaliq', 'Der Schöpfer', 'The Creator', 'Yaratan'],
  ['الْبَارِئُ', 'Al-Bari', 'Der Gestalter', 'The Originator', 'Örneksiz yaratan'],
  ['الْمُصَوِّرُ', 'Al-Musawwir', 'Der Formgeber', 'The Fashioner', 'Şekil veren'],
  ['الْغَفَّارُ', 'Al-Ghaffar', 'Der immer wieder Vergebende', 'The All-Forgiving', 'Çok bağışlayan'],
  ['الْقَهَّارُ', 'Al-Qahhar', 'Der Alles-Bezwingende', 'The Subduer', 'Her şeye galip gelen'],
  ['الْوَهَّابُ', 'Al-Wahhab', 'Der Freigebige', 'The Bestower', 'Karşılıksız veren'],
  ['الرَّزَّاقُ', 'Ar-Razzaq', 'Der Versorger', 'The Provider', 'Rızık veren'],
  ['الْفَتَّاحُ', 'Al-Fattah', 'Der Öffnende', 'The Opener', 'Kapıları açan'],
  ['الْعَلِيمُ', 'Al-Alim', 'Der Allwissende', 'The All-Knowing', 'Her şeyi bilen'],
  ['الْقَابِضُ', 'Al-Qabid', 'Der Zurückhaltende', 'The Withholder', 'Daraltan'],
  ['الْبَاسِطُ', 'Al-Basit', 'Der Gewährende', 'The Extender', 'Genişleten'],
  ['الْخَافِضُ', 'Al-Khafid', 'Der Erniedrigende', 'The Abaser', 'Alçaltan'],
  ['الرَّافِعُ', 'Ar-Rafi', 'Der Erhöhende', 'The Exalter', 'Yücelten'],
  ['الْمُعِزُّ', 'Al-Mu’izz', 'Der Ehre Verleihende', 'The Giver of Honor', 'Şeref veren'],
  ['الْمُذِلُّ', 'Al-Mudhill', 'Der Demütigende', 'The Humiliator', 'Zillete düşüren'],
  ['السَّمِيعُ', 'As-Sami', 'Der Allhörende', 'The All-Hearing', 'Her şeyi işiten'],
  ['الْبَصِيرُ', 'Al-Basir', 'Der Allsehende', 'The All-Seeing', 'Her şeyi gören'],
  ['الْحَكَمُ', 'Al-Hakam', 'Der Richter', 'The Judge', 'Hükmeden'],
  ['الْعَدْلُ', 'Al-Adl', 'Der Gerechte', 'The Just', 'Mutlak adil'],
  ['اللَّطِيفُ', 'Al-Latif', 'Der Feinfühlige', 'The Subtle One', 'Lütfu ince olan'],
  ['الْخَبِيرُ', 'Al-Khabir', 'Der Kundige', 'The All-Aware', 'Her şeyden haberdar'],
  ['الْحَلِيمُ', 'Al-Halim', 'Der Nachsichtige', 'The Forbearing', 'Cezada acele etmeyen'],
  ['الْعَظِيمُ', 'Al-Azim', 'Der Gewaltige', 'The Magnificent', 'Azamet sahibi'],
  ['الْغَفُورُ', 'Al-Ghafur', 'Der Vielvergebende', 'The Forgiving', 'Günahları örten'],
  ['الشَّكُورُ', 'Ash-Shakur', 'Der Dankbare', 'The Appreciative', 'Az amele çok veren'],
  ['الْعَلِيُّ', 'Al-Ali', 'Der Höchste', 'The Most High', 'En yüce'],
  ['الْكَبِيرُ', 'Al-Kabir', 'Der Große', 'The Most Great', 'En büyük'],
  ['الْحَفِيظُ', 'Al-Hafiz', 'Der Behütende', 'The Preserver', 'Koruyup gözeten'],
  ['الْمُقِيتُ', 'Al-Muqit', 'Der Erhalter', 'The Sustainer', 'Her canlının azığını veren'],
  ['الْحَسِيبُ', 'Al-Hasib', 'Der Abrechnende', 'The Reckoner', 'Hesaba çeken'],
  ['الْجَلِيلُ', 'Al-Jalil', 'Der Majestätische', 'The Majestic', 'Celal sahibi'],
  ['الْكَرِيمُ', 'Al-Karim', 'Der Großzügige', 'The Generous', 'Cömertliği sonsuz'],
  ['الرَّقِيبُ', 'Ar-Raqib', 'Der Wachende', 'The Watchful', 'Her an gözeten'],
  ['الْمُجِيبُ', 'Al-Mujib', 'Der Erhörende', 'The Responsive', 'Duaları kabul eden'],
  ['الْوَاسِعُ', 'Al-Wasi', 'Der Allumfassende', 'The All-Encompassing', 'İlmi ve rahmeti geniş'],
  ['الْحَكِيمُ', 'Al-Hakim', 'Der Allweise', 'The All-Wise', 'Hüküm ve hikmet sahibi'],
  ['الْوَدُودُ', 'Al-Wadud', 'Der Liebevolle', 'The Loving', 'Kullarını seven'],
  ['الْمَجِيدُ', 'Al-Majid', 'Der Ruhmreiche', 'The Glorious', 'Şanı yüce'],
  ['الْبَاعِثُ', 'Al-Ba’ith', 'Der Auferweckende', 'The Resurrector', 'Ölüleri dirilten'],
  ['الشَّهِيدُ', 'Ash-Shahid', 'Der Zeuge', 'The Witness', 'Her şeye şahit'],
  ['الْحَقُّ', 'Al-Haqq', 'Die Wahrheit', 'The Truth', 'Mutlak gerçek'],
  ['الْوَكِيلُ', 'Al-Wakil', 'Der Sachwalter', 'The Trustee', 'Kendisine güvenilen'],
  ['الْقَوِيُّ', 'Al-Qawiyy', 'Der Starke', 'The All-Strong', 'Kudreti sonsuz'],
  ['الْمَتِينُ', 'Al-Matin', 'Der Feste', 'The Firm', 'Sarsılmaz güç sahibi'],
  ['الْوَلِيُّ', 'Al-Waliyy', 'Der Beschützer', 'The Protecting Friend', 'Dost ve yardımcı'],
  ['الْحَمِيدُ', 'Al-Hamid', 'Der Lobenswerte', 'The Praiseworthy', 'Övgüye layık'],
  ['الْمُحْصِي', 'Al-Muhsi', 'Der Alles-Erfassende', 'The Accounter', 'Her şeyi tek tek bilen'],
  ['الْمُبْدِئُ', 'Al-Mubdi', 'Der Beginnende', 'The Originator', 'İlk kez yaratan'],
  ['الْمُعِيدُ', 'Al-Mu’id', 'Der Wiederholende', 'The Restorer', 'Yeniden dirilten'],
  ['الْمُحْيِي', 'Al-Muhyi', 'Der Lebensspender', 'The Giver of Life', 'Hayat veren'],
  ['الْمُمِيتُ', 'Al-Mumit', 'Der Tod Gebende', 'The Bringer of Death', 'Öldüren'],
  ['الْحَيُّ', 'Al-Hayy', 'Der Lebendige', 'The Ever-Living', 'Daima diri'],
  ['الْقَيُّومُ', 'Al-Qayyum', 'Der Beständige', 'The Self-Subsisting', 'Her şeyi ayakta tutan'],
  ['الْوَاجِدُ', 'Al-Wajid', 'Der Findende', 'The Perceiver', 'Dilediğini bulan'],
  ['الْمَاجِدُ', 'Al-Majid', 'Der Edle', 'The Illustrious', 'Şeref ve kerem sahibi'],
  ['الْوَاحِدُ', 'Al-Wahid', 'Der Eine', 'The One', 'Tek olan'],
  ['الْأَحَدُ', 'Al-Ahad', 'Der Einzige', 'The Unique', 'Bir olan'],
  ['الصَّمَدُ', 'As-Samad', 'Der Absolute', 'The Eternal Refuge', 'Her şey O’na muhtaç'],
  ['الْقَادِرُ', 'Al-Qadir', 'Der Mächtige', 'The Capable', 'Güç yetiren'],
  ['الْمُقْتَدِرُ', 'Al-Muqtadir', 'Der Allvermögende', 'The Omnipotent', 'Kudreti her şeye yeten'],
  ['الْمُقَدِّمُ', 'Al-Muqaddim', 'Der Vorziehende', 'The Expediter', 'Öne alan'],
  ['الْمُؤَخِّرُ', 'Al-Mu’akhkhir', 'Der Aufschiebende', 'The Delayer', 'Geriye bırakan'],
  ['الْأَوَّلُ', 'Al-Awwal', 'Der Erste', 'The First', 'Başlangıcı olmayan'],
  ['الْآخِرُ', 'Al-Akhir', 'Der Letzte', 'The Last', 'Sonu olmayan'],
  ['الظَّاهِرُ', 'Az-Zahir', 'Der Offenbare', 'The Manifest', 'Varlığı apaçık'],
  ['الْبَاطِنُ', 'Al-Batin', 'Der Verborgene', 'The Hidden', 'Gizliye de hâkim'],
  ['الْوَالِي', 'Al-Wali', 'Der Herrscher', 'The Governor', 'İşleri yöneten'],
  ['الْمُتَعَالِي', 'Al-Muta’ali', 'Der Hocherhabene', 'The Most Exalted', 'Yüceler yücesi'],
  ['الْبَرُّ', 'Al-Barr', 'Der Gütige', 'The Source of Goodness', 'İyiliği bol'],
  ['التَّوَّابُ', 'At-Tawwab', 'Der Reue Annehmende', 'The Acceptor of Repentance', 'Tevbeleri kabul eden'],
  ['الْمُنْتَقِمُ', 'Al-Muntaqim', 'Der Vergeltende', 'The Avenger', 'Suçluları cezalandıran'],
  ['الْعَفُوُّ', 'Al-Afuww', 'Der Verzeihende', 'The Pardoner', 'Affeden'],
  ['الرَّءُوفُ', 'Ar-Ra’uf', 'Der Mitfühlende', 'The Compassionate', 'Çok şefkatli'],
  ['مَالِكُ الْمُلْكِ', 'Malik-ul-Mulk', 'Der Herr der Herrschaft', 'Owner of Sovereignty', 'Mülkün ebedî sahibi'],
  ['ذُو الْجَلَالِ وَالْإِكْرَامِ', 'Dhul-Jalali wal-Ikram', 'Herr von Majestät und Ehre', 'Lord of Majesty and Honor', 'Celal ve ikram sahibi'],
  ['الْمُقْسِطُ', 'Al-Muqsit', 'Der Gerecht Handelnde', 'The Equitable', 'Adaletle hükmeden'],
  ['الْجَامِعُ', 'Al-Jami', 'Der Versammelnde', 'The Gatherer', 'Toplayıp bir araya getiren'],
  ['الْغَنِيُّ', 'Al-Ghaniyy', 'Der Reiche', 'The Self-Sufficient', 'Hiçbir şeye muhtaç olmayan'],
  ['الْمُغْنِي', 'Al-Mughni', 'Der Reich Machende', 'The Enricher', 'Zengin eden'],
  ['الْمَانِعُ', 'Al-Mani', 'Der Verwehrende', 'The Preventer', 'Dilediğini engelleyen'],
  ['الضَّارُّ', 'Ad-Darr', 'Der Schaden Zulassende', 'The Afflicter', 'Zarara izin veren'],
  ['النَّافِعُ', 'An-Nafi', 'Der Nützende', 'The Benefiter', 'Fayda veren'],
  ['النُّورُ', 'An-Nur', 'Das Licht', 'The Light', 'Nur'],
  ['الْهَادِي', 'Al-Hadi', 'Der Rechtleitende', 'The Guide', 'Hidayet veren'],
  ['الْبَدِيعُ', 'Al-Badi', 'Der Urheber ohne Vorbild', 'The Incomparable Originator', 'Eşsiz yaratan'],
  ['الْبَاقِي', 'Al-Baqi', 'Der Ewig-Bleibende', 'The Everlasting', 'Bâki olan'],
  ['الْوَارِثُ', 'Al-Warith', 'Der Erbe', 'The Inheritor', 'Her şeyin son sahibi'],
  ['الرَّشِيدُ', 'Ar-Rashid', 'Der Rechtweisende', 'The Guide to the Right Path', 'Doğru yola ileten'],
  ['الصَّبُورُ', 'As-Sabur', 'Der Geduldige', 'The Patient', 'Sabrı sonsuz'],
];

export const DIVINE_NAMES: DivineName[] = ROWS.map((r, i) => ({
  n: i + 1,
  arabic: r[0],
  translit: r[1],
  de: r[2],
  en: r[3],
  tr: r[4],
}));

export function nameMeaning(name: DivineName, locale: string): string {
  if (locale === 'de') return name.de;
  if (locale === 'tr') return name.tr;
  if (locale === 'ar') return '';
  return name.en; // en + es/fr-Fallback
}
