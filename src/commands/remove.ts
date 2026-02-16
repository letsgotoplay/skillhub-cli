import chalk from 'chalk';
import ora from 'ora';
import { confirm, checkbox } from '@inquirer/prompts';
import { removeInstalledSkill, getInstalledSkill } from '../config/manager.js';
import { getAgent } from '../agents/index.js';

interface RemoveOptions {
  global?: boolean;
  agents?: string[];
  all?: boolean;
}

export async function remove(skillSlug: string, options: RemoveOptions = {}): Promise<void> {
  // Check if skill is installed
  const installed = getInstalledSkill(skillSlug);

  if (!installed) {
    console.log(chalk.yellow(`Skill "${skillSlug}" is not installed.`));
    return;
  }

  // Determine which agents to remove from
  let targetAgents = options.agents || [];

  if (options.all) {
    targetAgents = installed.installedTo;
  } else if (targetAgents.length === 0) {
    targetAgents = installed.installedTo;

    if (targetAgents.length > 1) {
      const agentChoices = targetAgents.map((agentId) => {
        const agent = getAgent(agentId);
        return {
          name: `${agent?.name || agentId} (${agentId})`,
          value: agentId,
          checked: true,
        };
      });

      targetAgents = await checkbox({
        message: 'Select agents to remove from:',
        choices: agentChoices,
      });
    }
  }

  if (targetAgents.length === 0) {
    console.log(chalk.yellow('No agents selected.'));
    return;
  }

  // Confirm removal
  const shouldConfirm = await confirm({
    message: `Remove "${skillSlug}" from ${targetAgents.join(', ')}?`,
    default: true,
  });

  if (!shouldConfirm) {
    console.log(chalk.gray('Cancelled.'));
    return;
  }

  const installOptions = { global: options.global };

  // Remove from each agent
  for (const agentId of targetAgents) {
    const agent = getAgent(agentId);
    if (!agent) {
      console.log(chalk.yellow(`Unknown agent: ${agentId}`));
      continue;
    }

    const spinner = ora(`Removing from ${agent.name}...`).start();

    try {
      const removed = await agent.uninstall(skillSlug, installOptions);
      if (removed) {
        spinner.succeed(`Removed from ${agent.name}`);
      } else {
        spinner.warn(`Not found in ${agent.name}`);
      }
    } catch (err) {
      spinner.fail(`Failed to remove from ${agent.name}`);
      console.log(chalk.red(err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Update installed skills manifest
  const remainingAgents = installed.installedTo.filter((a) => !targetAgents.includes(a));

  if (remainingAgents.length === 0) {
    removeInstalledSkill(skillSlug);
    console.log();
    console.log(chalk.green(`Skill "${skillSlug}" removed completely.`));
  } else {
    console.log();
    console.log(chalk.green(`Skill "${skillSlug}" removed from selected agents.`));
    console.log(chalk.gray(`Still installed to: ${remainingAgents.join(', ')}`));
  }
}
