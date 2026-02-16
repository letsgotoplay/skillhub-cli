import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { apiClient, isAuthenticated } from '../api/client.js';

interface UploadOptions {
  name?: string;
  version?: string;
  description?: string;
}

export async function upload(filePath: string, options: UploadOptions): Promise<void> {
  if (!isAuthenticated()) {
    console.log(chalk.red('You must be logged in to upload skills.'));
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
    const fileBuffer = await fs.readFile(resolvedPath);
    const fileName = path.basename(resolvedPath);

    // Create form data
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    formData.append('file', blob, fileName);

    if (options.name) {
      formData.append('name', options.name);
    }
    if (options.version) {
      formData.append('version', options.version);
    }
    if (options.description) {
      formData.append('description', options.description);
    }

    // Upload to API
    spinner.text = 'Uploading to SkillHub...';
    const response = await apiClient.uploadSkill(formData);

    spinner.succeed('Skill uploaded successfully!');

    console.log();
    console.log(chalk.green('Skill Details:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.cyan('ID:')} ${response.id}`);
    console.log(`  ${chalk.cyan('Name:')} ${response.name}`);
    console.log(`  ${chalk.cyan('Version:')} ${response.version}`);
    console.log(`  ${chalk.cyan('Status:')} ${response.status}`);
    if (response.securityScanStatus) {
      console.log(`  ${chalk.cyan('Security Scan:')} ${response.securityScanStatus}`);
    }
    console.log();
    console.log(chalk.gray(`View at: ${apiClient.getApiUrl()}/dashboard/skills/${response.id}`));

  } catch (error) {
    spinner.fail('Upload failed');
    if (error instanceof Error) {
      console.log(chalk.red(error.message));
    }
    process.exit(1);
  }
}
