# iQOO Neo 10 Manual Test Checklist (~12 Minutes)

**Target Build:** `v1.3.0` (`com.rallypoint.app`)  
**Device:** iQOO Neo 10 (Android 15, 6.8" 144Hz AMOLED, gesture navigation)

- [ ] **1. Install over old version:** Install `v1.3.0` APK directly over the previous install (no uninstall needed; keystore signature matches).
- [ ] **2. Upgrade prompt:** Open the app and verify the **"Start fresh or keep my data?"** sheet appears. Tap **Start fresh** (or test **Keep my data** first, then use Settings > Data > Start fresh).
- [ ] **3. Fresh empty state:** Verify Play, Players, and Rankings all start empty with `"Season 1"` and zero demo players or matches.
- [ ] **4. Add 6 players:** Open the **Players** tab and add 6 players (try both single add and **Add several at once**).
- [ ] **5. Edit & duplicate warning:** Rename one player and verify the similar-name warning appears when typing a near-duplicate.
- [ ] **6. Start match with Shutout rule ON:** Tap **Start Match**, pick 4 players (Doubles), open **Advanced Scoring Options**, turn **Shutout rule (win at 7-0)** ON, and start the match.
- [ ] **7. Live UI & One-point-to-shutout banner:** Verify the `Shutout rule: 7-0` badge is visible. Score 6-0 and verify the **One point to shutout** banner appears.
- [ ] **8. 7-0 Celebration smoothness:** Score the 7th point and watch the full 6-beat celebration animation on the 144Hz screen (no stutter or flicker).
- [ ] **9. Sound & Haptics:** Confirm the synthesized chime plays at comfortable media volume (respects silent mode) and layered haptics fire on slam and finish.
- [ ] **10. Undo during celebration:** Trigger a 7-0 shutout (or test Undo right after) and tap **Undo** on the celebration overlay — confirm it cancels immediately and restores `6-0`.
- [ ] **11. Tap to skip & rotation:** Score 7-0 again, tap anywhere to skip cleanly; also rotate to landscape and confirm no clipping around the punch-hole camera.
- [ ] **12. Finish match & MVP card:** Finish the remaining games and verify the **Player of the Match (MVP)** and **Fighter** cards appear with reason chips and **Why not me?** breakdown.
- [ ] **13. Share MVP & Scorecard offline:** Turn on Airplane Mode, tap **Share MVP Card** / **Export Story Card**, and verify the gold `SHUTOUT 7–0` badge renders offline.
- [ ] **14. Archive & Restore player:** In **Players**, remove a player who played in the match, choose **Archive Player**, verify they disappear from Match Setup, then restore them in **Settings > Data > Archived Players**.
- [ ] **15. Rankings & Matches count:** Open **Rankings**, check `Most Shutout Wins` and `Most MVPs`, and verify `Matches: 1` is accurate.
- [ ] **16. Back gesture navigation:** Swipe from the screen edge (Android gesture nav) on open sheets and during celebration — verify it closes/skips cleanly without exiting unexpectedly.
- [ ] **17. Animation intensity toggle:** In **Settings > Animations**, switch to **Reduced** and **Off** and confirm behavior matches.
- [ ] **18. Bug-report export:** In **Settings**, tap **Report a Problem** and verify the diagnostic JSON/text exports cleanly.
