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

export type PlayerStatus = 'ACTIVE' | 'ARCHIVED' | 'HIDDEN';

export interface CommunityPlayer {
  id: string;
  displayName: string;
  nickname?: string;
  avatarUrl?: string;
  phone?: string;
  note?: string;
  status?: PlayerStatus;
  archivedAt?: string;
  recent?: boolean;
  createdAt?: string;
}

export type AddPlayerInput =
  | string
  | {
      displayName: string;
      nickname?: string;
      avatarUrl?: string;
      phone?: string;
      note?: string;
    };

export type RemovePlayerResult =
  | { outcome: 'deleted'; player: CommunityPlayer }
  | { outcome: 'archived' | 'hidden'; player: CommunityPlayer }
  | { outcome: 'blocked_live'; player: CommunityPlayer }
  | { outcome: 'not_found' };

export type TaggingMode = 'FAST' | 'QUICK' | 'FULL'; // Fast: score only, Quick: 3s chip row, Full: mandatory

export interface EditPointData {
  pointIndex: number;
  winnerSide: 'A' | 'B';
  pointWinnerPlayerId?: string;
  shotType?: 'SMASH' | 'DROP' | 'NET' | 'CLEAR' | 'DRIVE' | 'LOB' | 'SERVE';
  rallyEndResult?: 'WINNER' | 'UNFORCED_ERROR' | 'FORCED_ERROR' | 'OUT' | 'NET_FAULT' | 'SERVICE_FAULT';
  errorPlayerId?: string;
}

const RANKING_STORAGE_KEY = 'rallypoint_ranking_state_v2';
const LEGACY_KEYS = ['rallypoint_match_history', 'rallypoint_onboarding_completed'];

interface PersistedRankingState {
  activeSeason: string;
  communityPlayers: CommunityPlayer[];
  recentPlayerIds: string[];
  matches: RankingMatch[];
}

function loadPersistedState(): {
  persisted: PersistedRankingState | null;
  hasLegacyData: boolean;
} {
  try {
    if (typeof localStorage === 'undefined') {
      return { persisted: null, hasLegacyData: false };
    }
    const raw = localStorage.getItem(RANKING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedRankingState>;
      return {
        persisted: {
          activeSeason: parsed.activeSeason || 'Season 1',
          communityPlayers: Array.isArray(parsed.communityPlayers) ? parsed.communityPlayers : [],
          recentPlayerIds: Array.isArray(parsed.recentPlayerIds) ? parsed.recentPlayerIds : [],
          matches: Array.isArray(parsed.matches) ? parsed.matches : [],
        },
        hasLegacyData: false,
      };
    }
    const hasLegacyData = LEGACY_KEYS.some((k) => Boolean(localStorage.getItem(k)));
    return { persisted: null, hasLegacyData };
  } catch {
    return { persisted: null, hasLegacyData: false };
  }
}

function savePersistedState(state: PersistedRankingState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or test environment errors
  }
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
}

function buildFilteredLeaderboards(
  matches: RankingMatch[],
  communityPlayers: CommunityPlayer[],
  previousPlayerRanks: Record<string, number>,
  scoringSystemFilter: ScoringSystemFilter
) {
  const playerMap = new Map(communityPlayers.map((p) => [p.id, p]));
  const hiddenIds = new Set(
    communityPlayers.filter((p) => p.status === 'HIDDEN').map((p) => p.id)
  );

  // Resolve latest displayName onto match participants so renames propagate everywhere
  const normalizedMatches: RankingMatch[] = matches.map((m) => ({
    ...m,
    participants: m.participants.map((p) => {
      const latest = playerMap.get(p.playerId);
      return latest ? { ...p, displayName: latest.displayName } : p;
    }),
  }));

  const raw = rebuildRankings(
    normalizedMatches,
    { OVERALL: previousPlayerRanks },
    {},
    DEFAULT_RANKING_CONFIG,
    scoringSystemFilter
  );

  const playerLeaderboards = { ...raw.playerLeaderboards };
  for (const cat of Object.keys(playerLeaderboards) as RankingCategory[]) {
    const filtered = (playerLeaderboards[cat] || [])
      .filter((entry) => !hiddenIds.has(entry.id))
      .map((entry, idx) => {
        const latest = playerMap.get(entry.id);
        return {
          ...entry,
          name: latest?.displayName ?? entry.name,
          rank: idx + 1,
        };
      });
    playerLeaderboards[cat] = filtered;
  }

  const teamLeaderboards = { ...raw.teamLeaderboards };
  for (const cat of Object.keys(teamLeaderboards) as TeamRankingCategory[]) {
    const filtered = (teamLeaderboards[cat] || [])
      .filter((entry) => {
        const ids = entry.stats?.playerIds || [];
        return !ids.some((id) => hiddenIds.has(id));
      })
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      }));
    teamLeaderboards[cat] = filtered;
  }

  return { playerLeaderboards, teamLeaderboards };
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
  pendingUpgradePrompt: boolean;

  // Actions
  setTaggingMode: (mode: TaggingMode) => void;
  setSelectedCategory: (cat: RankingCategory) => void;
  setScoringSystemFilter: (filter: ScoringSystemFilter) => void;
  setActiveSeason: (season: string) => void;
  getPlayerMatchCount: (playerId: string) => number;
  validatePlayerName: (name: string, excludePlayerId?: string) => string | null;
  findSimilarPlayers: (name: string, excludePlayerId?: string) => CommunityPlayer[];
  addCommunityPlayer: (input: AddPlayerInput) => CommunityPlayer;
  bulkAddPlayers: (rawText: string) => { added: CommunityPlayer[]; skipped: string[] };
  updateCommunityPlayer: (
    playerId: string,
    updates: {
      displayName?: string;
      nickname?: string;
      avatarUrl?: string;
      phone?: string;
      note?: string;
    }
  ) => void;
  removeCommunityPlayer: (
    playerId: string,
    options?: { mode?: 'archive' | 'hide'; livePlayerIds?: string[] }
  ) => RemovePlayerResult;
  restoreCommunityPlayer: (playerId: string) => void;
  undoRemovePlayer: (snapshot: { player: CommunityPlayer; wasHardDeleted: boolean }) => void;
  mergePlayers: (sourcePlayerId: string, targetPlayerId: string) => void;
  resetAllData: () => void;
  resolveUpgradePrompt: (choice: 'fresh' | 'keep') => void;
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

const { persisted, hasLegacyData } = loadPersistedState();
const initialPlayers = persisted?.communityPlayers ?? [];
const initialMatches = persisted?.matches ?? [];
const initialRecentIds = persisted?.recentPlayerIds ?? [];
const initialSeason = persisted?.activeSeason ?? 'Season 1';
const initialRebuild = buildFilteredLeaderboards(initialMatches, initialPlayers, {}, 'ALL');

export const useRankingStore = create<RankingStore>((set, get) => ({
  activeSeason: initialSeason,
  taggingMode: 'QUICK',
  selectedCategory: 'OVERALL',
  scoringSystemFilter: 'ALL',
  communityPlayers: initialPlayers,
  recentPlayerIds: initialRecentIds,
  matches: initialMatches,
  playerLeaderboards: initialRebuild.playerLeaderboards,
  teamLeaderboards: initialRebuild.teamLeaderboards,
  previousPlayerRanks: {},
  pendingUpgradePrompt: hasLegacyData,

  setTaggingMode: (mode) => set({ taggingMode: mode }),
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setScoringSystemFilter: (filter) => {
    set({ scoringSystemFilter: filter });
    get().recalculateLiveRankings();
  },
  setActiveSeason: (season) => {
    set({ activeSeason: season });
    const s = get();
    savePersistedState({
      activeSeason: season,
      communityPlayers: s.communityPlayers,
      recentPlayerIds: s.recentPlayerIds,
      matches: s.matches,
    });
  },

  getPlayerMatchCount: (playerId) => {
    return get().matches.filter((m) =>
      m.participants.some((p) => p.playerId === playerId)
    ).length;
  },

  validatePlayerName: (name, excludePlayerId) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return 'Name must be at least 2 characters';
    if (trimmed.length > 30) return 'Name must be 30 characters or less';
    const duplicate = get().communityPlayers.find(
      (p) =>
        p.id !== excludePlayerId &&
        p.displayName.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) return `"${duplicate.displayName}" already exists`;
    return null;
  },

  findSimilarPlayers: (name, excludePlayerId) => {
    const q = name.trim().toLowerCase();
    if (q.length < 2) return [];
    const qFirst = q.split(/\s+/)[0] || q;
    return get().communityPlayers.filter((p) => {
      if (p.id === excludePlayerId) return false;
      const candidate = p.displayName.trim().toLowerCase();
      if (candidate === q) return false;
      const cFirst = candidate.split(/\s+/)[0] || candidate;
      return (
        candidate.includes(q) ||
        q.includes(candidate) ||
        (qFirst.length >= 2 && cFirst === qFirst) ||
        levenshtein(q, candidate) <= 2
      );
    });
  },

  addCommunityPlayer: (input) => {
    const payload = typeof input === 'string' ? { displayName: input } : input;
    const trimmed = payload.displayName.trim();
    const newPlayer: CommunityPlayer = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      displayName: trimmed,
      nickname: payload.nickname?.trim() || undefined,
      avatarUrl: payload.avatarUrl || undefined,
      phone: payload.phone?.trim() || undefined,
      note: payload.note?.trim() || undefined,
      status: 'ACTIVE',
      recent: true,
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const communityPlayers = [newPlayer, ...state.communityPlayers];
      const recentPlayerIds = [newPlayer.id, ...state.recentPlayerIds.slice(0, 5)];
      savePersistedState({
        activeSeason: state.activeSeason,
        communityPlayers,
        recentPlayerIds,
        matches: state.matches,
      });
      return { communityPlayers, recentPlayerIds };
    });
    return newPlayer;
  },

  bulkAddPlayers: (rawText) => {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const added: CommunityPlayer[] = [];
    const skipped: string[] = [];

    for (const line of lines) {
      const error = get().validatePlayerName(line);
      if (error) {
        skipped.push(`${line} (${error})`);
      } else {
        added.push(get().addCommunityPlayer(line));
      }
    }
    return { added, skipped };
  },

  updateCommunityPlayer: (playerId, updates) => {
    set((state) => {
      const communityPlayers = state.communityPlayers.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          displayName: updates.displayName !== undefined ? updates.displayName.trim() : p.displayName,
          nickname: updates.nickname !== undefined ? updates.nickname.trim() || undefined : p.nickname,
          avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl || undefined : p.avatarUrl,
          phone: updates.phone !== undefined ? updates.phone.trim() || undefined : p.phone,
          note: updates.note !== undefined ? updates.note.trim() || undefined : p.note,
        };
      });
      const updatedPlayer = communityPlayers.find((p) => p.id === playerId);
      const matches = updatedPlayer
        ? state.matches.map((m) => ({
            ...m,
            participants: m.participants.map((part) =>
              part.playerId === playerId
                ? { ...part, displayName: updatedPlayer.displayName }
                : part
            ),
          }))
        : state.matches;

      savePersistedState({
        activeSeason: state.activeSeason,
        communityPlayers,
        recentPlayerIds: state.recentPlayerIds,
        matches,
      });
      return { communityPlayers, matches };
    });
    get().recalculateLiveRankings();
  },

  removeCommunityPlayer: (playerId, options) => {
    const state = get();
    const target = state.communityPlayers.find((p) => p.id === playerId);
    if (!target) return { outcome: 'not_found' };

    if (options?.livePlayerIds?.includes(playerId)) {
      return { outcome: 'blocked_live', player: target };
    }

    const matchCount = state.getPlayerMatchCount(playerId);
    if (matchCount === 0) {
      set((s) => {
        const communityPlayers = s.communityPlayers.filter((p) => p.id !== playerId);
        const recentPlayerIds = s.recentPlayerIds.filter((id) => id !== playerId);
        savePersistedState({
          activeSeason: s.activeSeason,
          communityPlayers,
          recentPlayerIds,
          matches: s.matches,
        });
        return { communityPlayers, recentPlayerIds };
      });
      return { outcome: 'deleted', player: target };
    }

    const nextStatus: PlayerStatus = options?.mode === 'hide' ? 'HIDDEN' : 'ARCHIVED';
    set((s) => {
      const communityPlayers = s.communityPlayers.map((p) =>
        p.id === playerId
          ? { ...p, status: nextStatus, archivedAt: new Date().toISOString() }
          : p
      );
      const recentPlayerIds = s.recentPlayerIds.filter((id) => id !== playerId);
      savePersistedState({
        activeSeason: s.activeSeason,
        communityPlayers,
        recentPlayerIds,
        matches: s.matches,
      });
      return { communityPlayers, recentPlayerIds };
    });
    get().recalculateLiveRankings();
    return { outcome: nextStatus === 'HIDDEN' ? 'hidden' : 'archived', player: target };
  },

  restoreCommunityPlayer: (playerId) => {
    set((s) => {
      const communityPlayers = s.communityPlayers.map((p) =>
        p.id === playerId
          ? { ...p, status: 'ACTIVE' as const, archivedAt: undefined }
          : p
      );
      savePersistedState({
        activeSeason: s.activeSeason,
        communityPlayers,
        recentPlayerIds: s.recentPlayerIds,
        matches: s.matches,
      });
      return { communityPlayers };
    });
    get().recalculateLiveRankings();
  },

  undoRemovePlayer: ({ player, wasHardDeleted }) => {
    set((s) => {
      const communityPlayers = wasHardDeleted
        ? [player, ...s.communityPlayers]
        : s.communityPlayers.map((p) => (p.id === player.id ? player : p));
      savePersistedState({
        activeSeason: s.activeSeason,
        communityPlayers,
        recentPlayerIds: s.recentPlayerIds,
        matches: s.matches,
      });
      return { communityPlayers };
    });
    get().recalculateLiveRankings();
  },

  mergePlayers: (sourcePlayerId, targetPlayerId) => {
    if (sourcePlayerId === targetPlayerId) return;
    set((s) => {
      const target = s.communityPlayers.find((p) => p.id === targetPlayerId);
      if (!target) return s;

      const matches = s.matches.map((m) => ({
        ...m,
        participants: m.participants.map((part) =>
          part.playerId === sourcePlayerId
            ? { ...part, playerId: targetPlayerId, displayName: target.displayName }
            : part
        ),
        events: m.events.map((ev) => ({
          ...ev,
          pointWinnerPlayerId:
            ev.pointWinnerPlayerId === sourcePlayerId ? targetPlayerId : ev.pointWinnerPlayerId,
          errorPlayerId:
            ev.errorPlayerId === sourcePlayerId ? targetPlayerId : ev.errorPlayerId,
          serverPlayerId:
            ev.serverPlayerId === sourcePlayerId ? targetPlayerId : ev.serverPlayerId,
        })),
      }));

      const communityPlayers = s.communityPlayers.filter((p) => p.id !== sourcePlayerId);
      const recentPlayerIds = s.recentPlayerIds.filter((id) => id !== sourcePlayerId);
      savePersistedState({
        activeSeason: s.activeSeason,
        communityPlayers,
        recentPlayerIds,
        matches,
      });
      return { communityPlayers, recentPlayerIds, matches };
    });
    get().recalculateLiveRankings();
  },

  resetAllData: () => {
    const emptyRebuild = buildFilteredLeaderboards([], [], {}, 'ALL');
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(RANKING_STORAGE_KEY);
        localStorage.removeItem('rallypoint_match_history');
        localStorage.removeItem('rallypoint_active_match');
        localStorage.removeItem('rallypoint_onboarding_completed');
      }
    } catch {
      // Ignore
    }
    set({
      activeSeason: 'Season 1',
      communityPlayers: [],
      recentPlayerIds: [],
      matches: [],
      playerLeaderboards: emptyRebuild.playerLeaderboards,
      teamLeaderboards: emptyRebuild.teamLeaderboards,
      previousPlayerRanks: {},
      pendingUpgradePrompt: false,
    });
  },

  resolveUpgradePrompt: (choice) => {
    if (choice === 'fresh') {
      get().resetAllData();
      return;
    }
    const s = get();
    savePersistedState({
      activeSeason: s.activeSeason,
      communityPlayers: s.communityPlayers,
      recentPlayerIds: s.recentPlayerIds,
      matches: s.matches,
    });
    set({ pendingUpgradePrompt: false });
  },

  autoSuggestDoublesPairs: (selectedIds) => {
    const { communityPlayers, playerLeaderboards } = get();
    if (selectedIds.length !== 4) return null;

    const selectedPlayers = selectedIds
      .map((id) => communityPlayers.find((p) => p.id === id && p.status !== 'ARCHIVED' && p.status !== 'HIDDEN'))
      .filter((p): p is CommunityPlayer => Boolean(p));

    if (selectedPlayers.length !== 4) return null;

    const overallBoard = playerLeaderboards.OVERALL || [];
    const getRating = (id: string): number => {
      const entry = overallBoard.find((e) => e.id === id);
      return entry ? entry.headlineValue : 50;
    };

    const ranked = [...selectedPlayers].sort((a, b) => getRating(b.id) - getRating(a.id));
    const pairA: [CommunityPlayer, CommunityPlayer] = [ranked[0]!, ranked[3]!];
    const pairB: [CommunityPlayer, CommunityPlayer] = [ranked[1]!, ranked[2]!];

    const scoreA = getRating(pairA[0].id) + getRating(pairA[1].id);
    const scoreB = getRating(pairB[0].id) + getRating(pairB[1].id);
    const balanceDelta = Number(Math.abs(scoreA - scoreB).toFixed(2));

    return { pairA, pairB, balanceDelta };
  },

  recalculateLiveRankings: () => {
    const { matches, communityPlayers, previousPlayerRanks, scoringSystemFilter } = get();
    const result = buildFilteredLeaderboards(
      matches,
      communityPlayers,
      previousPlayerRanks,
      scoringSystemFilter
    );

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
      savePersistedState({
        activeSeason: state.activeSeason,
        communityPlayers: state.communityPlayers,
        recentPlayerIds: state.recentPlayerIds,
        matches: updatedMatches,
      });
      return { matches: updatedMatches };
    });
    get().recalculateLiveRankings();
  },

  updateMatchEvents: (matchId, events) => {
    set((state) => {
      const updated = state.matches.map((m) => (m.id === matchId ? { ...m, events } : m));
      savePersistedState({
        activeSeason: state.activeSeason,
        communityPlayers: state.communityPlayers,
        recentPlayerIds: state.recentPlayerIds,
        matches: updated,
      });
      return { matches: updated };
    });
    get().recalculateLiveRankings();
  },

  editPastPoint: (matchId, edit) => {
    const { matches } = get();
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

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
