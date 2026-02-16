import type { InstalledSkill } from '../../api/types.js';

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((str: string) => str),
  green: jest.fn((str: string) => str),
  yellow: jest.fn((str: string) => str),
  blue: jest.fn((str: string) => str),
  cyan: jest.fn((str: string) => str),
  gray: jest.fn((str: string) => str),
}));

// Mock ora
jest.mock('ora', () => jest.fn(() => ({
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  text: '',
})));

// Mock @inquirer/prompts
jest.mock('@inquirer/prompts', () => ({
  confirm: jest.fn().mockResolvedValue(true),
  checkbox: jest.fn().mockResolvedValue(['claude-code']),
}));

// Mock fs-extra
jest.mock('fs-extra', () => ({
  remove: jest.fn().mockResolvedValue(undefined),
}));

// Mock config manager
const mockInstalledSkills: InstalledSkill[] = [
  {
    name: 'Test Skill',
    slug: 'test-skill',
    version: '1.0.0',
    skillId: 'skill-123',
    installedAt: '2024-01-01T00:00:00.000Z',
    installedTo: ['claude-code'],
    paths: {},
  },
];

jest.mock('../../config/manager.js', () => ({
  getInstalledSkill: jest.fn((slug: string) => mockInstalledSkills.find((s) => s.slug === slug)),
  removeInstalledSkill: jest.fn(),
  updateInstalledSkill: jest.fn(),
}));

// Mock agents
jest.mock('../../agents/index.js', () => ({
  getAgent: jest.fn((id: string) => {
    const agents: Record<string, { id: string; name: string }> = {
      'claude-code': { id: 'claude-code', name: 'Claude Code' },
      'cursor': { id: 'cursor', name: 'Cursor' },
    };
    return agents[id];
  }),
}));

// Mock installer
jest.mock('../../lib/installer.js', () => ({
  uninstallSkillForAgent: jest.fn().mockResolvedValue(true),
}));

// Mock agents/types
jest.mock('../../agents/types.js', () => ({
  getCentralSkillsDir: jest.fn(() => '/home/.skillhub/skills'),
}));

// Suppress console
const mockLog = jest.fn();
const originalLog = console.log;

beforeAll(() => {
  console.log = mockLog;
});

afterAll(() => {
  console.log = originalLog;
});

beforeEach(() => {
  mockLog.mockClear();
});

import { remove } from '../../commands/remove.js';

describe('remove command', () => {
  describe('skill not installed', () => {
    it('should show message when skill not found', async () => {
      await remove('nonexistent-skill');

      const calls = mockLog.mock.calls.map((c) => c[0]);
      expect(calls.some((c) => c.includes('not installed'))).toBe(true);
    });
  });

  describe('remove installed skill', () => {
    it('should remove skill from single agent', async () => {
      await remove('test-skill');

      expect(mockLog).toHaveBeenCalled();
    });

    it('should support --all option', async () => {
      await remove('test-skill', { all: true });

      expect(mockLog).toHaveBeenCalled();
    });

    it('should support --agents option', async () => {
      await remove('test-skill', { agents: ['claude-code'] });

      expect(mockLog).toHaveBeenCalled();
    });

    it('should support global option', async () => {
      await remove('test-skill', { global: true });

      expect(mockLog).toHaveBeenCalled();
    });
  });
});
