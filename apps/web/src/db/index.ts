import Dexie, { type EntityTable } from 'dexie';
import type { MatchConfig, MatchEvent, MatchState } from '@rallypoint/engine';

export interface StoredMatch {
  id: string;
  config: MatchConfig;
  state: MatchState;
  events: MatchEvent[];
  updatedAt: number;
  completed: boolean;
}

export interface CachedRankingSnapshot {
  id: string; // e.g. "SNAPSHOT-OVERALL" or "SNAPSHOT-ALL"
  seasonId?: string;
  category: string;
  timestamp: number;
  formattedDate: string;
  leaderboards: Record<string, unknown>;
  teamLeaderboards?: Record<string, unknown>;
}

export interface QueuedOfflineEvent {
  id: string;
  matchId: string;
  event: unknown;
  queuedAt: number;
  synced: boolean;
}

const db = new Dexie('RallyPointDB') as Dexie & {
  matches: EntityTable<StoredMatch, 'id'>;
  rankings: EntityTable<CachedRankingSnapshot, 'id'>;
  offlineEventQueue: EntityTable<QueuedOfflineEvent, 'id'>;
};

db.version(1).stores({
  matches: 'id, updatedAt, completed',
});

db.version(2).stores({
  matches: 'id, updatedAt, completed',
  rankings: 'id, category, timestamp',
  offlineEventQueue: 'id, matchId, queuedAt, synced',
});

export { db };
