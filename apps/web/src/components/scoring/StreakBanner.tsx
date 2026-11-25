import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { StreakMilestoneAlert } from '@rallypoint/scoring-rules';
import { nativeHaptics } from '../../mobile/haptics.js';
import { useAlertsSettingsStore } from '../../store/alertsSettingsStore.js';

interface StreakBannerProps {
  currentAlert: StreakMilestoneAlert | null;
  suppressed?: boolean;
}

export const StreakBanner: React.FC<StreakBannerProps> = ({
  currentAlert,
  suppressed = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const streakHaptics = useAlertsSettingsStore((s) => s.streakHaptics);

  const [activeAlert, setActiveAlert] = useState<StreakMilestoneAlert | null>(null);
  const [, setQueuedAlert] = useState<StreakMilestoneAlert | null>(null);

  const activeAlertRef = useRef<StreakMilestoneAlert | null>(null);
  const lastDismissedTimestampRef = useRef<number>(0);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Minimum gap between banners: 20 seconds, unless replaced by higher priority
  const MIN_BANNER_GAP_MS = 20000;
  const BANNER_DURATION_MS = 2500;

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    };
  }, []);

  const showBanner = (alert: StreakMilestoneAlert) => {
    activeAlertRef.current = alert;
    setActiveAlert(alert);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    dismissTimerRef.current = setTimeout(() => {
      activeAlertRef.current = null;
      setActiveAlert(null);
      lastDismissedTimestampRef.current = Date.now();

      // Check if there is a queued alert waiting
      setQueuedAlert((prevQueue) => {
        if (prevQueue) {
          if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
          queueTimerRef.current = setTimeout(() => {
            showBanner(prevQueue);
          }, MIN_BANNER_GAP_MS);
        }
        return null;
      });
    }, BANNER_DURATION_MS);
  };

  // Handle incoming alert
  useEffect(() => {
    if (!currentAlert) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
      activeAlertRef.current = null;
      setActiveAlert(null);
      setQueuedAlert(null);
      return;
    }

    if (suppressed) return;

    const now = Date.now();
    const timeSinceLastDismiss = now - lastDismissedTimestampRef.current;

    // Trigger haptic if enabled
    if (streakHaptics) {
      nativeHaptics.streakAlert();
    }

    const currentActive = activeAlertRef.current;

    // If no active alert is displayed and sufficient time has passed, show immediately
    if (!currentActive) {
      if (timeSinceLastDismiss >= MIN_BANNER_GAP_MS) {
        showBanner(currentAlert);
      } else {
        // Enqueue if within gap (max queue size: 1, keep the highest priority)
        setQueuedAlert((prev) => {
          if (!prev || currentAlert.priority >= prev.priority) {
            return currentAlert;
          }
          return prev;
        });
      }
    } else {
      // An alert is already active: if incoming has higher priority (e.g. 5 points during 3), replace immediately!
      if (currentAlert.priority > currentActive.priority) {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        showBanner(currentAlert);
      } else if (currentAlert.id !== currentActive.id) {
        // Otherwise, hold at most 1 item in queue
        setQueuedAlert((prev) => {
          if (!prev || currentAlert.priority >= prev.priority) {
            return currentAlert;
          }
          return prev;
        });
      }
    }
  }, [currentAlert?.id, suppressed, streakHaptics]);

  // Helper icon for alert
  const getAlertIcon = (alert: StreakMilestoneAlert) => {
    switch (alert.type) {
      case 'PLAYER_POINT':
        if (alert.count >= 10) return '👑';
        if (alert.count >= 7) return '🌟';
        if (alert.count >= 5) return '⚡';
        return '🔥';
      case 'PLAYER_DROP':
        return '🧘';
      case 'TEAM_RUN':
        if (alert.count >= 10) return '🌪️';
        if (alert.count >= 8) return '💥';
        return '🚀';
      case 'STREAK_SNAPPED':
        return '🛑';
      default:
        return '✨';
    }
  };

  const isDrop = activeAlert?.type === 'PLAYER_DROP';

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      data-testid="streak-banner-container"
      className="fixed inset-x-0 top-0 z-40 flex justify-center pointer-events-none px-4"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      }}
    >
      <AnimatePresence>
        {activeAlert && !suppressed && (
          <motion.div
            key={activeAlert.id}
            data-testid="streak-banner"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -14, scale: 0.96 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -10, scale: 0.96 }
            }
            transition={{
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1], // Apple spring curve
            }}
            className={`flex items-center gap-2 max-w-sm px-4 py-2 rounded-full border shadow-2xl backdrop-blur-xl select-none ${
              isDrop
                ? 'bg-neutral-900/95 border-rose-500/30 text-rose-100 shadow-rose-950/20'
                : 'bg-neutral-900/95 border-amber-500/30 text-amber-100 shadow-amber-950/20'
            }`}
          >
            <span className="text-base select-none shrink-0" role="img" aria-hidden="true">
              {getAlertIcon(activeAlert)}
            </span>
            <p className="text-xs font-semibold tracking-tight text-white/95 truncate">
              {activeAlert.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
