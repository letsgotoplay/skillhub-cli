import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { apiClient, isAuthenticated } from '../api/client.js';
import { getInstalledSkills } from '../config/manager.js';

interface CheckOptions {
  json?: boolean;
}

export async function check(options: CheckOptions): Promise<void> {
  if (!isAuthenticated()) {
    console.log(chalk.red('You must be logged in to check for updates.'));
    console.log(chalk.gray('Run `skillhub login` first.'));
    process.exit(1);
  }

  const spinner = ora('Checking for updates...').start();

  try {
    const skills = getInstalledSkills();

    if (!skills || skills.length === 0) {
      spinner.info('No skills installed.');
      console.log(chalk.gray('Use `skillhub add <skill>` to install a skill.'));
      return;
    }

    const updates: Array<{
      name: string;
      slug: string;
      installedVersion: string;
      latestVersion: string;
      hasUpdate: boolean;
    }> = [];

    // Check each installed skill for updates
    for (const skill of skills) {
      try {
        spinner.text = `Checking ${skill.name}...`;
        const remoteSkill = await apiClient.getSkill(skill.skillId) as {
          version: string;
          name: string;
          slug: string;
        };

        updates.push({
          name: skill.name,
          slug: skill.slug,
          installedVersion: skill.version,
          latestVersion: remoteSkill.version,
          hasUpdate: skill.version !== remoteSkill.version,
        });
      } catch {
        // Skill might have been deleted
        updates.push({
          name: skill.name,
          slug: skill.slug,
          installedVersion: skill.version,
          latestVersion: 'unknown',
          hasUpdate: false,
        });
      }
    }

    spinner.succeed('Update check complete');

    if (options.json) {
      console.log(JSON.stringify(updates, null, 2));
      return;
    }

    const hasAnyUpdates = updates.some((u) => u.hasUpdate);

    if (!hasAnyUpdates) {
      console.log(chalk.green('\nAll skills are up to date!'));
      return;
    }

    console.log();
    console.log(chalk.yellow('Updates available:'));

    const table = new Table({
      head: [chalk.cyan('Skill'), chalk.cyan('Installed'), chalk.cyan('Latest')],
      style: { head: [] },
    });

    for (const update of updates) {
      if (update.hasUpdate) {
        table.push([
          update.name,
          chalk.gray(update.installedVersion),
          chalk.green(update.latestVersion),
        ]);
      }
    }

    console.log(table.toString());
    console.log();
    console.log(chalk.gray('Run `skillhub update` to update all skills.'));
    console.log(chalk.gray('Run `skillhub update <skill>` to update a specific skill.'));

  } catch (error) {
    spinner.fail('Failed to check for updates');
    if (error instanceof Error) {
      console.log(chalk.red(error.message));
    }
    process.exit(1);
  }
}
