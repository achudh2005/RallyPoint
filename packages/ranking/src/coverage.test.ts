import { describe, it, expect, vi } from 'vitest';
import * as PublicApi from './index.js';
import {
  RankingMatch,
  DEFAULT_RANKING_WEIGHTS,
} from './types.js';
import {
  computeAllPlayerStats,
  computeAllTeamStats,
  initializePlayerStats,
  initializeTeamStats,
} from './stats.js';
import {
  generatePlayerLeaderboard,
  generateTeamLeaderboard,
} from './rankingEngine.js';
import { runRebuildCli } from './cli.js';

describe('Ranking Engine Comprehensive Coverage', () => {
  it('initializes default player and team stats', () => {
    const p = initializePlayerStats('p-default');
    expect(p.displayName).toBe('p-default');
    expect(p.matchesPlayed).toBe(0);

    const t = initializeTeamStats('t-1', 'Team 1', 'CLUB_TEAM', ['p1', 'p2']);
    expect(t.name).toBe('Team 1');
    expect(t.type).toBe('CLUB_TEAM');
  });

  it('covers all leaderboard categories and tiebreakers', () => {
    const statsList = [
      {
        ...initializePlayerStats('p1', 'Alice'),
        matchesPlayed: 10,
        wins: 8,
        losses: 2,
        winRate: 80,
        pointsScored: 210,
        pointsConceded: 150,
        pointDifference: 60,
        dropShotsPlayed: 15,
        dropShotWinners: 10,
        dropShotErrors: 2,
        unforcedErrors: 3,
        currentForm: ['W', 'W', 'W', 'W', 'W'] as ('W' | 'L')[],
      },
      {
        ...initializePlayerStats('p2', 'Bob'),
        matchesPlayed: 10,
        wins: 5,
        losses: 5,
        winRate: 50,
        pointsScored: 190,
        pointsConceded: 190,
        pointDifference: 0,
        dropShotsPlayed: 25,
        dropShotWinners: 12,
        dropShotErrors: 5,
        unforcedErrors: 10,
        currentForm: ['W', 'L', 'W', 'L', 'W'] as ('W' | 'L')[],
      },
      {
        ...initializePlayerStats('p3', 'Charlie'),
        matchesPlayed: 10,
        wins: 2,
        losses: 8,
        winRate: 20,
        pointsScored: 140,
        pointsConceded: 210,
        pointDifference: -70,
        dropShotsPlayed: 8,
        dropShotWinners: 3,
        dropShotErrors: 4,
        unforcedErrors: 18,
        currentForm: ['L', 'L', 'L', 'L', 'L'] as ('W' | 'L')[],
      },
    ];

    // MOST POINTS
    const mostPoints = generatePlayerLeaderboard(statsList, 'MOST_POINTS');
    expect(mostPoints[0].id).toBe('p1');
    expect(mostPoints[0].headlineFormatted).toBe('210 Pts');

    // MOST LOSSES
    const mostLosses = generatePlayerLeaderboard(statsList, 'MOST_LOSSES');
    expect(mostLosses[0].id).toBe('p3');
    expect(mostLosses[0].headlineFormatted).toBe('8 Losses');

    // MOST DROPS PLAYED
    const mostDrops = generatePlayerLeaderboard(statsList, 'MOST_DROPS_PLAYED');
    expect(mostDrops[0].id).toBe('p2');
    expect(mostDrops[0].headlineFormatted).toBe('25 Drops');

    // MOST DROPS CONCEDED (points conceded)
    const mostConceded = generatePlayerLeaderboard(statsList, 'MOST_DROPS_CONCEDED');
    expect(mostConceded[0].id).toBe('p3');
    expect(mostConceded[0].headlineFormatted).toBe('210 Pts Conceded');

    // MOST UNFORCED ERRORS
    const mostErrors = generatePlayerLeaderboard(statsList, 'MOST_UNFORCED_ERRORS');
    expect(mostErrors[0].id).toBe('p3');
    expect(mostErrors[0].headlineFormatted).toBe('18 Errors');
  });

  it('covers all team leaderboard categories and custom club teams', () => {
    const teamsList = [
      {
        ...initializeTeamStats('t-red', 'Red Hawks', 'CLUB_TEAM', ['p1', 'p2']),
        matchesPlayed: 10,
        wins: 8,
        losses: 2,
        winRate: 80,
        pointsFor: 210,
        pointsAgainst: 160,
        pointDifference: 50,
      },
      {
        ...initializeTeamStats('t-blue', 'Blue Eagles', 'CLUB_TEAM', ['p3', 'p4']),
        matchesPlayed: 10,
        wins: 5,
        losses: 5,
        winRate: 50,
        pointsFor: 180,
        pointsAgainst: 180,
        pointDifference: 0,
      },
      {
        ...initializeTeamStats('t-green', 'Green Vipers', 'CLUB_TEAM', ['p5', 'p6']),
        matchesPlayed: 10,
        wins: 2,
        losses: 8,
        winRate: 20,
        pointsFor: 140,
        pointsAgainst: 210,
        pointDifference: -70,
      },
    ];

    const prevSnapshot = { 't-red': 2, 't-blue': 1, 't-green': 3 };

    const winRateBoard = generateTeamLeaderboard(teamsList, 'BEST_TEAM_WIN_RATE', prevSnapshot);
    expect(winRateBoard[0].id).toBe('t-red');
    expect(winRateBoard[0].rankMovement).toBe('UP');

    const pointDiffBoard = generateTeamLeaderboard(teamsList, 'BEST_POINT_DIFFERENCE');
    expect(pointDiffBoard[0].id).toBe('t-red');
    expect(pointDiffBoard[0].headlineFormatted).toBe('+50');

    const lossesBoard = generateTeamLeaderboard(teamsList, 'MOST_TEAM_LOSSES');
    expect(lossesBoard[0].id).toBe('t-green');
    expect(lossesBoard[0].headlineFormatted).toBe('8 Losses');
  });

  it('computes match stats where side B wins and points derived from events', () => {
    const matchSideBWins: RankingMatch = {
      id: 'm-side-b',
      matchType: 'DOUBLES',
      teamAId: 'team-alpha',
      teamBId: 'team-beta',
      participants: [
        { playerId: 'p1', displayName: 'P1', side: 'A', position: 1 },
        { playerId: 'p2', displayName: 'P2', side: 'A', position: 2 },
        { playerId: 'p3', displayName: 'P3', side: 'B', position: 1 },
        { playerId: 'p4', displayName: 'P4', side: 'B', position: 2 },
      ],
      winnerSide: 'B',
      status: 'COMPLETED',
      games: [],
      events: [
        { id: 'ev-1', sequenceNumber: 1, eventType: 'POINT', side: 'B' },
        { id: 'ev-2', sequenceNumber: 2, eventType: 'POINT', side: 'B' },
        { id: 'ev-3', sequenceNumber: 3, eventType: 'POINT', side: 'A' },
      ],
    };

    const playerStats = computeAllPlayerStats([matchSideBWins]);
    expect(playerStats['p3']!.wins).toBe(1);
    expect(playerStats['p1']!.losses).toBe(1);

    const teamStats = computeAllTeamStats([matchSideBWins]);
    expect(teamStats['team-beta']!.wins).toBe(1);
    expect(teamStats['team-alpha']!.losses).toBe(1);
  });

  it('runs CLI rebuild command cleanly', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runRebuildCli();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});


  it('tests complete public API re-exports', () => {
    expect(PublicApi.rebuildRankings).toBeDefined();
    expect(PublicApi.computeAllPlayerStats).toBeDefined();
    expect(PublicApi.generatePlayerLeaderboard).toBeDefined();
    expect(PublicApi.generateTeamLeaderboard).toBeDefined();
  });

  it('covers tiebreakers when values and secondary tiebreakers are equal', () => {
    const tiedPlayers = [
      {
        ...initializePlayerStats('p1', 'Alpha'),
        matchesPlayed: 5,
        wins: 3,
        losses: 2,
        winRate: 60,
        pointsScored: 100,
        pointsConceded: 90,
        pointDifference: 10,
        dropShotsPlayed: 10,
        dropShotWinners: 5,
        unforcedErrors: 4,
      },
      {
        ...initializePlayerStats('p2', 'Beta'),
        matchesPlayed: 5,
        wins: 3,
        losses: 2,
        winRate: 60,
        pointsScored: 100,
        pointsConceded: 90,
        pointDifference: 10,
        dropShotsPlayed: 10,
        dropShotWinners: 5,
        unforcedErrors: 4,
      },
    ];

    expect(generatePlayerLeaderboard(tiedPlayers, 'MOST_POINTS')[1].rank).toBe(1);
    expect(generatePlayerLeaderboard(tiedPlayers, 'MOST_LOSSES')[1].rank).toBe(1);
    expect(generatePlayerLeaderboard(tiedPlayers, 'MOST_DROPS_PLAYED')[1].rank).toBe(1);
    expect(generatePlayerLeaderboard(tiedPlayers, 'MOST_DROPS_CONCEDED')[1].rank).toBe(1);
    expect(generatePlayerLeaderboard(tiedPlayers, 'MOST_UNFORCED_ERRORS')[1].rank).toBe(1);
    expect(generatePlayerLeaderboard(tiedPlayers, 'BEST_WIN_RATE', {}, { ...DEFAULT_RANKING_WEIGHTS, minMatchesThreshold: 1 })[1].rank).toBe(1);

    const tiedTeams = [
      {
        ...initializeTeamStats('t1', 'Team 1', 'FIXED_PAIR', ['p1', 'p2']),
        matchesPlayed: 5,
        wins: 3,
        losses: 2,
        winRate: 60,
        pointsFor: 100,
        pointsAgainst: 90,
        pointDifference: 10,
      },
      {
        ...initializeTeamStats('t2', 'Team 2', 'FIXED_PAIR', ['p3', 'p4']),
        matchesPlayed: 5,
        wins: 3,
        losses: 2,
        winRate: 60,
        pointsFor: 100,
        pointsAgainst: 90,
        pointDifference: 10,
      },
    ];

    expect(generateTeamLeaderboard(tiedTeams, 'BEST_POINT_DIFFERENCE')[1].rank).toBe(1);
    expect(generateTeamLeaderboard(tiedTeams, 'BEST_TEAM_WIN_RATE')[1].rank).toBe(1);
    expect(generateTeamLeaderboard(tiedTeams, 'MOST_TEAM_LOSSES')[1].rank).toBe(1);
  });
