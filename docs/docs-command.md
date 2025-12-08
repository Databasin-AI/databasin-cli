# Documentation Command

View CLI documentation directly in your terminal, with support for offline caching.

## Quick Reference

```bash
# List all available documentation
databasin docs

# View documentation (raw markdown - good for piping)
databasin docs quickstart
databasin docs pipelines-guide

# View with rich formatting (good for reading)
databasin docs quickstart --pretty

# Download all docs for offline use
databasin docs download                    # → ~/.databasin/docs
databasin docs download /path/to/docs      # → custom location

# Pipe output for scripting
databasin docs quickstart | grep "authentication"
databasin docs connectors-guide > guide.md
```

## How It Works

**Source Priority:**
1. Local cache (`~/.databasin/docs`) - checked first
2. GitHub repository - fetched if not in cache

**Download Behavior:**
- `databasin docs download` always fetches latest from GitHub
- Overwrites existing local files
- After downloading, all commands use local cache automatically

**Output Modes:**
- **Default (raw markdown)** - Perfect for piping, scripting, saving to files
- **`--pretty` flag** - Rich terminal formatting with colors, code blocks, etc.

## Examples

### Reading Documentation

```bash
# Quick read with formatting
databasin docs quickstart --pretty

# Read specific section
databasin docs pipelines-guide --pretty | less -R
```

### Scripting

```bash
# Search for specific topics
databasin docs automations-guide | grep -i "schedule"

# Save for offline reference
databasin docs quickstart > ~/quickstart-guide.md

# Extract code examples
databasin docs pipelines-quickstart | grep -A 10 "```bash"
```

### Offline Use

```bash
# Download once
databasin docs download

# Now works offline (uses local cache)
databasin docs quickstart
databasin docs pipelines-guide --pretty

# Update local cache when online
databasin docs download
```

## Tips

- **Use raw output** (default) for piping and scripting
- **Use `--pretty`** for comfortable reading in terminal
- **Download docs** before going offline or for faster access
- **No authentication required** - works without login
