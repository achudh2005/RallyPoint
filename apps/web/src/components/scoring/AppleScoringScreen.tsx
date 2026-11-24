import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  MoreHorizontal,
  ChevronLeft,
  X,
  AlertCircle,
  HelpCircle,
  FileText,
  Tv,
} from 'lucide-react';
import {
  ScoreNumberRoll,
  Haptics,
  BottomSheet,
  Button,
  Badge,
} from '@rallypoint/ui';
import { useMatchStore } from '../../store/matchStore.js';
import { Side, RallyEndType } from '@rallypoint/engine';
import { TVScoreboardScreen } from '../scoreboard/TVScoreboardScreen.js';

export const AppleScoringScreen: React.FC = () => {
  const {
    match,
    events,
    scoringFormat,
    scoringRulesState,
    pendingSettingChoice,
    enableRallyTagging,
    recordPoint,
    undo,
    chooseSettingChoice,
    toggleInterval,
    retireMatch,
    resetMatch,
  } = useMatchStore();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showRulesSheet, setShowRulesSheet] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [lastTaggedPointSide, setLastTaggedPointSide] = useState<Side | null>(null);
  const [serveNotice, setServeNotice] = useState<string | null>(null);
  const tagTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevServeSideRef = useRef<string | null>(null);

  // Keyboard navigation and shortcuts for refereeing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === '1') {
        e.preventDefault();
        handleScoreTap('A');
      } else if (e.key === 'ArrowDown' || e.key === '2') {
        e.preventDefault();
        handleScoreTap('B');
      } else if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 's' || e.key === 'S') {
        handleTagShot('SMASH');
      } else if (e.key === 'd' || e.key === 'D') {
        handleTagShot('DROP');
      } else if (e.key === 'n' || e.key === 'N') {
        handleTagShot('NET');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Wake lock management
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && match && match.status === 'IN_PROGRESS') {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // WakeLock unsupported or denied
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [match?.status]);

  // Detect serve change in Service Point scoring
  useEffect(() => {
    if (!match) return;
    const currentServer = match.serveState?.serverSide;
    if (
      scoringFormat.startsWith('SERVICE_') &&
      prevServeSideRef.current &&
      currentServer &&
      prevServeSideRef.current !== currentServer
    ) {
      setServeNotice('Serve changes side');
      const timer = setTimeout(() => setServeNotice(null), 2500);
      return () => clearTimeout(timer);
    }
    prevServeSideRef.current = currentServer || null;
    return undefined;
  }, [match?.serveState?.serverSide, scoringFormat]);

  if (!match) {
    return null;
  }

  if (showScoreboard) {
    return (
      <TVScoreboardScreen
        state={match}
        onExit={() => setShowScoreboard(false)}
      />
    );
  }

  const { config, currentScoreA, currentScoreB, currentGameNumber, status, serveState } = match;
  const isInterval = status === 'INTERVAL';
  const isCompleted = status === 'COMPLETED';

  const totalGames = config.bestOf || 3;

  // Format label
  const formatLabel =
    scoringFormat === 'RALLY_21'
      ? 'Rally 21'
      : scoringFormat === 'RALLY_15'
      ? 'Rally 15'
      : scoringFormat === 'RALLY_11'
      ? 'Rally 11'
      : scoringFormat === 'SERVICE_POINT_15'
      ? 'Service 15'
      : scoringFormat === 'SERVICE_POINT_11'
      ? 'Service 11'
      : 'Custom';

  const handleScoreTap = (side: Side) => {
    if (isCompleted || isInterval) return;

    Haptics.pointScored();
    recordPoint(side);

    if (enableRallyTagging) {
      setLastTaggedPointSide(side);
      if (tagTimeoutRef.current) clearTimeout(tagTimeoutRef.current);
      tagTimeoutRef.current = setTimeout(() => {
        setLastTaggedPointSide(null);
      }, 3000);
    }
  };

  const handleTagShot = (_type: RallyEndType) => {
    if (lastTaggedPointSide) {
      // Re-record with tag or log
      Haptics.selection();
      setLastTaggedPointSide(null);
      if (tagTimeoutRef.current) clearTimeout(tagTimeoutRef.current);
    }
  };

  const handleUndo = () => {
    if (events.length === 0) return;
    Haptics.undo();
    undo();
  };

  const activeSettingChoice =
    pendingSettingChoice || scoringRulesState?.pendingSettingChoice;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-black text-slate-900 dark:text-white select-none overflow-hidden">
      {/* Top Quiet Bar */}
      <header className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-black/5 dark:border-white/10 shrink-0">
        <button
          onClick={() => {
            Haptics.selection();
            setShowMoreMenu(true);
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          aria-label="Match Options"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Matches</span>
        </button>

        {/* Center Pill: Game status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-tight text-slate-700 dark:text-zinc-200">
            Game {currentGameNumber} of {totalGames}
          </span>
          <Badge variant="accent" size="sm">
            {formatLabel}
          </Badge>
        </div>

        {/* More Actions Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              Haptics.selection();
              setShowScoreboard(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 transition-colors"
            aria-label="TV Scoreboard"
            title="TV Scoreboard"
          >
            <Tv className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              Haptics.selection();
              setShowMoreMenu(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 transition-colors"
            aria-label="Match Menu"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Serve Notice Banner (Service Point mode) */}
      <AnimatePresence>
        {serveNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4 text-center text-xs font-medium text-amber-600 dark:text-amber-400"
          >
            🏸 {serveNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Split Screen: Two massive tappable halves */}
      <main className="flex-1 flex flex-col sm:flex-row relative">
        {/* Side A Half */}
        <button
          type="button"
          onClick={() => handleScoreTap('A')}
          disabled={isCompleted || isInterval}
          className="flex-1 flex flex-col items-center justify-center p-6 text-center transition-colors active:bg-emerald-500/10 dark:active:bg-emerald-500/15 focus:outline-none relative group"
          aria-label={`Score point for ${config.sideA.name}, current score ${currentScoreA}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-zinc-100 line-clamp-1">
              {config.sideA.name}
            </span>
            {serveState?.serverSide === 'A' && (
              <span
                className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                title="Currently Serving"
              >
                🏸 Serve
              </span>
            )}
          </div>

          <div className="my-2">
            <ScoreNumberRoll
              score={currentScoreA}
              size="giant"
              className="text-slate-900 dark:text-white font-extrabold"
            />
          </div>

          <span className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase">
            Tap to score
          </span>
        </button>

        {/* Quiet Subtle Divider */}
        <div className="h-px sm:h-auto sm:w-px bg-black/5 dark:bg-white/10 shrink-0 relative flex items-center justify-center">
          <div className="absolute bg-white dark:bg-zinc-900 px-3 py-1 rounded-full border border-black/5 dark:border-white/10 text-[10px] font-mono font-medium text-slate-400 dark:text-zinc-500 shadow-xs">
            VS
          </div>
        </div>

        {/* Side B Half */}
        <button
          type="button"
          onClick={() => handleScoreTap('B')}
          disabled={isCompleted || isInterval}
          className="flex-1 flex flex-col items-center justify-center p-6 text-center transition-colors active:bg-blue-500/10 dark:active:bg-blue-500/15 focus:outline-none relative group"
          aria-label={`Score point for ${config.sideB.name}, current score ${currentScoreB}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-zinc-100 line-clamp-1">
              {config.sideB.name}
            </span>
            {serveState?.serverSide === 'B' && (
              <span
                className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                title="Currently Serving"
              >
                🏸 Serve
              </span>
            )}
          </div>

          <div className="my-2">
            <ScoreNumberRoll
              score={currentScoreB}
              size="giant"
              className="text-slate-900 dark:text-white font-extrabold"
            />
          </div>

          <span className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">
            Tap to score
          </span>
        </button>
      </main>

      {/* Optional 3-Second Tagging Row */}
      <AnimatePresence>
        {lastTaggedPointSide && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="px-4 py-2 border-t border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/90 flex items-center justify-center gap-2"
          >
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mr-1">
              Tag:
            </span>
            {(['SMASH', 'DROP', 'NET', 'ERROR'] as RallyEndType[]).map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagShot(tag)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-200 transition-colors"
              >
                {tag.charAt(0) + tag.slice(1).toLowerCase()}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiet Bottom Controls */}
      <footer className="px-6 py-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-black">
        {/* Left: Court info */}
        <div className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
          {serveState?.serviceCourt ? `${serveState.serviceCourt.toUpperCase()} court` : ''}
        </div>

        {/* Center: Quiet Undo Button */}
        <button
          onClick={handleUndo}
          disabled={events.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-xs"
          aria-label="Undo last point"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        {/* Right: Sound / Speak prompt */}
        <div className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
          Game {currentGameNumber}
        </div>
      </footer>

      {/* Setting Choice Modal (Service Point: Set to 17 or Play to 15) */}
      <BottomSheet
        isOpen={Boolean(activeSettingChoice)}
        onClose={() => {}}
        title="Game Setting Option"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600 dark:text-zinc-300">
            The score reached{' '}
            <strong className="text-slate-900 dark:text-white">
              {activeSettingChoice?.atScore}-all
            </strong>
            . Does Side {activeSettingChoice?.eligibleSide} want to set the game?
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => chooseSettingChoice(true)}
            >
              Set to {activeSettingChoice?.setToTarget}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => chooseSettingChoice(false)}
            >
              No, play to {activeSettingChoice?.atScore! + 1}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Interval / Side Change Modal */}
      <BottomSheet
        isOpen={isInterval}
        onClose={() => {}}
        title="Interval & Side Change"
      >
        <div className="space-y-5 pt-2 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
            🏸
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              60-Second Break & Switch Sides
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Score: {config.sideA.name} {currentScoreA} — {currentScoreB}{' '}
              {config.sideB.name}
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              Haptics.sideChange();
              toggleInterval();
            }}
          >
            Resume Play
          </Button>
        </div>
      </BottomSheet>

      {/* More Options Bottom Sheet */}
      <BottomSheet
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        title="Match Options"
      >
        <div className="space-y-2 pt-2 pb-4">
          <button
            onClick={() => {
              setShowMoreMenu(false);
              setShowRulesSheet(true);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left text-sm font-medium transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-emerald-500" />
              <span>Rules & Format Explanation</span>
            </div>
            <span className="text-xs text-slate-400">View</span>
          </button>

          <button
            onClick={() => {
              setShowMoreMenu(false);
              setShowDetailsSheet(true);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left text-sm font-medium transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <span>Match Details & Events Log</span>
            </div>
            <span className="text-xs text-slate-400">
              {events.length} events
            </span>
          </button>

          <div className="h-px bg-black/5 dark:bg-white/10 my-2" />

          <button
            onClick={() => {
              setShowMoreMenu(false);
              retireMatch('A', 'Retired');
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-rose-500/10 text-left text-sm font-medium text-rose-600 dark:text-rose-400 transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
            <span>Retire Match ({config.sideA.name})</span>
          </button>

          <button
            onClick={() => {
              setShowMoreMenu(false);
              retireMatch('B', 'Retired');
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-rose-500/10 text-left text-sm font-medium text-rose-600 dark:text-rose-400 transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
            <span>Retire Match ({config.sideB.name})</span>
          </button>

          <button
            onClick={() => {
              setShowMoreMenu(false);
              resetMatch();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left text-sm font-medium text-slate-600 dark:text-zinc-400 transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Abandon / Reset Match</span>
          </button>
        </div>
      </BottomSheet>

      {/* Rules Explanation Sheet */}
      <BottomSheet
        isOpen={showRulesSheet}
        onClose={() => setShowRulesSheet(false)}
        title="Scoring System Guide"
      >
        <div className="space-y-4 pt-2 text-sm text-slate-600 dark:text-zinc-300">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              {formatLabel} System
            </h4>
            <p className="text-xs mt-1 leading-relaxed">
              {scoringFormat.startsWith('SERVICE_')
                ? 'Only the serving side scores a point when they win a rally. If the receiving side wins, they win the serve without scoring. Game is won at target points with setting available on ties.'
                : 'Every rally won results in a point scored, regardless of who served. Active server changes whenever the receiving side wins a point.'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl border border-black/5 dark:border-white/10 text-xs space-y-1">
            <p className="font-semibold text-slate-800 dark:text-zinc-200">
              Serve Rules:
            </p>
            <p>• Even score = Right court</p>
            <p>• Odd score = Left court</p>
            <p>• 11-point interval in Rally 21 / 8-point in 15</p>
          </div>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setShowRulesSheet(false)}
          >
            Done
          </Button>
        </div>
      </BottomSheet>

      {/* Match Details & Event Log Sheet */}
      <BottomSheet
        isOpen={showDetailsSheet}
        onClose={() => setShowDetailsSheet(false)}
        title="Point-by-Point Events"
      >
        <div className="max-h-72 overflow-y-auto space-y-2 pt-2 pr-1">
          {events.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No points recorded yet.
            </p>
          ) : (
            [...events].reverse().map((ev, i) => (
              <div
                key={ev.id || i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-xs"
              >
                <div className="font-medium text-slate-800 dark:text-zinc-200">
                  {ev.type === 'POINT'
                    ? `Point won by Side ${(ev as any).side || 'A'}`
                    : ev.type}
                </div>
                <div className="font-mono text-slate-500 dark:text-zinc-400">
                  {new Date(ev.timestamp).toLocaleTimeString([], {
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
