# Changelog

All notable changes to the RallyPoint project will be documented in this file.

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
