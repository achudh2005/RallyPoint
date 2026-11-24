# Changelog

All notable changes to the RallyPoint project will be documented in this file.

## [UI Phase 3] - Apple-Style Rankings, Players, Profiles, Match Summary & Settings
### Added
- **Rankings Screen (`AppleRankingsScreen.tsx`)**:
  - Segmented control toggling between `Players` and `Teams & Pairs`.
  - 5 horizontally scrolling category chips (`Top Players`, `Most Wins`, `Most Points`, `Most Losses`, `Most Drops`).
  - Top 3 Podium header with center elevated 🥇 gold champion display.
  - Inset standings list with medal emoji/numbering, avatar, player name, matches played, and headline stat.
  - Filter bottom sheet for scoring format (`All Scoring Formats`, `Rally Point`, `Service Point`) and active season scope.
- **Players Screen (`ApplePlayersScreen.tsx`)**:
  - Searchable inset list of community roster players with avatars, matches played, and win counts.
  - "Add Player" modal sheet with name input and haptic confirmation.
- **Player Profile Sheet (`ApplePlayerProfileSheet.tsx`)**:
  - Large avatar, rank badge, rating, and 3 headline tiles: Wins, Win Rate %, Matches Played.
  - 5-dot recent form strip (W/L dots).
  - Rank history sparkline chart powered by Recharts.
  - Head-to-Head records list with opponent match records.
  - Progressive disclosure: Expandable detailed stats (Total points scored, conceded, drop winners, win streak).
- **Match Summary Sheet (`AppleMatchSummarySheet.tsx`)**:
  - Hero winner card with celebratory trophy.
  - Game score breakdown with score comparison.
  - 3 headline match tiles: Total Points, Longest Rally, and Events.
  - Share Result button using Web Share API or clipboard copy.
  - Point-by-point inspection modal listing every scored rally.
- **Settings Screen (`AppleProfileScreen.tsx`)**:
  - Inset iOS Settings grouped layout.
  - Dark Appearance toggle and courtside high-contrast toggle.
  - 5 accent color selectors (`green`, `blue`, `teal`, `indigo`, `amber`).
  - Vibration & haptic feedback toggle.
  - Active season picker and event sourcing Rebuild Rankings replayer.
  - JSON match event log export.
  - UI Component Showcase launcher with full design tokens preview.
- **Documentation**:
  - Full details in `docs/ui/phase-3-remaining-screens.md`.


## [UI Phase 2] - Navigation, Play Tab, 3-Step Setup & Apple Calm Live Scoring
### Added
- **4-Tab Native Apple Navigation (`TabBar.tsx`)**:
  - `Play`, `Rankings`, `Players`, and `Profile` persistent bottom navigation bar.
  - Liquid glass backdrop blur with safe-area insets and active spring pill indicator.
  - Haptic feedback on tab changes (`Haptics.selection()`).
- **Play Screen (`PlayScreen.tsx`)**:
  - Single primary action hero banner: "Start Match" with subtle gradient background.
  - Active match in-progress alert card for 1-tap live resumption.
  - Inset grouped list of recent matches showing participants, format tags, and score chips.
- **3-Step Match Setup Sheet (`MatchSetupSheet.tsx`)**:
  - Step 1: "Who's playing?" with search and "Fair Teams" balanced doubles auto-suggestion.
  - Step 2: "How do you want to score?" with large Rally vs Service Point cards and target score segmented pills (21, 15, 11).
  - Step 3: "Who serves first?" with server selection and animated coin-flip toss.
- **Calm Apple Live Scoring Screen (`AppleScoringScreen.tsx`)**:
  - Split screen: Two massive tappable halves (portrait top/bottom, landscape left/right) with high-contrast rolling digit counters (`ScoreNumberRoll`).
  - Haptic feedback on every scored point (`Haptics.pointScored()`).
  - Quiet middle status bar: Game number, format badge, and active server shuttle `🏸` indicator.
  - Quiet bottom controls: Single Undo button (`Haptics.undo()`) and options menu (`...`).
  - Service Point support: "Serve changes side" notice banner and setting option bottom sheets (14-all setting to 17).
  - Optional 3-second auto-dismiss shot tagging bar (`Smash`, `Drop`, `Net`, `Error`).
  - Screen Wake Lock keeping screen active during live matches.
- **Documentation**:
  - Full design and implementation notes in `docs/ui/phase-2-navigation-and-scoring.md`.

## [UI Phase 1] - Design System (@rallypoint/ui) & Apple HIG Tokens
### Added
- **`@rallypoint/ui` Package**:
  - Apple Human Interface Guidelines (HIG) design system with SF Pro typography scale (Large Title 34, Title 28, Headline 17 semibold, Body 17, Subhead 15, Caption 12).
  - Dynamic Type scaling support (`standard`, `large` +15%, `accessibility` +30%).
  - Configurable Apple accent color system (`Wimbledon Green`, `Court Blue`, `Shuttle Teal`, `Smash Indigo`, `Champion Gold`).
  - System grouped backgrounds, elevated cards, and translucent glass materials with hairline separators.
  - Haptic feedback engine (`navigator.vibrate`) for selections, point scores, undos, and match finishes.
- **Components**:
  - `LargeTitle`: Collapsible navigation header with subtitle and trailing actions.
  - `GroupedList` & `GroupedRow`: Inset iOS cards with icons, subtitles, values, and chevrons.
  - `SegmentedControl`: Native sliding pill segmented control with Framer Motion spring physics.
  - `BottomSheet`: Gesture-dismissable bottom sheet with grabber handle and blurred backdrop.
  - `Toast`: Floating pill notification banner with 5-second countdown and Undo button.
  - `Toggle`: Native iOS switch with spring sliding knob.
  - `Stepper`: Minus / Plus stepper control with tap haptics.
  - `Avatar`: Continuous squircle avatar with deterministic gradient and serving/winner badges.
  - `Badge`: Semantic pill badges (`accent`, `success`, `warning`, `destructive`, `neutral`).
  - `EmptyState`: Friendly icon, title, description, and primary pill button.
  - `Skeleton`: Smooth pulsing placeholder loading block.
  - `Button`: Primary (accent filled), secondary (tinted gray), glass, and destructive buttons.
  - `ScoreNumberRoll`: Vertical digit sliding animation on score updates.
  - `ComponentGallery`: Interactive Storybook/Gallery showcase component documenting every component and token.
- **Documentation**:
  - Comprehensive specification in `docs/ui/phase-1-design-system.md`.

## [Database Phase 4 & db-v1.0.0] - Production Hardening, Operations, Repository Layer & CI
### Added
- **Typed Repository & Service Layer (`@rallypoint/db`)**:
  - `getPlayerProfile`, `searchPlayers`, `getMatchHistory`, `getPlayerStats`, `getHeadToHead`, `getLeaderboard`, and `ingestEvents`.
  - Full Zod runtime validation on all inputs and cursor-based pagination for $O(1)$ scalable queries.
  - Bidirectional head-to-head resolution handling arbitrary player pairing orders.
- **GDPR Privacy & Audit Logging**:
  - `anonymizePlayer(playerId)`: Scrubs personal fields (name, email, phone, bio, photo) while preserving match history, sequence order, and analytics.
  - `exportPlayerData(playerId)`: Compiles complete GDPR-compliant JSON data portability dossiers.
  - Master data CDC audit logging table `audit_logs` and automated database trigger `trg_audit_log_capture` tracking all INSERT, UPDATE, DELETE actions.
- **Performance & Benchmark Suite**:
  - Audited 10 critical EXPLAIN ANALYZE queries with trigram fuzzy search and partial index optimization.
  - Synthetic streaming load test generator (`packages/db/src/loadTestSeed.ts`) capable of generating 100k players and 5M events.
- **Complete Database Documentation**:
  - Entity Relationship Diagram in Mermaid (`/docs/erd.md`).
  - Comprehensive Data Dictionary detailing all tables, types, constraints, and PII markers (`/docs/data-dictionary.md`).
  - Migration and Operations Guide covering provisioning, partition lifecycle, and zero-downtime rollouts (`/docs/migration-guide.md`).
- **Enhanced Continuous Integration (`.github/workflows/ci.yml`)**:
  - Automated PostgreSQL 16 container service.
  - Clean database migrations and zero schema drift check via `prisma migrate diff`.
  - Automatic seed verification and multi-package test execution.

## [Scoring Systems & Ranking Phase 2] - Live Marking UI While Playing (apps/web)
### Added
- **Match Setup with Scoring System Picker (`CommunityMatchSetup.tsx`)**:
  - Prominent top selector card grid for 6 scoring formats:
    - Rally 21 (BWF) - "Standard: every rally scores, game to 21"
    - Rally 15 - "Short game: every rally scores, game to 15"
    - Rally 11 - "Sprint: every rally scores, game to 11"
    - Service 15 - "Classic: only server scores, side-out on loss, game to 15"
    - Service 11 - "Classic sprint: only server scores, game to 11"
    - Custom - Expandable controls for target points, win-by, and hard cap.
  - Device persistence: Remembers the last-used scoring format in `localStorage`.
  - Singles and Doubles selector with auto-balanced pair generator.
  - Interactive First Serve Picker & Coin Toss helper (`🪙 Toss`).
- **Adaptive Live Scoring Screen (`ScoringScreen.tsx` & `matchStore.ts`)**:
  - Format Badge: Displays current scoring format (e.g. `[RALLY 21]`, `[SERVICE 15]`) in match header and Mini-Leaderboard Strip.
  - Service Point Scoring Live Callout:
    - Prominent amber banner: `⚡ SERVICE POINT SCORING` indicating active serving player and court.
    - Doubles service turns: Displays `ONE DOWN (1st Turn)` on initial turn, or `Server 1/2 of 2` on subsequent turns.
    - Dynamic button prediction badges:
      - Serving side: `+1 POINT` (Server scores point).
      - Receiving side: `SIDE OUT` (or `SECOND SERVER` in doubles; changes serve, 0 pts).
  - Setting Choice Modal:
    - Automatically prompts eligible side at setting thresholds (e.g. 13-all / 14-all in 15pt, 9-all / 10-all in 11pt).
    - Large touch-friendly options: "Set to 18" vs "No Set (Play to 15)".
    - Generates `SETTING_CHOICE` event and updates game target points.
  - Full undo support reverting setting choices, points, or side-outs.
  - Fast rally marking detail bar with 3-second auto-dismiss for rapid scorekeeping.

## [Scoring Systems & Ranking Phase 1] - Scoring Systems, Data Model, and Ranking Engine
### Added
- **`@rallypoint/scoring-rules` Package**:
  - Pure TypeScript, zero-dependency scoring engine handling BWF rally scoring and traditional service-point scoring.
  - Formats: `RALLY_21`, `RALLY_15`, `RALLY_11`, `SERVICE_POINT_15`, `SERVICE_POINT_11`, and `CUSTOM`.
  - Traditional service point side-out logic: Only the serving side scores points; receiver win causes a Side-Out without incrementing score.
  - Doubles "One Down" initial turn: At the start of every game in service point scoring, the initial server is Server 2 ("One Down"). Losing that rally immediately triggers a side-out. Thereafter, both partners serve before a side-out occurs.
  - Setting (deuce) choices: Configured setting thresholds (e.g. 13-all set to 5, 14-all set to 3 in 15pt; 9-all set to 3, 10-all set to 3 in 11pt) offered exclusively to the side that reached the tied score first.
  - Singles server court placement parity (even = right, odd = left) in both rally and service point systems.
  - Deciding game midpoint side switch (11 for 21-pt, 8 for 15-pt, 6 for 11-pt).
  - Event sourcing with full undo and replay support across game boundaries.
  - 96%+ test coverage with Vitest and `fast-check` property tests.
- **`@rallypoint/ranking` Scoring Systems & RP Extensions**:
  - Global Scoring System Filter (`'ALL' | 'RALLY' | 'SERVICE'`).
  - Ranking Points (RP) & League Standings:
    - 3 RP per win (Rally or Service Point).
    - Bonus RP: +1 RP for straight games (2-0), +1 RP for Giant Killer (beating someone ranked 3+ spots higher), +1 RP for winning a game that went to setting.
    - Format split: Every player shows matches split `Matches: N (R:X S:Y)`.
    - Normalization: When `formatFilter === 'ALL'`, `MOST_POINTS` ranks by `pointSharePct` ($\frac{\text{PointsScored}}{\text{TotalMatchPoints}} \times 100$) so 15-pt and 21-pt games compare equitably.
    - New category `BEST_SERVICE_GAME` ranking players by service holds, side-outs won, and service points won.
    - Full backward compatibility for `rebuildRankings(matches, prevRanks, prevTeamRanks, configOrWeights, formatFilter)`.
- **Database Schema Updates (`packages/db` & `apps/api`)**:
  - Added `ScoringFormat` enum (`RALLY_21`, `RALLY_15`, `RALLY_11`, `SERVICE_POINT_15`, `SERVICE_POINT_11`, `CUSTOM`).
  - Added `SIDE_OUT` and `SETTING_CHOICE` to `MatchEventType`.
  - Added `scoringFormat`, `targetPoints`, `winBy`, `cap`, `settingRule`, and `firstServer` columns to `Match`.
  - Added `scoringFormat` and `rankingPoints` to `PlayerRankingSnapshot` and `TeamRankingSnapshot`.
  - Added `RankingConfig` model for admin customizable point values, multipliers, and weights.

## [Ranking Phase 5 / rank-v1.0.0] - Polish, Performance, and Production Deployment
### Added
- **Performance & Materialized Views (`rankingMaterializedViews.sql`)**:
  - `mv_player_rankings`: High-efficiency materialized projection computing win rates, net points, smash/drop winners, and unforced errors.
  - `mv_team_rankings`: Standings for Doubles Pairs and Club Teams with promotion and relegation metrics.
  - Stored procedure `refresh_ranking_views()` with concurrent refresh indexes.
  - Trigger `trg_match_refresh_rankings` refreshing views on match completion.
- **Production Query Audit (`rankingPerformanceAudit.sql`)**:
  - `EXPLAIN (ANALYZE, BUFFERS)` execution plans for the 5 heaviest queries:
    1. Composite overall index ranking with joins, grouping, and window functions.
    2. Head-to-Head detailed match and game aggregation.
    3. Detailed rally event shot and error attribution across partition-pruned streams.
    4. Team league standings and promotion/relegation cutoff zones.
    5. Multi-period ranking snapshot time-series with inverted Y-axis history.
- **Synthetic Load Testing & Benchmark Engine (`loadTest.ts` & `loadTest.test.ts`)**:
  - Synthetic data generator simulating 200 players, 20,000 matches, and 1,000,000 events.
  - High-throughput ranking rebuild benchmarks (> 10,000 events/sec, < 500ms for 50k events in CI).
- **Realistic Community Seed Script (`seedCommunityRankings.ts` / `npm run seed:community`)**:
  - Populates 12 realistic community players, 4 doubles pairs & club teams, 2 seasons, and 3 weeks of matches.
  - Generates rich rally events with shot types (`SMASH`, `DROP`, `NET`, `CLEAR`) and outcomes (`WINNER`, `UNFORCED_ERROR`).
- **PWA Offline Leaderboards & Queue (`apps/web/src/db/index.ts`)**:
  - Dexie IndexedDB v2 upgrade adding `rankings` snapshot store and `offlineEventQueue`.
  - Offline status banner: "Offline Mode — Showing cached rankings from [time]" with automatic network reconnection listeners.
  - Queues match events recorded offline with automatic synchronization.
- **Accessibility & Color-Blind Safe Theming**:
  - High-contrast, color-blind-safe badges: `#1 Gold` (yellow border), `#2 Silver` (slate border), `#3 Bronze` (amber-600 border).
  - ARIA enhancements: `aria-live="polite"` on leaderboard tables and `MiniLeaderboardStrip` for screen reader rank updates.
- **Comprehensive Documentation (`docs/ranking-system.md`)**:
  - Mathematical formulas for overall weighted score and normalizations.
  - Documented tiebreak order for all 7 player categories and 5 team categories.
  - Mermaid ER diagram and full data dictionary.
  - Fast scorer user guide for Quick-Mark tap chips (Fast vs Quick vs Full mode).
- **Docker & DevOps Containerization**:
  - Multi-stage `Dockerfile.api` and `Dockerfile.web` updated to package `@rallypoint/ranking`.
  - Production build verification (`npm run build`) passing with optimal code splitting.

## [Ranking Phase 4] - Backend, Live Sync, and Admin (apps/api)
### Added
- **Ranking REST Endpoints (`rankingRoutes.ts`)**:
  - `GET /api/rankings/:category`: Paginated rankings with 5s TTL Cache-Control and `Matches: N`.
  - `GET /api/rankings/player/:id`: Comprehensive player statistics, multi-category ranks, and rank history.
  - `GET /api/rankings/head-to-head`: Two-player comparison with wins, head-to-head points, and match history.
  - `GET /api/teams/rankings`: Doubles pairs rankings and club league standings.
- **Admin Governance & Event Replay (`adminRankingRoutes.ts`)**:
  - Protected by JWT authentication and strict `ADMIN` role check.
  - `POST /api/admin/rebuild-rankings`: Re-runs full event replay across season or all-time domain events.
  - `POST /api/admin/recalculate-streaks`: Recalculates current and longest win streaks for all players.
  - `GET /api/admin/audit-log`: Immutable audit log tracking manual edits, score corrections, and recalculations.
  - `POST /api/admin/daily-rollup`: Nightly worker trigger generating snapshots and weekly community awards.
- **Live Sync Engine (`rankingSocket.ts`)**:
  - Dedicated `/rankings` Socket.IO namespace.
  - 500ms debounced live rank recomputation upon receipt of match point events.
  - Calculates rank differences and broadcasts `rankings:update` diff payload with changed rows (`playerId`, `category`, `oldRank`, `newRank`, `movement`).
- **Integration Test Suite (`rankingRoutes.test.ts`)**:
  - 15 end-to-end integration tests covering pagination, 5s TTL cache behavior, player stats, H2H, RBAC permissions, audit logging, and 500ms debounced live diff emissions.

## [Ranking Phase 3] - Rankings Dashboard and Team League (apps/web)
### Added
- **Dedicated Rankings Dashboard (`RankingsDashboard.tsx`)**:
  - Live derived leaderboard with Category Tabs: Overall Index, Most Wins, Most Points, Most Losses, Most Drops (with sub-toggle for Drop Shots Played vs Points Dropped), Most Errors ("Who Fails More"), Win Rate, and Team League.
  - Multi-window time filters: Season (`All Season`), Month (`This Month`), Week (`This Week`), and All-time.
  - Interactive table with gold (`🥇`), silver (`🥈`), and bronze (`🥉`) rank badges, player avatars, prominent `Matches: N` indicators, headline stats, secondary stats, 5-match form dots (green W / red L), and rank movement deltas (`▲ +N`, `▼ -N`, `−`).
  - Search/filter by player name with instant live filtering.
  - Current logged-in user row highlighting.
- **Weekly Community Awards & Badges**:
  - `🪶 Drop-Shot King`: Most drop winners.
  - `🧱 Iron Wall`: Lowest unforced error rate per match.
  - `⚡ Smash Master`: Highest smash winners.
  - `🔥 Comeback Kid`: Highest point differential comeback resiliency.
  - `🏃 Marathoner`: Most matches played this week.
- **Player Profile Modal (`PlayerProfileModal.tsx`)**:
  - Inverted Y-axis rank history line chart (Recharts) with Rank 1 rendered on top.
  - Shot breakdown comparison bar chart: Smash, Drop, Net, Clear, Drive winners vs errors.
  - Head-to-Head (H2H) match lookup against any community opponent with win/loss record and point totals.
  - Singles vs Doubles volume breakdown.
- **Team League Standings (`TeamLeagueStandings.tsx`)**:
  - Doubles Pairs ranking table with pair records, win rates, and point differentials.
  - Club Teams league standings with match points (3 for Win, 1 for Draw, 0 for Loss), game diff, point diff, and recent form dots.
  - Visual promotion zone (green border) and relegation zone (red border) cutoff lines.
- **Share & Export Tools**:
  - Story-ready vertical 9:16 PNG export card (`html-to-image`) formatted for Instagram and WhatsApp with community branding, date, and Top 5 leaderboard.
  - Full CSV export of active leaderboard rankings.
- **Comprehensive Vitest Suite (`RankingsDashboard.test.tsx`)**:
  - 8 tests covering category switching, time filters, drops sub-toggle, player modal, team league tabs, and CSV/PNG export handlers.

## [Ranking Phase 2] - Live Marking UI While Playing (apps/web)
### Added
- **Mini-Leaderboard Live Strip (`MiniLeaderboardStrip.tsx`)**:
  - High-contrast banner mounted directly on the live scoring screen.
  - Displays top 3 players in the active category with rank movement arrows (`▲`, `▼`, `−`), current score/points, and gold/silver/bronze medals (`🥇`, `🥈`, `🥉`).
  - Mandatory `Matches: N` indicators on every entry.
  - Interactive category switcher supporting Overall, Wins, Points, Drops, and Win %.
- **Quick-Mark Layer (`QuickMarkLayer.tsx`)**:
  - Fat-finger-friendly chips for Shot Types: Smash (`⚡`), Drop (`🪶`), Net (`🕸️`), Clear (`🏹`), Drive (`💨`), Lob (`🎯`).
  - Result attribution: Winner (`✓`) vs Unforced Error (`✗`) with player attribution chips.
  - Three configurable marking modes:
    - `FAST`: Pure scorekeeper, 0 extra taps.
    - `QUICK`: 3-second animated auto-dismiss chip row after each point (1 tap to tag, auto-skips if ignored).
    - `FULL`: Mandatory tagging drawer that stays until dismissed (for dedicated umpires/scorers).
- **Point Correction & Undo Modal (`PointEditModal.tsx`)**:
  - Review last 10 points with sequence numbers, winning side, shot type, and result.
  - Edit winner side, shot type, result, or player attribution with instant recalculation.
  - "Undo Very Last Point" and warning confirmation dialog before applying recomputations.
- **Community Match Setup (`CommunityMatchSetup.tsx`)**:
  - Roster picker filtering community players by name search.
  - Instant new player creation and quick-select chips for recent players.
  - Balanced Doubles Pair Suggestion algorithm: balances players by skill ratings to minimize rank differential between teams.
  - Integrated into main app navigation under `👥 Community`.
- **RTL & Store Unit Tests (`RankingUI.test.tsx`)**:
  - 8 comprehensive tests covering MiniLeaderboardStrip, QuickMarkLayer, PointEditModal, and CommunityMatchSetup with 100% pass rate.

## [Ranking Phase 1] - Data Model and Ranking Engine (@rallypoint/ranking)
### Added
- Created dedicated `@rallypoint/ranking` package (zero external dependencies) with 97.04% test coverage.
- Prisma schema extensions for community ranking and seasons:
  - `Season`: Active and historical league seasons.
  - `TeamType`: Added `FIXED_PAIR` alongside `CLUB_TEAM` and `SINGLES_ENTRY`.
  - `ShotType`: `SMASH`, `DROP`, `NET`, `CLEAR`, `DRIVE`, `LOB`, `SERVE`.
  - `RallyEndResult`: `WINNER`, `UNFORCED_ERROR`, `FORCED_ERROR`, `OUT`, `NET_FAULT`, `SERVICE_FAULT`.
  - Attributed rally events on `MatchEvent`: `shotType`, `rallyEndResult`, `pointWinnerPlayerId`, `errorPlayerId`.
  - `PlayerRankingSnapshot` & `TeamRankingSnapshot` models storing point-in-time leaderboard state and rank movements.
- Full player stats accumulator:
  - `matches_played`, `wins`, `losses`, `win_rate`, `points_scored`, `points_conceded`, `point_difference`, `games_won`, `games_lost`, `drop_shots_played`, `drop_shot_winners`, `drop_shot_errors`, `unforced_errors`, `smash_winners`, `longest_win_streak`, `current_form` (last 5 results).
- All 8 individual ranking leaderboards:
  1. `OVERALL`: Configurable weighted formula (40% win rate, 25% pt diff/match, 15% wins, 10% form, 10% consistency).
  2. `MOST_WINS`: Tiebreak = win rate > point difference > head-to-head > name.
  3. `MOST_POINTS`: Tiebreak = points per match > wins > win rate.
  4. `MOST_LOSSES`: Tiebreak = loss rate > points conceded.
  5. `MOST_DROPS_PLAYED`: Drop shots played.
  6. `MOST_DROPS_CONCEDED`: Points conceded / dropped.
  7. `MOST_UNFORCED_ERRORS`: Unforced error count ("who fails more" board).
  8. `BEST_WIN_RATE`: Filtered by configurable minimum matches threshold (default: 5).
- Shared rank tie handling: `1, 2, 2, 4` ranking assignment with explicit `Matches: N` indicators on every row.
- Rank movement indicators: `UP`, `DOWN`, `SAME` comparing against previous snapshots.
- Team ranking engine:
  - Auto-detection of doubles pairs with isolated pair statistics.
  - Leaderboards: `OVERALL_TEAM`, `MOST_TEAM_WINS`, `MOST_TEAM_LOSSES`, `BEST_TEAM_WIN_RATE`, `BEST_POINT_DIFFERENCE`.
- Event-sourced replay pipeline: `rebuildRankings(matches)` and CLI command `npm run rebuild-rankings`.

## [DB Phase 4] - Production Hardening, Performance & Operations
### Added
- Enterprise backup and disaster recovery suite:
  - `scripts/backup.sh`: Automated `pg_dump -Fc` with SHA256 checksums and 30-day retention pruning.
  - `scripts/restore.sh`: Safe `pg_restore` with integrity verification and clean drop options.
  - `scripts/archive_partitions.sh`: Cold storage partition detachment and archival script for aged match events.
- Row-Level Security (RLS) policies in `packages/db/src/rlsPolicies.sql`:
  - Granular player profile edit restrictions linked to session user ID.
  - Scorer and Umpire restricted append access on `match_events`.
- High-concurrency connection pooling configuration via PgBouncer in `packages/db/src/pgbouncer.ini` (transaction mode, 1,000 client capacity).
- Indexing and query performance audit suite with `EXPLAIN ANALYZE` benchmarks in `packages/db/src/performanceAudit.sql`.
- Comprehensive database architecture documentation, table dictionary, and operational runbook in `/docs/database.md`.
- End-to-end integration test suite (`packages/db/src/dbE2E.test.ts`) covering 16-player tournament lifecycle, concurrent live match scoring, idempotency, and soft-delete/purge workflows.

## [DB Phase 3] - Derived Analytics Layer & Rollup Tables
### Added
- Rollup database models: `PlayerCareerStats`, `HeadToHead`, `PlayerFormTrend`, `MatchAnalyticsRollup`.
- PL/pgSQL stored procedure `rebuild_player_stats(player_id)` in `packages/db/src/analyticsRollups.sql` for full career stats recalculation.
- Match completion trigger `trg_match_completed_rollups` automatically projecting player rollups when match transitions to `COMPLETED`.
- Pure TypeScript projection service in `packages/db/src/statsProjection.ts` (`calculateCareerStats`, `rebuildPlayerStats`).
- Unit test suite verifying exact career rollup calculations (matches, games, points, win rates, streaks) and upsert operations.

## [DB Phase 2] - Append-Only Event History & Partitioning
### Added
- Append-only database trigger specification and exception raising for `UPDATE` and `DELETE` on `match_events`.
- Declarative monthly partitioning procedures in `packages/db/src/partitioning.sql`:
  - `create_monthly_match_events_partition(date)` to create `match_events_YYYY_MM`.
  - `ensure_future_match_event_partitions(months_ahead)` to ensure future partition readiness.
- Idempotent event ingestion service (`packages/db/src/eventIngestion.ts`) with client UUID deduplication.
- Sequence number progression validation (`OutOfOrderSequenceError`) rejecting sequence gaps.
- Unit test suite verifying append, append-only exceptions, sequence validation, and idempotent batch ingestion.

## [DB Phase 1] - Core Schema and Master Data (@rallypoint/db)
### Added
- Created dedicated `@rallypoint/db` package in `packages/db` with Prisma ORM and TypeScript exports.
- PostgreSQL 16 3NF master data schema:
  - `User`: Unique email, bcrypt password hash, roles (`ADMIN`, `SCORER`, `UMPIRE`, `PLAYER`, `VIEWER`).
  - `Player`: Full biographical profiles, club association, dominant hand, external IDs (BWF ID), soft delete support (`deleted_at`).
  - `PlayerProfileHistory`: Point-in-time audit snapshots tracking player profile updates and modifications.
  - `Club`: Badminton clubs and academies with city, branding, and player rosters.
  - `Team` & `TeamMember`: Singles entries, doubles pairs, and club teams with active membership constraints.
  - `Venue` & `Court`: Multicourt facility management with coordinates and certified surface specifications.
  - `Tournament`: Knockout and Round-Robin configurations mapped to venue and age/gender categories.
- Service hooks: `updatePlayerWithAudit` and `softDeletePlayer`.
- Comprehensive seed script in `packages/db/src/seed.ts` featuring international players, clubs, and venues.
- Database architecture documentation in `/docs/database.md`.
- Unit and integration tests for master data updates, soft deletes, and history snapshots.

## [Phase 5] - Tournaments, PWA, and Production Polish
### Added
- **Tournament Manager Engine** (`apps/web/src/tournaments/tournamentEngine.ts`):
  - Knockout single-elimination bracket generator with byes and seeded pairings.
  - Round-robin schedule generator.
  - BWF tiebreaker standings (Matches won > Head-to-Head > Game differential > Point differential).
  - Multi-court allocation and scheduling.
- **Tournament Management UI** (`apps/web/src/components/tournaments/TournamentManager.tsx`):
  - Interactive bracket and round-robin view with inline winner recording and real-time standings recalculation.
- **Progressive Web App (PWA)**:
  - Web App Manifest (`apps/web/public/manifest.json`) and service worker registration (`serviceWorkerRegistration.ts`).
  - Cache-first Service Worker (`apps/web/public/sw.js`) for full offline scoring.
  - Crash recovery `ErrorBoundary` component (`apps/web/src/components/ErrorBoundary.tsx`).
- **DevOps & Production Infrastructure**:
  - Structured JSON logging module with request duration tracing (`apps/api/src/utils/logger.ts`).
  - Multi-stage Dockerfiles: `Dockerfile.api` and `Dockerfile.web`.
  - Comprehensive `docker-compose.yml` orchestrating PostgreSQL, pgAdmin, API, and Web.
  - GitHub Actions CI workflow (`.github/workflows/ci.yml`) testing, typechecking, and building on push/PR.
  - Deployment configuration for Vercel SPA (`apps/web/vercel.json`) and Render blueprint (`render.yaml`).
  - Rollup chunk splitting optimization separating vendor, charts, and export modules.
  - Unit test suite for tournament engine and tournament UI components.

## [Phase 4] - Backend, Auth, and Live Sync (apps/api)
### Added
- Node.js + Express + TypeScript API server with Socket.IO and Prisma ORM in `apps/api`.
- Comprehensive Prisma schema with PostgreSQL 16 models for User, Player, Match, MatchEvent, Tournament, Venue, and Clubs.
- Multi-role JWT authentication (Access & Refresh tokens) with bcrypt password hashing.
- Role-based authorization middleware supporting `ADMIN`, `SCORER`, `UMPIRE`, `PLAYER`, `VIEWER`.
- Idempotent offline event synchronization endpoint (`POST /api/matches/:id/events/sync`) resolving ordering conflicts.
- Real-time Socket.IO match rooms broadcasting live score updates and spectator counts.
- Public read-only live scoreboard endpoint (`/api/matches/:id/live`) for big-screen displays.
- OpenAPI 3.0 / Swagger UI documentation at `/api/docs`.
- Docker Compose configuration for local PostgreSQL and pgAdmin.
- Supertest integration test suite covering auth, match creation, event sync, live scoreboard, and player queries.

## [Phase 3] - Analytics and Insights
### Added
- Interactive analytics dashboard using Recharts in `apps/web/src/components/analytics`.
- Momentum chart visualizing rally-by-rally point differential and lead swings.
- Markov chain win-probability curve predicting game and match win likelihood from any score.
- Score progression chart tracking cumulative score development.
- Pressure points tracker evaluating conversion efficiency at scores 18+.
- Serve vs receive conversion rate analysis.
- Shot-type distribution and error breakdown from rally tags.
- Player profiles with head-to-head match histories and last-10-matches form trends.
- Story-ready branded scorecard export as PNG (`html-to-image`) for Instagram and WhatsApp.
- Standard match CSV export and structured JSON export.
- Comprehensive unit tests for Markov model, export utilities, and analytics dashboard.

## [Phase 2] - Web App Core (apps/web)
### Added
- React 18 + Vite + TypeScript web application with Tailwind CSS in `apps/web`.
- Event-sourced Zustand store (`useMatchStore`) integrating `@rallypoint/engine`.
- Mobile-first, one-hand friendly live scoring view with giant tap targets.
- Interactive Court View displaying service courts, player positions, and shuttlecock indicator.
- Side-swap visual cues when court ends switch.
- Haptic feedback integration on button interactions and undos.
- Optional rally-end tagging modal (Smash, Drop, Net, Out, Unforced Error, Service Fault).
- Point-by-point live match log drawer.
- Game and match summary screen with score breakdown and statistics.
- IndexedDB local persistence via Dexie (`RallyPointDB`) with crash recovery.
- Dark/Light themes, large-text mode, `aria-live` score announcements, and keyboard shortcuts.
- Vitest unit tests and Playwright e2e match lifecycle specification.

## [Phase 1] - Pure BWF Scoring Engine (@rallypoint/engine)
### Added
- Pure TypeScript BWF rules and scoring engine in `packages/engine`.
- Event-sourced architecture with immutable state transitions (`createMatch`, `applyEvent`, `replay`).
- Full support for singles and doubles service court parity and rotation logic.
- Side change mechanics after each game and at 11 points in deciding games.
- Full event lifecycle: `POINT`, `UNDO`, `GAME_END`, `MATCH_END`, `SERVE_FAULT`, `RETIRE`, `WALKOVER`, `INTERVAL`.
- Accurate derived analytics: longest streaks, lead changes, comeback deficits, serve/receive win rates, momentum series, shot distribution.
- 99.8% unit test coverage including property-based testing (`fast-check`) validating replay equivalence.

## [Initial Setup]
- Initialized monorepo workspace.
- Configured git repository with `.gitignore`.
