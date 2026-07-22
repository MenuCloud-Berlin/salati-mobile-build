// Expos Default (babel-preset-expo) reicht für Metro (native + Web-Export)
// vollständig aus — Metro versteht `import()` nativ fürs Chunk-Splitting
// (siehe features/study/courses.ts) und braucht dafür KEINE Babel-
// Transformation. Jest läuft dagegen unter CommonJS/Node und wirft ohne
// --experimental-vm-modules bei jedem echten `import()` einen Fehler
// ("A dynamic import callback was invoked without --experimental-vm-modules").
// babel-plugin-dynamic-import-node löst das NUR unter Jest auf, indem es
// `import()` dort zu `Promise.resolve(require())` transformiert. Erkennung
// bewusst über JEST_WORKER_ID (immer gesetzt in jedem Jest-Worker) statt
// über den Babel-Caller-Namen — jest-expo gibt sich absichtlich als
// `{ name: 'metro', bundler: 'metro' }` aus (siehe jest-expo/src/
// resolveBabelOptions.js), damit babel-preset-expo sich wie im echten
// Metro-Bundle verhält, macht den Caller-Namen also als Jest-Signal unbrauchbar.
module.exports = function (api) {
  const isJest = !!process.env.JEST_WORKER_ID;
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: isJest ? ['babel-plugin-dynamic-import-node'] : [],
  };
};
