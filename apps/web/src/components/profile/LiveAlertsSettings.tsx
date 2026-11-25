import React from 'react';
import {
  GroupedList,
  GroupedSection,
  GroupedRow,
  Toggle,
  Haptics,
} from '@rallypoint/ui';
import { useAlertsSettingsStore } from '../../store/alertsSettingsStore.js';
import { Flame, ShieldAlert, Users, Sliders, Vibrate, Globe } from 'lucide-react';

export const LiveAlertsSettings: React.FC = () => {
  const {
    streakAlertsEnabled,
    setStreakAlertsEnabled,
    pointStreakEnabled,
    setPointStreakEnabled,
    dropStreakEnabled,
    setDropStreakEnabled,
    teamRunEnabled,
    setTeamRunEnabled,
    strictMode,
    setStrictMode,
    streakSnappedEnabled,
    setStreakSnappedEnabled,
    streakHaptics,
    setStreakHaptics,
    language,
    setLanguage,
  } = useAlertsSettingsStore();

  return (
    <GroupedList>
      <GroupedSection
        header="Live Streak Alerts"
        footer="Quiet, pill banners during exciting scoring runs and recovery moments. Never blocks score taps."
      >
        <GroupedRow
          title="Enable Streak Alerts"
          subtitle="Master toggle for all live banners"
          leading={<Flame className="w-5 h-5 text-amber-500" />}
          trailing={
            <Toggle
              checked={streakAlertsEnabled}
              onChange={(val) => {
                Haptics.selection();
                setStreakAlertsEnabled(val);
              }}
            />
          }
        />

        {streakAlertsEnabled && (
          <>
            <GroupedRow
              title="Point Streaks"
              subtitle="Alerts at 3, 5, 7, and 10 points"
              leading={<Flame className="w-5 h-5 text-emerald-500" />}
              trailing={
                <Toggle
                  checked={pointStreakEnabled}
                  onChange={(val) => {
                    Haptics.selection();
                    setPointStreakEnabled(val);
                  }}
                />
              }
            />

            <GroupedRow
              title="Drop Streaks"
              subtitle="Gentle breath reminders after 3 or 5 drops"
              leading={<ShieldAlert className="w-5 h-5 text-rose-500" />}
              trailing={
                <Toggle
                  checked={dropStreakEnabled}
                  onChange={(val) => {
                    Haptics.selection();
                    setDropStreakEnabled(val);
                  }}
                />
              }
            />

            <GroupedRow
              title="Team Runs"
              subtitle="Alerts at 5, 8, and 10 consecutive side points"
              leading={<Users className="w-5 h-5 text-blue-500" />}
              trailing={
                <Toggle
                  checked={teamRunEnabled}
                  onChange={(val) => {
                    Haptics.selection();
                    setTeamRunEnabled(val);
                  }}
                />
              }
            />

            <GroupedRow
              title="Strict Streak Mode"
              subtitle="Streak broken if any other player wins a rally"
              leading={<Sliders className="w-5 h-5 text-purple-500" />}
              trailing={
                <Toggle
                  checked={strictMode}
                  onChange={(val) => {
                    Haptics.selection();
                    setStrictMode(val);
                  }}
                />
              }
            />

            <GroupedRow
              title="Streak Snapped Alerts"
              subtitle="Notify when an opponent ends a major streak"
              leading={<ShieldAlert className="w-5 h-5 text-amber-500" />}
              trailing={
                <Toggle
                  checked={streakSnappedEnabled}
                  onChange={(val) => {
                    Haptics.selection();
                    setStreakSnappedEnabled(val);
                  }}
                />
              }
            />

            <GroupedRow
              title="Subtle Alert Haptics"
              subtitle="Gentle linear vibration when a banner appears"
              leading={<Vibrate className="w-5 h-5 text-indigo-500" />}
              trailing={
                <Toggle
                  checked={streakHaptics}
                  onChange={(val) => {
                    Haptics.selection();
                    setStreakHaptics(val);
                  }}
                />
              }
            />

            <GroupedRow
              title="Language"
              subtitle="Banner text language"
              leading={<Globe className="w-5 h-5 text-teal-500" />}
              trailing={
                <div className="flex gap-1 bg-black/10 dark:bg-white/10 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => {
                      Haptics.selection();
                      setLanguage('en');
                    }}
                    className={`px-2 py-1 rounded-md transition-all ${
                      language === 'en'
                        ? 'bg-emerald-500 text-white shadow'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      Haptics.selection();
                      setLanguage('ml');
                    }}
                    className={`px-2 py-1 rounded-md transition-all ${
                      language === 'ml'
                        ? 'bg-emerald-500 text-white shadow'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    മലയാളം
                  </button>
                </div>
              }
            />
          </>
        )}
      </GroupedSection>
    </GroupedList>
  );
};
