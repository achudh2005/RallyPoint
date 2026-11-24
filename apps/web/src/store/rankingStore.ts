import { create } from 'zustand';
import {
  RankingCategory,
  TeamRankingCategory,
  LeaderboardEntry,
  PlayerStats,
  TeamStats,
  RankingMatch,
  RankingMatchEvent,
  ScoringSystemFilter,
  DEFAULT_RANKING_CONFIG,
  rebuildRankings,
} from '@rallypoint/ranking';

export interface CommunityPlayer {
  id: string;
  displayName: string;
  avatarUrl?: string;
  recent?: boolean;
}

export type TaggingMode = 'FAST' | 'QUICK' | 'FULL'; // Fast: score only, Quick: 3s chip row, Full: mandatory

export interface EditPointData {
  pointIndex: number;
  winnerSide: 'A' | 'B';
  pointWinnerPlayerId?: string;
  shotType?: 'SMASH' | 'DROP' | 'NET' | 'CLEAR' | 'DRIVE' | 'LOB' | 'SERVE';
  rallyEndResult?: 'WINNER' | 'UNFORCED_ERROR' | 'FORCED_ERROR' | 'OUT' | 'NET_FAULT' | 'SERVICE_FAULT';
  errorPlayerId?: string;
}

interface RankingStore {
  activeSeason: string;
  taggingMode: TaggingMode;
  selectedCategory: RankingCategory;
  scoringSystemFilter: ScoringSystemFilter;
  communityPlayers: CommunityPlayer[];
  recentPlayerIds: string[];
  matches: RankingMatch[];
  playerLeaderboards: Record<RankingCategory, LeaderboardEntry<PlayerStats>[]>;
  teamLeaderboards: Record<TeamRankingCategory, LeaderboardEntry<TeamStats>[]>;
  previousPlayerRanks: Record<string, number>;

  // Actions
  setTaggingMode: (mode: TaggingMode) => void;
  setSelectedCategory: (cat: RankingCategory) => void;
  setScoringSystemFilter: (filter: ScoringSystemFilter) => void;
  setActiveSeason: (season: string) => void;
  addCommunityPlayer: (name: string) => CommunityPlayer;
  autoSuggestDoublesPairs: (playerIds: string[]) => {
    pairA: [CommunityPlayer, CommunityPlayer];
    pairB: [CommunityPlayer, CommunityPlayer];
    balanceDelta: number;
  } | null;
  recalculateLiveRankings: () => void;
  attachMatch: (match: RankingMatch) => void;
  updateMatchEvents: (matchId: string, events: RankingMatchEvent[]) => void;
  editPastPoint: (matchId: string, edit: EditPointData) => void;
}

const INITIAL_COMMUNITY_PLAYERS: CommunityPlayer[] = [
  { id: 'cp-viktor', displayName: 'Viktor Axelsen', recent: true },
  { id: 'cp-lee', displayName: 'Lee Zii Jia', recent: true },
  { id: 'cp-momota', displayName: 'Kento Momota', recent: true },
  { id: 'cp-shi', displayName: 'Shi Yuqi', recent: true },
  { id: 'cp-ginting', displayName: 'Anthony Ginting', recent: true },
  { id: 'cp-jonatan', displayName: 'Jonatan Christie', recent: false },
  { id: 'cp-antonsen', displayName: 'Anders Antonsen', recent: false },
  { id: 'cp-loh', displayName: 'Loh Kean Yew', recent: false },
  { id: 'cp-sen', displayName: 'Lakshya Sen', recent: false },
  { id: 'cp-prannoy', displayName: 'H.S. Prannoy', recent: false },
];

const INITIAL_MATCHES: RankingMatch[] = [
  {
    id: 'comm-match-1',
    seasonId: 'Spring 2026 Community League',
    matchType: 'SINGLES',
    status: 'COMPLETED',
    winnerSide: 'A',
    participants: [
      { playerId: 'cp-viktor', displayName: 'Viktor Axelsen', side: 'A', position: 1 },
      { playerId: 'cp-lee', displayName: 'Lee Zii Jia', side: 'B', position: 1 },
    ],
    games: [
      { gameNumber: 1, scoreA: 21, scoreB: 15, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 21, scoreB: 17, winnerSide: 'A' },
    ],
    events: [
      { id: 'e1', sequenceNumber: 1, eventType: 'POINT', side: 'A', shotType: 'SMASH', rallyEndResult: 'WINNER', pointWinnerPlayerId: 'cp-viktor' },
      { id: 'e2', sequenceNumber: 2, eventType: 'POINT', side: 'B', shotType: 'DROP', rallyEndResult: 'WINNER', pointWinnerPlayerId: 'cp-lee' },
      { id: 'e3', sequenceNumber: 3, eventType: 'POINT', side: 'A', shotType: 'DROP', rallyEndResult: 'UNFORCED_ERROR', errorPlayerId: 'cp-lee', pointWinnerPlayerId: 'cp-viktor' },
    ],
  },
  {
    id: 'comm-match-2',
    seasonId: 'Spring 2026 Community League',
    matchType: 'SINGLES',
    status: 'COMPLETED',
    winnerSide: 'A',
    participants: [
      { playerId: 'cp-momota', displayName: 'Kento Momota', side: 'A', position: 1 },
      { playerId: 'cp-shi', displayName: 'Shi Yuqi', side: 'B', position: 1 },
    ],
    games: [
      { gameNumber: 1, scoreA: 21, scoreB: 18, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 21, scoreB: 19, winnerSide: 'A' },
    ],
    events: [
      { id: 'e4', sequenceNumber: 1, eventType: 'POINT', side: 'A', shotType: 'NET', rallyEndResult: 'WINNER', pointWinnerPlayerId: 'cp-momota' },
      { id: 'e5', sequenceNumber: 2, eventType: 'POINT', side: 'B', shotType: 'CLEAR', rallyEndResult: 'UNFORCED_ERROR', errorPlayerId: 'cp-momota', pointWinnerPlayerId: 'cp-shi' },
    ],
  },
];

const initialRebuild = rebuildRankings(INITIAL_MATCHES);

export const useRankingStore = create<RankingStore>((set, get) => ({
  activeSeason: 'Spring 2026 Community League',
  taggingMode: 'QUICK',
  selectedCategory: 'OVERALL',
  scoringSystemFilter: 'ALL',
  communityPlayers: INITIAL_COMMUNITY_PLAYERS,
  recentPlayerIds: ['cp-viktor', 'cp-lee', 'cp-momota', 'cp-shi'],
  matches: INITIAL_MATCHES,
  playerLeaderboards: initialRebuild.playerLeaderboards,
  teamLeaderboards: initialRebuild.teamLeaderboards,
  previousPlayerRanks: {},

  setTaggingMode: (mode) => set({ taggingMode: mode }),
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setScoringSystemFilter: (filter) => {
    set({ scoringSystemFilter: filter });
    get().recalculateLiveRankings();
  },
  setActiveSeason: (season) => set({ activeSeason: season }),

  addCommunityPlayer: (name) => {
    const newPlayer: CommunityPlayer = {
      id: `cp-${Date.now()}`,
      displayName: name.trim(),
      recent: true,
    };
    set((state) => ({
      communityPlayers: [newPlayer, ...state.communityPlayers],
      recentPlayerIds: [newPlayer.id, ...state.recentPlayerIds.slice(0, 5)],
    }));
    return newPlayer;
  },

  autoSuggestDoublesPairs: (selectedIds) => {
    const { communityPlayers, playerLeaderboards } = get();
    if (selectedIds.length !== 4) return null;

    const selectedPlayers = selectedIds
      .map((id) => communityPlayers.find((p) => p.id === id))
      .filter((p): p is CommunityPlayer => Boolean(p));

    if (selectedPlayers.length !== 4) return null;

    // Get current rating from OVERALL leaderboard or default
    const overallBoard = playerLeaderboards.OVERALL || [];
    const getRating = (id: string): number => {
      const entry = overallBoard.find((e) => e.id === id);
      return entry ? entry.headlineValue : 50;
    };

    // Sort 4 players by descending skill rank
    const ranked = [...selectedPlayers].sort((a, b) => getRating(b.id) - getRating(a.id));

    // Balanced pairing: (Rank 1 + Rank 4) vs (Rank 2 + Rank 3)
    const pairA: [CommunityPlayer, CommunityPlayer] = [ranked[0]!, ranked[3]!];
    const pairB: [CommunityPlayer, CommunityPlayer] = [ranked[1]!, ranked[2]!];

    const scoreA = getRating(pairA[0].id) + getRating(pairA[1].id);
    const scoreB = getRating(pairB[0].id) + getRating(pairB[1].id);
    const balanceDelta = Number(Math.abs(scoreA - scoreB).toFixed(2));

    return { pairA, pairB, balanceDelta };
  },

  recalculateLiveRankings: () => {
    const { matches, previousPlayerRanks, scoringSystemFilter } = get();
    const result = rebuildRankings(
      matches,
      { OVERALL: previousPlayerRanks },
      {},
      DEFAULT_RANKING_CONFIG,
      scoringSystemFilter
    );

    // Update previousPlayerRanks for next movement delta
    const currentRanks: Record<string, number> = {};
    if (result.playerLeaderboards.OVERALL) {
      for (const entry of result.playerLeaderboards.OVERALL) {
        currentRanks[entry.id] = entry.rank;
      }
    }

    set({
      playerLeaderboards: result.playerLeaderboards,
      teamLeaderboards: result.teamLeaderboards,
      previousPlayerRanks: currentRanks,
    });
  },

  attachMatch: (match) => {
    set((state) => {
      const existingIdx = state.matches.findIndex((m) => m.id === match.id);
      let updatedMatches: RankingMatch[];
      if (existingIdx >= 0) {
        updatedMatches = [...state.matches];
        updatedMatches[existingIdx] = match;
      } else {
        updatedMatches = [...state.matches, match];
      }
      return { matches: updatedMatches };
    });
    get().recalculateLiveRankings();
  },

  updateMatchEvents: (matchId, events) => {
    set((state) => {
      const updated = state.matches.map((m) => (m.id === matchId ? { ...m, events } : m));
      return { matches: updated };
    });
    get().recalculateLiveRankings();
  },

  editPastPoint: (matchId, edit) => {
    const { matches } = get();
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    // Filter score-bearing events to find the target point
    const pointEvents = match.events.filter((e) => e.eventType === 'POINT');
    if (edit.pointIndex < 0 || edit.pointIndex >= pointEvents.length) return;

    const targetEvent = pointEvents[edit.pointIndex]!;
    const updatedEvents = match.events.map((e) => {
      if (e.id === targetEvent.id) {
        return {
          ...e,
          side: edit.winnerSide,
          pointWinnerPlayerId: edit.pointWinnerPlayerId,
          shotType: edit.shotType,
          rallyEndResult: edit.rallyEndResult,
          errorPlayerId: edit.errorPlayerId,
        };
      }
      return e;
    });

    get().updateMatchEvents(matchId, updatedEvents);
  },
}));
