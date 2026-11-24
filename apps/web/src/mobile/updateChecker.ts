/**
 * RallyPoint Mobile In-App Update Checker
 * Checks GitHub Releases API for new APK releases, parses semantic version,
 * and handles update prompts for iQOO Neo 10 / Android users.
 */
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';

const GITHUB_REPO = 'achudh2005/RallyPoint';
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const DEFAULT_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const LAST_CHECK_KEY = 'rallypoint_last_update_check';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl: string;
  publishedAt: string;
  isManual: boolean;
  error?: string;
}

/**
 * Compare two semver strings (e.g., '1.0.1' > '1.0.0').
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1.replace(/^v/, '').split('-')[0] ?? '').trim();
  const clean2 = (v2.replace(/^v/, '').split('-')[0] ?? '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Get the currently installed app version and build info.
 */
export async function getAppVersionInfo(): Promise<{ version: string; build: string }> {
  try {
    const info = await App.getInfo();
    return {
      version: info.version || '1.0.0',
      build: info.build || '1',
    };
  } catch {
    return { version: '1.0.0', build: '1' };
  }
}

/**
 * Check GitHub Releases API for a newer APK release.
 */
export async function checkForAppUpdates(manual = false): Promise<UpdateCheckResult> {
  const current = await getAppVersionInfo();

  if (!manual) {
    try {
      const { value } = await Preferences.get({ key: LAST_CHECK_KEY });
      if (value) {
        const lastChecked = parseInt(value, 10);
        if (Date.now() - lastChecked < CHECK_INTERVAL_MS) {
          // Checked recently, suppress automatic background check
          return {
            hasUpdate: false,
            currentVersion: current.version,
            latestVersion: current.version,
            releaseName: '',
            releaseNotes: '',
            downloadUrl: DEFAULT_DOWNLOAD_URL,
            publishedAt: '',
            isManual: false,
          };
        }
      }
    } catch {
      // Ignore preference errors
    }
  }

  try {
    const res = await fetch(RELEASES_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          hasUpdate: false,
          currentVersion: current.version,
          latestVersion: current.version,
          releaseName: 'No releases published yet',
          releaseNotes: '',
          downloadUrl: DEFAULT_DOWNLOAD_URL,
          publishedAt: '',
          isManual: manual,
        };
      }
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const data = await res.json();
    const latestTag = (data.tag_name || '1.0.0').replace(/^v/, '');
    const cleanTag = data.tag_name || `v${latestTag}`;

    // Look for attached APK in release assets
    let apkDownloadUrl = DEFAULT_DOWNLOAD_URL;
    if (Array.isArray(data.assets)) {
      const releaseApk = data.assets.find(
        (a: { name?: string; browser_download_url?: string }) =>
          a.name && (a.name.endsWith('-release.apk') || a.name.endsWith('.apk'))
      );
      if (releaseApk?.browser_download_url) {
        apkDownloadUrl = releaseApk.browser_download_url;
      }
    }

    // Save timestamp of successful check
    try {
      await Preferences.set({
        key: LAST_CHECK_KEY,
        value: Date.now().toString(),
      });
    } catch {
      // Ignore
    }

    const hasUpdate = compareSemver(latestTag, current.version) > 0;

    return {
      hasUpdate,
      currentVersion: current.version,
      latestVersion: cleanTag,
      releaseName: data.name || cleanTag,
      releaseNotes: data.body || 'Performance improvements and bug fixes.',
      downloadUrl: apkDownloadUrl,
      publishedAt: data.published_at || new Date().toISOString(),
      isManual: manual,
    };
  } catch (err) {
    return {
      hasUpdate: false,
      currentVersion: current.version,
      latestVersion: current.version,
      releaseName: '',
      releaseNotes: '',
      downloadUrl: DEFAULT_DOWNLOAD_URL,
      publishedAt: '',
      isManual: manual,
      error: err instanceof Error ? err.message : 'Failed to check for updates',
    };
  }
}

/**
 * Open download URL in external browser to initiate APK download.
 */
export function openApkDownload(url: string): void {
  window.open(url, '_system');
}
