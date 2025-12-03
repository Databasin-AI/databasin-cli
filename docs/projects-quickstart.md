# Projects Commands - Quick Reference

## Commands

| Command               | Description                  | Interactive    |
| --------------------- | ---------------------------- | -------------- |
| `projects list`       | List all accessible projects | No             |
| `projects get [id]`   | Get project details          | Yes (if no id) |
| `projects users [id]` | List project users           | Yes (if no id) |
| `projects stats [id]` | Show project statistics      | Yes (if no id) |

## Common Options

| Option         | Description       | Applies To       |
| -------------- | ----------------- | ---------------- |
| `--count`      | Return count only | list             |
| `--limit <n>`  | Limit results     | list             |
| `--fields <f>` | Filter fields     | list, get, users |
| `--status <s>` | Filter by status  | list             |
| `--json`       | JSON output       | all              |
| `--csv`        | CSV output        | all              |
| `--no-color`   | Disable colors    | all              |
| `--debug`      | Debug mode        | all              |

## Quick Examples

```bash
# List all projects
databasin projects list

# Count projects
databasin projects list --count

# Limited fields
databasin projects list --fields id,name

# Get project (interactive)
databasin projects get

# Get project by ID
databasin projects get N1r8Do

# List project users
databasin projects users N1r8Do

# Show statistics
databasin projects stats N1r8Do

# Export to JSON
databasin projects list --json > projects.json

# Export to CSV
databasin projects users N1r8Do --csv > users.csv
```

## Output Formats

| Format | Flag      | Use Case                      |
| ------ | --------- | ----------------------------- |
| Table  | (default) | Human-readable console output |
| JSON   | `--json`  | Scripting, API integration    |
| CSV    | `--csv`   | Spreadsheets, data analysis   |

## Field Filtering

```bash
# Common fields for list
--fields id,name,internalID,organizationName

# Common fields for get
--fields name,description,createdDate

# Common fields for users
--fields email,firstName,lastName
```

## Token Efficiency Tips

```bash
# Most efficient to least efficient

# 1. Count only (smallest response)
databasin projects list --count

# 2. Limited fields
databasin projects list --fields id,name

# 3. Limited results
databasin projects list --limit 10

# 4. Full data (largest response)
databasin projects list
```

## Error Codes

| Error | Meaning      | Solution                   |
| ----- | ------------ | -------------------------- |
| 401   | Unauthorized | Check authentication token |
| 403   | Forbidden    | Check project permissions  |
| 404   | Not found    | Verify project ID          |
| 500   | Server error | Contact support            |

## Keyboard Shortcuts (Interactive Mode)

| Key    | Action   |
| ------ | -------- |
| ↑↓     | Navigate |
| Enter  | Select   |
| Ctrl+C | Cancel   |

## Environment Variables

```bash
# API URL
export DATABASIN_API_URL="http://localhost:9000"

# Output format
export DATABASIN_OUTPUT_FORMAT="json"

# Disable colors
export NO_COLOR=1

# Debug mode
export DATABASIN_DEBUG=true
```

## Scripting Patterns

```bash
# Get project count
COUNT=$(databasin projects list --count 2>/dev/null | tail -1)

# Get first project ID
ID=$(databasin projects list --fields internalID --csv | tail -n +2 | head -1)

# Parse JSON with jq
NAME=$(databasin projects get N1r8Do --json | jq -r '.name')

# Loop through projects
for id in $(databasin projects list --fields internalID --csv | tail -n +2); do
  echo "Processing $id"
  databasin projects stats "$id"
done
```

## Help

```bash
# Command help
databasin projects --help

# Subcommand help
databasin projects list --help
databasin projects get --help
databasin projects users --help
databasin projects stats --help

# Global help
databasin --help
```
