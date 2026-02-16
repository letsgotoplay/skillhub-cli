# @letsgotoplay/skillhub-cli

CLI tool for SkillHub enterprise skill marketplace. Search, install, and manage AI Coding Tool skills across multiple platforms.

## Installation

```bash
npm install -g @letsgotoplay/skillhub-cli
# or
pnpm add -g @letsgotoplay/skillhub-cli
```

## Quick Start

```bash
# Authenticate with your SkillHub marketplace
skillhub login

# Search for skills
skillhub search "pdf"

# Install a skill to your AI Coding Tools
skillhub add my-skill -a claude-code,cursor

# List installed skills
skillhub list
```

## Commands

### Authentication

#### `skillhub login [token]`

Authenticate with the SkillHub marketplace.

```bash
# Interactive login (prompts for token)
skillhub login

# Login with token directly
skillhub login sh_your_token_here

# Specify custom API URL
skillhub login --url https://skillhub.example.com
```

You can generate API tokens from the SkillHub dashboard at `/dashboard/settings/tokens`.

#### `skillhub logout`

Remove stored authentication credentials.

```bash
skillhub logout
```

#### `skillhub whoami`

Show the currently authenticated user.

```bash
skillhub whoami
```

### Skill Discovery

#### `skillhub search <query>`

Search for skills in the marketplace.

```bash
# Basic search
skillhub search "pdf"

# Limit results
skillhub search "pdf" --limit 10

# Filter by category
skillhub search "pdf" --category DOCUMENT

# JSON output
skillhub search "pdf" --json
```

Options:
- `-l, --limit <number>` - Maximum number of results (default: 20)
- `-c, --category <category>` - Filter by category
- `-j, --json` - Output as JSON

#### `skillhub find [query]`

Interactively search and install skills.

```bash
# Interactive search
skillhub find

# Search with initial query
skillhub find pdf
```

#### `skillhub info <skill>`

Get detailed information about a skill.

```bash
skillhub info my-skill

# JSON output
skillhub info my-skill --json
```

Options:
- `-j, --json` - Output as JSON

### Skill Management

#### `skillhub add <skill>`

Install a skill to your AI Coding Tools.

```bash
# Install to default tools (claude-code, cursor)
skillhub add my-skill

# Install to specific tools
skillhub add my-skill -a claude-code,cursor,copilot

# Install globally (to user home directory)
skillhub add my-skill --global

# Install specific version
skillhub add my-skill --version 1.2.0

# Install to all available tools
skillhub add my-skill --all
```

Options:
- `-a, --agents <agents>` - Target AI Coding Tools (comma-separated)
- `-g, --global` - Install globally to user directory
- `-v, --version <version>` - Specific version to install
- `--all` - Install to all available tools

#### `skillhub remove [skill]`

Remove an installed skill.

```bash
# Remove from all installed tools
skillhub remove my-skill

# Remove from specific tools
skillhub remove my-skill -a claude-code

# Remove from global installation
skillhub remove my-skill --global

# Remove from all tools
skillhub remove my-skill --all
```

Options:
- `-g, --global` - Remove from global scope
- `-a, --agents <agents>` - Remove from specific AI Coding Tools
- `--all` - Remove from all tools

#### `skillhub list`

List installed skills.

```bash
skillhub list

# Filter by tool
skillhub list --agent claude-code

# JSON output
skillhub list --json
```

Options:
- `-j, --json` - Output as JSON
- `-a, --agent <agent>` - Filter by AI Coding Tool

#### `skillhub upload <file>`

Upload a skill package to the marketplace.

```bash
skillhub upload ./my-skill.zip

# With metadata
skillhub upload ./my-skill.zip --name "My Skill" --version "1.0.0"
```

Options:
- `-n, --name <name>` - Skill name
- `-v, --version <version>` - Skill version
- `-d, --description <description>` - Skill description

### Updates

#### `skillhub check`

Check for available skill updates.

```bash
skillhub check

# JSON output
skillhub check --json
```

Options:
- `-j, --json` - Output as JSON

#### `skillhub update [skill]`

Update installed skills.

```bash
# Update all skills
skillhub update

# Update specific skill
skillhub update my-skill

# Update for specific tools
skillhub update my-skill -a claude-code,cursor

# Update global installation
skillhub update my-skill --global
```

Options:
- `-g, --global` - Update global installation
- `-a, --agents <agents>` - Update for specific AI Coding Tools
- `--all` - Update for all tools

## Supported AI Coding Tools

| Tool | ID | Config Path | Format |
|-------|-----|-------------|--------|
| Claude Code | `claude-code` | `.claude/CLAUDE.md` | Markdown |
| Cursor | `cursor` | `.cursor/rules` | Markdown |
| GitHub Copilot | `copilot` | `.github/copilot-instructions.md` | Markdown |
| Windsurf | `windsurf` | `.windsurf/rules` | Markdown |
| Cline | `cline` | `.cline/rules` | Markdown |
| Codex | `codex` | `CODEX.md` | Markdown |
| OpenCode | `opencode` | `.opencode/instructions.md` | Markdown |
| Goose | `goose` | `.goose/hints` | Text |
| Kilo | `kilo` | `.kilo/config.yaml` | YAML |
| Roo | `roo` | `.roo/rules` | Markdown |
| Trae | `trae` | `.trae/instructions.md` | Markdown |

## Environment Variables

- `SKILLHUB_TOKEN` - API token for authentication (alternative to `login`)
- `SKILLHUB_API_URL` - Custom API URL (default: `https://api.skillhub.com`)

### Setting Environment Variables

```bash
# Set for a single command
SKILLHUB_API_URL=https://your-api-url.com skillhub search <skill-name>

# Set for current terminal session
export SKILLHUB_API_URL=https://your-api-url.com

# Set permanently (add to ~/.zshrc or ~/.bashrc)
export SKILLHUB_API_URL=https://your-api-url.com
```

## Configuration

Configuration files are stored in `~/.skillhub/`:

- `config.json` - Authentication and settings
- `installed.json` - Installed skills manifest

## Examples

### Install a skill to multiple tools

```bash
skillhub add pdf-processor -a claude-code,cursor,copilot
```

### Search and pipe to jq

```bash
skillhub search "api" --json | jq '.skills[].name'
```

### Update all skills

```bash
skillhub update
```

## License

MIT
