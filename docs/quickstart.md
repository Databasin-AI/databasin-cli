# DataBasin CLI - Quick Start Guide

## Installation

### Option 1: Install from Local Build (Development)

```bash
# Navigate to CLI directory
cd /home/founder3/code/tpi/databasin-sv/src/cli

# Run the installation script
./scripts/install-local.sh

# Verify installation
databasin --version
```

### Option 2: Build and Run Manually

```bash
# Build the CLI
./scripts/build.sh

# Run directly from dist folder
./dist/databasin --help
```

### Option 3: Development Mode (No Build)

```bash
# Run directly from source
./scripts/dev.sh --help

# Example command
./scripts/dev.sh projects list
```

## First Steps

### 1. Set Up Authentication

Create a `.token` file in your home directory or project directory:

```bash
# In your home directory
mkdir -p ~/.databasin
echo "your-jwt-token-here" > ~/.databasin/.token
chmod 600 ~/.databasin/.token

# OR in your project directory
echo "your-jwt-token-here" > .token
chmod 600 .token
```

Alternatively, use an environment variable:

```bash
export DATABASIN_TOKEN="your-jwt-token-here"
```

### 2. Verify Authentication

```bash
# Check token validity
databasin auth verify

# View current user
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
export DATABASIN_API_URL="https://api.databasin.com"
export DATABASIN_TOKEN="your-token"
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

## Scripts

### Create Build Scripts Directory

```bash
cd /home/founder3/code/tpi/databasin-sv/src/cli

# Available scripts
./scripts/build.sh           # Build the CLI
./scripts/install-local.sh   # Install globally
./scripts/dev.sh --help      # Run from source
./scripts/test-all.sh        # Run all tests
```

## Troubleshooting

### Token Not Found

```
✖ No authentication token found
```

**Solution**: Set `DATABASIN_TOKEN` env var or create `.token` file

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
