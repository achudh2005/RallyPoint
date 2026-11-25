# RallyPoint Final QA & Release Verification Report

**Living Report** — Updated across QA Phases 1–5  
**Current Phase:** Phase 1 (Audit & Test-Gap Analysis)  
**Target Device:** iQOO Neo 10 (Android 15, 6.8" 144Hz AMOLED, punch-hole cutout, gesture nav)  
**Target Release:** `v1.2.1-rc1` (Baseline: `v1.2.0`)

---

## 1. Baseline Measurements (Phase 1)

| Metric | Baseline Value | Target / Budget | Status |
|--------|---------------|-----------------|--------|
| Total Automated Tests | **256 passed** (45 files) | 100% pass + E2E + Emulator | PASS (unit) / GAP (E2E/Emulator) |
| `@rallypoint/scoring-rules` Coverage | **91.81%** lines/stmts (30 tests) | >= 95% | **FAIL** (addressed in Phase 2) |
| `@rallypoint/ranking` Coverage | **93.43%** lines/stmts (35 tests) | >= 95% | **FAIL** (exits 1 on `test:coverage`; Phase 2) |
| `@rallypoint/db` Tests | 22 passed (5 files) | Real Postgres 16 + 1M load | PASS (unit) / GAP (1M load) |
| `@rallypoint/api` Tests | 26 passed (3 files) | Auth/roles/idempotency/WS <1s | PASS (basic) / GAP (matrix) |
| `@rallypoint/web` Tests | 103 passed (26 files) | Unit + Playwright E2E | PASS (unit) / GAP (E2E outdated) |
| Web Vite Build | 46.51s (`vendor` 663.72 kB > 600 kB) | < 600 kB chunks | **WARN** (code-splitting in Phase 4) |
| `v1.2.0` Release APK Size | **7,539,255 B** (~7.19 MB) | <= 10 MB | PASS |
| `v1.2.0` Debug APK Size | **11,722,135 B** (~11.18 MB) | — | PASS |

---

## 2. Feature Inventory Verification (30 Items)

*(See [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) for exact file paths and test mapping.)*

| # | Feature | Phase 1 Status | Evidence / Notes |
|---|---------|----------------|------------------|
| 1 | 3-step match setup, singles/doubles auto-detect, balanced pairs, coin flip | **GAP** | `MatchSetupSheet.tsx` exists, needs unit + E2E tests. |
| 2 | Rally Point 21/15/11, win by 2, hard cap, side change, best-of-3 | **PASS** | `scoringRules.test.ts`, `engine.test.ts` (needs boundary expansion for 95%+). |
| 3 | Service Point 15/11, server-only scoring, side-out, setting 14/13 & 10/9 | **PASS** | `scoringRules.test.ts`, `playerActions.test.ts` (expand 11-pt setting). |
| 4 | Custom scoring format (target, win-by, cap, setting rule) | **GAP** | Engine supports `customFormatConfig`; `MatchSetupSheet.tsx` UI inputs missing setters. |
| 5 | Serve logic: parity, doubles rotation, 1-down Service Point, indicator | **PASS** | `scoringRules.test.ts`, `AppleScoringScreen.test.tsx`. |
| 6 | UNDO (last 10 actions) across side-out, setting, game boundary, match end | **PASS** | `playerActions.test.ts`, `AppleScoringScreen.test.tsx` (add boundary matrix). |
| 7 | Event sourcing: replay equals incremental state | **PASS** | `fast-check` tests in `playerActions.test.ts`, `streaks.test.ts`, `mvp.test.ts`. |
| 8 | Player POINT/DROP buttons (8 doubles, 4 singles), thumb zone, order | **PASS** | `PlayerCard.test.tsx`, `AppleScoringScreen.test.tsx` (360x800, 393x873). |
| 9 | POINT/DROP score/side-out in both systems for server & receiver | **PASS** | `playerActions.test.ts`. |
| 10 | One tap = one rally, 300ms debounce, no taps when sheets open | **GAP** | Implemented in `AppleScoringScreen.tsx`; needs debounce & sheet-block tests. |
| 11 | Unattributed team tap & `Unassigned: N` counter | **GAP** | Implemented in `scoringEngine.ts` & `AppleScoringScreen.tsx`; needs UI/E2E test. |
| 12 | Long-press sheet: swap, stats, edit/reassign last 10 actions + audit | **GAP** | `PlayerDetailSheet` & `QuickEditSheet` exist; swap & audit need verification. |
| 13 | Settings: toggle buttons, rename labels, layout size | **GAP** | Implemented in `AppleProfileScreen.tsx`; needs interactive tests. |
| 14 | Streak alerts: POINT/DROP, team run, strict mode, 20s gap, UNDO rollback | **PASS** | `streaks.test.ts`, `StreakBanner.test.tsx`, `AppleScoringScreen.test.tsx`. |
| 15 | MVP & Fighter: formula, 1.5x Service, 5-action gate, tie-breakers, share, DB | **GAP** | Core tested (`mvp.test.ts`, `MvpRevealCard.test.tsx`); PNG image share & edit recompute E2E pending. |
| 16 | All 16 player leaderboards & team boards | **PASS** | `ranking.test.ts`, `AppleRankingsScreen.test.tsx` (coverage 93.43% < 95%). |
| 17 | `Matches: N`, tie handling (1,2,2,4), movement, filters, mixed-format norm | **PASS** | `ranking.test.ts`, `scoringSystemsRanking.test.ts`. |
| 18 | Live updates (<1s Socket.IO), Live badge, TV page, offline snapshots | **GAP** | Socket.IO E2E latency & offline "last updated" label unverified. |
| 19 | `npm run rebuild-rankings` parity, season close, merge players, weights | **GAP** | Admin actions need DB/API integration tests. |
| 20 | Player profile (stats, rank history, form, shots, H2H, trophies, strengths) | **GAP** | `ApplePlayerProfileSheet.tsx` lacks dedicated component tests. |
| 21 | Match summary (game scores, player table, MVP/Fighter, streaks, side-out log) | **GAP** | `AppleMatchSummarySheet.tsx` lacks dedicated unit tests. |
| 22 | Weekly awards, shareable image cards, CSV & JSON export, native share | **GAP** | CSV & PNG scorecard exist; JSON export & MVP image card missing/unverified. |
| 23 | Postgres migrations, append-only trigger, constraints, audit, soft deletes, indexes | **GAP** | Needs real Postgres 16 verification + 1M-event load & `EXPLAIN ANALYZE`. |
| 24 | API: auth/roles, Zod, idempotent ingestion, engine re-validation, rate limit | **GAP** | Needs full role matrix, 3x batch idempotency, and 2-device conflict tests. |
| 25 | Offline-first: airplane mode, kill/relaunch restore, sync once, 2-device order | **GAP** | Needs Playwright offline + emulator kill/relaunch verification. |
| 26 | iOS design system, 4-tab nav, light/dark, dynamic text, empty/skeletons, welcome | **PASS** | `ui.test.tsx`, `App.test.tsx`, `OnboardingSheet.test.tsx` (visual regression in Phase 3). |
| 27 | Android behavior: cutout, keep-awake, Back, rotation, haptics, notifications, battery | **NEEDS MANUAL CHECK** | Cloud emulator covers Back/rotation/kill in Phase 3; haptics/sunlight/battery require iQOO Neo 10. |
| 28 | APK pipeline: signed APK, same keystore, Release, SHA-256, install page, updater | **PASS** | `v1.2.0` APK built & released; upgrade-over-old-APK test in Phase 3. |
| 29 | Accessibility: TalkBack labels, `aria-live`, 48dp targets, reduce motion, large text | **GAP** | Needs `axe` scan & Lighthouse >= 95 in Phase 3. |
| 30 | Responsive: 360x800, 393x873, tablet two-pane, TV scoreboard mode | **GAP** | Needs Playwright multi-viewport visual & layout verification in Phase 3. |

---

## 3. Defects Found & Fixed Log
*(Populated in Phases 1–5 as defects are discovered and fixed.)*
- **Phase 1 Finding #1:** `@rallypoint/ranking` `npm run test:coverage` fails its 95% global threshold (`93.43%` lines/stmts), and `@rallypoint/scoring-rules` is at `91.81%`. Scheduled for Phase 2 fix.
- **Phase 1 Finding #2:** `apps/web/e2e/match.spec.ts` targets legacy UI selectors (`Bo1`, `tap-left-side`) and does not cover the redesigned Apple UI. Scheduled for Phase 3 rewrite.
- **Phase 1 Finding #3:** `MatchSetupSheet.tsx` has read-only `customWinBy` and `customCap` state without UI controls for custom scoring format. Scheduled for Phase 2/3 fix.
- **Phase 1 Finding #4:** Vite production bundle emits `vendor` chunk at `663.72 kB` (> 600 kB warning). Scheduled for Phase 4 code-splitting.
