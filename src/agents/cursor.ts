import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { Agent, ConfigPath, InstallOptions, InstalledSkill } from './types.js';

const home = os.homedir();

const configPaths: ConfigPath[] = [
  { type: 'project', path: '.cursor', filename: 'rules' },
  { type: 'global', path: '.cursor', filename: 'rules' },
];

function getConfigPath(options: InstallOptions): string {
  if (options.global) {
    return path.join(os.homedir(), '.cursor', 'rules');
  }
  const projectRoot = options.projectRoot || process.cwd();
  return path.join(projectRoot, '.cursor', 'rules');
}

function getStartMarker(slug: string): string {
  return `<!-- SKILLHUB:START:${slug} -->`;
}

function getEndMarker(slug: string): string {
  return `<!-- SKILLHUB:END:${slug} -->`;
}

export const cursorAgent: Agent = {
  name: 'Cursor',
  id: 'cursor',
  configPaths,
  format: 'markdown',

  // Symlink-based properties
  skillsDir: '.cursor/skills',
  globalSkillsDir: path.join(home, '.cursor', 'skills'),

  async detectInstalled(): Promise<boolean> {
    return fs.pathExists(path.join(home, '.cursor'));
  },

  async install(skill: InstalledSkill, options: InstallOptions): Promise<string> {
    const configPath = getConfigPath(options);

    // Ensure directory exists
    await fs.ensureDir(path.dirname(configPath));

    // Read existing content or create new
    let content = '';
    if (await fs.pathExists(configPath)) {
      content = await fs.readFile(configPath, 'utf-8');
    }

    const startMarker = getStartMarker(skill.slug);
    const endMarker = getEndMarker(skill.slug);

    // Create skill section
    const skillSection = `\n\n${startMarker}\n# Skill: ${skill.name}\n\n> Installed from SkillHub marketplace\n\n${endMarker}`;

    // Remove old version if exists
    const regex = new RegExp(
      `\\n*${startMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[\\\\s\\\\S]*?${endMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`,
      'g'
    );
    content = content.replace(regex, '');

    // Append new skill
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
      `\\n*${startMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[\\\\s\\\\S]*?${endMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`,
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
