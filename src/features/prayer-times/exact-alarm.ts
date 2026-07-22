import { NativeModules, Platform } from 'react-native';

// JS-Seite des ExactAlarmModule.kt (android/app/.../alarm/) — siehe dortigen
// Kommentar für den vollen Root-Cause-Kontext (5h-zu-spät-Nutzermeldung,
// expo-notifications faellt ohne SCHEDULE_EXACT_ALARM lautlos auf ungenaues
// Doze-tolerantes Scheduling zurück). Analog zu wear-sync.ts: das native
// Modul ist NICHT autolinked und in dieser Session nie in einem echten Build
// verifiziert worden — jeder Aufruf ist deshalb defensiv (optional chaining
// + try/catch) und liefert im Zweifel `null` ("Status unbekannt") statt zu
// crashen oder einen falschen Status vorzutäuschen.

const NATIVE_MODULE_NAME = 'ExactAlarmStatus';

interface ExactAlarmNativeModule {
  canScheduleExactAlarms?: () => Promise<boolean>;
}

/**
 * true/false = Status vom nativen AlarmManager bekannt (nur Android ab API
 * 31 überhaupt relevant, siehe Kotlin-Seite). `null` auf iOS/Web, wenn das
 * native Modul (noch) nicht registriert ist, oder bei jedem Lesefehler —
 * Aufrufer müssen `null` als "keine Aussage möglich" behandeln, NICHT als
 * "nicht erlaubt" (sonst würde z. B. iOS fälschlich eine Android-Warnung
 * anzeigen).
 */
export async function checkExactAlarmPermission(): Promise<boolean | null> {
  if (Platform.OS !== 'android') return null;
  const native = (NativeModules as Record<string, ExactAlarmNativeModule | undefined>)[NATIVE_MODULE_NAME];
  if (!native?.canScheduleExactAlarms) return null;
  try {
    return await native.canScheduleExactAlarms();
  } catch {
    return null;
  }
}
