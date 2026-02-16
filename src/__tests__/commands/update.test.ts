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
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  text: '',
};
jest.mock('ora', () => jest.fn(() => mockSpinner));

// Mock config manager
const mockSkills: InstalledSkill[] = [];

jest.mock('../../config/manager.js', () => ({
  getInstalledSkills: jest.fn(() => mockSkills),
  addInstalledSkill: jest.fn(),
}));

// Mock API client
let isAuthenticatedValue = true;
const mockRemoteSkill = { id: 'skill-123', name: 'Test Skill', slug: 'test-skill', version: '2.0.0' };

jest.mock('../../api/client.js', () => ({
  apiClient: {
    getSkill: jest.fn(() => Promise.resolve(mockRemoteSkill)),
    downloadSkill: jest.fn().mockResolvedValue(undefined),
  },
  isAuthenticated: jest.fn(() => isAuthenticatedValue),
}));

// Mock agents
jest.mock('../../agents/index.js', () => ({
  getAllAgents: jest.fn(() => [
    { id: 'claude-code', name: 'Claude Code' },
  ]),
  getAgent: jest.fn(() => ({
    id: 'claude-code',
    name: 'Claude Code',
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(true),
  })),
}));

// Suppress console
const mockLog = jest.fn();
const originalLog = console.log;
const originalExit = process.exit;

beforeAll(() => {
  console.log = mockLog;
  process.exit = jest.fn() as unknown as typeof process.exit;
});

afterAll(() => {
  console.log = originalLog;
  process.exit = originalExit;
});

beforeEach(() => {
  mockLog.mockClear();
  mockSkills.length = 0;
  isAuthenticatedValue = true;
  mockSpinner.text = '';
  (process.exit as unknown as jest.Mock).mockClear();
});

import { update } from '../../commands/update.js';

describe('update command', () => {
  describe('authentication check', () => {
    it('should exit if not authenticated', async () => {
      isAuthenticatedValue = false;

      await update();

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('no skills installed', () => {
    it('should show message when no skills', async () => {
      await update();

      const calls = mockLog.mock.calls.map((c) => c[0]);
      expect(calls.some((c) => c.includes('No skills installed'))).toBe(true);
    });
  });

  describe('update specific skill', () => {
    it('should update installed skill', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '1.0.0',
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await update('test-skill');

      expect(mockSpinner.succeed).toHaveBeenCalled();
    });
  });

  describe('update all skills', () => {
    it('should check all skills for updates', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '1.0.0',
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await update();

      expect(mockLog).toHaveBeenCalled();
    });

    it('should show up to date when no updates available', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '2.0.0', // Same as remote
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await update();

      expect(mockSpinner.succeed).toHaveBeenCalled();
    });
  });
});
