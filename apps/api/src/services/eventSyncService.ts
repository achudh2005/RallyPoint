import type { MatchConfig, MatchEvent, MatchState } from '@rallypoint/engine';
import { createMatch, applyEvent } from '@rallypoint/engine';
import { computeMatchAwards, type MatchAwardsResult } from '@rallypoint/ranking';
import { computeStreaks, type StreaksResult } from '@rallypoint/scoring-rules';

export interface SyncBatchResult {
  matchId: string;
  appliedCount: number;
  duplicateCount: number;
  state: MatchState;
  isCompleted: boolean;
}

// In-memory / transactional event cache for sync demonstration
const memoryEventStore = new Map<string, MatchEvent[]>();
const memoryMatchConfigs = new Map<string, MatchConfig>();

export function registerMatch(config: MatchConfig): MatchState {
  memoryMatchConfigs.set(config.id, config);
  memoryEventStore.set(config.id, []);
  return createMatch(config);
}

export function syncMatchEvents(
  matchId: string,
  incomingEvents: MatchEvent[]
): SyncBatchResult {
  const config = memoryMatchConfigs.get(matchId);
  if (!config) {
    throw new Error(`Match with id ${matchId} not found`);
  }

  const existingEvents = memoryEventStore.get(matchId) ?? [];
  const existingEventIds = new Set(existingEvents.map((e) => e.id));

  // Filter out duplicates (idempotence)
  const newEvents: MatchEvent[] = [];
  let duplicateCount = 0;

  for (const event of incomingEvents) {
    if (existingEventIds.has(event.id)) {
      duplicateCount++;
    } else {
      newEvents.push(event);
      existingEventIds.add(event.id);
    }
  }

  // Combine and sort events deterministically by timestamp
  const allEvents = [...existingEvents, ...newEvents].sort(
    (a, b) => a.timestamp - b.timestamp
  );
  memoryEventStore.set(matchId, allEvents);

  // Derive pure state by replaying from initial state
  let currentState = createMatch(config);
  for (const event of allEvents) {
    currentState = applyEvent(currentState, event);
  }

  return {
    matchId,
    appliedCount: newEvents.length,
    duplicateCount,
    state: currentState,
    isCompleted: currentState.status === 'COMPLETED',
  };
}

export function getMatchState(matchId: string): MatchState | null {
  const config = memoryMatchConfigs.get(matchId);
  if (!config) return null;

  const events = memoryEventStore.get(matchId) ?? [];
  let state = createMatch(config);
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}

export function getMatchEvents(matchId: string): MatchEvent[] {
  return memoryEventStore.get(matchId) ?? [];
}

export function getMatchAwards(matchId: string): MatchAwardsResult | null {
  const config = memoryMatchConfigs.get(matchId);
  if (!config) return null;
  const events = memoryEventStore.get(matchId) ?? [];
  const state = getMatchState(matchId);

  const participants = [
    ...config.sideA.playerIds.map((id, idx) => ({
      playerId: id,
      displayName: config.sideA.playerNames?.[idx] || id,
      side: 'A' as const,
    })),
    ...config.sideB.playerIds.map((id, idx) => ({
      playerId: id,
      displayName: config.sideB.playerNames?.[idx] || id,
      side: 'B' as const,
    })),
  ];

  return computeMatchAwards(events as any, undefined, {
    matchType: config.mode === 'doubles' ? 'DOUBLES' : 'SINGLES',
    scoringFormat: (events[0] as any)?.scoringFormat || 'RALLY_21',
    targetPoints: config.pointsToWinGame,
    winnerSide: state?.winnerSide,
    participants,
    bestOf: config.bestOf,
  });
}

export function getMatchStreaks(matchId: string): StreaksResult | null {
  const config = memoryMatchConfigs.get(matchId);
  if (!config) return null;
  const events = memoryEventStore.get(matchId) ?? [];

  return computeStreaks(events as any, {}, {
    getPlayerName: (id: string) => {
      const idxA = config.sideA.playerIds.indexOf(id);
      if (idxA !== -1) return config.sideA.playerNames?.[idxA] || id;
      const idxB = config.sideB.playerIds.indexOf(id);
      if (idxB !== -1) return config.sideB.playerNames?.[idxB] || id;
      return id;
    },
    getTeamName: (side: 'A' | 'B') => {
      return side === 'A' ? config.sideA.name : config.sideB.name;
    },
  });
}
