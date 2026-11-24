import { Server, Socket, Namespace } from 'socket.io';
import { rebuildRankings, RankingCategory } from '@rallypoint/ranking';
import {
  getCachedMatches,
  appendMatchEvent,
  invalidateRankingCache,
} from '../services/rankingService.js';

export interface RankUpdateDiff {
  playerId: string;
  playerName: string;
  category: RankingCategory;
  oldRank: number | null;
  newRank: number;
  movement: 'UP' | 'DOWN' | 'SAME';
}

let rankingNamespace: Namespace | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let previousCategoryRanks: Record<string, Record<string, number>> = {};

export function setupRankingSockets(io: Server): Namespace {
  rankingNamespace = io.of('/rankings');

  // Initialize previous ranks baseline
  const initialMatches = getCachedMatches();
  const initialRebuild = rebuildRankings(initialMatches);
  for (const [cat, entries] of Object.entries(initialRebuild.playerLeaderboards)) {
    previousCategoryRanks[cat] = {};
    for (const e of entries) {
      previousCategoryRanks[cat][e.id] = e.rank;
    }
  }

  rankingNamespace.on('connection', (socket: Socket) => {
    // Send initial snapshot on connect
    const matches = getCachedMatches();
    const current = rebuildRankings(matches);
    socket.emit('rankings:initial', {
      leaderboards: current.playerLeaderboards,
      teamLeaderboards: current.teamLeaderboards,
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return rankingNamespace;
}

/**
 * Triggered whenever a point event occurs during live match play.
 * Debounces by 500ms, recomputes rankings, and emits `rankings:update` diff payload.
 */
export function handleLivePointEvent(
  matchId: string,
  event: any,
  onDiffCalculated?: (diffs: RankUpdateDiff[]) => void
): void {
  // Append event to match
  appendMatchEvent(matchId, event);
  invalidateRankingCache();

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    const diffs = computeAndEmitRankingDiffs();
    if (onDiffCalculated) {
      onDiffCalculated(diffs);
    }
  }, 500);
}

/**
 * Recomputes leaderboards and emits only the changed rows
 */
export function computeAndEmitRankingDiffs(): RankUpdateDiff[] {
  const matches = getCachedMatches();
  const newRebuild = rebuildRankings(matches);
  const diffs: RankUpdateDiff[] = [];

  const categories: RankingCategory[] = [
    'OVERALL',
    'MOST_MVPS',
    'BEST_CLUTCH_PLAYER',
    'SERVE_WINNER',
    'LONGEST_STREAK',
    'TOP_POINT_SCORERS',
    'MOST_DROPS',
    'BEST_NET_CONTRIBUTION',
    'MOST_WINS',
    'MOST_POINTS',
    'MOST_LOSSES',
    'MOST_DROPS_PLAYED',
    'MOST_UNFORCED_ERRORS',
    'BEST_WIN_RATE',
  ];

  for (const cat of categories) {
    const newBoard = newRebuild.playerLeaderboards[cat] || [];
    const prevMap = previousCategoryRanks[cat] || {};
    const nextMap: Record<string, number> = {};

    for (const entry of newBoard) {
      const pId = entry.id;
      const oldRank = prevMap[pId] ?? null;
      const newRank = entry.rank;
      nextMap[pId] = newRank;

      if (oldRank !== newRank) {
        let movement: 'UP' | 'DOWN' | 'SAME' = 'SAME';
        if (oldRank === null) {
          movement = 'UP';
        } else if (newRank < oldRank) {
          movement = 'UP'; // e.g. from 3 to 1
        } else if (newRank > oldRank) {
          movement = 'DOWN'; // e.g. from 1 to 2
        }

        diffs.push({
          playerId: pId,
          playerName: entry.name,
          category: cat,
          oldRank,
          newRank,
          movement,
        });
      }
    }

    previousCategoryRanks[cat] = nextMap;
  }

  if (rankingNamespace && diffs.length > 0) {
    rankingNamespace.emit('rankings:update', {
      timestamp: new Date().toISOString(),
      updatesCount: diffs.length,
      updates: diffs,
    });
  }

  return diffs;
}
