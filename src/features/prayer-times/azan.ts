// Volle Adhan-Aufnahmen (vom Nutzer bereitgestellt, apps/mobile/assets/audio/azan/)
// spielen bewusst IN DER APP statt als System-Benachrichtigungston — siehe
// AzanChoice-Kommentar in features/settings/types.ts (Format/Längen-Limits
// der OS-Benachrichtigungstöne lassen mehrminütige MP3s nicht zu).
import type { AzanChoice } from '@/features/settings/types';

// require() mit statischem Literal-Pfad ist Pflicht (Metro löst Assets zur
// Build-Zeit auf, kein dynamisches require(`...${var}`) möglich).
const AZAN_SOURCES = {
  azan8: require('../../../assets/audio/azan/azan8.mp3'),
  azan9: require('../../../assets/audio/azan/azan9.mp3'),
  azan12: require('../../../assets/audio/azan/azan12.mp3'),
  azan14: require('../../../assets/audio/azan/azan14.mp3'),
  azan20: require('../../../assets/audio/azan/azan20.mp3'),
} as const;

/** Audioquelle für eine Auswahl, oder null für 'default' (kein voller Adhan). */
export function azanSource(choice: AzanChoice) {
  return choice === 'default' ? null : AZAN_SOURCES[choice];
}
