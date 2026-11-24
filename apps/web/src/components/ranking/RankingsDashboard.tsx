import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import type { RankingCategory, LeaderboardEntry, PlayerStats } from '@rallypoint/ranking';
import { useRankingStore } from '../../store/rankingStore.js';
import { PlayerProfileModal } from './PlayerProfileModal.js';
import { TeamLeagueStandings } from './TeamLeagueStandings.js';
import { db } from '../../db/index.js';

export type TimeFilter = 'SEASON' | 'MONTH' | 'WEEK' | 'ALL_TIME';

export interface CommunityAward {
  id: string;
  title: string;
  icon: string;
  winnerName: string;
  headline: string;
  description: string;
}

export const RankingsDashboard: React.FC<{ currentUserId?: string }> = ({
  currentUserId = 'cp-viktor',
}) => {
  const {
    activeSeason,
    selectedCategory,
    setSelectedCategory,
    scoringSystemFilter,
    setScoringSystemFilter,
    playerLeaderboards,
  } = useRankingStore();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('SEASON');
  const [dropMode, setDropMode] = useState<'PLAYED' | 'CONCEDED'>('PLAYED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerForProfile, setSelectedPlayerForProfile] =
    useState<PlayerStats | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [cachedSnapshotDate, setCachedSnapshotDate] = useState<string | null>(null);

  const storyCardRef = useRef<HTMLDivElement>(null);

  // Active category mapping taking into account drops sub-toggle
  const effectiveCategory: RankingCategory =
    selectedCategory === 'MOST_DROPS_PLAYED' || selectedCategory === 'MOST_DROPS_CONCEDED'
      ? dropMode === 'PLAYED'
        ? 'MOST_DROPS_PLAYED'
        : 'MOST_DROPS_CONCEDED'
      : selectedCategory;

  // Monitor online status & cache snapshots to IndexedDB (Dexie)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Persist current leaderboards to Dexie for offline usage
    if (playerLeaderboards && Object.keys(playerLeaderboards).length > 0) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      db.rankings
        .put({
          id: 'CURRENT_LEADERBOARDS',
          category: effectiveCategory,
          timestamp: Date.now(),
          formattedDate: nowStr,
          leaderboards: playerLeaderboards,
        })
        .then(() => setCachedSnapshotDate(nowStr))
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [playerLeaderboards, effectiveCategory]);

  const entries: LeaderboardEntry<PlayerStats>[] =
    playerLeaderboards[effectiveCategory] || [];

  const filteredEntries = entries.filter((e) =>
    (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute Weekly Community Awards dynamically from stats
  const allStats: PlayerStats[] = (playerLeaderboards.OVERALL || []).map((e) => e.stats);

  const awards: CommunityAward[] = React.useMemo(() => {
    if (allStats.length === 0) return [];

    // Drop Shot King
    const dropKing = [...allStats].sort(
      (a, b) => (b.dropShotWinners || 0) - (a.dropShotWinners || 0)
    )[0];

    // Iron Wall: Lowest unforced errors per match (min 1 match)
    const ironWall = [...allStats]
      .filter((s) => s.matchesPlayed > 0)
      .sort((a, b) => a.unforcedErrors / a.matchesPlayed - b.unforcedErrors / b.matchesPlayed)[0];

    // Marathoner: Most matches played
    const marathoner = [...allStats].sort((a, b) => b.matchesPlayed - a.matchesPlayed)[0];

    // Smash Master: Most smash winners
    const smashMaster = [...allStats].sort(
      (a, b) => (b.smashWinners || 0) - (a.smashWinners || 0)
    )[0];

    // Comeback Kid: Top rated with wins
    const comebackKid = [...allStats].sort((a, b) => b.pointDifference - a.pointDifference)[0];

    return [
      {
        id: 'drop-king',
        title: 'Drop-Shot King',
        icon: '🪶',
        winnerName: dropKing?.displayName || 'TBD',
        headline: `${dropKing?.dropShotWinners || 0} Drop Winners`,
        description: 'Most deceptive touch at the tape',
      },
      {
        id: 'iron-wall',
        title: 'Iron Wall',
        icon: '🧱',
        winnerName: ironWall?.displayName || 'TBD',
        headline: `${(ironWall ? ironWall.unforcedErrors / Math.max(1, ironWall.matchesPlayed) : 0).toFixed(1)} Errors/Match`,
        description: 'Most disciplined, bulletproof defense',
      },
      {
        id: 'smash-master',
        title: 'Smash Master',
        icon: '⚡',
        winnerName: smashMaster?.displayName || 'TBD',
        headline: `${smashMaster?.smashWinners || 0} Smash Winners`,
        description: 'Unstoppable rear-court firepower',
      },
      {
        id: 'comeback-kid',
        title: 'Comeback Kid',
        icon: '🔥',
        winnerName: comebackKid?.displayName || 'TBD',
        headline: `+${comebackKid?.pointDifference || 0} Pt Margin`,
        description: 'Highest resiliency under scoreboard pressure',
      },
      {
        id: 'marathoner',
        title: 'Marathoner',
        icon: '🏃',
        winnerName: marathoner?.displayName || 'TBD',
        headline: `${marathoner?.matchesPlayed || 0} Matches`,
        description: 'Iron stamina weekly court presence',
      },
    ];
  }, [allStats]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Rank',
      'Player Name',
      'Matches Played',
      'Format Split',
      'Scoring System Filter',
      'Ranking Points (RP)',
      'Headline Value',
      'Wins',
      'Losses',
      'Win Rate %',
      'Pt Diff',
      'Service Holds',
      'Side-Outs Won',
      'Smash Winners',
      'Drop Winners',
      'Unforced Errors',
    ];
    const rows = filteredEntries.map((e) => [
      e.rank,
      `"${e.name}"`,
      e.matchesPlayed,
      `"${e.stats.matchesSplitFormatted || `R:${e.matchesPlayed} S:0`}"`,
      `"${scoringSystemFilter}"`,
      e.stats.rankingPoints || 0,
      e.headlineValue,
      e.stats.wins,
      e.stats.losses,
      e.stats.winRate,
      e.stats.pointDifference,
      e.stats.serviceHolds || 0,
      e.stats.sideOutsWon || 0,
      e.stats.smashWinners,
      e.stats.dropShotWinners,
      e.stats.unforcedErrors,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rallypoint-${effectiveCategory.toLowerCase()}-rankings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Story Card PNG Export
  const handleExportStoryCard = async () => {
    if (!storyCardRef.current) return;
    try {
      setIsExportingPng(true);
      const dataUrl = await toPng(storyCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `rallypoint-leaderboard-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export story card PNG:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const isTeamsTab = (selectedCategory as string) === 'TEAMS';

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 text-xs select-none">
      {/* Header & Season Selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h1 className="text-lg font-black text-white tracking-tight">
              Community Rankings & League
            </h1>
            <span className="text-[10px] bg-emerald-950 border border-emerald-700/60 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full">
              LIVE DERIVED
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            Season: <strong className="text-emerald-400 font-medium">{activeSeason}</strong>
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-gray-800/80 p-1 rounded-2xl border border-gray-700">
          {(
            [
              { id: 'SEASON', label: 'Season' },
              { id: 'MONTH', label: 'This Month' },
              { id: 'WEEK', label: 'This Week' },
              { id: 'ALL_TIME', label: 'All-Time' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTimeFilter(id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                timeFilter === id
                  ? 'bg-emerald-500 text-gray-950 font-black shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Scoring System Filter (3-Way Pill Toggle) */}
      <div className="bg-gray-900 border border-gray-800 p-2.5 rounded-3xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2 pl-2">
          <span className="text-base">🏸</span>
          <div>
            <span className="font-extrabold text-xs text-white block">Scoring System View</span>
            <span className="text-[10px] text-gray-400">
              {scoringSystemFilter === 'ALL' && 'Combined standings across all match formats'}
              {scoringSystemFilter === 'RALLY' && 'Showing matches played under Rally 21 / 15 / 11'}
              {scoringSystemFilter === 'SERVICE' && 'Showing matches played under Service 15 / 11'}
            </span>
          </div>
        </div>

        <div className="flex bg-gray-800/80 p-1 rounded-2xl border border-gray-700/80 gap-1 w-full sm:w-auto">
          {(
            [
              { id: 'ALL', label: 'All Systems' },
              { id: 'RALLY', label: 'Rally Point' },
              { id: 'SERVICE', label: 'Service Point' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setScoringSystemFilter(id)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                scoringSystemFilter === id
                  ? 'bg-emerald-500 text-gray-950 font-black shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Offline PWA Indicator Banner */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-950/70 border border-amber-500/50 text-amber-200 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">📡</span>
            <span>
              <strong>Offline Mode</strong> — Showing cached rankings{cachedSnapshotDate ? ` from ${cachedSnapshotDate}` : ''}. Match events scored offline are securely queued and will automatically sync once network reconnects.
            </span>
          </div>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
            Cached Snapshot
          </span>
        </div>
      )}

      {/* Weekly Awards Ribbon */}
      <div className="bg-gradient-to-r from-gray-900 via-emerald-950/20 to-gray-900 border border-emerald-800/40 rounded-3xl p-4 shadow-xl">
        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block mb-2.5 flex items-center gap-1.5">
          <span>🌟 Weekly Community Awards & Accolades</span>
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {awards.map((award) => (
            <div
              key={award.id}
              className="bg-gray-900/90 border border-gray-800 rounded-2xl p-2.5 flex flex-col justify-between hover:border-emerald-600/50 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{award.icon}</span>
                  <span className="font-extrabold text-[11px] text-white truncate">
                    {award.title}
                  </span>
                </div>
                <div className="font-bold text-emerald-400 text-xs truncate">
                  {award.winnerName}
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-gray-800/80">
                <span className="text-[10px] font-mono text-gray-300 block font-semibold truncate">
                  {award.headline}
                </span>
                <span className="text-[9px] text-gray-500 block truncate">
                  {award.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {(
          [
            { cat: 'OVERALL', label: 'Overall Index' },
            { cat: 'MOST_WINS', label: 'Most Wins' },
            { cat: 'MOST_POINTS', label: 'Most Points' },
            { cat: 'MOST_LOSSES', label: 'Most Losses' },
            { cat: 'MOST_DROPS_PLAYED', label: 'Most Drops' },
            { cat: 'MOST_UNFORCED_ERRORS', label: 'Most Errors' },
            { cat: 'BEST_WIN_RATE', label: 'Win Rate' },
            { cat: 'TEAMS', label: 'Team League' },
          ] as const
        ).map(({ cat, label }) => {
          const isActive =
            cat === 'TEAMS'
              ? isTeamsTab
              : cat === 'MOST_DROPS_PLAYED'
              ? selectedCategory === 'MOST_DROPS_PLAYED' || selectedCategory === 'MOST_DROPS_CONCEDED'
              : selectedCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg scale-105'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Drops Sub-Toggle if Drops category active */}
      {(selectedCategory === 'MOST_DROPS_PLAYED' || selectedCategory === 'MOST_DROPS_CONCEDED') && (
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 p-2 rounded-2xl w-fit">
          <span className="text-[11px] font-semibold text-gray-400 pl-1">Drop Mode:</span>
          <button
            onClick={() => setDropMode('PLAYED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              dropMode === 'PLAYED' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🪶 Drop Shots Played
          </button>
          <button
            onClick={() => setDropMode('CONCEDED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              dropMode === 'CONCEDED' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🎯 Points Dropped (Conceded)
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isTeamsTab ? (
        <TeamLeagueStandings />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Action Bar: Search, Story Card, CSV Export */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 bg-gray-900 border border-gray-800 p-3 rounded-2xl">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search community player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportStoryCard}
                disabled={isExportingPng}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
              >
                <span>📸</span>
                <span>{isExportingPng ? 'Rendering Card...' : 'Story Card (PNG)'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-emerald-600/40 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>📄</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div
            role="region"
            aria-label="Community Leaderboard"
            aria-live="polite"
            className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-800/50">
                  <th className="py-3 px-3.5 w-14 text-center">Rank</th>
                  <th className="py-3 px-3.5">Player</th>
                  <th className="py-3 px-3.5 text-center font-bold text-emerald-400">
                    Matches Played
                  </th>
                  <th className="py-3 px-3.5 text-right font-bold text-white">
                    {effectiveCategory === 'OVERALL'
                      ? 'Index Score'
                      : effectiveCategory === 'MOST_WINS'
                      ? 'Wins'
                      : effectiveCategory === 'MOST_POINTS'
                      ? 'Points Scored'
                      : effectiveCategory === 'MOST_LOSSES'
                      ? 'Losses'
                      : effectiveCategory === 'MOST_DROPS_PLAYED'
                      ? 'Drop Winners'
                      : effectiveCategory === 'MOST_DROPS_CONCEDED'
                      ? 'Pts Conceded'
                      : effectiveCategory === 'MOST_UNFORCED_ERRORS'
                      ? 'Unforced Errors'
                      : 'Win Rate'}
                  </th>
                  <th className="py-3 px-3.5 text-right">Secondary Stat</th>
                  <th className="py-3 px-3.5 text-center">Form (Last 5)</th>
                  <th className="py-3 px-3.5 text-center w-16">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">
                      No ranked players found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const stats = entry.stats;
                    const isCurrentUser = entry.id === currentUserId;

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedPlayerForProfile(stats)}
                        className={`hover:bg-gray-800/60 transition-colors cursor-pointer ${
                          isCurrentUser
                            ? 'bg-emerald-950/30 border-l-4 border-l-emerald-400'
                            : ''
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-3 px-3.5 text-center font-black">
                          {entry.rank === 1 ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-sm"
                              title="Rank 1 Gold Medal"
                              aria-label="Rank 1 Gold"
                            >
                              <span aria-hidden="true">🥇</span>
                              <span>#1</span>
                            </span>
                          ) : entry.rank === 2 ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-black bg-slate-300/20 text-slate-200 border border-slate-300/50 shadow-sm"
                              title="Rank 2 Silver Medal"
                              aria-label="Rank 2 Silver"
                            >
                              <span aria-hidden="true">🥈</span>
                              <span>#2</span>
                            </span>
                          ) : entry.rank === 3 ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-black bg-amber-700/20 text-amber-600 border border-amber-600/50 shadow-sm"
                              title="Rank 3 Bronze Medal"
                              aria-label="Rank 3 Bronze"
                            >
                              <span aria-hidden="true">🥉</span>
                              <span>#3</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono text-sm">#{entry.rank}</span>
                          )}
                        </td>

                        {/* Player Info */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                              {entry.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-extrabold text-white block">
                                {entry.name}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[9px] text-emerald-400 font-semibold">
                                  (You)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Matches Played (Prominent) */}
                        <td className="py-3 px-3.5 text-center">
                          <span className="bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs">
                            Matches: {entry.matchesPlayed}
                          </span>
                        </td>

                        {/* Headline Stat */}
                        <td className="py-3 px-3.5 text-right font-black text-white font-mono text-sm">
                          {entry.headlineFormatted}
                        </td>

                        {/* Secondary Stat */}
                        <td className="py-3 px-3.5 text-right font-mono text-gray-400">
                          {effectiveCategory === 'OVERALL'
                            ? `${stats.wins}W - ${stats.losses}L`
                            : effectiveCategory === 'MOST_WINS'
                            ? `Diff: ${stats.pointDifference >= 0 ? `+${stats.pointDifference}` : stats.pointDifference}`
                            : effectiveCategory === 'MOST_POINTS'
                            ? `${(stats.pointsScored / Math.max(1, stats.matchesPlayed)).toFixed(1)}/match`
                            : `${stats.winRate}% WR`}
                        </td>

                        {/* Form Dots */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex gap-1 justify-center">
                            {(stats.currentForm || []).length === 0 ? (
                              <span className="text-gray-600 text-[10px]">−</span>
                            ) : (
                              stats.currentForm.map((res, idx) => (
                                <span
                                  key={idx}
                                  className={`w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center ${
                                    res === 'W'
                                      ? 'bg-emerald-500 text-gray-950'
                                      : 'bg-rose-500 text-white'
                                  }`}
                                >
                                  {res}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        {/* Rank Delta Movement */}
                        <td className="py-3 px-3.5 text-center font-bold font-mono">
                          {entry.rankMovement === 'UP' ? (
                            <span className="text-emerald-400 flex items-center justify-center gap-0.5">
                              ▲ +{entry.movementDelta || 1}
                            </span>
                          ) : entry.rankMovement === 'DOWN' ? (
                            <span className="text-rose-400 flex items-center justify-center gap-0.5">
                              ▼ -{entry.movementDelta || 1}
                            </span>
                          ) : (
                            <span className="text-gray-500">−</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden Story Card for Instagram/WhatsApp Export (Vertical 9:16) */}
      <div className="overflow-hidden h-0 w-0">
        <div
          ref={storyCardRef}
          style={{ width: '450px', height: '800px' }}
          className="bg-gradient-to-b from-gray-950 via-gray-900 to-emerald-950 p-8 flex flex-col justify-between text-white border-4 border-emerald-500/50"
        >
          {/* Header */}
          <div className="text-center border-b border-gray-800 pb-5">
            <span className="text-3xl mb-2 inline-block">🏸</span>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase">
              RallyPoint Community
            </h2>
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">
              Leaderboard • {effectiveCategory.replace(/_/g, ' ')}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Top 5 Highlight */}
          <div className="space-y-3.5 my-auto">
            {filteredEntries.slice(0, 5).map((entry, idx) => (
              <div
                key={entry.id}
                className={`p-3.5 rounded-2xl flex justify-between items-center border ${
                  idx === 0
                    ? 'bg-amber-500/20 border-amber-500 text-white'
                    : idx === 1
                    ? 'bg-gray-400/20 border-gray-400 text-white'
                    : idx === 2
                    ? 'bg-amber-700/20 border-amber-600 text-white'
                    : 'bg-gray-900/80 border-gray-800 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black w-6 text-center">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <div>
                    <span className="font-extrabold text-sm block">{entry.name}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Matches: {entry.matchesPlayed} • {entry.stats.wins}W-{entry.stats.losses}L
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono text-emerald-400 block">
                    {entry.headlineValue}
                  </span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                    Score
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Branding */}
          <div className="text-center pt-4 border-t border-gray-800/80">
            <span className="text-[11px] text-gray-400 tracking-wider">
              Powered by RallyPoint • BWF Rules Engine & Event Sourcing
            </span>
          </div>
        </div>
      </div>

      {/* Player Profile Modal */}
      {selectedPlayerForProfile && (
        <PlayerProfileModal
          playerStats={selectedPlayerForProfile}
          onClose={() => setSelectedPlayerForProfile(null)}
        />
      )}
    </div>
  );
};
