# Databasin CLI

A command-line interface for managing Databasin projects, connectors, pipelines, and data workflows.

## Features

### Smart Search & Discovery
- **Connector Search**: Find connectors by name, type, or pattern
- **Connector Inspection**: Comprehensive connector analysis with connection testing, structure discovery, and pipeline usage
- **Bulk Operations**: Get or delete multiple resources at once with comma-separated IDs
- **Name Lookup**: Find resources by name instead of ID
- **SQL Discover**: Explore entire database structure in one command

### Pipeline Management
- **Pipeline Cloning**: Duplicate pipelines with modifications (name, source, target, schedule)
- **Pipeline Validation**: Validate configs before creation with detailed error messages

### Context Management
- **Persistent State**: Set working project/connector once, use everywhere
- **Auto-Resolution**: Commands automatically use context when available
- **Quick Switching**: Easily switch between projects and connectors

### Performance Optimization
- **Smart Caching**: Automatic caching reduces API calls by 70%
- **Cache Control**: View status, clear cache when needed
- **Token Efficiency**: Field selection and limits reduce API token usage by 75%

### Safety & Validation
- **Pipeline Validation**: Validate configs before creation with detailed error messages
- **Enhanced Error Messages**: "Did you mean?" suggestions for typos and mistakes
- **Helpful Examples**: Every error shows how to fix it

### Enhanced Output
- **Multiple Formats**: Table, JSON, CSV output for all commands
- **Field Selection**: Show only the fields you need with `--fields`
- **Tree View**: Visual database structure display for SQL discovery

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/Databasin-AI/databasin-cli/main/install.sh | bash
```

The installer detects your platform (Linux x64, macOS ARM64/x64) and installs to the user bin location. No framework or prerequisites. Copy, paste, and go!

### Build from Source

```bash
git clone https://github.com/Databasin-AI/databasin-cli.git
cd databasin-cli
bun install && bun run build

# Copy the databasin file from the appropriate ./dist/ folder into your bin location
```

Requires [Bun](https://bun.sh) v1.3+.

## Getting Started

```bash
# Authenticate via browser (opens web login page)
databasin login

# Or login to a custom instance
databasin login databasin.example.com

# Verify authentication
databasin auth whoami

# Enable shell completions (bash/zsh/fish)
databasin completion install
```

## Quick Start

### Basic Workflow with Context

```bash
# Set your working context
databasin set project <your-project-id>
databasin set connector <your-connector-id>

# Now commands use context automatically
databasin connectors list
databasin pipelines list
databasin sql discover

# Search for connectors
databasin connectors search "postgres"

# Explore database structure
databasin sql discover --schema public

# Validate pipeline before creating
databasin pipelines validate pipeline-config.json
```

### Examples by Use Case

**Pipeline Creation Workflow**:
```bash
# 1. Set project context
databasin set project <project-id>

# 2. Search for connectors
databasin connectors search "postgres"    # Note source ID
databasin connectors search "snowflake"   # Note target ID

# 3. Explore source data
databasin sql discover <source-id> --schema public

# 4. Validate pipeline config
databasin pipelines validate config.json

# 5. Create pipeline
databasin pipelines create config.json
```

**Connector Analysis**:
```bash
# Comprehensive connector inspection (all-in-one)
databasin connectors inspect <id-or-name>

# Shows: connection status, metadata, config, database structure,
#        pipeline usage, and quick action suggestions
```

**Data Exploration**:
```bash
# Set connector context
databasin set connector <connector-id>

# Discover full database structure
databasin sql discover

# Or explore step by step
databasin sql catalogs
databasin sql schemas --catalog production
databasin sql tables --catalog production --schema public
```

**Pipeline Cloning**:
```bash
# Clone a pipeline with same configuration
databasin pipelines clone <pipeline-id>

# Clone with modifications
databasin pipelines clone 8901 --name "New Pipeline" --source 5459 --schedule "0 3 * * *"

# Preview changes without creating (dry-run)
databasin pipelines clone 8901 --dry-run
```

**Bulk Operations**:
```bash
# Get multiple connectors at once
databasin connectors get 5459,5765,5543

# Find by name
databasin connectors get --name "postgres"

# Delete multiple pipelines
databasin pipelines delete 123,456,789 --yes
```

## Quick Examples

```bash
# Projects
databasin projects list
databasin projects get <project-id>

# Connectors
databasin connectors list --full
databasin connectors search "postgres"
databasin connectors get 5459,5765,5543           # Bulk get
databasin connectors test <connector-id>
databasin connectors config Postgres --screens

# Pipelines
databasin pipelines list --project <project-id>
databasin pipelines wizard                         # Interactive creator
databasin pipelines validate config.json           # Validate before creating
databasin pipelines run <pipeline-id>
databasin pipelines logs <pipeline-id>

# SQL Queries
databasin sql discover <connector-id>              # Full database structure
databasin sql discover --schema public             # Uses context connector
databasin sql tables <connector-id>
databasin sql exec <connector-id> "SELECT * FROM users LIMIT 10"

# Automations
databasin automations list --project <project-id>
databasin automations run <automation-id>

# Context Management
databasin set project <project-id>                 # Set working project
databasin set connector <connector-id>             # Set working connector
databasin context                                  # View current context
databasin context clear                            # Clear all context

# Cache Management
databasin cache status                             # View cached data
databasin cache clear                              # Clear all cache

# Documentation (from GitHub)
databasin docs                                     # List all docs
databasin docs quickstart                          # View (raw markdown)
databasin docs quickstart --pretty                 # View with formatting

# Generic API Access
databasin api GET /api/health
databasin api POST /connectors '{"name": "test", "type": "postgres"}'
```

### Output Formats

```bash
databasin projects list              # Table (default)
databasin projects list --json       # JSON
databasin projects list --csv        # CSV
databasin projects list --fields id,name,status
```

## Documentation

**View docs directly in your terminal:**
```bash
databasin docs                      # List all available documentation
databasin docs quickstart           # View raw markdown (good for piping)
databasin docs quickstart --pretty  # View with rich formatting
databasin docs download             # Download all for offline use
```

**Or browse online:**

| Guide | Description |
|-------|-------------|
| [Quickstart](./docs/quickstart.md) | Get up and running |
| [Examples](./EXAMPLES.md) | Comprehensive usage examples |
| [Projects Guide](./docs/projects-guide.md) | Project management |
| [Connectors Guide](./docs/connectors-guide.md) | Data connector operations |
| [Pipelines Guide](./docs/pipelines-guide.md) | Pipeline creation and execution |
| [Automations Guide](./docs/automations-guide.md) | Automation workflows |
| [Observability Guide](./docs/observability-guide.md) | Logs, history, and monitoring |
| [Shell Completions](./docs/shell-completion.md) | Bash/Zsh/Fish setup |
| [Developer Guide](./docs/developers.md) | Local dev, SDK usage, releases |

## Performance Tips

### Use Context for Repeated Operations
```bash
# Set context once
databasin set project <project-id>
databasin set connector <connector-id>

# Then omit flags
databasin connectors list     # Uses project context
databasin pipelines list      # Uses project context
databasin sql discover        # Uses connector context
```

### Leverage Caching
```bash
# Caching is automatic (5-minute TTL by default)
databasin connectors list     # Fetches from API
databasin connectors list     # Uses cache (99% faster!)

# Force refresh when needed
databasin connectors list --no-cache
```

### Use Bulk Operations
```bash
# Bad - multiple sequential calls
databasin connectors get 5459
databasin connectors get 5765
databasin connectors get 5543

# Good - single bulk call
databasin connectors get 5459,5765,5543
```

## Self-Update

```bash
databasin update --check    # Check for updates
databasin update            # Update to latest
```

## Troubleshooting

```bash
# Re-authenticate (opens browser)
databasin login

# Login to a specific instance
databasin login https://your-instance.databasin.com

# Verify token validity
databasin auth verify

# Check current user context
databasin auth whoami

# Debug mode
DATABASIN_DEBUG=true databasin <command>

# Check cache status
databasin cache status

# Clear cache
databasin cache clear

# View context
databasin context

# View current configuration
databasin config
```

## Support

- [GitHub Issues](https://github.com/Databasin-AI/databasin-cli/issues)
- [Examples](./EXAMPLES.md)

## License

CC-BY-4.0 - See [LICENSE](./LICENSE) for details.
