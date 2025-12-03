# Databasin CLI

A command-line interface for managing Databasin projects, connectors, pipelines, and data workflows. Execute SQL queries, manage automations, and interact with the Databasin platform directly from your terminal.

## Features

- **Project Management** - List and manage Databasin projects
- **Connector Operations** - Create, update, and manage data connectors  
- **Pipeline Execution** - Run and monitor data pipelines
- **SQL Interface** - Execute queries against connected data sources
- **Automation Control** - Manage and trigger automations
- **Generic API Access** - Call any Databasin API endpoint
- **Multiple Output Formats** - Table, JSON, and CSV output options

## Installation

### Quick Install (Recommended)

Install the latest release with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/Databasin-AI/databasin-cli/main/install.sh | bash
```

Or download and inspect first:

```bash
curl -fsSL https://raw.githubusercontent.com/Databasin-AI/databasin-cli/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

The installer will:
- Detect your platform (Linux x64, macOS ARM64, macOS x64)
- Download the appropriate binary from the latest GitHub release
- Install to `/usr/local/bin/databasin`
- Make the binary executable

### Logging In

```bash
# Login via browser (recommended)
databasin auth login
```

## Usage

### Authentication

```bash
# Login via browser - opens Databasin web UI to authenticate
databasin auth login

# View current user context
databasin auth whoami

# Check token validity
databasin auth verify
```

### Self-Update

```bash
# Check for updates
databasin update --check

# Update to latest version
databasin update

# Force update (even if on latest)
databasin update --force
```

### Project Management

```bash
# List all your projects
databasin projects list

# Get detailed project information
databasin projects get proj-123

# View project users
databasin projects users proj-123

# Show project statistics
databasin projects stats proj-123
```

### Working with Connectors

```bash
# List all connectors
databasin connectors list

# Get detailed connector information
databasin connectors get conn-123

# Create a new connector from JSON file
databasin connectors create connector-config.json

# Update existing connector
databasin connectors update conn-123 updated-config.json

# Delete a connector
databasin connectors delete conn-123
```

### Pipeline Operations

```bash
# List pipelines in a project
databasin pipelines list --project proj-123

# Get pipeline details
databasin pipelines get pipeline-456

# Create a new pipeline
databasin pipelines create pipeline-config.json

# Run a pipeline
databasin pipelines run pipeline-456

# View pipeline logs
databasin pipelines logs pipeline-456
```

### SQL Interface

```bash
# List available catalogs
databasin sql catalogs conn-123

# List schemas in a catalog
databasin sql schemas conn-123 --catalog my-catalog

# List tables in a schema
databasin sql tables conn-123 --catalog my-catalog --schema public

# Execute SQL query
databasin sql exec conn-123 "SELECT * FROM users LIMIT 10"
```

### Automation Management

```bash
# List all automations
databasin automations list

# List automations for specific project
databasin automations list --project proj-123

# Get automation details
databasin automations get auto-456

# Run an automation
databasin automations run auto-456
```

### Generic API Access

```bash
# Make GET request
databasin api GET /projects

# Make POST request with data
databasin api POST /connectors '{"name": "My Connector", "type": "postgres"}'

# Make PUT request
databasin api PUT /pipelines/pipeline-123 @updated-config.json
```

## Configuration

### Environment Variables

```bash
# Authentication token (set automatically by `databasin auth login`)
export DATABASIN_TOKEN="your-token-here"

# Optional: API base URL (default: http://localhost:9000)
export DATABASIN_API_URL="https://api.databasin.com"

# Optional: Enable debug output
export DATABASIN_DEBUG=true
```

### Configuration File

Create `~/.databasin/config.json`:

```json
{
  "apiUrl": "https://api.databasin.com",
  "defaultProject": "proj-123",
  "output": {
    "format": "table",
    "colors": true
  }
}
```

**Note:** Authentication tokens are stored separately in `~/.databasin/.token` (created by `databasin auth login`).

## Output Formats

Control output format with global options:

```bash
# Table format (default)
databasin projects list

# JSON format
databasin projects list --json

# CSV format
databasin projects list --csv

# Filter specific fields
databasin projects list --fields id,name,status

# Combine options
databasin connectors list --json --fields id,name,type
```

## Common Workflows

### Setting Up a New Data Pipeline

```bash
# 1. List available connectors
databasin connectors list

# 2. Create a pipeline configuration
cat > my-pipeline.json << EOF
{
  "name": "Daily User Sync",
  "sourceConnector": "conn-123",
  "targetConnector": "conn-456",
  "schedule": "0 6 * * *"
}
EOF

# 3. Create and run the pipeline
databasin pipelines create my-pipeline.json
databasin pipelines run pipeline-789
```

### Monitoring Data Operations

```bash
# Check pipeline status
databasin pipelines get pipeline-789

# View recent logs
databasin pipelines logs pipeline-789

# List all automations
databasin automations list --project proj-123
```

### Data Exploration

```bash
# Explore database structure
databasin sql catalogs conn-123
databasin sql schemas conn-123 --catalog production
databasin sql tables conn-123 --catalog production --schema public

# Run exploratory queries
databasin sql exec conn-123 "SELECT COUNT(*) FROM users"
databasin sql exec conn-123 "DESCRIBE users" --csv > user_schema.csv
```

## Troubleshooting

### Authentication Issues

```bash
# Re-authenticate via browser
databasin auth login

# Verify your token is valid
databasin auth verify

# Check your current user context
databasin auth whoami
```

### Enable Debug Mode

For detailed diagnostic information:

```bash
# Enable debug output for a single command
DATABASIN_DEBUG=true databasin pipelines run pipeline-123

# Or enable globally
export DATABASIN_DEBUG=true
databasin connectors create connector.json
```

### Common Error Solutions

- **Token expired**: Run `databasin auth login` to re-authenticate
- **Project not found**: Use `databasin projects list` to verify project IDs  
- **Connector issues**: Check `databasin connectors get <id>` for connection status
- **Permission denied**: Verify your user has access with `databasin projects users <project-id>`

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.0 or later) - only for development
- Databasin API access token

### Building from Source

```bash
# Install dependencies
bun install

# Run type checking
bun run typecheck

# Run tests
bun test

# Build for all platforms
bun run build.ts
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/Databasin-AI/databasin-cli.git
cd databasin-cli

# Install dependencies
bun install

# Create global command (recommended)
bun run build
sudo ln -s $(pwd)/dist/databasin /usr/local/bin/databasin

# Verify installation
databasin --version
```

### Creating a Release

Use the release script to automate version bumping and releasing:

```bash
# Bump patch version (0.2.0 -> 0.2.1)
./scripts/release.sh patch

# Bump minor version (0.2.0 -> 0.3.0)
./scripts/release.sh minor

# Bump major version (0.2.0 -> 1.0.0)
./scripts/release.sh major

# Release a specific version
./scripts/release.sh 1.2.3

# Dry run to see what would happen
./scripts/release.sh patch --dry-run

# Create version and tag but don't push
./scripts/release.sh patch --no-push
```

The release script will:
1. Update the version in `package.json`
2. Create a commit with the version bump
3. Create a git tag (e.g., `v0.2.1`)
4. Push the commit and tag to the remote repository

Once pushed, the GitHub Actions workflow will automatically:
- Build the CLI for all platforms
- Run tests and type checking
- Publish to npm as `@databasin/cli`
- Create a GitHub release with build artifacts

## Support

- **Documentation**: Check the `docs/` directory for detailed guides
- **Examples**: See the `examples/` directory for sample configurations
- **Issues**: Report bugs and feature requests on the project repository

## License

This project is licensed under the CC-BY License. See LICENSE file for details.
