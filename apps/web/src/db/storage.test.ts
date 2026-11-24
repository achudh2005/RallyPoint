import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { DexieStorage } from './storage.js';
import { db } from './index.js';
import type { PlayerActionEvent, MatchState } from '@rallypoint/scoring-rules';

describe('Mobile Storage Interface (Dexie & Offline Queue)', () => {
  let storage: DexieStorage;

  beforeEach(async () => {
    await db.delete();
    await db.open();
    storage = new DexieStorage();
    await storage.init();
  });

  it('records action locally and enqueues offline event', async () => {
    const mockMatch = {
      id: 'm-test-1',
      config: { id: 'm-test-1' } as any,
      state: { status: 'IN_PROGRESS' } as any,
      events: [],
      updatedAt: Date.now(),
      completed: false,
    };
    await storage.saveMatch(mockMatch);

    const actionEvent: PlayerActionEvent = {
      id: 'act-101',
      clientUuid: 'act-101',
      type: 'PLAYER_ACTION',
      sequenceNumber: 1,
      timestamp: Date.now(),
      matchId: 'm-test-1',
      gameNumber: 1,
      playerId: 'p1',
      side: 'A',
      action: 'POINT',
      resultingWinnerSide: 'A',
      serverAtRally: 'p1',
      servingSideAtRally: 'A',
      isPoint: true,
      isSideOut: false,
      scoringFormat: 'RALLY_21',
      occurredAt: new Date().toISOString(),
    };

    const nextState: Partial<MatchState> = {
      status: 'IN_PROGRESS',
      currentGameNumber: 1,
      events: [actionEvent],
    };

    await storage.recordActionLocally('m-test-1', actionEvent, nextState as MatchState);

    const match = await storage.getMatch('m-test-1');
    expect(match).toBeDefined();
    expect(match!.events.length).toBe(1);

    const pending = await storage.getPendingEvents();
    expect(pending.length).toBe(1);
    expect(pending[0]!.id).toBe('act-101');
    expect(pending[0]!.synced).toBe(false);

    // Mark synced
    await storage.markEventsSynced(['act-101']);
    const remainingPending = await storage.getPendingEvents();
    expect(remainingPending.length).toBe(0);
  });

  it('caches rankings and retrieves them', async () => {
    await storage.saveRankings({
      id: 'SNAPSHOT-OVERALL',
      category: 'OVERALL',
      timestamp: 12345678,
      formattedDate: '2026-11-25',
      leaderboards: { TOP_POINT_SCORERS: [{ rank: 1, name: 'Viktor' }] },
    });

    const cached = await storage.getRankings('SNAPSHOT-OVERALL');
    expect(cached).toBeDefined();
    expect(cached!.category).toBe('OVERALL');
    expect(cached!.leaderboards).toHaveProperty('TOP_POINT_SCORERS');
  });
});
