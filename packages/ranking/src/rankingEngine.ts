import {
  PlayerStats,
  TeamStats,
  RankingCategory,
  TeamRankingCategory,
  LeaderboardEntry,
  OverallRankingWeights,
  DEFAULT_RANKING_WEIGHTS,
  RankMovement,
} from './types.js';

export interface RankingSnapshotLookup {
  [id: string]: number; // id -> previous rank
}

/**
 * Calculates normalized overall score (0 - 100) based on weighted formula
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

  // 2. Point Difference Per Match Score (centered at 50, clamp 0 - 100)
  const ptDiffPerMatch = stats.pointDifference / stats.matchesPlayed;
  const ptDiffScore = Math.min(100, Math.max(0, 50 + ptDiffPerMatch * 5));

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

  const total =
    weights.winRateWeight * winRateScore +
    weights.pointDiffPerMatchWeight * ptDiffScore +
    weights.winsWeight * winsScore +
    weights.currentFormWeight * formScore +
    weights.consistencyWeight * consistencyScore;

  return Number(total.toFixed(2));
}

/**
 * Generates leaderboard for a specific player category with tiebreakers and rank sharing (1, 2, 2, 4)
 */
export function generatePlayerLeaderboard(
  statsList: PlayerStats[],
  category: RankingCategory,
  previousRanks: RankingSnapshotLookup = {},
  weights: OverallRankingWeights = DEFAULT_RANKING_WEIGHTS
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
      case 'MOST_WINS': {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;
        return a.displayName.localeCompare(b.displayName);
      }
      case 'MOST_POINTS': {
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
      const isTied = isPlayerTied(category, prev, player, maxWins, maxMatches, weights);
      if (!isTied) {
        currentRank = i + 1;
      }
    }

    const headlineValue = getHeadlineValue(category, player, maxWins, maxMatches, weights);
    const headlineFormatted = formatHeadline(category, headlineValue);

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
      headlineValue,
      headlineFormatted,
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
  weights: OverallRankingWeights
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
    case 'MOST_WINS':
      return a.wins === b.wins && a.winRate === b.winRate && a.pointDifference === b.pointDifference;
    case 'MOST_POINTS':
      return a.pointsScored === b.pointsScored && a.wins === b.wins;
    case 'MOST_LOSSES':
      return a.losses === b.losses && a.pointsConceded === b.pointsConceded;
    case 'MOST_DROPS_PLAYED':
      return (
        a.dropShotsPlayed === b.dropShotsPlayed &&
        a.dropShotWinners === b.dropShotWinners &&
        a.pointDifference === b.pointDifference
      );
    case 'MOST_DROPS_CONCEDED':
      return a.pointsConceded === b.pointsConceded && a.losses === b.losses;
    case 'MOST_UNFORCED_ERRORS':
      return a.unforcedErrors === b.unforcedErrors && a.pointsConceded === b.pointsConceded;
    case 'BEST_WIN_RATE':
      return (
        a.winRate === b.winRate &&
        a.matchesPlayed === b.matchesPlayed &&
        a.pointDifference === b.pointDifference
      );
  }
}

function getHeadlineValue(
  category: RankingCategory,
  p: PlayerStats,
  maxWins: number,
  maxMatches: number,
  weights: OverallRankingWeights
): number {
  switch (category) {
    case 'OVERALL':
      return calculateOverallScore(p, maxWins, maxMatches, weights);
    case 'MOST_WINS':
      return p.wins;
    case 'MOST_POINTS':
      return p.pointsScored;
    case 'MOST_LOSSES':
      return p.losses;
    case 'MOST_DROPS_PLAYED':
      return p.dropShotsPlayed;
    case 'MOST_DROPS_CONCEDED':
      return p.pointsConceded;
    case 'MOST_UNFORCED_ERRORS':
      return p.unforcedErrors;
    case 'BEST_WIN_RATE':
      return p.winRate;
  }
}

function formatHeadline(category: RankingCategory, val: number): string {
  switch (category) {
    case 'OVERALL':
      return `${val} pts`;
    case 'MOST_WINS':
      return `${val} Wins`;
    case 'MOST_POINTS':
      return `${val} Pts`;
    case 'MOST_LOSSES':
      return `${val} Losses`;
    case 'MOST_DROPS_PLAYED':
      return `${val} Drops`;
    case 'MOST_DROPS_CONCEDED':
      return `${val} Pts Conceded`;
    case 'MOST_UNFORCED_ERRORS':
      return `${val} Errors`;
    case 'BEST_WIN_RATE':
      return `${val}%`;
  }
}

/**
 * Generates leaderboard for teams/pairs
 */
export function generateTeamLeaderboard(
  teamsList: TeamStats[],
  category: TeamRankingCategory,
  previousRanks: RankingSnapshotLookup = {}
): LeaderboardEntry<TeamStats>[] {
  const candidates = [...teamsList];

  candidates.sort((a, b) => {
    switch (category) {
      case 'OVERALL_TEAM': {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;
        return b.wins - a.wins;
      }
      case 'MOST_TEAM_WINS': {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pointDifference - a.pointDifference;
      }
      case 'MOST_TEAM_LOSSES': {
        if (b.losses !== a.losses) return b.losses - a.losses;
        return b.pointsAgainst - a.pointsAgainst;
      }
      case 'BEST_TEAM_WIN_RATE': {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
        return b.pointDifference - a.pointDifference;
      }
      case 'BEST_POINT_DIFFERENCE': {
        if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;
        return b.winRate - a.winRate;
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

    let headlineValue = team.wins;
    let headlineFormatted = `${team.wins} Wins`;

    if (category === 'BEST_TEAM_WIN_RATE' || category === 'OVERALL_TEAM') {
      headlineValue = team.winRate;
      headlineFormatted = `${team.winRate}%`;
    } else if (category === 'MOST_TEAM_LOSSES') {
      headlineValue = team.losses;
      headlineFormatted = `${team.losses} Losses`;
    } else if (category === 'BEST_POINT_DIFFERENCE') {
      headlineValue = team.pointDifference;
      headlineFormatted = team.pointDifference >= 0 ? `+${team.pointDifference}` : `${team.pointDifference}`;
    }

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
    case 'BEST_TEAM_WIN_RATE':
      return (
        a.winRate === b.winRate &&
        a.pointDifference === b.pointDifference &&
        a.wins === b.wins &&
        a.matchesPlayed === b.matchesPlayed
      );
    case 'MOST_TEAM_WINS':
      return a.wins === b.wins && a.winRate === b.winRate && a.pointDifference === b.pointDifference;
    case 'MOST_TEAM_LOSSES':
      return a.losses === b.losses && a.pointsAgainst === b.pointsAgainst;
    case 'BEST_POINT_DIFFERENCE':
      return a.pointDifference === b.pointDifference && a.winRate === b.winRate;
  }
}
