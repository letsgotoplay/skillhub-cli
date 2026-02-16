import {
  AGENT_REGISTRY,
  registerAgent,
  getAgent,
  getAllAgents,
  getAgentIds,
  detectInstalledAgents,
  getCentralSkillsDir,
  getSkillCanonicalPath,
  getAgentSkillsDir,
} from '../agents/types.js';
import type { Agent } from '../agents/types.js';

describe('Agent Registry', () => {
  const mockAgent: Agent = {
    name: 'Test Agent',
    id: 'test-agent',
    configPaths: [
      { type: 'project', path: '.test', filename: 'config.md' },
    ],
    format: 'markdown',
    skillsDir: '.test/skills',
    globalSkillsDir: '/home/user/.test/skills',
    detectInstalled: jest.fn(),
    install: jest.fn(),
    uninstall: jest.fn(),
    isInstalled: jest.fn(),
  };

  beforeEach(() => {
    // Clear registry before each test
    AGENT_REGISTRY.clear();
  });

  describe('registerAgent', () => {
    it('should register an agent', () => {
      registerAgent(mockAgent);
      expect(AGENT_REGISTRY.has('test-agent')).toBe(true);
    });

    it('should overwrite existing agent with same id', () => {
      registerAgent(mockAgent);
      const updatedAgent = { ...mockAgent, name: 'Updated Agent' };
      registerAgent(updatedAgent);
      expect(AGENT_REGISTRY.get('test-agent')?.name).toBe('Updated Agent');
    });
  });

  describe('getAgent', () => {
    it('should return agent by id', () => {
      registerAgent(mockAgent);
      expect(getAgent('test-agent')).toBe(mockAgent);
    });

    it('should return undefined for unknown id', () => {
      expect(getAgent('unknown')).toBeUndefined();
    });
  });

  describe('getAllAgents', () => {
    it('should return all registered agents', () => {
      registerAgent(mockAgent);
      const anotherAgent = { ...mockAgent, id: 'another-agent', name: 'Another' };
      registerAgent(anotherAgent);
      expect(getAllAgents()).toHaveLength(2);
    });

    it('should return empty array when no agents registered', () => {
      expect(getAllAgents()).toEqual([]);
    });
  });

  describe('getAgentIds', () => {
    it('should return all agent ids', () => {
      registerAgent(mockAgent);
      expect(getAgentIds()).toContain('test-agent');
    });
  });

  describe('detectInstalledAgents', () => {
    it('should return detected agents', async () => {
      const detectedAgent: Agent = {
        ...mockAgent,
        id: 'detected-agent',
        detectInstalled: jest.fn().mockResolvedValue(true),
      };
      const notDetectedAgent: Agent = {
        ...mockAgent,
        id: 'not-detected-agent',
        detectInstalled: jest.fn().mockResolvedValue(false),
      };

      registerAgent(detectedAgent);
      registerAgent(notDetectedAgent);

      const result = await detectInstalledAgents();
      expect(result).toContain('detected-agent');
      expect(result).not.toContain('not-detected-agent');
    });

    it('should handle detection errors', async () => {
      const errorAgent: Agent = {
        ...mockAgent,
        id: 'error-agent',
        detectInstalled: jest.fn().mockRejectedValue(new Error('Detection failed')),
      };

      registerAgent(errorAgent);

      const result = await detectInstalledAgents();
      expect(result).not.toContain('error-agent');
    });
  });
});

describe('Skills Directory Helpers', () => {
  describe('getCentralSkillsDir', () => {
    it('should return global skills dir when global is true', () => {
      const result = getCentralSkillsDir(true);
      expect(result).toContain('.skillhub');
      expect(result).toContain('skills');
    });

    it('should return project skills dir when global is false', () => {
      const cwd = '/project/path';
      const result = getCentralSkillsDir(false, cwd);
      expect(result).toBe('/project/path/.skillhub/skills');
    });

    it('should use process.cwd() when cwd not provided', () => {
      const result = getCentralSkillsDir(false);
      expect(result).toContain('.skillhub/skills');
    });
  });

  describe('getSkillCanonicalPath', () => {
    it('should return path with skill slug', () => {
      const result = getSkillCanonicalPath('my-skill', true);
      expect(result).toContain('.skillhub');
      expect(result).toContain('skills');
      expect(result).toContain('my-skill');
    });
  });

  describe('getAgentSkillsDir', () => {
    const testAgent: Agent = {
      name: 'Test',
      id: 'test',
      configPaths: [],
      format: 'markdown',
      skillsDir: '.test/skills',
      globalSkillsDir: '/home/user/.test/skills',
      detectInstalled: jest.fn(),
      install: jest.fn(),
      uninstall: jest.fn(),
      isInstalled: jest.fn(),
    };

    it('should return global skills dir for global mode', () => {
      const result = getAgentSkillsDir(testAgent, true);
      expect(result).toBe('/home/user/.test/skills');
    });

    it('should return project skills dir for local mode', () => {
      const result = getAgentSkillsDir(testAgent, false, '/my/project');
      expect(result).toBe('/my/project/.test/skills');
    });
  });
});
