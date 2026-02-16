import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as fsNative from 'fs/promises';
import type { Agent, InstalledSkill } from '../agents/types.js';
import { getAgent, getCentralSkillsDir, getAgentSkillsDir } from '../agents/types.js';

export type InstallMode = 'symlink' | 'copy';

export interface InstallResult {
  success: boolean;
  path: string;
  canonicalPath?: string;
  mode: InstallMode;
  symlinkFailed?: boolean;
  error?: string;
}

/**
 * Sanitize skill name for use as directory name
 * Removes invalid filesystem characters while preserving the original name
 */
function sanitizeName(name: string): string {
  let sanitized = name.replace(/[\\/:\0]/g, '');  // Remove invalid filesystem chars
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');  // Trim whitespace and dots
  sanitized = sanitized.replace(/^\.+/, '');  // Remove leading dots

  if (!sanitized || sanitized.length === 0) {
    sanitized = 'unnamed-skill';
  }

  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  return sanitized;
}

/**
 * Create a symlink, with fallback to copy on failure
 */
async function createSymlink(target: string, linkPath: string): Promise<boolean> {
  try {
    const resolvedTarget = path.resolve(target);
    const resolvedLinkPath = path.resolve(linkPath);

    if (resolvedTarget === resolvedLinkPath) {
      return true;
    }

    // Remove existing file/symlink if exists
    try {
      const stats = await fs.lstat(linkPath);
      if (stats.isSymbolicLink()) {
        const existingTarget = await fs.readlink(linkPath);
        if (path.resolve(path.dirname(linkPath), existingTarget) === resolvedTarget) {
          return true; // Already pointing to correct target
        }
        await fs.remove(linkPath);
      } else {
        await fs.remove(linkPath);
      }
    } catch {
      // File doesn't exist, proceed
    }

    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(linkPath));

    // Create relative symlink
    const relativePath = path.relative(path.dirname(linkPath), target);
    const symlinkType = os.platform() === 'win32' ? 'junction' : undefined;

    await fs.symlink(relativePath, linkPath, symlinkType);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy directory recursively, excluding certain files
 */
const EXCLUDE_FILES = new Set(['README.md', 'metadata.json', '.DS_Store']);
const EXCLUDE_DIRS = new Set(['.git', 'node_modules']);

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.ensureDir(dest);

  const entries = await fsNative.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDE_FILES.has(entry.name)) continue;
    if (entry.isDirectory() && EXCLUDE_DIRS.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copy(srcPath, destPath);
    }
  }
}

/**
 * Install skill to central location and symlink to agent directory
 */
export async function installSkillForAgent(
  skillSlug: string,
  skillContent: string,
  agentId: string,
  options: { global?: boolean; cwd?: string; mode?: InstallMode } = {}
): Promise<InstallResult> {
  const agent = getAgent(agentId);
  if (!agent) {
    return {
      success: false,
      path: '',
      mode: options.mode || 'symlink',
      error: `Unknown agent: ${agentId}`,
    };
  }

  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const installMode = options.mode ?? 'symlink';
  const sanitizedName = sanitizeName(skillSlug);

  // Central location: ~/.skillhub/skills/<skill-name>
  const canonicalDir = getCentralSkillsDir(isGlobal, cwd);
  const canonicalSkillPath = path.join(canonicalDir, sanitizedName);

  // Agent-specific location: ~/.claude/skills/<skill-name>
  const agentDir = getAgentSkillsDir(agent, isGlobal, cwd);
  const agentSkillPath = path.join(agentDir, sanitizedName);

  try {
    // For copy mode, skip canonical directory and copy directly to agent location
    if (installMode === 'copy') {
      await fs.ensureDir(agentSkillPath);
      const skillMdPath = path.join(agentSkillPath, 'SKILL.md');
      await fs.writeFile(skillMdPath, skillContent, 'utf-8');

      return {
        success: true,
        path: agentSkillPath,
        mode: 'copy',
      };
    }

    // Symlink mode: write to canonical location and symlink to agent location
    await fs.ensureDir(canonicalSkillPath);
    const skillMdPath = path.join(canonicalSkillPath, 'SKILL.md');
    await fs.writeFile(skillMdPath, skillContent, 'utf-8');

    const symlinkCreated = await createSymlink(canonicalSkillPath, agentSkillPath);

    if (!symlinkCreated) {
      // Symlink failed, fall back to copy
      try {
      await fs.remove(agentSkillPath);
      } catch {
        // Ignore cleanup errors
      }
      await fs.ensureDir(agentSkillPath);
      const agentSkillMdPath = path.join(agentSkillPath, 'SKILL.md');
      await fs.writeFile(agentSkillMdPath, skillContent, 'utf-8');

      return {
        success: true,
        path: agentSkillPath,
        canonicalPath: canonicalSkillPath,
        mode: 'symlink',
        symlinkFailed: true,
      };
    }

    return {
      success: true,
      path: agentSkillPath,
      canonicalPath: canonicalSkillPath,
      mode: 'symlink',
    };
  } catch (error) {
    return {
      success: false,
      path: agentSkillPath,
      mode: installMode,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Install skill from a directory (multiple files)
 */
export async function installSkillDirForAgent(
  skillSlug: string,
  sourceDir: string,
  agentId: string,
  options: { global?: boolean; cwd?: string; mode?: InstallMode } = {}
): Promise<InstallResult> {
  const agent = getAgent(agentId);
  if (!agent) {
    return {
      success: false,
      path: '',
      mode: options.mode || 'symlink',
      error: `Unknown agent: ${agentId}`,
    };
  }

  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const installMode = options.mode ?? 'symlink';
  const sanitizedName = sanitizeName(skillSlug);

  const canonicalDir = getCentralSkillsDir(isGlobal, cwd);
  const canonicalSkillPath = path.join(canonicalDir, sanitizedName);

  const agentDir = getAgentSkillsDir(agent, isGlobal, cwd);
  const agentSkillPath = path.join(agentDir, sanitizedName);

  try {
    if (installMode === 'copy') {
      await copyDirectory(sourceDir, agentSkillPath);
      return {
        success: true,
        path: agentSkillPath,
        mode: 'copy',
      };
    }

    // Symlink mode
    await fs.ensureDir(canonicalSkillPath);
    await copyDirectory(sourceDir, canonicalSkillPath);

    const symlinkCreated = await createSymlink(canonicalSkillPath, agentSkillPath);

    if (!symlinkCreated) {
      try {
      await fs.remove(agentSkillPath);
      } catch {
        // Ignore
      }
      await copyDirectory(sourceDir, agentSkillPath);

      return {
        success: true,
        path: agentSkillPath,
        canonicalPath: canonicalSkillPath,
        mode: 'symlink',
        symlinkFailed: true,
      };
    }

    return {
      success: true,
      path: agentSkillPath,
      canonicalPath: canonicalSkillPath,
      mode: 'symlink',
    };
  } catch (error) {
    return {
      success: false,
      path: agentSkillPath,
      mode: installMode,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Uninstall skill from agent directory
 */
export async function uninstallSkillForAgent(
  skillSlug: string,
  agentId: string,
  options: { global?: boolean; cwd?: string } = {}
): Promise<boolean> {
  const agent = getAgent(agentId);
  if (!agent) return false;

  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const sanitizedName = sanitizeName(skillSlug);

  const agentDir = getAgentSkillsDir(agent, isGlobal, cwd);
  const agentSkillPath = path.join(agentDir, sanitizedName);

  try {
    await fs.remove(agentSkillPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if skill is installed for an agent
 */
export async function isSkillInstalledForAgent(
  skillSlug: string,
  agentId: string,
  options: { global?: boolean; cwd?: string } = {}
): Promise<boolean> {
  const agent = getAgent(agentId);
  if (!agent) return false;

  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const sanitizedName = sanitizeName(skillSlug);

  const agentDir = getAgentSkillsDir(agent, isGlobal, cwd);
  const agentSkillPath = path.join(agentDir, sanitizedName);

  try {
    await fs.access(agentSkillPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create symlink from central skill directory to agent's skills directory.
 * Used when skill has already been extracted to central location.
 */
export async function createSymlinkToAgent(
  centralSkillDir: string,
  agentSkillPath: string
): Promise<InstallResult> {
  try {
    const symlinkCreated = await createSymlink(centralSkillDir, agentSkillPath);

    if (!symlinkCreated) {
      // Symlink failed, fall back to copy
      try {
      await fs.remove(agentSkillPath);
      } catch {
        // Ignore cleanup errors
      }
      await copyDirectory(centralSkillDir, agentSkillPath);

      return {
        success: true,
        path: agentSkillPath,
        canonicalPath: centralSkillDir,
        mode: 'symlink',
        symlinkFailed: true,
      };
    }

    return {
      success: true,
      path: agentSkillPath,
      canonicalPath: centralSkillDir,
      mode: 'symlink',
    };
  } catch (error) {
    return {
      success: false,
      path: agentSkillPath,
      mode: 'symlink',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
