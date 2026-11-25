# RallyPoint Final QA & Release Verification Report

**Living Report** — Finalized at QA Phase 5  
**Target Release:** `v1.2.1-rc1` (Pre-Release Candidate)  
**Target Device:** iQOO Neo 10 (Android 15, 6.8" 144Hz AMOLED, punch-hole cutout, gesture nav)  
**Manual Checklist:** [MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md)

---

## 1. Before & After Metrics (Phases 1 → 5)

| Metric | Phase 1 Baseline | Phase 5 Final | Target / Budget | Status |
|--------|------------------|---------------|-----------------|--------|
| `@rallypoint/scoring-rules` Coverage | 91.81% (30 tests) | **97.10%** (40 tests) | >= 95% | **PASS** |
| `@rallypoint/ranking` Coverage | 93.43% (35 tests) | **95.02%** (37 tests) | >= 95% | **PASS** |
| `@rallypoint/api` Integration Tests | 26 tests | **31 tests** (4 files) | RBAC, 3x idempotency, WS <1s | **PASS** |
| `@rallypoint/web` Unit/Component Tests | 103 tests (26 files) | **112 tests** (30 files) | Component + Glitch + Monkey | **PASS** |
| Playwright E2E Suite | Outdated legacy spec | **3/3 passing** (CI) | 360x800, 393x873, 768x1024, 1280x800 | **PASS** |
| Android API 35 Emulator Gate | Not present | **Passing** (CI) | Boot, upgrade, rotate, Back, kill/restore | **PASS** |
| Postgres 16 1M-Event & Trigger Gate | Not verified on real PG16 | **Passing** (CI) | Triggers, constraints, <200ms LB, <50ms ingest | **PASS** |
| Streak & MVP 200-Rally Computation | Unmeasured | **< 10 ms** | < 10 ms per tap | **PASS** |
| 20-Match Back-to-Back Soak Test | Unmeasured | **< 1000 ms** (106 ms) | Zero errors/leaks | **PASS** |
| Web Vite Bundle (`vendor` chunk) | 663.72 kB (>600 kB warn) | **345.91 kB** (max 347.55 kB) | < 600 kB per chunk | **PASS** |
| Release APK Size (`v1.2.0` / RC) | 7,539,255 B (~7.19 MB) | Checked in CI (`<= 12 MB`) | <= 12 MB + `apksigner verify` | **PASS** |

---

## 2. Feature Inventory Verification (All 30 Items)

*(See [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) for code locations.)*

| # | Feature | Final Status | Evidence / Notes |
|---|---------|--------------|------------------|
| 1 | 3-step match setup, singles/doubles auto-detect, balanced pairs, coin flip | **PASS** | `MatchSetupSheet.test.tsx`, Playwright `match.spec.ts`. |
| 2 | Rally Point 21/15/11, win by 2, hard cap, side change, best-of-3 | **PASS** | `scoringRules.test.ts`, `qaExhaustive.test.ts` (20-20, 29-29, 30-29). |
| 3 | Service Point 15/11, server-only scoring, side-out, setting 14/13 & 10/9 | **PASS** | `qaExhaustive.test.ts`, Playwright Service 15 side-out flow. |
| 4 | Custom scoring format (target, win-by, cap, setting rule) | **FAIL-FIXED** | Added UI controls in `MatchSetupSheet.tsx`; verified in `MatchSetupSheet.test.tsx` & `qaExhaustive.test.ts`. |
| 5 | Serve logic: parity, doubles rotation, 1-down Service Point, indicator | **PASS** | `scoringRules.test.ts`, `qaExhaustive.test.ts`, `AppleScoringScreen.test.tsx`. |
| 6 | UNDO (last 10 actions) across side-out, setting, game boundary, match end | **PASS** | `qaExhaustive.test.ts`, `GlitchHunt.test.tsx`, `match.spec.ts`. |
| 7 | Event sourcing: replay equals incremental state | **PASS** | `fast-check` property tests in `qaExhaustive.test.ts`, `streaks.test.ts`, `mvp.test.ts`. |
| 8 | Player POINT/DROP buttons (8 doubles, 4 singles), thumb zone, order | **PASS** | `PlayerCard.test.tsx`, `AppleScoringScreen.test.tsx`, `match.spec.ts`. |
| 9 | POINT/DROP score/side-out in both systems for server & receiver | **PASS** | `playerActions.test.ts`, `qaExhaustive.test.ts`. |
| 10 | One tap = one rally, 300ms debounce, no taps when sheets open | **PASS** | `GlitchHunt.test.tsx` verifies double-tap debounce within 300ms. |
| 11 | Unattributed team tap & `Unassigned: N` counter | **PASS** | `qaExhaustive.test.ts` & `GlitchHunt.test.tsx`. |
| 12 | Long-press sheet: swap, stats, edit/reassign last 10 actions + audit | **PASS** | `AppleScoringScreen.test.tsx` (QuickEdit) & `qaExhaustive.test.ts` (`editAction`). |
| 13 | Settings: toggle buttons, rename labels, layout size | **PASS** | `AppleProfileScreen.test.tsx` & `AppleScoringScreen.tsx`. |
| 14 | Streak alerts: POINT/DROP, team run, strict mode, 20s gap, UNDO rollback | **PASS** | `streaks.test.ts`, `StreakBanner.test.tsx`, `match.spec.ts`. |
| 15 | MVP & Fighter: formula, 1.5x Service, 5-action gate, tie-breakers, share, DB | **GAP (Minor)** | Formula/DB/UI/share-text verified; `MvpRevealCard` shares formatted text rather than a rendered PNG card image. |
| 16 | All 16 player leaderboards & team boards | **PASS** | `ranking.test.ts`, `coverage.test.ts`, `AppleRankingsScreen.test.tsx` (95.02% coverage). |
| 17 | `Matches: N`, tie handling (1,2,2,4), movement, filters, mixed-format norm | **PASS** | `ranking.test.ts`, `scoringSystemsRanking.test.ts`. |
| 18 | Live updates (<1s Socket.IO), Live badge, TV page, offline snapshots | **PASS** | `qaApiMatrix.test.ts` (`<1s` Socket.IO), `TVScoreboardScreen.test.tsx`. |
| 19 | `npm run rebuild-rankings` parity, season close, merge players, weights | **PASS** | `rankingRoutes.test.ts`, `coverage.test.ts`. |
| 20 | Player profile (stats, rank history, form, shots, H2H, trophies, strengths) | **PASS** | `ApplePlayerProfileSheet.test.tsx`. |
| 21 | Match summary (game scores, player table, MVP/Fighter, streaks, side-out log) | **PASS** | `AppleMatchSummarySheet.test.tsx`, `MatchSummary.test.tsx`. |
| 22 | Weekly awards, shareable image cards, CSV & JSON export, native share | **GAP (Minor)** | CSV & PNG scorecard (`exportUtils.ts`) + Weekly accolades verified; standalone JSON export button not exposed in UI. |
| 23 | Postgres migrations, append-only trigger, constraints, audit, soft deletes, indexes | **FAIL-FIXED** | Fixed `auditLog.sql` `id` bug, `partitioning.sql` missing trigger & `CHECK` constraint; 1M-event gate passes in CI. |
| 24 | API: auth/roles, Zod, idempotent ingestion, engine re-validation, rate limit | **PASS** | `qaApiMatrix.test.ts` (all 4 roles, Zod 400s, 3x idempotency, 2-device ordering). |
| 25 | Offline-first: airplane mode, kill/relaunch restore, sync once, 2-device order | **PASS** | `storage.test.ts`, `qaApiMatrix.test.ts`, `emulator-smoke.sh` (kill/relaunch & airplane toggle). |
| 26 | iOS design system, 4-tab nav, light/dark, dynamic text, empty/skeletons, welcome | **PASS** | `ui.test.tsx`, `App.test.tsx`, `OnboardingSheet.test.tsx`, `GlitchHunt.test.tsx`. |
| 27 | Android behavior: cutout, keep-awake, Back, rotation, haptics, notifications, battery | **NEEDS MANUAL CHECK** | Back, rotation, kill/relaunch, airplane verified on API 35 emulator; haptics, sunlight, 10-min wake & Funtouch battery need iQOO Neo 10 check. |
| 28 | APK pipeline: signed APK, same keystore, Release, SHA-256, install page, updater | **FAIL-FIXED** | Fixed monotonic `VERSION_CODE` (`100 + git rev-list --count HEAD`), added `apksigner verify` & emulator upgrade test. |
| 29 | Accessibility: TalkBack labels, `aria-live`, 48dp targets, reduce motion, large text | **PASS** | Verified >=48dp targets in Playwright + `aria-live="polite"` in `StreakBanner`. |
| 30 | Responsive: 360x800, 393x873, tablet two-pane, TV scoreboard mode | **PASS** | Verified in Playwright across 360x800, 393x873, 873x393, 768x1024, 1280x800. |

---

## 3. Defects Found & Fixed Log
1. **Coverage Below 95% Gate (`@rallypoint/ranking` 93.43%, `@rallypoint/scoring-rules` 91.81%):** Fixed with `qaExhaustive.test.ts` (**97.10%**) and `mvp.test.ts` + `coverage.test.ts` (**95.02%**).
2. **`MatchSetupSheet.tsx` Read-Only Custom Scoring State:** Wired editable `customTarget`, `customWinBy`, `customCap`, and `CUSTOM` format configuration.
3. **`packages/db/src/auditLog.sql` `NULL` `id` Crash (`P2011`):** `trg_audit_log_capture()` omitted `id` when inserting into Prisma-created `audit_logs`; fixed by generating `v_log_id` explicitly.
4. **`packages/db/src/partitioning.sql` Unattached Append-Only Trigger & Missing Score `CHECK`:** Attached `trg_match_events_append_only` (`BEFORE UPDATE OR DELETE`) on `match_events` and added `chk_games_non_negative_scores` on `games`.
5. **Android APK `INSTALL_FAILED_VERSION_DOWNGRADE` on Cross-Workflow Builds:** Switched `VERSION_CODE` to monotonic `100 + $(git rev-list --count HEAD)`.
6. **Vite `vendor` Chunk > 600 kB (`663.72 kB`):** Split `framer-motion`, `lucide-react`, `@capacitor/*`/`dexie`, and `canvas-confetti` into dedicated chunks (`vendor` now `345.91 kB`).
7. **Outdated `apps/web/e2e/match.spec.ts`:** Rewrote E2E suite for the Apple-style UI across phone, landscape, tablet, and desktop viewports.

---

## 4. Known Limitations & Recommended Next Steps
- **Open Minor GAPs:** (1) `MvpRevealCard` shares formatted summary text rather than a rendered PNG card image; (2) standalone JSON export button is not exposed in the UI (CSV and PNG scorecard exports are available).
- **Manual Hardware Verification:** Run the 25-item [MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md) on the physical **iQOO Neo 10** before promoting `v1.2.1-rc1` to stable `v1.2.1`.
