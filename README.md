# Handyhouse – React Native (Expo) perf-test app

A hardware shopping app built to be installed and stress-tested.

## Run
    npm install
    npx expo start          # scan QR with Expo Go, or press a / i for emulator
For a release-like build (needed for honest perf numbers):
    npx expo run:android --variant release
    npx expo run:ios --configuration Release

## Perf tab
- Catalogue size: 1k / 5k / 20k products (list + filter load)
- Remote images: toggles network + image decode load
- Auto-scroll: fast programmatic scrolling of the 2-column grid
- Add 200 items to cart: state-update burst
- Live JS FPS meter (top right) and timing log for generate / filter / open detail

## Notes
- Dev mode (Expo Go) is much slower than release; always compare release builds.
- For native-level metrics use Xcode Instruments, Android Studio Profiler, or Flashlight (`flashlight test`).
- Search filter is deliberately unoptimised (no debounce) so it shows up in results.
