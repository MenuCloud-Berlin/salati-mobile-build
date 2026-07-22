// 1:1 portiert aus apps/device/src/components/Settings.tsx (METHODS-Array).
// Nicht eigenständig verändern ohne den Ursprung mitzuziehen — beide Apps
// sollen dieselben Aladhan-Berechnungsmethoden anbieten.
export const METHODS = [
  { id: 13, name: 'Diyanet (Türkei) - Standard' },
  { id: 2, name: 'ISNA (Nordamerika)' },
  { id: 3, name: 'Muslim World League' },
  { id: 4, name: 'Umm al-Qura (Makkah)' },
  { id: 5, name: 'Egyptian General Authority' },
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Singapore (MUIS)' },
  { id: 12, name: 'Union Organisation Islamique de France' },
  { id: 14, name: 'Spiritual Admin Muslims Russia' },
  { id: 15, name: 'Moonsighting Committee Worldwide' },
] as const;

export const SCHOOLS = [
  { id: 0, name: 'Früher (Shafi/Maliki/Hanbali — Standard)' },
  { id: 1, name: 'Später (Hanafi)' },
] as const;
