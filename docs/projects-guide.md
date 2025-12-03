# Projects Commands - User Guide

## Overview

The `projects` command group provides comprehensive project management capabilities for the DataBasin CLI. Use these commands to list, inspect, and analyze your DataBasin projects.

## Quick Start

```bash
# List all your projects
databasin projects list

# Get details about a specific project
databasin projects get N1r8Do

# See who has access to a project
databasin projects users N1r8Do

# View project statistics
databasin projects stats N1r8Do
```

## Commands

### `projects list`

List all projects you have access to.

**Usage:**

```bash
databasin projects list [options]
```

**Options:**

- `--count` - Return only the count of projects (faster, more efficient)
- `--limit <number>` - Limit number of results
- `--fields <fields>` - Comma-separated list of fields to display
- `--status <status>` - Filter by status (active, inactive)
- `--json` - Output in JSON format
- `--csv` - Output in CSV format

**Examples:**

```bash
# Basic list (table format)
databasin projects list

# Get count only (efficient)
databasin projects list --count

# Show only 5 most recent
databasin projects list --limit 5

# Show only specific fields
databasin projects list --fields id,name,organizationName

# Export to CSV with limited fields
databasin projects list --csv --fields id,name,createdDate > projects.csv

# Filter active projects only
databasin projects list --status active

# Combine multiple options
databasin projects list --fields id,name --limit 10 --json
```

**Output (Table):**

```
Fetching projects...
✔ Fetched 3 projects

┌──────────┬─────────────────┬──────────────┬──────────────────┐
│ id       │ name            │ internalID   │ organizationName │
├──────────┼─────────────────┼──────────────┼──────────────────┤
│ 123      │ Analytics       │ N1r8Do       │ ACME Corp        │
│ 456      │ Data Warehouse  │ M2k9Ep       │ ACME Corp        │
│ 789      │ ETL Pipeline    │ P3j7Fq       │ Beta Inc         │
└──────────┴─────────────────┴──────────────┴──────────────────┘
```

**Token Efficiency:**

When fetching large numbers of projects, use these options to reduce API response size:

- `--count` - Only get the count, not full data
- `--fields` - Request only needed fields
- `--limit` - Reduce number of results

The CLI will warn you if response size exceeds thresholds and suggest optimizations.

---

### `projects get`

Get detailed information about a specific project.

**Usage:**

```bash
databasin projects get [id] [options]
```

**Arguments:**

- `id` - Project ID (internal ID like "N1r8Do" or numeric ID)
  - If omitted, an interactive prompt will ask you to select a project

**Options:**

- `--fields <fields>` - Comma-separated list of fields to display
- `--json` - Output in JSON format
- `--csv` - Output in CSV format

**Examples:**

```bash
# Get project details by ID
databasin projects get N1r8Do

# Interactive selection
databasin projects get
# ? Select a project: (Use arrow keys)
#   ❯ Analytics (N1r8Do)
#     Data Warehouse (M2k9Ep)
#     ETL Pipeline (P3j7Fq)

# Show specific fields only
databasin projects get N1r8Do --fields name,description,createdDate

# Get as JSON for scripting
databasin projects get N1r8Do --json

# Export details to file
databasin projects get N1r8Do --json > project-details.json
```

**Output (Table):**

```
Fetching project details...
✔ Project retrieved

┌─────────────────┬────────────────────────────────────┐
│ Field           │ Value                              │
├─────────────────┼────────────────────────────────────┤
│ id              │ 123                                │
│ name            │ Analytics Platform                 │
│ internalID      │ N1r8Do                             │
│ description     │ Real-time analytics and reporting  │
│ organizationId  │ 456                                │
│ organizationName│ ACME Corp                          │
│ createdDate     │ 2024-01-15T10:30:00Z               │
│ deleted         │ false                              │
└─────────────────┴────────────────────────────────────┘
```

---

### `projects users`

List all users who have access to a project.

**Usage:**

```bash
databasin projects users [id] [options]
```

**Arguments:**

- `id` - Project ID
  - If omitted, an interactive prompt will ask you to select a project

**Options:**

- `--fields <fields>` - Comma-separated list of fields to display
- `--json` - Output in JSON format
- `--csv` - Output in CSV format

**Examples:**

```bash
# List all users in a project
databasin projects users N1r8Do

# Interactive selection
databasin projects users

# Show specific user fields
databasin projects users N1r8Do --fields email,firstName,lastName

# Export user list to CSV
databasin projects users N1r8Do --csv > project-users.csv

# Get full user data as JSON
databasin projects users N1r8Do --json
```

**Output (Table):**

```
Fetching project users...
✔ Fetched 5 users

┌──────────────────────┬────────────┬──────────┬──────────┐
│ email                │ firstName  │ lastName │ enabled  │
├──────────────────────┼────────────┼──────────┼──────────┤
│ john@example.com     │ John       │ Doe      │ true     │
│ jane@example.com     │ Jane       │ Smith    │ true     │
│ bob@example.com      │ Bob        │ Johnson  │ true     │
│ alice@example.com    │ Alice      │ Williams │ true     │
│ charlie@example.com  │ Charlie    │ Brown    │ false    │
└──────────────────────┴────────────┴──────────┴──────────┘
```

---

### `projects stats`

Show project statistics including connector, pipeline, and automation counts.

**Usage:**

```bash
databasin projects stats [id]
```

**Arguments:**

- `id` - Project ID
  - If omitted, an interactive prompt will ask you to select a project

**Examples:**

```bash
# Show project statistics
databasin projects stats N1r8Do

# Interactive selection
databasin projects stats

# Get stats as JSON
databasin projects stats N1r8Do --json

# Export stats to CSV
databasin projects stats N1r8Do --csv > project-stats.csv
```

**Output (Table):**

```
Fetching project statistics...
✔ Statistics retrieved

┌─────────────────┬───────┐
│ Metric          │ Count │
├─────────────────┼───────┤
│ connectorCount  │ 12    │
│ pipelineCount   │ 8     │
│ automationCount │ 5     │
└─────────────────┴───────┘
```

---

## Global Options

All `projects` commands support these global options:

### Output Formats

**`--json`** - Output in JSON format

```bash
databasin projects list --json
# [{"id": 123, "name": "Analytics", ...}]
```

**`--csv`** - Output in CSV format (RFC 4180 compliant)

```bash
databasin projects list --csv
# id,name,internalID,organizationName
# 123,"Analytics","N1r8Do","ACME Corp"
```

### Display Options

**`--no-color`** - Disable colored output

```bash
databasin projects list --no-color
```

**`--verbose`** - Enable verbose logging

```bash
databasin projects list --verbose
```

**`--debug`** - Enable debug mode with stack traces

```bash
databasin projects get invalid-id --debug
```

### API Configuration

**`--api-url <url>`** - Override API base URL

```bash
databasin projects list --api-url https://api.databasin.com
```

**`--token <token>`** - Override authentication token

```bash
databasin projects list --token "your-jwt-token"
```

---

## Interactive Mode

When you omit required project IDs, commands enter interactive mode with a selection menu:

```bash
$ databasin projects get

? Select a project: (Use arrow keys)
  ❯ Analytics Platform (N1r8Do)
    Data Warehouse (M2k9Ep)
    ETL Pipeline (P3j7Fq)
```

**Navigation:**

- ↑↓ - Move selection
- Enter - Confirm selection
- Ctrl+C - Cancel

---

## Error Handling

The CLI provides helpful error messages with actionable suggestions:

### Project Not Found

```bash
$ databasin projects get invalid-id

✖ Project not found
  Project ID: invalid-id
  Suggestion: Run 'databasin projects list' to see available projects
```

### Access Denied

```bash
$ databasin projects get restricted-id

✖ Access denied
  Project ID: restricted-id
  Suggestion: You don't have permission to access this project
```

### No Projects Available

```bash
$ databasin projects list

Fetching projects...
✔ No projects found
```

---

## Scripting Examples

### Export All Projects to JSON

```bash
databasin projects list --json > all-projects.json
```

### Get Project Count

```bash
PROJECT_COUNT=$(databasin projects list --count 2>/dev/null | tail -1)
echo "Total projects: $PROJECT_COUNT"
```

### Export User Lists for All Projects

```bash
# List all project IDs
PROJECT_IDS=$(databasin projects list --fields internalID --csv | tail -n +2)

# Export users for each project
for id in $PROJECT_IDS; do
  databasin projects users "$id" --csv > "users-$id.csv"
done
```

### Compare Statistics

```bash
# Get stats for multiple projects
for id in N1r8Do M2k9Ep P3j7Fq; do
  echo "Stats for $id:"
  databasin projects stats "$id"
  echo ""
done
```

### Filter and Export

```bash
# Export active projects with specific fields
databasin projects list \
  --status active \
  --fields id,name,organizationName,createdDate \
  --csv > active-projects.csv
```

---

## Best Practices

### 1. Use Token-Efficient Options

When working with large datasets:

```bash
# Bad: Fetches all data
databasin projects list

# Good: Get count only
databasin projects list --count

# Good: Limit fields
databasin projects list --fields id,name

# Good: Limit results
databasin projects list --limit 20
```

### 2. Save Frequently Used Project IDs

```bash
# Save to environment variable
export MY_PROJECT_ID="N1r8Do"

# Use in commands
databasin projects get $MY_PROJECT_ID
databasin projects users $MY_PROJECT_ID
```

### 3. Use JSON for Scripting

```bash
# Parse JSON output with jq
PROJECT_NAME=$(databasin projects get N1r8Do --json | jq -r '.name')
echo "Project: $PROJECT_NAME"
```

### 4. Combine with Other Commands

```bash
# Get all connectors in a project (future command)
PROJECT_ID=$(databasin projects list --fields internalID --limit 1 --csv | tail -1)
databasin connectors list --project $PROJECT_ID
```

---

## Configuration

Projects commands use the global CLI configuration from `~/.databasin/config.json`:

```json
{
	"apiUrl": "http://localhost:9000",
	"defaultProject": "N1r8Do",
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

### Set Default Project

```bash
# Edit config file
vim ~/.databasin/config.json

# Or use environment variable
export DATABASIN_DEFAULT_PROJECT="N1r8Do"
```

### Set Default Output Format

```bash
# Environment variable
export DATABASIN_OUTPUT_FORMAT="json"

# Or in config file
{
  "output": {
    "format": "json"
  }
}
```

---

## Troubleshooting

### Command Not Found

Ensure the CLI is installed and in your PATH:

```bash
which databasin
# Or for development:
cd /path/to/databasin-sv/src/cli
bun run src/index.ts projects list
```

### Authentication Errors

Check your token is valid:

```bash
# View stored token (first 20 chars)
head -c 20 ~/.databasin/token && echo "..."

# Verify token works
databasin auth verify
```

### Connection Errors

Verify API URL is correct:

```bash
# Check configuration
cat ~/.databasin/config.json | grep apiUrl

# Test with explicit URL
databasin projects list --api-url http://localhost:9000
```

### Slow Performance

Use token-efficient options:

```bash
# Instead of fetching all data
databasin projects list --limit 20 --fields id,name
```

---

## Support

For issues, questions, or feature requests:

1. Check this documentation
2. Review error messages for suggestions
3. Use `--debug` flag for detailed error information
4. Consult the API documentation
5. Contact DataBasin support

---

## Related Commands

- `databasin auth` - Manage authentication
- `databasin connectors` - Manage project connectors (coming soon)
- `databasin pipelines` - Manage project pipelines (coming soon)
- `databasin automations` - Manage project automations (coming soon)
