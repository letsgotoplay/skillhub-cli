import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import yaml from 'js-yaml';
import type { Agent, ConfigPath, InstallOptions, InstalledSkill } from './types.js';

const home = os.homedir();

const configPaths: ConfigPath[] = [
  { type: 'project', path: '.kilo', filename: 'config.yaml' },
  { type: 'global', path: '.kilo', filename: 'config.yaml' },
];

function getConfigPath(options: InstallOptions): string {
  if (options.global) {
    return path.join(os.homedir(), '.kilo', 'config.yaml');
  }
  const projectRoot = options.projectRoot || process.cwd();
  return path.join(projectRoot, '.kilo', 'config.yaml');
}

interface KiloConfig {
  skills?: Record<string, { name: string; source: string }>;
}

export const kiloAgent: Agent = {
  name: 'Kilo',
  id: 'kilo',
  configPaths,
  format: 'yaml',

  // Symlink-based properties
  skillsDir: '.kilocode/skills',
  globalSkillsDir: path.join(home, '.kilocode', 'skills'),

  async detectInstalled(): Promise<boolean> {
    return fs.pathExists(path.join(home, '.kilocode'));
  },

  async install(skill: InstalledSkill, options: InstallOptions): Promise<string> {
    const configPath = getConfigPath(options);

    await fs.ensureDir(path.dirname(configPath));

    let config: KiloConfig = {};
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, 'utf-8');
      try {
        config = yaml.load(content) as KiloConfig || {};
      } catch {
        config = {};
      }
    }

    if (!config.skills) {
      config.skills = {};
    }

    config.skills[skill.slug] = {
      name: skill.name,
      source: 'SkillHub marketplace',
    };

    await fs.writeFile(configPath, yaml.dump(config));

    return configPath;
  },

  async uninstall(skillSlug: string, options: InstallOptions): Promise<boolean> {
    const configPath = getConfigPath(options);

    if (!(await fs.pathExists(configPath))) {
      return false;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    let config: KiloConfig;
    try {
      config = yaml.load(content) as KiloConfig;
    } catch {
      return false;
    }

    if (!config.skills || !config.skills[skillSlug]) {
      return false;
    }

    delete config.skills[skillSlug];
    await fs.writeFile(configPath, yaml.dump(config));

    return true;
  },

  async isInstalled(skillSlug: string, options: InstallOptions): Promise<boolean> {
    const configPath = getConfigPath(options);

    if (!(await fs.pathExists(configPath))) {
      return false;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    try {
      const config = yaml.load(content) as KiloConfig;
      return !!(config.skills && config.skills[skillSlug]);
    } catch {
      return false;
    }
  },
};
