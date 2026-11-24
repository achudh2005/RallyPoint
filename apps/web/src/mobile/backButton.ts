import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

type BackHandler = () => boolean; // return true if handled, false to continue down stack

const backHandlers: BackHandler[] = [];
let lastBackPressTime = 0;

/**
 * Register a back handler (e.g., when a bottom sheet or modal opens).
 * Returns an unregister cleanup function.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.indexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Initialize native hardware back button and gesture listener for Android
 */
export function initNativeBackButton(onDoubleBackExitNotice?: () => void) {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('backButton', ({ canGoBack }) => {
    // 1. If any registered modal or sheet handler handles it, consume event
    for (let i = backHandlers.length - 1; i >= 0; i--) {
      const handler = backHandlers[i];
      if (handler && handler()) {
        return;
      }
    }

    // 2. If browser/web history can go back, navigate up
    if (canGoBack && window.history.length > 1) {
      window.history.back();
      return;
    }

    // 3. Double-back to exit on root Play / Rankings tab
    const now = Date.now();
    if (now - lastBackPressTime < 2000) {
      App.exitApp();
    } else {
      lastBackPressTime = now;
      if (onDoubleBackExitNotice) {
        onDoubleBackExitNotice();
      }
    }
  });
}
