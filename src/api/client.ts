import { request } from 'undici';
import Conf from 'conf';
import chalk from 'chalk';

// CLI version for User-Agent header
const CLI_VERSION = '1.0.0';
const USER_AGENT = `SkillHub-CLI/${CLI_VERSION}`;

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
  const fileConfig = config.get('config');

  // Environment variables take precedence over file config
  return {
    ...fileConfig,
    apiUrl: process.env.SKILLHUB_API_URL || fileConfig.apiUrl,
    token: process.env.SKILLHUB_TOKEN || fileConfig.token,
  };
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
    'User-Agent': USER_AGENT,
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
  success: boolean;
  skillId: string;
  versionId: string;
  slug: string;
  fullSlug: string;
  warnings?: string[];
  specValidationPassed?: boolean;
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

    // Use native fetch for FormData compatibility
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
      },
      body: formData,
    });

    const responseBody = await response.text();
    let data: UploadResponse | { success: false; error: string };

    try {
      data = JSON.parse(responseBody);
    } catch {
      throw new Error('Invalid response from server');
    }

    // Check for error in response body
    if ('success' in data && data.success === false) {
      throw new Error((data as { success: false; error: string }).error || 'Upload failed');
    }

    if (!response.ok) {
      throw new Error((data as unknown as ApiError).error || 'Upload failed');
    }

    return data as UploadResponse;
  }

  /**
   * Upload a new version of an existing skill
   */
  public async uploadSkillVersion(
    skillId: string,
    formData: FormData
  ): Promise<UploadResponse> {
    const cfg = this.getConfig();
    const url = `${cfg.apiUrl}/api/skills/${skillId}/versions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
      },
      body: formData,
    });

    const responseBody = await response.text();
    let data: UploadResponse | { success: false; error: string };

    try {
      data = JSON.parse(responseBody);
    } catch {
      throw new Error('Invalid response from server');
    }

    if ('success' in data && data.success === false) {
      throw new Error((data as { success: false; error: string }).error || 'Version upload failed');
    }

    if (!response.ok) {
      throw new Error((data as unknown as ApiError).error || 'Version upload failed');
    }

    return data as UploadResponse;
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
