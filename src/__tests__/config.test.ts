import {
  getInstalledSkills,
  addInstalledSkill,
  removeInstalledSkill,
  getInstalledSkill,
  updateInstalledSkill,
} from '../config/manager.js';
import type { InstalledSkill } from '../api/types.js';

// Mock conf module
jest.mock('conf', () => {
  const store: { skills: InstalledSkill[] } = { skills: [] };
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => store[key as keyof typeof store]),
    set: jest.fn((key: string, value: unknown) => {
      store[key as keyof typeof store] = value as never;
    }),
  }));
});

describe('Config Manager', () => {
  const mockSkill: InstalledSkill = {
    name: 'Test Skill',
    slug: 'test-skill',
    version: '1.0.0',
    skillId: 'skill-123',
    installedAt: new Date().toISOString(),
    installedTo: ['claude-code'],
    paths: {},
  };

  describe('addInstalledSkill', () => {
    it('should add a new skill', () => {
      addInstalledSkill(mockSkill);
      const skills = getInstalledSkills();
      expect(skills.find((s) => s.slug === 'test-skill')).toBeDefined();
    });

    it('should update existing skill with same slug', () => {
      addInstalledSkill(mockSkill);
      const updatedSkill = { ...mockSkill, version: '2.0.0' };
      addInstalledSkill(updatedSkill);
      const skills = getInstalledSkills();
      const skill = skills.find((s) => s.slug === 'test-skill');
      expect(skill?.version).toBe('2.0.0');
    });
  });

  describe('removeInstalledSkill', () => {
    it('should remove skill by slug', () => {
      addInstalledSkill(mockSkill);
      const result = removeInstalledSkill('test-skill');
      expect(result).toBe(true);
    });

    it('should return false if skill not found', () => {
      const result = removeInstalledSkill('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getInstalledSkill', () => {
    it('should return skill by slug', () => {
      addInstalledSkill(mockSkill);
      const skill = getInstalledSkill('test-skill');
      expect(skill).toBeDefined();
      expect(skill?.name).toBe('Test Skill');
    });

    it('should return undefined for unknown slug', () => {
      const skill = getInstalledSkill('unknown');
      expect(skill).toBeUndefined();
    });
  });

  describe('updateInstalledSkill', () => {
    it('should update existing skill', () => {
      addInstalledSkill(mockSkill);
      const result = updateInstalledSkill('test-skill', { version: '3.0.0', name: 'Updated Skill' });
      expect(result).toBe(true);
      const skill = getInstalledSkill('test-skill');
      expect(skill?.version).toBe('3.0.0');
      expect(skill?.name).toBe('Updated Skill');
    });

    it('should return false if skill not found', () => {
      const result = updateInstalledSkill('non-existent', { version: '2.0.0' });
      expect(result).toBe(false);
    });
  });
});
