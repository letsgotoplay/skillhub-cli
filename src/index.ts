#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { login, logout, whoami } from './commands/login.js';
import { search, info } from './commands/search.js';
import { list } from './commands/list.js';
import { add } from './commands/add.js';
import { remove } from './commands/remove.js';
import { upload } from './commands/upload.js';
import { check } from './commands/check.js';
import { update } from './commands/update.js';
import { completion } from './commands/completion.js';
import { isAuthenticated } from './api/client.js';
import { checkForUpdates, showUpdateNotification } from './lib/update-check.js';

const program = new Command();

program
  .name('skillhub')
  .description('CLI tool for SkillHub enterprise skill marketplace')
  .version('1.0.0');

// Check for updates in background
checkForUpdates().then((updateInfo) => {
  if (updateInfo?.hasUpdate) {
    showUpdateNotification(updateInfo);
  }
}).catch(() => {
  // Silently ignore update check errors
});

// Login command
program
  .command('login')
  .description('Authenticate with SkillHub marketplace')
  .argument('[token]', 'API token (optional, will prompt if not provided)')
  .option('-u, --url <url>', 'SkillHub API URL')
  .action(async (token: string | undefined, options: { url?: string }) => {
    await login(token, options.url);
  });

// Logout command
program
  .command('logout')
  .description('Remove stored authentication')
  .action(async () => {
    await logout();
  });

// Whoami command
program
  .command('whoami')
  .description('Show current authenticated user')
  .action(async () => {
    await whoami();
  });

// Search command
program
  .command('search <query>')
  .description('Search for skills in the marketplace')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .option('-c, --category <category>', 'Filter by category')
  .option('-j, --json', 'Output as JSON')
  .action(async (query: string, options: { limit: string; category?: string; json?: boolean }) => {
    await search(query, {
      limit: parseInt(options.limit),
      category: options.category,
      json: options.json,
    });
  });

// Info command
program
  .command('info <skill>')
  .description('Get detailed information about a skill')
  .option('-j, --json', 'Output as JSON')
  .action(async (skillSlug: string, options: { json?: boolean }) => {
    await info(skillSlug, options);
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List installed skills')
  .option('-j, --json', 'Output as JSON')
  .option('-a, --agent <agent>', 'Filter by agent')
  .action(async (options: { json?: boolean; agent?: string }) => {
    await list(options);
  });

// Add command
program
  .command('add <skill>')
  .description('Install a skill to your agents')
  .option('-a, --agents <agents>', 'Target agents (comma-separated)')
  .option('-g, --global', 'Install globally to user directory')
  .option('-v, --version <version>', 'Specific version to install')
  .option('--all', 'Install to all available agents')
  .action(async (skillSlug: string, options: { agents?: string; global?: boolean; version?: string; all?: boolean }) => {
    const agents = options.agents ? options.agents.split(',') : undefined;
    await add(skillSlug, {
      agents,
      global: options.global,
      version: options.version,
      all: options.all,
    });
  });

// Remove command
program
  .command('remove [skill]')
  .alias('rm')
  .description('Remove an installed skill')
  .option('-g, --global', 'Remove from global scope')
  .option('-a, --agents <agents>', 'Remove from specific agents (comma-separated)')
  .option('--all', 'Remove from all agents')
  .action(async (skillSlug: string | undefined, options: { global?: boolean; agents?: string; all?: boolean }) => {
    if (!skillSlug) {
      console.log(chalk.yellow('Please specify a skill to remove.'));
      console.log(chalk.gray('Usage: skillhub remove <skill-name>'));
      return;
    }
    const agents = options.agents ? options.agents.split(',') : undefined;
    await remove(skillSlug, {
      global: options.global,
      agents,
      all: options.all,
    });
  });

// Upload command
program
  .command('upload <file>')
  .description('Upload a skill package to the marketplace')
  .option('-n, --name <name>', 'Skill name')
  .option('-v, --version <version>', 'Skill version')
  .option('-d, --description <description>', 'Skill description')
  .action(async (filePath: string, options: { name?: string; version?: string; description?: string }) => {
    await upload(filePath, options);
  });

// Check command
program
  .command('check')
  .description('Check for available updates')
  .option('-j, --json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    await check(options);
  });

// Update command
program
  .command('update [skill]')
  .description('Update installed skills')
  .option('-g, --global', 'Update global installation')
  .option('-a, --agents <agents>', 'Update for specific agents (comma-separated)')
  .option('--all', 'Update for all agents')
  .action(async (skillSlug: string | undefined, options: { global?: boolean; agents?: string; all?: boolean }) => {
    const agents = options.agents ? options.agents.split(',') : undefined;
    await update(skillSlug, {
      global: options.global,
      agents,
      all: options.all,
    });
  });

// Completion command
program
  .command('completion <shell>')
  .description('Generate shell completion script (bash, zsh, fish)')
  .action(async (shell: string) => {
    await completion(shell);
  });

// Add error handling for unauthenticated commands
program.hook('preAction', async (_thisCommand, actionCommand) => {
  const commandsRequiringAuth = ['add', 'remove', 'upload', 'check', 'update'];
  const commandName = actionCommand.name();

  if (commandsRequiringAuth.includes(commandName) && !isAuthenticated()) {
    console.log(chalk.red('You must be logged in to use this command.'));
    console.log(chalk.gray('Run `skillhub login` first.'));
    process.exit(1);
  }
});

// Parse arguments
program.parse();
