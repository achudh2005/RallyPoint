import React, { useState } from 'react';
import {
  LargeTitle,
  Avatar,
  BottomSheet,
  Button,
  Haptics,
} from '@rallypoint/ui';
import { useRankingStore } from '../../store/rankingStore.js';
import {
  ApplePlayerProfileSheet,
  type PlayerProfileData,
} from './ApplePlayerProfileSheet.js';
import { Search, UserPlus, ChevronRight } from 'lucide-react';

export const ApplePlayersScreen: React.FC = () => {
  const { communityPlayers, addCommunityPlayer, playerLeaderboards } =
    useRankingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfileData | null>(null);

  const filtered = communityPlayers.filter((p) =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    Haptics.pointScored();
    const created = addCommunityPlayer(newPlayerName.trim());
    setNewPlayerName('');
    setShowAddModal(false);

    // Open newly created player's profile
    const stats: PlayerProfileData = {
      id: created.id,
      name: created.displayName,
      rank: communityPlayers.length + 1,
      rating: 50,
      wins: 0,
      losses: 0,
      totalMatches: 0,
      totalPointsWon: 0,
      totalPointsConceded: 0,
      dropsWon: 0,
      longestStreak: 0,
    };
    setSelectedPlayer(stats);
  };

  const handleSelectPlayer = (id: string, name: string, idx: number) => {
    Haptics.selection();
    const entry = playerLeaderboards.OVERALL?.find(
      (e) => e.id === id || e.stats?.playerId === id
    );

    const stats: PlayerProfileData = {
      id,
      name,
      rank: entry?.rank ?? idx + 1,
      rating: entry?.stats ? entry.stats.rankingPoints : 50,
      wins: entry?.stats ? entry.stats.wins : 0,
      losses: entry?.stats ? entry.stats.losses : 0,
      totalMatches: entry?.stats ? entry.stats.matchesPlayed : 0,
      totalPointsWon: entry?.stats ? entry.stats.pointsScored : 0,
      totalPointsConceded: entry?.stats ? entry.stats.pointsConceded : 0,
      dropsWon: entry?.stats ? entry.stats.dropShotWinners : 0,
      longestStreak: entry?.stats ? entry.stats.longestWinStreak : 0,
      currentForm: entry?.stats ? entry.stats.currentForm : [],
    };
    setSelectedPlayer(stats);
  };

  return (
    <div className="min-h-full pb-28 pt-2 select-none">
      <div className="px-4 mb-2 flex items-center justify-between">
        <LargeTitle>Players</LargeTitle>
        <button
          aria-label="Add Player"
          onClick={() => {
            Haptics.selection();
            setShowAddModal(true);
          }}
          className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 active:scale-95 transition-all"
          title="Add New Player"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* iOS Search Bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Players Grouped List */}
      <div className="px-4">
        <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 overflow-hidden shadow-xs">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No players found matching "{searchQuery}".
            </div>
          ) : (
            filtered.map((player, idx) => {
              const entry = playerLeaderboards.OVERALL?.find(
                (e) => e.id === player.id || e.stats?.playerId === player.id
              );
              const matchesCount = entry?.matchesPlayed ?? 0;
              const wins = entry?.stats?.wins ?? 0;

              return (
                <div
                  key={player.id}
                  onClick={() => handleSelectPlayer(player.id, player.displayName, idx)}
                  className="flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={player.displayName} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">
                        {player.displayName}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {matchesCount} {matchesCount === 1 ? 'match' : 'matches'} • {wins} W
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-400 font-mono">
                      #{entry?.rank ?? idx + 1}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Player Bottom Sheet Modal */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Player"
      >
        <form onSubmit={handleAddPlayer} className="space-y-4 pb-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
              Player Name
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g., Lin Dan"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 text-base focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowAddModal(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button variant="primary" fullWidth type="submit" disabled={!newPlayerName.trim()}>
              Save Player
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Player Profile Detail Sheet */}
      <ApplePlayerProfileSheet
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
};
