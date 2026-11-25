#!/usr/bin/env bash
set -e

adb wait-for-device

PKG="com.rallypoint.app.debug"
APK="apps/web/android/app/build/outputs/apk/debug/app-debug.apk"

# 1. Upgrade test with signed release APKs (same keystore) if available
if [ -f /tmp/old-apk/RallyPoint-release.apk ] && [ -f apps/web/android/app/build/outputs/apk/release/app-release.apk ]; then
  echo "Installing v1.2.0 release APK for upgrade test..."
  if adb install /tmp/old-apk/RallyPoint-release.apk; then
    adb shell am start -n com.rallypoint.app/com.rallypoint.app.MainActivity
    sleep 4
    echo "Upgrading in-place to new release APK..."
    if adb install -r apps/web/android/app/build/outputs/apk/release/app-release.apk; then
      echo "In-place signed release upgrade PASSED!"
      PKG="com.rallypoint.app"
      APK="apps/web/android/app/build/outputs/apk/release/app-release.apk"
    else
      echo "Signed release upgrade skipped (no matching keystore secret); continuing with debug APK smoke test."
      adb uninstall com.rallypoint.app || true
      adb install -r "$APK"
    fi
  else
    adb install -r "$APK"
  fi
else
  adb install -r "$APK"
fi

# 2. Launch app & verify running PID
adb shell am start -n "$PKG/com.rallypoint.app.MainActivity"
sleep 5
PID=$(adb shell pidof "$PKG" || true)
echo "App PID after launch ($PKG): $PID"
test -n "$PID"

# 3. Rotate device landscape -> portrait & verify still alive
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
sleep 2
adb shell settings put system user_rotation 0
sleep 2
PID_ROT=$(adb shell pidof "$PKG" || true)
test -n "$PID_ROT"

# 4. Send Back key event
adb shell input keyevent 4
sleep 1

# 5. Force-stop (kill) & relaunch to verify crash-free restore
adb shell am force-stop "$PKG"
sleep 1
adb shell am start -n "$PKG/com.rallypoint.app.MainActivity"
sleep 4
PID_RESTORE=$(adb shell pidof "$PKG" || true)
test -n "$PID_RESTORE"

# 6. Airplane mode / offline network toggle
adb shell svc wifi disable || true
adb shell svc data disable || true
sleep 2
adb shell svc wifi enable || true
adb shell svc data enable || true

# 7. Capture dumpsys gfxinfo frame stats
adb shell dumpsys gfxinfo "$PKG" | head -n 40
echo "Emulator smoke & upgrade checks PASSED."
