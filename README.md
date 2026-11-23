# RallyPoint

> Advanced Badminton Point-Tracking Web Application (PWA) built with an Event-Sourced architecture.

## Overview
RallyPoint is a tournament-grade badminton point tracking and analytics application adhering strictly to Badminton World Federation (BWF) regulations.

## Monorepo Structure
- `packages/engine`: Pure TypeScript BWF rules and event-sourced scoring engine (zero runtime dependencies).
- `apps/web`: React 18 + Vite + Tailwind CSS + Zustand + Recharts + Dexie PWA.
- `apps/api`: Node.js + Express + TypeScript + Prisma + PostgreSQL + Socket.IO.
- `packages/db`: Shared Prisma client and repository access layer.

## Scoring Engine (`@rallypoint/engine`)
Implemented in **Phase 1**:
- Pure, immutable, event-sourced BWF scoring engine with zero external dependencies.
- Standard rally scoring to 21, win-by-2 deuce rule, and hard cap at 30 (29-29 next point wins).
- Complete Singles and Doubles serve court calculation:
  - Singles: Server score parity dictates serving court (even = right, odd = left).
  - Doubles: Tracks individual player positions across left/right service courts. Position swaps occur exclusively when the serving side wins a rally. Receivers stay in place.
- Side changes at game boundaries and at 11 points in deciding games.
- Full event sourcing with undo support across game boundaries via event replay.
- Rich derived stats: longest streak, lead changes, comeback deficits, serve vs receive point win rates, pressure points (score 18+), and shot breakdown.
- 99.8% statement coverage, 91.4% branch coverage, and `fast-check` property tests proving state equivalence between incremental event application and complete event stream replay.
