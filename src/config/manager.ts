import Conf from 'conf';
import type { InstalledSkill } from '../api/types.js';

interface SkillHubInstalled {
  version: string;
  skills: InstalledSkill[];
}

const installedConfig = new Conf<SkillHubInstalled>({
  projectName: 'skillhub',
  configName: 'installed',
  defaults: {
    version: '1.0',
    skills: [],
  },
});

export function getInstalledSkills(): InstalledSkill[] {
  return installedConfig.get('skills') || [];
}

export function addInstalledSkill(skill: InstalledSkill): void {
  const skills = getInstalledSkills();
  const existingIndex = skills.findIndex((s) => s.slug === skill.slug);

  if (existingIndex >= 0) {
    skills[existingIndex] = skill;
  } else {
    skills.push(skill);
  }

  installedConfig.set('skills', skills);
}

export function removeInstalledSkill(slug: string): boolean {
  const skills = getInstalledSkills();
  const index = skills.findIndex((s) => s.slug === slug);

  if (index >= 0) {
    skills.splice(index, 1);
    installedConfig.set('skills', skills);
    return true;
  }

  return false;
}

export function getInstalledSkill(slug: string): InstalledSkill | undefined {
  const skills = getInstalledSkills();
  return skills.find((s) => s.slug === slug);
}

export function updateInstalledSkill(slug: string, updates: Partial<InstalledSkill>): boolean {
  const skills = getInstalledSkills();
  const index = skills.findIndex((s) => s.slug === slug);

  if (index >= 0) {
    skills[index] = { ...skills[index], ...updates };
    installedConfig.set('skills', skills);
    return true;
  }

  return false;
}
