import { beforeEach, describe, expect, it } from 'vitest';
import { useMatchStore } from './matchStore.js';
import type { MatchConfig } from '@rallypoint/engine';
import { db } from '../db/index.js';

const testConfig: MatchConfig = {
  id: 'test-match-1',
  mode: 'singles',
  bestOf: 3,
  pointsToWinGame: 21,
  tiebreakCap: 30,
  sideA: { id: 'sa', name: 'Viktor', playerIds: ['v1'] },
  sideB: { id: 'sb', name: 'Lee', playerIds: ['l1'] },
  initialServerSide: 'A',
  initialServerPlayerId: 'v1',
};

describe('MatchStore', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();
  });

  it('starts match and saves initial state in IndexedDB', async () => {
    await useMatchStore.getState().startMatch(testConfig, false);

    const state = useMatchStore.getState();
    expect(state.match).not.toBeNull();
    expect(state.match?.config.id).toBe('test-match-1');
    expect(state.match?.currentScoreA).toBe(0);
    expect(state.match?.currentScoreB).toBe(0);

    const saved = await db.matches.get('test-match-1');
    expect(saved).toBeDefined();
    expect(saved?.state.currentScoreA).toBe(0);
  });

  it('records points and updates score, haptics, and announcements', async () => {
    await useMatchStore.getState().startMatch(testConfig, false);

    await useMatchStore.getState().recordPoint('A', 'SMASH');
    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);
    expect(useMatchStore.getState().events.length).toBe(1);

    await useMatchStore.getState().recordPoint('B', 'DROP');
    expect(useMatchStore.getState().match?.currentScoreB).toBe(1);
    expect(useMatchStore.getState().events.length).toBe(2);
  });

  it('undoes a point cleanly', async () => {
    await useMatchStore.getState().startMatch(testConfig, false);
    await useMatchStore.getState().recordPoint('A');
    await useMatchStore.getState().recordPoint('A');
    expect(useMatchStore.getState().match?.currentScoreA).toBe(2);

    await useMatchStore.getState().undo();
    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);
    expect(useMatchStore.getState().events.length).toBe(1);
  });

  it('handles service fault', async () => {
    await useMatchStore.getState().startMatch(testConfig, false);
    await useMatchStore.getState().recordServeFault('A');

    expect(useMatchStore.getState().match?.currentScoreB).toBe(1);
    expect(useMatchStore.getState().match?.serveState.serverSide).toBe('B');
  });

  it('resumes unfinished match from IndexedDB', async () => {
    await useMatchStore.getState().startMatch(testConfig, false);
    await useMatchStore.getState().recordPoint('A');
    await useMatchStore.getState().recordPoint('A');

    // Simulate page reload by resetting store
    useMatchStore.getState().resetMatch();
    expect(useMatchStore.getState().match).toBeNull();

    const resumed = await useMatchStore.getState().resumeLastMatch();
    expect(resumed).toBe(true);
    expect(useMatchStore.getState().match?.currentScoreA).toBe(2);
  });

  it('toggles theme and large text mode', () => {
    expect(useMatchStore.getState().theme).toBe('dark');
    useMatchStore.getState().toggleTheme();
    expect(useMatchStore.getState().theme).toBe('light');

    expect(useMatchStore.getState().largeTextMode).toBe(false);
    useMatchStore.getState().toggleLargeText();
    expect(useMatchStore.getState().largeTextMode).toBe(true);
  });
});
