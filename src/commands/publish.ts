import * as fs from 'fs-extra';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { apiClient, isAuthenticated } from '../api/client.js';

interface PublishOptions {
  changelog?: string;
}

export async function publish(skillId: string, filePath: string, options: PublishOptions): Promise<void> {
  if (!isAuthenticated()) {
    console.log(chalk.red('You must be logged in to publish skills.'));
    console.log(chalk.gray('Run `skillhub login` first.'));
    process.exit(1);
  }

  const spinner = ora('Preparing skill package...').start();

  try {
    // Resolve file path
    const resolvedPath = path.resolve(filePath);

    // Check if file exists
    if (!(await fs.pathExists(resolvedPath))) {
      spinner.fail(`File not found: ${resolvedPath}`);
      process.exit(1);
    }

    // Check if it's a zip file
    if (!resolvedPath.endsWith('.zip')) {
      spinner.fail('File must be a .zip archive');
      process.exit(1);
    }

    // Read file
    spinner.text = 'Reading skill package...';
    const fileBuffer = await fsPromises.readFile(resolvedPath);
    const fileName = path.basename(resolvedPath);

    // Create form data
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    formData.append('file', blob, fileName);

    if (options.changelog) {
      formData.append('changelog', options.changelog);
    }

    // Upload to API
    spinner.text = `Publishing new version for ${skillId}...`;
    const response = await apiClient.uploadSkillVersion(skillId, formData);

    spinner.succeed('New version published successfully!');

    console.log();
    console.log(chalk.green('Version Details:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.cyan('Skill ID:')} ${response.skillId}`);
    console.log(`  ${chalk.cyan('Version ID:')} ${response.versionId}`);
    console.log(`  ${chalk.cyan('Slug:')} ${response.slug}`);
    console.log(`  ${chalk.cyan('Full Slug:')} ${response.fullSlug}`);

    if (response.warnings && response.warnings.length > 0) {
      console.log();
      console.log(chalk.yellow('Warnings:'));
      for (const warning of response.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    }

    console.log();
    console.log(chalk.gray(`View at: ${apiClient.getApiUrl()}/skills/${response.fullSlug}`));

  } catch (error) {
    spinner.fail('Publish failed');
    if (error instanceof Error) {
      console.log(chalk.red(error.message));
    }
    process.exit(1);
  }
}
