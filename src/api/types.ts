// API types matching the SkillHub backend

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: Category;
  tags: string[];
  visibility: Visibility;
  authorId: string;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string | null;
    email: string;
  };
  team?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  stats?: {
    downloadsCount: number;
    viewsCount: number;
  } | null;
  versions?: SkillVersion[];
}

export interface SkillVersion {
  id: string;
  version: string;
  changelog: string | null;
  status: SkillStatus;
  specValidationPassed: boolean | null;
  aiSecurityAnalyzed: boolean | null;
  createdAt: string;
}

export type Category =
  | 'DEVELOPMENT'
  | 'SECURITY'
  | 'DATA_ANALYTICS'
  | 'AI_ML'
  | 'TESTING'
  | 'INTEGRATION';

export type Visibility = 'PUBLIC' | 'TEAM_ONLY' | 'PRIVATE';

export type SkillStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'EVALUATING'
  | 'SCANNING'
  | 'APPROVED'
  | 'REJECTED';

export interface SkillListResponse {
  skills: Skill[];
  total: number;
}

export interface ApiToken {
  id: string;
  name: string;
  token: string;
  tokenPrefix: string;
  scopes: TokenScope[];
  expiresAt: string | null;
  createdAt: string;
  warning?: string;
}

export type TokenScope =
  | 'SKILL_READ'
  | 'SKILL_WRITE'
  | 'SKILL_DELETE'
  | 'BUNDLE_READ'
  | 'BUNDLE_WRITE'
  | 'TEAM_READ'
  | 'ADMIN';

export interface CliVersionResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    scopes?: TokenScope[];
  };
  marketplace: {
    name: string;
    version: string;
    minCliVersion: string;
  };
}

export interface InstalledSkill {
  name: string;
  slug: string;
  version: string;
  skillId: string;
  installedAt: string;
  installedTo: string[];
  paths: Record<string, string>;
}
