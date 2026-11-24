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

export const AppleProfileScreen: React.FC = () => {
  const { accent, setAccent } = useTheme();
  const { theme, toggleTheme, largeTextMode, toggleLargeText } = useMatchStore();
  const { activeSeason, setActiveSeason, recalculateLiveRankings, matches } =
    useRankingStore();

  const [showGallery, setShowGallery] = useState(false);
  const [showExportNotice, setShowExportNotice] = useState(false);
  const [showBatteryGuide, setShowBatteryGuide] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

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

        {/* Design System Gallery */}
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
        </GroupedList>

        {/* App Info Footer */}
        <div className="text-center pt-2 pb-4 space-y-1">
          <Badge variant="neutral" size="sm">
            RallyPoint UI v1.0.0 (Apple HIG)
          </Badge>
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
    </div>
  );
};
