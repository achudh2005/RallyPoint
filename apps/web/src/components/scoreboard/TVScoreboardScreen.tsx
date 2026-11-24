import React from 'react';
import type { MatchState } from '@rallypoint/engine';
import { Maximize2, Minimize2, ArrowLeft, Trophy } from 'lucide-react';

export interface TVScoreboardScreenProps {
  state: MatchState;
  onExit: () => void;
}

export const TVScoreboardScreen: React.FC<TVScoreboardScreenProps> = ({
  state,
  onExit,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const { config, games, currentScoreA, currentScoreB, serveState, gamesWonA, gamesWonB, winnerSide } = state;
  const nameA = config.sideA?.name || 'Side A';
  const nameB = config.sideB?.name || 'Side B';
  const serverSide = serveState?.serverSide;

  return (
    <div className="fixed inset-0 bg-[#0B0B0E] text-white flex flex-col z-50 select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Match</span>
          </button>
          <span className="text-xs uppercase tracking-widest font-black text-emerald-400">
            TV Scoreboard • Game {state.currentGameNumber}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 font-medium">
            Best of {config.bestOf} • First to {config.pointsToWinGame}
          </span>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            title="Toggle Arena Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Split Court Arena */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-white/10">
        {/* Side A */}
        <div
          className={`relative flex flex-col justify-between p-8 transition-colors ${
            winnerSide === 'A'
              ? 'bg-emerald-950/30'
              : serverSide === 'A'
              ? 'bg-white/[0.03]'
              : 'bg-transparent'
          }`}
        >
          {/* Top Info */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight">{nameA}</h2>
              <p className="text-sm text-neutral-400 font-medium mt-1">
                Games Won: <span className="font-bold text-white text-base">{gamesWonA}</span>
              </p>
            </div>
            {serverSide === 'A' && (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                <span>🏸</span> Serving
              </span>
            )}
          </div>

          {/* Huge Stadium Digit */}
          <div className="my-auto text-center">
            <span className="text-[120px] sm:text-[180px] md:text-[220px] leading-none font-black tracking-tighter font-mono drop-shadow-2xl">
              {currentScoreA}
            </span>
          </div>

          {/* Winner Banner */}
          {winnerSide === 'A' && (
            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-neutral-950 font-black text-lg">
              <Trophy className="w-6 h-6" />
              <span>MATCH WINNER</span>
            </div>
          )}
        </div>

        {/* Side B */}
        <div
          className={`relative flex flex-col justify-between p-8 transition-colors ${
            winnerSide === 'B'
              ? 'bg-emerald-950/30'
              : serverSide === 'B'
              ? 'bg-white/[0.03]'
              : 'bg-transparent'
          }`}
        >
          {/* Top Info */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight">{nameB}</h2>
              <p className="text-sm text-neutral-400 font-medium mt-1">
                Games Won: <span className="font-bold text-white text-base">{gamesWonB}</span>
              </p>
            </div>
            {serverSide === 'B' && (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                <span>🏸</span> Serving
              </span>
            )}
          </div>

          {/* Huge Stadium Digit */}
          <div className="my-auto text-center">
            <span className="text-[120px] sm:text-[180px] md:text-[220px] leading-none font-black tracking-tighter font-mono drop-shadow-2xl">
              {currentScoreB}
            </span>
          </div>

          {/* Winner Banner */}
          {winnerSide === 'B' && (
            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-neutral-950 font-black text-lg">
              <Trophy className="w-6 h-6" />
              <span>MATCH WINNER</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Games Score Strip */}
      <footer className="px-6 py-4 border-t border-white/10 bg-black/60 flex items-center justify-center gap-8">
        {games.map((g, idx) => (
          <div key={idx} className="flex items-center gap-3 text-sm">
            <span className="text-neutral-400 font-semibold">Game {idx + 1}</span>
            <div className="px-3 py-1 rounded-lg bg-white/10 font-mono font-bold">
              <span className={g.scoreA > g.scoreB ? 'text-emerald-400' : 'text-neutral-400'}>
                {g.scoreA}
              </span>
              <span className="mx-1.5 text-neutral-500">-</span>
              <span className={g.scoreB > g.scoreA ? 'text-emerald-400' : 'text-neutral-400'}>
                {g.scoreB}
              </span>
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
};
