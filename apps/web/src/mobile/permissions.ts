import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const nativePermissions = {
  /**
   * Check and request notification permissions with rationale for Android 13+
   */
  requestNotificationPermission: async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        return true;
      }

      if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
        const req = await LocalNotifications.requestPermissions();
        return req.display === 'granted';
      }
    } catch (e) {
      console.debug('Notification permission check error:', e);
    }
    return false;
  },
};
