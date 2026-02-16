import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

export interface ConfigPath {
  type: 'global' | 'project';
  path: string;
  filename: string;
}

export interface InstallOptions {
  global?: boolean;
  projectRoot?: string;
}

export interface Agent {
  name: string;
  id: string;
  configPaths: ConfigPath[];
  format: 'markdown' | 'yaml' | 'json' | 'custom';

  // New symlink-based properties
  skillsDir: string;           // Project-level skills directory (relative)
  globalSkillsDir: string;     // Global skills directory (absolute)
  detectInstalled(): Promise<boolean>;

  // Legacy methods (keep for backward compatibility)
  install(skill: InstalledSkill, options: InstallOptions): Promise<string>;
  uninstall(skillSlug: string, options: InstallOptions): Promise<boolean>;
  isInstalled(skillSlug: string, options: InstallOptions): Promise<boolean>;
}

export interface InstalledSkill {
  name: string;
  slug: string;
  version: string;
  skillId: string;
  installedAt: string;
  installedTo: string[];
  paths: Record<string, string>;
  // New field for symlink mode
  canonicalPath?: string;
}

export const AGENT_REGISTRY: Map<string, Agent> = new Map();

export function registerAgent(agent: Agent): void {
  AGENT_REGISTRY.set(agent.id, agent);
}

export function getAgent(id: string): Agent | undefined {
  return AGENT_REGISTRY.get(id);
}

export function getAllAgents(): Agent[] {
  return Array.from(AGENT_REGISTRY.values());
}

export function getAgentIds(): string[] {
  return Array.from(AGENT_REGISTRY.keys());
}

/**
 * Detect which agents are installed on the system
 */
export async function detectInstalledAgents(): Promise<string[]> {
  const detected: string[] = [];
  for (const [id, agent] of AGENT_REGISTRY) {
    try {
      if (await agent.detectInstalled()) {
        detected.push(id);
      }
    } catch {
      // Ignore detection errors
    }
  }
  return detected;
}

// Central skills storage directory
const SKILLS_SUBDIR = 'skills';

export function getCentralSkillsDir(global: boolean = true, cwd?: string): string {
  const baseDir = global ? os.homedir() : cwd || process.cwd();
  return path.join(baseDir, '.skillhub', SKILLS_SUBDIR);
}

export function getSkillCanonicalPath(skillSlug: string, global: boolean = true, cwd?: string): string {
  return path.join(getCentralSkillsDir(global, cwd), skillSlug);
}

export function getAgentSkillsDir(agent: Agent, global: boolean, cwd?: string): string {
  if (global) {
    return agent.globalSkillsDir;
  }
  return path.join(cwd || process.cwd(), agent.skillsDir);
}
