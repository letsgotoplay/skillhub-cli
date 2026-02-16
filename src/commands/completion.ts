import chalk from 'chalk';

const BASH_COMPLETION = `# skillhub completion for bash
_skillhub_completion() {
    local cur prev words cword
    _init_completion || return

    local commands="login logout whoami search info find list add remove upload check update help"
    local options="--help --version -h -V"

    if [[ \${cword} -eq 1 ]]; then
        if [[ \${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "\${options}" -- "\${cur}"))
        else
            COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
        fi
        return
    fi

    local command=\${words[1]}
    case \${command} in
        login)
            COMPREPLY=($(compgen -W "--url -u" -- "\${cur}"))
            ;;
        search)
            COMPREPLY=($(compgen -W "--limit -l --category -c --json -j" -- "\${cur}"))
            ;;
        info)
            COMPREPLY=($(compgen -W "--json -j" -- "\${cur}"))
            ;;
        list|ls)
            COMPREPLY=($(compgen -W "--json -j --agent -a" -- "\${cur}"))
            ;;
        add)
            COMPREPLY=($(compgen -W "--agents -a --global -g --version -v --all" -- "\${cur}"))
            ;;
        remove|rm)
            COMPREPLY=($(compgen -W "--global -g --agents -a --all" -- "\${cur}"))
            ;;
        upload)
            COMPREPLY=($(compgen -W "--name -n --version -v --description -d" -- "\${cur}"))
            ;;
        check)
            COMPREPLY=($(compgen -W "--json -j" -- "\${cur}"))
            ;;
        update)
            COMPREPLY=($(compgen -W "--global -g --agents -a --all" -- "\${cur}"))
            ;;
    esac
}

complete -F _skillhub_completion skillhub
`;

const ZSH_COMPLETION = `#compdef skillhub
_skillhub() {
    local -a commands options
    commands=(
        'login:Authenticate with SkillHub marketplace'
        'logout:Remove stored authentication'
        'whoami:Show current authenticated user'
        'search:Search for skills in the marketplace'
        'info:Get detailed information about a skill'
        'find:Interactively search and install skills'
        'list:List installed skills'
        'ls:List installed skills (alias)'
        'add:Install a skill to your AI Coding Tools'
        'remove:Remove an installed skill'
        'rm:Remove an installed skill (alias)'
        'upload:Upload a skill package to the marketplace'
        'check:Check for available updates'
        'update:Update installed skills'
        'help:Display help information'
    )

    if (( CURRENT == 2 )); then
        _describe 'command' commands
        return
    fi

    local command=\${words[2]}
    case \$command in
        login)
            _arguments '--url-[SkillHub API URL]:url:' '-u[SkillHub API URL]:url:'
            ;;
        search)
            _arguments '--limit[Maximum results]:number:' '-l[Maximum results]:number:' \\
                       '--category[Filter by category]:category:' '-c[Filter by category]:category:' \\
                       '--json[Output as JSON]' '-j[Output as JSON]'
            ;;
        info)
            _arguments '--json[Output as JSON]' '-j[Output as JSON]'
            ;;
        list|ls)
            _arguments '--json[Output as JSON]' '-j[Output as JSON]' \\
                       '--agent[Filter by AI Coding Tool]:tool:' '-a[Filter by AI Coding Tool]:tool:'
            ;;
        add)
            _arguments '--agents[Target AI Coding Tools]:tools:' '-a[Target AI Coding Tools]:tools:' \\
                       '--global[Install globally]' '-g[Install globally]' \\
                       '--version[Specific version]:version:' '-v[Specific version]:version:' \\
                       '--all[Install to all tools]'
            ;;
        remove|rm)
            _arguments '--global[Remove from global]' '-g[Remove from global]' \\
                       '--agents[Remove from AI Coding Tools]:tools:' '-a[Remove from AI Coding Tools]:tools:' \\
                       '--all[Remove from all tools]'
            ;;
        upload)
            _arguments '--name[Skill name]:name:' '-n[Skill name]:name:' \\
                       '--version[Skill version]:version:' '-v[Skill version]:version:' \\
                       '--description[Skill description]:description:' '-d[Skill description]:description:'
            ;;
        check)
            _arguments '--json[Output as JSON]' '-j[Output as JSON]'
            ;;
        update)
            _arguments '--global[Update global]' '-g[Update global]' \\
                       '--agents[Update for AI Coding Tools]:tools:' '-a[Update for AI Coding Tools]:tools:' \\
                       '--all[Update for all tools]'
            ;;
    esac
}

_skillhub
`;

const FISH_COMPLETION = `# skillhub completion for fish
complete -c skillhub -f

# Main commands
complete -c skillhub -n '__fish_use_subcommand' -a 'login' -d 'Authenticate with SkillHub marketplace'
complete -c skillhub -n '__fish_use_subcommand' -a 'logout' -d 'Remove stored authentication'
complete -c skillhub -n '__fish_use_subcommand' -a 'whoami' -d 'Show current authenticated user'
complete -c skillhub -n '__fish_use_subcommand' -a 'search' -d 'Search for skills in the marketplace'
complete -c skillhub -n '__fish_use_subcommand' -a 'info' -d 'Get detailed information about a skill'
complete -c skillhub -n '__fish_use_subcommand' -a 'list' -d 'List installed skills'
complete -c skillhub -n '__fish_use_subcommand' -a 'ls' -d 'List installed skills (alias)'
complete -c skillhub -n '__fish_use_subcommand' -a 'add' -d 'Install a skill to your AI Coding Tools'
complete -c skillhub -n '__fish_use_subcommand' -a 'remove' -d 'Remove an installed skill'
complete -c skillhub -n '__fish_use_subcommand' -a 'rm' -d 'Remove an installed skill (alias)'
complete -c skillhub -n '__fish_use_subcommand' -a 'upload' -d 'Upload a skill package to the marketplace'
complete -c skillhub -n '__fish_use_subcommand' -a 'check' -d 'Check for available updates'
complete -c skillhub -n '__fish_use_subcommand' -a 'update' -d 'Update installed skills'
complete -c skillhub -n '__fish_use_subcommand' -a 'help' -d 'Display help information'

# login options
complete -c skillhub -n '__fish_seen_subcommand_from login' -l url -d 'SkillHub API URL'
complete -c skillhub -n '__fish_seen_subcommand_from login' -s u -d 'SkillHub API URL'

# search options
complete -c skillhub -n '__fish_seen_subcommand_from search' -l limit -d 'Maximum results'
complete -c skillhub -n '__fish_seen_subcommand_from search' -s l -d 'Maximum results'
complete -c skillhub -n '__fish_seen_subcommand_from search' -l category -d 'Filter by category'
complete -c skillhub -n '__fish_seen_subcommand_from search' -s c -d 'Filter by category'
complete -c skillhub -n '__fish_seen_subcommand_from search' -l json -d 'Output as JSON'
complete -c skillhub -n '__fish_seen_subcommand_from search' -s j -d 'Output as JSON'

# info options
complete -c skillhub -n '__fish_seen_subcommand_from info' -l json -d 'Output as JSON'
complete -c skillhub -n '__fish_seen_subcommand_from info' -s j -d 'Output as JSON'

# list options
complete -c skillhub -n '__fish_seen_subcommand_from list ls' -l json -d 'Output as JSON'
complete -c skillhub -n '__fish_seen_subcommand_from list ls' -s j -d 'Output as JSON'
complete -c skillhub -n '__fish_seen_subcommand_from list ls' -l agent -d 'Filter by AI Coding Tool'
complete -c skillhub -n '__fish_seen_subcommand_from list ls' -s a -d 'Filter by AI Coding Tool'

# add options
complete -c skillhub -n '__fish_seen_subcommand_from add' -l agents -d 'Target AI Coding Tools'
complete -c skillhub -n '__fish_seen_subcommand_from add' -s a -d 'Target AI Coding Tools'
complete -c skillhub -n '__fish_seen_subcommand_from add' -l global -d 'Install globally'
complete -c skillhub -n '__fish_seen_subcommand_from add' -s g -d 'Install globally'
complete -c skillhub -n '__fish_seen_subcommand_from add' -l version -d 'Specific version'
complete -c skillhub -n '__fish_seen_subcommand_from add' -s v -d 'Specific version'
complete -c skillhub -n '__fish_seen_subcommand_from add' -l all -d 'Install to all tools'

# remove options
complete -c skillhub -n '__fish_seen_subcommand_from remove rm' -l global -d 'Remove from global'
complete -c skillhub -n '__fish_seen_subcommand_from remove rm' -s g -d 'Remove from global'
complete -c skillhub -n '__fish_seen_subcommand_from remove rm' -l agents -d 'Remove from AI Coding Tools'
complete -c skillhub -n '__fish_seen_subcommand_from remove rm' -s a -d 'Remove from AI Coding Tools'
complete -c skillhub -n '__fish_seen_subcommand_from remove rm' -l all -d 'Remove from all tools'

# upload options
complete -c skillhub -n '__fish_seen_subcommand_from upload' -l name -d 'Skill name'
complete -c skillhub -n '__fish_seen_subcommand_from upload' -s n -d 'Skill name'
complete -c skillhub -n '__fish_seen_subcommand_from upload' -l version -d 'Skill version'
complete -c skillhub -n '__fish_seen_subcommand_from upload' -s v -d 'Skill version'
complete -c skillhub -n '__fish_seen_subcommand_from upload' -l description -d 'Skill description'
complete -c skillhub -n '__fish_seen_subcommand_from upload' -s d -d 'Skill description'

# check options
complete -c skillhub -n '__fish_seen_subcommand_from check' -l json -d 'Output as JSON'
complete -c skillhub -n '__fish_seen_subcommand_from check' -s j -d 'Output as JSON'

# update options
complete -c skillhub -n '__fish_seen_subcommand_from update' -l global -d 'Update global'
complete -c skillhub -n '__fish_seen_subcommand_from update' -s g -d 'Update global'
complete -c skillhub -n '__fish_seen_subcommand_from update' -l agents -d 'Update for AI Coding Tools'
complete -c skillhub -n '__fish_seen_subcommand_from update' -s a -d 'Update for AI Coding Tools'
complete -c skillhub -n '__fish_seen_subcommand_from update' -l all -d 'Update for all tools'
`;

export async function completion(shell: string): Promise<void> {
  switch (shell.toLowerCase()) {
    case 'bash':
      console.log(BASH_COMPLETION);
      console.log(chalk.gray('\n# To install, add this to your ~/.bashrc:'));
      console.log(chalk.gray('# source <(skillhub completion bash)'));
      break;

    case 'zsh':
      console.log(ZSH_COMPLETION);
      console.log(chalk.gray('\n# To install, save to ~/.zsh/completion/_skillhub and add to fpath'));
      console.log(chalk.gray('# Or: skillhub completion zsh > ~/.zsh/completion/_skillhub'));
      break;

    case 'fish':
      console.log(FISH_COMPLETION);
      console.log(chalk.gray('\n# To install, save to ~/.config/fish/completions/skillhub.fish'));
      console.log(chalk.gray('# skillhub completion fish > ~/.config/fish/completions/skillhub.fish'));
      break;

    default:
      console.log(chalk.red(`Unknown shell: ${shell}`));
      console.log(chalk.gray('Supported shells: bash, zsh, fish'));
      process.exit(1);
  }
}

export function printCompletionHelp(): void {
  console.log();
  console.log(chalk.cyan('Shell Completion'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log();
  console.log('Generate shell completion scripts:');
  console.log();
  console.log('  skillhub completion bash');
  console.log('  skillhub completion zsh');
  console.log('  skillhub completion fish');
  console.log();
  console.log(chalk.cyan('Installation:'));
  console.log();
  console.log(chalk.yellow('Bash:'));
  console.log(chalk.gray('  echo "source <(skillhub completion bash)" >> ~/.bashrc'));
  console.log();
  console.log(chalk.yellow('Zsh:'));
  console.log(chalk.gray('  skillhub completion zsh > ~/.zsh/completion/_skillhub'));
  console.log(chalk.gray('  # Add ~/.zsh/completion to your fpath in ~/.zshrc'));
  console.log();
  console.log(chalk.yellow('Fish:'));
  console.log(chalk.gray('  skillhub completion fish > ~/.config/fish/completions/skillhub.fish'));
  console.log();
}
