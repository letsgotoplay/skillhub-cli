import type { Agent } from '../agents/types.js';

// Mock fs-extra with jest.fn inside the factory to avoid hoisting issues
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
  lstat: jest.fn().mockResolvedValue({ isSymbolicLink: () => false }),
  readlink: jest.fn().mockResolvedValue('/some/target'),
  symlink: jest.fn().mockResolvedValue(undefined),
  copy: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(true),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn().mockResolvedValue([]),
}));

// Mock os.platform
jest.mock('os', () => ({
  platform: jest.fn().mockReturnValue('darwin'),
  homedir: jest.fn().mockReturnValue('/home/user'),
}));

// Import after mocks
import * as fs from 'fs-extra';
import {
  installSkillForAgent,
  installSkillDirForAgent,
  uninstallSkillForAgent,
  isSkillInstalledForAgent,
  createSymlinkToAgent,
} from '../lib/installer.js';
import { AGENT_REGISTRY, registerAgent } from '../agents/types.js';

const mockFs = fs as jest.Mocked<typeof fs>;

const mockAgent: Agent = {
  name: 'Test Agent',
  id: 'test-agent',
  configPaths: [
    { type: 'project', path: '.test', filename: 'config.md' },
  ],
  format: 'markdown',
  skillsDir: '.test/skills',
  globalSkillsDir: '/home/user/.test/skills',
  detectInstalled: jest.fn().mockResolvedValue(true),
  install: jest.fn().mockResolvedValue('/path/to/config'),
  uninstall: jest.fn().mockResolvedValue(true),
  isInstalled: jest.fn().mockResolvedValue(false),
};

describe('Installer', () => {
  beforeEach(() => {
    AGENT_REGISTRY.clear();
    registerAgent(mockAgent);
    jest.clearAllMocks();
  });

  describe('installSkillForAgent', () => {
    it('should return error for unknown agent', async () => {
      const result = await installSkillForAgent('my-skill', 'content', 'unknown-agent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown agent');
    });

    it('should install skill in copy mode', async () => {
      const result = await installSkillForAgent('my-skill', '# My Skill', 'test-agent', {
        mode: 'copy',
        global: true,
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('copy');
      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should install skill in symlink mode', async () => {
      const result = await installSkillForAgent('my-skill', '# My Skill', 'test-agent', {
        mode: 'symlink',
        global: true,
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('symlink');
    });

    it('should handle project-level installation', async () => {
      const result = await installSkillForAgent('my-skill', '# My Skill', 'test-agent', {
        global: false,
        cwd: '/project/path',
        mode: 'copy',
      });

      expect(result.success).toBe(true);
    });

    it('should sanitize skill name', async () => {
      const result = await installSkillForAgent('my/skill:name', '# Content', 'test-agent', {
        mode: 'copy',
        global: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('installSkillDirForAgent', () => {
    it('should return error for unknown agent', async () => {
      const result = await installSkillDirForAgent('my-skill', '/source/dir', 'unknown-agent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown agent');
    });

    it('should install from directory in copy mode', async () => {
      const result = await installSkillDirForAgent('my-skill', '/source/dir', 'test-agent', {
        mode: 'copy',
        global: true,
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('copy');
    });

    it('should install from directory in symlink mode', async () => {
      const result = await installSkillDirForAgent('my-skill', '/source/dir', 'test-agent', {
        mode: 'symlink',
        global: true,
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('symlink');
    });
  });

  describe('uninstallSkillForAgent', () => {
    it('should return false for unknown agent', async () => {
      const result = await uninstallSkillForAgent('my-skill', 'unknown-agent');
      expect(result).toBe(false);
    });

    it('should remove skill directory', async () => {
      const result = await uninstallSkillForAgent('my-skill', 'test-agent', {
        global: true,
      });

      expect(result).toBe(true);
      expect(mockFs.remove).toHaveBeenCalled();
    });

    it('should handle removal errors', async () => {
      (mockFs.remove as unknown as jest.Mock).mockRejectedValueOnce(new Error('Remove failed'));

      const result = await uninstallSkillForAgent('my-skill', 'test-agent', {
        global: true,
      });

      expect(result).toBe(false);
    });
  });

  describe('isSkillInstalledForAgent', () => {
    it('should return false for unknown agent', async () => {
      const result = await isSkillInstalledForAgent('my-skill', 'unknown-agent');
      expect(result).toBe(false);
    });

    it('should check if skill is installed', async () => {
      const result = await isSkillInstalledForAgent('my-skill', 'test-agent', {
        global: true,
      });

      expect(mockFs.access).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when access fails', async () => {
      (mockFs.access as unknown as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const result = await isSkillInstalledForAgent('my-skill', 'test-agent', {
        global: true,
      });

      expect(result).toBe(false);
    });
  });

  describe('createSymlinkToAgent', () => {
    it('should create symlink from central dir to agent dir', async () => {
      const result = await createSymlinkToAgent('/central/skill', '/agent/skill');

      expect(result.success).toBe(true);
      expect(result.canonicalPath).toBe('/central/skill');
    });

    it('should handle symlink creation failure', async () => {
      (mockFs.symlink as unknown as jest.Mock).mockRejectedValueOnce(new Error('Symlink failed'));

      const result = await createSymlinkToAgent('/central/skill', '/agent/skill');

      // Should fall back to copy
      expect(result.success).toBe(true);
      expect(result.symlinkFailed).toBe(true);
    });
  });
});
