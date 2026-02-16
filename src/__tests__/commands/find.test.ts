// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((str: string) => str),
  green: jest.fn((str: string) => str),
  yellow: jest.fn((str: string) => str),
  cyan: jest.fn((str: string) => str),
  gray: jest.fn((str: string) => str),
}));

// Mock @inquirer/prompts
const mockSearch = jest.fn();
jest.mock('@inquirer/prompts', () => ({
  search: mockSearch,
}));

// Mock API client
jest.mock('../../api/client.js', () => ({
  apiClient: {
    getSkills: jest.fn(),
  },
}));

// Mock add command
jest.mock('../../commands/add.js', () => ({
  add: jest.fn(),
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
  mockSearch.mockReset();
});

import { find } from '../../commands/find.js';

describe('find command', () => {
  it('should display search prompt', async () => {
    mockSearch.mockResolvedValueOnce(null);

    await find();

    expect(mockLog).toHaveBeenCalled();
    const calls = mockLog.mock.calls.map((c) => c[0]).filter(Boolean);
    expect(calls.some((c) => c && c.includes('Search for skills'))).toBe(true);
  });

  it('should show message when no skill selected', async () => {
    mockSearch.mockResolvedValueOnce(null);

    await find();

    const calls = mockLog.mock.calls.map((c) => c[0]).filter(Boolean);
    expect(calls.some((c) => c && c.includes('No skill selected'))).toBe(true);
  });

  it('should handle cancel', async () => {
    mockSearch.mockRejectedValueOnce(new Error('User cancelled'));

    await find();

    const calls = mockLog.mock.calls.map((c) => c[0]).filter(Boolean);
    expect(calls.some((c) => c && c.includes('Search cancelled'))).toBe(true);
  });
});
