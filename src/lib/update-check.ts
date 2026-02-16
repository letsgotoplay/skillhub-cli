import { request } from 'undici';
import Conf from 'conf';
import chalk from 'chalk';
import semver from 'semver';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

interface UpdateCheckConfig {
  lastCheck: number;
  latestVersion: string;
}

const updateConfig = new Conf<UpdateCheckConfig>({
  projectName: 'skillhub',
  configName: 'update-check',
  defaults: {
    lastCheck: 0,
    latestVersion: '0.0.0',
  },
});

function getCurrentVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '1.0.0';
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await request('https://registry.npmjs.org/@skillhub/cli/latest', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.statusCode !== 200) {
      return null;
    }

    const body = await response.body.json() as { version?: string };
    return body.version || null;
  } catch {
    return null;
  }
}

export async function checkForUpdates(): Promise<{ hasUpdate: boolean; current: string; latest: string } | null> {
  const now = Date.now();
  const lastCheck = updateConfig.get('lastCheck');
  const cachedLatest = updateConfig.get('latestVersion');
  const currentVersion = getCurrentVersion();

  // Check if we need to fetch new version info
  if (now - lastCheck > UPDATE_CHECK_INTERVAL) {
    const latestVersion = await fetchLatestVersion();

    if (latestVersion) {
      updateConfig.set('lastCheck', now);
      updateConfig.set('latestVersion', latestVersion);

      return {
        hasUpdate: semver.gt(latestVersion, currentVersion),
        current: currentVersion,
        latest: latestVersion,
      };
    }
  }

  // Use cached version
  if (cachedLatest && cachedLatest !== '0.0.0') {
    return {
      hasUpdate: semver.gt(cachedLatest, currentVersion),
      current: currentVersion,
      latest: cachedLatest,
    };
  }

  return null;
}

export function showUpdateNotification(updateInfo: { current: string; latest: string }): void {
  console.log();
  console.log(chalk.yellow(`┌──────────────────────────────────────────────────────┐`));
  console.log(chalk.yellow(`│`) + chalk.bold('  Update available!') + chalk.gray(` ${updateInfo.current} → ${updateInfo.latest}`).padEnd(52) + chalk.yellow('│'));
  console.log(chalk.yellow(`│`) + '  Run ' + chalk.cyan('npm update -g @skillhub/cli') + ' to update.'.padEnd(52) + chalk.yellow('│'));
  console.log(chalk.yellow(`└──────────────────────────────────────────────────────┘`));
  console.log();
}
