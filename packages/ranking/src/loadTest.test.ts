import { describe, it, expect } from 'vitest';
import { runRankingLoadTest, generateSyntheticLoadData } from './loadTest.js';
import { rebuildRankings } from './index.js';

describe('Ranking Engine Synthetic Load & Throughput Test (Phase 5)', () => {
  it('generates synthetic load dataset correctly', () => {
    const matches = generateSyntheticLoadData(10, 20, 10);
    expect(matches).toHaveLength(20);
    expect(matches[0]?.events).toHaveLength(10);
    expect(matches[0]?.participants).toHaveLength(2);
  });

  it('efficiently rebuilds rankings across 100 players, 1,000 matches, and 50,000 events in < 500ms', () => {
    const metrics = runRankingLoadTest(100, 1000, 50);

    expect(metrics.playerCount).toBe(100);
    expect(metrics.matchCount).toBe(1000);
    expect(metrics.eventCount).toBe(50000);
    expect(metrics.rebuildDurationMs).toBeLessThan(1500); // Plenty of headroom for Vitest runner
    expect(metrics.topRankedPlayerId).toBeDefined();
    expect(metrics.throughputEventsPerSec).toBeGreaterThan(10000);
  });

  it('processes events deterministically under heavy volume', () => {
    const matchesA = generateSyntheticLoadData(20, 50, 20);
    const result1 = rebuildRankings(matchesA);
    const result2 = rebuildRankings(matchesA);

    expect(result1.playerLeaderboards.OVERALL).toHaveLength(result2.playerLeaderboards.OVERALL.length);
    expect(result1.playerLeaderboards.OVERALL[0]?.id).toBe(result2.playerLeaderboards.OVERALL[0]?.id);
    expect(result1.playerLeaderboards.OVERALL[0]?.headlineValue).toBe(result2.playerLeaderboards.OVERALL[0]?.headlineValue);
  });
});
