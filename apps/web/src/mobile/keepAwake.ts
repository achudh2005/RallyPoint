import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';

let wakeLockSentinel: any = null;

export const nativeKeepAwake = {
  /**
   * Keep screen awake continuously while scoring
   */
  enable: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await KeepAwake.keepAwake();
      } else if ('wakeLock' in navigator) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {
      console.debug('KeepAwake enable error (non-fatal):', e);
    }
  },

  /**
   * Allow device screen to dim and sleep normally when match ends or is idle
   */
  disable: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await KeepAwake.allowSleep();
      } else if (wakeLockSentinel) {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
    } catch (e) {
      console.debug('KeepAwake disable error (non-fatal):', e);
    }
  },
};
