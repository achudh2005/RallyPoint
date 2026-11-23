import {
  PlayerStats,
  TeamStats,
  RankingMatch,
  RankingMatchEvent,
} from './types.js';

export function initializePlayerStats(playerId: string, displayName = ''): PlayerStats {
  return {
    playerId,
    displayName: displayName || playerId,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    pointsScored: 0,
    pointsConceded: 0,
    pointDifference: 0,
    gamesWon: 0,
    gamesLost: 0,
    dropShotsPlayed: 0,
    dropShotWinners: 0,
    dropShotErrors: 0,
    unforcedErrors: 0,
    smashWinners: 0,
    longestWinStreak: 0,
    currentStreak: 0,
    currentForm: [],
  };
}

export function initializeTeamStats(
  teamId: string,
  name: string,
  type: 'FIXED_PAIR' | 'CLUB_TEAM',
  playerIds: string[]
): TeamStats {
  return {
    teamId,
    name,
    type,
    playerIds,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifference: 0,
    gamesWon: 0,
    gamesLost: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

/**
 * Filter match events handling UNDO operations via event sourcing replay
 */
export function replayValidEvents(events: RankingMatchEvent[]): RankingMatchEvent[] {
  const stack: RankingMatchEvent[] = [];
  // Sort events by sequenceNumber
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  for (const event of sorted) {
    if (event.eventType === 'UNDO') {
      // Remove last score-bearing event
      for (let i = stack.length - 1; i >= 0; i--) {
        const candidate = stack[i];
        if (candidate && (candidate.eventType === 'POINT' || candidate.eventType === 'SERVE_FAULT')) {
          stack.splice(i, 1);
          break;
        }
      }
    } else {
      stack.push(event);
    }
  }

  return stack;
}

/**
 * Recomputes player statistics across an array of matches
 */
export function computeAllPlayerStats(matches: RankingMatch[]): Record<string, PlayerStats> {
  const statsMap: Record<string, PlayerStats> = {};

  // Sort matches chronologically if dates available
  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = a.endedAt ? new Date(a.endedAt).getTime() : 0;
    const timeB = b.endedAt ? new Date(b.endedAt).getTime() : 0;
    return timeA - timeB;
  });

  for (const match of sortedMatches) {
    // Register players in statsMap
    for (const p of match.participants) {
      if (!statsMap[p.playerId]) {
        statsMap[p.playerId] = initializePlayerStats(p.playerId, p.displayName);
      }
    }

    const sideAPlayers = match.participants.filter((p) => p.side === 'A');
    const sideBPlayers = match.participants.filter((p) => p.side === 'B');

    // 1. Process Event Tags from valid replayed events
    const validEvents = replayValidEvents(match.events);
    for (const event of validEvents) {
      if (event.eventType === 'POINT' || event.eventType === 'SERVE_FAULT') {
        // Point winner attribution
        if (event.pointWinnerPlayerId && statsMap[event.pointWinnerPlayerId]) {
          const winnerStats = statsMap[event.pointWinnerPlayerId]!;
          if (event.shotType === 'DROP') {
            winnerStats.dropShotsPlayed++;
            if (event.rallyEndResult === 'WINNER') {
              winnerStats.dropShotWinners++;
            }
          }
          if (event.shotType === 'SMASH' && event.rallyEndResult === 'WINNER') {
            winnerStats.smashWinners++;
          }
        }

        // Error attribution
        if (event.errorPlayerId && statsMap[event.errorPlayerId]) {
          const errorStats = statsMap[event.errorPlayerId]!;
          if (
            event.rallyEndResult === 'UNFORCED_ERROR' ||
            event.rallyEndResult === 'OUT' ||
            event.rallyEndResult === 'NET_FAULT' ||
            event.rallyEndResult === 'SERVICE_FAULT'
          ) {
            errorStats.unforcedErrors++;
          }
          if (event.shotType === 'DROP') {
            errorStats.dropShotsPlayed++;
            errorStats.dropShotErrors++;
          }
        }
      }
    }

    // 2. Process Games and Match Results if match is completed
    const isCompleted =
      match.status === 'COMPLETED' || match.winnerSide !== null || match.games.length > 0;

    if (isCompleted) {
      let sideAPoints = 0;
      let sideBPoints = 0;
      let sideAGames = 0;
      let sideBGames = 0;

      for (const g of match.games) {
        sideAPoints += g.scoreA;
        sideBPoints += g.scoreB;
        if (g.winnerSide === 'A' || g.scoreA > g.scoreB) sideAGames++;
        else if (g.winnerSide === 'B' || g.scoreB > g.scoreA) sideBGames++;
      }

      // If points weren't in games, sum from valid events
      if (sideAPoints === 0 && sideBPoints === 0 && validEvents.length > 0) {
        for (const ev of validEvents) {
          if (ev.side === 'A') sideAPoints++;
          else if (ev.side === 'B') sideBPoints++;
        }
      }

      const matchWinnerSide =
        match.winnerSide || (sideAGames > sideBGames ? 'A' : sideBGames > sideAGames ? 'B' : null);

      // Attribute match and game stats to Side A players
      for (const p of sideAPlayers) {
        const pStats = statsMap[p.playerId]!;
        pStats.matchesPlayed++;
        pStats.pointsScored += sideAPoints;
        pStats.pointsConceded += sideBPoints;
        pStats.pointDifference = pStats.pointsScored - pStats.pointsConceded;
        pStats.gamesWon += sideAGames;
        pStats.gamesLost += sideBGames;

        if (matchWinnerSide === 'A') {
          pStats.wins++;
          pStats.currentStreak++;
          if (pStats.currentStreak > pStats.longestWinStreak) {
            pStats.longestWinStreak = pStats.currentStreak;
          }
          pStats.currentForm.push('W');
        } else if (matchWinnerSide === 'B') {
          pStats.losses++;
          pStats.currentStreak = 0;
          pStats.currentForm.push('L');
        }
        if (pStats.currentForm.length > 5) {
          pStats.currentForm = pStats.currentForm.slice(-5);
        }
        pStats.winRate =
          pStats.matchesPlayed > 0
            ? Number(((pStats.wins / pStats.matchesPlayed) * 100).toFixed(2))
            : 0;
      }

      // Attribute match and game stats to Side B players
      for (const p of sideBPlayers) {
        const pStats = statsMap[p.playerId]!;
        pStats.matchesPlayed++;
        pStats.pointsScored += sideBPoints;
        pStats.pointsConceded += sideAPoints;
        pStats.pointDifference = pStats.pointsScored - pStats.pointsConceded;
        pStats.gamesWon += sideBGames;
        pStats.gamesLost += sideAGames;

        if (matchWinnerSide === 'B') {
          pStats.wins++;
          pStats.currentStreak++;
          if (pStats.currentStreak > pStats.longestWinStreak) {
            pStats.longestWinStreak = pStats.currentStreak;
          }
          pStats.currentForm.push('W');
        } else if (matchWinnerSide === 'A') {
          pStats.losses++;
          pStats.currentStreak = 0;
          pStats.currentForm.push('L');
        }
        if (pStats.currentForm.length > 5) {
          pStats.currentForm = pStats.currentForm.slice(-5);
        }
        pStats.winRate =
          pStats.matchesPlayed > 0
            ? Number(((pStats.wins / pStats.matchesPlayed) * 100).toFixed(2))
            : 0;
      }
    }
  }

  return statsMap;
}

/**
 * Computes team statistics for fixed pairs, club teams, or auto-detected doubles pairs
 */
export function computeAllTeamStats(matches: RankingMatch[]): Record<string, TeamStats> {
  const teamsMap: Record<string, TeamStats> = {};

  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = a.endedAt ? new Date(a.endedAt).getTime() : 0;
    const timeB = b.endedAt ? new Date(b.endedAt).getTime() : 0;
    return timeA - timeB;
  });

  for (const match of sortedMatches) {
    const isDoubles = match.matchType === 'DOUBLES' || match.matchType === 'MIXED';
    const sideAPlayers = match.participants
      .filter((p) => p.side === 'A')
      .sort((a, b) => a.playerId.localeCompare(b.playerId));
    const sideBPlayers = match.participants
      .filter((p) => p.side === 'B')
      .sort((a, b) => a.playerId.localeCompare(b.playerId));

    // Handle Side A Team
    let teamAId = match.teamAId;
    let teamAName = '';
    if (!teamAId && isDoubles && sideAPlayers.length === 2) {
      teamAId = `pair_${sideAPlayers[0]?.playerId}_${sideAPlayers[1]?.playerId}`;
      teamAName = `${sideAPlayers[0]?.displayName} & ${sideAPlayers[1]?.displayName}`;
    }

    // Handle Side B Team
    let teamBId = match.teamBId;
    let teamBName = '';
    if (!teamBId && isDoubles && sideBPlayers.length === 2) {
      teamBId = `pair_${sideBPlayers[0]?.playerId}_${sideBPlayers[1]?.playerId}`;
      teamBName = `${sideBPlayers[0]?.displayName} & ${sideBPlayers[1]?.displayName}`;
    }

    if (teamAId && !teamsMap[teamAId]) {
      teamsMap[teamAId] = initializeTeamStats(
        teamAId,
        teamAName || teamAId,
        'FIXED_PAIR',
        sideAPlayers.map((p) => p.playerId)
      );
    }
    if (teamBId && !teamsMap[teamBId]) {
      teamsMap[teamBId] = initializeTeamStats(
        teamBId,
        teamBName || teamBId,
        'FIXED_PAIR',
        sideBPlayers.map((p) => p.playerId)
      );
    }

    // Accumulate scores if match is completed
    const isCompleted =
      match.status === 'COMPLETED' || match.winnerSide !== null || match.games.length > 0;

    if (isCompleted && (teamAId || teamBId)) {
      let sideAPoints = 0;
      let sideBPoints = 0;
      let sideAGames = 0;
      let sideBGames = 0;

      for (const g of match.games) {
        sideAPoints += g.scoreA;
        sideBPoints += g.scoreB;
        if (g.winnerSide === 'A' || g.scoreA > g.scoreB) sideAGames++;
        else if (g.winnerSide === 'B' || g.scoreB > g.scoreA) sideBGames++;
      }

      const matchWinnerSide =
        match.winnerSide || (sideAGames > sideBGames ? 'A' : sideBGames > sideAGames ? 'B' : null);

      if (teamAId && teamsMap[teamAId]) {
        const t = teamsMap[teamAId]!;
        t.matchesPlayed++;
        t.pointsFor += sideAPoints;
        t.pointsAgainst += sideBPoints;
        t.pointDifference = t.pointsFor - t.pointsAgainst;
        t.gamesWon += sideAGames;
        t.gamesLost += sideBGames;
        if (matchWinnerSide === 'A') {
          t.wins++;
          t.currentStreak++;
          if (t.currentStreak > t.bestStreak) t.bestStreak = t.currentStreak;
        } else if (matchWinnerSide === 'B') {
          t.losses++;
          t.currentStreak = 0;
        }
        t.winRate =
          t.matchesPlayed > 0 ? Number(((t.wins / t.matchesPlayed) * 100).toFixed(2)) : 0;
      }

      if (teamBId && teamsMap[teamBId]) {
        const t = teamsMap[teamBId]!;
        t.matchesPlayed++;
        t.pointsFor += sideBPoints;
        t.pointsAgainst += sideAPoints;
        t.pointDifference = t.pointsFor - t.pointsAgainst;
        t.gamesWon += sideBGames;
        t.gamesLost += sideAGames;
        if (matchWinnerSide === 'B') {
          t.wins++;
          t.currentStreak++;
          if (t.currentStreak > t.bestStreak) t.bestStreak = t.currentStreak;
        } else if (matchWinnerSide === 'A') {
          t.losses++;
          t.currentStreak = 0;
        }
        t.winRate =
          t.matchesPlayed > 0 ? Number(((t.wins / t.matchesPlayed) * 100).toFixed(2)) : 0;
      }
    }
  }

  return teamsMap;
}
