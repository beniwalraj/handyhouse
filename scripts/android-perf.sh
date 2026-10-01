#!/usr/bin/env bash
# Runs inside the Android emulator (started by the CI workflow).
set -euo pipefail

PKG=com.example.handyhouse
APK=android/app/build/outputs/apk/release/app-release.apk

adb install -r "$APK"

# Maestro drives the app
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"

# Flashlight measures CPU / RAM / JS-thread load while Maestro runs
curl https://get.flashlight.dev | bash
export PATH="$PATH:$HOME/.flashlight/bin"

flashlight test \
  --bundleId "$PKG" \
  --testCommand "maestro test maestro/shopping-flow.yaml" \
  --beforeEachCommand "adb shell am force-stop $PKG" \
  --iterationCount 5 \
  --duration 60000 \
  --resultsFilePath flashlight-results.json \
  --resultsTitle "Handyhouse 20k stress flow"
