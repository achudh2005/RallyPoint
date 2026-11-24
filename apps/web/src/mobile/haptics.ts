import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = Capacitor.isNativePlatform();

/**
 * Native Haptics Controller for RallyPoint
 * Designed specifically for high-fidelity linear vibration motors (e.g. iQOO Neo 10 / Snapdragon 8 Gen 3)
 */
export const nativeHaptics = {
  /**
   * Distinct impact for point scored (snappy medium tap)
   */
  pointScored: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {}
  },

  /**
   * Distinct double-tap/soft pattern for drop error
   */
  dropScored: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.impact({ style: ImpactStyle.Light });
        setTimeout(async () => {
          try {
            await Haptics.impact({ style: ImpactStyle.Light });
          } catch {}
        }, 80);
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 60, 15]);
      }
    } catch {}
  },

  /**
   * Soft feedback for undo operation
   */
  undo: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {}
  },

  /**
   * Distinct warning/alert pattern when a game finishes or side changes
   */
  sideChange: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([25, 40, 25]);
      }
    } catch {}
  },

  /**
   * Distinct warning/alert pattern when a game finishes
   */
  gameEnd: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {}
  },

  /**
   * Celebratory success pattern for winning the entire match
   */
  matchWon: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 80, 60, 80, 100]);
      }
    } catch {}
  },

  gameWon: async () => {
    await nativeHaptics.matchWon();
  },

  /**
   * Light selection click for tabs, segmented controls, and chips
   */
  selection: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {}
  },

  error: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.notification({ type: NotificationType.Error });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    } catch {}
  },
};

// Register globally so @rallypoint/ui delegates directly to native haptics
if (typeof window !== 'undefined') {
  window.__NATIVE_HAPTICS__ = {
    selection: () => { nativeHaptics.selection(); },
    pointScored: () => { nativeHaptics.pointScored(); },
    undo: () => { nativeHaptics.undo(); },
    sideChange: () => { nativeHaptics.sideChange(); },
    gameWon: () => { nativeHaptics.matchWon(); },
    error: () => { nativeHaptics.error(); },
  };
}
