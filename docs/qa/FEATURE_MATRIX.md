# RallyPoint Feature Matrix (QA Phase 1 Audit)

Audit Date: 2026-11-25  
Target Release: `v1.2.0` -> `v1.2.1-rc1`  
Target Device: iQOO Neo 10 (Android 15, 6.8" 144Hz AMOLED, punch-hole cutout, gesture navigation)

## Status Legend
- **EXISTS-WORKING**: Implemented in code and covered by passing automated tests.
- **EXISTS-UNVERIFIED**: Implemented in code, but lacks dedicated automated verification (e.g., E2E, real Postgres, emulator, or edge-case tests).
- **PARTIAL**: Core or partial implementation exists, with missing UI controls, incomplete edge cases, or missing persistence/sync wiring.
- **MISSING**: Not yet implemented.

---

## A. Scoring Systems and Match Flow

| # | Feature | Code Location | Existing Tests | Status | Notes / Gaps |
|---|---------|---------------|----------------|--------|--------------|
| 1 | 3-step match setup (players, scoring, first server), singles/doubles auto-detect, balanced pairs, coin flip | `apps/web/src/components/play/MatchSetupSheet.tsx`, `apps/web/src/store/rankingStore.ts` | `MatchSetup.test.tsx`, `RankingUI.test.tsx` (legacy setup) | **EXISTS-UNVERIFIED** | `MatchSetupSheet` (3-step Apple UI) has no dedicated unit/E2E test yet. |
| 2 | Rally Point 21/15/11: win by 2, hard cap, side change after game & deciding midpoint, best-of-3 | `packages/scoring-rules/src/scoringEngine.ts`, `packages/engine/src/engine.ts` | `scoringRules.test.ts` (12), `engine.test.ts` (22) | **EXISTS-WORKING** | Coverage at 93.27%; need exhaustive 20-20, 29-29, 30-29, 15/11 boundary tests for 95%+. |
| 3 | Service Point 15/11: server-only scoring, side-out, setting at 14-all/13-all & 10-all/9-all, first-to-reach chooses | `packages/scoring-rules/src/scoringEngine.ts` | `scoringRules.test.ts`, `playerActions.test.ts` | **EXISTS-WORKING** | Need exhaustive setting choice & 11-pt (9-all, 10-all) tests. |
| 4 | Custom scoring format (target, win-by, cap, setting rule) | `packages/scoring-rules/src/types.ts` (`CUSTOM`), `MatchSetupSheet.tsx` | `scoringRules.test.ts` | **PARTIAL** | Engine supports `customFormatConfig`, but `MatchSetupSheet.tsx` has read-only `customWinBy`/`customCap` without UI inputs. |
| 5 | Serve logic: singles parity, doubles rotation, 1-down start in Service Point, server indicator | `packages/scoring-rules/src/scoringEngine.ts`, `PlayerCard.tsx` | `scoringRules.test.ts`, `AppleScoringScreen.test.tsx` | **EXISTS-WORKING** | Verified in engine & UI; need doubles rotation + 1-down exhaustive matrix. |
| 6 | UNDO (last 10 actions) across side-out, setting, game boundary, match end | `packages/scoring-rules/src/scoringEngine.ts`, `apps/web/src/store/matchStore.ts` | `playerActions.test.ts`, `AppleScoringScreen.test.tsx` | **EXISTS-WORKING** | Needs explicit tests for UNDO across setting choice, game boundary, and match end. |
| 7 | Event sourcing: replay always equals incremental state | `packages/scoring-rules/src/scoringEngine.ts`, `streaks.ts`, `packages/ranking/src/mvp.ts` | `playerActions.test.ts`, `streaks.test.ts`, `mvp.test.ts` (fast-check) | **EXISTS-WORKING** | Property-based tests exist; expand to random mixed sequences with UNDO & edits. |

## B. Player Action Buttons

| # | Feature | Code Location | Existing Tests | Status | Notes / Gaps |
|---|---------|---------------|----------------|--------|--------------|
| 8 | POINT & DROP buttons per player (8 doubles, 4 singles), thumb zone, court order | `PlayerCard.tsx`, `AppleScoringScreen.tsx` | `PlayerCard.test.tsx` (3), `AppleScoringScreen.test.tsx` (11) | **EXISTS-WORKING** | Verified 64dp touch targets & 12dp gap on 360x800 and 393x873. |
| 9 | POINT & DROP score/side-out in both Rally & Service Point for server & receiver | `packages/scoring-rules/src/scoringEngine.ts` | `playerActions.test.ts` (10) | **EXISTS-WORKING** | All 4 server/receiver x POINT/DROP combinations covered. |
| 10 | One tap = one rally, 300ms debounce, no taps when sheets open | `AppleScoringScreen.tsx` (`lastActionTimestampRef`) | `AppleScoringScreen.test.tsx` | **EXISTS-UNVERIFIED** | Debounce & modal-open tap blocking need dedicated unit + glitch tests. |
| 11 | Unattributed team tap and `Unassigned: N` counter | `AppleScoringScreen.tsx`, `scoringEngine.ts` (`recordUnattributedPoint`) | `playerActions.test.ts` | **EXISTS-UNVERIFIED** | UI badge & tap flow need dedicated component + E2E test. |
| 12 | Long-press sheet: swap player, view match stats, edit/reassign last 10 actions + audit | `PlayerDetailSheet.tsx`, `QuickEditSheet.tsx`, `matchStore.ts` | `AppleScoringScreen.test.tsx` (QuickEdit) | **PARTIAL** | `PlayerDetailSheet` swap & audit log persistence need verification. |
| 13 | Settings: toggle player buttons, rename labels, layout size | `AppleProfileScreen.tsx`, `matchStore.ts` | `AppleProfileScreen.test.tsx` | **EXISTS-UNVERIFIED** | Need tests toggling labels (`WINNER/ERROR`, `+1/-1`) & compact layout. |

## C. Streak Alerts and MVP

| # | Feature | Code Location | Existing Tests | Status | Notes / Gaps |
|---|---------|---------------|----------------|--------|--------------|
| 14 | POINT/DROP streaks, team run, strict mode, 1 banner, 20s gap, higher replaces, UNDO rollback, no overlap | `packages/scoring-rules/src/streaks.ts`, `StreakBanner.tsx`, `LiveAlertsSettings.tsx` | `streaks.test.ts` (8), `StreakBanner.test.tsx` (5), `AppleScoringScreen.test.tsx` | **EXISTS-WORKING** | Coverage of `streaks.ts` is 86.14% (legacy `POINT_SCORED`/`RALLY_WON` path uncovered); 20s gap queue needs timer test. |
| 15 | MVP & Fighter: all inputs, 1.5x Service multiplier, 5-action gate, tie-breakers, co-MVP, singles, share, persisted `MatchAward` | `packages/ranking/src/mvp.ts`, `MvpRevealCard.tsx`, `apps/api/src/services/eventSyncService.ts` | `mvp.test.ts` (8), `MvpRevealCard.test.tsx` (4), `server.test.ts` | **PARTIAL** | Share image card exports text currently (`nativeShare.shareText`); image card PNG share & edit recompute E2E need verification. |

## D. Rankings and Teams

| # | Feature | Code Location | Existing Tests | Status | Notes / Gaps |
|---|---------|---------------|----------------|--------|--------------|
| 16 | All 16 player leaderboards & team boards | `packages/ranking/src/rankingEngine.ts`, `AppleRankingsScreen.tsx`, `RankingsDashboard.tsx` | `ranking.test.ts`, `AppleRankingsScreen.test.tsx` | **EXISTS-WORKING** | `ranking` coverage is 93.43% (below 95% threshold!). |
| 17 | `Matches: N`, tie handling (1,2,2,4), rank movement, filters, mixed-format normalization | `packages/ranking/src/rankingEngine.ts`, `stats.ts` | `ranking.test.ts`, `scoringSystemsRanking.test.ts` | **EXISTS-WORKING** | Need explicit tests for `stats.ts` uncovered branches to reach 95%+. |
| 18 | Live updates (<1s Socket.IO), Live badge, TV page, offline cached snapshots + last updated | `apps/api/src/sockets/rankingSocket.ts`, `TVScoreboardScreen.tsx`, `rankingStore.ts` | `rankingRoutes.test.ts`, `TVScoreboardScreen.test.tsx` | **EXISTS-UNVERIFIED** | Socket.IO <1s end-to-end delivery & "last updated" offline label need verification. |
| 19 | `npm run rebuild-rankings` parity, season close, merge players, weight changes | `packages/ranking/src/rebuild.ts`, `cli.ts`, `adminRankingRoutes.ts` | `coverage.test.ts` | **EXISTS-UNVERIFIED** | Admin season close / merge players / weight recompute need API + DB integration tests. |

## E. Profiles, Summaries, Awards

| # | Feature | Code Location | Existing Tests | Status | Notes / Gaps |
|---|---------|---------------|----------------|--------|--------------|
| 20 | Player profile: stats, rank history, form dots, shot breakdown, points vs drops, H2H, trophies, strengths | `ApplePlayerProfileSheet.tsx`, `PlayerProfileModal.tsx` | None dedicated for `ApplePlayerProfileSheet` | **EXISTS-UNVERIFIED** | Needs dedicated component tests for Trophy Shelf, Strengths, H2H, and form dots. |
| 21 | Match summary: score by game, player stats table, MVP & Fighter, longest streaks, log with side-outs | `AppleMatchSummarySheet.tsx`, `MatchSummary.tsx` | `MatchSummary.test.tsx` (2) | **EXISTS-UNVERIFIED** | `AppleMatchSummarySheet` needs dedicated unit tests (side-out markers, longest streaks). |
| 22 | Weekly awards, shareable image cards, CSV & JSON export, native share sheet | `exportUtils.ts`, `nativeShare.ts`, `MatchSummary.tsx` | `exportUtils.test.ts` (3), `mobileAdapters.test.ts` | **PARTIAL** | CSV & PNG scorecard exist; JSON export & shareable MVP image card need verification/wiring. |

## F. Data and Backend

| # | Feature | Code Location | Existing Tests | Status | Notes / Gaps |
|---|---------|---------------|----------------|--------|--------------|
| 23 | Postgres migrations (fresh & seeded), append-only trigger, constraints, audit log, soft deletes, indexes | `packages/db/prisma/schema.prisma`, `partitioning.sql`, `auditLog.sql` | `packages/db/src/*.test.ts` (22) | **EXISTS-UNVERIFIED** | Unit tests use mocks/SQLite or lightweight checks; real Postgres 16 CI test for 1M-event load & `EXPLAIN ANALYZE` needed. |
| 24 | API: auth & roles, Zod validation, idempotent ingestion, server re-validation, rate limiting, errors | `apps/api/src/routes/*.ts`, `middleware/auth.ts` | `server.test.ts`, `rankingRoutes.test.ts` | **EXISTS-UNVERIFIED** | Need Supertest matrix for all 4 roles, 3x idempotent batch, invalid actions per format, and 2-device conflict. |
| 25 | Offline-first: airplane mode scoring, kill & relaunch restore, sync once on reconnect, 2-device ordering | `apps/web/src/db/storage.ts`, `matchStore.ts` (`resumeLastMatch`) | `storage.test.ts` (2), `matchStore.test.ts` (6) | **EXISTS-UNVERIFIED** | Needs E2E + emulator kill/relaunch + offline/online sync verification. |

## G. UI and Mobile App

| # | Feature | Code Location | Existing Tests | Status | Notes / Gaps |
|---|---------|---------------|----------------|--------|--------------|
| 26 | iOS-style design system, 4-tab nav, light/dark, dynamic text, empty states, skeletons, welcome | `packages/ui/src/*`, `App.tsx`, `OnboardingSheet.tsx` | `ui.test.tsx` (10), `App.test.tsx` (2), `OnboardingSheet.test.tsx` (2) | **EXISTS-WORKING** | Need visual regression & skeleton/empty-state checks across all screens. |
| 27 | Android behavior: edge-to-edge/cutout, keep-awake, Back stack, rotation, haptics, notifications, Funtouch guide | `apps/web/src/mobile/*.ts`, `MainActivity.java`, `FuntouchBatteryModal.tsx` | `mobileAdapters.test.ts` (7) | **EXISTS-UNVERIFIED** | Cloud emulator can test Back, rotation, and kill/restore; haptics/sunlight/battery need manual check on iQOO Neo 10. |
| 28 | APK pipeline: signed release APK, same keystore, version numbers, Release, SHA-256, install page, update checker, upgrade | `.github/workflows/android-apk.yml`, `docs/install/index.html`, `updateChecker.ts` | `updateChecker.test.ts` (7) | **EXISTS-WORKING** | `v1.2.0` APK built & released; install-over-old-version upgrade test needed in Phase 3. |
| 29 | Accessibility: TalkBack labels, `aria-live`, color-independent meaning, 48dp targets, reduce motion, large text | `AppleScoringScreen.tsx`, `StreakBanner.tsx`, `PlayerCard.tsx` | `AppleScoringScreen.test.tsx` | **EXISTS-UNVERIFIED** | Needs automated `axe` scan & Lighthouse accessibility >= 95 in Phase 3. |
| 30 | Responsive: 360x800, 393x873, tablet two-pane, TV scoreboard mode | `AppleScoringScreen.tsx`, `TVScoreboardScreen.tsx`, `App.tsx` | `AppleScoringScreen.test.tsx`, `TVScoreboardScreen.test.tsx` | **EXISTS-UNVERIFIED** | Needs Playwright visual & layout verification across all 4 viewport classes. |
