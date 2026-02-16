import { request } from 'undici';
import Conf from 'conf';
import chalk from 'chalk';

export interface SkillHubConfig {
  apiUrl: string;
  token?: string;
  userId?: string;
  email?: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

const config = new Conf<{ config: SkillHubConfig }>({
  projectName: 'skillhub',
  configName: 'config',
  defaults: {
    config: {
      apiUrl: 'http://localhost:3000',
    },
  },
});

export function getConfig(): SkillHubConfig {
  return config.get('config');
}

export function setConfig(newConfig: Partial<SkillHubConfig>): void {
  const currentConfig = config.get('config');
  config.set('config', { ...currentConfig, ...newConfig });
}

export function clearConfig(): void {
  config.clear();
}

export function isAuthenticated(): boolean {
  const cfg = getConfig();
  return !!cfg.token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const cfg = getConfig();
  const { method = 'GET', body, headers = {} } = options;

  const url = `${cfg.apiUrl}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (cfg.token) {
    requestHeaders['Authorization'] = `Bearer ${cfg.token}`;
  }

  try {
    const response = await request(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const statusCode = response.statusCode;
    let data: T | undefined;
    let error: ApiError | undefined;

    const responseBody = await response.body.text();
    if (responseBody) {
      try {
        const parsed = JSON.parse(responseBody);
        if (statusCode >= 400) {
          error = parsed;
        } else {
          data = parsed;
        }
      } catch {
        if (statusCode >= 400) {
          error = { error: responseBody };
        }
      }
    }

    return { data, error, status: statusCode };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(chalk.red(`API request failed: ${errorMessage}`));
    return { error: { error: errorMessage }, status: 0 };
  }
}

export async function downloadFile(url: string): Promise<Buffer> {
  const response = await request(url, {
    method: 'GET',
  });

  if (response.statusCode !== 200) {
    throw new Error(`Download failed with status ${response.statusCode}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

// Upload response type
export interface UploadResponse {
  id: string;
  name: string;
  version: string;
  status: string;
  securityScanStatus?: string;
}

// Skill for updates/check
export interface SkillUpdate {
  id: string;
  name: string;
  slug: string;
  version: string;
  installedVersion?: string;
  hasUpdate: boolean;
}

// API Client class
class ApiClient {
  private getConfig(): SkillHubConfig {
    return getConfig();
  }

  public getApiUrl(): string {
    return this.getConfig().apiUrl;
  }

  public async getSkills(params: { query?: string; limit?: number; category?: string }): Promise<{ skills: unknown[] }> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('search', params.query);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.category) searchParams.set('category', params.category);

    const response = await apiRequest<{ skills: unknown[] }>(`/api/skills?${searchParams.toString()}`);
    if (response.error) {
      throw new Error(response.error.error || 'Failed to fetch skills');
    }
    return response.data!;
  }

  public async getSkill(id: string): Promise<unknown> {
    const response = await apiRequest<unknown>(`/api/skills/${id}`);
    if (response.error) {
      throw new Error(response.error.error || 'Failed to fetch skill');
    }
    return response.data!;
  }

  public async getSkillBySlug(slug: string): Promise<unknown> {
    const response = await apiRequest<unknown>(`/api/cli/skills/by-slug/${slug}`);
    if (response.error) {
      throw new Error(response.error.error || 'Failed to fetch skill');
    }
    return response.data!;
  }

  public async downloadSkill(skillId: string, version?: string): Promise<{ buffer: Buffer; filename: string }> {
    const cfg = this.getConfig();
    let url = `${cfg.apiUrl}/api/skills/${skillId}/download`;
    if (version) {
      url += `?version=${version}`;
    }

    const response = await request(url, {
      method: 'GET',
      headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {},
    });

    if (response.statusCode !== 200) {
      throw new Error(`Download failed with status ${response.statusCode}`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.body) {
      chunks.push(chunk);
    }

    // Get filename from content-disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'skill.zip';
    if (contentDisposition) {
      const headerValue = Array.isArray(contentDisposition) ? contentDisposition[0] : contentDisposition;
      const match = headerValue.match(/filename="?(.+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    return { buffer: Buffer.concat(chunks), filename };
  }

  public async uploadSkill(formData: FormData): Promise<UploadResponse> {
    const cfg = this.getConfig();
    const url = `${cfg.apiUrl}/api/skills`;

    const response = await request(url, {
      method: 'POST',
      headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {},
      body: formData,
    });

    const responseBody = await response.body.text();
    let data: UploadResponse;

    try {
      data = JSON.parse(responseBody);
    } catch {
      throw new Error('Invalid response from server');
    }

    if (response.statusCode >= 400) {
      throw new Error((data as unknown as ApiError).error || 'Upload failed');
    }

    return data;
  }

  public async checkVersion(): Promise<{ user: { email: string }; marketplace: { name: string } }> {
    const response = await apiRequest<{ user: { email: string }; marketplace: { name: string } }>('/api/cli/version');
    if (response.error) {
      throw new Error(response.error.error || 'Failed to verify token');
    }
    return response.data!;
  }
}

export const apiClient = new ApiClient();
