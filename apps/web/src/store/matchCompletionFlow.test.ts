import { describe, expect, it, beforeEach } from 'vitest';
import { useMatchStore } from './matchStore.js';
import { useRankingStore } from './rankingStore.js';

describe('Match Completion -> Live Rankings & Player Names Flow', () => {
  beforeEach(() => {
    useMatchStore.getState().resetMatch();
    useRankingStore.getState().resetAllData();
  });

  it('automatically updates live rankings with real player names on match completion and is idempotent on Done', async () => {
    const anu = useRankingStore.getState().addCommunityPlayer('Anu');
    const vikram = useRankingStore.getState().addCommunityPlayer('Vikram');
    const rahul = useRankingStore.getState().addCommunityPlayer('Rahul');
    const deepa = useRankingStore.getState().addCommunityPlayer('Deepa');

    await useMatchStore.getState().startMatch({
      id: 'm-flow-1',
      mode: 'doubles',
      bestOf: 1,
      pointsToWinGame: 11,
      tiebreakCap: 20,
      scoringFormat: 'RALLY_11',
      sideA: {
        id: 'sa',
        name: 'Anu & Vikram',
        playerIds: [anu.id, vikram.id],
        playerNames: ['Anu', 'Vikram'],
      },
      sideB: {
        id: 'sb',
        name: 'Rahul & Deepa',
        playerIds: [rahul.id, deepa.id],
        playerNames: ['Rahul', 'Deepa'],
      },
      initialServerSide: 'A',
      initialServerPlayerId: anu.id,
      shutout: { enabled: true, target: 7, effect: 'MATCH', applyInDecider: true },
    });

    for (let i = 0; i < 6; i++) {
      await useMatchStore.getState().recordPlayerAction(anu.id, 'POINT');
    }
    await useMatchStore.getState().recordPlayerAction(vikram.id, 'POINT', {
      attributedDropPlayerIds: [rahul.id, deepa.id],
      isBothFault: true,
    });

    expect(useMatchStore.getState().match?.status).toBe('COMPLETED');

    // Rankings updated immediately with real names and 0.5 shared faults
    const rState = useRankingStore.getState();
    expect(rState.matches).toHaveLength(1);
    expect(rState.playerLeaderboards.OVERALL).toHaveLength(4);
    expect(rState.playerLeaderboards.OVERALL.every((e) => !e.name.startsWith('cp-'))).toBe(true);

    const rahulEntry = rState.playerLeaderboards.OVERALL.find((e) => e.id === rahul.id);
    expect(rahulEntry?.stats.drops).toBe(0.5);
    expect(rahulEntry?.stats.sharedFaults).toBe(0.5);

    // Calling finalizeMatchToRankings again (simulating Done button) is idempotent
    useMatchStore.getState().finalizeMatchToRankings();
    expect(useRankingStore.getState().matches).toHaveLength(1);
  });
});
