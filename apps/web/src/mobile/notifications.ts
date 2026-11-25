import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Local Notifications wrapper for Match MVP & Milestone Awards.
 * Gracefully no-ops in web browsers or test environments where native notifications aren't available.
 */
export const nativeNotifications = {
  notifyMatchMvp: async (playerName: string, mvpScore: number, matchTitle = 'Match Complete') => {
    try {
      if (!Capacitor.isNativePlatform()) return;

      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2147483647),
            title: `🌟 Match MVP: ${playerName}`,
            body: `${playerName} earned MVP (${mvpScore.toFixed(1)} rating) in ${matchTitle}!`,
            schedule: { at: new Date(Date.now() + 500) },
          },
        ],
      });
    } catch {
      // Ignore gracefully in unsupported environments
    }
  },
};
