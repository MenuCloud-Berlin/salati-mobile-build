import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { Brand } from '@/constants/theme';
import de from '@/locales/de.json';

// Eigenes Root-HTML-Template (Expo-Router-Static-Rendering-Escape-Hatch) —
// ohne das übernimmt Expo Router ein Default-Template ohne Dark-Mode-
// Vorwissen: der statische Export rendert jede Seite mit einer festen
// Hell-Modus-Hintergrundfarbe vor (siehe extrahiertes CSS in dist/index.html,
// z. B. "background-color:rgba(255,255,255,1.00)"), unabhängig vom System-
// Farbschema des Besuchers. Erst nach dem React-Hydrate (JS geladen +
// ausgeführt) übernimmt ThemedView die echte Farbe — bis dahin blitzt bei
// Dark-Mode-Systemen kurz der helle Hintergrund auf ("flash of light mode").
// Dieses reine CSS-`prefers-color-scheme`-Escape-Hatch (offizielles Expo-
// Router-Beispiel für genau dieses Problem) setzt die richtige Hintergrund-
// farbe schon beim allerersten Paint, ganz ohne JS-Abhängigkeit.
// Marketing-Metadaten fest auf Deutsch (die App-UI selbst ist 6-sprachig,
// aber dieses Root-Template wird einmalig statisch gerendert und umschließt
// alle Sprachvarianten gleich — Berlin/deutschsprachiger Nutzerkreis als
// sinnvoller Default für Social-Share-Vorschauen, analog zum App-Sprach-Default 'de').
const SITE_TITLE = 'Salati - Dein Begleiter für Gebet, Koran und Wissen';
const SITE_DESCRIPTION =
  'Gebetszeiten, Qibla, Koran mit Rezitation, Duas, Hadithe, Moschee-Finder und ein vollständiger Lernpfad - offline nutzbar, ohne Werbung, ohne Tracking.';
const SITE_URL = 'https://www.salati.pro';

// Strukturierte Daten (Audit 2026-07-19 F3): einmal statisch ins Root-HTML.
// FAQ-Inhalte kommen direkt aus den de-Locale-Keys der Landing-FAQ, damit
// JSON-LD und sichtbare Seite nicht auseinanderlaufen (Sprache = Template-
// Default de, wie alle Metadaten hier).
const landingFaq = de.landing as Record<string, string>;
const STRUCTURED_DATA = JSON.stringify([
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Salati',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Android, iOS, Web',
    inLanguage: ['de', 'en', 'tr', 'ar', 'es', 'fr', 'id', 'ms', 'ru', 'ur', 'fa', 'bn', 'sw', 'ps'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: Array.from({ length: 8 }, (_, i) => i + 1)
      .filter((n) => landingFaq[`faq${n}Q`] && landingFaq[`faq${n}A`])
      .map((n) => ({
        '@type': 'Question',
        name: landingFaq[`faq${n}Q`],
        acceptedAnswer: { '@type': 'Answer', text: landingFaq[`faq${n}A`] },
      })),
  },
  // "<" als <: verhindert </script>-Breakout, bleibt gültiges JSON-LD
  // (Standard-Härtung für Inline-JSON, Inhalte sind eigene Build-Strings).
]).replace(/</g, '\\u003c');

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light dark" />
        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={SITE_TITLE} />
        <meta property="og:url" content={SITE_URL} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
        {/* Früher TLS-Handshake zu den ständig genutzten Daten-/Audio-Origins —
            spart je ~100-300ms beim ersten API-Call jeder Session. */}
        <link rel="preconnect" href="https://api.alquran.cloud" />
        <link rel="preconnect" href="https://api.aladhan.com" />
        <link rel="preconnect" href="https://api.quran.com" />
        <link rel="preconnect" href="https://cdn.islamic.network" />
        {/* PWA: macht die Web-App am Handy/Desktop installierbar. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b0b0d" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: ${Brand.paper};
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: ${Brand.ink};
  }
}`;
