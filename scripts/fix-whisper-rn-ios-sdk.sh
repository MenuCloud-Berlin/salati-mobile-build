#!/usr/bin/env bash
# EAS-Build-Hook (eas-build-post-install): whisper.rn 0.7.0 liefert sein
# precompiled ios/rnwhisper.xcframework mit LC_BUILD_VERSION sdk=27.0 aus,
# aktuell ueber Apples erlaubtem Maximum (26.5) -> ITMS-90512 bei jedem
# App-Store-Upload. Das ist im kompilierten Mach-O-Binary selbst kodiert,
# nicht in einer Text-/plist-Datei -> kein normaler pnpm-Patch moeglich,
# braucht Apples eigenes `vtool` (nur auf macOS/Xcode vorhanden, deshalb
# als Build-Hook hier statt lokal auf Windows, wo kein macOS verfuegbar ist).
set -euo pipefail

if [ "${EAS_BUILD_PLATFORM:-}" != "ios" ]; then
  exit 0
fi

if ! command -v vtool >/dev/null 2>&1; then
  echo "fix-whisper-rn-ios-sdk: vtool nicht gefunden, ueberspringe (kein macOS-Worker?)"
  exit 0
fi

XCFRAMEWORK="$(pwd)/node_modules/whisper.rn/ios/rnwhisper.xcframework"
if [ ! -d "$XCFRAMEWORK" ]; then
  echo "fix-whisper-rn-ios-sdk: $XCFRAMEWORK nicht gefunden, ueberspringe"
  exit 0
fi

patch_slice() {
  local dir="$1" platform="$2"
  local bin="$XCFRAMEWORK/$dir/rnwhisper.framework/rnwhisper"
  if [ -f "$bin" ]; then
    echo "fix-whisper-rn-ios-sdk: patche $bin (platform=$platform, sdk -> 26.5)"
    vtool -set-build-version "$platform" 15.1 26.5 -replace -output "$bin" "$bin"
  fi
}

# Nur das Geraete-Slice patchen (genau das meldet Apple: "Salati.app/
# Frameworks/rnwhisper.framework/rnwhisper", ohne Simulator-Qualifier) -
# Simulator-/tvOS-Slices werden nie in den eingereichten .app-Bundle
# eingebunden, bewusst unangetastet lassen (weniger Risiko, da der genaue
# vtool-Plattform-Token fuer Simulator hier nicht gegen ein echtes macOS
# verifiziert werden konnte).
patch_slice "ios-arm64" "ios"

echo "fix-whisper-rn-ios-sdk: fertig"
