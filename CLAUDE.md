# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Build the CLI
pnpm run build

# Watch mode for development
pnpm run dev

# Run the CLI locally
node dist/index.js <command>

# Run tests
pnpm test

# Lint code
pnpm run lint
```

## Architecture

SkillHub CLI is a TypeScript-based CLI tool for managing skills across multiple AI Coding Tools.

### Core Components

**Command Layer** (`src/commands/`)
- Each command (login, search, add, remove, etc.) is in its own file
- Commands use `commander.js` for argument parsing
- Entry point: `src/index.ts` registers all commands

**Tool System** (`src/agents/`)
- Plugin architecture for different AI Coding Tools (Claude Code, Cursor, Copilot, etc.)
- All tools implement the `Agent` interface in `src/agents/types.ts`
- Tools are registered via `registerAgent()` and stored in `AGENT_REGISTRY`
- Each tool handles its own config file format (markdown, yaml, json)
- Skills are installed by injecting content between marker comments (e.g., `<!-- SKILLHUB:START:slug -->`)

**API Client** (`src/api/client.ts`)
- HTTP client using `undici` for requests
- Handles authentication via Bearer token
- Configuration stored using `conf` package in `~/.config/skillhub/`
- Environment variables `SKILLHUB_API_URL` and `SKILLHUB_TOKEN` take precedence over file config

**Config Management** (`src/config/manager.ts`)
- Tracks installed skills in `~/.config/skillhub/installed.json`
- Skills are stored with metadata including version, installed tools, and file paths

### Adding a New AI Coding Tool

1. Create `src/agents/<tool-name>.ts`
2. Implement the `Agent` interface with `install`, `uninstall`, and `isInstalled` methods
3. Register in `src/agents/index.ts` via `registerAgent()`
4. Define config paths (global/project) and format type

### Key Patterns

- Tool config files use marker comments to identify installed skill sections
- Skills are appended to existing config files, preserving user content
- The `InstalledSkill` type tracks where skills are installed across tools

### Terminology Note

In the codebase, the internal term "agent" refers to what users see as "AI Coding Tools". The user-facing text uses "AI Coding Tools" or "tools" for better clarity, while the code internally uses "agent" for the plugin system.
