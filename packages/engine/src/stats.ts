import {
  MatchConfig,
  MatchEvent,
  MatchStats,
  MomentumPoint,
  RallyEndType,
  Side,
} from './types.js';

export function getStats(
  events: MatchEvent[],
  config?: MatchConfig
): MatchStats {
  let longestStreakA = 0;
  let longestStreakB = 0;
  let currentStreakSide: Side = 'A';
  let currentStreakCount = 0;

  let leadChanges = 0;
  let previousLeader: Side | null = null;

  let scoreA = 0;
  let scoreB = 0;
  let currentGameNumber = 1;

  let maxDeficitOvercomeA = 0;
  let maxDeficitOvercomeB = 0;
  let maxDeficitCurrentGameA = 0;
  let maxDeficitCurrentGameB = 0;

  const pointsWonOnServeVsReceive = {
    sideA: { serve: 0, receive: 0 },
    sideB: { serve: 0, receive: 0 },
  };

  const shotBreakdown: {
    sideA: Record<RallyEndType, number>;
    sideB: Record<RallyEndType, number>;
  } = {
    sideA: {
      SMASH: 0,
      DROP: 0,
      NET: 0,
      OUT: 0,
      UNFORCED_ERROR: 0,
      SERVICE_FAULT: 0,
      WINNER: 0,
    },
    sideB: {
      SMASH: 0,
      DROP: 0,
      NET: 0,
      OUT: 0,
      UNFORCED_ERROR: 0,
      SERVICE_FAULT: 0,
      WINNER: 0,
    },
  };

  const pressurePoints = {
    sideA: { won: 0, lost: 0 },
    sideB: { won: 0, lost: 0 },
  };

  const gameStartTimes: Record<number, number> = {};
  const gameDurations: Array<{ gameNumber: number; durationMs: number }> = [];
  const momentumSeries: MomentumPoint[] = [];

  let currentServerSide: Side = config?.initialServerSide ?? 'A';
  let seqNumber = 0;

  for (const event of events) {
    if (event.type === 'POINT' || event.type === 'SERVE_FAULT') {
      seqNumber++;
      const winningSide: Side =
        event.type === 'POINT'
          ? event.side
          : event.faultySide === 'A'
            ? 'B'
            : 'A';

      if (!gameStartTimes[currentGameNumber]) {
        gameStartTimes[currentGameNumber] = event.timestamp;
      }

      // Check pressure point (before point added, was either side at 18+)
      const isPressure = scoreA >= 18 || scoreB >= 18;
      if (isPressure) {
        if (winningSide === 'A') {
          pressurePoints.sideA.won++;
          pressurePoints.sideB.lost++;
        } else {
          pressurePoints.sideB.won++;
          pressurePoints.sideA.lost++;
        }
      }

      // Update scores
      if (winningSide === 'A') {
        scoreA++;
      } else {
        scoreB++;
      }

      // Serve vs receive points
      if (winningSide === currentServerSide) {
        if (winningSide === 'A') {
          pointsWonOnServeVsReceive.sideA.serve++;
        } else {
          pointsWonOnServeVsReceive.sideB.serve++;
        }
      } else {
        if (winningSide === 'A') {
          pointsWonOnServeVsReceive.sideA.receive++;
        } else {
          pointsWonOnServeVsReceive.sideB.receive++;
        }
      }

      // Winner becomes server for next rally
      currentServerSide = winningSide;

      // Streaks
      if (winningSide === currentStreakSide) {
        currentStreakCount++;
      } else {
        currentStreakSide = winningSide;
        currentStreakCount = 1;
      }

      if (currentStreakSide === 'A' && currentStreakCount > longestStreakA) {
        longestStreakA = currentStreakCount;
      }
      if (currentStreakSide === 'B' && currentStreakCount > longestStreakB) {
        longestStreakB = currentStreakCount;
      }

      // Deficits
      const diff = scoreA - scoreB;
      if (diff < 0) {
        const deficitForA = -diff;
        if (deficitForA > maxDeficitCurrentGameA) {
          maxDeficitCurrentGameA = deficitForA;
        }
      } else if (diff > 0) {
        const deficitForB = diff;
        if (deficitForB > maxDeficitCurrentGameB) {
          maxDeficitCurrentGameB = deficitForB;
        }
      }

      // Lead change
      let currentLeader: Side | null = null;
      if (scoreA > scoreB) currentLeader = 'A';
      else if (scoreB > scoreA) currentLeader = 'B';

      if (
        currentLeader !== null &&
        previousLeader !== null &&
        currentLeader !== previousLeader
      ) {
        leadChanges++;
      }
      if (currentLeader !== null) {
        previousLeader = currentLeader;
      }

      // Shot breakdown
      if (event.type === 'POINT' && event.rallyEndType) {
        const shot = event.rallyEndType;
        if (winningSide === 'A') {
          shotBreakdown.sideA[shot] = (shotBreakdown.sideA[shot] ?? 0) + 1;
        } else {
          shotBreakdown.sideB[shot] = (shotBreakdown.sideB[shot] ?? 0) + 1;
        }
      }

      // Momentum
      momentumSeries.push({
        sequenceNumber: seqNumber,
        gameNumber: currentGameNumber,
        scoreA,
        scoreB,
        diff: scoreA - scoreB,
        winningSide,
        timestamp: event.timestamp,
      });
    } else if (event.type === 'GAME_END') {
      const startTime = gameStartTimes[event.gameNumber] ?? event.timestamp;
      const durationMs = Math.max(0, event.timestamp - startTime);
      gameDurations.push({
        gameNumber: event.gameNumber,
        durationMs,
      });

      if (event.winnerSide === 'A') {
        if (maxDeficitCurrentGameA > maxDeficitOvercomeA) {
          maxDeficitOvercomeA = maxDeficitCurrentGameA;
        }
      } else {
        if (maxDeficitCurrentGameB > maxDeficitOvercomeB) {
          maxDeficitOvercomeB = maxDeficitCurrentGameB;
        }
      }

      scoreA = 0;
      scoreB = 0;
      maxDeficitCurrentGameA = 0;
      maxDeficitCurrentGameB = 0;
      previousLeader = null;
      currentGameNumber = event.gameNumber + 1;
    }
  }

  return {
    longestStreak: { sideA: longestStreakA, sideB: longestStreakB },
    currentStreak: { side: currentStreakSide, count: currentStreakCount },
    leadChanges,
    comebackDeficits: {
      sideA: maxDeficitOvercomeA,
      sideB: maxDeficitOvercomeB,
    },
    pointsWonOnServeVsReceive,
    gameDurations,
    momentumSeries,
    shotBreakdown,
    pressurePoints,
  };
}
