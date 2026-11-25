import React, { useState } from 'react';
import {
  LargeTitle,
  GroupedList,
  GroupedSection,
  GroupedRow,
  Toggle,
  Badge,
  Button,
  BottomSheet,
  Haptics,
  ComponentGallery,
} from '@rallypoint/ui';
import { useTheme } from '@rallypoint/ui';
import { useMatchStore } from '../../store/matchStore.js';
import { useRankingStore } from '../../store/rankingStore.js';
import { useAlertsSettingsStore, type CelebrationIntensity } from '../../store/alertsSettingsStore.js';
import { computeMatchAwards, DEFAULT_MVP_WEIGHTS, type RankingMatchEvent } from '@rallypoint/ranking';
import {
  Moon,
  Palette,
  Type,
  Vibrate,
  RefreshCw,
  Download,
  Info,
  Sliders,
  ExternalLink,
  BatteryCharging,
  Bell,
} from 'lucide-react';
import { nativeShare } from '../../mobile/nativeShare.js';
import { registerBackHandler } from '../../mobile/backButton.js';
import { nativePermissions } from '../../mobile/permissions.js';
import { FuntouchBatteryModal } from '../mobile/FuntouchBatteryModal.js';
import { checkForAppUpdates, UpdateCheckResult } from '../../mobile/updateChecker.js';
import { UpdateModal } from '../../mobile/UpdateModal.js';
import { Sparkles, Bug, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { LiveAlertsSettings } from './LiveAlertsSettings.js';

export const AppleProfileScreen: React.FC = () => {
  const { accent, setAccent } = useTheme();
  const {
    theme,
    toggleTheme,
    largeTextMode,
    toggleLargeText,
    showPlayerActionButtons,
    setShowPlayerActionButtons,
    playerActionButtonLabels,
    setPlayerActionButtonLabels,
    playerActionButtonLayout,
    setPlayerActionButtonLayout,
    events: lastMatchEvents,
    match: currentMatch,
    resetMatch,
  } = useMatchStore();
  const {
    activeSeason,
    setActiveSeason,
    recalculateLiveRankings,
    matches,
    communityPlayers,
    restoreCommunityPlayer,
    resetAllData,
  } = useRankingStore();
  const {
    celebrationIntensity,
    setCelebrationIntensity,
    celebrationSound,
    setCelebrationSound,
    celebrationHaptics,
    setCelebrationHaptics,
    shutoutBannerEnabled,
    setShutoutBannerEnabled,
  } = useAlertsSettingsStore();

  const [showGallery, setShowGallery] = useState(false);
  const [showExportNotice, setShowExportNotice] = useState(false);
  const [showBatteryGuide, setShowBatteryGuide] = useState(false);
  const [showArchivedSheet, setShowArchivedSheet] = useState(false);
  const [showResetSheet, setShowResetSheet] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [aboutTapCount, setAboutTapCount] = useState(0);
  const [showMvpDebugSheet, setShowMvpDebugSheet] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);

  React.useEffect(() => {
    checkForAppUpdates(false).then((res) => {
      if (res && res.hasUpdate) {
        setUpdateResult(res);
        setShowUpdateModal(true);
      }
    });
  }, []);

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatusMessage(null);
    Haptics.selection();
    const res = await checkForAppUpdates(true);
    setCheckingUpdate(false);
    setUpdateResult(res);
    if (res.hasUpdate) {
      setShowUpdateModal(true);
    } else if (res.error) {
      setUpdateStatusMessage(`Check failed: ${res.error}`);
    } else {
      setUpdateStatusMessage('You are on the latest version');
      setTimeout(() => setUpdateStatusMessage(null), 4000);
    }
  };

  // Hardware Back Button handling for subscreen and sheets
  React.useEffect(() => {
    if (!showGallery) return;
    return registerBackHandler(() => {
      setShowGallery(false);
      return true;
    });
  }, [showGallery]);

  React.useEffect(() => {
    if (!showExportNotice) return;
    return registerBackHandler(() => {
      setShowExportNotice(false);
      return true;
    });
  }, [showExportNotice]);

  React.useEffect(() => {
    if (!showUpdateModal) return;
    return registerBackHandler(() => {
      setShowUpdateModal(false);
      return true;
    });
  }, [showUpdateModal]);

  const handleRequestNotification = async () => {
    Haptics.selection();
    const granted = await nativePermissions.requestNotificationPermission();
    setNotificationStatus(granted ? 'Enabled' : 'Denied');
  };

  const handleRebuild = () => {
    setRebuilding(true);
    Haptics.selection();
    setTimeout(() => {
      recalculateLiveRankings();
      setRebuilding(false);
      Haptics.pointScored();
    }, 600);
  };

  const handleExportData = async () => {
    Haptics.selection();
    const fileName = `rallypoint-events-${Date.now()}.json`;
    const jsonStr = JSON.stringify({ matches, exportedAt: new Date().toISOString() }, null, 2);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    await nativeShare.shareFile(fileName, b64, 'application/json');
    setShowExportNotice(true);
  };

  const handleReportProblem = async () => {
    Haptics.selection();
    const diagnostics = {
      appVersion: '1.2.1-rc1',
      timestamp: new Date().toISOString(),
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      activeSeason,
      currentMatchId: currentMatch?.config?.id || null,
      recentEventsCount: lastMatchEvents?.length || 0,
      lastMatchEvents: (lastMatchEvents || []).slice(-25),
    };
    const reportText = `RallyPoint Diagnostic Report (v1.2.1-rc1)\n${JSON.stringify(diagnostics, null, 2)}`;

    const shared = await nativeShare.shareText('RallyPoint Problem Report', reportText);
    if (!shared && typeof document !== 'undefined') {
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rallypoint-diagnostics-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (showGallery) {
    return (
      <div className="min-h-full pb-28 pt-2 select-none px-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              Haptics.selection();
              setShowGallery(false);
            }}
            className="text-sm font-semibold text-emerald-500 hover:text-emerald-600 transition-colors"
          >
            ← Back to Settings
          </button>
          <h2 className="text-base font-bold">Component Showcase</h2>
          <div className="w-16" />
        </div>
        <ComponentGallery />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28 pt-2 select-none">
      <div className="px-4 mb-3">
        <LargeTitle>Settings</LargeTitle>
      </div>

      <div className="px-4 space-y-6">
        {/* Appearance Group */}
        <GroupedList>
          <GroupedSection header="Appearance">
            <GroupedRow
              title="Dark Appearance"
              subtitle="Optimized for OLED courtside visibility"
              leading={<Moon className="w-5 h-5 text-indigo-500" />}
              trailing={
                <Toggle
                  checked={theme === 'dark'}
                  onChange={() => {
                    Haptics.selection();
                    toggleTheme();
                  }}
                />
              }
            />

            <GroupedRow
              title="Accent Color"
              subtitle="Theme tint across controls"
              leading={<Palette className="w-5 h-5 text-emerald-500" />}
              trailing={
                <div className="flex items-center gap-1.5">
                  {(['green', 'blue', 'teal', 'indigo', 'amber'] as const).map((col) => (
                    <button
                      key={col}
                      onClick={() => {
                        Haptics.selection();
                        setAccent(col);
                      }}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        col === 'green'
                          ? 'bg-emerald-500'
                          : col === 'blue'
                          ? 'bg-blue-500'
                          : col === 'teal'
                          ? 'bg-teal-500'
                          : col === 'indigo'
                          ? 'bg-indigo-500'
                          : 'bg-amber-500'
                      } ${accent === col ? 'ring-2 ring-offset-2 ring-neutral-400 scale-110' : 'opacity-70 hover:opacity-100'}`}
                      title={col}
                    />
                  ))}
                </div>
              }
            />

            <GroupedRow
              title="Courtside High Contrast"
              subtitle="Extra large typography for refereeing"
              leading={<Type className="w-5 h-5 text-amber-500" />}
              trailing={
                <Toggle
                  checked={largeTextMode}
                  onChange={() => {
                    Haptics.selection();
                    toggleLargeText();
                  }}
                />
              }
            />
          </GroupedSection>
        </GroupedList>

        {/* Scoring & Player Action Buttons Group */}
        <GroupedList>
          <GroupedSection header="Scoring Controls">
            <GroupedRow
              title="Show Player Action Buttons"
              subtitle="Show individual POINT & DROP buttons for all players"
              leading={<Sliders className="w-5 h-5 text-emerald-500" />}
              trailing={
                <Toggle
                  checked={showPlayerActionButtons}
                  onChange={(val) => {
                    Haptics.selection();
                    setShowPlayerActionButtons(val);
                  }}
                />
              }
            />

            <GroupedRow
              title="Button Labels"
              subtitle="Terminology displayed on scoring buttons"
              leading={<Type className="w-5 h-5 text-blue-500" />}
              trailing={
                <div className="flex gap-1">
                  {[
                    { id: 'POINT_DROP', label: 'POINT / DROP' },
                    { id: 'WINNER_ERROR', label: 'WIN / ERR' },
                    { id: 'PLUS_MINUS', label: '+1 / -1' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        Haptics.selection();
                        setPlayerActionButtonLabels(opt.id as any);
                      }}
                      className={`px-2 py-1 text-xs rounded-lg font-bold transition-colors ${
                        playerActionButtonLabels === opt.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black/5 dark:bg-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              }
            />

            <GroupedRow
              title="Button Layout"
              subtitle="Touch target sizing (64dp comfortable vs 52dp compact)"
              leading={<Sliders className="w-5 h-5 text-indigo-500" />}
              trailing={
                <div className="flex gap-1">
                  {[
                    { id: 'comfortable', label: 'Comfortable' },
                    { id: 'compact', label: 'Compact' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        Haptics.selection();
                        setPlayerActionButtonLayout(opt.id as any);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-colors ${
                        playerActionButtonLayout === opt.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black/5 dark:bg-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              }
            />
          </GroupedSection>
        </GroupedList>

        {/* Live Streak Alerts Group */}
        <LiveAlertsSettings />

        {/* Scoring & Haptics Group */}
        <GroupedList>
          <GroupedSection header="Interaction & Feedback">
            <GroupedRow
              title="Vibration & Haptics"
              subtitle="Taptic buzz on points and undo"
              leading={<Vibrate className="w-5 h-5 text-rose-500" />}
              trailing={
                <Toggle
                  checked={hapticsEnabled}
                  onChange={(val) => {
                    Haptics.selection();
                    setHapticsEnabled(val);
                  }}
                />
              }
            />

            <GroupedRow
              title="Notifications"
              subtitle="Match alerts & community announcements"
              leading={<Bell className="w-5 h-5 text-indigo-500" />}
              trailing={
                notificationStatus ? (
                  <Badge variant={notificationStatus === 'Enabled' ? 'success' : 'neutral'}>
                    {notificationStatus}
                  </Badge>
                ) : (
                  <Button variant="secondary" size="sm" onClick={handleRequestNotification}>
                    Request
                  </Button>
                )
              }
            />

            <GroupedRow
              title="Background Activity Guide"
              subtitle="Optimizations for iQOO Neo 10 & Funtouch OS"
              leading={<BatteryCharging className="w-5 h-5 text-emerald-500" />}
              trailing={
                <Button variant="secondary" size="sm" onClick={() => setShowBatteryGuide(true)}>
                  View Guide
                </Button>
              }
            />
          </GroupedSection>
        </GroupedList>

        {/* Season & Data Management */}
        <GroupedList>
          <GroupedSection header="Season & Event Sourcing">
            <GroupedRow
              title="Active Season"
              subtitle="Currently filtering league match results"
              leading={<Sliders className="w-5 h-5 text-blue-500" />}
              trailing={
                <div className="flex gap-1">
                  {['Season 1', 'Season 2'].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        Haptics.selection();
                        setActiveSeason(s);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                        activeSeason === s
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black/5 dark:bg-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              }
            />

            <GroupedRow
              title="Rebuild Rankings"
              subtitle="Replay all append-only events from source"
              leading={<RefreshCw className={`w-5 h-5 text-teal-500 ${rebuilding ? 'animate-spin' : ''}`} />}
              trailing={
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={rebuilding}
                  onClick={handleRebuild}
                >
                  {rebuilding ? 'Replaying...' : 'Rebuild'}
                </Button>
              }
            />

            <GroupedRow
              title="Export Event Log"
              subtitle="Download local match events as JSON"
              leading={<Download className="w-5 h-5 text-neutral-400" />}
              trailing={
                <Button variant="secondary" size="sm" onClick={handleExportData}>
                  Export
                </Button>
              }
            />
          </GroupedSection>
        </GroupedList>

        {/* About & System Updates */}
        <GroupedList>
          <GroupedSection header="About & Updates">
            <GroupedRow
              title="Check for Updates"
              subtitle={updateStatusMessage || 'Latest release via GitHub'}
              leading={<Sparkles className="w-5 h-5 text-emerald-500" />}
              trailing={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdate}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  <span>{checkingUpdate ? 'Checking...' : 'Check'}</span>
                </Button>
              }
            />

            <GroupedRow
              title="Report a Problem"
              subtitle="Bundle version, device info & last match event log"
              leading={<Bug className="w-5 h-5 text-amber-500" />}
              onClick={handleReportProblem}
              trailing={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReportProblem}
                >
                  Export Log
                </Button>
              }
            />

            <GroupedRow
              title="Installed Version"
              subtitle="Optimized for Android 15 & iQOO Neo 10"
              leading={<Info className="w-5 h-5 text-neutral-400" />}
              trailing={
                <Badge variant="neutral" size="sm">
                  v1.2.1-rc1
                </Badge>
              }
            />
          </GroupedSection>
        </GroupedList>

        {/* Developer Tools */}
        <GroupedList>
          <GroupedSection header="Developer Tools">
            <GroupedRow
              title="UI Component Gallery"
              subtitle="Interactive Apple-inspired design tokens"
              leading={<Info className="w-5 h-5 text-purple-500" />}
              onClick={() => {
                Haptics.selection();
                setShowGallery(true);
              }}
              trailing={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    Haptics.selection();
                    setShowGallery(true);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              }
            />
          </GroupedSection>
          {/* Animations & Celebrations */}
          <GroupedSection header="Animations">
            <GroupedRow
              title="Celebration intensity"
              subtitle="Shutout & match win effects"
              leading={<Sparkles className="w-5 h-5 text-amber-500" />}
              trailing={
                <select
                  aria-label="Celebration intensity"
                  value={celebrationIntensity}
                  onChange={(e) => setCelebrationIntensity(e.target.value as CelebrationIntensity)}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-xs font-semibold"
                >
                  <option value="full">Full</option>
                  <option value="reduced">Reduced</option>
                  <option value="off">Off</option>
                </select>
              }
            />
            <GroupedRow
              title="Celebration Sound"
              subtitle="Synthesized impact & chime"
              trailing={
                <Toggle
                  checked={celebrationSound}
                  onChange={setCelebrationSound}
                />
              }
            />
            <GroupedRow
              title="Celebration Haptics"
              subtitle="Layered vibration on shutout"
              trailing={
                <Toggle
                  checked={celebrationHaptics}
                  onChange={setCelebrationHaptics}
                />
              }
            />
            <GroupedRow
              title="One point to shutout banner"
              subtitle="Show quiet alert at 6-0"
              trailing={
                <Toggle
                  checked={shutoutBannerEnabled}
                  onChange={setShutoutBannerEnabled}
                />
              }
            />
          </GroupedSection>

          {/* Data & Players */}
          <GroupedSection header="Data">
            <GroupedRow
              title="Archived Players"
              subtitle={`${communityPlayers.filter((p) => p.status === 'ARCHIVED' || p.status === 'HIDDEN').length} archived or hidden`}
              leading={<Archive className="w-5 h-5 text-neutral-500" />}
              showChevron
              onClick={() => {
                Haptics.selection();
                setShowArchivedSheet(true);
              }}
            />
            <GroupedRow
              title="Start fresh (delete all data)"
              subtitle="Wipe players, matches, and rankings"
              leading={<Trash2 className="w-5 h-5 text-rose-500" />}
              showChevron
              onClick={() => {
                Haptics.selection();
                setResetConfirmText('');
                setShowResetSheet(true);
              }}
            />
          </GroupedSection>
        </GroupedList>

        {/* App Info Footer (tap version 7x for MVP Debug) */}
        <div className="text-center pt-2 pb-4 space-y-1">
          <button
            type="button"
            onClick={() => {
              const next = aboutTapCount + 1;
              if (next >= 7) {
                setAboutTapCount(0);
                setShowMvpDebugSheet(true);
              } else {
                setAboutTapCount(next);
              }
            }}
            className="inline-block"
          >
            <Badge variant="neutral" size="sm">
              RallyPoint UI v1.3.1 (Apple HIG)
            </Badge>
          </button>
          <p className="text-[11px] text-neutral-400">
            Event-sourced badminton scoring & community leagues
          </p>
        </div>
      </div>

      {/* Component Gallery Sheet */}
      <BottomSheet
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        title="Component Gallery"
      >
        <div className="max-h-[75vh] overflow-y-auto no-scrollbar pb-8">
          <ComponentGallery />
        </div>
      </BottomSheet>

      {/* Export Success Modal */}
      <BottomSheet
        isOpen={showExportNotice}
        onClose={() => setShowExportNotice(false)}
        title="Data Exported"
      >
        <div className="space-y-4 pb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Your match event log has been downloaded as a structured JSON file. You can import or
            verify it at any time.
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => setShowExportNotice(false)}
          >
            Done
          </Button>
        </div>
      </BottomSheet>

      {/* Funtouch OS / OriginOS Background Activity Modal */}
      <FuntouchBatteryModal
        forceOpen={showBatteryGuide}
        onClose={() => setShowBatteryGuide(false)}
      />

      {/* In-App GitHub Releases Update Modal */}
      <UpdateModal
        updateInfo={updateResult}
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
      />

      {/* Archived Players Sheet */}
      <BottomSheet
        isOpen={showArchivedSheet}
        onClose={() => setShowArchivedSheet(false)}
        title="Archived Players"
      >
        <div className="space-y-3 pb-6">
          {communityPlayers.filter((p) => p.status === 'ARCHIVED' || p.status === 'HIDDEN')
            .length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">
              No archived or hidden players.
            </p>
          ) : (
            communityPlayers
              .filter((p) => p.status === 'ARCHIVED' || p.status === 'HIDDEN')
              .map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/10"
                >
                  <div>
                    <p className="text-sm font-semibold">{player.displayName}</p>
                    <p className="text-[11px] text-neutral-400">
                      {player.status === 'HIDDEN' ? 'Hidden from rankings' : 'Archived'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      Haptics.selection();
                      restoreCommunityPlayer(player.id);
                    }}
                    leadingIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Restore player
                  </Button>
                </div>
              ))
          )}
        </div>
      </BottomSheet>

      {/* Start Fresh (Delete All Data) Sheet */}
      <BottomSheet
        isOpen={showResetSheet}
        onClose={() => setShowResetSheet(false)}
        title="Start Fresh"
      >
        <div className="space-y-4 pb-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            This will permanently delete all local players, matches, and rankings and return
            RallyPoint to its first-run state.
          </p>

          <Button
            variant="secondary"
            fullWidth
            type="button"
            leadingIcon={<Download className="w-4 h-4" />}
            onClick={() => {
              const payload = {
                exportedAt: new Date().toISOString(),
                activeSeason,
                communityPlayers,
                matches,
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `rallypoint-backup-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download Backup First
          </Button>

          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
              Type RESET to confirm
            </label>
            <input
              type="text"
              placeholder="RESET"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-base focus:outline-hidden focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              type="button"
              onClick={() => setShowResetSheet(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              fullWidth
              type="button"
              disabled={resetConfirmText.trim() !== 'RESET'}
              onClick={() => {
                Haptics.selection();
                resetMatch();
                resetAllData();
                setShowResetSheet(false);
              }}
            >
              Delete All Data
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Hidden Developer MVP Debug Sheet (7 taps on version badge) */}
      <BottomSheet
        isOpen={showMvpDebugSheet}
        onClose={() => setShowMvpDebugSheet(false)}
        title="MVP Debug Inspector"
      >
        {(() => {
          const lastMatch = matches[matches.length - 1];
          const debugEvents: RankingMatchEvent[] = lastMatch
            ? lastMatch.events
            : (lastMatchEvents as unknown as RankingMatchEvent[]);
          const debugResult = computeMatchAwards(
            debugEvents,
            undefined,
            lastMatch
              ? {
                  matchType: lastMatch.matchType,
                  scoringFormat: lastMatch.scoringFormat,
                  targetPoints: lastMatch.targetPoints,
                  winnerSide: lastMatch.winnerSide || undefined,
                  participants: lastMatch.participants,
                }
              : currentMatch
              ? {
                  matchType: currentMatch.config.mode === 'doubles' ? 'DOUBLES' : 'SINGLES',
                  winnerSide: currentMatch.winnerSide,
                }
              : undefined
          );
          return (
            <div className="space-y-3 pb-6 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/10">
                <p className="font-bold">Formula: {debugResult.formulaVersion}</p>
                <p>Qualified: {String(debugResult.isQualified)} (min {debugResult.qualificationThreshold ?? 2})</p>
                <p>Unassigned rallies: {debugResult.unassignedCount ?? 0}</p>
                <p>
                  Weights: pts={DEFAULT_MVP_WEIGHTS.pointsWonWeight}, srv={DEFAULT_MVP_WEIGHTS.serveRegainedWeight},
                  clutch={DEFAULT_MVP_WEIGHTS.clutchPointsWeight}, cb={DEFAULT_MVP_WEIGHTS.comebackPointsWeight},
                  drop=-{DEFAULT_MVP_WEIGHTS.dropsPenalty}, win=+{DEFAULT_MVP_WEIGHTS.resultBonus}
                </p>
              </div>
              <pre className="p-3 rounded-xl bg-black/5 dark:bg-white/10 overflow-x-auto max-h-60 text-[10px]">
                {JSON.stringify(debugResult.allContributions, null, 2)}
              </pre>
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
};
