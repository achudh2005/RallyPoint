import React, { useEffect, useRef, useState } from 'react';
import {
  LargeTitle,
  Avatar,
  BottomSheet,
  Button,
  EmptyState,
  Haptics,
} from '@rallypoint/ui';
import { useRankingStore, type CommunityPlayer } from '../../store/rankingStore.js';
import { useMatchStore } from '../../store/matchStore.js';
import {
  ApplePlayerProfileSheet,
  type PlayerProfileData,
} from './ApplePlayerProfileSheet.js';
import { Search, UserPlus, ChevronRight, Trash2, Pencil, Users, Upload, AlertTriangle } from 'lucide-react';

async function compressImageFile(file: File, maxSize = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const ApplePlayersScreen: React.FC = () => {
  const {
    communityPlayers,
    addCommunityPlayer,
    bulkAddPlayers,
    updateCommunityPlayer,
    removeCommunityPlayer,
    undoRemovePlayer,
    mergePlayers,
    getPlayerMatchCount,
    validatePlayerName,
    findSimilarPlayers,
    playerLeaderboards,
  } = useRankingStore();
  const { match: liveMatch } = useMatchStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | undefined>(undefined);
  const [newPhone, setNewPhone] = useState('');
  const [newNote, setNewNote] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [bulkResultMsg, setBulkResultMsg] = useState<string | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfileData | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<CommunityPlayer | null>(null);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | undefined>(undefined);
  const [editPhone, setEditPhone] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');

  const [playerToRemove, setPlayerToRemove] = useState<{
    player: CommunityPlayer;
    matchCount: number;
  } | null>(null);
  const [liveBlockMessage, setLiveBlockMessage] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<{
    message: string;
    player: CommunityPlayer;
    wasHardDeleted: boolean;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const overallLeaderboard = playerLeaderboards?.OVERALL || [];
  const activePlayers = communityPlayers.filter(
    (p) => p.status !== 'ARCHIVED' && p.status !== 'HIDDEN'
  );
  const filteredPlayers = activePlayers.filter(
    (p) =>
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.nickname && p.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const similarPlayers = showAddModal && addMode === 'single' ? findSimilarPlayers(newPlayerName) : [];

  const livePlayerIds: string[] =
    liveMatch && liveMatch.status === 'IN_PROGRESS'
      ? [...liveMatch.config.sideA.playerIds, ...liveMatch.config.sideB.playerIds]
      : [];

  const showUndoToast = (message: string, player: CommunityPlayer, wasHardDeleted: boolean) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({ message, player, wasHardDeleted });
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 5000);
  };

  const resetAddForm = () => {
    setNewPlayerName('');
    setNewNickname('');
    setNewPhotoUrl(undefined);
    setNewPhone('');
    setNewNote('');
    setBulkText('');
    setFormError(null);
    setBulkResultMsg(null);
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePlayerName(newPlayerName);
    if (err) {
      setFormError(err);
      return;
    }
    Haptics.pointScored();
    addCommunityPlayer({
      displayName: newPlayerName,
      nickname: newNickname,
      avatarUrl: newPhotoUrl,
      phone: newPhone,
      note: newNote,
    });
    resetAddForm();
    setShowAddModal(false);
  };

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;
    const res = bulkAddPlayers(bulkText);
    Haptics.pointScored();
    if (res.added.length > 0 && res.skipped.length === 0) {
      resetAddForm();
      setShowAddModal(false);
    } else {
      setBulkResultMsg(
        `Added ${res.added.length} player(s).${
          res.skipped.length > 0 ? ` Skipped ${res.skipped.length}: ${res.skipped[0]}` : ''
        }`
      );
      setBulkText('');
    }
  };

  const handleOpenEdit = (player: CommunityPlayer) => {
    Haptics.selection();
    setEditingPlayer(player);
    setEditName(player.displayName);
    setEditNickname(player.nickname || '');
    setEditPhotoUrl(player.avatarUrl);
    setEditPhone(player.phone || '');
    setEditNote(player.note || '');
    setEditError(null);
    setMergeTargetId('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    const err = validatePlayerName(editName, editingPlayer.id);
    if (err) {
      setEditError(err);
      return;
    }
    Haptics.selection();
    updateCommunityPlayer(editingPlayer.id, {
      displayName: editName,
      nickname: editNickname,
      avatarUrl: editPhotoUrl,
      phone: editPhone,
      note: editNote,
    });
    setEditingPlayer(null);
  };

  const handleRequestRemove = (player: CommunityPlayer) => {
    Haptics.selection();
    if (livePlayerIds.includes(player.id)) {
      setLiveBlockMessage(
        `${player.displayName} is currently in a live match and cannot be removed until the match ends.`
      );
      return;
    }
    const matchCount = getPlayerMatchCount(player.id);
    setPlayerToRemove({ player, matchCount });
  };

  const handleConfirmRemove = (mode: 'archive' | 'hide' | 'delete') => {
    if (!playerToRemove) return;
    Haptics.selection();
    const res = removeCommunityPlayer(playerToRemove.player.id, {
      mode: mode === 'hide' ? 'hide' : 'archive',
      livePlayerIds,
    });
    if (res.outcome === 'blocked_live') {
      setLiveBlockMessage(
        `${playerToRemove.player.displayName} is currently in a live match and cannot be removed until the match ends.`
      );
    } else if (res.outcome === 'deleted') {
      showUndoToast(`Removed ${res.player.displayName}`, res.player, true);
    } else if (res.outcome === 'archived') {
      showUndoToast(`Archived ${res.player.displayName}`, res.player, false);
    } else if (res.outcome === 'hidden') {
      showUndoToast(`Hid ${res.player.displayName} from rankings`, res.player, false);
    }
    setPlayerToRemove(null);
  };

  const handleSelectPlayer = (player: CommunityPlayer, index: number) => {
    Haptics.selection();
    const entry = overallLeaderboard.find((e) => e.id === player.id);

    const profile: PlayerProfileData = {
      id: player.id,
      name: player.displayName,
      rank: entry?.rank ?? index + 1,
      rating: entry?.stats?.rankingPoints ?? 50,
      wins: entry?.stats?.wins ?? 0,
      losses: entry?.stats?.losses ?? 0,
      totalMatches: entry?.matchesPlayed ?? getPlayerMatchCount(player.id),
      totalPointsWon: entry?.stats?.pointsWon ?? entry?.stats?.pointsScored ?? 0,
      totalPointsConceded: entry?.stats?.drops ?? entry?.stats?.pointsConceded ?? 0,
      dropsWon: entry?.stats?.dropShotWinners ?? 0,
      longestStreak: entry?.stats?.longestWinStreak ?? 0,
      currentForm: entry?.stats?.currentForm ?? [],
      netContribution: entry?.stats?.netContribution ?? ((entry?.stats?.pointsWon ?? 0) - (entry?.stats?.drops ?? 0)),
      pointsWon: entry?.stats?.pointsWon,
      drops: entry?.stats?.drops,
      mvpCount: entry?.stats?.mvpCount ?? 0,
      fighterCount: entry?.stats?.fighterCount ?? 0,
      mvpRate: entry?.stats?.mvpRate ?? 0,
      bestMatchStreak: entry?.stats?.bestMatchStreak ?? 0,
      clutchPointsTotal: entry?.stats?.clutchPointsTotal ?? 0,
      serveRegainedTotal: entry?.stats?.serveRegainedTotal ?? 0,
      sharedFaults: entry?.stats?.sharedFaults ?? 0,
      rankMovement: entry?.rankMovement,
      movementDelta: entry?.movementDelta,
    };
    setSelectedPlayer(profile);
  };

  return (
    <div className="min-h-full pb-28 pt-2 select-none">
      {/* Header & Add Button */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <LargeTitle title="Players" />
        <button
          onClick={() => {
            Haptics.selection();
            resetAddForm();
            setShowAddModal(true);
          }}
          className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 active:scale-95 transition-all"
          title="Add New Player"
          aria-label="Add Player"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Live match removal warning banner */}
      {liveBlockMessage && (
        <div className="px-4 mb-3">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
            <span>{liveBlockMessage}</span>
            <button
              type="button"
              onClick={() => setLiveBlockMessage(null)}
              className="font-bold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
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

      {/* Players Grouped List or Empty State */}
      <div className="px-4">
        {activePlayers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="No Players Yet"
            description="Add your badminton group to track points, streaks, MVPs, and community rankings."
            actionLabel="Add your first player"
            onAction={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 overflow-hidden shadow-xs">
            {filteredPlayers.length === 0 ? (
              <p className="p-8 text-center text-sm text-neutral-400">
                No players found matching "{searchQuery}".
              </p>
            ) : (
              filteredPlayers.map((player, idx) => {
                const entry = overallLeaderboard.find((e) => e.id === player.id);
                const matchesCount = entry?.matchesPlayed ?? getPlayerMatchCount(player.id);
                const wins = entry?.stats?.wins ?? 0;

                return (
                  <div
                    key={player.id}
                    onClick={() => handleSelectPlayer(player, idx)}
                    className="flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={player.displayName} src={player.avatarUrl} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight truncate">
                          {player.displayName}
                          {player.nickname ? (
                            <span className="ml-1.5 text-xs font-normal text-neutral-400">
                              ({player.nickname})
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {matchesCount} {matchesCount === 1 ? 'match' : 'matches'} • {wins} W
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {entry?.rank ? (
                        <span className="text-xs font-semibold text-neutral-400 font-mono mr-1">
                          #{entry.rank}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Edit ${player.displayName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(player);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-600 hover:bg-emerald-500/10 active:scale-95 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${player.displayName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestRemove(player);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 5-second Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xl flex items-center gap-3 text-sm">
          <span>{undoToast.message}</span>
          <button
            type="button"
            onClick={() => {
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
              undoRemovePlayer({
                player: undoToast.player,
                wasHardDeleted: undoToast.wasHardDeleted,
              });
              setUndoToast(null);
            }}
            className="font-bold text-emerald-400 dark:text-emerald-600 hover:underline"
          >
            Undo
          </button>
        </div>
      )}

      {/* Add New Player Sheet (Single or Bulk) */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Player"
      >
        <div className="space-y-4 pb-4">
          <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/10">
            <button
              type="button"
              onClick={() => setAddMode('single')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                addMode === 'single'
                  ? 'bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              One Player
            </button>
            <button
              type="button"
              onClick={() => setAddMode('bulk')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                addMode === 'bulk'
                  ? 'bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              Add Several at Once
            </button>
          </div>

          {addMode === 'single' ? (
            <form onSubmit={handleAddPlayer} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                  Player Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g., Lin Dan"
                  value={newPlayerName}
                  onChange={(e) => {
                    setNewPlayerName(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-base focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                />
                {formError && <p className="text-xs text-rose-500 mt-1">{formError}</p>}
              </div>

              {similarPlayers.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    Similar name found:{' '}
                    <span className="font-semibold">
                      {similarPlayers.map((p) => p.displayName).join(', ')}
                    </span>
                    . Make sure this isn't a duplicate.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="Optional"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                  Note
                </label>
                <input
                  type="text"
                  placeholder="Play style, hand, etc. (optional)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-semibold cursor-pointer hover:bg-black/10">
                  <Upload className="w-4 h-4" />
                  <span>{newPhotoUrl ? 'Change Photo' : 'Add Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const compressed = await compressImageFile(file);
                      setNewPhotoUrl(compressed);
                    }}
                  />
                </label>
                {newPhotoUrl && (
                  <img
                    src={newPhotoUrl}
                    alt="Preview"
                    className="w-9 h-9 rounded-xl object-cover"
                  />
                )}
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
          ) : (
            <form onSubmit={handleBulkAdd} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                  Paste Names (one per line)
                </label>
                <textarea
                  rows={5}
                  placeholder={'Anu\nRahul\nVikram\nDeepa'}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              {bulkResultMsg && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{bulkResultMsg}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowAddModal(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button variant="primary" fullWidth type="submit" disabled={!bulkText.trim()}>
                  Add All
                </Button>
              </div>
            </form>
          )}
        </div>
      </BottomSheet>

      {/* Edit Player Sheet */}
      <BottomSheet
        isOpen={!!editingPlayer}
        onClose={() => setEditingPlayer(null)}
        title="Edit Player"
      >
        {editingPlayer && (
          <form onSubmit={handleSaveEdit} className="space-y-3 pb-4">
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                Player Name *
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setEditError(null);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-base focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
              />
              {editError && <p className="text-xs text-rose-500 mt-1">{editError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                Note
              </label>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-semibold cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{editPhotoUrl ? 'Change Photo' : 'Add Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const compressed = await compressImageFile(file);
                    setEditPhotoUrl(compressed);
                  }}
                />
              </label>
              {editPhotoUrl && (
                <img src={editPhotoUrl} alt="Preview" className="w-9 h-9 rounded-xl object-cover" />
              )}
            </div>

            {activePlayers.filter((p) => p.id !== editingPlayer.id).length > 0 && (
              <div className="pt-2 border-t border-black/5 dark:border-white/10 space-y-2">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Merge Duplicate Into
                </label>
                <div className="flex gap-2">
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm"
                  >
                    <option value="">Select target player...</option>
                    {activePlayers
                      .filter((p) => p.id !== editingPlayer.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName}
                        </option>
                      ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!mergeTargetId}
                    onClick={() => {
                      if (!mergeTargetId) return;
                      Haptics.selection();
                      mergePlayers(editingPlayer.id, mergeTargetId);
                      setEditingPlayer(null);
                    }}
                  >
                    Merge
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                fullWidth
                type="button"
                onClick={() => setEditingPlayer(null)}
              >
                Cancel
              </Button>
              <Button variant="primary" fullWidth type="submit" disabled={!editName.trim()}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* Player Profile Detail Sheet */}
      <ApplePlayerProfileSheet
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />

      {/* Remove / Archive Player Confirmation Sheet */}
      <BottomSheet
        isOpen={!!playerToRemove}
        onClose={() => setPlayerToRemove(null)}
        title="Remove Player"
      >
        {playerToRemove && (
          <div className="space-y-4 pb-4">
            {playerToRemove.matchCount === 0 ? (
              <>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Remove{' '}
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {playerToRemove.player.displayName}
                  </span>{' '}
                  from your players list? They have no matches yet, so this will delete them permanently.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    type="button"
                    onClick={() => setPlayerToRemove(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    fullWidth
                    type="button"
                    onClick={() => handleConfirmRemove('delete')}
                  >
                    Remove
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {playerToRemove.player.displayName}
                  </span>{' '}
                  has {playerToRemove.matchCount}{' '}
                  {playerToRemove.matchCount === 1 ? 'match' : 'matches'}. Archive keeps their
                  history in old matches and rankings. Hide from rankings also removes them from
                  leaderboards (old matches stay).
                </p>
                <div className="space-y-2 pt-1">
                  <Button
                    variant="primary"
                    fullWidth
                    type="button"
                    onClick={() => handleConfirmRemove('archive')}
                  >
                    Archive Player
                  </Button>
                  <Button
                    variant="destructive"
                    fullWidth
                    type="button"
                    onClick={() => handleConfirmRemove('hide')}
                  >
                    Hide from Rankings
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    type="button"
                    onClick={() => setPlayerToRemove(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
