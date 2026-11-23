import React, { useState } from 'react';
import type { MatchConfig, MatchMode, Side } from '@rallypoint/engine';
import { useMatchStore } from '../store/matchStore.js';

export const MatchSetup: React.FC = () => {
  const { startMatch, resumeLastMatch } = useMatchStore();

  const [mode, setMode] = useState<MatchMode>('singles');
  const [bestOf, setBestOf] = useState<number>(3);
  const [sideAName, setSideAName] = useState('Viktor Axelsen');
  const [sideBName, setSideBName] = useState('Lee Zii Jia');
  const [playerA2, setPlayerA2] = useState('Partner A');
  const [playerB2, setPlayerB2] = useState('Partner B');
  const [initialServerSide, setInitialServerSide] = useState<Side>('A');
  const [enableTagging, setEnableTagging] = useState(false);
  const [hasResumed, setHasResumed] = useState<boolean | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();

    const config: MatchConfig = {
      id: `match-${Date.now()}`,
      mode,
      bestOf,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: {
        id: 'side-a',
        name: sideAName.trim() || 'Side A',
        playerIds: mode === 'doubles' ? [sideAName.trim(), playerA2.trim()] : [sideAName.trim()],
      },
      sideB: {
        id: 'side-b',
        name: sideBName.trim() || 'Side B',
        playerIds: mode === 'doubles' ? [sideBName.trim(), playerB2.trim()] : [sideBName.trim()],
      },
      initialServerSide,
      initialServerPlayerId: initialServerSide === 'A' ? sideAName.trim() : sideBName.trim(),
      startTime: Date.now(),
    };

    await startMatch(config, enableTagging);
  };

  const handleResume = async () => {
    const success = await resumeLastMatch();
    if (!success) {
      setHasResumed(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-5 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            🏸 RallyPoint
          </h2>
          <p className="text-xs text-gray-400">BWF Tournament-grade live scoring</p>
        </div>
        <button
          type="button"
          onClick={handleResume}
          className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-700/60 hover:bg-emerald-900 px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          Resume Last
        </button>
      </div>

      {hasResumed === false && (
        <div className="mb-4 p-2.5 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
          No unfinished matches found in local database.
        </div>
      )}

      <form onSubmit={handleStart} className="flex flex-col gap-4 text-sm">
        {/* Mode & BestOf */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Match Type</label>
            <div className="grid grid-cols-2 bg-gray-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('singles')}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  mode === 'singles' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400'
                }`}
              >
                Singles
              </button>
              <button
                type="button"
                onClick={() => setMode('doubles')}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  mode === 'doubles' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400'
                }`}
              >
                Doubles
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Format</label>
            <div className="grid grid-cols-3 bg-gray-800 p-1 rounded-xl">
              {[1, 3, 5].map((bo) => (
                <button
                  key={bo}
                  type="button"
                  onClick={() => setBestOf(bo)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    bestOf === bo ? 'bg-emerald-600 text-white shadow' : 'text-gray-400'
                  }`}
                >
                  Bo{bo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Side A Details */}
        <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/60 flex flex-col gap-2">
          <label className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
            Side A {mode === 'doubles' ? 'Pair' : 'Player'}
          </label>
          <input
            type="text"
            required
            value={sideAName}
            onChange={(e) => setSideAName(e.target.value)}
            placeholder="Player 1 Name"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
          {mode === 'doubles' && (
            <input
              type="text"
              required
              value={playerA2}
              onChange={(e) => setPlayerA2(e.target.value)}
              placeholder="Player 2 Name"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          )}
        </div>

        {/* Side B Details */}
        <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/60 flex flex-col gap-2">
          <label className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
            Side B {mode === 'doubles' ? 'Pair' : 'Player'}
          </label>
          <input
            type="text"
            required
            value={sideBName}
            onChange={(e) => setSideBName(e.target.value)}
            placeholder="Player 1 Name"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
          />
          {mode === 'doubles' && (
            <input
              type="text"
              required
              value={playerB2}
              onChange={(e) => setPlayerB2(e.target.value)}
              placeholder="Player 2 Name"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          )}
        </div>

        {/* Initial Server */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">First Service</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setInitialServerSide('A')}
              className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                initialServerSide === 'A'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
            >
              Side A Serves First
            </button>
            <button
              type="button"
              onClick={() => setInitialServerSide('B')}
              className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                initialServerSide === 'B'
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
            >
              Side B Serves First
            </button>
          </div>
        </div>

        {/* Rally Tagging Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-xl border border-gray-800">
          <div>
            <div className="text-xs font-semibold text-white">Rally-end Tagging</div>
            <div className="text-[11px] text-gray-400">Prompt for shot type (Smash, Drop, Net, Out) after each point</div>
          </div>
          <button
            type="button"
            onClick={() => setEnableTagging(!enableTagging)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              enableTagging ? 'bg-emerald-600 justify-end' : 'bg-gray-700 justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
          </button>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950 text-sm tracking-wide uppercase transition-all tap-active"
        >
          Start Match
        </button>
      </form>
    </div>
  );
};
