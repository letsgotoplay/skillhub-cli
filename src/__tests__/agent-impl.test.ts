import type { InstalledSkill, InstallOptions } from '../agents/types.js';

// Mock fs-extra with jest.fn inside the factory to avoid hoisting issues
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(''),
  pathExists: jest.fn().mockResolvedValue(true),
}));

// Import after mock
import * as fs from 'fs-extra';
import { claudeCodeAgent } from '../agents/claude-code.js';
import { cursorAgent } from '../agents/cursor.js';

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Claude Code Agent', () => {
  const mockSkill: InstalledSkill = {
    name: 'Test Skill',
    slug: 'test-skill',
    version: '1.0.0',
    skillId: 'skill-123',
    installedAt: new Date().toISOString(),
    installedTo: ['claude-code'],
    paths: {},
  };

  const globalOptions: InstallOptions = { global: true };
  const projectOptions: InstallOptions = { global: false, projectRoot: '/project' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('agent properties', () => {
    it('should have correct id and name', () => {
      expect(claudeCodeAgent.id).toBe('claude-code');
      expect(claudeCodeAgent.name).toBe('Claude Code');
    });

    it('should have markdown format', () => {
      expect(claudeCodeAgent.format).toBe('markdown');
    });

    it('should have skills directories defined', () => {
      expect(claudeCodeAgent.skillsDir).toBe('.claude/skills');
      expect(claudeCodeAgent.globalSkillsDir).toContain('.claude/skills');
    });
  });

  describe('detectInstalled', () => {
    it('should return true when .claude exists', async () => {
      (mockFs.pathExists as jest.Mock).mockResolvedValueOnce(true);
      const result = await claudeCodeAgent.detectInstalled();
      expect(result).toBe(true);
    });

    it('should return false when .claude does not exist', async () => {
      (mockFs.pathExists as jest.Mock).mockResolvedValueOnce(false);
      const result = await claudeCodeAgent.detectInstalled();
      expect(result).toBe(false);
    });
  });

  describe('install', () => {
    it('should create directory and write file for global install', async () => {
      await claudeCodeAgent.install(mockSkill, globalOptions);

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should create directory for project install', async () => {
      await claudeCodeAgent.install(mockSkill, projectOptions);

      expect(mockFs.ensureDir).toHaveBeenCalled();
    });

    it('should read existing content when config file exists', async () => {
      await claudeCodeAgent.install(mockSkill, globalOptions);

      // writeFile should have been called with content containing skill markers
      expect(mockFs.writeFile).toHaveBeenCalled();
      const writeCall = (mockFs.writeFile as unknown as jest.Mock).mock.calls[0];
      expect(writeCall[1]).toContain('SKILLHUB:START:test-skill');
      expect(writeCall[1]).toContain('Test Skill');
    });
  });

  describe('uninstall', () => {
    it('should return false if config file does not exist', async () => {
      (mockFs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);

      const result = await claudeCodeAgent.uninstall('test-skill', globalOptions);

      expect(result).toBe(false);
    });

    it('should call pathExists and readFile', async () => {
      await claudeCodeAgent.uninstall('test-skill', globalOptions);

      // Config file check should happen
      expect(mockFs.pathExists).toHaveBeenCalled();
    });
  });

  describe('isInstalled', () => {
    it('should return false if config file does not exist', async () => {
      (mockFs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);

      const result = await claudeCodeAgent.isInstalled('test-skill', globalOptions);

      expect(result).toBe(false);
    });

    it('should call pathExists to check config', async () => {
      await claudeCodeAgent.isInstalled('test-skill', globalOptions);

      expect(mockFs.pathExists).toHaveBeenCalled();
    });
  });
});

describe('Cursor Agent', () => {
  const mockSkill: InstalledSkill = {
    name: 'Test Skill',
    slug: 'test-skill',
    version: '1.0.0',
    skillId: 'skill-123',
    installedAt: new Date().toISOString(),
    installedTo: ['cursor'],
    paths: {},
  };

  const globalOptions: InstallOptions = { global: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('agent properties', () => {
    it('should have correct id and name', () => {
      expect(cursorAgent.id).toBe('cursor');
      expect(cursorAgent.name).toBe('Cursor');
    });

    it('should have markdown format', () => {
      expect(cursorAgent.format).toBe('markdown');
    });

    it('should have skills directories defined', () => {
      expect(cursorAgent.skillsDir).toBe('.cursor/skills');
      expect(cursorAgent.globalSkillsDir).toContain('.cursor/skills');
    });
  });

  describe('detectInstalled', () => {
    it('should return true when .cursor exists', async () => {
      (mockFs.pathExists as jest.Mock).mockResolvedValueOnce(true);
      const result = await cursorAgent.detectInstalled();
      expect(result).toBe(true);
    });

    it('should return false when .cursor does not exist', async () => {
      (mockFs.pathExists as jest.Mock).mockResolvedValueOnce(false);
      const result = await cursorAgent.detectInstalled();
      expect(result).toBe(false);
    });
  });

  describe('install', () => {
    it('should create .cursor/rules file', async () => {
      await cursorAgent.install(mockSkill, globalOptions);

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('uninstall', () => {
    it('should check if config file exists', async () => {
      await cursorAgent.uninstall('test-skill', globalOptions);

      expect(mockFs.pathExists).toHaveBeenCalled();
    });
  });

  describe('isInstalled', () => {
    it('should check config file existence', async () => {
      await cursorAgent.isInstalled('test-skill', globalOptions);

      expect(mockFs.pathExists).toHaveBeenCalled();
    });
  });
});
