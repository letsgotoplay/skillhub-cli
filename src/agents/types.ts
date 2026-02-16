import type { InstalledSkill } from '../api/types.js';

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

  install(skill: InstalledSkill, options: InstallOptions): Promise<string>;
  uninstall(skillSlug: string, options: InstallOptions): Promise<boolean>;
  isInstalled(skillSlug: string, options: InstallOptions): Promise<boolean>;
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
