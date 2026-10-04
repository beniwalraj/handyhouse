# Handyhouse – React Native performance-testing sandbox

A Bunnings-style hardware shopping app (own name and branding) built with Expo / React Native,
used to practise mobile performance testing: scripted user flows, measurement, CI and baselines.

## Run the app
    npm install
    npx expo run:android --variant release     # or: npx expo run:ios --configuration Release
Always test **Release** builds. Dev builds (Expo Go) are much slower and give misleading numbers.

## Build options (environment variables, read at build time)
| Variable | Default | Effect |
|---|---|---|
| EXPO_PUBLIC_PRODUCT_COUNT | 5000 | Size of the generated catalogue |
| EXPO_PUBLIC_REMOTE_IMAGES | off | Set to `1` to load real photos from picsum.photos |
| EXPO_PUBLIC_IMAGE_SIZE | 300 | Photo size in pixels (square) |

Example: `EXPO_PUBLIC_REMOTE_IMAGES=1 EXPO_PUBLIC_PRODUCT_COUNT=20000 npx expo run:android --variant release`

The in-app **Perf** tab (FPS overlay, auto-scroll, timings) is a learning aid only. A real app would not ship it.

## Test flows (Maestro)
Flows live in `maestro/`. They drive the app like a user, with no test-only buttons.
- `shopping-flow.yaml`: search, scroll, add to cart, check cart total
- `stress-flow.yaml`: ~45 scrolls and three searches (heavier, used for measurement)

Install: `curl -Ls "https://get.maestro.mobile.dev" | bash`. Run: `maestro test maestro/stress-flow.yaml`
(the app must be installed on a running emulator/simulator).

## Measure performance locally (Android only: Flashlight)
Install: `curl https://get.flashlight.dev | bash` (needs Android SDK, Java 17 and an emulator running).

    flashlight test --bundleId com.example.handyhouse \
      --testCommand "maestro test maestro/stress-flow.yaml" \
      --beforeEachCommand "adb shell am force-stop com.example.handyhouse" \
      --iterationCount 3 --duration 60000 \
      --resultsFilePath results/my-run.json --resultsTitle "My run"
    python3 scripts/check-perf.py results/my-run.json perf-thresholds.json   # pass/fail table
    flashlight report results/my-run.json                                    # browser report

Compare runs only on the **same machine**. The first iteration is a cold start and is skipped by the check.

## CI (GitHub Actions)
- `.github/workflows/android-perf.yml`: builds the Release APK, boots an Android emulator, runs the
  stress flow under Flashlight (5 iterations), uploads results, then checks limits.
  Start it from **Actions > Android perf (Flashlight) > Run workflow**. Options: load real images (tick box),
  product count. The nightly schedule is switched off (commented out).
- `.github/workflows/perf.yml`: iOS simulator + Maestro (pass/fail only; Flashlight is Android-only).
  Not yet run.
- Limits live in `perf-thresholds.json` (no images) and `perf-thresholds-images.json`.
  `scripts/check-perf.py` also fails the build if any iteration failed.
- The artifact contains `flashlight-results.json`, `logcat.txt`, `screen.png` and `maestro-debug/`
  (Maestro screenshots). Open `screen.png` first when a run fails.
- Cost: free for public repos; private repos have a monthly minute allowance. A run takes ~15 minutes.

## Baselines (20,000 products, stress flow)
Noise between identical runs was about 0.2 FPS and 0.1% JS CPU, so smaller gaps are not real.

| Setup | Avg FPS | Samples < 45 FPS | JS CPU | Peak RAM |
|---|---|---|---|---|
| CI emulator, images off | 57.3 | 6.6% | 1.4% | 197 MB |
| CI emulator, images on | 56.4 | 10.3% | 1.2% | 222 MB |
| Local, images off | 58.7 | 0.4% | 2.4% | 202 MB |
| Local, images on (300px) | 59.0 | 0.0% | 2.0% | 239 MB |
| Local, images on (1000px) | 58.6 | 0.4% | 2.3% | 250 MB |
| Local, + debounced search | 58.9 | 0.0% | 2.2% | 240 MB |
| Local, + FlashList (reverted) | 59.1 | 0.0% | 4.2% | 239 MB |

## What we learned
- 5,000 vs 20,000 products made no measurable difference: the list only draws what is on screen.
- Real images cost memory (about 37 MB) but no smoothness, and bigger files added little.
- Debounced search changed nothing measurable (kept: it is free insurance for heavier searches).
- FlashList did not help and roughly doubled JS CPU on this light card, so it was reverted.
- Measure before and after every change; some "optimisations" are neutral or worse.

## Troubleshooting notes
- `command not found: maestro` / `flashlight`: add `~/.maestro/bin` / the Flashlight install folder to PATH.
- Maestro could not find "Add to cart": a tappable card wrapping a button hides the inner button from
  accessibility. The card uses `accessible={false}` and the button has its own label.
- `Animation Hitches` in Instruments is not supported on the iOS simulator (real devices only).
- Maestro itself adds accessibility overhead in Instruments; profile manual runs to separate it out.
- GitHub no longer accepts passwords for git push: use `gh auth login`.
- Make sure `.gitignore` exists before the first commit (node_modules, ios/, android/).
- Debug folders starting with a dot are skipped by artifact uploads; the workflow copies them to `maestro-debug/`.

## Ideas for next
Real devices (device farm), more Maestro flows with testIDs, hide the Perf tab in production builds,
iOS timing in CI, production monitoring (Firebase Performance / Sentry).
