import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export const nativeStatusBar = {
  /**
   * Set status bar style matched to dark theme (#090A0F) with transparent edge-to-edge overlay
   */
  setDark: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    } catch (e) {
      console.debug('StatusBar dark styling error (non-fatal):', e);
    }
  },

  /**
   * Set status bar style matched to light theme
   */
  setLight: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (e) {
      console.debug('StatusBar light styling error (non-fatal):', e);
    }
  },
};
