/**
 * Apple iOS-style Haptic Feedback Engine
 * Safely wraps navigator.vibrate with fallbacks
 */

export const Haptics = {
  selection: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignored
      }
    }
  },

  pointScored: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(18);
      } catch {
        // Ignored
      }
    }
  },

  undo: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([15, 30, 15]);
      } catch {
        // Ignored
      }
    }
  },

  sideChange: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([25, 40, 25]);
      } catch {
        // Ignored
      }
    }
  },

  gameWon: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40, 60, 80]);
      } catch {
        // Ignored
      }
    }
  },

  error: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 50, 30]);
      } catch {
        // Ignored
      }
    }
  },
};
