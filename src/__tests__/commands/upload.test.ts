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

// Mock fs-extra
jest.mock('fs-extra', () => ({
  pathExists: jest.fn().mockResolvedValue(true),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock-zip-content')),
}));

// Mock API client
let isAuthenticatedValue = true;

jest.mock('../../api/client.js', () => ({
  apiClient: {
    uploadSkill: jest.fn().mockResolvedValue({
      skillId: 'skill-123',
      versionId: 'version-456',
      slug: 'test-skill',
      fullSlug: 'user/test-skill',
      warnings: [],
    }),
    getApiUrl: jest.fn().mockReturnValue('http://localhost:3000'),
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
  isAuthenticatedValue = true;
  (process.exit as unknown as jest.Mock).mockClear();
});

import { upload } from '../../commands/upload.js';

describe('upload command', () => {
  describe('authentication check', () => {
    it('should exit if not authenticated', async () => {
      isAuthenticatedValue = false;

      await upload('test.zip', {});

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('file validation', () => {
    it('should validate zip extension', async () => {
      await upload('test.txt', {});

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('successful upload', () => {
    it('should upload skill package', async () => {
      await upload('test.zip', {});

      expect(mockLog).toHaveBeenCalled();
    });

    it('should upload with changelog', async () => {
      await upload('test.zip', { changelog: 'Updated features' });

      expect(mockLog).toHaveBeenCalled();
    });
  });
});
