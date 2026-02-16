import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { apiRequest, isAuthenticated } from '../api/client.js';
import type { SkillListResponse } from '../api/types.js';

interface SearchOptions {
  limit?: number;
  category?: string;
  json?: boolean;
}

interface InfoOptions {
  json?: boolean;
}

export async function search(query: string, options: SearchOptions = {}): Promise<void> {
  const spinner = ora('Searching skills...').start();

  const params = new URLSearchParams();
  if (query) {
    params.set('search', query);
  }
  if (options.limit) {
    params.set('limit', String(options.limit));
  }
  if (options.category) {
    params.set('category', options.category);
  }
  // Only show public skills unless authenticated
  if (!isAuthenticated()) {
    params.set('visibility', 'PUBLIC');
  }

  const response = await apiRequest<SkillListResponse>(`/api/skills?${params.toString()}`);

  if (response.error) {
    spinner.fail('Search failed');
    console.log(chalk.red(response.error.error));
    process.exit(1);
  }

  spinner.stop();

  const skills = response.data?.skills || [];
  const total = response.data?.total || 0;

  if (skills.length === 0) {
    console.log(chalk.yellow('No skills found matching your query.'));
    return;
  }

  // JSON output
  if (options.json) {
    console.log(JSON.stringify({ total, skills }, null, 2));
    return;
  }

  console.log(chalk.blue(`\nFound ${total} skill(s)\n`));

  const table = new Table({
    head: [chalk.cyan('Name'), chalk.cyan('Description'), chalk.cyan('Category'), chalk.cyan('Downloads')],
    colWidths: [25, 50, 15, 12],
    wordWrap: true,
  });

  for (const skill of skills) {
    table.push([
      skill.slug,
      skill.description?.substring(0, 47) + (skill.description && skill.description.length > 47 ? '...' : '') || '-',
      skill.category.replace('_', ' '),
      skill.stats?.downloadsCount?.toString() || '0',
    ]);
  }

  console.log(table.toString());
  console.log();
}

export async function info(skillSlug: string, options: InfoOptions = {}): Promise<void> {
  const spinner = ora(`Fetching skill "${skillSlug}"...`).start();

  // First search by slug
  const params = new URLSearchParams();
  params.set('search', skillSlug);
  params.set('limit', '1');

  const response = await apiRequest<SkillListResponse>(`/api/skills?${params.toString()}`);

  if (response.error || !response.data?.skills?.length) {
    spinner.fail('Skill not found');
    console.log(chalk.red(response.error?.error || `Skill "${skillSlug}" not found`));
    process.exit(1);
  }

  const skill = response.data.skills[0];
  spinner.succeed('Skill found');

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(skill, null, 2));
    return;
  }

  console.log();
  console.log(chalk.blue.bold(skill.name));
  console.log(chalk.gray('─'.repeat(50)));
  console.log();

  console.log(chalk.cyan('Slug:'), skill.slug);
  console.log(chalk.cyan('ID:'), skill.id);
  console.log(chalk.cyan('Category:'), skill.category.replace('_', ' '));
  console.log(chalk.cyan('Visibility:'), skill.visibility);

  if (skill.tags.length > 0) {
    console.log(chalk.cyan('Tags:'), skill.tags.join(', '));
  }

  if (skill.author) {
    console.log(chalk.cyan('Author:'), skill.author.name || skill.author.email);
  }

  if (skill.team) {
    console.log(chalk.cyan('Team:'), skill.team.name);
  }

  if (skill.stats) {
    console.log(chalk.cyan('Downloads:'), skill.stats.downloadsCount);
    console.log(chalk.cyan('Views:'), skill.stats.viewsCount);
  }

  if (skill.versions?.length) {
    const latestVersion = skill.versions[0];
    console.log(chalk.cyan('Latest Version:'), latestVersion.version);
    console.log(chalk.cyan('Status:'), latestVersion.status);
  }

  if (skill.description) {
    console.log();
    console.log(chalk.cyan('Description:'));
    console.log(chalk.white(skill.description));
  }

  console.log();
}
