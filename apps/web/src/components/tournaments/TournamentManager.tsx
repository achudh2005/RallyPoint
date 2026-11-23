import React, { useState } from 'react';
import {
  computeStandings,
  generateKnockoutBracket,
  generateRoundRobinSchedule,
  type TournamentFormat,
  type TournamentMatch,
  type TournamentPlayer,
} from '../../tournaments/tournamentEngine.js';

interface TournamentManagerProps {
  onClose: () => void;
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({ onClose }) => {
  const [tournamentName, setTournamentName] = useState('All England Club Championship');
  const [format, setFormat] = useState<TournamentFormat>('KNOCKOUT');
  const [courts, setCourts] = useState<number>(3);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [players, setPlayers] = useState<TournamentPlayer[]>([
    { id: 'p1', name: 'Viktor Axelsen' },
    { id: 'p2', name: 'Lee Zii Jia' },
    { id: 'p3', name: 'Kento Momota' },
    { id: 'p4', name: 'Shi Yuqi' },
    { id: 'p5', name: 'Anthony Ginting' },
    { id: 'p6', name: 'Jonatan Christie' },
    { id: 'p7', name: 'Anders Antonsen' },
    { id: 'p8', name: 'Loh Kean Yew' },
  ]);

  const [matches, setMatches] = useState<TournamentMatch[]>(() =>
    generateKnockoutBracket(players, 3)
  );

  const handleGenerate = () => {
    if (format === 'KNOCKOUT') {
      setMatches(generateKnockoutBracket(players, courts));
    } else {
      setMatches(generateRoundRobinSchedule(players, courts));
    }
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const newPlayer: TournamentPlayer = {
      id: `p-${Date.now()}`,
      name: newPlayerName.trim(),
    };
    const updated = [...players, newPlayer];
    setPlayers(updated);
    setNewPlayerName('');
    if (format === 'KNOCKOUT') {
      setMatches(generateKnockoutBracket(updated, courts));
    } else {
      setMatches(generateRoundRobinSchedule(updated, courts));
    }
  };

  const handleRecordMatchWinner = (matchId: string, winnerId: string) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const isA = m.playerA?.id === winnerId;
          return {
            ...m,
            winnerId,
            scoreA: isA ? 21 : 18,
            scoreB: isA ? 18 : 21,
            isCompleted: true,
          };
        }
        return m;
      })
    );
  };

  const standings = computeStandings(players, matches);

  // Group matches by round for bracket view
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            🏆 Tournament Manager
          </h2>
          <input
            type="text"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="text-xs text-gray-400 bg-transparent border-b border-transparent focus:border-gray-600 focus:outline-none focus:text-white transition-colors"
          />
        </div>
        <button
          onClick={onClose}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-3 py-1.5 rounded-xl transition-colors"
        >
          Exit Tournament
        </button>
      </div>

      {/* Configuration Strip */}
      <div className="grid grid-cols-3 gap-3 bg-gray-800/50 p-3 rounded-2xl border border-gray-800 text-xs">
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
            Format
          </label>
          <select
            value={format}
            onChange={(e) => {
              const f = e.target.value as TournamentFormat;
              setFormat(f);
              if (f === 'KNOCKOUT') setMatches(generateKnockoutBracket(players, courts));
              else setMatches(generateRoundRobinSchedule(players, courts));
            }}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-xs focus:outline-none"
          >
            <option value="KNOCKOUT">Single Elimination Knockout</option>
            <option value="ROUND_ROBIN">Round Robin</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
            Available Courts
          </label>
          <select
            value={courts}
            onChange={(e) => {
              const c = Number(e.target.value);
              setCourts(c);
              if (format === 'KNOCKOUT') setMatches(generateKnockoutBracket(players, c));
              else setMatches(generateRoundRobinSchedule(players, c));
            }}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-xs focus:outline-none"
          >
            <option value="1">1 Court</option>
            <option value="2">2 Courts</option>
            <option value="3">3 Courts</option>
            <option value="4">4 Courts</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold uppercase text-[11px] tracking-wide transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Add Player Input */}
      <form onSubmit={handleAddPlayer} className="flex gap-2 text-xs">
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="Add player name..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold border border-emerald-800/80 rounded-xl transition-colors"
        >
          + Add
        </button>
      </form>

      {/* Bracket / Schedule View */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-3">
          {format === 'KNOCKOUT' ? 'Tournament Bracket' : 'Round Robin Schedule'}
        </h3>

        {format === 'KNOCKOUT' ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {rounds.map((r) => {
              const roundMatches = matches.filter((m) => m.round === r);
              return (
                <div key={r} className="min-w-[220px] flex flex-col gap-3">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 bg-gray-800/80 px-2 py-1 rounded-md text-center">
                    {r === rounds.length ? 'Final' : r === rounds.length - 1 ? 'Semi-Final' : `Round ${r}`}
                  </div>
                  <div className="space-y-2">
                    {roundMatches.map((m) => (
                      <div
                        key={m.id}
                        className="bg-gray-800/70 border border-gray-700/60 rounded-xl p-2.5 text-xs shadow-md"
                      >
                        <div className="text-[10px] text-gray-500 font-mono mb-1">
                          {m.scheduledTime}
                        </div>
                        <div
                          onClick={() => m.playerA && handleRecordMatchWinner(m.id, m.playerA.id)}
                          className={`cursor-pointer p-1 rounded flex justify-between items-center transition-colors ${
                            m.winnerId === m.playerA?.id
                              ? 'bg-emerald-950 text-emerald-300 font-bold'
                              : 'text-gray-300 hover:bg-gray-700/50'
                          }`}
                        >
                          <span className="truncate">{m.playerA?.name ?? 'TBD'}</span>
                          {m.winnerId === m.playerA?.id && <span>✓</span>}
                        </div>
                        <div
                          onClick={() => m.playerB && handleRecordMatchWinner(m.id, m.playerB.id)}
                          className={`cursor-pointer p-1 rounded flex justify-between items-center mt-1 transition-colors ${
                            m.winnerId === m.playerB?.id
                              ? 'bg-emerald-950 text-emerald-300 font-bold'
                              : 'text-gray-300 hover:bg-gray-700/50'
                          }`}
                        >
                          <span className="truncate">{m.playerB?.name ?? 'TBD'}</span>
                          {m.winnerId === m.playerB?.id && <span>✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {matches.map((m) => (
              <div
                key={m.id}
                className="bg-gray-800/70 border border-gray-700/60 rounded-xl p-2.5 text-xs flex justify-between items-center"
              >
                <div>
                  <div className="text-[10px] text-gray-500">{m.scheduledTime}</div>
                  <div className="font-semibold text-white mt-0.5">
                    {m.playerA?.name} vs {m.playerB?.name}
                  </div>
                </div>
                {m.isCompleted ? (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    Completed
                  </span>
                ) : (
                  <button
                    onClick={() => m.playerA && handleRecordMatchWinner(m.id, m.playerA.id)}
                    className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-1 rounded-lg"
                  >
                    Simulate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standings Table */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
          Standings & Tiebreakers
        </h3>
        <div className="overflow-x-auto bg-gray-950 rounded-xl border border-gray-800 text-xs font-mono">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-gray-400 border-b border-gray-800 text-[10px]">
              <tr>
                <th className="p-2.5">#</th>
                <th className="p-2.5">Player</th>
                <th className="p-2.5">P</th>
                <th className="p-2.5">W</th>
                <th className="p-2.5">L</th>
                <th className="p-2.5">Diff</th>
                <th className="p-2.5 font-bold text-emerald-400">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850">
              {standings.map((s, idx) => (
                <tr key={s.playerId} className="hover:bg-gray-900/50">
                  <td className="p-2.5 text-gray-500">{idx + 1}</td>
                  <td className="p-2.5 font-sans font-bold text-white">{s.playerName}</td>
                  <td className="p-2.5 text-gray-400">{s.played}</td>
                  <td className="p-2.5 text-emerald-400 font-bold">{s.won}</td>
                  <td className="p-2.5 text-rose-400">{s.lost}</td>
                  <td className="p-2.5 text-gray-300">
                    {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                  </td>
                  <td className="p-2.5 font-bold text-emerald-400">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
