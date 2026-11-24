/**
 * Apple & Android Native Haptic Feedback Engine
 * Delegates to Capacitor native haptics if registered on window, with navigator.vibrate fallbacks
 */

export interface NativeHapticsDelegate {
  selection?: () => void;
  pointScored?: () => void;
  undo?: () => void;
  sideChange?: () => void;
  gameWon?: () => void;
  error?: () => void;
}

declare global {
  interface Window {
    __NATIVE_HAPTICS__?: NativeHapticsDelegate;
  }
}

export const Haptics = {
  selection: () => {
    if (typeof window !== 'undefined') {
      if (window.__NATIVE_HAPTICS__?.selection) {
        window.__NATIVE_HAPTICS__.selection();
        return;
      }
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(10);
        } catch {}
      }
    }
  },

  pointScored: () => {
    if (typeof window !== 'undefined') {
      if (window.__NATIVE_HAPTICS__?.pointScored) {
        window.__NATIVE_HAPTICS__.pointScored();
        return;
      }
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(18);
        } catch {}
      }
    }
  },

  undo: () => {
    if (typeof window !== 'undefined') {
      if (window.__NATIVE_HAPTICS__?.undo) {
        window.__NATIVE_HAPTICS__.undo();
        return;
      }
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([15, 30, 15]);
        } catch {}
      }
    }
  },

  sideChange: () => {
    if (typeof window !== 'undefined') {
      if (window.__NATIVE_HAPTICS__?.sideChange) {
        window.__NATIVE_HAPTICS__.sideChange();
        return;
      }
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([25, 40, 25]);
        } catch {}
      }
    }
  },

  gameWon: () => {
    if (typeof window !== 'undefined') {
      if (window.__NATIVE_HAPTICS__?.gameWon) {
        window.__NATIVE_HAPTICS__.gameWon();
        return;
      }
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([40, 60, 40, 60, 80]);
        } catch {}
      }
    }
  },

  error: () => {
    if (typeof window !== 'undefined') {
      if (window.__NATIVE_HAPTICS__?.error) {
        window.__NATIVE_HAPTICS__.error();
        return;
      }
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([30, 50, 30]);
        } catch {}
      }
    }
  },
};
