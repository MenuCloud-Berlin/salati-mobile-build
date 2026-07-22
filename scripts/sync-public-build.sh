#!/usr/bin/env bash
# Spiegelt apps/mobile in das ÖFFENTLICHE Build-Repo
# (MenuCloud-Berlin/salati-mobile-build) für kostenlose GitHub-Actions-Builds.
# NIEMALS Secrets mitspiegeln: credentials.json, .env*, Keystores werden
# ausgeschlossen; Signing läuft nur über Actions-Secrets im Public-Repo.
#
# Ablauf (fester Session-übergreifender Workflow, s. Memory
# project_salati_github_actions_build):
#   1) apps/mobile hierher spiegeln (ohne Secrets/Build-Artefakte)
#   2) Standalone-pnpm-workspace.yaml mit patchedDependencies/overrides schreiben
#   3) committen + pushen -> Actions baut Android (+ iOS) und lädt die APK/IPA
#
# Voraussetzung: GH_TOKEN gesetzt (PAT). Aufruf aus apps/mobile:
#   GH_TOKEN=... bash scripts/sync-public-build.sh
set -euo pipefail

PUBLIC_REPO="https://x-access-token:${GH_TOKEN}@github.com/MenuCloud-Berlin/salati-mobile-build.git"
SRC="$(cd "$(dirname "$0")/.." && pwd)"          # apps/mobile
ROOT="$(cd "$SRC/../.." && pwd)"                  # Monorepo-Root
WORK="$(mktemp -d)"

echo "Klone Public-Repo -> $WORK"
git clone --depth 1 "$PUBLIC_REPO" "$WORK" 2>/dev/null || { mkdir -p "$WORK/repo"; cd "$WORK/repo"; git init -q; git remote add origin "$PUBLIC_REPO"; WORK="$WORK/repo"; }
cd "$WORK"

# Alten Inhalt entfernen (außer .git), dann frisch spiegeln.
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# git archive exportiert NUR getrackte Dateien -> node_modules, credentials.json,
# .env* und Build-Artefakte (alle gitignored) sind automatisch draußen. Kein
# rsync nötig (fehlt auf Windows).
echo "Spiegle apps/mobile (git archive, nur getrackte Dateien)"
git -C "$ROOT" archive HEAD:apps/mobile | tar -x -C .

# Die pnpm-Patches liegen im Monorepo-ROOT (patches/), nicht in apps/mobile,
# werden aber von der Standalone-pnpm-workspace.yaml (patchedDependencies)
# referenziert -> ebenfalls mitspiegeln, sonst schlägt `pnpm install` mit ENOENT
# auf die Patch-Datei fehl.
rm -rf patches && mkdir -p patches
git -C "$ROOT" archive HEAD:patches | tar -x -C patches

# Website-APK-Teile (164MB, im Privat-Repo getrackt) gehören NICHT ins
# Build-Mirror.
rm -f public/salati.apk.part00 public/salati.apk.part01
# Sicherheitsnetz: falls doch mal ein Secret getrackt wäre, hier raus.
rm -f credentials.json .env .env.* 2>/dev/null || true

# debug.keystore ist Googles ÖFFENTLICHER Debug-Key (unbedenklich) — bleibt,
# damit reine Debug-Builds funktionieren; Release signiert via Secret.

# Standalone-pnpm-Config (pnpm10 liest Settings aus pnpm-workspace.yaml).
cat > pnpm-workspace.yaml <<'YAML'
# Standalone (kein Workspace) — nur die Build-Settings aus dem Monorepo.
neverBuiltDependencies:
  - sharp
overrides:
  "brace-expansion@<1.1.14": ">=1.1.14 <2.0.0"
  "brace-expansion@>=2.0.0 <2.0.3": ">=2.0.3 <3.0.0"
  "esbuild@<0.25.0": ">=0.25.0"
  "form-data@>=4.0.0 <4.0.6": ">=4.0.6"
  "postcss@<8.5.10": ">=8.5.10"
  "qs@<6.15.2": ">=6.15.2"
patchedDependencies:
  '@bacons/apple-targets@5.0.0': patches/@bacons__apple-targets@5.0.0.patch
  expo-dynamic-app-icon@1.2.0: patches/expo-dynamic-app-icon@1.2.0.patch
  unrs-resolver@1.11.1: patches/unrs-resolver@1.11.1.patch
  whisper.rn@0.7.0: patches/whisper.rn@0.7.0.patch
YAML

# Root-.npmrc (node-linker etc.) mitnehmen, falls vorhanden.
[ -f "$ROOT/.npmrc" ] && cp "$ROOT/.npmrc" ./.npmrc || true

cat > README.md <<'MD'
# Salati Mobile — Build-Mirror (öffentlich)

Automatisch gespiegelter Build-Mirror von `apps/mobile` (Privat-Repo) für
**kostenlose GitHub-Actions-Builds** (Android/iOS). **Enthält keine Secrets** —
Signing läuft ausschließlich über verschlüsselte Actions-Secrets.
Nicht direkt hier entwickeln; Änderungen kommen per Sync aus dem Privat-Repo.
MD

git add -A
if git diff --cached --quiet; then echo "Keine Änderungen."; else
  git -c user.name="MenuCloud Berlin" -c user.email="menucloudberlin@gmail.com" commit -q -m "Sync apps/mobile ($(date -u +%Y-%m-%dT%H:%MZ))"
  git branch -M main
  git push -u origin main
  echo "Gepusht -> Actions-Build startet."
fi
