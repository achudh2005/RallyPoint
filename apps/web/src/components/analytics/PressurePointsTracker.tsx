import React from 'react';
import type { MatchStats } from '@rallypoint/engine';

interface PressurePointsTrackerProps {
  stats: MatchStats;
  nameA: string;
  nameB: string;
}

export const PressurePointsTracker: React.FC<PressurePointsTrackerProps> = ({
  stats,
  nameA,
  nameB,
}) => {
  const pA = stats.pressurePoints.sideA;
  const pB = stats.pressurePoints.sideB;

  const totalPressurePoints = pA.won + pB.won;
  const winRateA = totalPressurePoints > 0 ? Math.round((pA.won / totalPressurePoints) * 100) : 0;
  const winRateB = totalPressurePoints > 0 ? Math.round((pB.won / totalPressurePoints) * 100) : 0;

  // Serve vs Receive conversion
  const servePointsA = stats.pointsWonOnServeVsReceive.sideA.serve;
  const receivePointsA = stats.pointsWonOnServeVsReceive.sideA.receive;
  const totalA = servePointsA + receivePointsA;
  const servePctA = totalA > 0 ? Math.round((servePointsA / totalA) * 100) : 0;

  const servePointsB = stats.pointsWonOnServeVsReceive.sideB.serve;
  const receivePointsB = stats.pointsWonOnServeVsReceive.sideB.receive;
  const totalB = servePointsB + receivePointsB;
  const servePctB = totalB > 0 ? Math.round((servePointsB / totalB) * 100) : 0;

  return (
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
          Pressure & Clutch Points (Score 18+)
        </h4>
        <p className="text-[11px] text-gray-400">
          Conversion efficiency under late-game high-stress rallies
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700/50">
          <div className="flex justify-between items-center text-gray-300 font-semibold mb-1">
            <span className="truncate max-w-[70%]">{nameA}</span>
            <span className="text-emerald-400 font-mono font-bold">{winRateA}%</span>
          </div>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${winRateA}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
            <span>Won: {pA.won}</span>
            <span>Lost: {pA.lost}</span>
          </div>
        </div>

        <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700/50">
          <div className="flex justify-between items-center text-gray-300 font-semibold mb-1">
            <span className="truncate max-w-[70%]">{nameB}</span>
            <span className="text-cyan-400 font-mono font-bold">{winRateB}%</span>
          </div>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all"
              style={{ width: `${winRateB}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
            <span>Won: {pB.won}</span>
            <span>Lost: {pB.lost}</span>
          </div>
        </div>
      </div>

      {/* Serve vs Receive conversion card */}
      <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-800 text-xs">
        <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-2">
          Serve vs Receive Win Breakdown
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-emerald-400 font-semibold truncate">{nameA}</div>
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
              Serve: {servePointsA} ({servePctA}%) | Receive: {receivePointsA}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-cyan-400 font-semibold truncate">{nameB}</div>
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
              Serve: {servePointsB} ({servePctB}%) | Receive: {receivePointsB}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
