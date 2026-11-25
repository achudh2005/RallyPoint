import { describe, expect, it, beforeEach } from 'vitest';
import { useRankingStore } from './rankingStore.js';
import type { RankingMatch } from '@rallypoint/ranking';

describe('Phase 1: Fresh Start & Player Management', () => {
  beforeEach(() => {
    useRankingStore.getState().resetAllData();
  });

  it('starts completely empty with Season 1 and zero demo players or matches', () => {
    const state = useRankingStore.getState();
    expect(state.activeSeason).toBe('Season 1');
    expect(state.communityPlayers).toHaveLength(0);
    expect(state.matches).toHaveLength(0);
    expect(state.playerLeaderboards.OVERALL).toHaveLength(0);
    expect(state.teamLeaderboards.OVERALL_TEAM || []).toHaveLength(0);
  });

  it('adds 12 players, validates duplicates, and supports bulk add', () => {
    const store = useRankingStore.getState();
    for (let i = 1; i <= 6; i++) {
      store.addCommunityPlayer(`Player ${i}`);
    }
    const bulk = store.bulkAddPlayers('Player 7\nPlayer 8\nPlayer 9\nPlayer 10\nPlayer 11\nPlayer 12\nPlayer 1');
    expect(bulk.added).toHaveLength(6);
    expect(bulk.skipped).toHaveLength(1);
    expect(useRankingStore.getState().communityPlayers).toHaveLength(12);
    expect(useRankingStore.getState().validatePlayerName('player 1')).toContain('already exists');
  });

  it('renames a player and propagates the new name to past matches and rankings', () => {
    const store = useRankingStore.getState();
    const anu = store.addCommunityPlayer('Anu');
    const rahul = store.addCommunityPlayer('Rahul');

    const match: RankingMatch = {
      id: 'm-rename-1',
      seasonId: 'Season 1',
      matchType: 'SINGLES',
      status: 'COMPLETED',
      winnerSide: 'A',
      participants: [
        { playerId: anu.id, displayName: anu.displayName, side: 'A', position: 1 },
        { playerId: rahul.id, displayName: rahul.displayName, side: 'B', position: 1 },
      ],
      games: [
        { gameNumber: 1, scoreA: 21, scoreB: 10, winnerSide: 'A' },
        { gameNumber: 2, scoreA: 21, scoreB: 12, winnerSide: 'A' },
      ],
      events: [
        { id: 'e1', sequenceNumber: 1, eventType: 'POINT', side: 'A', pointWinnerPlayerId: anu.id },
      ],
    };
    store.attachMatch(match);

    useRankingStore.getState().updateCommunityPlayer(anu.id, { displayName: 'Anu K' });
    const updated = useRankingStore.getState();
    expect(updated.matches[0]!.participants[0]!.displayName).toBe('Anu K');
    expect(updated.playerLeaderboards.OVERALL.some((e) => e.name === 'Anu K')).toBe(true);
    expect(updated.playerLeaderboards.OVERALL.some((e) => e.name === 'Anu')).toBe(false);
  });

  it('hard-deletes a player with 0 matches and supports undo', () => {
    const p = useRankingStore.getState().addCommunityPlayer('Solo Temp');
    const res = useRankingStore.getState().removeCommunityPlayer(p.id);
    expect(res.outcome).toBe('deleted');
    expect(useRankingStore.getState().communityPlayers).toHaveLength(0);

    if (res.outcome === 'deleted') {
      useRankingStore.getState().undoRemovePlayer({ player: res.player, wasHardDeleted: true });
    }
    expect(useRankingStore.getState().communityPlayers).toHaveLength(1);
  });

  it('blocks removing a player in a live match, and archives/hides/restores players with matches', () => {
    const anu = useRankingStore.getState().addCommunityPlayer('Anu');
    const rahul = useRankingStore.getState().addCommunityPlayer('Rahul');

    useRankingStore.getState().attachMatch({
      id: 'm-arch-1',
      seasonId: 'Season 1',
      matchType: 'SINGLES',
      status: 'COMPLETED',
      winnerSide: 'A',
      participants: [
        { playerId: anu.id, displayName: anu.displayName, side: 'A', position: 1 },
        { playerId: rahul.id, displayName: rahul.displayName, side: 'B', position: 1 },
      ],
      games: [
        { gameNumber: 1, scoreA: 21, scoreB: 15, winnerSide: 'A' },
        { gameNumber: 2, scoreA: 21, scoreB: 16, winnerSide: 'A' },
      ],
      events: [],
    });

    const blocked = useRankingStore
      .getState()
      .removeCommunityPlayer(rahul.id, { livePlayerIds: [rahul.id] });
    expect(blocked.outcome).toBe('blocked_live');

    const archived = useRankingStore.getState().removeCommunityPlayer(rahul.id, { mode: 'archive' });
    expect(archived.outcome).toBe('archived');
    expect(useRankingStore.getState().playerLeaderboards.OVERALL.some((e) => e.id === rahul.id)).toBe(true);

    const hidden = useRankingStore.getState().removeCommunityPlayer(rahul.id, { mode: 'hide' });
    expect(hidden.outcome).toBe('hidden');
    expect(useRankingStore.getState().playerLeaderboards.OVERALL.some((e) => e.id === rahul.id)).toBe(false);

    useRankingStore.getState().restoreCommunityPlayer(rahul.id);
    expect(useRankingStore.getState().playerLeaderboards.OVERALL.some((e) => e.id === rahul.id)).toBe(true);
  });

  it('detects similar names and merges duplicate players with full ranking recomputation', () => {
    const p1 = useRankingStore.getState().addCommunityPlayer('Anu');
    const p2 = useRankingStore.getState().addCommunityPlayer('Anu K');
    const rahul = useRankingStore.getState().addCommunityPlayer('Rahul');

    expect(useRankingStore.getState().findSimilarPlayers('Anu K', p2.id).map((p) => p.id)).toContain(p1.id);

    useRankingStore.getState().attachMatch({
      id: 'm-merge-1',
      seasonId: 'Season 1',
      matchType: 'SINGLES',
      status: 'COMPLETED',
      winnerSide: 'A',
      participants: [
        { playerId: p2.id, displayName: p2.displayName, side: 'A', position: 1 },
        { playerId: rahul.id, displayName: rahul.displayName, side: 'B', position: 1 },
      ],
      games: [
        { gameNumber: 1, scoreA: 21, scoreB: 10, winnerSide: 'A' },
        { gameNumber: 2, scoreA: 21, scoreB: 10, winnerSide: 'A' },
      ],
      events: [{ id: 'e1', sequenceNumber: 1, eventType: 'POINT', side: 'A', pointWinnerPlayerId: p2.id }],
    });

    useRankingStore.getState().mergePlayers(p2.id, p1.id);
    const after = useRankingStore.getState();
    expect(after.communityPlayers.some((p) => p.id === p2.id)).toBe(false);
    expect(after.matches[0]!.participants[0]!.playerId).toBe(p1.id);
    expect(after.playerLeaderboards.OVERALL.find((e) => e.id === p1.id)?.matchesPlayed).toBe(1);
  });
});
