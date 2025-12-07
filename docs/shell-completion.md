# Shell Completion Guide

This guide covers installation and usage of shell completions for the Databasin CLI, available for bash, zsh, and fish shells.

## Overview

Shell completions provide:
- **Command completion** - Suggest available commands as you type
- **Option completion** - Suggest available flags and options
- **Intelligent filtering** - Show context-aware suggestions based on current command
- **Help text** - Display descriptions for commands and options

Completions are **automatically generated** from the live CLI structure, ensuring they always match your CLI version.

## Installation

### Option 1: Automatic Installation (Recommended)

The CLI can automatically detect your shell and install completions:

```bash
# Auto-detect shell and install
databasin completion install

# Or specify a shell explicitly
databasin completion install --shell bash
databasin completion install --shell zsh
databasin completion install --shell fish
```

This installs completions to the standard location for your shell:
- **Bash**: `~/.bash_completion.d/databasin`
- **Zsh**: `~/.zsh/completions/_databasin`
- **Fish**: `~/.config/fish/completions/databasin.fish`

### Option 2: Generate and Install Manually

Generate the completion script and install it yourself:

```bash
# Generate bash completion script
databasin completion bash > ~/.bash_completion.d/databasin

# Generate zsh completion script
databasin completion zsh > ~/.zsh/completions/_databasin

# Generate fish completion script
databasin completion fish > ~/.config/fish/completions/databasin.fish
```

### Option 3: Source Dynamically

For temporary testing or without permanent installation, source completions in your shell config:

#### Bash

Add this to your `~/.bashrc`:

```bash
source <(databasin completion bash)
```

Then reload:

```bash
source ~/.bashrc
```

#### Zsh

Add this to your `~/.zshrc`:

```bash
source <(databasin completion zsh)
```

Then reload:

```bash
source ~/.zshrc
```

#### Fish

Fish automatically sources files from `~/.config/fish/completions/`, so just run:

```bash
databasin completion fish > ~/.config/fish/completions/databasin.fish
```

## Verifying Installation

Test your completion installation by typing and pressing TAB:

```bash
databasin <TAB>
```

You should see a list of available commands:
```
auth        -- Authentication and token management
projects    -- Manage Databasin projects
connectors  -- Manage data connectors
pipelines   -- Manage data pipelines
sql         -- Execute SQL queries and explore schemas
automations -- Manage automation workflows
api         -- Call any Databasin API endpoint directly
update      -- Update Databasin CLI to the latest version
completion  -- Manage shell completions (bash/zsh/fish)
```

## Usage Examples

### Complete a Command

```bash
# Type and press TAB to see subcommands
databasin projects <TAB>
# Shows: get, list, stats, users

databasin pipelines <TAB>
# Shows: artifacts, create, delete, get, history, list, run, template, update, wizard
```

### Complete Options

```bash
# Global options
databasin --<TAB>
# Shows: --api-url, --csv, --debug, --json, --no-color, --token, --verbose

# Command-specific options
databasin projects list --<TAB>
# Shows: --count, --fields, --filter, --json, --limit, --verbose, etc.
```

### Partial Completion

```bash
# Completions work on partial input
databasin pro<TAB>
# Auto-completes to: databasin projects

databasin projects l<TAB>
# Auto-completes to: databasin projects list
```

## Shell-Specific Features

### Bash

- **Commands**: Tab-complete available commands and options
- **Help**: Press `?` after completing to see help text (bash 4.0+)
- **Cycling**: Use Shift+Tab to cycle through completions (in some configurations)

```bash
# Example completions
databasin <TAB>                    # Lists commands
databasin projects <TAB>            # Lists projects subcommands
databasin projects list --<TAB>     # Lists projects list options
```

### Zsh

- **Grouped completions**: Commands and options are grouped for better organization
- **Descriptions**: See inline descriptions for each completion
- **Menu selection**: Use arrow keys to navigate completions (with `zstyle` configuration)

```zsh
# Example with menu selection (if configured)
databasin projects <TAB>  # Shows menu with descriptions:
                          # get -- Get project details
                          # list -- List projects
                          # stats -- Show project statistics
                          # users -- List project users
```

Configure menu selection in `~/.zshrc`:

```zsh
zstyle ':completion:*' menu select
```

### Fish

- **Descriptions**: All completions include descriptions below the suggestion
- **Fuzzy search**: Start typing to filter suggestions
- **Context-aware**: Only shows relevant options for the current command

```fish
# Example with descriptions
databasin projects <TAB>
# lists:
# get    (Get project details)
# list   (List projects)
# stats  (Show project statistics)
# users  (List project users)
```

## Advanced Usage

### Combining with jq

Use completions with pipe and jq for advanced filtering:

```bash
# Complete, then pipe output for JSON processing
databasin projects list --json | jq '.[] | .name'
```

### Scripting with Completions

Get available commands programmatically:

```bash
# List all available commands
databasin --help | grep '^\s\s[a-z]'

# Get command-specific help
databasin pipelines list --help
```

### Updating Completions

Completions are **auto-generated from the live CLI structure**. When you update the CLI:

1. Completions are automatically regenerated
2. No need to manually update completion scripts
3. New commands and options are available immediately

If you installed completions using automatic installation, no action is needed. If you manually generated them, regenerate:

```bash
databasin completion install --force
```

Or regenerate the script:

```bash
databasin completion bash > ~/.bash_completion.d/databasin
```

## Troubleshooting

### Completions Not Working

**Problem**: Completions not appearing after installation.

**Solutions**:

1. **Reload your shell**:
   ```bash
   # Bash
   source ~/.bashrc

   # Zsh
   source ~/.zshrc

   # Fish (restart terminal or run)
   source ~/.config/fish/config.fish
   ```

2. **Check installation path**:
   ```bash
   # Verify the completion file exists
   ls -la ~/.bash_completion.d/databasin    # Bash
   ls -la ~/.zsh/completions/_databasin     # Zsh
   ls -la ~/.config/fish/completions/databasin.fish  # Fish
   ```

3. **Check shell startup files**:
   - Ensure your shell config file is sourcing completions
   - Verify no errors in shell startup (run `bash -x` to debug)

### Completions Show Wrong Options

**Problem**: Completions show outdated options after CLI update.

**Solution**: Regenerate completions:

```bash
databasin completion install --force
```

### Fish Completions Not Found

**Problem**: Fish can't find the completion file.

**Solution**: Ensure the directory exists and try manual installation:

```bash
# Create directory
mkdir -p ~/.config/fish/completions

# Generate and install
databasin completion fish > ~/.config/fish/completions/databasin.fish

# Reload Fish
source ~/.config/fish/config.fish
```

### Zsh Completions Not Working

**Problem**: Zsh completions not triggered.

**Solution**: Ensure `compinit` is initialized in `~/.zshrc`:

```zsh
# Add to ~/.zshrc
autoload -U +X compinit && compinit
```

Then reload:

```bash
source ~/.zshrc
```

## Implementation Details

### Auto-Update Design

The completion system works by:

1. **Live introspection** - Reads the actual Commander program structure at runtime
2. **Dynamic generation** - Generates completion scripts on-demand
3. **No manual updates** - Completions always reflect the current CLI structure

This means:
- ✅ New commands are automatically completed
- ✅ Removed commands disappear from completions
- ✅ Changed options are reflected immediately
- ✅ No maintenance burden on CLI developers

### Completion Sources

```
src/utils/completion-generator.ts  -- Generator that creates shell scripts
src/commands/completion.ts         -- CLI command for managing completions
```

### Supported Shells

| Shell | Version | Support |
|-------|---------|---------|
| Bash  | 4.0+    | ✅ Full |
| Zsh   | 5.0+    | ✅ Full |
| Fish  | 3.0+    | ✅ Full |

## Quick Reference

| Task | Command |
|------|---------|
| Generate bash completions | `databasin completion bash` |
| Generate zsh completions | `databasin completion zsh` |
| Generate fish completions | `databasin completion fish` |
| Auto-install for current shell | `databasin completion install` |
| Install for specific shell | `databasin completion install --shell bash` |
| Force reinstall | `databasin completion install --force` |

## Next Steps

- Read command-specific documentation: `docs/{command}-guide.md`
- View quick start guide: `docs/quickstart.md`
- Check usage examples: `docs/usage-examples.md`

---

**Happy tab completing! 🎉**
