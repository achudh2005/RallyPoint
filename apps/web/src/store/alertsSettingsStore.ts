import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { StreakAlertsConfig, ShutoutConfig } from '@rallypoint/scoring-rules';

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(name, value);
    } catch {
      // Ignore in test environments without localStorage
    }
  },
  removeItem: (name) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
    } catch {
      // Ignore
    }
  },
};

export type CelebrationIntensity = 'full' | 'reduced' | 'off';

export interface AlertsSettingsState {
  streakAlertsEnabled: boolean;
  pointStreakEnabled: boolean;
  dropStreakEnabled: boolean;
  teamRunEnabled: boolean;
  strictMode: boolean;
  streakSnappedEnabled: boolean;
  streakHaptics: boolean;
  shutoutBannerEnabled: boolean;
  celebrationIntensity: CelebrationIntensity;
  celebrationSound: boolean;
  celebrationHaptics: boolean;
  lastShutoutConfig: ShutoutConfig;
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
  setShutoutBannerEnabled: (val: boolean) => void;
  setCelebrationIntensity: (val: CelebrationIntensity) => void;
  setCelebrationSound: (val: boolean) => void;
  setCelebrationHaptics: (val: boolean) => void;
  setLastShutoutConfig: (cfg: ShutoutConfig) => void;
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
      shutoutBannerEnabled: true,
      celebrationIntensity: 'full',
      celebrationSound: true,
      celebrationHaptics: true,
      lastShutoutConfig: {
        enabled: false,
        target: 7,
        effect: 'GAME',
        applyInDecider: true,
      },
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
      setShutoutBannerEnabled: (val) => set({ shutoutBannerEnabled: val }),
      setCelebrationIntensity: (val) => set({ celebrationIntensity: val }),
      setCelebrationSound: (val) => set({ celebrationSound: val }),
      setCelebrationHaptics: (val) => set({ celebrationHaptics: val }),
      setLastShutoutConfig: (cfg) => set({ lastShutoutConfig: cfg }),
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
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
