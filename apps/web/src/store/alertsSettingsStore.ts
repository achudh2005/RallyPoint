import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StreakAlertsConfig } from '@rallypoint/scoring-rules';

export interface AlertsSettingsState {
  streakAlertsEnabled: boolean;
  pointStreakEnabled: boolean;
  dropStreakEnabled: boolean;
  teamRunEnabled: boolean;
  strictMode: boolean;
  streakSnappedEnabled: boolean;
  streakHaptics: boolean;
  language: 'en' | 'ml';
  pointThresholds: number[];
  dropThresholds: number[];
  teamRunThresholds: number[];

  // Actions
  setStreakAlertsEnabled: (val: boolean) => void;
  setPointStreakEnabled: (val: boolean) => void;
  setDropStreakEnabled: (val: boolean) => void;
  setTeamRunEnabled: (val: boolean) => void;
  setStrictMode: (val: boolean) => void;
  setStreakSnappedEnabled: (val: boolean) => void;
  setStreakHaptics: (val: boolean) => void;
  setLanguage: (lang: 'en' | 'ml') => void;
  toStreakConfig: () => StreakAlertsConfig;
}

export const useAlertsSettingsStore = create<AlertsSettingsState>()(
  persist(
    (set, get) => ({
      streakAlertsEnabled: true,
      pointStreakEnabled: true,
      dropStreakEnabled: true,
      teamRunEnabled: true,
      strictMode: false,
      streakSnappedEnabled: false,
      streakHaptics: true,
      language: 'en',
      pointThresholds: [3, 5, 7, 10],
      dropThresholds: [3, 5],
      teamRunThresholds: [5, 8, 10],

      setStreakAlertsEnabled: (val) => set({ streakAlertsEnabled: val }),
      setPointStreakEnabled: (val) => set({ pointStreakEnabled: val }),
      setDropStreakEnabled: (val) => set({ dropStreakEnabled: val }),
      setTeamRunEnabled: (val) => set({ teamRunEnabled: val }),
      setStrictMode: (val) => set({ strictMode: val }),
      setStreakSnappedEnabled: (val) => set({ streakSnappedEnabled: val }),
      setStreakHaptics: (val) => set({ streakHaptics: val }),
      setLanguage: (lang) => set({ language: lang }),

      toStreakConfig: () => {
        const state = get();
        return {
          pointStreakThresholds: state.streakAlertsEnabled && state.pointStreakEnabled ? state.pointThresholds : [],
          dropStreakThresholds: state.streakAlertsEnabled && state.dropStreakEnabled ? state.dropThresholds : [],
          teamRunThresholds: state.streakAlertsEnabled && state.teamRunEnabled ? state.teamRunThresholds : [],
          strictMode: state.strictMode,
          streakSnappedEnabled: state.streakSnappedEnabled,
          hapticsEnabled: state.streakHaptics,
          dropStreaksEnabled: state.streakAlertsEnabled && state.dropStreakEnabled,
          language: state.language,
        };
      },
    }),
    {
      name: 'rallypoint-alerts-settings',
    }
  )
);
