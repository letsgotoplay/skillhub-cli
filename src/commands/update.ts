import chalk from 'chalk';
import ora from 'ora';
import { apiClient, isAuthenticated } from '../api/client.js';
import { getInstalledSkills, addInstalledSkill } from '../config/manager.js';
import { getAgent, getAllAgents } from '../agents/index.js';
import type { InstalledSkill } from '../api/types.js';

interface UpdateOptions {
  global?: boolean;
  agents?: string[];
  all?: boolean;
}

export async function update(skillSlug?: string, options: UpdateOptions = {}): Promise<void> {
  if (!isAuthenticated()) {
    console.log(chalk.red('You must be logged in to update skills.'));
    console.log(chalk.gray('Run `skillhub login` first.'));
    process.exit(1);
  }

  const installedSkills = getInstalledSkills();

  if (installedSkills.length === 0) {
    console.log(chalk.yellow('No skills installed.'));
    console.log(chalk.gray('Use `skillhub add <skill>` to install a skill.'));
    return;
  }

  // If specific skill requested
  if (skillSlug) {
    const skill = installedSkills.find((s) => s.slug === skillSlug);
    if (!skill) {
      console.log(chalk.red(`Skill "${skillSlug}" is not installed.`));
      console.log(chalk.gray('Use `skillhub list` to see installed skills.'));
      process.exit(1);
    }
    await updateSkill(skill, options);
    return;
  }

  // Update all skills
  const spinner = ora('Checking for updates...').start();

  const toUpdate: InstalledSkill[] = [];

  for (const skill of installedSkills) {
    try {
      spinner.text = `Checking ${skill.name}...`;
      const remoteSkill = await apiClient.getSkill(skill.skillId) as {
        version: string;
        name: string;
        slug: string;
      };

      if (skill.version !== remoteSkill.version) {
        toUpdate.push(skill);
      }
    } catch {
      // Skip skills that can't be checked
    }
  }

  if (toUpdate.length === 0) {
    spinner.succeed('All skills are up to date!');
    return;
  }

  spinner.succeed(`Found ${toUpdate.length} update(s)`);
  console.log();

  for (const skill of toUpdate) {
    await updateSkill(skill, options);
  }
}

async function updateSkill(skill: InstalledSkill, options: UpdateOptions): Promise<void> {
  const spinner = ora(`Updating ${skill.name}...`).start();

  try {
    // Get latest version info
    const remoteSkill = await apiClient.getSkill(skill.skillId) as {
      id: string;
      name: string;
      slug: string;
      version: string;
    };

    // Determine which agents to update
    const targetAgentIds = options.all
      ? getAllAgents().map((a) => a.id)
      : options.agents || skill.installedTo;

    // Download new version
    spinner.text = `Downloading ${skill.name} v${remoteSkill.version}...`;
    await apiClient.downloadSkill(skill.skillId, remoteSkill.version);

    // Update each agent
    for (const agentId of targetAgentIds) {
      const agent = getAgent(agentId);
      if (!agent) {
        continue;
      }

      spinner.text = `Updating ${skill.name} for ${agent.name}...`;

      // Uninstall old version
      await agent.uninstall(skill.slug, { global: options.global });

      // Install new version
      const updatedSkill: InstalledSkill = {
        ...skill,
        version: remoteSkill.version,
      };

      await agent.install(updatedSkill, { global: options.global });
    }

    // Update installed record
    addInstalledSkill({
      ...skill,
      version: remoteSkill.version,
    });

    spinner.succeed(`Updated ${skill.name} to v${remoteSkill.version}`);

  } catch (error) {
    spinner.fail(`Failed to update ${skill.name}`);
    if (error instanceof Error) {
      console.log(chalk.red(error.message));
    }
  }
}
