# Match MVP Diagnosis Report

**Phase:** Fresh-Start Phase 3  
**Scope:** `@rallypoint/ranking` (`computeMatchAwards`), `AppleMatchSummarySheet.tsx`, `MvpRevealCard.tsx`, `matchStore.ts`, `rankingService.ts`.

---

## Root Causes Identified

1. **Missing `PLAYER_ACTION` events in `AppleMatchSummarySheet.tsx`**:
   - `AppleMatchSummarySheet` read `state.history` from `@rallypoint/engine`, whereas `useMatchStore` stores `PLAYER_ACTION` events in `useMatchStore().events` and `scoringRulesState.events` when using `@rallypoint/scoring-rules`. As a result, `computeMatchAwards` received an empty or incomplete event list on live matches, causing the MVP card to disappear or pick the wrong player.
2. **Divergent MVP calculation inside `AppleMatchSummarySheet.tsx`**:
   - `handleShare` used a separate ad-hoc `net = pointsWon - drops` sort instead of `computeMatchAwards`, leading to mismatches between the shared text and the MVP card.
3. **Missing match metadata passed to `computeMatchAwards`**:
   - `AppleMatchSummarySheet` did not pass `scoringFormat`, `targetPoints`, or `bestOf`, so Service Point matches defaulted to Rally Point (`1.0` serve-regain multiplier instead of `1.5`) and `targetPoints = 21` instead of `15`.
4. **Flat 5-action qualification fails on short/shutout games**:
   - `totalAttributedActions >= 5` disqualified all players in 7-0 doubles shutouts or short 11-point games. Fixed with relative qualification: `max(2, min(5, floor(0.4 * avgActionsPerPlayer)))`.
5. **Clutch points invented during shutout games**:
   - In a 7-0 shutout with `targetPoints = 11` or `7`, `scoreA >= targetPoints - 5` triggered fake clutch points even though the opponent had 0 points. Shutout games now mark clutch as not applicable (`0` clutch points/drops).
6. **Out-of-order events & unattributed rallies**:
   - `computeMatchAwards` did not sort `events` by `sequenceNumber` before replaying, and ignored score updates from unattributed `POINT`/`RALLY_WON` events, skewing deficit/comeback calculations. Also added `unassignedCount` to `MatchAwardsResult`.
7. **Walkover & Live Match Guard**:
   - Walkover matches (`WALKOVER` event or `status: 'WALKOVER'`) must not award an MVP. Final MVP is gated on `MATCH_END` (or `RETIRE`) unless explicitly requested as provisional live peek.
8. **Duplicate `MatchAward` persistence**:
   - Ensures award computation replaces any existing award record for `matchId` rather than appending duplicates.
