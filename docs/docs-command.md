# Documentation Command

View CLI documentation directly in your terminal. Documentation is fetched from the public GitHub repository.

## Quick Reference

```bash
# List all available documentation
databasin docs

# View documentation (raw markdown - good for piping)
databasin docs quickstart
databasin docs pipelines-guide

# View with rich formatting (good for reading)
databasin docs quickstart --pretty

# Pipe output for scripting
databasin docs quickstart | grep "authentication"
databasin docs connectors-guide > guide.md
```

## How It Works

**GitHub Documentation:**
- All documentation is fetched from the public GitHub repository
- Requires internet connection
- Always shows the latest documentation
- Fast and reliable access to any documentation file

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

# Save for reference
databasin docs quickstart > ~/quickstart-guide.md

# Extract code examples
databasin docs pipelines-quickstart | grep -A 10 "```bash"
```

## Tips

- **Use raw output** (default) for piping and scripting
- **Use `--pretty`** for comfortable reading in terminal
- **No authentication required** - works without login
- **Latest docs** - always shows the most recent documentation from GitHub
