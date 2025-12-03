# Databasin CLI

Command-line interface for the [Databasin](https://databasin.ai) data integration platform.

## Installation

### npm (Node.js 20+ or Bun 1.3+)

```bash
# Install globally
npm install -g @databasin/cli

# Or run directly with npx
npx @databasin/cli --help
```

### Bun

```bash
bun add -g @databasin/cli
```

## Quick Start

```bash
# Login via browser
databasin auth login

# Verify authentication
databasin auth whoami

# List projects
databasin projects list

# List connectors
databasin connectors list

# Execute SQL query
databasin sql exec <connector-id> "SELECT * FROM users LIMIT 10"
```

## Commands

| Command | Description |
|---------|-------------|
| `auth` | Login, verify token, view user context |
| `projects` | List and manage projects |
| `connectors` | Create, update, delete data connectors |
| `pipelines` | Run and monitor data pipelines |
| `sql` | Execute SQL queries, explore schemas |
| `automations` | Manage and trigger automations |
| `api` | Generic API access (GET, POST, PUT, DELETE) |

## Configuration

```bash
# Authentication (set automatically by `databasin auth login`)
export DATABASIN_TOKEN="your-token"

# API URL (optional)
export DATABASIN_API_URL="https://api.databasin.ai"

# Debug mode (optional)
export DATABASIN_DEBUG=true
```

Or create `~/.databasin/config.json`:

```json
{
  "apiUrl": "https://api.databasin.ai",
  "output": { "format": "table", "colors": true }
}
```

## Output Formats

```bash
databasin projects list           # Table (default)
databasin projects list --json    # JSON
databasin projects list --csv     # CSV
databasin projects list --fields id,name  # Filter fields
```

## Documentation

For complete documentation, examples, and development guides:

**[https://github.com/databasin-ai/databasin-cli](https://github.com/databasin-ai/databasin-cli)**

## Support

- **Issues**: [GitHub Issues](https://github.com/databasin-ai/databasin-cli/issues)
- **Email**: support@databasin.ai

## License

CC-BY-4.0
