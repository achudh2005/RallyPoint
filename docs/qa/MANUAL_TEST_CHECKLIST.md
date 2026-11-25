# RallyPoint iQOO Neo 10 Manual Test Checklist (~15 Minutes)

**Release Candidate:** `v1.2.1-rc1`  
**Device:** iQOO Neo 10 (Android 15, Funtouch OS / OriginOS, 144Hz AMOLED)  
**Note:** These checks cover physical hardware, touch feel, haptics, and real-world OS behavior that cloud emulators cannot verify.

---

## 1. Install & Upgrade (2 min)
- [ ] **1.** If `v1.2.0` is already installed, tap the `v1.2.1-rc1` APK and confirm Android installs **Update** cleanly over it (no "App not installed" / signature conflict).
- [ ] **2.** Open the app and confirm your existing saved matches, players, and settings are still intact.
- [ ] **3.** Confirm the app icon, splash screen, and top edge sit cleanly below the punch-hole camera cutout (nothing clipped).

## 2. One-Handed Comfort & Sunlight Readability (2 min)
- [ ] **4.** Hold the phone in one hand and start a doubles match (3-step setup). Confirm all 8 POINT / DROP buttons sit comfortably in the lower thumb zone.
- [ ] **5.** Take the phone into bright outdoor/court lighting and confirm scores, server glow indicator, and POINT (emerald) / DROP (rose) buttons are easy to read.
- [ ] **6.** Turn on **Settings > Courtside High Contrast** and confirm text scales cleanly without overlapping buttons.

## 3. Haptics & Physical Feel (2 min)
- [ ] **7.** Tap **POINT** — confirm a crisp, medium tap vibration.
- [ ] **8.** Tap **DROP** — confirm a distinct soft double-tap vibration pattern.
- [ ] **9.** Tap **UNDO** — confirm a gentle light tap vibration.
- [ ] **10.** Complete a match — confirm the celebratory victory vibration sequence plays.

## 4. Real 4-Player Doubles Match, Streaks & MVP (5 min)
- [ ] **11.** Play a real (or simulated) 4-player doubles match in **Rally Point 21** using only the player POINT and DROP buttons.
- [ ] **12.** Score 3 points in a row with one player — confirm the **Streak Banner** slides down cleanly at the top, never blocks taps underneath, and disappears after ~2.5s.
- [ ] **13.** Score 5+ attributed actions — confirm the **`🌟 MVP`** live peek chip appears in the top bar and opens standings when tapped.
- [ ] **14.** Finish the match — confirm the **MVP Reveal Card** (with confetti, score, reason chips, and Fighter Award) appears.
- [ ] **15.** Tap **Share MVP Card** (or **Share Result**) and send to a WhatsApp chat/self-chat; confirm formatting looks clean.

## 5. Back Gesture, Rotation & Keep-Awake (2 min)
- [ ] **16.** During live scoring, open a bottom sheet (e.g., Quick Edit or Match Menu) and swipe the **Android Back gesture** — confirm it closes the sheet first, NOT the match.
- [ ] **17.** Rotate the phone to **landscape** mid-match — confirm the 2-column side layout renders smoothly and the current score/server state is preserved. Rotate back to portrait.
- [ ] **18.** Leave the live scoring screen open on a bench for **10 minutes** without touching it — confirm the screen stays **awake** (does not lock mid-rally).

## 6. Offline / Airplane Mode, Battery Guide & Notifications (2 min)
- [ ] **19.** Turn on **Airplane Mode** mid-match, score 5 points, force-close the app from Recents, and reopen — confirm the match resumes at the exact score.
- [ ] **20.** Turn **Airplane Mode** off — confirm queued events sync to the server without duplicating points.
- [ ] **21.** Open **Settings > Battery Guide** (Funtouch OS) and confirm instructions match your iQOO Neo 10 settings (`High background power consumption`).
- [ ] **22.** Confirm notification permission prompt / MVP completion notification works without spamming.
- [ ] **23.** Open **Settings > Check for Updates** and confirm it reports `v1.2.1-rc1` status cleanly.
- [ ] **24.** Scroll a long Rankings list at 120Hz/144Hz and confirm smooth scrolling with zero stutter.
- [ ] **25.** Open **Settings > Report a Problem > Export Log** and confirm it generates & shares the diagnostic bundle.

---

## What To Do If Any Check Fails
1. Go to **Settings > Report a Problem** and tap **Export Log** to share the diagnostic file (includes app version `1.2.1-rc1`, device model, OS version, and the last 25 match events).
2. Note the checklist item number (e.g., `#12`) and take a quick screenshot or screen recording.
3. For Android system crashes, capture logs via ADB if connected to a PC:
   `adb logcat -d -s Capacitor Console Chromium > rallypoint-crash.txt`
4. Send the exported log + screenshot + item number to the developer.
