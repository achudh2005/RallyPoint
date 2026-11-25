import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, Share2, HelpCircle, ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react';
import { BottomSheet, Button } from '@rallypoint/ui';
import type { MatchAwardsResult } from '@rallypoint/ranking';
import { nativeShare } from '../../mobile/nativeShare.js';
import { nativeHaptics } from '../../mobile/haptics.js';

interface MvpRevealCardProps {
  awards: MatchAwardsResult;
  matchTitle?: string;
}

export const MvpRevealCard: React.FC<MvpRevealCardProps> = ({
  awards,
  matchTitle = 'Badminton Match',
}) => {
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [showFormulaSheet, setShowFormulaSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  const { isQualified, mvp, fighter, allContributions, disqualificationReason } = awards;

  // Gentle confetti celebration once when MVP is qualified
  useEffect(() => {
    if (isQualified && mvp) {
      try {
        const isTestEnv =
          typeof process !== 'undefined' &&
          (process.env.NODE_ENV === 'test' || !!process.env.VITEST);
        if (!isTestEnv) {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899'],
            disableForReducedMotion: true,
          });
        }
      } catch {
        // Safe fallback in test/mock environment
      }
    }
  }, [isQualified, mvp?.playerId]);

  const handleShare = async () => {
    if (!mvp) return;
    nativeHaptics.selection();

    const fighterStr = fighter ? ` | Fighter: ${fighter.name} (${fighter.mvpScore} pts)` : '';
    const text = `🏸 ${matchTitle} MVP: ${mvp.name} (${mvp.mvpScore} pts)${fighterStr} on RallyPoint! ${mvp.summaryLine}`;

    const shared = await nativeShare.shareText('Match MVP Announcement', text);
    if (!shared && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isQualified || !mvp) {
    return (
      <div
        data-testid="mvp-unqualified-card"
        className="p-4 rounded-3xl bg-neutral-100 dark:bg-neutral-800/60 border border-black/5 dark:border-white/10 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-1 text-neutral-400">
          <Award className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Match MVP</span>
        </div>
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {disqualificationReason || 'MVP not available (needs at least 5 attributed player actions)'}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="mvp-reveal-card"
      className="p-5 rounded-3xl bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 shadow-lg relative overflow-hidden"
    >
      {/* Decorative top accent badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Match MVP</span>
        </div>

        <button
          onClick={() => {
            nativeHaptics.selection();
            setShowFormulaSheet(true);
          }}
          className="flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How it works</span>
        </button>
      </div>

      {/* Main MVP Header & Avatar */}
      <div className="flex items-center gap-4 mb-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white font-extrabold flex items-center justify-center text-xl shadow-md select-none">
            {mvp.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="absolute -top-1.5 -right-1.5 text-base select-none">🌟</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white truncate">
              {mvp.name}
            </h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-black/10 dark:bg-white/10 text-neutral-500 dark:text-neutral-300">
              Side {mvp.teamSide}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-mono font-black text-amber-600 dark:text-amber-400">
              {mvp.mvpScore.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-neutral-400">MVP rating</span>
          </div>
        </div>
      </div>

      {/* Summary Line */}
      {mvp.summaryLine && (
        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-3 italic">
          "{mvp.summaryLine}"
        </p>
      )}

      {/* Reason Chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {mvp.reasonChips.map((chip, idx) => (
          <span
            key={idx}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20"
          >
            {chip}
          </span>
        ))}
      </div>

      {/* Fighter Award Mention if present */}
      {fighter && (
        <div
          data-testid="fighter-award-badge"
          className="p-3 mb-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none">🛡️</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400">
                  Fighter Award
                </span>
                <span className="text-[10px] text-neutral-400">• Losing side MVP</span>
              </div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {fighter.name}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {fighter.pointsWon} pts · {fighter.drops} drops · {fighter.clutchPoints} clutch pts
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10">
            {fighter.mvpScore.toFixed(1)}
          </span>
        </div>
      )}

      {/* Action Buttons: Share & Expand All */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors active:scale-98"
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'Copied Link' : 'Share MVP Card'}</span>
        </button>

        <button
          onClick={() => {
            nativeHaptics.selection();
            setShowAllPlayers((prev) => !prev);
          }}
          className="py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200 font-semibold text-xs flex items-center gap-1 transition-colors"
        >
          <span>See all</span>
          {showAllPlayers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Table: Full Participant MVP Rankings */}
      {showAllPlayers && (
        <div
          data-testid="all-players-mvp-table"
          className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 space-y-2"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
            Full Match Player Rankings
          </span>

          <div className="space-y-1.5">
            {allContributions.map((p, rankIdx) => {
              const isMvp = p.playerId === mvp.playerId;
              const isFighter = fighter && p.playerId === fighter.playerId;

              return (
                <div
                  key={p.playerId}
                  className={`p-2.5 rounded-xl flex items-center justify-between text-xs ${
                    isMvp
                      ? 'bg-amber-500/20 font-bold border border-amber-500/30'
                      : 'bg-black/5 dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-400 font-semibold w-4">
                      #{rankIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-900 dark:text-white font-semibold">
                          {p.name}
                        </span>
                        {isMvp && <span className="text-[10px] text-amber-500">🌟 MVP</span>}
                        {isFighter && !isMvp && (
                          <span className="text-[10px] text-blue-400">🛡️ Fighter</span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {p.pointsWon} pts · {p.drops} drops · {p.clutchPoints} clutch · Streak {p.bestPointStreak}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {p.mvpScore.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Sheet: How MVP is Calculated */}
      <BottomSheet
        isOpen={showFormulaSheet}
        onClose={() => setShowFormulaSheet(false)}
        title="How is MVP Calculated?"
      >
        <div className="space-y-4 text-xs text-neutral-700 dark:text-neutral-300 select-none pb-6">
          <p>
            Match MVP honors the most impactful player on court using a transparent, event-sourced
            formula (<code>v1.0.0</code>).
          </p>

          <div className="space-y-2 p-3 rounded-2xl bg-black/5 dark:bg-white/5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span>Points Won</span>
              <span className="text-emerald-500 font-bold">+3.0</span>
            </div>
            <div className="flex justify-between">
              <span>Serve Regained</span>
              <span className="text-emerald-500 font-bold">+2.5 &times; 1.5 in Service Point</span>
            </div>
            <div className="flex justify-between">
              <span>Clutch Points (End-game / Setting)</span>
              <span className="text-emerald-500 font-bold">+2.0</span>
            </div>
            <div className="flex justify-between">
              <span>Comeback Points (Trailing &ge; 4)</span>
              <span className="text-emerald-500 font-bold">+1.5</span>
            </div>
            <div className="flex justify-between">
              <span>Point Streak Bonus (Beyond 2nd)</span>
              <span className="text-emerald-500 font-bold">+1.0 per pt</span>
            </div>
            <div className="flex justify-between">
              <span>Drops Conceded</span>
              <span className="text-rose-500 font-bold">-2.0</span>
            </div>
            <div className="flex justify-between">
              <span>Clutch Drops Conceded</span>
              <span className="text-rose-500 font-bold">-1.0 extra</span>
            </div>
            <div className="flex justify-between">
              <span>Match Winner Bonus</span>
              <span className="text-amber-500 font-bold">+5.0</span>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-neutral-900 dark:text-white">Tie-Breakers</h4>
            <p className="text-[11px] text-neutral-500">
              1. Fewer drops conceded &rarr; 2. More serve regains &rarr; 3. More clutch points &rarr; 4. Winning side &rarr; 5. Co-MVPs.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-neutral-900 dark:text-white">Fighter Award</h4>
            <p className="text-[11px] text-neutral-500">
              The highest-rated performer on the losing side receives the Fighter Award for outstanding resilience.
            </p>
          </div>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setShowFormulaSheet(false)}
          >
            Got it
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
