import {
  PlayerStats,
  TeamStats,
  RankingMatch,
  RankingMatchEvent,
  RankingConfig,
  DEFAULT_RANKING_CONFIG,
  ScoringSystemFilter,
} from './types.js';
import { computeMatchAwards } from './mvp.js';

export function initializePlayerStats(playerId: string, displayName = ''): PlayerStats {
  return {
    playerId,
    displayName: displayName || playerId,
    matchesPlayed: 0,
    rallyMatchesPlayed: 0,
    serviceMatchesPlayed: 0,
    matchesSplitFormatted: 'R:0 S:0',
    rankingPoints: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    pointsScored: 0,
    pointsConceded: 0,
    pointDifference: 0,
    pointSharePct: 0,
    gamesWon: 0,
    gamesLost: 0,

    // Player action stats
    pointsWon: 0,
    drops: 0,
    netContribution: 0,
    pointShareWithinTeam: 0,
    dropShareWithinTeam: 0,
    currentPointStreak: 0,
    bestPointStreak: 0,
    sideOutsCaused: 0,

    // Streak & MVP aggregate stats
    mvpCount: 0,
    fighterCount: 0,
    mvpRate: 0,
    serveRegainedTotal: 0,
    clutchPointsTotal: 0,
    bestMatchStreak: 0,

    dropShotsPlayed: 0,
    dropShotWinners: 0,
    dropShotErrors: 0,
    unforcedErrors: 0,
    smashWinners: 0,
    longestWinStreak: 0,
    currentStreak: 0,
    currentForm: [],

    // Service point stats
    servicePointsWon: 0,
    sideOutsWon: 0,
    serviceHolds: 0,
    serviceBreaks: 0,
    avgPointsPerServiceTurn: 0,
    longestServiceRun: 0,

    // Rally point stats
    pointsWonOnServe: 0,
    pointsWonOnReceive: 0,
    longestPointStreak: 0,
    comebackPoints: 0,

    // Shutout stats
    shutoutWins: 0,
    shutoutsConceded: 0,

    // Shared / Both-fault count
    sharedFaults: 0,
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
    rallyMatchesPlayed: 0,
    serviceMatchesPlayed: 0,
    rankingPoints: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifference: 0,
    pointSharePct: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalPointsWon: 0,
    totalDrops: 0,
    netContribution: 0,
    currentStreak: 0,
    bestStreak: 0,
    shutoutWins: 0,
    shutoutsConceded: 0,
  };
}

export function replayValidEvents(events: RankingMatchEvent[]): RankingMatchEvent[] {
  const stack: RankingMatchEvent[] = [];
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  for (const event of sorted) {
    if (event.eventType === 'UNDO') {
      for (let i = stack.length - 1; i >= 0; i--) {
        const candidate = stack[i];
        if (
          candidate &&
          (candidate.eventType === 'POINT' ||
            candidate.eventType === 'RALLY_WON' ||
            candidate.eventType === 'PLAYER_ACTION' ||
            candidate.eventType === 'SERVE_FAULT')
        ) {
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

export function isMatchInFormat(match: RankingMatch, filter: ScoringSystemFilter): boolean {
  if (filter === 'ALL') return true;
  const fmt = match.scoringFormat || 'RALLY_21';
  if (filter === 'RALLY') {
    return fmt.startsWith('RALLY');
  }
  if (filter === 'SERVICE') {
    return fmt.startsWith('SERVICE');
  }
  return true;
}

export function computeAllPlayerStats(
  matches: RankingMatch[],
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
  formatFilter: ScoringSystemFilter = 'ALL'
): Record<string, PlayerStats> {
  const statsMap: Record<string, PlayerStats> = {};

  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = a.endedAt ? new Date(a.endedAt).getTime() : 0;
    const timeB = b.endedAt ? new Date(b.endedAt).getTime() : 0;
    return timeA - timeB;
  });

  for (const match of sortedMatches) {
    // Check format filter
    if (!isMatchInFormat(match, formatFilter)) {
      continue;
    }

    const fmt = match.scoringFormat || 'RALLY_21';
    const isServiceMatch = fmt.startsWith('SERVICE');

    for (const p of match.participants) {
      if (!statsMap[p.playerId]) {
        statsMap[p.playerId] = initializePlayerStats(p.playerId, p.displayName);
      }
    }

    const sideAPlayers = match.participants.filter((p) => p.side === 'A');
    const sideBPlayers = match.participants.filter((p) => p.side === 'B');

    // 1. Process Event Tags
    const validEvents = replayValidEvents(match.events);

    let currentPointStreakA = 0;
    let currentPointStreakB = 0;
    let currentServiceRun = 0;
    let lastServingPlayerId: string | null = null;

    for (const event of validEvents) {
      if (
        event.eventType === 'POINT' ||
        event.eventType === 'RALLY_WON' ||
        event.eventType === 'PLAYER_ACTION' ||
        event.eventType === 'SIDE_OUT' ||
        event.eventType === 'SERVE_FAULT'
      ) {
        // Player Action specific tracking
        if (event.eventType === 'PLAYER_ACTION') {
          const actPlayerId =
            event.playerId ||
            (event.action === 'POINT' ? event.pointWinnerPlayerId : event.errorPlayerId);
          if (actPlayerId && statsMap[actPlayerId]) {
            const pStats = statsMap[actPlayerId]!;
            if (event.action === 'POINT') {
              pStats.pointsWon++;
              pStats.currentPointStreak++;
              if (pStats.currentPointStreak > pStats.bestPointStreak) {
                pStats.bestPointStreak = pStats.currentPointStreak;
              }
              if (isServiceMatch) {
                if (event.isPoint) pStats.servicePointsWon++;
                if (event.isSideOut) pStats.sideOutsCaused++;
              }
              if (event.attributedDropPlayerIds && event.attributedDropPlayerIds.length > 0) {
                const share = Number((1 / event.attributedDropPlayerIds.length).toFixed(2));
                const isShared = event.attributedDropPlayerIds.length > 1;
                for (const dId of event.attributedDropPlayerIds) {
                  if (statsMap[dId]) {
                    statsMap[dId]!.drops = Number((statsMap[dId]!.drops + share).toFixed(2));
                    if (isShared) {
                      statsMap[dId]!.sharedFaults = Number((statsMap[dId]!.sharedFaults + share).toFixed(2));
                    }
                    statsMap[dId]!.currentPointStreak = 0;
                    statsMap[dId]!.netContribution = Number(
                      (statsMap[dId]!.pointsWon - statsMap[dId]!.drops).toFixed(2)
                    );
                  }
                }
              }
            } else if (event.action === 'DROP') {
              if (event.isBothFault && event.attributedDropPlayerIds && event.attributedDropPlayerIds.length > 1) {
                const share = Number((1 / event.attributedDropPlayerIds.length).toFixed(2));
                for (const dId of event.attributedDropPlayerIds) {
                  if (statsMap[dId]) {
                    statsMap[dId]!.drops = Number((statsMap[dId]!.drops + share).toFixed(2));
                    statsMap[dId]!.sharedFaults = Number((statsMap[dId]!.sharedFaults + share).toFixed(2));
                    statsMap[dId]!.currentPointStreak = 0;
                    statsMap[dId]!.netContribution = Number(
                      (statsMap[dId]!.pointsWon - statsMap[dId]!.drops).toFixed(2)
                    );
                  }
                }
              } else {
                pStats.drops = Number((pStats.drops + 1).toFixed(2));
                pStats.currentPointStreak = 0;
              }
              if (event.attributedPointPlayerId && statsMap[event.attributedPointPlayerId]) {
                const wStats = statsMap[event.attributedPointPlayerId]!;
                wStats.pointsWon++;
                wStats.currentPointStreak++;
                if (wStats.currentPointStreak > wStats.bestPointStreak) {
                  wStats.bestPointStreak = wStats.currentPointStreak;
                }
                wStats.netContribution = Number((wStats.pointsWon - wStats.drops).toFixed(2));
              }
            }
            pStats.netContribution = Number((pStats.pointsWon - pStats.drops).toFixed(2));
          }
        }

        // Point winner attribution
        if (event.pointWinnerPlayerId && statsMap[event.pointWinnerPlayerId]) {
          const winnerStats = statsMap[event.pointWinnerPlayerId]!;
          if (event.eventType !== 'PLAYER_ACTION') {
            winnerStats.pointsWon++;
            winnerStats.currentPointStreak++;
            if (winnerStats.currentPointStreak > winnerStats.bestPointStreak) {
              winnerStats.bestPointStreak = winnerStats.currentPointStreak;
            }
            winnerStats.netContribution = winnerStats.pointsWon - winnerStats.drops;
          }
          if (event.shotType === 'DROP') {
            winnerStats.dropShotsPlayed++;
            if (event.rallyEndResult === 'WINNER') {
              winnerStats.dropShotWinners++;
            }
          }
          if (event.shotType === 'SMASH' && event.rallyEndResult === 'WINNER') {
            winnerStats.smashWinners++;
          }

          // Service vs Receive rally/point stats
          const winnerParticipant = match.participants.find(
            (p) => p.playerId === event.pointWinnerPlayerId
          );
          const winnerSide = winnerParticipant?.side || event.side;

          if (isServiceMatch) {
            if (event.isPoint || event.eventType === 'POINT') {
              winnerStats.servicePointsWon++;
              winnerStats.serviceHolds++;
              if (lastServingPlayerId === event.pointWinnerPlayerId) {
                currentServiceRun++;
                if (currentServiceRun > winnerStats.longestServiceRun) {
                  winnerStats.longestServiceRun = currentServiceRun;
                }
              } else {
                currentServiceRun = 1;
                lastServingPlayerId = event.pointWinnerPlayerId;
              }
            } else if (event.isSideOut) {
              winnerStats.sideOutsWon++;
              winnerStats.serviceBreaks++;
              currentServiceRun = 0;
            }
          } else {
            // Rally point stats
            if (winnerSide === 'A') {
              currentPointStreakA++;
              currentPointStreakB = 0;
              if (currentPointStreakA > winnerStats.longestPointStreak) {
                winnerStats.longestPointStreak = currentPointStreakA;
              }
            } else {
              currentPointStreakB++;
              currentPointStreakA = 0;
              if (currentPointStreakB > winnerStats.longestPointStreak) {
                winnerStats.longestPointStreak = currentPointStreakB;
              }
            }

            if (event.serverPlayerId === event.pointWinnerPlayerId) {
              winnerStats.pointsWonOnServe++;
            } else {
              winnerStats.pointsWonOnReceive++;
            }
          }
        }

        // Error attribution
        if (event.errorPlayerId && statsMap[event.errorPlayerId]) {
          const errorStats = statsMap[event.errorPlayerId]!;
          if (event.eventType !== 'PLAYER_ACTION') {
            errorStats.drops++;
            errorStats.currentPointStreak = 0;
            errorStats.netContribution = errorStats.pointsWon - errorStats.drops;
          }
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

    // 2. Process Games and Match Results
    const isCompleted =
      match.status === 'COMPLETED' || match.winnerSide !== null || match.games.length > 0;

    if (isCompleted) {
      let sideAPoints = 0;
      let sideBPoints = 0;
      let sideAGames = 0;
      let sideBGames = 0;
      let sideAShutouts = 0;
      let sideBShutouts = 0;

      for (const g of match.games) {
        sideAPoints += g.scoreA;
        sideBPoints += g.scoreB;
        if (g.winnerSide === 'A' || g.scoreA > g.scoreB) {
          sideAGames++;
          if (g.winReason === 'SHUTOUT') sideAShutouts++;
        } else if (g.winnerSide === 'B' || g.scoreB > g.scoreA) {
          sideBGames++;
          if (g.winReason === 'SHUTOUT') sideBShutouts++;
        }
      }

      if (sideAPoints === 0 && sideBPoints === 0 && validEvents.length > 0) {
        for (const ev of validEvents) {
          if (ev.side === 'A') sideAPoints++;
          else if (ev.side === 'B') sideBPoints++;
        }
      }

      const matchWinnerSide =
        match.winnerSide || (sideAGames > sideBGames ? 'A' : sideBGames > sideAGames ? 'B' : null);

      const isStraightGames =
        (sideAGames === 2 && sideBGames === 0) || (sideBGames === 2 && sideAGames === 0);

      // Ranking Points (RP) Calculation
      let winnerRp = isServiceMatch ? config.serviceWinRp : config.rallyWinRp;
      let loserRp = isServiceMatch ? config.serviceLossRp : config.rallyLossRp;

      // Straight games bonus
      if (isStraightGames) {
        winnerRp += isServiceMatch
          ? config.serviceStraightGamesBonus
          : config.rallyStraightGamesBonus;
      }

      // Setting bonus (service point)
      if (isServiceMatch && (match.isSettingGame || match.games.some((g) => g.isSettingGame))) {
        winnerRp += config.serviceSettingBonus;
      }

      // Giant killer bonus (if winner had worse initialRank than loser)
      const rankA = sideAPlayers[0]?.initialRank;
      const rankB = sideBPlayers[0]?.initialRank;
      let giantKillerA = false;
      let giantKillerB = false;
      if (rankA && rankB) {
        if (rankA > rankB && matchWinnerSide === 'A') giantKillerA = true;
        if (rankB > rankA && matchWinnerSide === 'B') giantKillerB = true;
      }

      const mult = isServiceMatch ? config.serviceMultiplier : config.rallyMultiplier;

      // Attribute to Side A
      const shutoutBonusA = sideAShutouts * (config.shutoutWinBonus ?? 1);
      const rpA = Math.round(
        ((matchWinnerSide === 'A' ? winnerRp + (giantKillerA ? config.rallyGiantKillerBonus : 0) : loserRp) + shutoutBonusA) * mult
      );

      for (const p of sideAPlayers) {
        const pStats = statsMap[p.playerId]!;
        pStats.matchesPlayed++;
        if (isServiceMatch) pStats.serviceMatchesPlayed++;
        else pStats.rallyMatchesPlayed++;

        pStats.rankingPoints += rpA;
        pStats.pointsScored += sideAPoints;
        pStats.pointsConceded += sideBPoints;
        pStats.pointDifference = pStats.pointsScored - pStats.pointsConceded;
        pStats.gamesWon += sideAGames;
        pStats.gamesLost += sideBGames;
        pStats.shutoutWins += sideAShutouts;
        pStats.shutoutsConceded += sideBShutouts;

        const totalPts = pStats.pointsScored + pStats.pointsConceded;
        pStats.pointSharePct = totalPts > 0 ? Number(((pStats.pointsScored / totalPts) * 100).toFixed(2)) : 0;

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
        pStats.matchesSplitFormatted = `R:${pStats.rallyMatchesPlayed} S:${pStats.serviceMatchesPlayed}`;
      }

      // Attribute to Side B
      const shutoutBonusB = sideBShutouts * (config.shutoutWinBonus ?? 1);
      const rpB = Math.round(
        ((matchWinnerSide === 'B' ? winnerRp + (giantKillerB ? config.rallyGiantKillerBonus : 0) : loserRp) + shutoutBonusB) * mult
      );

      for (const p of sideBPlayers) {
        const pStats = statsMap[p.playerId]!;
        pStats.matchesPlayed++;
        if (isServiceMatch) pStats.serviceMatchesPlayed++;
        else pStats.rallyMatchesPlayed++;

        pStats.rankingPoints += rpB;
        pStats.pointsScored += sideBPoints;
        pStats.pointsConceded += sideAPoints;
        pStats.pointDifference = pStats.pointsScored - pStats.pointsConceded;
        pStats.gamesWon += sideBGames;
        pStats.gamesLost += sideAGames;
        pStats.shutoutWins += sideBShutouts;
        pStats.shutoutsConceded += sideAShutouts;

        const totalPts = pStats.pointsScored + pStats.pointsConceded;
        pStats.pointSharePct = totalPts > 0 ? Number(((pStats.pointsScored / totalPts) * 100).toFixed(2)) : 0;

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
        pStats.matchesSplitFormatted = `R:${pStats.rallyMatchesPlayed} S:${pStats.serviceMatchesPlayed}`;
      }

      // Compute within-team shares for doubles
      if (sideAPlayers.length === 2) {
        const p1 = statsMap[sideAPlayers[0]!.playerId];
        const p2 = statsMap[sideAPlayers[1]!.playerId];
        if (p1 && p2) {
          const totPts = p1.pointsWon + p2.pointsWon;
          const totDrp = p1.drops + p2.drops;
          p1.pointShareWithinTeam = totPts > 0 ? Math.round((p1.pointsWon / totPts) * 100) : 0;
          p2.pointShareWithinTeam = totPts > 0 ? Math.round((p2.pointsWon / totPts) * 100) : 0;
          p1.dropShareWithinTeam = totDrp > 0 ? Math.round((p1.drops / totDrp) * 100) : 0;
          p2.dropShareWithinTeam = totDrp > 0 ? Math.round((p2.drops / totDrp) * 100) : 0;
        }
      }
      if (sideBPlayers.length === 2) {
        const p1 = statsMap[sideBPlayers[0]!.playerId];
        const p2 = statsMap[sideBPlayers[1]!.playerId];
        if (p1 && p2) {
          const totPts = p1.pointsWon + p2.pointsWon;
          const totDrp = p1.drops + p2.drops;
          p1.pointShareWithinTeam = totPts > 0 ? Math.round((p1.pointsWon / totPts) * 100) : 0;
          p2.pointShareWithinTeam = totPts > 0 ? Math.round((p2.pointsWon / totPts) * 100) : 0;
          p1.dropShareWithinTeam = totDrp > 0 ? Math.round((p1.drops / totDrp) * 100) : 0;
          p2.dropShareWithinTeam = totDrp > 0 ? Math.round((p2.drops / totDrp) * 100) : 0;
        }
      }

      // Compute match awards and streak contributions
      const awards = computeMatchAwards(validEvents, config, {
        matchType: match.matchType,
        scoringFormat: match.scoringFormat,
        targetPoints: match.targetPoints,
        winnerSide: matchWinnerSide || undefined,
        participants: match.participants,
      });

      if (awards.mvp) {
        const mvpId = awards.mvp.playerId;
        if (statsMap[mvpId]) {
          statsMap[mvpId]!.mvpCount += 1;
        }
      }

      if (awards.fighter) {
        const fighterId = awards.fighter.playerId;
        if (statsMap[fighterId]) {
          statsMap[fighterId]!.fighterCount += 1;
        }
      }

      for (const contrib of awards.allContributions) {
        if (statsMap[contrib.playerId]) {
          const p = statsMap[contrib.playerId]!;
          p.serveRegainedTotal += contrib.serveRegained;
          p.clutchPointsTotal += contrib.clutchPoints;
          if (contrib.bestPointStreak > p.bestMatchStreak) {
            p.bestMatchStreak = contrib.bestPointStreak;
          }
        }
      }
    }
  }

  for (const p of Object.values(statsMap)) {
    p.mvpRate = p.matchesPlayed > 0 ? Number((p.mvpCount / p.matchesPlayed).toFixed(2)) : 0;
  }

  return statsMap;
}

export function computeAllTeamStats(
  matches: RankingMatch[],
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
  formatFilter: ScoringSystemFilter = 'ALL'
): Record<string, TeamStats> {
  const teamStatsMap: Record<string, TeamStats> = {};

  for (const match of matches) {
    if (!isMatchInFormat(match, formatFilter)) {
      continue;
    }

    const fmt = match.scoringFormat || 'RALLY_21';
    const isServiceMatch = fmt.startsWith('SERVICE');

    const sideAPlayers = match.participants.filter((p) => p.side === 'A');
    const sideBPlayers = match.participants.filter((p) => p.side === 'B');

    const teamAId =
      match.teamAId ||
      (sideAPlayers.length === 2
        ? `pair_${sideAPlayers.map((p) => p.playerId).sort().join('_')}`
        : null);

    const teamBId =
      match.teamBId ||
      (sideBPlayers.length === 2
        ? `pair_${sideBPlayers.map((p) => p.playerId).sort().join('_')}`
        : null);

    if (teamAId && !teamStatsMap[teamAId]) {
      const name =
        match.teamAId && match.matchType !== 'DOUBLES'
          ? `Team ${teamAId}`
          : sideAPlayers.map((p) => p.displayName).join(' / ');
      teamStatsMap[teamAId] = initializeTeamStats(
        teamAId,
        name,
        match.teamAId ? 'CLUB_TEAM' : 'FIXED_PAIR',
        sideAPlayers.map((p) => p.playerId)
      );
    }

    if (teamBId && !teamStatsMap[teamBId]) {
      const name =
        match.teamBId && match.matchType !== 'DOUBLES'
          ? `Team ${teamBId}`
          : sideBPlayers.map((p) => p.displayName).join(' / ');
      teamStatsMap[teamBId] = initializeTeamStats(
        teamBId,
        name,
        match.teamBId ? 'CLUB_TEAM' : 'FIXED_PAIR',
        sideBPlayers.map((p) => p.playerId)
      );
    }

    if (match.status === 'COMPLETED' || match.winnerSide) {
      let sideAPoints = 0;
      let sideBPoints = 0;
      let sideAGames = 0;
      let sideBGames = 0;
      let sideAShutouts = 0;
      let sideBShutouts = 0;

      for (const g of match.games) {
        sideAPoints += g.scoreA;
        sideBPoints += g.scoreB;
        if (g.winnerSide === 'A' || g.scoreA > g.scoreB) {
          sideAGames++;
          if (g.winReason === 'SHUTOUT') sideAShutouts++;
        } else if (g.winnerSide === 'B' || g.scoreB > g.scoreA) {
          sideBGames++;
          if (g.winReason === 'SHUTOUT') sideBShutouts++;
        }
      }

      const matchWinnerSide =
        match.winnerSide || (sideAGames > sideBGames ? 'A' : sideBGames > sideAGames ? 'B' : null);

      const isStraightGames =
        (sideAGames === 2 && sideBGames === 0) || (sideBGames === 2 && sideAGames === 0);

      const winnerRp =
        (isServiceMatch ? config.serviceWinRp : config.rallyWinRp) +
        (isStraightGames ? (isServiceMatch ? config.serviceStraightGamesBonus : config.rallyStraightGamesBonus) : 0);
      const loserRp = isServiceMatch ? config.serviceLossRp : config.rallyLossRp;

      const validEvents = (match.events || []).filter((e) => !e.isCompensated);
      let teamAPts = 0;
      let teamADrps = 0;
      let teamBPts = 0;
      let teamBDrps = 0;

      for (const ev of validEvents) {
        if (ev.eventType === 'PLAYER_ACTION') {
          const isSideA = sideAPlayers.some((p) => p.playerId === ev.playerId);
          const isSideB = sideBPlayers.some((p) => p.playerId === ev.playerId);
          if (isSideA) {
            if (ev.action === 'POINT') teamAPts++;
            else if (ev.action === 'DROP') teamADrps++;
          } else if (isSideB) {
            if (ev.action === 'POINT') teamBPts++;
            else if (ev.action === 'DROP') teamBDrps++;
          }
        } else {
          if (ev.pointWinnerPlayerId) {
            if (sideAPlayers.some((p) => p.playerId === ev.pointWinnerPlayerId)) teamAPts++;
            else if (sideBPlayers.some((p) => p.playerId === ev.pointWinnerPlayerId)) teamBPts++;
          }
          if (ev.errorPlayerId) {
            if (sideAPlayers.some((p) => p.playerId === ev.errorPlayerId)) teamADrps++;
            else if (sideBPlayers.some((p) => p.playerId === ev.errorPlayerId)) teamBDrps++;
          }
        }
      }

      if (teamAId && teamStatsMap[teamAId]) {
        const t = teamStatsMap[teamAId]!;
        t.matchesPlayed++;
        if (isServiceMatch) t.serviceMatchesPlayed++;
        else t.rallyMatchesPlayed++;

        t.rankingPoints += matchWinnerSide === 'A' ? winnerRp : loserRp;
        t.pointsFor += sideAPoints;
        t.pointsAgainst += sideBPoints;
        t.pointDifference = t.pointsFor - t.pointsAgainst;
        t.gamesWon += sideAGames;
        t.gamesLost += sideBGames;
        t.shutoutWins += sideAShutouts;
        t.shutoutsConceded += sideBShutouts;

        const totalPts = t.pointsFor + t.pointsAgainst;
        t.pointSharePct = totalPts > 0 ? Number(((t.pointsFor / totalPts) * 100).toFixed(2)) : 0;

        if (matchWinnerSide === 'A') {
          t.wins++;
          t.currentStreak++;
          if (t.currentStreak > t.bestStreak) t.bestStreak = t.currentStreak;
        } else if (matchWinnerSide === 'B') {
          t.losses++;
          t.currentStreak = 0;
        }
        t.winRate = t.matchesPlayed > 0 ? Number(((t.wins / t.matchesPlayed) * 100).toFixed(2)) : 0;
        t.totalPointsWon += teamAPts;
        t.totalDrops += teamADrps;
        t.netContribution = t.totalPointsWon - t.totalDrops;
      }

      if (teamBId && teamStatsMap[teamBId]) {
        const t = teamStatsMap[teamBId]!;
        t.matchesPlayed++;
        if (isServiceMatch) t.serviceMatchesPlayed++;
        else t.rallyMatchesPlayed++;

        t.rankingPoints += matchWinnerSide === 'B' ? winnerRp : loserRp;
        t.pointsFor += sideBPoints;
        t.pointsAgainst += sideAPoints;
        t.pointDifference = t.pointsFor - t.pointsAgainst;
        t.gamesWon += sideBGames;
        t.gamesLost += sideAGames;
        t.shutoutWins += sideBShutouts;
        t.shutoutsConceded += sideAShutouts;

        const totalPts = t.pointsFor + t.pointsAgainst;
        t.pointSharePct = totalPts > 0 ? Number(((t.pointsFor / totalPts) * 100).toFixed(2)) : 0;

        if (matchWinnerSide === 'B') {
          t.wins++;
          t.currentStreak++;
          if (t.currentStreak > t.bestStreak) t.bestStreak = t.currentStreak;
        } else if (matchWinnerSide === 'A') {
          t.losses++;
          t.currentStreak = 0;
        }
        t.winRate = t.matchesPlayed > 0 ? Number(((t.wins / t.matchesPlayed) * 100).toFixed(2)) : 0;
        t.totalPointsWon += teamBPts;
        t.totalDrops += teamBDrps;
        t.netContribution = t.totalPointsWon - t.totalDrops;
      }
    }
  }

  return teamStatsMap;
}
