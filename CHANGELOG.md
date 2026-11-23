# Changelog

All notable changes to the RallyPoint project will be documented in this file.

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
