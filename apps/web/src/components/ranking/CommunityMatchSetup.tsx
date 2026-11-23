import React, { useState } from 'react';
import type { MatchConfig } from '@rallypoint/engine';
import { useRankingStore, CommunityPlayer, TaggingMode } from '../../store/rankingStore.js';
import { useMatchStore } from '../../store/matchStore.js';

interface CommunityMatchSetupProps {
  onStart: () => void;
}

export const CommunityMatchSetup: React.FC<CommunityMatchSetupProps> = ({ onStart }) => {
  const {
    activeSeason,
    setActiveSeason,
    taggingMode,
    setTaggingMode,
    communityPlayers,
    recentPlayerIds,
    addCommunityPlayer,
    autoSuggestDoublesPairs,
    attachMatch,
  } = useRankingStore();

  const { startMatch } = useMatchStore();

  const [matchType, setMatchType] = useState<'SINGLES' | 'DOUBLES'>('SINGLES');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');

  // Selected player IDs
  const [selectedSideA, setSelectedSideA] = useState<string[]>(['cp-viktor']);
  const [selectedSideB, setSelectedSideB] = useState<string[]>(['cp-lee']);

  const [pairSuggestion, setPairSuggestion] = useState<{
    pairA: [CommunityPlayer, CommunityPlayer];
    pairB: [CommunityPlayer, CommunityPlayer];
    balanceDelta: number;
  } | null>(null);

  const filteredPlayers = communityPlayers.filter((p) =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentPlayers = recentPlayerIds
    .map((id) => communityPlayers.find((p) => p.id === id))
    .filter((p): p is CommunityPlayer => Boolean(p));

  const handleTogglePlayerSelection = (playerId: string, targetSide: 'A' | 'B') => {
    const isA = selectedSideA.includes(playerId);
    const isB = selectedSideB.includes(playerId);

    if (targetSide === 'A') {
      if (isA) setSelectedSideA(selectedSideA.filter((id) => id !== playerId));
      else {
        setSelectedSideB(selectedSideB.filter((id) => id !== playerId));
        if (matchType === 'SINGLES') setSelectedSideA([playerId]);
        else if (selectedSideA.length < 2) setSelectedSideA([...selectedSideA, playerId]);
      }
    } else {
      if (isB) setSelectedSideB(selectedSideB.filter((id) => id !== playerId));
      else {
        setSelectedSideA(selectedSideA.filter((id) => id !== playerId));
        if (matchType === 'SINGLES') setSelectedSideB([playerId]);
        else if (selectedSideB.length < 2) setSelectedSideB([...selectedSideB, playerId]);
      }
    }
  };

  const handleAddNewPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const created = addCommunityPlayer(newPlayerName);
    setNewPlayerName('');
    if (selectedSideA.length === 0) setSelectedSideA([created.id]);
    else if (selectedSideB.length === 0) setSelectedSideB([created.id]);
  };

  const handleAutoBalance = () => {
    const allSelected = Array.from(new Set([...selectedSideA, ...selectedSideB]));
    if (allSelected.length < 4) {
      // Pick first 4 available players
      const needed = 4 - allSelected.length;
      const additional = communityPlayers
        .filter((p) => !allSelected.includes(p.id))
        .slice(0, needed)
        .map((p) => p.id);
      allSelected.push(...additional);
    }

    const suggestion = autoSuggestDoublesPairs(allSelected.slice(0, 4));
    if (suggestion) {
      setPairSuggestion(suggestion);
      setSelectedSideA([suggestion.pairA[0].id, suggestion.pairA[1].id]);
      setSelectedSideB([suggestion.pairB[0].id, suggestion.pairB[1].id]);
    }
  };

  const handleStart = async () => {
    const playersSideA = selectedSideA
      .map((id) => communityPlayers.find((p) => p.id === id))
      .filter((p): p is CommunityPlayer => Boolean(p));
    const playersSideB = selectedSideB
      .map((id) => communityPlayers.find((p) => p.id === id))
      .filter((p): p is CommunityPlayer => Boolean(p));

    const nameA =
      playersSideA.map((p) => p.displayName).join(' & ') || 'Side A';
    const nameB =
      playersSideB.map((p) => p.displayName).join(' & ') || 'Side B';

    const matchId = `match-comm-${Date.now()}`;

    const playerIdsA = playersSideA.map((p) => p.id);
    const playerIdsB = playersSideB.map((p) => p.id);

    const config: MatchConfig = {
      id: matchId,
      mode: matchType === 'SINGLES' ? 'singles' : 'doubles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: {
        id: 'side-a',
        name: nameA,
        playerIds: playerIdsA.length > 0 ? playerIdsA : ['p1'],
        playerNames: playersSideA.map((p) => p.displayName),
      },
      sideB: {
        id: 'side-b',
        name: nameB,
        playerIds: playerIdsB.length > 0 ? playerIdsB : ['p2'],
        playerNames: playersSideB.map((p) => p.displayName),
      },
      initialServerSide: 'A',
      initialServerPlayerId: playerIdsA[0] || 'p1',
      startTime: Date.now(),
    };

    // Attach to ranking store
    attachMatch({
      id: matchId,
      seasonId: activeSeason,
      matchType,
      status: 'LIVE',
      participants: [
        ...playersSideA.map((p, idx) => ({
          playerId: p.id,
          displayName: p.displayName,
          side: 'A' as const,
          position: (idx + 1) as 1 | 2,
        })),
        ...playersSideB.map((p, idx) => ({
          playerId: p.id,
          displayName: p.displayName,
          side: 'B' as const,
          position: (idx + 1) as 1 | 2,
        })),
      ],
      games: [],
      events: [],
      startedAt: new Date().toISOString(),
    });

    await startMatch(config, taggingMode !== 'FAST');
    onStart();
  };

  const isReady =
    matchType === 'SINGLES'
      ? selectedSideA.length === 1 && selectedSideB.length === 1
      : selectedSideA.length === 2 && selectedSideB.length === 2;

  return (
    <div className="w-full max-w-lg mx-auto bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-xs">
      {/* Title & Season */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-1.5">
            <span>🏸 Community League Match Setup</span>
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-gray-400">Season:</span>
            <input
              type="text"
              value={activeSeason}
              onChange={(e) => setActiveSeason(e.target.value)}
              className="text-[11px] font-bold text-emerald-400 bg-transparent border-b border-gray-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        {/* Match Type */}
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => {
              setMatchType('SINGLES');
              if (selectedSideA.length > 1) setSelectedSideA([selectedSideA[0]!]);
              if (selectedSideB.length > 1) setSelectedSideB([selectedSideB[0]!]);
            }}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              matchType === 'SINGLES' ? 'bg-emerald-500 text-gray-950' : 'text-gray-400'
            }`}
          >
            Singles
          </button>
          <button
            onClick={() => setMatchType('DOUBLES')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              matchType === 'DOUBLES' ? 'bg-emerald-500 text-gray-950' : 'text-gray-400'
            }`}
          >
            Doubles
          </button>
        </div>
      </div>

      {/* Tagging Mode Controls */}
      <div className="bg-gray-800/50 p-2.5 rounded-2xl border border-gray-800 flex justify-between items-center">
        <div>
          <span className="font-bold text-gray-200 block text-[11px]">Tagging Mode</span>
          <span className="text-[10px] text-gray-400">
            {taggingMode === 'FAST' && 'Score-only (maximum speed)'}
            {taggingMode === 'QUICK' && '3-second auto-dismiss chips'}
            {taggingMode === 'FULL' && 'Mandatory details tagging'}
          </span>
        </div>
        <div className="flex bg-gray-900 rounded-xl p-0.5 gap-1">
          {(['FAST', 'QUICK', 'FULL'] as TaggingMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTaggingMode(mode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                taggingMode === mode
                  ? 'bg-emerald-500 text-gray-950 font-black'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Balance Doubles Button */}
      {matchType === 'DOUBLES' && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={handleAutoBalance}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <span>⚖️ Auto-Suggest Balanced Doubles Pairs</span>
          </button>
          {pairSuggestion && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2 text-center text-[10px] text-emerald-300">
              Balanced pairing applied! Skill rating difference: {pairSuggestion.balanceDelta} pts
            </div>
          )}
        </div>
      )}

      {/* Selected Sides Summary */}
      <div className="grid grid-cols-2 gap-3">
        {/* Side A */}
        <div className="bg-blue-950/20 border border-blue-900/50 p-3 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1">
              Side A ({matchType === 'SINGLES' ? '1 Player' : '2 Players'})
            </span>
            <div className="space-y-1">
              {selectedSideA.map((id) => {
                const player = communityPlayers.find((p) => p.id === id);
                return (
                  <div
                    key={id}
                    className="flex justify-between items-center bg-blue-900/40 px-2 py-1 rounded-lg"
                  >
                    <span className="font-bold text-white truncate max-w-[120px]">
                      {player?.displayName}
                    </span>
                    <button
                      onClick={() => handleTogglePlayerSelection(id, 'A')}
                      className="text-blue-300 hover:text-red-400 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {selectedSideA.length === 0 && (
                <span className="text-gray-500 italic text-[11px]">Select from roster below</span>
              )}
            </div>
          </div>
        </div>

        {/* Side B */}
        <div className="bg-red-950/20 border border-red-900/50 p-3 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">
              Side B ({matchType === 'SINGLES' ? '1 Player' : '2 Players'})
            </span>
            <div className="space-y-1">
              {selectedSideB.map((id) => {
                const player = communityPlayers.find((p) => p.id === id);
                return (
                  <div
                    key={id}
                    className="flex justify-between items-center bg-red-900/40 px-2 py-1 rounded-lg"
                  >
                    <span className="font-bold text-white truncate max-w-[120px]">
                      {player?.displayName}
                    </span>
                    <button
                      onClick={() => handleTogglePlayerSelection(id, 'B')}
                      className="text-red-300 hover:text-red-400 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {selectedSideB.length === 0 && (
                <span className="text-gray-500 italic text-[11px]">Select from roster below</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Players Strip */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1.5">
          Recent Community Players
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {recentPlayers.map((p) => {
            const isA = selectedSideA.includes(p.id);
            const isB = selectedSideB.includes(p.id);
            return (
              <div
                key={p.id}
                className="bg-gray-800/80 border border-gray-700/60 rounded-xl px-2 py-1 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="text-white font-medium">{p.displayName}</span>
                <button
                  onClick={() => handleTogglePlayerSelection(p.id, 'A')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    isA ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-300'
                  }`}
                >
                  +A
                </button>
                <button
                  onClick={() => handleTogglePlayerSelection(p.id, 'B')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    isB ? 'bg-red-600 text-white' : 'bg-gray-700 text-red-300'
                  }`}
                >
                  +B
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Add Player */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search roster..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <form onSubmit={handleAddNewPlayer} className="flex gap-2">
          <input
            type="text"
            placeholder="Add new player name..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            className="flex-1 bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold rounded-xl border border-emerald-600/40"
          >
            + Add
          </button>
        </form>

        {/* Filtered Player Roster list */}
        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
          {filteredPlayers.map((p) => {
            const isA = selectedSideA.includes(p.id);
            const isB = selectedSideB.includes(p.id);
            return (
              <div
                key={p.id}
                className="bg-gray-800/40 border border-gray-800 px-3 py-1.5 rounded-xl flex justify-between items-center"
              >
                <span className="text-gray-300 font-medium">{p.displayName}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleTogglePlayerSelection(p.id, 'A')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isA ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-300 hover:bg-gray-600'
                    }`}
                  >
                    Side A
                  </button>
                  <button
                    onClick={() => handleTogglePlayerSelection(p.id, 'B')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isB ? 'bg-red-600 text-white' : 'bg-gray-700 text-red-300 hover:bg-gray-600'
                    }`}
                  >
                    Side B
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!isReady}
        className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl ${
          isReady
            ? 'bg-emerald-500 hover:bg-emerald-400 text-gray-950 scale-[1.01]'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isReady ? 'Start Match 🏸' : 'Select Players to Start'}
      </button>
    </div>
  );
};
