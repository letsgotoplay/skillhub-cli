import chalk from 'chalk';
import ora from 'ora';
import { confirm, checkbox } from '@inquirer/prompts';
import { apiRequest, isAuthenticated, downloadFile, getConfig } from '../api/client.js';
import { addInstalledSkill, getInstalledSkill } from '../config/manager.js';
import { getAllAgents, getAgent } from '../agents/index.js';
import type { SkillListResponse, InstalledSkill } from '../api/types.js';

interface AddOptions {
  agents?: string[];
  global?: boolean;
  version?: string;
  all?: boolean;
}

async function downloadSkill(skillId: string, version?: string): Promise<{ buffer: Buffer; version: string }> {
  const cfg = getConfig();
  let url = `${cfg.apiUrl}/api/skills/${skillId}/download?type=full`;
  if (version) {
    url += `&version=${version}`;
  }

  const buffer = await downloadFile(url);

  return { buffer, version: version || 'latest' };
}

export async function add(skillSlug: string, options: AddOptions = {}): Promise<void> {
  // Check authentication
  if (!isAuthenticated()) {
    console.log(chalk.red('You must be logged in to install skills.'));
    console.log(chalk.gray('Run `skillhub login` first.'));
    process.exit(1);
  }

  // Find skill
  const spinner = ora(`Finding skill "${skillSlug}"...`).start();

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
  spinner.succeed(`Found skill: ${skill.name}`);

  // Check if already installed
  const existing = getInstalledSkill(skill.slug);
  if (existing) {
    console.log(chalk.yellow(`Skill "${skill.slug}" is already installed.`));
    const shouldUpdate = await confirm({
      message: 'Do you want to reinstall/update it?',
      default: false,
    });
    if (!shouldUpdate) {
      return;
    }
  }

  // Determine which agents to install to
  let targetAgents = options.agents || [];

  if (options.all) {
    targetAgents = getAllAgents().map((a) => a.id);
  } else if (targetAgents.length === 0) {
    const agentChoices = getAllAgents().map((agent) => ({
      name: `${agent.name} (${agent.id})`,
      value: agent.id,
      checked: agent.id === 'claude-code',
    }));

    targetAgents = await checkbox({
      message: 'Select agents to install to:',
      choices: agentChoices,
      required: true,
    });
  }

  // Validate agents
  for (const agentId of targetAgents) {
    if (!getAgent(agentId)) {
      console.log(chalk.red(`Unknown agent: ${agentId}`));
      console.log(chalk.gray(`Available agents: ${getAllAgents().map((a) => a.id).join(', ')}`));
      process.exit(1);
    }
  }

  // Download skill
  spinner.start('Downloading skill package...');
  const downloadResult = await downloadSkill(skill.id, options.version);
  spinner.succeed('Skill package downloaded');

  // Install to each agent
  const installedPaths: Record<string, string> = {};
  const installOptions = { global: options.global };

  for (const agentId of targetAgents) {
    const agent = getAgent(agentId);
    if (!agent) continue;

    spinner.start(`Installing to ${agent.name}...`);

    const installedSkill: InstalledSkill = {
      name: skill.name,
      slug: skill.slug,
      version: skill.versions?.[0]?.version || downloadResult.version,
      skillId: skill.id,
      installedAt: new Date().toISOString(),
      installedTo: [agentId],
      paths: {},
    };

    try {
      const configPath = await agent.install(installedSkill, installOptions);
      installedPaths[agentId] = configPath;
      spinner.succeed(`Installed to ${agent.name}`);
    } catch (err) {
      spinner.fail(`Failed to install to ${agent.name}`);
      console.log(chalk.red(err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Update installed skills manifest
  const finalInstalledSkill: InstalledSkill = {
    name: skill.name,
    slug: skill.slug,
    version: skill.versions?.[0]?.version || downloadResult.version,
    skillId: skill.id,
    installedAt: new Date().toISOString(),
    installedTo: targetAgents,
    paths: installedPaths,
  };

  addInstalledSkill(finalInstalledSkill);

  console.log();
  console.log(chalk.green('Skill installed successfully!'));
  console.log();
  console.log(chalk.gray('Installed to:'));
  for (const [agentId, configPath] of Object.entries(installedPaths)) {
    console.log(chalk.gray(`  ${agentId}: ${configPath}`));
  }
}
