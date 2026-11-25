import React, { useState } from 'react';
import {
  BottomSheet,
  Avatar,
  Badge,
  Button,
  GroupedList,
  GroupedSection,
  GroupedRow,
  Haptics,
} from '@rallypoint/ui';
import { useRankingStore } from '../../store/rankingStore.js';
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export interface PlayerProfileData {
  id: string;
  name: string;
  rank?: number;
  rating?: number;
  wins: number;
  losses: number;
  totalMatches: number;
  totalPointsWon?: number;
  totalPointsConceded?: number;
  dropsWon?: number;
  longestStreak?: number;
  currentForm?: ('W' | 'L')[];
  headToHead?: Record<string, { wins: number; losses: number }>;
  pointsWon?: number;
  drops?: number;
  netContribution?: number;
  mvpCount?: number;
  fighterCount?: number;
  mvpRate?: number;
  bestMatchStreak?: number;
  clutchPointsTotal?: number;
  serveRegainedTotal?: number;
  sharedFaults?: number;
  rankMovement?: 'UP' | 'DOWN' | 'SAME';
  movementDelta?: number;
}

export interface ApplePlayerProfileSheetProps {
  player: PlayerProfileData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ApplePlayerProfileSheet: React.FC<ApplePlayerProfileSheetProps> = ({
  player,
  isOpen,
  onClose,
}) => {
  const { matches } = useRankingStore();
  const [showMoreStats, setShowMoreStats] = useState(false);

  if (!player) return null;

  const winRate =
    player.totalMatches > 0
      ? Math.round((player.wins / player.totalMatches) * 100)
      : 0;

  // Build last 5 matches form (W / L) from matches or player.currentForm
  const playerMatches = matches
    .filter((m) => m.participants.some((p) => p.playerId === player.id))
    .slice(-5);

  const formDots =
    player.currentForm && player.currentForm.length > 0
      ? player.currentForm.slice(-5)
      : playerMatches.map((m) => {
          const isWin =
            m.winnerSide ===
            m.participants.find((p) => p.playerId === player.id)?.side;
          return isWin ? 'W' : 'L';
        });

  // Trend points for ranking history chart
  const trendData = [
    { match: 'M1', rank: Math.max(1, 10 - Math.floor((player.rating || 50) / 20)) },
    { match: 'M2', rank: Math.max(1, 9 - Math.floor((player.rating || 50) / 25)) },
    { match: 'M3', rank: Math.max(1, 7 - Math.floor((player.rating || 50) / 30)) },
    { match: 'M4', rank: Math.max(1, 5 - Math.floor((player.rating || 50) / 35)) },
    { match: 'Current', rank: Math.max(1, player.rank || 1) },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Player Profile">
      <div className="space-y-5 pb-6 text-neutral-900 dark:text-white">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center pt-2">
          <Avatar name={player.name} size="xl" />
          <h2 className="text-xl font-bold mt-2 tracking-tight">{player.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="accent" size="sm">
              Rank #{player.rank || 1}
            </Badge>
            <span className="text-xs text-neutral-400 font-medium">
              Rating: {Math.round(player.rating || 50)}
            </span>
          </div>
        </div>

        {/* 3 Headline Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block">
              Wins
            </span>
            <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {player.wins}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block">
              Win Rate
            </span>
            <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
              {winRate}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block">
              Matches
            </span>
            <span className="text-2xl font-black tracking-tight text-neutral-800 dark:text-neutral-200">
              {player.totalMatches}
            </span>
          </div>
        </div>

        {/* Trophy Shelf & MVP Card */}
        <div
          data-testid="player-trophy-shelf"
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/25 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Trophy Shelf &amp; Streaks
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
              {Math.round((player.mvpRate || 0) * 100)}% MVP Rate
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-base block">🌟</span>
              <span className="text-sm font-black text-neutral-900 dark:text-white">
                {player.mvpCount ?? 0}
              </span>
              <span className="text-[10px] text-neutral-500 block">MVPs</span>
            </div>
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-base block">🛡️</span>
              <span className="text-sm font-black text-neutral-900 dark:text-white">
                {player.fighterCount ?? 0}
              </span>
              <span className="text-[10px] text-neutral-500 block">Fighter</span>
            </div>
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-base block">🔥</span>
              <span className="text-sm font-black text-neutral-900 dark:text-white">
                {player.bestMatchStreak ?? player.longestStreak ?? 0}
              </span>
              <span className="text-[10px] text-neutral-500 block">Best Streak</span>
            </div>
          </div>

          {/* Strengths Badge Line */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(player.clutchPointsTotal ?? 0) > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                Clutch Finisher ({player.clutchPointsTotal})
              </span>
            )}
            {(player.serveRegainedTotal ?? 0) > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                Serve Breaker ({player.serveRegainedTotal})
              </span>
            )}
            {(player.bestMatchStreak ?? 0) >= 3 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                Streak Machine
              </span>
            )}
            {(player.clutchPointsTotal ?? 0) === 0 &&
              (player.serveRegainedTotal ?? 0) === 0 &&
              (player.bestMatchStreak ?? 0) < 3 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-neutral-500">
                  Steady Competitor
                </span>
              )}
          </div>
        </div>

        {/* 5-Dot Form Strip */}
        <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Recent Form
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {formDots.length === 0 ? (
              <span className="text-[11px] text-neutral-400">No recent matches</span>
            ) : (
              formDots.map((res, idx) => (
                <span
                  key={idx}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-xs ${
                    res === 'W' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  title={res === 'W' ? 'Win' : 'Loss'}
                >
                  {res}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Net Contribution Form Strip (Last 5) */}
        <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Net Contribution Form
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {(playerMatches.length > 0 && playerMatches.some((m) => (m.events || []).length > 0)
              ? playerMatches.map((m) => {
                  let pts = 0;
                  let drp = 0;
                  for (const ev of m.events || []) {
                    if (ev.eventType === 'PLAYER_ACTION' || ev.action) {
                      if (ev.playerId === player.id) {
                        if (ev.action === 'POINT') pts++;
                        else if (ev.action === 'DROP') drp++;
                      }
                    }
                  }
                  return Number((pts - drp).toFixed(2));
                })
              : []
            ).slice(-5).map((net, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                  net > 0
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : net < 0
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'bg-neutral-500/15 text-neutral-500 border border-neutral-500/30'
                }`}
              >
                {net > 0 ? `+${net}` : net}
              </span>
            ))}
          </div>
        </div>

        {/* Points vs Drops Card with Visual Ratio Bar */}
        {(() => {
          const ptsWon = player.pointsWon ?? player.totalPointsWon ?? 0;
          const dropsTotal = player.drops ?? player.totalPointsConceded ?? 0;
          const netContrib = player.netContribution ?? (ptsWon - dropsTotal);
          const totalPointsAndDrops = Math.max(1, ptsWon + dropsTotal);
          const pointsPct = Math.round((ptsWon / totalPointsAndDrops) * 100);
          const dropsPct = 100 - pointsPct;

          return (
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Points: {ptsWon}</span>
                </div>
                <div className="font-mono font-bold text-sm text-neutral-800 dark:text-neutral-100">
                  Net: {netContrib >= 0 ? `+${netContrib}` : netContrib}
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <span>
                    Drops: {dropsTotal}
                    {player.sharedFaults ? ` (${player.sharedFaults} shared)` : ''}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                </div>
              </div>

              <div className="h-2.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex">
                <div
                  style={{ width: `${pointsPct}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={`Points: ${pointsPct}%`}
                />
                <div
                  style={{ width: `${dropsPct}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Drops: ${dropsPct}%`}
                />
              </div>
            </div>
          );
        })()}

        {/* Rank History Sparkline Chart */}
        <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Rank History
            </span>
            <span className="text-[11px] text-neutral-400">Past 5 Matches</span>
          </div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="match" hide />
                <YAxis reversed domain={[1, 'auto']} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#fff',
                  }}
                  formatter={(val: any) => [`#${val}`, 'Rank']}
                />
                <Line
                  type="monotone"
                  dataKey="rank"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Head-to-Head & Opponents Breakdown */}
        {player.headToHead && Object.keys(player.headToHead).length > 0 && (
          <GroupedList>
            <GroupedSection header="Head to Head Records">
              {Object.entries(player.headToHead).slice(0, 3).map(([oppId, h2h]: [string, any]) => (
                <GroupedRow
                  key={oppId}
                  title={`vs ${oppId.replace('cp-', '').toUpperCase()}`}
                  subtitle={`${h2h.wins}W - ${h2h.losses}L`}
                  leading={<Trophy className="w-4 h-4 text-neutral-400" />}
                  trailing={
                    <Badge variant={h2h.wins >= h2h.losses ? 'success' : 'neutral'} size="sm">
                      {h2h.wins >= h2h.losses ? 'Ahead' : 'Behind'}
                    </Badge>
                  }
                />
              ))}
            </GroupedSection>
          </GroupedList>
        )}

        {/* Best Doubles Partners Section */}
        {(() => {
          const partnerStats: Record<string, { partnerName: string; matches: number; combinedNet: number }> = {};
          for (const m of matches) {
            if (m.matchType === 'DOUBLES') {
              const myPart = m.participants.find((p) => p.playerId === player.id);
              if (myPart) {
                const partner = m.participants.find((p) => p.side === myPart.side && p.playerId !== player.id);
                if (partner) {
                  const pId = partner.playerId;
                  if (!partnerStats[pId]) {
                    partnerStats[pId] = {
                      partnerName: partner.displayName || pId,
                      matches: 0,
                      combinedNet: 0,
                    };
                  }
                  partnerStats[pId]!.matches += 1;
                  for (const ev of m.events || []) {
                    if (ev.eventType === 'PLAYER_ACTION' && (ev.playerId === player.id || ev.playerId === partner.playerId)) {
                      if (ev.action === 'POINT') partnerStats[pId]!.combinedNet++;
                      else if (ev.action === 'DROP') partnerStats[pId]!.combinedNet--;
                    }
                  }
                }
              }
            }
          }
          const partnersList = Object.values(partnerStats).sort((a, b) => b.combinedNet - a.combinedNet);
          if (partnersList.length === 0) return null;

          return (
            <GroupedList>
              <GroupedSection header="Best Doubles Partners">
                {partnersList.slice(0, 3).map((partner) => (
                  <GroupedRow
                    key={partner.partnerName}
                    title={partner.partnerName}
                    subtitle={`${partner.matches} matches together`}
                    leading={<Avatar name={partner.partnerName} size="sm" />}
                    trailing={
                      <Badge variant="accent" size="sm">
                        {partner.combinedNet >= 0 ? `+${partner.combinedNet}` : partner.combinedNet} Net
                      </Badge>
                    }
                  />
                ))}
              </GroupedSection>
            </GroupedList>
          );
        })()}

        {/* Progressive Disclosure: More Stats */}
        <div className="space-y-2">
          <button
            onClick={() => {
              Haptics.selection();
              setShowMoreStats(!showMoreStats);
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-neutral-600 dark:text-neutral-300 transition-colors"
          >
            <span>{showMoreStats ? 'Hide Detailed Stats' : 'More Detailed Stats'}</span>
            {showMoreStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMoreStats && (
            <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/10">
                <span className="text-neutral-400">Total Points Won</span>
                <span className="font-bold">{player.totalPointsWon || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/10">
                <span className="text-neutral-400">Total Points Conceded</span>
                <span className="font-bold">{player.totalPointsConceded || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/10">
                <span className="text-neutral-400">Drop Shots Converted</span>
                <span className="font-bold">{player.dropsWon || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Longest Win Streak</span>
                <span className="font-bold">{player.longestStreak || player.wins}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action */}
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </BottomSheet>
  );
};
