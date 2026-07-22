import { useSettings } from '@/features/settings/store';
import { translate } from './translate';

export { detectDeviceLocale, type Locale } from './locale-detect';
export { translate } from './translate';

/** Übersetzungs-Hook, gebunden an die persistierte Spracheinstellung. */
export function useTranslation() {
  const { settings } = useSettings();
  return {
    locale: settings.language,
    t: (key: string) => translate(settings.language, key),
  };
}
