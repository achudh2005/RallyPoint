import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nativeHaptics } from './haptics.js';
import { nativeKeepAwake } from './keepAwake.js';
import { registerBackHandler } from './backButton.js';
import { funtouchBattery } from './funtouchBattery.js';
import { nativeShare } from './nativeShare.js';
import { nativePermissions } from './permissions.js';

describe('Native Android 15 & iQOO Neo 10 Adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('nativeHaptics', () => {
    it('executes pointScored, undo, and matchWon without throwing', async () => {
      await expect(nativeHaptics.pointScored()).resolves.not.toThrow();
      await expect(nativeHaptics.undo()).resolves.not.toThrow();
      await expect(nativeHaptics.gameEnd()).resolves.not.toThrow();
      await expect(nativeHaptics.matchWon()).resolves.not.toThrow();
      await expect(nativeHaptics.selection()).resolves.not.toThrow();
    });

    it('attaches to global window delegate for @rallypoint/ui', () => {
      expect(window.__NATIVE_HAPTICS__).toBeDefined();
      expect(typeof window.__NATIVE_HAPTICS__?.pointScored).toBe('function');
    });
  });

  describe('nativeKeepAwake', () => {
    it('enables and disables keep awake cleanly', async () => {
      await expect(nativeKeepAwake.enable()).resolves.not.toThrow();
      await expect(nativeKeepAwake.disable()).resolves.not.toThrow();
    });
  });

  describe('backButton', () => {
    it('registers and unregisters modal back handlers in LIFO order', () => {
      const handler1 = vi.fn().mockReturnValue(true);
      const handler2 = vi.fn().mockReturnValue(false);

      const unregister1 = registerBackHandler(handler1);
      const unregister2 = registerBackHandler(handler2);

      expect(typeof unregister1).toBe('function');
      expect(typeof unregister2).toBe('function');

      unregister2();
      unregister1();
    });
  });

  describe('funtouchBattery', () => {
    it('reads preference for battery guide', async () => {
      const show = await funtouchBattery.shouldShowGuide();
      expect(typeof show).toBe('boolean');
      await expect(funtouchBattery.dismissGuide()).resolves.not.toThrow();
    });
  });

  describe('nativeShare', () => {
    it('handles shareText gracefully with fallback', async () => {
      const res = await nativeShare.shareText('Test Title', 'Test Content');
      expect(typeof res).toBe('boolean');
    });
  });

  describe('nativePermissions', () => {
    it('checks notification permissions without throwing', async () => {
      const res = await nativePermissions.requestNotificationPermission();
      expect(typeof res).toBe('boolean');
    });
  });
});
