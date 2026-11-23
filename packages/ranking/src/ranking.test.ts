import { describe, it, expect } from 'vitest';
import {
  RankingMatch,
  RankingMatchEvent,
  DEFAULT_RANKING_WEIGHTS,
} from './types.js';
import {
  computeAllPlayerStats,
  computeAllTeamStats,
  replayValidEvents,
} from './stats.js';
import {
  generatePlayerLeaderboard,
  generateTeamLeaderboard,
  calculateOverallScore,
} from './rankingEngine.js';
import { rebuildRankings } from './rebuild.js';

describe('Ranking Engine Phase 1', () => {
  // Sample community players
  const p1 = { playerId: 'p-viktor', displayName: 'Viktor Axelsen' };
  const p2 = { playerId: 'p-lee', displayName: 'Lee Zii Jia' };
  const p3 = { playerId: 'p-momota', displayName: 'Kento Momota' };
  const p4 = { playerId: 'p-shi', displayName: 'Shi Yuqi' };

  // Sample match 1: Viktor vs Lee (Singles)
  const match1: RankingMatch = {
    id: 'm-1',
    matchType: 'SINGLES',
    participants: [
      { ...p1, side: 'A', position: 1 },
      { ...p2, side: 'B', position: 1 },
    ],
    winnerSide: 'A',
    status: 'COMPLETED',
    games: [
      { gameNumber: 1, scoreA: 21, scoreB: 10, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 21, scoreB: 10, winnerSide: 'A' },
    ],
    events: [
      {
        id: 'e-1',
        sequenceNumber: 1,
        eventType: 'POINT',
        side: 'A',
        shotType: 'SMASH',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: 'p-viktor',
      },
      {
        id: 'e-2',
        sequenceNumber: 2,
        eventType: 'POINT',
        side: 'B',
        shotType: 'DROP',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: 'p-lee',
      },
      {
        id: 'e-3',
        sequenceNumber: 3,
        eventType: 'POINT',
        side: 'A',
        shotType: 'DROP',
        rallyEndResult: 'UNFORCED_ERROR',
        pointWinnerPlayerId: 'p-viktor',
        errorPlayerId: 'p-lee',
      },
    ],
  };

  // Sample match 2: Momota vs Shi (Singles)
  const match2: RankingMatch = {
    id: 'm-2',
    matchType: 'SINGLES',
    participants: [
      { ...p3, side: 'A', position: 1 },
      { ...p4, side: 'B', position: 1 },
    ],
    winnerSide: 'A',
    status: 'COMPLETED',
    games: [
      { gameNumber: 1, scoreA: 21, scoreB: 12, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 21, scoreB: 16, winnerSide: 'A' },
    ],
    events: [
      {
        id: 'e-4',
        sequenceNumber: 1,
        eventType: 'POINT',
        side: 'A',
        shotType: 'DROP',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: 'p-momota',
      },
      {
        id: 'e-5',
        sequenceNumber: 2,
        eventType: 'POINT',
        side: 'B',
        shotType: 'SMASH',
        rallyEndResult: 'UNFORCED_ERROR',
        pointWinnerPlayerId: 'p-shi',
        errorPlayerId: 'p-momota',
      },
    ],
  };

  // Sample match 3: Doubles match (Viktor & Momota vs Lee & Shi)
  const match3: RankingMatch = {
    id: 'm-3',
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
      { gameNumber: 1, scoreA: 21, scoreB: 19, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 21, scoreB: 17, winnerSide: 'A' },
    ],
    events: [
      {
        id: 'e-6',
        sequenceNumber: 1,
        eventType: 'POINT',
        side: 'A',
        shotType: 'SMASH',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: 'p-viktor',
      },
    ],
  };

  it('computes accurate player stats across singles and doubles matches', () => {
    const stats = computeAllPlayerStats([match1, match2, match3]);

    // Viktor played in match 1 and match 3 (won both)
    const viktor = stats['p-viktor']!;
    expect(viktor.matchesPlayed).toBe(2);
    expect(viktor.wins).toBe(2);
    expect(viktor.losses).toBe(0);
    expect(viktor.winRate).toBe(100);
    expect(viktor.gamesWon).toBe(4);
    expect(viktor.gamesLost).toBe(0);
    expect(viktor.pointsScored).toBe(42 + 42); // 84
    expect(viktor.pointsConceded).toBe(20 + 36); // 56
    expect(viktor.pointDifference).toBe(28);
    expect(viktor.smashWinners).toBe(2); // e-1 and e-6
    expect(viktor.longestWinStreak).toBe(2);
    expect(viktor.currentForm).toEqual(['W', 'W']);

    // Lee played in match 1 and match 3 (lost both)
    const lee = stats['p-lee']!;
    expect(lee.matchesPlayed).toBe(2);
    expect(lee.wins).toBe(0);
    expect(lee.losses).toBe(2);
    expect(lee.winRate).toBe(0);
    expect(lee.dropShotsPlayed).toBe(2); // e-2 (winner), e-3 (error)
    expect(lee.dropShotWinners).toBe(1);
    expect(lee.dropShotErrors).toBe(1);
    expect(lee.unforcedErrors).toBe(1); // e-3
    expect(lee.currentForm).toEqual(['L', 'L']);
  });

  it('handles UNDO correctly by cancelling the undone point and tag', () => {
    const matchWithUndo: RankingMatch = {
      ...match1,
      id: 'm-undo',
      events: [
        {
          id: 'e-1',
          sequenceNumber: 1,
          eventType: 'POINT',
          side: 'A',
          shotType: 'SMASH',
          rallyEndResult: 'WINNER',
          pointWinnerPlayerId: 'p-viktor',
        },
        {
          id: 'e-undo',
          sequenceNumber: 2,
          eventType: 'UNDO',
        },
      ],
    };

    const validEvents = replayValidEvents(matchWithUndo.events);
    expect(validEvents.length).toBe(0); // The point was undone!

    const stats = computeAllPlayerStats([matchWithUndo]);
    expect(stats['p-viktor']!.smashWinners).toBe(0); // Cancelled
  });

  it('generates leaderboard for MOST WINS with correct ordering and matches count', () => {
    const statsMap = computeAllPlayerStats([match1, match2, match3]);
    const leaderboard = generatePlayerLeaderboard(Object.values(statsMap), 'MOST_WINS');

    expect(leaderboard[0].id).toBe('p-viktor');
    expect(leaderboard[0].headlineValue).toBe(2);
    expect(leaderboard[0].matchesPlayed).toBe(2);
    expect(leaderboard[0].headlineFormatted).toBe('2 Wins');

    // Momota is second (2 matches, 2 wins, less point diff than Viktor)
    expect(leaderboard[1].id).toBe('p-momota');
    expect(leaderboard[1].headlineValue).toBe(2);
    expect(leaderboard[1].matchesPlayed).toBe(2);
  });

  it('handles ties and assigns shared ranks (1, 2, 2, 4)', () => {
    const tiedStats = [
      {
        playerId: 'p1',
        displayName: 'Player One',
        matchesPlayed: 4,
        wins: 3,
        losses: 1,
        winRate: 75,
        pointsScored: 80,
        pointsConceded: 60,
        pointDifference: 20,
        gamesWon: 6,
        gamesLost: 2,
        dropShotsPlayed: 0,
        dropShotWinners: 0,
        dropShotErrors: 0,
        unforcedErrors: 0,
        smashWinners: 0,
        longestWinStreak: 3,
        currentStreak: 3,
        currentForm: ['W' as const],
      },
      {
        playerId: 'p2',
        displayName: 'Player Two',
        matchesPlayed: 4,
        wins: 2,
        losses: 2,
        winRate: 50,
        pointsScored: 70,
        pointsConceded: 70,
        pointDifference: 0,
        gamesWon: 4,
        gamesLost: 4,
        dropShotsPlayed: 0,
        dropShotWinners: 0,
        dropShotErrors: 0,
        unforcedErrors: 0,
        smashWinners: 0,
        longestWinStreak: 2,
        currentStreak: 0,
        currentForm: ['L' as const],
      },
      {
        playerId: 'p3',
        displayName: 'Player Three',
        matchesPlayed: 4,
        wins: 2,
        losses: 2,
        winRate: 50,
        pointsScored: 70,
        pointsConceded: 70,
        pointDifference: 0,
        gamesWon: 4,
        gamesLost: 4,
        dropShotsPlayed: 0,
        dropShotWinners: 0,
        dropShotErrors: 0,
        unforcedErrors: 0,
        smashWinners: 0,
        longestWinStreak: 2,
        currentStreak: 0,
        currentForm: ['L' as const],
      },
      {
        playerId: 'p4',
        displayName: 'Player Four',
        matchesPlayed: 4,
        wins: 1,
        losses: 3,
        winRate: 25,
        pointsScored: 50,
        pointsConceded: 75,
        pointDifference: -25,
        gamesWon: 2,
        gamesLost: 6,
        dropShotsPlayed: 0,
        dropShotWinners: 0,
        dropShotErrors: 0,
        unforcedErrors: 0,
        smashWinners: 0,
        longestWinStreak: 1,
        currentStreak: 0,
        currentForm: ['L' as const],
      },
    ];

    const leaderboard = generatePlayerLeaderboard(tiedStats, 'MOST_WINS');
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[2].rank).toBe(2); // Tied!
    expect(leaderboard[3].rank).toBe(4); // Next rank is 4!
  });

  it('filters BEST_WIN_RATE by minimum matches threshold', () => {
    const stats = computeAllPlayerStats([match1, match2, match3]);
    // With threshold = 5, candidates with 2 matches are excluded
    const boardStrict = generatePlayerLeaderboard(
      Object.values(stats),
      'BEST_WIN_RATE',
      {},
      { ...DEFAULT_RANKING_WEIGHTS, minMatchesThreshold: 5 }
    );
    expect(boardStrict.length).toBe(0);

    // With threshold = 1, candidates are included
    const boardLenient = generatePlayerLeaderboard(
      Object.values(stats),
      'BEST_WIN_RATE',
      {},
      { ...DEFAULT_RANKING_WEIGHTS, minMatchesThreshold: 1 }
    );
    expect(boardLenient.length).toBe(4);
    expect(boardLenient[0].headlineFormatted).toBe('100%');
  });

  it('computes OVERALL weighted rank with documented weights', () => {
    const statsMap = computeAllPlayerStats([match1, match2, match3]);
    const scoreViktor = calculateOverallScore(statsMap['p-viktor']!, 2, 2);
    expect(scoreViktor).toBeGreaterThan(50);

    const overallBoard = generatePlayerLeaderboard(Object.values(statsMap), 'OVERALL');
    expect(overallBoard[0].id).toBe('p-viktor');
  });

  it('computes rank movements (UP, DOWN, SAME) against previous snapshots', () => {
    const statsMap = computeAllPlayerStats([match1, match2, match3]);
    const previousRanks = {
      'p-viktor': 3, // was rank 3, now rank 1 -> UP (+2)
      'p-momota': 1, // was rank 1, now rank 2 -> DOWN (-1)
      'p-lee': 3, // was rank 3, now rank 3 -> SAME (0)
    };

    const board = generatePlayerLeaderboard(Object.values(statsMap), 'MOST_WINS', previousRanks);
    const viktorEntry = board.find((e) => e.id === 'p-viktor')!;
    expect(viktorEntry.rankMovement).toBe('UP');
    expect(viktorEntry.movementDelta).toBe(2);

    const momotaEntry = board.find((e) => e.id === 'p-momota')!;
    expect(momotaEntry.rankMovement).toBe('DOWN');
    expect(momotaEntry.movementDelta).toBe(1);
  });

  it('auto-detects doubles pairs as teams and builds team leaderboards', () => {
    const teamStats = computeAllTeamStats([match1, match2, match3]);
    // Match 3 is doubles with Viktor & Momota vs Lee & Shi
    const teamPairA = teamStats['pair_p-momota_p-viktor'];
    expect(teamPairA).toBeDefined();
    expect(teamPairA!.matchesPlayed).toBe(1);
    expect(teamPairA!.wins).toBe(1);
    expect(teamPairA!.winRate).toBe(100);

    const teamPairB = teamStats['pair_p-lee_p-shi'];
    expect(teamPairB).toBeDefined();
    expect(teamPairB!.matchesPlayed).toBe(1);
    expect(teamPairB!.wins).toBe(0);
    expect(teamPairB!.losses).toBe(1);

    const teamLeaderboard = generateTeamLeaderboard(Object.values(teamStats), 'MOST_TEAM_WINS');
    expect(teamLeaderboard[0].id).toBe('pair_p-momota_p-viktor');
    expect(teamLeaderboard[0].headlineFormatted).toBe('1 Wins');
  });

  it('verifies rebuildRankings pipeline produces identical deterministic output', () => {
    const run1 = rebuildRankings([match1, match2, match3]);
    const run2 = rebuildRankings([match1, match2, match3]);

    expect(run1.playerStats).toEqual(run2.playerStats);
    expect(run1.teamStats).toEqual(run2.teamStats);
    expect(run1.playerLeaderboards.MOST_WINS).toEqual(run2.playerLeaderboards.MOST_WINS);
    expect(run1.teamLeaderboards.OVERALL_TEAM).toEqual(run2.teamLeaderboards.OVERALL_TEAM);
  });
});
