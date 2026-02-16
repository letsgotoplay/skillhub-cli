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
  info: jest.fn().mockReturnThis(),
  text: '',
};
jest.mock('ora', () => jest.fn(() => mockSpinner));

// Mock cli-table3
jest.mock('cli-table3', () => {
  return jest.fn().mockImplementation(() => ({
    push: jest.fn(),
    toString: jest.fn().mockReturnValue('mock-table'),
  }));
});

// Mock config manager
const mockSkills: InstalledSkill[] = [];
jest.mock('../../config/manager.js', () => ({
  getInstalledSkills: jest.fn(() => mockSkills),
}));

// Mock API client
let isAuthenticatedValue = true;
const mockRemoteSkill = { version: '2.0.0', name: 'Test Skill', slug: 'test-skill' };

jest.mock('../../api/client.js', () => ({
  apiClient: {
    getSkill: jest.fn(() => Promise.resolve(mockRemoteSkill)),
  },
  isAuthenticated: jest.fn(() => isAuthenticatedValue),
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

import { check } from '../../commands/check.js';

describe('check command', () => {
  describe('authentication check', () => {
    it('should exit if not authenticated', async () => {
      isAuthenticatedValue = false;

      await check({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('no skills installed', () => {
    it('should show message when no skills', async () => {
      await check({});

      expect(mockSpinner.info).toHaveBeenCalled();
    });
  });

  describe('with installed skills', () => {
    it('should check for updates', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '1.0.0',
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await check({});

      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should output JSON with --json flag', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '1.0.0',
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await check({ json: true });

      const jsonCall = mockLog.mock.calls.find((c) => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCall).toBeDefined();
    });

    it('should show up to date message when no updates', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '2.0.0', // Same as remote
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await check({});

      const calls = mockLog.mock.calls.map((c) => c[0]);
      expect(calls.some((c) => c.includes('up to date'))).toBe(true);
    });
  });
});
