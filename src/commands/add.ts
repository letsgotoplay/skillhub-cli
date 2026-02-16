import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs-extra';
import JSZip from 'jszip';
import { confirm, checkbox } from '@inquirer/prompts';
import { apiRequest, isAuthenticated, downloadFile, getConfig } from '../api/client.js';
import { addInstalledSkill, getInstalledSkill } from '../config/manager.js';
import { getAllAgents, getAgent, detectInstalledAgents } from '../agents/index.js';
import { createSymlinkToAgent } from '../lib/installer.js';
import { getCentralSkillsDir, getAgentSkillsDir } from '../agents/types.js';
import type { SkillListResponse, InstalledSkill } from '../api/types.js';
import type { InstalledSkill as LocalInstalledSkill } from '../agents/types.js';

interface AddOptions {
  agents?: string[];
  global?: boolean;
  version?: string;
  all?: boolean;
}

async function downloadAndExtractSkill(
  skillIdentifier: string,  // Can be fullSlug (alice/pdf-reader) or uuid
  targetDir: string,
  version?: string
): Promise<{ version: string }> {
  const cfg = getConfig();
  // New API route: /api/download/{fullSlug or uuid}
  let url = `${cfg.apiUrl}/api/download/${encodeURIComponent(skillIdentifier)}`;
  if (version) {
    url += `?version=${version}`;
  }

  // Download zip buffer
  const buffer = await downloadFile(url);

  // Extract zip to target directory
  const zip = await JSZip.loadAsync(buffer);

  // Clear target directory
  await fs.emptyDir(targetDir);

  // Extract all files
  const extractPromises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) {
      extractPromises.push(
        fs.ensureDir(path.join(targetDir, relativePath))
      );
    } else {
      extractPromises.push(
        zipEntry.async('nodebuffer').then(async (content) => {
          const fullPath = path.join(targetDir, relativePath);
          await fs.outputFile(fullPath, content);
        })
      );
    }
  });

  await Promise.all(extractPromises);

  return { version: version || 'latest' };
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

  // Get the full identifier (fullSlug preferred, fallback to id)
  const skillIdentifier = skill.fullSlug || skill.id;
  const displaySlug = skill.fullSlug || skill.slug;
  // Use skill.name as folder name (must match SKILL.md name field for coding tools to load it)
  const skillName = skill.name;
  const dirName = skillName;

  spinner.succeed(`Found skill: ${skill.name} (${displaySlug})`);

  // Check if already installed
  const existing = getInstalledSkill(displaySlug);
  if (existing) {
    console.log(chalk.yellow(`Skill "${displaySlug}" is already installed.`));
    const shouldUpdate = await confirm({
      message: 'Do you want to reinstall/update it?',
      default: false,
    });
    if (!shouldUpdate) {
      return;
    }
  }

  // Detect installed agents on the system
  const detectedAgents = await detectInstalledAgents();

  // Determine which agents to install to
  let targetAgents = options.agents || [];

  if (options.all) {
    targetAgents = getAllAgents().map((a) => a.id);
  } else if (targetAgents.length === 0) {
    // Filter to only show detected agents, or all if none detected
    const availableAgents = detectedAgents.length > 0
      ? getAllAgents().filter((a) => detectedAgents.includes(a.id))
      : getAllAgents();

    const agentChoices = availableAgents.map((agent) => ({
      name: `${agent.name} (${agent.id})${detectedAgents.includes(agent.id) ? ' [detected]' : ''}`,
      value: agent.id,
      checked: agent.id === 'claude-code',
    }));

    // Add a note if some agents were filtered
    if (detectedAgents.length > 0 && detectedAgents.length < getAllAgents().length) {
      console.log(chalk.gray(`Detected ${detectedAgents.length} AI Coding Tools on your system.`));
    }

    targetAgents = await checkbox({
      message: 'Select AI Coding Tools to install to:',
      choices: agentChoices,
      required: true,
    });
  }

  // Validate agents
  for (const agentId of targetAgents) {
    if (!getAgent(agentId)) {
      console.log(chalk.red(`Unknown AI Coding Tool: ${agentId}`));
      console.log(chalk.gray(`Available tools: ${getAllAgents().map((a) => a.id).join(', ')}`));
      process.exit(1);
    }
  }

  // Download and extract to central location
  const isGlobal = options.global ?? false;
  const centralDir = getCentralSkillsDir(isGlobal);
  const skillDir = path.join(centralDir, dirName);

  spinner.start('Downloading and extracting skill package...');
  const downloadResult = await downloadAndExtractSkill(skillIdentifier, skillDir, options.version);
  spinner.succeed('Skill package downloaded and extracted');

  // Create symlinks to each agent's skills directory
  const installedPaths: Record<string, string> = {};

  for (const agentId of targetAgents) {
    const agent = getAgent(agentId);
    if (!agent) continue;

    spinner.start(`Linking to ${agent.name}...`);

    try {
      const agentSkillsDir = getAgentSkillsDir(agent, isGlobal);
      const agentSkillPath = path.join(agentSkillsDir, dirName);
      const result = await createSymlinkToAgent(skillDir, agentSkillPath);

      if (result.success) {
        installedPaths[agentId] = agentSkillPath;
        if (result.symlinkFailed) {
          spinner.succeed(`Installed to ${agent.name} (copied)`);
        } else {
          spinner.succeed(`Linked to ${agent.name}`);
        }
      } else {
        spinner.fail(`Failed to link to ${agent.name}`);
        console.log(chalk.red(result.error || 'Unknown error'));
      }
    } catch (err) {
      spinner.fail(`Failed to link to ${agent.name}`);
      console.log(chalk.red(err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Update installed skills manifest
  const finalInstalledSkill: InstalledSkill & LocalInstalledSkill = {
    name: skill.name,
    slug: displaySlug,  // Use fullSlug for unique identification
    version: skill.versions?.[0]?.version || downloadResult.version,
    skillId: skill.id,
    installedAt: new Date().toISOString(),
    installedTo: targetAgents,
    paths: installedPaths,
    canonicalPath: skillDir,
  };

  addInstalledSkill(finalInstalledSkill);

  console.log();
  console.log(chalk.green('Skill installed successfully!'));
  console.log();
  console.log(chalk.gray('Central location:'));
  console.log(chalk.gray(`  ${skillDir}`));
  console.log();
  console.log(chalk.gray('Linked to:'));
  for (const [agentId, agentPath] of Object.entries(installedPaths)) {
    const agent = getAgent(agentId);
    console.log(chalk.gray(`  ${agent?.name || agentId}: ${agentPath}`));
  }
}
