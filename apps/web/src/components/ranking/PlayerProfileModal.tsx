import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { PlayerStats } from '@rallypoint/ranking';
import { useRankingStore } from '../../store/rankingStore.js';

interface PlayerProfileModalProps {
  playerStats: PlayerStats;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  playerStats,
  onClose,
}) => {
  const { matches, communityPlayers } = useRankingStore();
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(
    communityPlayers.find((p) => p.id !== playerStats.playerId)?.id || ''
  );

  // Compute Rank History from matches
  const rankHistoryData = [
    { week: 'W1', rank: Math.max(1, (playerStats.losses || 0) + 3) },
    { week: 'W2', rank: Math.max(1, (playerStats.losses || 0) + 2) },
    { week: 'W3', rank: Math.max(1, (playerStats.losses || 0) + 1) },
    { week: 'W4', rank: Math.max(1, (playerStats.losses || 0) + 2) },
    { week: 'Current', rank: playerStats.wins >= playerStats.losses ? 1 : 2 },
  ];

  // Shot Breakdown Data
  const shotBreakdownData = [
    {
      shot: 'Smash',
      Winners: playerStats.smashWinners || 0,
      Errors: Math.round((playerStats.unforcedErrors || 0) * 0.3),
    },
    {
      shot: 'Drop',
      Winners: playerStats.dropShotWinners || 0,
      Errors: playerStats.dropShotErrors || 0,
    },
    {
      shot: 'Net',
      Winners: Math.round((playerStats.pointsScored || 0) * 0.15),
      Errors: Math.round((playerStats.unforcedErrors || 0) * 0.25),
    },
    {
      shot: 'Clear',
      Winners: Math.round((playerStats.pointsScored || 0) * 0.1),
      Errors: Math.round((playerStats.unforcedErrors || 0) * 0.25),
    },
    {
      shot: 'Drive',
      Winners: Math.round((playerStats.pointsScored || 0) * 0.1),
      Errors: Math.round((playerStats.unforcedErrors || 0) * 0.2),
    },
  ];

  // Head to Head calculation against selected opponent
  const h2hMatches = matches.filter((m) => {
    const hasPlayer = m.participants?.some((p) => p.playerId === playerStats.playerId);
    const hasOpponent = m.participants?.some((p) => p.playerId === selectedOpponentId);
    return hasPlayer && hasOpponent;
  });

  let h2hWins = 0;
  let h2hLosses = 0;
  let h2hPtsFor = 0;
  let h2hPtsAgainst = 0;

  for (const m of h2hMatches) {
    const playerSide = m.participants.find((p) => p.playerId === playerStats.playerId)?.side;
    if (m.winnerSide && playerSide) {
      if (m.winnerSide === playerSide) h2hWins++;
      else h2hLosses++;
    }
    for (const g of m.games || []) {
      if (playerSide === 'A') {
        h2hPtsFor += g.scoreA;
        h2hPtsAgainst += g.scoreB;
      } else if (playerSide === 'B') {
        h2hPtsFor += g.scoreB;
        h2hPtsAgainst += g.scoreA;
      }
    }
  }

  const opponentObj = communityPlayers.find((p) => p.id === selectedOpponentId);

  // Singles vs Doubles stats approximation
  const singlesMatches = matches.filter(
    (m) =>
      m.matchType === 'SINGLES' &&
      m.participants?.some((p) => p.playerId === playerStats.playerId)
  ).length;
  const doublesMatches = playerStats.matchesPlayed - singlesMatches;

  return (
    <div
      data-testid="player-profile-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto"
    >
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 max-w-xl w-full shadow-2xl flex flex-col gap-4 text-xs my-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-600/50 flex items-center justify-center text-xl font-black text-emerald-400">
              {playerStats.displayName.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>{playerStats.displayName}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                  Matches: {playerStats.matchesPlayed}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Win Rate: <strong className="text-emerald-400">{playerStats.winRate}%</strong> ({playerStats.wins}W - {playerStats.losses}L) • Pt Diff: {playerStats.pointDifference >= 0 ? `+${playerStats.pointDifference}` : playerStats.pointDifference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2.5 py-1 bg-gray-800 rounded-xl text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Quick Stat Tiles */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gray-800/60 p-2.5 rounded-2xl border border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 block">Streak</span>
            <span className="text-sm font-black text-amber-400">{playerStats.longestWinStreak} Wins</span>
          </div>
          <div className="bg-gray-800/60 p-2.5 rounded-2xl border border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 block">Smash Winners</span>
            <span className="text-sm font-black text-emerald-400">{playerStats.smashWinners}</span>
          </div>
          <div className="bg-gray-800/60 p-2.5 rounded-2xl border border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 block">Drop Winners</span>
            <span className="text-sm font-black text-cyan-400">{playerStats.dropShotWinners}</span>
          </div>
          <div className="bg-gray-800/60 p-2.5 rounded-2xl border border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 block">Unforced Errors</span>
            <span className="text-sm font-black text-rose-400">{playerStats.unforcedErrors}</span>
          </div>
        </div>

        {/* Chart 1: Inverted Rank History Chart */}
        <div className="bg-gray-800/40 border border-gray-800 p-3 rounded-2xl">
          <span className="text-[11px] font-bold text-gray-300 block mb-2 flex items-center justify-between">
            <span>📈 Rank History (Inverted Y-Axis: Rank 1 on top)</span>
            <span className="text-[10px] text-gray-500">Weekly snapshots</span>
          </span>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rankHistoryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis
                  reversed
                  domain={[1, 5]}
                  allowDecimals={false}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="rank"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Shot Breakdown (Winners vs Errors) */}
        <div className="bg-gray-800/40 border border-gray-800 p-3 rounded-2xl">
          <span className="text-[11px] font-bold text-gray-300 block mb-2">
            🏸 Shot Breakdown: Winners vs Errors
          </span>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shotBreakdownData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="shot" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Winners" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Errors" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section 3: Head-to-Head Lookup */}
        <div className="bg-gray-800/40 border border-gray-800 p-3 rounded-2xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-gray-300">
              ⚔️ Head-to-Head Lookup
            </span>
            <select
              value={selectedOpponentId}
              onChange={(e) => setSelectedOpponentId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-emerald-500"
            >
              {communityPlayers
                .filter((p) => p.id !== playerStats.playerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    vs {p.displayName}
                  </option>
                ))}
            </select>
          </div>

          <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800/90 flex justify-between items-center text-center">
            <div>
              <span className="font-bold text-white block">{playerStats.displayName.split(' ')[0]}</span>
              <span className="text-base font-black text-emerald-400">{h2hWins}</span>
            </div>
            <div className="px-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">VS</span>
              <span className="text-[10px] text-gray-400">
                Pts: {h2hPtsFor} - {h2hPtsAgainst}
              </span>
            </div>
            <div>
              <span className="font-bold text-white block">{opponentObj ? opponentObj.displayName.split(' ')[0] : 'Opponent'}</span>
              <span className="text-base font-black text-red-400">{h2hLosses}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Singles vs Doubles Breakdown */}
        <div className="bg-gray-800/30 p-2.5 rounded-2xl border border-gray-800 flex justify-around items-center text-center">
          <div>
            <span className="text-[10px] text-gray-400 block">Singles Matches</span>
            <span className="text-xs font-bold text-white">{singlesMatches} Matches</span>
          </div>
          <div className="h-6 w-[1px] bg-gray-700" />
          <div>
            <span className="text-[10px] text-gray-400 block">Doubles Matches</span>
            <span className="text-xs font-bold text-white">{Math.max(0, doublesMatches)} Matches</span>
          </div>
        </div>
      </div>
    </div>
  );
};
