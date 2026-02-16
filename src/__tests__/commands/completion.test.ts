// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((str: string) => str),
  green: jest.fn((str: string) => str),
  yellow: jest.fn((str: string) => str),
  cyan: jest.fn((str: string) => str),
  gray: jest.fn((str: string) => str),
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
  (process.exit as unknown as jest.Mock).mockClear();
});

import { completion, printCompletionHelp } from '../../commands/completion.js';

describe('completion command', () => {
  describe('bash', () => {
    it('should generate bash completion script', async () => {
      await completion('bash');

      expect(mockLog).toHaveBeenCalled();
      const output = mockLog.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('_skillhub_completion');
      expect(output).toContain('complete -F');
    });
  });

  describe('zsh', () => {
    it('should generate zsh completion script', async () => {
      await completion('zsh');

      expect(mockLog).toHaveBeenCalled();
      const output = mockLog.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('#compdef skillhub');
      expect(output).toContain('_skillhub');
    });
  });

  describe('fish', () => {
    it('should generate fish completion script', async () => {
      await completion('fish');

      expect(mockLog).toHaveBeenCalled();
      const output = mockLog.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('complete -c skillhub');
    });
  });

  describe('invalid shell', () => {
    it('should error for unknown shell', async () => {
      await completion('invalid');

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});

describe('printCompletionHelp', () => {
  it('should print help information', () => {
    printCompletionHelp();

    expect(mockLog).toHaveBeenCalled();
    const output = mockLog.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Shell Completion');
    expect(output).toContain('bash');
    expect(output).toContain('zsh');
    expect(output).toContain('fish');
  });
});
