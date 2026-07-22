// https://docs.expo.dev/guides/using-eslint/
//
// Kein eslint/config-defineConfig()-Helper — der ist erst ab neueren ESLint-9-
// Minor-Versionen verfügbar (eslint-config-expo@57 selbst nutzt ihn intern
// und crasht mit älteren ESLint-Versionen, "Package subpath './config' is not
// defined by exports"). Ein reines Flat-Config-Array funktioniert stattdessen
// mit jeder ESLint-9-Version, hier auf ^9.30 gepinnt.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', '.expo/**'],
  },
];
