import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const PREF_KEY_BATTERY_GUIDE_DISMISSED = 'rallypoint_funtouch_battery_dismissed';

export const funtouchBattery = {
  /**
   * Check if battery guide should be displayed on first run or on iQOO/Vivo devices
   */
  shouldShowGuide: async (): Promise<boolean> => {
    try {
      const { value } = await Preferences.get({ key: PREF_KEY_BATTERY_GUIDE_DISMISSED });
      if (value === 'true') {
        return false;
      }

      // Check if running on Android
      if (Capacitor.getPlatform() === 'android') {
        return true;
      }
    } catch {}
    return false;
  },

  /**
   * Dismiss the guide and save preference so it won't prompt again
   */
  dismissGuide: async () => {
    try {
      await Preferences.set({
        key: PREF_KEY_BATTERY_GUIDE_DISMISSED,
        value: 'true',
      });
    } catch {}
  },
};
