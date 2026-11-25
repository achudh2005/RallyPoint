import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BottomSheet,
  Button,
  SegmentedControl,
  Avatar,
  Badge,
  Haptics,
} from '@rallypoint/ui';
import { useRankingStore } from '../../store/rankingStore.js';
import { useMatchStore } from '../../store/matchStore.js';
import { ScoringFormat } from '@rallypoint/scoring-rules';
import { Search, Sparkles, Check, ArrowRight, ArrowLeft } from 'lucide-react';

export interface MatchSetupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchStarted: () => void;
}

export const MatchSetupSheet: React.FC<MatchSetupSheetProps> = ({
  isOpen,
  onClose,
  onMatchStarted,
}) => {
  const { communityPlayers, addCommunityPlayer, autoSuggestDoublesPairs } = useRankingStore();
  const { startMatch } = useMatchStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Who's playing?
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddName, setQuickAddName] = useState('');

  // Step 2: How do you want to score?
  const [systemType, setSystemType] = useState<'RALLY' | 'SERVICE'>('RALLY');
  const [targetScore, setTargetScore] = useState<'21' | '15' | '11'>('21');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useCustomRules, setUseCustomRules] = useState(false);
  const [customTarget, setCustomTarget] = useState(21);
  const [customWinBy, setCustomWinBy] = useState(2);
  const [customCap, setCustomCap] = useState(30);

  // Step 3: Who serves first?
  const [firstServerSide, setFirstServerSide] = useState<'A' | 'B'>('A');
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);

  // Filtered active players (exclude archived & hidden)
  const activePlayers = communityPlayers.filter(
    (p) => p.status !== 'ARCHIVED' && p.status !== 'HIDDEN'
  );
  const filteredPlayers = activePlayers.filter((p) =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isDoubles = selectedPlayerIds.length === 4;

  const togglePlayer = (id: string) => {
    Haptics.selection();
    if (selectedPlayerIds.includes(id)) {
      if (selectedPlayerIds.length > 2) {
        setSelectedPlayerIds(selectedPlayerIds.filter((p) => p !== id));
      }
    } else {
      if (selectedPlayerIds.length < 4) {
        setSelectedPlayerIds([...selectedPlayerIds, id]);
      } else {
        // Replace last
        setSelectedPlayerIds([...selectedPlayerIds.slice(0, 3), id]);
      }
    }
  };

  const handleSuggestTeams = () => {
    Haptics.selection();
    const targetIds =
      selectedPlayerIds.length === 4
        ? selectedPlayerIds
        : communityPlayers.slice(0, 4).map((p) => p.id);

    const balanced = autoSuggestDoublesPairs(targetIds);
    if (balanced) {
      setSelectedPlayerIds([
        balanced.pairA[0].id,
        balanced.pairA[1].id,
        balanced.pairB[0].id,
        balanced.pairB[1].id,
      ]);
    }
  };

  const handleCoinFlip = () => {
    setIsFlippingCoin(true);
    Haptics.selection();
    setTimeout(() => {
      const pick = Math.random() < 0.5 ? 'A' : 'B';
      setFirstServerSide(pick);
      setIsFlippingCoin(false);
      Haptics.pointScored();
    }, 450);
  };

  const getResolvedScoringFormat = (): ScoringFormat => {
    if (useCustomRules) return 'CUSTOM';
    if (systemType === 'RALLY') {
      if (targetScore === '21') return 'RALLY_21';
      if (targetScore === '15') return 'RALLY_15';
      return 'RALLY_11';
    } else {
      if (targetScore === '15') return 'SERVICE_POINT_15';
      if (targetScore === '11') return 'SERVICE_POINT_11';
      return 'SERVICE_POINT_15';
    }
  };

  const handleStart = () => {
    Haptics.pointScored();
    const scoringFormat = getResolvedScoringFormat();
    const targetPoints = useCustomRules ? customTarget : parseInt(targetScore, 10);

    const config: any = {
      id: `m-${Date.now()}`,
      mode: isDoubles ? 'doubles' : 'singles',
      scoringFormat,
      customFormatConfig: useCustomRules
        ? {
            scoringType: systemType,
            targetPoints: customTarget,
            winBy: customWinBy,
            cap: customCap,
          }
        : undefined,
      bestOf: 3,
      pointsToWinGame: targetPoints,
      tiebreakCap: customCap,
      sideA: {
        id: 'sa',
        name: sideAName,
        playerIds: isDoubles
          ? [selectedPlayerIds[0] || 'p1', selectedPlayerIds[1] || 'p2']
          : [selectedPlayerIds[0] || 'p1'],
      },
      sideB: {
        id: 'sb',
        name: sideBName,
        playerIds: isDoubles
          ? [selectedPlayerIds[2] || 'p3', selectedPlayerIds[3] || 'p4']
          : [selectedPlayerIds[1] || 'p2'],
      },
      initialServerSide: firstServerSide,
      initialServerPlayerId:
        firstServerSide === 'A'
          ? (selectedPlayerIds[0] || 'p1')
          : (isDoubles ? (selectedPlayerIds[2] || 'p3') : (selectedPlayerIds[1] || 'p2')),
    };

    startMatch(config);

    onClose();
    onMatchStarted();
  };

  const sideAName = isDoubles
    ? `${communityPlayers.find((p) => p.id === selectedPlayerIds[0])?.displayName?.split(' ')[0]} & ${communityPlayers.find((p) => p.id === selectedPlayerIds[1])?.displayName?.split(' ')[0]}`
    : communityPlayers.find((p) => p.id === selectedPlayerIds[0])?.displayName || 'Side A';

  const sideBName = isDoubles
    ? `${communityPlayers.find((p) => p.id === selectedPlayerIds[2])?.displayName?.split(' ')[0]} & ${communityPlayers.find((p) => p.id === selectedPlayerIds[3])?.displayName?.split(' ')[0]}`
    : communityPlayers.find((p) => p.id === selectedPlayerIds[1])?.displayName || 'Side B';

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      maxHeight="max-h-[88vh]"
      leftAction={
        step > 1 ? (
          <button
            onClick={() => setStep((s) => (s - 1) as any)}
            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <button onClick={onClose} className="text-neutral-500 font-medium">
            Cancel
          </button>
        )
      }
      rightAction={
        <div className="flex items-center gap-1 text-xs text-neutral-400 font-semibold">
          Step {step} of 3
        </div>
      }
    >
      <div className="space-y-5 pb-6">
        {/* Step Indicator Dots */}
        <div className="flex justify-center items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-7 bg-emerald-500 dark:bg-emerald-400'
                  : 'w-2 bg-neutral-300 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: Who's playing? */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">
                Who's playing?
              </h2>
              <p className="text-[14px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Tap 2 players for Singles, or 4 players for Doubles.
              </p>
            </div>

            {/* Mode Badge & Fair Teams CTA */}
            <div className="flex items-center justify-between bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/80 shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant={isDoubles ? 'accent' : 'neutral'}>
                  {isDoubles ? 'Doubles (4 Players)' : 'Singles (2 Players)'}
                </Badge>
                <span className="text-xs text-neutral-400">
                  {selectedPlayerIds.length}/4 selected
                </span>
              </div>

              <button
                onClick={handleSuggestTeams}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fair Teams</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="Search community players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1C1C1E] rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Quick Add Player Inline */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Quick add player (e.g., Anu)"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickAddName.trim().length >= 2) {
                    e.preventDefault();
                    const added = addCommunityPlayer(quickAddName);
                    setQuickAddName('');
                    if (selectedPlayerIds.length < 4) {
                      setSelectedPlayerIds([...selectedPlayerIds, added.id]);
                    }
                  }
                }}
                className="flex-1 px-3 py-2 bg-white dark:bg-[#1C1C1E] rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 text-[14px] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={quickAddName.trim().length < 2 || quickAddName.trim().length > 30}
                onClick={() => {
                  const added = addCommunityPlayer(quickAddName);
                  setQuickAddName('');
                  if (selectedPlayerIds.length < 4) {
                    setSelectedPlayerIds([...selectedPlayerIds, added.id]);
                  }
                }}
              >
                Add
              </Button>
            </div>

            {/* Player Selection Grid */}
            {filteredPlayers.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-white/60 dark:bg-[#1C1C1E]/60 border border-dashed border-neutral-200 dark:border-neutral-800">
                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  {activePlayers.length === 0 ? 'No players added yet' : 'No matching players'}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {activePlayers.length === 0
                    ? 'Add at least 2 players above or in the Players tab.'
                    : 'Try another search term or add a new player above.'}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredPlayers.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : 'bg-white dark:bg-[#1C1C1E] border-neutral-200/60 dark:border-neutral-800/80 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <Avatar name={player.displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold truncate leading-tight">
                        {player.displayName}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        Active Player
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={selectedPlayerIds.length < 2 || selectedPlayerIds.length === 3}
              onClick={() => setStep(2)}
              trailingIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Scoring
            </Button>
          </div>
        )}

        {/* STEP 2: How do you want to score? */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">
                How do you want to score?
              </h2>
              <p className="text-[14px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Choose rally scoring or traditional service point rules.
              </p>
            </div>

            {/* 2 Big Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  Haptics.selection();
                  setSystemType('RALLY');
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  systemType === 'RALLY'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-sm'
                    : 'bg-white dark:bg-[#1C1C1E] border-neutral-200/60 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[17px]">Rally Point</span>
                  {systemType === 'RALLY' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </div>
                <p className="text-[13px] leading-[18px] text-neutral-500 dark:text-neutral-400">
                  Standard BWF rules. Every rally awards a point. First to 21 with a 2-point lead.
                </p>
              </button>

              <button
                onClick={() => {
                  Haptics.selection();
                  setSystemType('SERVICE');
                  if (targetScore === '21') setTargetScore('15');
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  systemType === 'SERVICE'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-sm'
                    : 'bg-white dark:bg-[#1C1C1E] border-neutral-200/60 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[17px]">Service Point</span>
                  {systemType === 'SERVICE' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </div>
                <p className="text-[13px] leading-[18px] text-neutral-500 dark:text-neutral-400">
                  Classic badminton. Only the server scores points. Receiver win changes serve (side-out).
                </p>
              </button>
            </div>

            {/* Target Score Segmented Control */}
            <div className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/80 space-y-2">
              <label className="text-[13px] font-semibold text-neutral-600 dark:text-neutral-400">
                Target Game Score:
              </label>
              <SegmentedControl
                value={targetScore}
                onChange={(val: string) => setTargetScore(val as any)}
                options={
                  systemType === 'RALLY'
                    ? [
                        { id: '21', label: '21 Points (Standard)' },
                        { id: '15', label: '15 Points (Short)' },
                        { id: '11', label: '11 Points (Sprint)' },
                      ]
                    : [
                        { id: '15', label: '15 Points (Classic)' },
                        { id: '11', label: '11 Points (Sprint)' },
                      ]
                }
              />
            </div>

            {/* Collapsed More Options */}
            <div className="border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl p-3 bg-white dark:bg-[#1C1C1E]">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-[14px] font-semibold text-neutral-600 dark:text-neutral-300"
              >
                <span>Advanced Scoring Options</span>
                <span className="text-xs text-neutral-400">
                  {showAdvanced ? 'Hide' : 'Show'}
                </span>
              </button>
              {showAdvanced && (
                <div className="pt-3 space-y-3 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200/60 dark:border-neutral-800/80 mt-2">
                  <div className="flex justify-between items-center">
                    <span>Use Custom Format Rules</span>
                    <input
                      type="checkbox"
                      aria-label="Use Custom Format Rules"
                      checked={useCustomRules}
                      onChange={(e) => setUseCustomRules(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Target Points:</span>
                    <input
                      type="number"
                      aria-label="Custom Target Points"
                      min={5}
                      max={30}
                      value={customTarget}
                      onChange={(e) => {
                        setCustomTarget(Math.max(5, Math.min(30, Number(e.target.value) || 21)));
                        setUseCustomRules(true);
                      }}
                      className="w-16 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-right font-semibold text-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Win by Margin:</span>
                    <input
                      type="number"
                      aria-label="Custom Win by Margin"
                      min={1}
                      max={5}
                      value={customWinBy}
                      onChange={(e) => {
                        setCustomWinBy(Math.max(1, Math.min(5, Number(e.target.value) || 2)));
                        setUseCustomRules(true);
                      }}
                      className="w-16 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-right font-semibold text-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sudden Death Cap:</span>
                    <input
                      type="number"
                      aria-label="Custom Sudden Death Cap"
                      min={5}
                      max={40}
                      value={customCap}
                      onChange={(e) => {
                        setCustomCap(Math.max(5, Math.min(40, Number(e.target.value) || 30)));
                        setUseCustomRules(true);
                      }}
                      className="w-16 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-right font-semibold text-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setStep(3)}
              trailingIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Server Selection
            </Button>
          </div>
        )}

        {/* STEP 3: Who serves first? */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">
                Who serves first?
              </h2>
              <p className="text-[14px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Tap the side that won the toss, or flip a virtual coin.
              </p>
            </div>

            {/* 2 Big Tappable Sides */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  Haptics.selection();
                  setFirstServerSide('A');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  firstServerSide === 'A'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-sm'
                    : 'bg-white dark:bg-[#1C1C1E] border-neutral-200/60 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-2xl mb-1">🏸</div>
                <div className="font-bold text-[16px] truncate">{sideAName}</div>
                <span className="text-[11px] text-neutral-400 block mt-1">Side A</span>
                {firstServerSide === 'A' && (
                  <Badge variant="success" size="sm" className="mt-2">
                    Serving First
                  </Badge>
                )}
              </button>

              <button
                onClick={() => {
                  Haptics.selection();
                  setFirstServerSide('B');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  firstServerSide === 'B'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-sm'
                    : 'bg-white dark:bg-[#1C1C1E] border-neutral-200/60 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-2xl mb-1">🏸</div>
                <div className="font-bold text-[16px] truncate">{sideBName}</div>
                <span className="text-[11px] text-neutral-400 block mt-1">Side B</span>
                {firstServerSide === 'B' && (
                  <Badge variant="success" size="sm" className="mt-2">
                    Serving First
                  </Badge>
                )}
              </button>
            </div>

            {/* Coin Flip Button */}
            <div className="flex justify-center">
              <Button
                variant="glass"
                size="md"
                onClick={handleCoinFlip}
                disabled={isFlippingCoin}
                leadingIcon={
                  <motion.span
                    animate={isFlippingCoin ? { rotateY: 720, scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.45 }}
                    className="inline-block"
                  >
                    🪙
                  </motion.span>
                }
              >
                {isFlippingCoin ? 'Flipping...' : 'Flip a Coin'}
              </Button>
            </div>

            {/* Start Match CTA */}
            <Button variant="primary" size="lg" fullWidth onClick={handleStart}>
              Start Match
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
