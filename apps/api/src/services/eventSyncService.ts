import type { MatchConfig, MatchEvent, MatchState } from '@rallypoint/engine';
import { createMatch, applyEvent } from '@rallypoint/engine';

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
