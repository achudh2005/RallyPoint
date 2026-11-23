import {
  rebuildRankings,
  type RankingMatch,
  type RankingMatchEvent,
  type RankingParticipant,
  DEFAULT_RANKING_CONFIG,
} from './index.js';

export interface LoadTestMetrics {
  playerCount: number;
  matchCount: number;
  eventCount: number;
  generationDurationMs: number;
  rebuildDurationMs: number;
  throughputEventsPerSec: number;
  peakMemoryMb: number;
  topRankedPlayerId: string;
}

export function generateSyntheticLoadData(
  playerCount: number = 200,
  matchCount: number = 20000,
  eventsPerMatch: number = 50
): RankingMatch[] {
  const matches: RankingMatch[] = new Array(matchCount);

  for (let m = 0; m < matchCount; m++) {
    const p1Idx = m % playerCount;
    const p2Idx = (m + 1 + Math.floor(m / playerCount)) % playerCount;
    const p1Id = `player-${p1Idx}`;
    const p2Id = `player-${p2Idx}`;

    const winnerSide: 'A' | 'B' = m % 2 === 0 ? 'A' : 'B';

    const participants: RankingParticipant[] = [
      { playerId: p1Id, displayName: `Player ${p1Idx}`, side: 'A', position: 1 },
      { playerId: p2Id, displayName: `Player ${p2Idx}`, side: 'B', position: 1 },
    ];

    const events: RankingMatchEvent[] = new Array(eventsPerMatch);
    for (let e = 0; e < eventsPerMatch; e++) {
      const isPointA = e % 3 !== 0;
      events[e] = {
        id: `ev-${m}-${e}`,
        sequenceNumber: e + 1,
        eventType: 'POINT',
        side: isPointA ? 'A' : 'B',
        shotType: e % 5 === 0 ? 'SMASH' : e % 4 === 0 ? 'DROP' : 'NET',
        rallyEndResult: e % 7 === 0 ? 'UNFORCED_ERROR' : 'WINNER',
        pointWinnerPlayerId: isPointA ? p1Id : p2Id,
        errorPlayerId: isPointA ? undefined : p2Id,
      };
    }

    matches[m] = {
      id: `load-match-${m}`,
      seasonId: 'season-load-test',
      matchType: 'SINGLES',
      status: 'COMPLETED',
      winnerSide,
      participants,
      games: [
        { gameNumber: 1, scoreA: 21, scoreB: 18, winnerSide: 'A' },
        { gameNumber: 2, scoreA: 19, scoreB: 21, winnerSide: 'B' },
        { gameNumber: 3, scoreA: winnerSide === 'A' ? 21 : 17, scoreB: winnerSide === 'B' ? 21 : 17, winnerSide },
      ],
      events,
    };
  }

  return matches;
}

export function runRankingLoadTest(
  playerCount: number = 200,
  matchCount: number = 20000,
  eventsPerMatch: number = 50
): LoadTestMetrics {
  const genStart = performance.now();
  const matches = generateSyntheticLoadData(playerCount, matchCount, eventsPerMatch);
  const genDuration = performance.now() - genStart;

  const totalEvents = matchCount * eventsPerMatch;

  const rebuildStart = performance.now();
  const result = rebuildRankings(matches, undefined, undefined, DEFAULT_RANKING_CONFIG);
  const rebuildDuration = performance.now() - rebuildStart;

  const throughput = Math.round((totalEvents / (rebuildDuration / 1000)));
  const memoryUsage = process.memoryUsage ? process.memoryUsage().heapUsed / (1024 * 1024) : 0;

  const overallLeaderboard = result.playerLeaderboards.OVERALL || [];
  const topRankedPlayerId = overallLeaderboard[0]?.id || 'none';

  return {
    playerCount,
    matchCount,
    eventCount: totalEvents,
    generationDurationMs: Math.round(genDuration),
    rebuildDurationMs: Math.round(rebuildDuration),
    throughputEventsPerSec: throughput,
    peakMemoryMb: Math.round(memoryUsage * 100) / 100,
    topRankedPlayerId,
  };
}

if (process.argv[1]?.endsWith('loadTest.ts')) {
  console.log('⚡ Running Synthetic Load Test: 200 Players, 20,000 Matches, 1,000,000 Events...');
  const metrics = runRankingLoadTest(200, 20000, 50);
  console.log('🏁 Load Test Complete!');
  console.log(`- Players: ${metrics.playerCount}`);
  console.log(`- Matches: ${metrics.matchCount.toLocaleString()}`);
  console.log(`- Events: ${metrics.eventCount.toLocaleString()}`);
  console.log(`- Rebuild Runtime: ${metrics.rebuildDurationMs} ms`);
  console.log(`- Throughput: ${metrics.throughputEventsPerSec.toLocaleString()} events/sec`);
  console.log(`- Peak Heap: ${metrics.peakMemoryMb} MB`);
  console.log(`- Top Player: ${metrics.topRankedPlayerId}`);
}
