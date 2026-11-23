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

const db = new Dexie('RallyPointDB') as Dexie & {
  matches: EntityTable<StoredMatch, 'id'>;
};

db.version(1).stores({
  matches: 'id, updatedAt, completed',
});

export { db };
