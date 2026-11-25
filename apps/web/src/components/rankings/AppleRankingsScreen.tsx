import React, { useState } from 'react';
import {
  LargeTitle,
  SegmentedControl,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Haptics,
} from '@rallypoint/ui';
import { useRankingStore } from '../../store/rankingStore.js';
import {
  ApplePlayerProfileSheet,
  type PlayerProfileData,
} from '../players/ApplePlayerProfileSheet.js';
import type {
  RankingCategory,
  LeaderboardEntry,
  PlayerStats,
  TeamStats,
} from '@rallypoint/ranking';
import { Filter, ChevronRight, Download } from 'lucide-react';
import { exportRankingsCSV } from '../../analytics/exportUtils.js';

const CATEGORY_CHIPS: { id: RankingCategory; label: string }[] = [
  { id: 'OVERALL', label: 'Top Players' },
  { id: 'MOST_MVPS', label: 'Most MVPs' },
  { id: 'BEST_CLUTCH_PLAYER', label: 'Best Clutch' },
  { id: 'SERVE_WINNER', label: 'Serve Winner' },
  { id: 'LONGEST_STREAK', label: 'Longest Streak' },
  { id: 'TOP_POINT_SCORERS', label: 'Top Point Scorers' },
  { id: 'MOST_DROPS', label: 'Most Drops' },
  { id: 'BEST_NET_CONTRIBUTION', label: 'Best Net Contribution' },
  { id: 'MOST_WINS', label: 'Most Wins' },
  { id: 'MOST_POINTS', label: 'Most Points' },
  { id: 'MOST_LOSSES', label: 'Most Losses' },
];

export const AppleRankingsScreen: React.FC = () => {
  const {
    playerLeaderboards,
    teamLeaderboards,
    selectedCategory,
    setSelectedCategory,
    activeSeason,
    setActiveSeason,
    scoringSystemFilter,
    setScoringSystemFilter,
  } = useRankingStore();

  const [viewType, setViewType] = useState<'players' | 'teams'>('players');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfileData | null>(null);
  const [dropsSubFilter, setDropsSubFilter] = useState<'ALL' | 'UNFORCED' | 'FORCED'>('ALL');

  const activeLeaderboard: LeaderboardEntry<PlayerStats>[] =
    playerLeaderboards?.[selectedCategory] || [];
  const topThree = activeLeaderboard.slice(0, 3);
  const teamsList: LeaderboardEntry<TeamStats>[] =
    teamLeaderboards?.OVERALL_TEAM || teamLeaderboards?.TEAM_LEAGUE_TABLE || [];

  const handlePlayerClick = (entry: LeaderboardEntry<PlayerStats>) => {
    Haptics.selection();
    const stats: PlayerProfileData = {
      id: entry.id,
      name: entry.name,
      rank: entry.rank,
      rating: entry.stats?.rankingPoints ?? 50,
      wins: entry.stats?.wins ?? 0,
      losses: entry.stats?.losses ?? 0,
      totalMatches: entry.matchesPlayed ?? 0,
      totalPointsWon: entry.stats?.pointsWon ?? entry.stats?.pointsScored ?? 0,
      totalPointsConceded: entry.stats?.drops ?? entry.stats?.pointsConceded ?? 0,
      dropsWon: entry.stats?.dropShotWinners ?? 0,
      longestStreak: entry.stats?.longestWinStreak ?? 0,
      currentForm: entry.stats?.currentForm ?? [],
      netContribution: entry.stats?.netContribution ?? ((entry.stats?.pointsWon ?? 0) - (entry.stats?.drops ?? 0)),
      pointsWon: entry.stats?.pointsWon,
      drops: entry.stats?.drops,
      mvpCount: entry.stats?.mvpCount ?? 0,
      fighterCount: entry.stats?.fighterCount ?? 0,
      mvpRate: entry.stats?.mvpRate ?? 0,
      bestMatchStreak: entry.stats?.bestMatchStreak ?? 0,
      clutchPointsTotal: entry.stats?.clutchPointsTotal ?? 0,
      serveRegainedTotal: entry.stats?.serveRegainedTotal ?? 0,
    };
    setSelectedPlayer(stats);
  };

  return (
    <div className="min-h-full pb-28 pt-2 select-none">
      {/* Top Header */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <LargeTitle>Rankings</LargeTitle>
        <div className="flex items-center gap-1">
          <button
            aria-label="Export Rankings CSV"
            onClick={() => {
              Haptics.selection();
              exportRankingsCSV(activeLeaderboard, selectedCategory, scoringSystemFilter);
            }}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-neutral-500"
            title="Export Rankings CSV"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            aria-label="Filter Rankings"
            onClick={() => {
              Haptics.selection();
              setShowFilterSheet(true);
            }}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-neutral-500"
            title="Filter and Scope"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Segmented Control: Players | Teams & Pairs */}
      <div className="px-4 mb-3">
        <SegmentedControl
          options={[
            { id: 'players', label: 'Players' },
            { id: 'teams', label: 'Teams & Pairs' },
          ]}
          value={viewType}
          onChange={(v) => {
            Haptics.selection();
            setViewType(v as 'players' | 'teams');
          }}
          size="sm"
        />
      </div>

      {/* Quick Scoring Format Filters */}
      <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-neutral-400 font-medium mr-0.5">Format:</span>
        {[
          { id: 'ALL', label: 'All' },
          { id: 'RALLY', label: 'Rally Point Only' },
          { id: 'SERVICE', label: 'Service Point Only' },
        ].map((fmt) => (
          <button
            key={fmt.id}
            onClick={() => {
              Haptics.selection();
              setScoringSystemFilter(fmt.id as any);
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
              scoringSystemFilter === fmt.id
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-black/10'
            }`}
          >
            {fmt.label}
          </button>
        ))}
      </div>

      {viewType === 'players' ? (
        <>
          {/* Horizontally scrolling category chips */}
          <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-2.5">
            {CATEGORY_CHIPS.map((chip) => {
              const isActive = selectedCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => {
                    Haptics.selection();
                    setSelectedCategory(chip.id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                      : 'bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-black/10'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Sub-toggle for MOST_DROPS */}
          {selectedCategory === 'MOST_DROPS' && (
            <div className="flex gap-2 px-4 pb-3">
              {[
                { id: 'ALL', label: 'All Drops' },
                { id: 'UNFORCED', label: 'Unforced Only' },
                { id: 'FORCED', label: 'Forced Only' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    Haptics.selection();
                    setDropsSubFilter(sub.id as any);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    dropsSubFilter === sub.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                      : 'border-black/5 dark:border-white/10 text-neutral-500 hover:bg-black/5'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Top 3 Podium (1st Center Elevated) */}
          {topThree.length >= 3 && topThree[0] && topThree[1] && topThree[2] && (
            <div className="px-4 py-4 mb-2">
              <div className="flex items-end justify-center gap-3">
                {/* 2nd Place */}
                <div
                  onClick={() => handlePlayerClick(topThree[1]!)}
                  className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-xs cursor-pointer active:scale-98 transition-transform"
                >
                  <div className="relative">
                    <Avatar name={topThree[1]!.name} size="lg" />
                    <span className="absolute -bottom-1 -right-1 text-base">🥈</span>
                  </div>
                  <p className="text-xs font-bold mt-2 truncate max-w-[80px]">
                    {topThree[1]!.name}
                  </p>
                  <span className="text-[11px] text-neutral-400 mt-0.5">
                    {topThree[1]!.matchesPlayed} matches
                  </span>
                  <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 font-mono mt-1">
                    {topThree[1]!.headlineValue}
                  </span>
                </div>

                {/* 1st Place (Elevated Center) */}
                <div
                  onClick={() => handlePlayerClick(topThree[0]!)}
                  className="flex-1 -translate-y-2 flex flex-col items-center p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-500/15 border-2 border-amber-500/30 shadow-md cursor-pointer active:scale-98 transition-transform"
                >
                  <div className="relative">
                    <Avatar name={topThree[0]!.name} size="xl" />
                    <span className="absolute -bottom-1.5 -right-1.5 text-xl">🥇</span>
                  </div>
                  <p className="text-xs font-extrabold mt-2 truncate max-w-[85px]">
                    {topThree[0]!.name}
                  </p>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    {topThree[0]!.matchesPlayed} matches
                  </span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                    {topThree[0]!.headlineValue}
                  </span>
                </div>

                {/* 3rd Place */}
                <div
                  onClick={() => handlePlayerClick(topThree[2]!)}
                  className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-xs cursor-pointer active:scale-98 transition-transform"
                >
                  <div className="relative">
                    <Avatar name={topThree[2]!.name} size="lg" />
                    <span className="absolute -bottom-1 -right-1 text-base">🥉</span>
                  </div>
                  <p className="text-xs font-bold mt-2 truncate max-w-[80px]">
                    {topThree[2]!.name}
                  </p>
                  <span className="text-[11px] text-neutral-400 mt-0.5">
                    {topThree[2]!.matchesPlayed} matches
                  </span>
                  <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 font-mono mt-1">
                    {topThree[2]!.headlineValue}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Standings List (Inset Grouped) */}
          <div className="px-4">
            <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 overflow-hidden shadow-xs">
              {activeLeaderboard.map((entry, idx) => {
                const rankNum = entry.rank || idx + 1;
                const medal =
                  rankNum === 1
                    ? '🥇'
                    : rankNum === 2
                    ? '🥈'
                    : rankNum === 3
                    ? '🥉'
                    : `#${rankNum}`;

                return (
                  <div
                    key={entry.id}
                    onClick={() => handlePlayerClick(entry)}
                    className="flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 text-center font-bold text-xs text-neutral-400 font-mono">
                        {medal}
                      </span>
                      <Avatar name={entry.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">
                          {entry.name}
                        </p>
                        <p
                          data-testid="matches-played-count"
                          className="text-[11px] text-neutral-400 mt-0.5"
                        >
                          Matches: {entry.matchesPlayed || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono">
                        {entry.headlineValue}
                      </span>
                      <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Team & Doubles Standings View */
        <div className="px-4 py-2 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-2 pt-1">
            Club & Doubles Pairs
          </h3>
          <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 overflow-hidden shadow-xs">
            {teamsList.length === 0 ? (
              <p className="p-6 text-center text-xs text-neutral-400">
                No team standings recorded yet.
              </p>
            ) : (
              teamsList.map((t: LeaderboardEntry<TeamStats>, idx: number) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-xs text-neutral-400 font-mono">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">
                        {t.name}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {t.matchesPlayed} matches • {t.stats.wins}W - {t.stats.losses}L
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-mono">
                      {t.headlineValue} pts
                    </span>
                    <Badge variant="accent" size="sm" className="ml-2">
                      {Math.round(t.stats.winRate)}% Win
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Rankings Filter"
      >
        <div className="space-y-5 pb-6">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
              Scoring System
            </label>
            <SegmentedControl
              options={[
                { id: 'ALL', label: 'All Scoring Formats' },
                { id: 'RALLY', label: 'Rally Point' },
                { id: 'SERVICE', label: 'Service Point' },
              ]}
              value={scoringSystemFilter}
              onChange={(val) => {
                Haptics.selection();
                setScoringSystemFilter(val as any);
              }}
              size="sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
              Active Season
            </label>
            <div className="flex gap-2">
              {['Season 1', 'Season 2', 'All Time'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    Haptics.selection();
                    setActiveSeason(s);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    activeSeason === s
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-black/5 dark:border-white/10 text-neutral-500 hover:bg-black/5'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setShowFilterSheet(false)}
          >
            Apply Filters
          </Button>
        </div>
      </BottomSheet>

      {/* Selected Player Profile Sheet */}
      <ApplePlayerProfileSheet
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
};
