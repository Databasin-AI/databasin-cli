# Databasin CLI

A command-line interface for managing Databasin projects, connectors, pipelines, and data workflows.

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
# Authenticate via browser
databasin login

# Verify authentication
databasin auth whoami

# Enable shell completions (bash/zsh/fish)
databasin completion install
```

## Quick Examples

```bash
# Projects
databasin projects list
databasin projects get <project-id>

# Connectors
databasin connectors list --full
databasin connectors test <connector-id>
databasin connectors config Postgres --screens

# Pipelines
databasin pipelines list --project <project-id>
databasin pipelines wizard                         # Interactive creator
databasin pipelines run <pipeline-id>
databasin pipelines logs <pipeline-id>

# SQL Queries
databasin sql tables <connector-id>
databasin sql exec <connector-id> "SELECT * FROM users LIMIT 10"

# Automations
databasin automations list --project <project-id>
databasin automations run <automation-id>

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

| Guide | Description |
|-------|-------------|
| [Quickstart](./docs/quickstart.md) | Get up and running |
| [Projects Guide](./docs/projects-guide.md) | Project management |
| [Connectors Guide](./docs/connectors-guide.md) | Data connector operations |
| [Pipelines Guide](./docs/pipelines-guide.md) | Pipeline creation and execution |
| [Automations Guide](./docs/automations-guide.md) | Automation workflows |
| [Observability Guide](./docs/observability-guide.md) | Logs, history, and monitoring |
| [Shell Completions](./docs/shell-completion.md) | Bash/Zsh/Fish setup |
| [Developer Guide](./docs/developers.md) | Local dev, SDK usage, releases |

## Self-Update

```bash
databasin update --check    # Check for updates
databasin update            # Update to latest
```

## Troubleshooting

```bash
# Re-authenticate
databasin login

# Verify token
databasin auth verify

# Debug mode
DATABASIN_DEBUG=true databasin <command>
```

## Support

- [GitHub Issues](https://github.com/Databasin-AI/databasin-cli/issues)
- [Examples](./examples/)

## License

CC-BY-4.0 - See [LICENSE](./LICENSE) for details.
