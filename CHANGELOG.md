# Changelog

All notable changes to the RallyPoint project will be documented in this file.

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
