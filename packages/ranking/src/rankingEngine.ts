import {
  PlayerStats,
  TeamStats,
  RankingCategory,
  TeamRankingCategory,
  LeaderboardEntry,
  OverallRankingWeights,
  DEFAULT_RANKING_WEIGHTS,
  RankMovement,
  ScoringSystemFilter,
} from './types.js';

export interface RankingSnapshotLookup {
  [id: string]: number; // id -> previous rank
}

/**
 * Calculates normalized overall score (0 - 100) based on weighted formula.
 * Normalizes point differential using pointSharePct so 21-pt rally and 15-pt service results are directly comparable.
 */
export function calculateOverallScore(
  stats: PlayerStats,
  maxWins: number,
  maxMatches: number,
  weights: OverallRankingWeights = DEFAULT_RANKING_WEIGHTS
): number {
  if (stats.matchesPlayed === 0) return 0;

  // 1. Win Rate Score (0 - 100)
  const winRateScore = stats.winRate;

  // 2. Point Difference / Share Per Match Score (centered at 50, clamp 0 - 100)
  const ptDiffPerMatch = stats.pointDifference / stats.matchesPlayed;
  let ptDiffScore = Math.min(100, Math.max(0, 50 + ptDiffPerMatch * 5));
  if (stats.pointSharePct > 0) {
    ptDiffScore = (ptDiffScore + stats.pointSharePct) / 2;
  }

  // 3. Wins Volume Score (0 - 100)
  const winsScore = maxWins > 0 ? (stats.wins / maxWins) * 100 : 0;

  // 4. Current Form Score (0 - 100 based on last 5 results)
  let formScore = 50;
  if (stats.currentForm.length > 0) {
    const winsInForm = stats.currentForm.filter((r) => r === 'W').length;
    formScore = (winsInForm / stats.currentForm.length) * 100;
  }

  // 5. Consistency Score (0 - 100 based on match volume engagement)
  const consistencyScore = maxMatches > 0 ? (stats.matchesPlayed / maxMatches) * 100 : 0;

  // 6. Net Contribution Score (if weight configured)
  const netWeight = weights.netContributionWeight ?? 0;
  let netContributionScore = 50;
  if (netWeight > 0) {
    const netPerMatch = stats.matchesPlayed > 0 ? stats.netContribution / stats.matchesPlayed : 0;
    netContributionScore = Math.min(100, Math.max(0, 50 + netPerMatch * 5));
  }

  const total =
    weights.winRateWeight * winRateScore +
    weights.pointDiffPerMatchWeight * ptDiffScore +
    weights.winsWeight * winsScore +
    weights.currentFormWeight * formScore +
    weights.consistencyWeight * consistencyScore +
    netWeight * netContributionScore;

  return Number(total.toFixed(2));
}

/**
 * Generates leaderboard for a specific player category with tiebreakers and rank sharing (1, 2, 2, 4)
 */
export function generatePlayerLeaderboard(
  statsList: PlayerStats[],
  category: RankingCategory,
  previousRanks: RankingSnapshotLookup = {},
  weights: OverallRankingWeights = DEFAULT_RANKING_WEIGHTS,
  formatFilter: ScoringSystemFilter = 'ALL'
): LeaderboardEntry<PlayerStats>[] {
  const maxWins = Math.max(0, ...statsList.map((s) => s.wins));
  const maxMatches = Math.max(0, ...statsList.map((s) => s.matchesPlayed));

  // Filter for minimum matches if category requires it (e.g. BEST_WIN_RATE)
  let candidates = [...statsList];
  if (category === 'BEST_WIN_RATE') {
    candidates = candidates.filter((s) => s.matchesPlayed >= weights.minMatchesThreshold);
  }

  // Sorting comparator based on category requirements and tiebreakers
  candidates.sort((a, b) => {
    switch (category) {
      case 'OVERALL': {
        const scoreA = calculateOverallScore(a, maxWins, maxMatches, weights);
        const scoreB = calculateOverallScore(b, maxWins, maxMatches, weights);
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;
        return b.wins - a.wins;
      }
      case 'LEAGUE_TABLE': {
        if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pointDifference - a.pointDifference;
      }
      case 'TOP_POINT_SCORERS': {
        if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
        if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;
        return b.wins - a.wins;
      }
      case 'MOST_DROPS': {
        if (b.drops !== a.drops) return b.drops - a.drops;
        if (b.pointsConceded !== a.pointsConceded) return b.pointsConceded - a.pointsConceded;
        return b.losses - a.losses;
      }
      case 'BEST_NET_CONTRIBUTION': {
        if (b.netContribution !== a.netContribution) return b.netContribution - a.netContribution;
        if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
        return b.winRate - a.winRate;
      }
      case 'MOST_WINS': {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;
        return a.displayName.localeCompare(b.displayName);
      }
      case 'MOST_POINTS': {
        if (formatFilter === 'ALL' && (b.pointSharePct > 0 || a.pointSharePct > 0)) {
          if (b.pointSharePct !== a.pointSharePct) return b.pointSharePct - a.pointSharePct;
          if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;
          return b.wins - a.wins;
        }
        if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;
        const ppmA = a.matchesPlayed > 0 ? a.pointsScored / a.matchesPlayed : 0;
        const ppmB = b.matchesPlayed > 0 ? b.pointsScored / b.matchesPlayed : 0;
        if (ppmB !== ppmA) return ppmB - ppmA;
        return b.wins - a.wins;
      }
      case 'MOST_LOSSES': {
        if (b.losses !== a.losses) return b.losses - a.losses;
        const lossRateA = a.matchesPlayed > 0 ? a.losses / a.matchesPlayed : 0;
        const lossRateB = b.matchesPlayed > 0 ? b.losses / b.matchesPlayed : 0;
        if (lossRateB !== lossRateA) return lossRateB - lossRateA;
        return b.pointsConceded - a.pointsConceded;
      }
      case 'MOST_DROPS_PLAYED': {
        if (b.dropShotsPlayed !== a.dropShotsPlayed) return b.dropShotsPlayed - a.dropShotsPlayed;
        if (b.dropShotWinners !== a.dropShotWinners) return b.dropShotWinners - a.dropShotWinners;
        return b.pointDifference - a.pointDifference;
      }
      case 'MOST_DROPS_CONCEDED': {
        if (b.pointsConceded !== a.pointsConceded) return b.pointsConceded - a.pointsConceded;
        const pcmA = a.matchesPlayed > 0 ? a.pointsConceded / a.matchesPlayed : 0;
        const pcmB = b.matchesPlayed > 0 ? b.pointsConceded / b.matchesPlayed : 0;
        if (pcmB !== pcmA) return pcmB - pcmA;
        return b.losses - a.losses;
      }
      case 'MOST_UNFORCED_ERRORS': {
        if (b.unforcedErrors !== a.unforcedErrors) return b.unforcedErrors - a.unforcedErrors;
        const errRateA = a.matchesPlayed > 0 ? a.unforcedErrors / a.matchesPlayed : 0;
        const errRateB = b.matchesPlayed > 0 ? b.unforcedErrors / b.matchesPlayed : 0;
        if (errRateB !== errRateA) return errRateB - errRateA;
        return b.pointsConceded - a.pointsConceded;
      }
      case 'BEST_WIN_RATE': {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
        return b.pointDifference - a.pointDifference;
      }
      case 'BEST_SERVICE_GAME': {
        if (b.serviceHolds !== a.serviceHolds) return b.serviceHolds - a.serviceHolds;
        if (b.sideOutsWon !== a.sideOutsWon) return b.sideOutsWon - a.sideOutsWon;
        return b.servicePointsWon - a.servicePointsWon;
      }
    }
  });

  // Assign ranks with tie handling (1, 2, 2, 4)
  const leaderboard: LeaderboardEntry<PlayerStats>[] = [];
  let currentRank = 1;

  for (let i = 0; i < candidates.length; i++) {
    const player = candidates[i]!;

    // Check tie with previous candidate
    if (i > 0) {
      const prev = candidates[i - 1]!;
      const isTied = isPlayerTied(category, prev, player, maxWins, maxMatches, weights, formatFilter);
      if (!isTied) {
        currentRank = i + 1;
      }
    }

    const headlineValue = getHeadlineValue(category, player, maxWins, maxMatches, weights);
    const headlineFormatted = formatHeadline(category, headlineValue);

    let secondaryValue: number | undefined;
    let secondaryFormatted: string | undefined;

    if (category === 'MOST_POINTS' && formatFilter === 'ALL') {
      secondaryValue = player.pointsScored;
      secondaryFormatted = `${player.pointsScored} pts`;
    }

    // Compute rank movement
    const prevRank = previousRanks[player.playerId];
    let rankMovement: RankMovement = 'SAME';
    let movementDelta = 0;

    if (prevRank !== undefined) {
      if (prevRank > currentRank) {
        rankMovement = 'UP';
        movementDelta = prevRank - currentRank;
      } else if (prevRank < currentRank) {
        rankMovement = 'DOWN';
        movementDelta = currentRank - prevRank;
      }
    }

    leaderboard.push({
      rank: currentRank,
      id: player.playerId,
      name: player.displayName,
      matchesPlayed: player.matchesPlayed,
      matchesSplitFormatted: player.matchesSplitFormatted,
      headlineValue,
      headlineFormatted,
      secondaryValue,
      secondaryFormatted,
      rankMovement,
      movementDelta,
      stats: player,
    });
  }

  return leaderboard;
}

function isPlayerTied(
  category: RankingCategory,
  a: PlayerStats,
  b: PlayerStats,
  maxWins: number,
  maxMatches: number,
  weights: OverallRankingWeights,
  formatFilter: ScoringSystemFilter
): boolean {
  switch (category) {
    case 'OVERALL':
      return (
        calculateOverallScore(a, maxWins, maxMatches, weights) ===
          calculateOverallScore(b, maxWins, maxMatches, weights) &&
        a.winRate === b.winRate &&
        a.pointDifference === b.pointDifference &&
        a.wins === b.wins
      );
    case 'LEAGUE_TABLE':
      return (
        a.rankingPoints === b.rankingPoints &&
        a.wins === b.wins &&
        a.winRate === b.winRate &&
        a.pointDifference === b.pointDifference
      );
    case 'TOP_POINT_SCORERS':
      return a.pointsWon === b.pointsWon && a.pointDifference === b.pointDifference;
    case 'MOST_DROPS':
      return a.drops === b.drops && a.pointsConceded === b.pointsConceded;
    case 'BEST_NET_CONTRIBUTION':
      return a.netContribution === b.netContribution && a.pointsWon === b.pointsWon;
    case 'MOST_WINS':
      return (
        a.wins === b.wins &&
        a.winRate === b.winRate &&
        a.pointDifference === b.pointDifference
      );
    case 'MOST_POINTS':
      if (formatFilter === 'ALL' && a.pointSharePct !== undefined && b.pointSharePct !== undefined) {
        return a.pointSharePct === b.pointSharePct && a.wins === b.wins;
      }
      return a.pointsScored === b.pointsScored && a.wins === b.wins;
    case 'MOST_LOSSES':
      return a.losses === b.losses && a.pointsConceded === b.pointsConceded;
    case 'MOST_DROPS_PLAYED':
      return a.dropShotsPlayed === b.dropShotsPlayed && a.dropShotWinners === b.dropShotWinners;
    case 'MOST_DROPS_CONCEDED':
      return a.pointsConceded === b.pointsConceded && a.losses === b.losses;
    case 'MOST_UNFORCED_ERRORS':
      return a.unforcedErrors === b.unforcedErrors;
    case 'BEST_WIN_RATE':
      return a.winRate === b.winRate && a.matchesPlayed === b.matchesPlayed;
    case 'BEST_SERVICE_GAME':
      return a.serviceHolds === b.serviceHolds && a.sideOutsWon === b.sideOutsWon;
  }
}

function getHeadlineValue(
  category: RankingCategory,
  stats: PlayerStats,
  maxWins: number,
  maxMatches: number,
  weights: OverallRankingWeights
): number {
  switch (category) {
    case 'OVERALL':
      return calculateOverallScore(stats, maxWins, maxMatches, weights);
    case 'LEAGUE_TABLE':
      return stats.rankingPoints;
    case 'TOP_POINT_SCORERS':
      return stats.pointsWon;
    case 'MOST_DROPS':
      return stats.drops;
    case 'BEST_NET_CONTRIBUTION':
      return stats.netContribution;
    case 'MOST_WINS':
      return stats.wins;
    case 'MOST_POINTS':
      return stats.pointsScored;
    case 'MOST_LOSSES':
      return stats.losses;
    case 'MOST_DROPS_PLAYED':
      return stats.dropShotsPlayed;
    case 'MOST_DROPS_CONCEDED':
      return stats.pointsConceded;
    case 'MOST_UNFORCED_ERRORS':
      return stats.unforcedErrors;
    case 'BEST_WIN_RATE':
      return stats.winRate;
    case 'BEST_SERVICE_GAME':
      return stats.serviceHolds;
  }
}

function formatHeadline(
  category: RankingCategory,
  value: number
): string {
  switch (category) {
    case 'OVERALL':
      return `${value.toFixed(1)} Pts`;
    case 'LEAGUE_TABLE':
      return `${value} RP`;
    case 'TOP_POINT_SCORERS':
      return `${value} Pts Won`;
    case 'MOST_DROPS':
      return `${value} Drops`;
    case 'BEST_NET_CONTRIBUTION':
      return `${value > 0 ? '+' : ''}${value} Net`;
    case 'MOST_WINS':
      return `${value} Wins`;
    case 'MOST_POINTS':
      return `${value} Pts`;
    case 'MOST_LOSSES':
      return `${value} Losses`;
    case 'MOST_DROPS_PLAYED':
      return `${value} Drops`;
    case 'MOST_DROPS_CONCEDED':
      return `${value} Pts Conceded`;
    case 'MOST_UNFORCED_ERRORS':
      return `${value} Errors`;
    case 'BEST_WIN_RATE':
      return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
    case 'BEST_SERVICE_GAME':
      return `${value} Holds`;
  }
}

/**
 * Generates leaderboard for team ranking categories
 */
export function generateTeamLeaderboard(
  statsList: TeamStats[],
  category: TeamRankingCategory,
  previousRanks: RankingSnapshotLookup = {}
): LeaderboardEntry<TeamStats>[] {
  const candidates = [...statsList];

  candidates.sort((a, b) => {
    switch (category) {
      case 'OVERALL_TEAM': {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pointDifference - a.pointDifference;
      }
      case 'TEAM_LEAGUE_TABLE': {
        if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pointDifference - a.pointDifference;
      }
      case 'MOST_TEAM_WINS': {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pointDifference - a.pointDifference;
      }
      case 'MOST_TEAM_LOSSES': {
        if (b.losses !== a.losses) return b.losses - a.losses;
        return a.pointDifference - b.pointDifference;
      }
      case 'BEST_TEAM_WIN_RATE': {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.matchesPlayed - a.matchesPlayed;
      }
      case 'BEST_POINT_DIFFERENCE': {
        if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;
        return b.wins - a.wins;
      }
    }
  });

  const leaderboard: LeaderboardEntry<TeamStats>[] = [];
  let currentRank = 1;

  for (let i = 0; i < candidates.length; i++) {
    const team = candidates[i]!;

    if (i > 0) {
      const prev = candidates[i - 1]!;
      const isTied = isTeamTied(category, prev, team);
      if (!isTied) {
        currentRank = i + 1;
      }
    }

    const headlineValue = getTeamHeadlineValue(category, team);
    const headlineFormatted = formatTeamHeadline(category, headlineValue);

    const prevRank = previousRanks[team.teamId];
    let rankMovement: RankMovement = 'SAME';
    let movementDelta = 0;

    if (prevRank !== undefined) {
      if (prevRank > currentRank) {
        rankMovement = 'UP';
        movementDelta = prevRank - currentRank;
      } else if (prevRank < currentRank) {
        rankMovement = 'DOWN';
        movementDelta = currentRank - prevRank;
      }
    }

    leaderboard.push({
      rank: currentRank,
      id: team.teamId,
      name: team.name,
      matchesPlayed: team.matchesPlayed,
      matchesSplitFormatted: `R:${team.rallyMatchesPlayed} S:${team.serviceMatchesPlayed}`,
      headlineValue,
      headlineFormatted,
      rankMovement,
      movementDelta,
      stats: team,
    });
  }

  return leaderboard;
}

function isTeamTied(category: TeamRankingCategory, a: TeamStats, b: TeamStats): boolean {
  switch (category) {
    case 'OVERALL_TEAM':
    case 'MOST_TEAM_WINS':
      return a.wins === b.wins && a.winRate === b.winRate && a.pointDifference === b.pointDifference;
    case 'TEAM_LEAGUE_TABLE':
      return a.rankingPoints === b.rankingPoints && a.wins === b.wins && a.winRate === b.winRate;
    case 'MOST_TEAM_LOSSES':
      return a.losses === b.losses && a.pointDifference === b.pointDifference;
    case 'BEST_TEAM_WIN_RATE':
      return a.winRate === b.winRate && a.matchesPlayed === b.matchesPlayed;
    case 'BEST_POINT_DIFFERENCE':
      return a.pointDifference === b.pointDifference && a.wins === b.wins;
  }
}

function getTeamHeadlineValue(category: TeamRankingCategory, team: TeamStats): number {
  switch (category) {
    case 'OVERALL_TEAM':
    case 'MOST_TEAM_WINS':
      return team.wins;
    case 'TEAM_LEAGUE_TABLE':
      return team.rankingPoints;
    case 'MOST_TEAM_LOSSES':
      return team.losses;
    case 'BEST_TEAM_WIN_RATE':
      return team.winRate;
    case 'BEST_POINT_DIFFERENCE':
      return team.pointDifference;
  }
}

function formatTeamHeadline(category: TeamRankingCategory, value: number): string {
  switch (category) {
    case 'OVERALL_TEAM':
    case 'MOST_TEAM_WINS':
      return `${value} Wins`;
    case 'TEAM_LEAGUE_TABLE':
      return `${value} RP`;
    case 'MOST_TEAM_LOSSES':
      return `${value} Losses`;
    case 'BEST_TEAM_WIN_RATE':
      return `${value.toFixed(1)}%`;
    case 'BEST_POINT_DIFFERENCE':
      return `${value > 0 ? '+' : ''}${value}`;
  }
}
