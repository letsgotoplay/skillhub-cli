// Mock chalk before importing anything that uses it
jest.mock('chalk', () => ({
  default: {
    red: jest.fn((str: string) => str),
    green: jest.fn((str: string) => str),
    yellow: jest.fn((str: string) => str),
    blue: jest.fn((str: string) => str),
    cyan: jest.fn((str: string) => str),
    bold: jest.fn((str: string) => str),
  },
  red: jest.fn((str: string) => str),
  green: jest.fn((str: string) => str),
  yellow: jest.fn((str: string) => str),
  blue: jest.fn((str: string) => str),
  cyan: jest.fn((str: string) => str),
  bold: jest.fn((str: string) => str),
}));

// Mock undici
const mockRequest = jest.fn();
jest.mock('undici', () => ({
  request: mockRequest,
}));

// Mock conf
let store: { config: { apiUrl: string; token?: string } } = {
  config: {
    apiUrl: 'http://localhost:3000',
  },
};

jest.mock('conf', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => store[key as keyof typeof store]),
    set: jest.fn((key: string, value: unknown) => {
      store[key as keyof typeof store] = value as never;
    }),
    clear: jest.fn(() => {
      store = { config: { apiUrl: 'http://localhost:3000' } };
    }),
  }));
});

import {
  getConfig,
  setConfig,
  clearConfig,
  isAuthenticated,
  apiRequest,
  downloadFile,
  apiClient,
} from '../api/client.js';

describe('API Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    store = { config: { apiUrl: 'http://localhost:3000' } };
    process.env = { ...originalEnv };
    delete process.env.SKILLHUB_API_URL;
    delete process.env.SKILLHUB_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return default config', () => {
      const config = getConfig();
      expect(config.apiUrl).toBe('http://localhost:3000');
    });

    it('should prioritize env variables', () => {
      process.env.SKILLHUB_API_URL = 'https://api.example.com';
      process.env.SKILLHUB_TOKEN = 'test-token';

      const config = getConfig();
      expect(config.apiUrl).toBe('https://api.example.com');
      expect(config.token).toBe('test-token');
    });
  });

  describe('setConfig', () => {
    it('should merge new config with existing', () => {
      setConfig({ token: 'new-token' });
      const config = getConfig();
      expect(config.token).toBe('new-token');
    });
  });

  describe('clearConfig', () => {
    it('should reset config to defaults', () => {
      setConfig({ token: 'to-clear' });
      clearConfig();
      const config = getConfig();
      expect(config.token).toBeUndefined();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false without token', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should return true with token', () => {
      setConfig({ token: 'valid-token' });
      expect(isAuthenticated()).toBe(true);
    });

    it('should return true with env token', () => {
      process.env.SKILLHUB_TOKEN = 'env-token';
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('apiRequest', () => {
    it('should make GET request', async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
          [Symbol.asyncIterator]: async function* () {},
        },
        headers: {},
      });

      const result = await apiRequest<{ data: string }>('/test');
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ data: 'test' });
    });

    it('should make POST request with body', async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 201,
        body: {
          text: () => Promise.resolve(JSON.stringify({ created: true })),
          [Symbol.asyncIterator]: async function* () {},
        },
        headers: {},
      });

      const result = await apiRequest<{ created: boolean }>('/test', {
        method: 'POST',
        body: { name: 'test' },
      });

      expect(result.status).toBe(201);
      expect(result.data).toEqual({ created: true });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('should handle error responses', async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 400,
        body: {
          text: () => Promise.resolve(JSON.stringify({ error: 'Bad request' })),
          [Symbol.asyncIterator]: async function* () {},
        },
        headers: {},
      });

      const result = await apiRequest('/test');
      expect(result.status).toBe(400);
      expect(result.error).toEqual({ error: 'Bad request' });
    });

    it('should handle network errors', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiRequest('/test');
      expect(result.status).toBe(0);
      expect(result.error).toEqual({ error: 'Network error' });
    });

    it('should include authorization header when token is set', async () => {
      setConfig({ token: 'auth-token' });

      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          text: () => Promise.resolve('{}'),
          [Symbol.asyncIterator]: async function* () {},
        },
        headers: {},
      });

      await apiRequest('/test');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token',
          }),
        })
      );
    });
  });

  describe('downloadFile', () => {
    it('should download file and return buffer', async () => {
      const mockBuffer = Buffer.from('file content');
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          [Symbol.asyncIterator]: async function* () {
            yield mockBuffer;
          },
        },
        headers: {},
      });

      const result = await downloadFile('http://example.com/file.zip');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw on non-200 status', async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 404,
        body: {
          [Symbol.asyncIterator]: async function* () {},
        },
        headers: {},
      });

      await expect(downloadFile('http://example.com/notfound')).rejects.toThrow(
        'Download failed with status 404'
      );
    });
  });

  describe('ApiClient', () => {
    describe('getApiUrl', () => {
      it('should return API URL from config', () => {
        const url = apiClient.getApiUrl();
        expect(url).toBe('http://localhost:3000');
      });
    });

    describe('getSkills', () => {
      it('should fetch skills with parameters', async () => {
        mockRequest.mockResolvedValueOnce({
          statusCode: 200,
          body: {
            text: () => Promise.resolve(JSON.stringify({ skills: [{ id: '1' }] })),
            [Symbol.asyncIterator]: async function* () {},
          },
          headers: {},
        });

        const result = await apiClient.getSkills({
          query: 'test',
          limit: 10,
          category: 'DEVELOPMENT',
        });

        expect(result.skills).toHaveLength(1);
        expect(mockRequest).toHaveBeenCalledWith(
          expect.stringContaining('search=test'),
          expect.any(Object)
        );
      });

      it('should throw on error', async () => {
        mockRequest.mockResolvedValueOnce({
          statusCode: 500,
          body: {
            text: () => Promise.resolve(JSON.stringify({ error: 'Server error' })),
            [Symbol.asyncIterator]: async function* () {},
          },
          headers: {},
        });

        await expect(apiClient.getSkills({})).rejects.toThrow();
      });
    });

    describe('getSkill', () => {
      it('should fetch single skill by id', async () => {
        mockRequest.mockResolvedValueOnce({
          statusCode: 200,
          body: {
            text: () => Promise.resolve(JSON.stringify({ id: 'skill-1', name: 'Test' })),
            [Symbol.asyncIterator]: async function* () {},
          },
          headers: {},
        });

        const result = await apiClient.getSkill('skill-1');
        expect(result).toEqual({ id: 'skill-1', name: 'Test' });
      });
    });

    describe('getSkillBySlug', () => {
      it('should fetch skill by slug', async () => {
        mockRequest.mockResolvedValueOnce({
          statusCode: 200,
          body: {
            text: () => Promise.resolve(JSON.stringify({ slug: 'my-skill' })),
            [Symbol.asyncIterator]: async function* () {},
          },
          headers: {},
        });

        const result = await apiClient.getSkillBySlug('my-skill');
        expect(result).toEqual({ slug: 'my-skill' });
      });
    });

    describe('checkVersion', () => {
      it('should check CLI version', async () => {
        mockRequest.mockResolvedValueOnce({
          statusCode: 200,
          body: {
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  user: { email: 'test@example.com' },
                  marketplace: { name: 'SkillHub' },
                })
              ),
            [Symbol.asyncIterator]: async function* () {},
          },
          headers: {},
        });

        const result = await apiClient.checkVersion();
        expect(result.user.email).toBe('test@example.com');
        expect(result.marketplace.name).toBe('SkillHub');
      });
    });
  });
});
