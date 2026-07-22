// Offizieller AsyncStorage-Mock — nötig, weil Feature-Module (quran/learn
// progress) AsyncStorage auf Modulebene importieren und Jest kein Native-
// Module bereitstellt.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
