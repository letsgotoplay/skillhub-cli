import {
  AGENT_REGISTRY,
  registerAgent,
  getAgent,
  getAllAgents,
  getAgentIds,
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
});
