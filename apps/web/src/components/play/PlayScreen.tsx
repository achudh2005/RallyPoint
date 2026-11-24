import React, { useState } from 'react';
import {
  LargeTitle,
  GroupedList,
  GroupedSection,
  GroupedRow,
  Button,
  Badge,
  EmptyState,
} from '@rallypoint/ui';
import { useMatchStore } from '../../store/matchStore.js';
import { useRankingStore } from '../../store/rankingStore.js';
import { MatchSetupSheet } from './MatchSetupSheet.js';
import { Play, Trophy, Clock, ChevronRight } from 'lucide-react';

export interface PlayScreenProps {
  onStartMatch: () => void;
  onViewMatchDetails?: (match: any) => void;
}

export const PlayScreen: React.FC<PlayScreenProps> = ({ onStartMatch, onViewMatchDetails }) => {
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const { matches: rankingMatches } = useRankingStore();
  const { match } = useMatchStore();

  const recentMatches = rankingMatches.slice(-5).reverse();

  return (
    <div className="max-w-md mx-auto pb-28 pt-2">
      {/* iOS Large Title */}
      <LargeTitle
        title="Play"
        subtitle="RallyPoint Badminton"
        trailingAction={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready</span>
          </div>
        }
      />

      {/* Hero Single Primary Action: Start a Match */}
      <div className="px-4 py-3">
        <div className="p-6 rounded-[28px] bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
              🏸
            </div>
            <div>
              <h2 className="text-[26px] font-bold leading-tight tracking-tight">
                Start a Match
              </h2>
              <p className="text-[15px] text-white/80 mt-1">
                Score singles or doubles in one tap. Instant rules, side-outs, and live stats.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="glass"
                size="lg"
                fullWidth
                onClick={() => setIsSetupOpen(true)}
                leadingIcon={<Play className="w-5 h-5 fill-current" />}
                className="bg-white text-emerald-800 hover:bg-white/95 font-bold shadow-md"
                aria-label="Start Match"
              >
                Start Match
              </Button>
            </div>
          </div>
          {/* Subtle background decoration */}
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>
      </div>

      {/* In-Progress Match Alert Banner (if match in progress) */}
      {match && match.status === 'IN_PROGRESS' && (
        <div className="px-4 py-2">
          <div
            onClick={onStartMatch}
            className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <div>
                <p className="font-bold text-[15px]">Match in Progress</p>
                <p className="text-[13px] opacity-80">
                  Game {match.currentGameNumber} • Tap to resume live scoring
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      )}

      {/* Recent Matches Grouped List */}
      <div className="mt-4">
        {recentMatches.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-7 h-7" />}
            title="No Matches Yet"
            description="Your completed badminton matches and point logs will appear here."
            actionLabel="Start First Match"
            onAction={() => setIsSetupOpen(true)}
          />
        ) : (
          <GroupedList>
            <GroupedSection
              header="Recent Matches"
              footer="Showing last 5 completed games. All scores derive from append-only events."
            >
              {recentMatches.map((m) => {
                const sideAPlayers = m.participants
                  .filter((p) => p.side === 'A')
                  .map((p) => p.playerId.replace('cp-', ''))
                  .join(' & ');
                const sideBPlayers = m.participants
                  .filter((p) => p.side === 'B')
                  .map((p) => p.playerId.replace('cp-', ''))
                  .join(' & ');

                const scoresText =
                  m.games?.map((g) => `${g.scoreA}-${g.scoreB}`).join(', ') || 'Completed';

                const formatText = m.scoringFormat
                  ? m.scoringFormat.replace(/_/g, ' ')
                  : 'Rally 21';

                return (
                  <GroupedRow
                    key={m.id}
                    title={`${sideAPlayers} vs ${sideBPlayers}`}
                    subtitle={`${formatText} • ${scoresText}`}
                    leading={<Trophy className="w-5 h-5 text-neutral-400" />}
                    trailing={
                      <Badge variant={m.winnerSide === 'A' ? 'success' : 'neutral'} size="sm">
                        Side {m.winnerSide || 'A'} Won
                      </Badge>
                    }
                    showChevron
                    onClick={() => onViewMatchDetails?.(m)}
                  />
                );
              })}
            </GroupedSection>
          </GroupedList>
        )}
      </div>

      {/* 3-Step Match Setup Sheet */}
      <MatchSetupSheet
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onMatchStarted={onStartMatch}
      />
    </div>
  );
};
