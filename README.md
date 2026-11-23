# RallyPoint

> Advanced Badminton Point-Tracking Web Application (PWA) built with Event-Sourced architecture.

## Overview
RallyPoint is a tournament-grade badminton point tracking and analytics application adhering strictly to Badminton World Federation (BWF) regulations.

## Monorepo Structure
- `packages/engine`: Pure TypeScript BWF rules and event-sourced scoring engine (zero runtime dependencies).
- `apps/web`: React 18 + Vite + Tailwind CSS + Zustand + Recharts + Dexie PWA.
- `apps/api`: Node.js + Express + TypeScript + Prisma + PostgreSQL + Socket.IO.

## Getting Started
See respective package documentation for setup and build instructions.
