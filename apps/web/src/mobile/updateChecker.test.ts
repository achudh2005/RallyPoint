import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compareSemver, checkForAppUpdates, getAppVersionInfo } from './updateChecker.js';

describe('In-App Update Checker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('compareSemver', () => {
    it('correctly detects newer version', () => {
      expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
      expect(compareSemver('1.1.0', '1.0.9')).toBe(1);
      expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemver('v1.0.1', '1.0.0')).toBe(1);
    });

    it('correctly detects older version', () => {
      expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
      expect(compareSemver('0.9.9', '1.0.0')).toBe(-1);
    });

    it('correctly handles equal versions', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('v1.0.0', '1.0.0')).toBe(0);
    });
  });

  describe('getAppVersionInfo', () => {
    it('returns default 1.0.0 when running in web test environment', async () => {
      const info = await getAppVersionInfo();
      expect(info.version).toBeDefined();
      expect(info.build).toBeDefined();
    });
  });

  describe('checkForAppUpdates', () => {
    it('detects update available when GitHub releases has higher semver tag', async () => {
      const mockRelease = {
        tag_name: 'v1.1.0',
        name: 'RallyPoint 1.1.0 Release',
        body: '- Added new tournament bracket mode\n- Enhanced 144Hz animations',
        published_at: '2026-11-25T00:00:00Z',
        assets: [
          {
            name: 'RallyPoint-release.apk',
            browser_download_url: 'https://github.com/achudh2005/RallyPoint/releases/download/v1.1.0/RallyPoint-release.apk',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      } as unknown as Response);

      const result = await checkForAppUpdates(true);
      expect(result.hasUpdate).toBe(true);
      expect(result.latestVersion).toBe('v1.1.0');
      expect(result.releaseName).toBe('RallyPoint 1.1.0 Release');
      expect(result.downloadUrl).toBe(
        'https://github.com/achudh2005/RallyPoint/releases/download/v1.1.0/RallyPoint-release.apk'
      );
    });

    it('detects no update when GitHub release matches installed version', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
        name: 'RallyPoint 1.0.0 Release',
        body: 'Initial release',
        assets: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      } as unknown as Response);

      const result = await checkForAppUpdates(true);
      expect(result.hasUpdate).toBe(false);
    });

    it('gracefully handles fetch errors and reports message', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const result = await checkForAppUpdates(true);
      expect(result.hasUpdate).toBe(false);
      expect(result.error).toContain('Network offline');
    });
  });
});
