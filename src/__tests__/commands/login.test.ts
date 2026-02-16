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
  info: jest.fn().mockReturnThis(),
  text: '',
})));

// Mock @inquirer/prompts
jest.mock('@inquirer/prompts', () => ({
  confirm: jest.fn().mockResolvedValue(false),
  password: jest.fn().mockResolvedValue('sh_test_token'),
}));

// Mock API client
const mockConfig: { apiUrl: string; token?: string; email?: string; userId?: string } = {
  apiUrl: 'http://localhost:3000',
  token: undefined,
  email: undefined,
  userId: undefined,
};
let isAuthenticatedValue = false;

jest.mock('../../api/client.js', () => ({
  setConfig: jest.fn((updates: Record<string, unknown>) => {
    Object.assign(mockConfig, updates);
  }),
  getConfig: jest.fn(() => mockConfig),
  isAuthenticated: jest.fn(() => isAuthenticatedValue),
  apiRequest: jest.fn(() => Promise.resolve({
    data: {
      authenticated: true,
      user: { id: 'user-1', email: 'test@example.com', role: 'user', scopes: [] },
      marketplace: { name: 'SkillHub', version: '1.0.0', minCliVersion: '1.0.0' },
    },
    status: 200,
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
  mockConfig.token = undefined;
  mockConfig.email = undefined;
  mockConfig.userId = undefined;
  isAuthenticatedValue = false;
  (process.exit as unknown as jest.Mock).mockClear();
});

import { login, logout, whoami } from '../../commands/login.js';

describe('login command', () => {
  describe('successful login', () => {
    it('should login with provided token', async () => {
      await login('sh_valid_token');

      expect(mockLog).toHaveBeenCalled();
    });

    it('should set API URL if provided', async () => {
      await login('sh_valid_token', 'https://custom.api.com');

      expect(mockLog).toHaveBeenCalled();
    });
  });

  describe('invalid token', () => {
    it('should reject token without sh_ prefix', async () => {
      await login('invalid_token');

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});

describe('logout command', () => {
  it('should show message when not logged in', async () => {
    isAuthenticatedValue = false;

    await logout();

    const calls = mockLog.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes('not logged in'))).toBe(true);
  });

  it('should logout successfully', async () => {
    isAuthenticatedValue = true;
    mockConfig.token = 'sh_token';
    mockConfig.email = 'test@example.com';

    await logout();

    const calls = mockLog.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes('Logged out successfully'))).toBe(true);
  });
});

describe('whoami command', () => {
  it('should show not logged in message', async () => {
    isAuthenticatedValue = false;

    await whoami();

    const calls = mockLog.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes('not logged in'))).toBe(true);
  });

  it('should show current user info', async () => {
    isAuthenticatedValue = true;
    mockConfig.email = 'test@example.com';
    mockConfig.userId = 'user-1';

    await whoami();

    expect(mockLog).toHaveBeenCalled();
  });
});
