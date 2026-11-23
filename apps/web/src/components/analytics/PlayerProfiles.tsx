import React, { useEffect, useState } from 'react';
import { db, type StoredMatch } from '../../db/index.js';

interface PlayerProfilesProps {
  nameA: string;
  nameB: string;
}

export const PlayerProfiles: React.FC<PlayerProfilesProps> = ({ nameA, nameB }) => {
  const [matches, setMatches] = useState<StoredMatch[]>([]);

  useEffect(() => {
    db.matches.toArray().then(setMatches).catch(console.warn);
  }, []);

  // Filter head-to-head matches between nameA and nameB
  const h2hMatches = matches.filter(
    (m) =>
      (m.config.sideA.name === nameA && m.config.sideB.name === nameB) ||
      (m.config.sideA.name === nameB && m.config.sideB.name === nameA)
  );

  let winsA = 0;
  let winsB = 0;
  for (const m of h2hMatches) {
    if (m.state.winnerSide) {
      const winnerName =
        m.state.winnerSide === 'A' ? m.config.sideA.name : m.config.sideB.name;
      if (winnerName === nameA) winsA++;
      else if (winnerName === nameB) winsB++;
    }
  }

  // Last 10 matches form trend for player A
  const matchesA = matches
    .filter((m) => m.config.sideA.name === nameA || m.config.sideB.name === nameA)
    .slice(-10);

  const formTrendA = matchesA.map((m) => {
    const isSideA = m.config.sideA.name === nameA;
    const won = isSideA ? m.state.winnerSide === 'A' : m.state.winnerSide === 'B';
    return won ? 'W' : 'L';
  });

  // Last 10 matches form trend for player B
  const matchesB = matches
    .filter((m) => m.config.sideA.name === nameB || m.config.sideB.name === nameB)
    .slice(-10);

  const formTrendB = matchesB.map((m) => {
    const isSideA = m.config.sideA.name === nameB;
    const won = isSideA ? m.state.winnerSide === 'A' : m.state.winnerSide === 'B';
    return won ? 'W' : 'L';
  });

  return (
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
          Head-to-Head & Player Profiles
        </h4>
        <p className="text-[11px] text-gray-400">Historical encounters and form streak</p>
      </div>

      {/* Head to Head Display */}
      <div className="bg-gray-800/60 p-4 rounded-xl border border-gray-700/60 flex items-center justify-between">
        <div className="text-left">
          <div className="text-xs font-bold text-emerald-400">{nameA}</div>
          <div className="text-2xl font-mono font-black text-white mt-0.5">{winsA}</div>
          <div className="text-[10px] text-gray-400">Wins</div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
            H2H
          </span>
          <span className="text-[10px] text-gray-500">
            {h2hMatches.length} Recorded Match{h2hMatches.length === 1 ? '' : 'es'}
          </span>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold text-cyan-400">{nameB}</div>
          <div className="text-2xl font-mono font-black text-white mt-0.5">{winsB}</div>
          <div className="text-[10px] text-gray-400">Wins</div>
        </div>
      </div>

      {/* Form Trend (Last 10 matches) */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-800">
          <div className="text-[11px] font-semibold text-emerald-300 truncate mb-2">
            {nameA} Form (Last 10)
          </div>
          <div className="flex gap-1 flex-wrap">
            {formTrendA.length === 0 ? (
              <span className="text-[10px] text-gray-500">No prior history</span>
            ) : (
              formTrendA.map((res, i) => (
                <span
                  key={i}
                  className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] ${
                    res === 'W'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-900 text-rose-200'
                  }`}
                >
                  {res}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-800">
          <div className="text-[11px] font-semibold text-cyan-300 truncate mb-2">
            {nameB} Form (Last 10)
          </div>
          <div className="flex gap-1 flex-wrap">
            {formTrendB.length === 0 ? (
              <span className="text-[10px] text-gray-500">No prior history</span>
            ) : (
              formTrendB.map((res, i) => (
                <span
                  key={i}
                  className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] ${
                    res === 'W'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-900 text-rose-200'
                  }`}
                >
                  {res}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
