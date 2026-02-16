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

// Mock agents
const mockGetAgent = jest.fn((id: string) => {
  const agents: Record<string, { id: string; name: string } | undefined> = {
    'claude-code': { id: 'claude-code', name: 'Claude Code' },
    'cursor': { id: 'cursor', name: 'Cursor' },
  };
  return agents[id];
});

jest.mock('../../agents/index.js', () => ({
  getAllAgents: jest.fn(() => [
    { id: 'claude-code', name: 'Claude Code' },
    { id: 'cursor', name: 'Cursor' },
  ]),
  getAgent: mockGetAgent,
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
  (process.exit as unknown as jest.Mock).mockClear();
});

import { list } from '../../commands/list.js';

describe('list command', () => {
  describe('empty list', () => {
    it('should show message when no skills installed', async () => {
      await list();

      expect(mockLog).toHaveBeenCalled();
      const calls = mockLog.mock.calls.map((c) => c[0]);
      expect(calls.some((c) => c.includes('No skills installed'))).toBe(true);
    });
  });

  describe('with installed skills', () => {
    it('should display installed skills', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '1.0.0',
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await list();

      expect(mockLog).toHaveBeenCalled();
    });

    it('should output JSON format with --json flag', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '1.0.0',
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await list({ json: true });

      // Should call console.log with JSON string
      const jsonCall = mockLog.mock.calls.find((c) => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCall).toBeDefined();

      const parsed = JSON.parse(jsonCall![0]);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].slug).toBe('test-skill');
    });
  });

  describe('with agent filter', () => {
    it('should accept valid agent', async () => {
      mockSkills.push({
        name: 'Test Skill',
        slug: 'test-skill',
        version: '1.0.0',
        skillId: 'skill-123',
        installedAt: '2024-01-01T00:00:00.000Z',
        installedTo: ['claude-code'],
        paths: {},
      });

      await list({ agent: 'claude-code' });

      // Should not exit with error
      expect(process.exit).not.toHaveBeenCalled();
    });
  });
});
