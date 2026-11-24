# RallyPoint Android Native Guide

> Architecture, Cloud Build Pipeline, Hardware Optimization & Operations Guide for RallyPoint on Android.

---

## 1. Architectural Overview

RallyPoint on Android uses **Capacitor 6.2** to wrap the existing high-performance React 18 + Vite + TypeScript PWA inside a native Android container (`com.rallypoint.app`).

```
+-------------------------------------------------------------+
|                  RallyPoint Android App                     |
|                                                             |
|   +-----------------------------------------------------+   |
|   |         Capacitor WebView (Hardware Accelerated)    |   |
|   |   - React 18 + Vite + Tailwind + Framer Motion      |   |
|   |   - Pure Event-Sourced Reducers (@rallypoint/engine)|   |
|   |   - Pure Ranking Engine (@rallypoint/ranking)       |   |
|   |   - Offline Storage: IndexedDB via Dexie.js         |   |
|   +-----------------------------------------------------+   |
|                              |                              |
|                              v                              |
|   +-----------------------------------------------------+   |
|   |               Capacitor Native Bridge               |   |
|   |   - @capacitor/haptics       - keep-awake           |   |
|   |   - @capacitor/status-bar    - @capacitor/app       |   |
|   |   - @capacitor/preferences   - @capacitor/share     |   |
|   +-----------------------------------------------------+   |
|                              |                              |
|                              v                              |
|   +-----------------------------------------------------+   |
|   |           Android 15 (API 35) Runtime               |   |
|   |   - WindowInsets (Edge-to-Edge)                     |   |
|   |   - DisplayCutout (Short Edges Mode)                |   |
|   |   - High-Refresh Display Modes (120Hz / 144Hz)      |   |
|   |   - Linear Haptic Motor                             |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

### Key Engineering Decisions:
1. **Single Unified Codebase**: Web (PWA) and Android share 100% of the UI, state machines, and scoring logic.
2. **Offline-First Event Sourcing**: Every rally, shot attribute, and score change is recorded as an append-only event into local IndexedDB. In case of app closure or crash, the match state is instantly reconstructed by replaying events on startup.
3. **Headless Cloud Builds**: Designed specifically for developers without local Android Studio or heavy local SDKs. All compilations run entirely on GitHub Actions runners.

---

## 2. Hardware Adaptations (iQOO Neo 10 & Android 15)

The app is tailored to the hardware capabilities of the **iQOO Neo 10** (Android 15, Funtouch OS 15 / OriginOS, Snapdragon 8 Gen 3 class processor, 6.78" 144Hz AMOLED):

### 144Hz AMOLED Display Smoothness
- On startup, `MainActivity.java` inspects all supported display modes via `Display.getSupportedModes()`.
- If 120Hz or 144Hz refresh modes are available, the app sets `WindowManager.LayoutParams.preferredDisplayModeId` to the highest rate, guaranteeing ultra-low input latency during court scoring.

### Edge-to-Edge & Punch-Hole Camera Cutout
- Android 15 requires apps to render edge-to-edge behind the system navigation bar and status bar:
  - `WindowCompat.setDecorFitsSystemWindows(window, false)`
  - `WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` ensures full-screen landscape court rendering without letterboxing around the center camera cutout.
  - Safe area padding is governed by CSS variables: `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, `.safe-top`, `.safe-bottom`.

### Linear Motor Native Haptics
- Tactile feedback is mapped directly to umpire actions using `@capacitor/haptics`:
  - **Point scored**: `ImpactStyle.Medium`
  - **Undo last point**: `ImpactStyle.Light`
  - **Court side change**: `ImpactStyle.Heavy`
  - **Game interval / 11-point break**: `NotificationType.Warning`
  - **Match victory**: `NotificationType.Success`

### Screen Keep-Awake
- While an active match is in progress, `@capacitor-community/keep-awake` prevents the display from sleeping, even during long, grueling rallies.
- When the match is paused or completed, the wake lock is immediately released to preserve battery.

### Funtouch OS Battery Optimization
- Vivo / iQOO devices feature aggressive background task killing.
- RallyPoint provides a built-in guide modal (`FuntouchBatteryModal.tsx`) showing users how to set battery management to **Unrestricted** so background sync and match timers remain intact.

---

## 3. Cloud APK Build Pipeline (GitHub Actions)

All Android builds are executed headlessly in the cloud via `.github/workflows/android-apk.yml`.

### Workflow Triggers:
1. `push` to `main` branch.
2. `push` of version tags (`v*`).
3. `workflow_dispatch` (manual trigger with custom API URL parameter).

### Compilation Steps:
1. **Validation Gate**: Spawns clean PostgreSQL 16 container, applies Prisma migrations, and runs typechecks and unit tests.
2. **Web Bundle**: Compiles TypeScript and packages the Vite production web bundle.
3. **Capacitor Sync**: Injects web assets into `apps/web/android/app/src/main/assets/public`.
4. **Android SDK Setup**: Pre-configured Android Platform 35 and Build-Tools 35.0.0 on Temurin JDK 17.
5. **Gradle Build**: Runs `./gradlew assembleDebug assembleRelease`.
6. **Integrity Check**: Generates SHA-256 checksums for both APKs.
7. **Artifact Upload**: Uploads APKs and checksums with 30-day retention.
8. **Release Publishing**: When triggered by a `v*` tag, publishes a GitHub Release and attaches APK binaries automatically.

---

## 4. Keystore Generation & Secret Management

### Generating a Production Keystore
To sign future release builds with a private RSA key:

```bash
# Run in any bash environment with keytool (Java) installed
bash scripts/generate-keystore.sh
```

This generates `rallypoint-release.keystore` (2048-bit RSA, 10,000-day validity, alias `rallypoint`).

### Base64 Encoding for GitHub Secrets
- **macOS / Linux**:
  ```bash
  base64 -w 0 rallypoint-release.keystore > keystore_base64.txt
  ```
- **Windows PowerShell**:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes('rallypoint-release.keystore')) | Out-File keystore_base64.txt
  ```

### Adding Secrets to GitHub:
Go to **GitHub Repo > Settings > Secrets and variables > Actions** and create:
- `ANDROID_KEYSTORE_BASE64`: Contents of `keystore_base64.txt`
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password
- `ANDROID_KEY_ALIAS`: `rallypoint`
- `ANDROID_KEY_PASSWORD`: Key password

> **Fallback Mode**: If secrets are not provided, the GitHub Actions cloud build signs with the Android debug key automatically, so compilation and testing are never blocked.

---

## 5. Easy Phone Install & In-App Updates

### Public Download Portal (`docs/install/index.html`)
- Users navigate to the install page or scan the dynamic QR code using their phone camera.
- Downloads `RallyPoint-release.apk` directly from GitHub Releases.
- Provides step-by-step guidance for Funtouch OS permissions and Google Play Protect prompts.

### In-App Update Checker (`updateChecker.ts`)
- Automatically queries `https://api.github.com/repos/achudh2005/RallyPoint/releases/latest`.
- Compares installed version with latest tag using semantic versioning (`compareSemver`).
- Checks in background at most once every 24 hours (tracked via `@capacitor/preferences`).
- When a newer APK is available, presents an Apple HIG bottom sheet (`UpdateModal.tsx`) showing release notes and a direct update button.
- Updates install directly over existing installations without loss of local match data.

---

## 6. Security Hardening

| Component | Policy | Implementation |
|---|---|---|
| **Network Traffic** | HTTPS Only | `network_security_config.xml` strictly disables cleartext HTTP in release mode |
| **WebView Debugging** | Disabled in Release | `MainActivity.java` enables remote debugging only when `ApplicationInfo.FLAG_DEBUGGABLE` is set |
| **Data Extraction** | Safe Backup Rules | `data_extraction_rules.xml` backs up IndexedDB/SQLite while excluding cache directories |
| **Permissions** | Least Privilege | Only `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `WAKE_LOCK`, `POST_NOTIFICATIONS` |
| **Code Shrinking** | R8 Minification | `minifyEnabled true`, `shrinkResources true`, and ProGuard optimization in `build.gradle` |

---

## 7. APK Specifications & Budgets

- **Package Name**: `com.rallypoint.app`
- **Target SDK**: 35 (Android 15)
- **Minimum SDK**: 26 (Android 8.0+)
- **Supported ABIs**: `arm64-v8a`, `armeabi-v7a`
- **Release APK Size**: **1.39 MB** (Budget: < 25 MB; consumes < 6% of budget)
- **Debug APK Size**: **4.49 MB**
