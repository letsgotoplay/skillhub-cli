import type { Skill, InstalledSkill } from '../api/types.js';

// Mock chalk
export const mockChalk = {
  red: jest.fn((str: string) => str),
  green: jest.fn((str: string) => str),
  yellow: jest.fn((str: string) => str),
  blue: jest.fn((str: string) => str),
  cyan: jest.fn((str: string) => str),
  gray: jest.fn((str: string) => str),
  white: jest.fn((str: string) => str),
  bold: jest.fn((str: string) => str),
};

// Mock ora
export const mockOra = jest.fn(() => ({
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  text: '',
}));

// Test fixtures
export const mockSkill: Skill = {
  id: 'skill-123',
  name: 'Test Skill',
  slug: 'test-skill',
  fullSlug: 'user/test-skill',
  description: 'A test skill for testing',
  category: 'DEVELOPMENT',
  tags: ['test', 'example'],
  visibility: 'PUBLIC',
  authorId: 'author-1',
  teamId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  author: {
    id: 'author-1',
    name: 'Test Author',
    email: 'test@example.com',
  },
  team: null,
  stats: {
    downloadsCount: 100,
    viewsCount: 500,
  },
  versions: [
    {
      id: 'version-1',
      version: '1.0.0',
      changelog: 'Initial release',
      status: 'APPROVED',
      specValidationPassed: true,
      aiSecurityAnalyzed: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
};

export const mockInstalledSkill: InstalledSkill = {
  name: 'Test Skill',
  slug: 'test-skill',
  version: '1.0.0',
  skillId: 'skill-123',
  installedAt: '2024-01-01T00:00:00.000Z',
  installedTo: ['claude-code'],
  paths: { 'claude-code': '/path/to/skill' },
};

export const mockSkillListResponse = {
  skills: [mockSkill],
  total: 1,
};

// Setup common mocks
export function setupCommonMocks() {
  jest.mock('chalk', () => mockChalk);
  jest.mock('ora', () => mockOra);
}

// Mock console for testing output
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const mockLog = jest.fn();
  const mockError = jest.fn();

  beforeEach(() => {
    console.log = mockLog;
    console.error = mockError;
    mockLog.mockClear();
    mockError.mockClear();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  return { mockLog, mockError };
}

// Suppress console output during tests
export function suppressConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });
}
