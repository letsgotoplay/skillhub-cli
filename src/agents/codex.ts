import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { Agent, ConfigPath, InstallOptions } from './types.js';
import type { InstalledSkill } from '../api/types.js';

const configPaths: ConfigPath[] = [
  { type: 'project', path: '.', filename: 'CODEX.md' },
  { type: 'global', path: '.codex', filename: 'CODEX.md' },
];

function getConfigPath(options: InstallOptions): string {
  if (options.global) {
    return path.join(os.homedir(), '.codex', 'CODEX.md');
  }
  const projectRoot = options.projectRoot || process.cwd();
  return path.join(projectRoot, 'CODEX.md');
}

function getStartMarker(slug: string): string {
  return `<!-- SKILLHUB:START:${slug} -->`;
}

function getEndMarker(slug: string): string {
  return `<!-- SKILLHUB:END:${slug} -->`;
}

export const codexAgent: Agent = {
  name: 'Codex',
  id: 'codex',
  configPaths,
  format: 'markdown',

  async install(skill: InstalledSkill, options: InstallOptions): Promise<string> {
    const configPath = getConfigPath(options);

    await fs.ensureDir(path.dirname(configPath));

    let content = '';
    if (await fs.pathExists(configPath)) {
      content = await fs.readFile(configPath, 'utf-8');
    }

    const startMarker = getStartMarker(skill.slug);
    const endMarker = getEndMarker(skill.slug);

    const skillSection = `\n\n${startMarker}\n# Skill: ${skill.name}\n\n> Installed from SkillHub marketplace\n\n${endMarker}`;

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
