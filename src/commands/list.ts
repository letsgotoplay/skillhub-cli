import chalk from 'chalk';
import Table from 'cli-table3';
import { getInstalledSkills } from '../config/manager.js';
import { getAllAgents, getAgent } from '../agents/index.js';

export async function list(options: { json?: boolean; agent?: string } = {}): Promise<void> {
  const skills = getInstalledSkills();

  if (skills.length === 0) {
    console.log(chalk.yellow('No skills installed.'));
    console.log(chalk.gray('Run `skillhub search <query>` to find skills to install.'));
    return;
  }

  if (options.agent) {
    const agent = getAgent(options.agent);
    if (!agent) {
      console.log(chalk.red(`Unknown agent: ${options.agent}`));
      console.log(chalk.gray(`Available agents: ${getAllAgents().map((a) => a.id).join(', ')}`));
      process.exit(1);
    }
  }

  if (options.json) {
    console.log(JSON.stringify(skills, null, 2));
    return;
  }

  console.log(chalk.blue(`\nInstalled Skills (${skills.length})\n`));

  const table = new Table({
    head: [chalk.cyan('Name'), chalk.cyan('Version'), chalk.cyan('Agents'), chalk.cyan('Installed')],
    colWidths: [25, 10, 30, 15],
    wordWrap: true,
  });

  for (const skill of skills) {
    const agentsDisplay = skill.installedTo.join(', ') || '-';
    const installedDate = new Date(skill.installedAt).toLocaleDateString();
    table.push([skill.slug, skill.version, agentsDisplay, installedDate]);
  }

  console.log(table.toString());
  console.log();
}
