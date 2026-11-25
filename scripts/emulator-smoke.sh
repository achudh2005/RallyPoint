#!/usr/bin/env bash
set -e

adb wait-for-device

# 1. Upgrade test: install v1.2.0 first if downloaded, launch, then upgrade in-place
if [ -f /tmp/old-apk/RallyPoint-debug.apk ]; then
  echo "Installing v1.2.0 debug APK..."
  adb install /tmp/old-apk/RallyPoint-debug.apk
  adb shell am start -n com.rallypoint.app.debug/com.rallypoint.app.MainActivity
  sleep 4
  echo "Upgrading in-place to new debug APK..."
  adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
else
  adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
fi

# 2. Launch app & verify running PID
adb shell am start -n com.rallypoint.app.debug/com.rallypoint.app.MainActivity
sleep 5
PID=$(adb shell pidof com.rallypoint.app.debug || true)
echo "App PID after launch: $PID"
test -n "$PID"

# 3. Rotate device landscape -> portrait & verify still alive
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
sleep 2
adb shell settings put system user_rotation 0
sleep 2
PID_ROT=$(adb shell pidof com.rallypoint.app.debug || true)
test -n "$PID_ROT"

# 4. Send Back key event
adb shell input keyevent 4
sleep 1

# 5. Force-stop (kill) & relaunch to verify crash-free restore
adb shell am force-stop com.rallypoint.app.debug
sleep 1
adb shell am start -n com.rallypoint.app.debug/com.rallypoint.app.MainActivity
sleep 4
PID_RESTORE=$(adb shell pidof com.rallypoint.app.debug || true)
test -n "$PID_RESTORE"

# 6. Airplane mode / offline network toggle
adb shell svc wifi disable || true
adb shell svc data disable || true
sleep 2
adb shell svc wifi enable || true
adb shell svc data enable || true

# 7. Capture dumpsys gfxinfo frame stats
adb shell dumpsys gfxinfo com.rallypoint.app.debug | head -n 40
echo "Emulator smoke & upgrade checks PASSED."
