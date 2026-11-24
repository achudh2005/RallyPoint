import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { db, StoredMatch, CachedRankingSnapshot, QueuedOfflineEvent } from './index.js';
import type { PlayerActionEvent, MatchState } from '@rallypoint/scoring-rules';

export interface IMobileStorage {
  init(): Promise<void>;
  saveMatch(match: StoredMatch): Promise<void>;
  getMatch(id: string): Promise<StoredMatch | undefined>;
  getAllMatches(): Promise<StoredMatch[]>;
  recordActionLocally(matchId: string, actionEvent: PlayerActionEvent, nextState: MatchState): Promise<void>;
  queueOfflineEvent(event: QueuedOfflineEvent): Promise<void>;
  getPendingEvents(): Promise<QueuedOfflineEvent[]>;
  markEventsSynced(ids: string[]): Promise<void>;
  saveRankings(snapshot: CachedRankingSnapshot): Promise<void>;
  getRankings(id: string): Promise<CachedRankingSnapshot | undefined>;
  migrateFromLegacyIndexedDB(): Promise<{ migratedMatches: number }>;
}

export class DexieStorage implements IMobileStorage {
  async init(): Promise<void> {
    await db.open();
  }

  async saveMatch(match: StoredMatch): Promise<void> {
    await db.matches.put(match);
  }

  async getMatch(id: string): Promise<StoredMatch | undefined> {
    return db.matches.get(id);
  }

  async getAllMatches(): Promise<StoredMatch[]> {
    return db.matches.toArray();
  }

  async recordActionLocally(
    matchId: string,
    actionEvent: PlayerActionEvent,
    nextState: MatchState
  ): Promise<void> {
    const existing = await db.matches.get(matchId);
    if (existing) {
      existing.state = nextState as any;
      existing.events = [...existing.events, actionEvent as any];
      existing.updatedAt = Date.now();
      existing.completed = nextState.status === 'COMPLETED';
      await db.matches.put(existing);
    }

    await this.queueOfflineEvent({
      id: actionEvent.clientUuid || actionEvent.id,
      matchId,
      event: actionEvent,
      queuedAt: Date.now(),
      synced: false,
    });
  }

  async queueOfflineEvent(event: QueuedOfflineEvent): Promise<void> {
    await db.offlineEventQueue.put(event);
  }

  async getPendingEvents(): Promise<QueuedOfflineEvent[]> {
    return db.offlineEventQueue.filter((item) => !item.synced).toArray();
  }

  async markEventsSynced(ids: string[]): Promise<void> {
    await db.transaction('rw', db.offlineEventQueue, async () => {
      for (const id of ids) {
        const item = await db.offlineEventQueue.get(id);
        if (item) {
          item.synced = true;
          await db.offlineEventQueue.put(item);
        }
      }
    });
  }

  async saveRankings(snapshot: CachedRankingSnapshot): Promise<void> {
    await db.rankings.put(snapshot);
  }

  async getRankings(id: string): Promise<CachedRankingSnapshot | undefined> {
    return db.rankings.get(id);
  }

  async migrateFromLegacyIndexedDB(): Promise<{ migratedMatches: number }> {
    let count = 0;
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        const req = indexedDB.open('rallypoint_db');
        const legacyDb = await new Promise<IDBDatabase | null>((resolve) => {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });

        if (legacyDb && legacyDb.objectStoreNames.contains('matches')) {
          const tx = legacyDb.transaction('matches', 'readonly');
          const store = tx.objectStore('matches');
          const allReq = store.getAll();
          const legacyMatches = await new Promise<any[]>((resolve) => {
            allReq.onsuccess = () => resolve(allReq.result || []);
            allReq.onerror = () => resolve([]);
          });

          for (const m of legacyMatches) {
            const exists = await db.matches.get(m.id);
            if (!exists) {
              await db.matches.put({
                id: m.id,
                config: m.config,
                state: m.state,
                events: m.events || [],
                updatedAt: m.updatedAt || Date.now(),
                completed: m.completed || false,
              });
              count++;
            }
          }
          legacyDb.close();
        }
      }
    } catch {
      // Ignore migration errors on unsupported envs
    }
    return { migratedMatches: count };
  }
}

export class SQLiteStorage implements IMobileStorage {
  private sqlite: SQLiteConnection;
  private dbConn: SQLiteDBConnection | null = null;
  private dexieFallback = new DexieStorage();

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async init(): Promise<void> {
    try {
      const isConsistent = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection('rallypoint_sqlite', false)).result;
      if (isConsistent.result && isConn) {
        this.dbConn = await this.sqlite.retrieveConnection('rallypoint_sqlite', false);
      } else {
        this.dbConn = await this.sqlite.createConnection(
          'rallypoint_sqlite',
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.dbConn.open();

      const schema = `
        CREATE TABLE IF NOT EXISTS matches (
          id TEXT PRIMARY KEY,
          config TEXT NOT NULL,
          state TEXT NOT NULL,
          events TEXT NOT NULL,
          updatedAt INTEGER NOT NULL,
          completed INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS offline_events (
          id TEXT PRIMARY KEY,
          matchId TEXT NOT NULL,
          event TEXT NOT NULL,
          queuedAt INTEGER NOT NULL,
          synced INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rankings (
          id TEXT PRIMARY KEY,
          snapshot TEXT NOT NULL
        );
      `;
      await this.dbConn.execute(schema);
    } catch {
      // Fallback to dexie if sqlite fails (e.g. web or test mock)
      this.dbConn = null;
      await this.dexieFallback.init();
    }
  }

  async saveMatch(match: StoredMatch): Promise<void> {
    if (!this.dbConn) return this.dexieFallback.saveMatch(match);
    const sql = `INSERT OR REPLACE INTO matches (id, config, state, events, updatedAt, completed) VALUES (?, ?, ?, ?, ?, ?)`;
    await this.dbConn.run(sql, [
      match.id,
      JSON.stringify(match.config),
      JSON.stringify(match.state),
      JSON.stringify(match.events),
      match.updatedAt,
      match.completed ? 1 : 0,
    ]);
  }

  async getMatch(id: string): Promise<StoredMatch | undefined> {
    if (!this.dbConn) return this.dexieFallback.getMatch(id);
    const res = await this.dbConn.query(`SELECT * FROM matches WHERE id = ?`, [id]);
    if (!res.values || res.values.length === 0) return undefined;
    const row = res.values[0];
    return {
      id: row.id,
      config: JSON.parse(row.config),
      state: JSON.parse(row.state),
      events: JSON.parse(row.events),
      updatedAt: row.updatedAt,
      completed: row.completed === 1,
    };
  }

  async getAllMatches(): Promise<StoredMatch[]> {
    if (!this.dbConn) return this.dexieFallback.getAllMatches();
    const res = await this.dbConn.query(`SELECT * FROM matches ORDER BY updatedAt DESC`);
    if (!res.values) return [];
    return res.values.map((row) => ({
      id: row.id,
      config: JSON.parse(row.config),
      state: JSON.parse(row.state),
      events: JSON.parse(row.events),
      updatedAt: row.updatedAt,
      completed: row.completed === 1,
    }));
  }

  async recordActionLocally(
    matchId: string,
    actionEvent: PlayerActionEvent,
    nextState: MatchState
  ): Promise<void> {
    if (!this.dbConn) {
      return this.dexieFallback.recordActionLocally(matchId, actionEvent, nextState);
    }
    const match = await this.getMatch(matchId);
    if (match) {
      match.state = nextState as any;
      match.events.push(actionEvent as any);
      match.updatedAt = Date.now();
      match.completed = nextState.status === 'COMPLETED';
      await this.saveMatch(match);
    }
    await this.queueOfflineEvent({
      id: actionEvent.clientUuid || actionEvent.id,
      matchId,
      event: actionEvent,
      queuedAt: Date.now(),
      synced: false,
    });
  }

  async queueOfflineEvent(event: QueuedOfflineEvent): Promise<void> {
    if (!this.dbConn) return this.dexieFallback.queueOfflineEvent(event);
    const sql = `INSERT OR REPLACE INTO offline_events (id, matchId, event, queuedAt, synced) VALUES (?, ?, ?, ?, ?)`;
    await this.dbConn.run(sql, [
      event.id,
      event.matchId,
      JSON.stringify(event.event),
      event.queuedAt,
      event.synced ? 1 : 0,
    ]);
  }

  async getPendingEvents(): Promise<QueuedOfflineEvent[]> {
    if (!this.dbConn) return this.dexieFallback.getPendingEvents();
    const res = await this.dbConn.query(`SELECT * FROM offline_events WHERE synced = 0`);
    if (!res.values) return [];
    return res.values.map((row) => ({
      id: row.id,
      matchId: row.matchId,
      event: JSON.parse(row.event),
      queuedAt: row.queuedAt,
      synced: false,
    }));
  }

  async markEventsSynced(ids: string[]): Promise<void> {
    if (!this.dbConn) return this.dexieFallback.markEventsSynced(ids);
    for (const id of ids) {
      await this.dbConn.run(`UPDATE offline_events SET synced = 1 WHERE id = ?`, [id]);
    }
  }

  async saveRankings(snapshot: CachedRankingSnapshot): Promise<void> {
    if (!this.dbConn) return this.dexieFallback.saveRankings(snapshot);
    await this.dbConn.run(`INSERT OR REPLACE INTO rankings (id, snapshot) VALUES (?, ?)`, [
      snapshot.id,
      JSON.stringify(snapshot),
    ]);
  }

  async getRankings(id: string): Promise<CachedRankingSnapshot | undefined> {
    if (!this.dbConn) return this.dexieFallback.getRankings(id);
    const res = await this.dbConn.query(`SELECT snapshot FROM rankings WHERE id = ?`, [id]);
    if (!res.values || res.values.length === 0) return undefined;
    return JSON.parse(res.values[0].snapshot);
  }

  async migrateFromLegacyIndexedDB(): Promise<{ migratedMatches: number }> {
    return this.dexieFallback.migrateFromLegacyIndexedDB();
  }
}

let storageInstance: IMobileStorage | null = null;

export function getMobileStorage(): IMobileStorage {
  if (!storageInstance) {
    if (Capacitor.isNativePlatform()) {
      storageInstance = new SQLiteStorage();
    } else {
      storageInstance = new DexieStorage();
    }
  }
  return storageInstance;
}
