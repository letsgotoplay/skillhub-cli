import chalk from 'chalk';
import ora from 'ora';
import { confirm, password } from '@inquirer/prompts';
import { setConfig, apiRequest, isAuthenticated, getConfig } from '../api/client.js';
import type { CliVersionResponse } from '../api/types.js';

export async function login(token?: string, apiUrl?: string): Promise<void> {
  console.log(chalk.blue('SkillHub CLI Login\n'));

  // Update API URL if provided
  if (apiUrl) {
    setConfig({ apiUrl });
    console.log(chalk.gray(`Using API URL: ${apiUrl}`));
  }

  // If already authenticated, show info
  if (isAuthenticated()) {
    const cfg = getConfig();
    console.log(chalk.yellow('Already authenticated as:'));
    console.log(chalk.gray(`  Email: ${cfg.email}`));
    console.log(chalk.gray(`  API URL: ${cfg.apiUrl}`));
    console.log();

    const proceed = await confirm({
      message: 'Do you want to login with a different token?',
      default: false,
    });
    if (!proceed) {
      return;
    }
  }

  // Get token if not provided
  let apiToken = token;
  if (!apiToken) {
    apiToken = await password({
      message: 'Enter your API token:',
      mask: '*',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Token is required';
        }
        if (!input.startsWith('sh_')) {
          return 'Invalid token format. Token should start with "sh_"';
        }
        return true;
      },
    });
  }

  // Validate token format
  if (!apiToken || !apiToken.startsWith('sh_')) {
    console.log(chalk.red('Invalid token format. Token should start with "sh_"'));
    process.exit(1);
  }

  const spinner = ora('Validating token...').start();

  // Temporarily set token for validation
  setConfig({ token: apiToken });

  const response = await apiRequest<CliVersionResponse>('/api/cli/version');

  if (response.error || !response.data?.authenticated) {
    spinner.fail('Token validation failed');
    console.log(chalk.red(response.error?.error || 'Invalid token'));
    setConfig({ token: undefined });
    process.exit(1);
  }

  spinner.succeed('Token validated successfully!');

  // Save user info
  const user = response.data.user;
  setConfig({
    token: apiToken,
    userId: user?.id,
    email: user?.email,
  });

  console.log();
  console.log(chalk.green('Logged in successfully!'));
  console.log(chalk.gray(`  Email: ${user?.email}`));
  console.log(chalk.gray(`  Role: ${user?.role}`));
  if (user?.scopes) {
    console.log(chalk.gray(`  Scopes: ${user.scopes.join(', ')}`));
  }
  console.log();
  console.log(chalk.blue('You can now use the SkillHub CLI to manage skills.'));
}

export async function logout(): Promise<void> {
  console.log(chalk.blue('SkillHub CLI Logout\n'));

  if (!isAuthenticated()) {
    console.log(chalk.yellow('You are not logged in.'));
    return;
  }

  setConfig({
    token: undefined,
    userId: undefined,
    email: undefined,
  });

  console.log(chalk.green('Logged out successfully!'));
}

export async function whoami(): Promise<void> {
  if (!isAuthenticated()) {
    console.log(chalk.yellow('You are not logged in.'));
    console.log(chalk.gray('Run `skillhub login` to authenticate.'));
    return;
  }

  const cfg = getConfig();
  console.log(chalk.blue('Current user:'));
  console.log(chalk.gray(`  Email: ${cfg.email}`));
  console.log(chalk.gray(`  User ID: ${cfg.userId}`));
  console.log(chalk.gray(`  API URL: ${cfg.apiUrl}`));
}
