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
