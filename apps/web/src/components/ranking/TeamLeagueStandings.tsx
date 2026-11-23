import React, { useState } from 'react';
import { useRankingStore } from '../../store/rankingStore.js';
import type { TeamRankingCategory } from '@rallypoint/ranking';

export interface ClubTeamRow {
  id: string;
  name: string;
  roster: string[];
  played: number;
  won: number;
  tied: number;
  lost: number;
  points: number; // 3 for W, 1 for T, 0 for L
  gameDiff: number;
  pointDiff: number;
  form: ('W' | 'L' | 'D')[];
}

const SAMPLE_CLUB_TEAMS: ClubTeamRow[] = [
  {
    id: 'ct-1',
    name: 'Thunder Shuttlers',
    roster: ['Viktor Axelsen', 'Anders Antonsen'],
    played: 6,
    won: 5,
    tied: 0,
    lost: 1,
    points: 15,
    gameDiff: +8,
    pointDiff: +46,
    form: ['W', 'W', 'W', 'L', 'W'],
  },
  {
    id: 'ct-2',
    name: 'Apex Smashers',
    roster: ['Kento Momota', 'Lee Zii Jia'],
    played: 6,
    won: 4,
    tied: 1,
    lost: 1,
    points: 13,
    gameDiff: +5,
    pointDiff: +28,
    form: ['W', 'W', 'D', 'W', 'L'],
  },
  {
    id: 'ct-3',
    name: 'Dragon Warriors',
    roster: ['Shi Yuqi', 'Anthony Ginting'],
    played: 6,
    won: 2,
    tied: 1,
    lost: 3,
    points: 7,
    gameDiff: -1,
    pointDiff: -6,
    form: ['L', 'W', 'D', 'L', 'W'],
  },
  {
    id: 'ct-4',
    name: 'Phoenix Flight',
    roster: ['Lakshya Sen', 'H.S. Prannoy'],
    played: 6,
    won: 0,
    tied: 0,
    lost: 6,
    points: 0,
    gameDiff: -12,
    pointDiff: -68,
    form: ['L', 'L', 'L', 'L', 'L'],
  },
];

export const TeamLeagueStandings: React.FC = () => {
  const { teamLeaderboards } = useRankingStore();
  const [subTab, setSubTab] = useState<'DOUBLES_PAIRS' | 'CLUB_TEAMS'>('DOUBLES_PAIRS');
  const [selectedPairCategory, setSelectedPairCategory] =
    useState<TeamRankingCategory>('OVERALL_TEAM');
  const [promotionCutoff] = useState(2);
  const [relegationCutoff] = useState(3);

  const pairEntries = teamLeaderboards[selectedPairCategory] || [];

  return (
    <div className="flex flex-col gap-3">
      {/* Sub Tabs: Doubles Pairs vs Club Teams */}
      <div className="flex justify-between items-center bg-gray-900/80 p-1.5 rounded-2xl border border-gray-800">
        <div className="flex gap-1">
          <button
            onClick={() => setSubTab('DOUBLES_PAIRS')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
              subTab === 'DOUBLES_PAIRS'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🏸 Doubles Pairs
          </button>
          <button
            onClick={() => setSubTab('CLUB_TEAMS')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
              subTab === 'CLUB_TEAMS'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🛡️ Club Teams League
          </button>
        </div>

        {subTab === 'CLUB_TEAMS' && (
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Top {promotionCutoff} Promotion
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Below {relegationCutoff} Relegation
            </span>
          </div>
        )}
      </div>

      {subTab === 'DOUBLES_PAIRS' ? (
        <div className="space-y-2">
          {/* Category Switcher for Pairs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
            {(
              [
                { cat: 'OVERALL_TEAM', label: 'Overall Pairs' },
                { cat: 'MOST_TEAM_WINS', label: 'Most Wins' },
                { cat: 'BEST_TEAM_WIN_RATE', label: 'Win Rate' },
                { cat: 'BEST_POINT_DIFFERENCE', label: 'Point Diff' },
              ] as const
            ).map(({ cat, label }) => (
              <button
                key={cat}
                onClick={() => setSelectedPairCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedPairCategory === cat
                    ? 'bg-emerald-500 text-gray-950 font-black'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-800/40">
                  <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                  <th className="py-2.5 px-3">Doubles Pair</th>
                  <th className="py-2.5 px-3 text-center">Matches</th>
                  <th className="py-2.5 px-3 text-right">Wins - Losses</th>
                  <th className="py-2.5 px-3 text-right">Win Rate</th>
                  <th className="py-2.5 px-3 text-right">Pt Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {pairEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No doubles pair matches recorded yet. Play a doubles match to see rankings!
                    </td>
                  </tr>
                ) : (
                  pairEntries.map((entry) => {
                    const stats = entry.stats;
                    return (
                      <tr key={entry.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold">
                          {entry.rank === 1 ? (
                            <span className="text-amber-400 text-sm">🥇</span>
                          ) : entry.rank === 2 ? (
                            <span className="text-gray-300 text-sm">🥈</span>
                          ) : entry.rank === 3 ? (
                            <span className="text-amber-600 text-sm">🥉</span>
                          ) : (
                            <span className="text-gray-400">{entry.rank}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-white">
                          {entry.name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                            Matches: {entry.matchesPlayed}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-300 font-mono">
                          {stats.wins}W - {stats.losses}L
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-400 font-mono">
                          {stats.winRate}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-300">
                          {stats.pointDifference >= 0 ? `+${stats.pointDifference}` : stats.pointDifference}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Club Teams League Table with Promotion/Relegation Cutoffs */
        <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-800/40">
                <th className="py-2.5 px-3 w-12 text-center">Pos</th>
                <th className="py-2.5 px-3">Club Team</th>
                <th className="py-2.5 px-3 text-center">Pld</th>
                <th className="py-2.5 px-3 text-center">W - D - L</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-400">Pts</th>
                <th className="py-2.5 px-3 text-right">Game Diff</th>
                <th className="py-2.5 px-3 text-right">Pt Diff</th>
                <th className="py-2.5 px-3 text-center">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {SAMPLE_CLUB_TEAMS.map((team, idx) => {
                const pos = idx + 1;
                const isPromotionZone = pos <= promotionCutoff;
                const isRelegationZone = pos > relegationCutoff;

                return (
                  <tr
                    key={team.id}
                    className={`transition-colors ${
                      isPromotionZone
                        ? 'border-l-4 border-l-emerald-500 bg-emerald-950/10'
                        : isRelegationZone
                        ? 'border-l-4 border-l-rose-500 bg-rose-950/10'
                        : 'hover:bg-gray-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-bold">
                      {pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-extrabold text-white">{team.name}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[150px]">
                        {team.roster.join(', ')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-300">
                      {team.played}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-300">
                      {team.won}-{team.tied}-{team.lost}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-white font-mono text-sm">
                      {team.points}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-300">
                      {team.gameDiff >= 0 ? `+${team.gameDiff}` : team.gameDiff}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-300">
                      {team.pointDiff >= 0 ? `+${team.pointDiff}` : team.pointDiff}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {team.form.map((res, fIdx) => (
                          <span
                            key={fIdx}
                            className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                              res === 'W'
                                ? 'bg-emerald-500 text-gray-950'
                                : res === 'D'
                                ? 'bg-amber-500 text-gray-950'
                                : 'bg-rose-500 text-white'
                            }`}
                          >
                            {res}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
