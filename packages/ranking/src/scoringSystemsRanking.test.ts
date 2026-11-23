import { describe, it, expect } from 'vitest';
import {
  RankingMatch,
  RankingConfig,
  DEFAULT_RANKING_CONFIG,
} from './types.js';
import { computeAllPlayerStats, computeAllTeamStats } from './stats.js';
import {
  generatePlayerLeaderboard,
  generateTeamLeaderboard,
} from './rankingEngine.js';
import { rebuildRankings } from './rebuild.js';

describe('Scoring Systems Selection & Ranking Points (RP) Engine (Phase 1)', () => {
  const p1 = { playerId: 'p-viktor', displayName: 'Viktor Axelsen' };
  const p2 = { playerId: 'p-lee', displayName: 'Lee Zii Jia' };
  const p3 = { playerId: 'p-momota', displayName: 'Kento Momota' };
  const p4 = { playerId: 'p-shi', displayName: 'Shi Yuqi' };

  // Match A: Rally Point 21 (Viktor def. Lee 21-15, 21-17 -> Straight games 2-0)
  const rallyMatch: RankingMatch = {
    id: 'm-rally-1',
    scoringFormat: 'RALLY_21',
    matchType: 'SINGLES',
    participants: [
      { ...p1, side: 'A', position: 1, initialRank: 1 },
      { ...p2, side: 'B', position: 1, initialRank: 2 },
    ],
    winnerSide: 'A',
    status: 'COMPLETED',
    games: [
      { gameNumber: 1, scoreA: 21, scoreB: 15, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 21, scoreB: 17, winnerSide: 'A' },
    ],
    events: [
      { id: 'ev-r-1', sequenceNumber: 1, eventType: 'POINT', side: 'A', serverPlayerId: 'p-viktor', pointWinnerPlayerId: 'p-viktor' },
      { id: 'ev-r-2', sequenceNumber: 2, eventType: 'POINT', side: 'A', serverPlayerId: 'p-viktor', pointWinnerPlayerId: 'p-viktor' },
      { id: 'ev-r-3', sequenceNumber: 3, eventType: 'POINT', side: 'B', serverPlayerId: 'p-viktor', pointWinnerPlayerId: 'p-lee' }, // Point on receive
    ],
  };

  // Match B: Service Point 15 (Momota def. Shi 17-14, 15-10 -> Setting game in Game 1)
  const serviceMatch: RankingMatch = {
    id: 'm-service-1',
    scoringFormat: 'SERVICE_POINT_15',
    matchType: 'SINGLES',
    isSettingGame: true,
    participants: [
      { ...p3, side: 'A', position: 1, initialRank: 4 }, // Lower initial rank
      { ...p4, side: 'B', position: 1, initialRank: 3 }, // Higher initial rank -> Momota is Giant Killer!
    ],
    winnerSide: 'A',
    status: 'COMPLETED',
    games: [
      { gameNumber: 1, scoreA: 17, scoreB: 14, winnerSide: 'A', isSettingGame: true },
      { gameNumber: 2, scoreA: 15, scoreB: 10, winnerSide: 'A' },
    ],
    events: [
      // Service Point: Momota serves and wins point
      { id: 'ev-s-1', sequenceNumber: 1, eventType: 'POINT', side: 'A', isPoint: true, serverPlayerId: 'p-momota', pointWinnerPlayerId: 'p-momota' },
      // Side out: Shi wins receiving rally (break)
      { id: 'ev-s-2', sequenceNumber: 2, eventType: 'SIDE_OUT', side: 'B', isSideOut: true, serverPlayerId: 'p-momota', pointWinnerPlayerId: 'p-shi' },
    ],
  };

  // Match C: Doubles Service Point 15
  const doublesServiceMatch: RankingMatch = {
    id: 'm-doubles-service-1',
    scoringFormat: 'SERVICE_POINT_15',
    matchType: 'DOUBLES',
    participants: [
      { ...p1, side: 'A', position: 1 },
      { ...p3, side: 'A', position: 2 },
      { ...p2, side: 'B', position: 1 },
      { ...p4, side: 'B', position: 2 },
    ],
    winnerSide: 'A',
    status: 'COMPLETED',
    games: [
      { gameNumber: 1, scoreA: 15, scoreB: 12, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 15, scoreB: 11, winnerSide: 'A' },
    ],
    events: [],
  };

  it('correctly awards Ranking Points (RP) with straight games, giant killer, and setting bonuses', () => {
    const statsMap = computeAllPlayerStats([rallyMatch, serviceMatch]);

    // Viktor won Rally match 2-0:
    // Base Win = 3 RP, Straight Games (2-0) = +1 RP -> Total 4 RP
    expect(statsMap['p-viktor']!.rankingPoints).toBe(4);

    // Lee lost Rally match:
    // Loss Participation = 1 RP -> Total 1 RP
    expect(statsMap['p-lee']!.rankingPoints).toBe(1);

    // Momota won Service match 2-0 with Setting Game AND Giant Killer (rank 4 beat rank 3):
    // Base Win = 3 RP, Straight Games = +1 RP, Giant Killer = +1 RP, Setting Win = +1 RP -> Total 6 RP
    expect(statsMap['p-momota']!.rankingPoints).toBe(6);

    // Shi lost Service match:
    // Loss Participation = 1 RP
    expect(statsMap['p-shi']!.rankingPoints).toBe(1);
  });

  it('applies custom format multipliers to Ranking Points', () => {
    const customConfig: RankingConfig = {
      ...DEFAULT_RANKING_CONFIG,
      serviceMultiplier: 1.5, // 1.5x RP for traditional service point matches
    };

    const statsMap = computeAllPlayerStats([serviceMatch], customConfig);
    // Momota earned 6 base RP * 1.5 multiplier = 9 RP!
    expect(statsMap['p-momota']!.rankingPoints).toBe(9);
  });

  it('filters stats and leaderboards by scoring system (ALL, RALLY, SERVICE)', () => {
    // 1. Filter: RALLY
    const rallyStats = computeAllPlayerStats([rallyMatch, serviceMatch], DEFAULT_RANKING_CONFIG, 'RALLY');
    expect(rallyStats['p-viktor']!.matchesPlayed).toBe(1);
    expect(rallyStats['p-momota']).toBeUndefined(); // Momota only played service match

    // 2. Filter: SERVICE
    const serviceStats = computeAllPlayerStats([rallyMatch, serviceMatch], DEFAULT_RANKING_CONFIG, 'SERVICE');
    expect(serviceStats['p-momota']!.matchesPlayed).toBe(1);
    expect(serviceStats['p-viktor']).toBeUndefined();

    // 3. Filter: ALL (Combined)
    const allStats = computeAllPlayerStats([rallyMatch, serviceMatch], DEFAULT_RANKING_CONFIG, 'ALL');
    expect(allStats['p-viktor']!.matchesPlayed).toBe(1);
    expect(allStats['p-momota']!.matchesPlayed).toBe(1);
    expect(allStats['p-viktor']!.matchesSplitFormatted).toBe('R:1 S:0');
    expect(allStats['p-momota']!.matchesSplitFormatted).toBe('R:0 S:1');
  });

  it('generates the LEAGUE_TABLE (Ranking Points RP) leaderboard', () => {
    const statsMap = computeAllPlayerStats([rallyMatch, serviceMatch]);
    const leagueTable = generatePlayerLeaderboard(Object.values(statsMap), 'LEAGUE_TABLE');

    // Momota has 6 RP, Viktor has 4 RP, Shi & Lee have 1 RP
    expect(leagueTable[0].id).toBe('p-momota');
    expect(leagueTable[0].headlineValue).toBe(6);
    expect(leagueTable[0].headlineFormatted).toBe('6 RP');

    expect(leagueTable[1].id).toBe('p-viktor');
    expect(leagueTable[1].headlineValue).toBe(4);
    expect(leagueTable[1].headlineFormatted).toBe('4 RP');
  });

  it('generates the BEST_SERVICE_GAME leaderboard tracking service holds and side-outs won', () => {
    const statsMap = computeAllPlayerStats([serviceMatch]);
    const serviceBoard = generatePlayerLeaderboard(Object.values(statsMap), 'BEST_SERVICE_GAME');

    // Momota had 1 service hold
    expect(serviceBoard[0].id).toBe('p-momota');
    expect(serviceBoard[0].headlineValue).toBe(1);
    expect(serviceBoard[0].headlineFormatted).toBe('1 Holds');

    // Shi had 1 side out won (break)
    expect(statsMap['p-shi']!.sideOutsWon).toBe(1);
  });

  it('normalizes MOST_POINTS using pointSharePct when scoring format filter is ALL', () => {
    // Viktor scored 42 points in 21-pt match (42 / 74 = 56.76% share)
    // Momota scored 32 points in 15-pt match (32 / 56 = 57.14% share)
    // Because Momota won higher share of points in his game, he leads MOST_POINTS in ALL format!
    const statsMap = computeAllPlayerStats([rallyMatch, serviceMatch]);
    const pointsBoard = generatePlayerLeaderboard(Object.values(statsMap), 'MOST_POINTS', {}, undefined, 'ALL');

    expect(pointsBoard[0].id).toBe('p-momota');
    expect(pointsBoard[0].stats.pointSharePct).toBeGreaterThan(pointsBoard[1].stats.pointSharePct);
  });

  it('awards full RP to both partners in doubles and credits team separately', () => {
    const playerStats = computeAllPlayerStats([doublesServiceMatch]);
    const teamStats = computeAllTeamStats([doublesServiceMatch]);

    // Both Viktor and Momota get the win RP (3 base + 1 straight games = 4 RP)
    expect(playerStats['p-viktor']!.rankingPoints).toBe(4);
    expect(playerStats['p-momota']!.rankingPoints).toBe(4);

    // The doubles pair also earns 4 RP
    const pairId = 'pair_p-momota_p-viktor';
    expect(teamStats[pairId]).toBeDefined();
    expect(teamStats[pairId]!.rankingPoints).toBe(4);

    const teamLeagueTable = generateTeamLeaderboard(Object.values(teamStats), 'TEAM_LEAGUE_TABLE');
    expect(teamLeagueTable[0].id).toBe(pairId);
    expect(teamLeagueTable[0].headlineFormatted).toBe('4 RP');
  });

  it('verifies rebuildRankings pipeline with scoring format and config', () => {
    const result = rebuildRankings([rallyMatch, serviceMatch], {}, {}, DEFAULT_RANKING_CONFIG, 'ALL');

    expect(result.playerLeaderboards.LEAGUE_TABLE).toBeDefined();
    expect(result.playerLeaderboards.BEST_SERVICE_GAME).toBeDefined();
    expect(result.teamLeaderboards.TEAM_LEAGUE_TABLE).toBeDefined();
    expect(result.playerLeaderboards.LEAGUE_TABLE[0].matchesSplitFormatted).toBeDefined();
  });
});
