# Databasin CLI - Quick Start Guide

## Installation

### Option 1: Download Pre-built Binary

```bash
# Download for your platform from the Databasin web interface
# Or build from source (see below)

# Verify installation
databasin --version
```

### Option 2: Build from Source

```bash
# Clone and install dependencies
git clone <repository-url>
cd databasin-cli
bun install

# Build executable
bun run build:exe

# Link globally for development
./scripts/dev-setup.sh link

# Verify installation
databasin --version
```

### Option 3: Development Mode (No Build)

```bash
# Run directly from source
bun run dev --help

# Example command
bun run dev projects list
```

## First Steps

### 1. Authenticate

The easiest way to authenticate is via browser:

```bash
# Opens your browser to sign in to Databasin
databasin login
```

This will:
1. Open the Databasin login page in your browser
2. After you sign in, redirect the token back to the CLI
3. Save the token to `~/.databasin/.token`
4. Verify the token and display your user information

**Login to a custom instance:**

```bash
# Login to a custom Databasin instance
databasin login databasin.example.com

# Or with explicit protocol
databasin login https://databasin.example.com
```

The CLI will:
- Attempt to fetch API configuration from `{WEB_URL}/config/api.json`
- Save both the web URL and API URL to `~/.databasin/config.json`
- If API config is not found, you can set it manually with `DATABASIN_API_URL`

**Alternative: Set token manually**

For CI/CD or scripting, you can set the token directly:

```bash
export DATABASIN_TOKEN="your-jwt-token-here"
```

### 2. Verify Authentication

```bash
# Check token validity
databasin auth verify

# View current user and accessible projects
databasin auth whoami
```

### 3. Explore Your Data

```bash
# List projects
databasin projects list

# List connectors (count mode - efficient)
databasin connectors list

# List connectors (full details)
databasin connectors list --full --fields id,name,type --limit 20

# List pipelines in a project
databasin pipelines list --project your-project-id
```

## Common Commands

### Projects

```bash
# List all projects
databasin projects list

# Get project details
databasin projects get proj-123

# View project users
databasin projects users proj-123

# View project statistics
databasin projects stats proj-123
```

### Connectors

```bash
# Count connectors (fast)
databasin connectors list

# List with details
databasin connectors list --full

# Get connector info
databasin connectors get conn-123

# Create connector from JSON
databasin connectors create mysql-config.json

# Delete connector (with confirmation)
databasin connectors delete conn-123

# Get connector configuration and workflow
databasin connectors config Postgres
databasin connectors config Postgres --screens
databasin connectors config --all
```

### Pipelines

```bash
# List pipelines (interactive project selection)
databasin pipelines list

# List with specific project
databasin pipelines list --project proj-123

# Get pipeline details
databasin pipelines get pipe-456

# Run a pipeline
databasin pipelines run pipe-456

# View logs
databasin pipelines logs pipe-456
```

### SQL Queries

```bash
# List catalogs
databasin sql catalogs conn-123

# List schemas
databasin sql schemas conn-123 --catalog production

# List tables
databasin sql tables conn-123 --catalog production --schema public

# Execute query
databasin sql exec conn-123 "SELECT * FROM users LIMIT 10"

# Execute from file
databasin sql exec conn-123 --file query.sql

# Get results as JSON
databasin sql exec conn-123 "SELECT id, name FROM users" --json

# Export to CSV
databasin sql exec conn-123 "SELECT * FROM products" --csv > products.csv
```

### Automations

```bash
# List automations (with project filter)
databasin automations list --project proj-123

# Get automation details
databasin automations get auto-789

# Run automation
databasin automations run auto-789
```

### Pipeline & Automation Observability

```bash
# Pipeline observability
databasin pipelines history pipeline-456                    # View pipeline execution history
databasin pipelines artifacts logs artifact-789             # View artifact logs
databasin pipelines artifacts history artifact-789          # View artifact execution history

# Automation observability
databasin automations logs auto-123                         # View automation logs
databasin automations tasks logs task-456                   # View task logs
databasin automations history auto-123                      # View automation execution history
databasin automations tasks history task-456                # View task execution history

# Monitor with options
databasin pipelines history pipeline-456 --limit 10         # Recent 10 runs
databasin pipelines history pipeline-456 --count            # Count total runs
databasin automations history auto-123 --json               # Export as JSON
databasin automations logs auto-123 --run-id run-789        # Specific run logs
```

## Output Formats

### Table (Default)

```bash
databasin projects list
```

```
┌──────────┬─────────────┬────────┐
│ ID       │ Name        │ Status │
├──────────┼─────────────┼────────┤
│ proj-123 │ Analytics   │ active │
│ proj-456 │ Warehouse   │ active │
└──────────┴─────────────┴────────┘
```

### JSON

```bash
databasin projects list --json
```

```json
[
	{
		"id": "proj-123",
		"name": "Analytics",
		"status": "active"
	}
]
```

### CSV

```bash
databasin projects list --csv
```

```
id,name,status
"proj-123","Analytics","active"
"proj-456","Warehouse","active"
```

## Configuration

### Config File

Create `~/.databasin/config.json`:

```json
{
	"apiUrl": "https://api.databasin.com",
	"defaultProject": "proj-123",
	"output": {
		"format": "table",
		"colors": true,
		"verbose": false
	},
	"tokenEfficiency": {
		"defaultLimit": 100,
		"warnThreshold": 50000
	}
}
```

### Environment Variables

```bash
# API configuration (usually auto-configured via login)
export DATABASIN_API_URL="https://api.databasin.com"
export DATABASIN_WEB_URL="https://app.databasin.com"

# Authentication token
export DATABASIN_TOKEN="your-token"

# Output preferences
export NO_COLOR=1  # Disable colors
```

### Configuration Priority

1. CLI flags (highest priority)
2. Environment variables
3. Config file (`~/.databasin/config.json`)
4. Defaults (lowest priority)

## Tips & Tricks

### Field Filtering

Save tokens and reduce noise:

```bash
# Only show specific fields
databasin projects list --fields id,name,status
databasin connectors list --full --fields id,name,type
```

### Pagination

Limit results for faster queries:

```bash
databasin connectors list --full --limit 20
databasin pipelines list --project proj-123 --limit 10
```

### Disable Colors

For scripting or CI/CD:

```bash
databasin projects list --no-color
# OR
export NO_COLOR=1
databasin projects list
```

### Debug Mode

See detailed error information:

```bash
databasin --debug projects list
```

### Pipe to Tools

Combine with standard Unix tools:

```bash
# Filter JSON output with jq
databasin projects list --json | jq '.[].name'

# Export to CSV and open in Excel
databasin sql exec conn-123 "SELECT * FROM sales" --csv > sales.csv

# Count results
databasin connectors list --full --json | jq 'length'
```

## Development Scripts

```bash
# Build and link globally
./scripts/dev-setup.sh link

# Unlink when done
./scripts/dev-setup.sh unlink

# Run tests
bun run test

# Full verification
bun run verify
```

## Troubleshooting

### Token Not Found

```
✖ No authentication token found
```

**Solution**: Run `databasin login` to authenticate via browser (or `DATABASIN_TOKEN` env var)

### Connection Refused

```
✖ Failed to connect to API (ECONNREFUSED)
```

**Solution**: Check `--api-url` or set `DATABASIN_API_URL`

### Permission Denied

```
✖ Access denied (403)
```

**Solution**: Check your token has proper permissions

### Large Response Warning

```
⚠ MODERATE TOKEN USAGE WARNING
   Response size: 75.2 KB
```

**Solution**: Use `--fields`, `--limit`, or count mode

## Next Steps

- Read the full [README.md](./README.md)
- Explore [EXAMPLES.md](./EXAMPLES.md) for real-world scenarios
- Check [ERROR-MESSAGES.md](./docs/ERROR-MESSAGES.md) for error reference
- Review [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute

## Getting Help

```bash
# Global help
databasin --help

# Command-specific help
databasin <command> --help

# Examples
databasin auth --help
databasin projects --help
databasin connectors --help
```

---

**Happy data integrating! 🚀**
