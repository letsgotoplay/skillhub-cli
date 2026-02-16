import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { Agent, ConfigPath, InstallOptions, InstalledSkill } from './types.js';

const home = os.homedir();

const configPaths: ConfigPath[] = [
  { type: 'project', path: '.goose', filename: 'hints' },
  { type: 'global', path: '.goose', filename: 'hints' },
];

function getConfigPath(options: InstallOptions): string {
  if (options.global) {
    return path.join(os.homedir(), '.goose', 'hints');
  }
  const projectRoot = options.projectRoot || process.cwd();
  return path.join(projectRoot, '.goose', 'hints');
}

function getStartMarker(slug: string): string {
  return `# SKILLHUB:START:${slug}`;
}

function getEndMarker(slug: string): string {
  return `# SKILLHUB:END:${slug}`;
}

export const gooseAgent: Agent = {
  name: 'Goose',
  id: 'goose',
  configPaths,
  format: 'custom',

  // Symlink-based properties
  skillsDir: '.goose/skills',
  globalSkillsDir: path.join(home, '.config', 'goose', 'skills'),

  async detectInstalled(): Promise<boolean> {
    return fs.pathExists(path.join(home, '.config', 'goose'));
  },

  async install(skill: InstalledSkill, options: InstallOptions): Promise<string> {
    const configPath = getConfigPath(options);

    await fs.ensureDir(path.dirname(configPath));

    let content = '';
    if (await fs.pathExists(configPath)) {
      content = await fs.readFile(configPath, 'utf-8');
    }

    const startMarker = getStartMarker(skill.slug);
    const endMarker = getEndMarker(skill.slug);

    // Goose uses plain text format
    const skillSection = `\n\n${startMarker}\nSkill: ${skill.name}\nInstalled from SkillHub marketplace\n${endMarker}`;

    const regex = new RegExp(
      `\\n*${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      'g'
    );
    content = content.replace(regex, '');

    await fs.writeFile(configPath, content + skillSection);

    return configPath;
  },

  async uninstall(skillSlug: string, options: InstallOptions): Promise<boolean> {
    const configPath = getConfigPath(options);

    if (!(await fs.pathExists(configPath))) {
      return false;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    const startMarker = getStartMarker(skillSlug);
    const endMarker = getEndMarker(skillSlug);

    const regex = new RegExp(
      `\\n*${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      'g'
    );
    const newContent = content.replace(regex, '');

    if (newContent !== content) {
      await fs.writeFile(configPath, newContent);
      return true;
    }

    return false;
  },

  async isInstalled(skillSlug: string, options: InstallOptions): Promise<boolean> {
    const configPath = getConfigPath(options);

    if (!(await fs.pathExists(configPath))) {
      return false;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    const startMarker = getStartMarker(skillSlug);

    return content.includes(startMarker);
  },
};
