# Connectors Commands - Quick Start Guide

Fast reference for using Databasin CLI connector commands.

## Quick Commands

```bash
# Count connectors (default, efficient)
databasin connectors list

# List connectors with full details
databasin connectors list --full

# Get connector details
databasin connectors get conn-123

# Create connector from file
databasin connectors create mysql-config.json

# Update connector
databasin connectors update conn-123 updated-config.json

# Delete connector
databasin connectors delete conn-123
```

## Common Use Cases

### 1. Get connector count

```bash
# Count all connectors (minimal tokens)
databasin connectors list

# Count connectors in project
databasin connectors list --project 5QiuoY0J
```

### 2. Find connector by name

```bash
databasin connectors list --full --json | \
  jq '.[] | select(.connectorName | contains("MySQL"))'
```

### 3. List connectors with limited fields

```bash
# Save tokens: only show ID, name, type
databasin connectors list --full --fields "connectorID,connectorName,connectorType"

# With limit
databasin connectors list --full --fields "connectorID,connectorName,connectorType" --limit 20
```

### 4. List connectors in project

```bash
databasin connectors list --project 5QiuoY0J --full
```

### 5. Get connector details

```bash
databasin connectors get conn-123
```

### 6. Create connector from file

```bash
cat > mysql-prod.json << 'EOF'
{
  "projectId": "5QiuoY0J",
  "name": "Production MySQL",
  "type": "MySQL",
  "config": {
    "host": "mysql.company.com",
    "port": 3306,
    "database": "production",
    "username": "readonly",
    "password": "secure-password",
    "ssl": true
  }
}
EOF

databasin connectors create mysql-prod.json
```

### 7. Update connector

```bash
# Edit config
vim updated-config.json

# Update
databasin connectors update conn-123 updated-config.json
```

### 8. Delete connector

```bash
# With confirmation
databasin connectors delete conn-123

# Force delete
databasin connectors delete conn-123 --force
```

### 9. Export connectors to file

```bash
# Export with limited fields (token efficient)
databasin connectors list --full --fields "connectorID,connectorName,connectorType" \
  --json > connectors-backup.json

# Export all details (use sparingly)
databasin connectors list --full --json > connectors-full-backup.json
```

## Token Efficiency Tips

⚠️  **CRITICAL:** The connectors API can return 200,000+ tokens without optimization!

```bash
# Count only (default, ~1 token)
databasin connectors list

# Limited fields + limit (token efficient)
databasin connectors list --full \
  --fields "connectorID,connectorName,connectorType" \
  --limit 20

# Filter by project first
databasin connectors list --project 5QiuoY0J --full \
  --fields "connectorID,connectorName"

# DO NOT do this (200K+ tokens):
# databasin connectors list --full
```

## Output Formats

```bash
# Count only (default)
databasin connectors list

# Full details as table
databasin connectors list --full

# JSON (for scripts)
databasin connectors list --full --json

# CSV (for spreadsheets)
databasin connectors list --full --csv

# Specific fields only
databasin connectors list --full --fields "connectorID,connectorName,connectorType"
```

## Error Recovery

### "No connectors found"

```bash
# Solution: Check with full flag
databasin connectors list --full --limit 5

# Or filter by project
databasin connectors list --project 5QiuoY0J --full
```

### "Connector not found"

```bash
# Solution: List to find valid IDs
databasin connectors list --full --json | jq '.[].connectorID'
```

### "Access denied"

```bash
# Solution: Check project access
databasin projects get 5QiuoY0J
```

## Scripting Examples

### Find connectors by type

```bash
# Find all MySQL connectors
databasin connectors list --full --json | \
  jq '.[] | select(.connectorType == "MySQL")'

# Find all PostgreSQL connectors
databasin connectors list --full --json | \
  jq '.[] | select(.connectorType == "PostgreSQL")'
```

### Get connector count by project

```bash
for project in $(databasin projects list --json | jq -r '.[].internalID'); do
  echo "Project $project:"
  databasin connectors list --project $project
done
```

### Export specific connectors

```bash
#!/bin/bash
# export-connectors.sh - Export connectors by type

TYPE="${1:-MySQL}"
OUTPUT="connectors-$TYPE-backup.json"

databasin connectors list --full --json | \
  jq ".[] | select(.connectorType == \"$TYPE\")" > "$OUTPUT"

echo "Exported $TYPE connectors to $OUTPUT"
```

### Validate connector accessibility

```bash
#!/bin/bash
# test-connectors.sh - Test connector access

CONNECTORS=$(databasin connectors list --full --json)

echo "$CONNECTORS" | jq -r '.[].connectorID' | while read conn_id; do
  echo "Testing $conn_id..."
  if databasin connectors get "$conn_id" > /dev/null 2>&1; then
    echo "  ✅ Accessible"
  else
    echo "  ❌ Not accessible"
  fi
done
```

### List connectors by project

```bash
#!/bin/bash
# list-by-project.sh - Detailed project connector listing

PROJECT="$1"

if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <project-id>"
  exit 1
fi

echo "Connectors in project: $PROJECT"
echo "======================================"

CONNECTORS=$(databasin connectors list --project "$PROJECT" --full --json)

echo "$CONNECTORS" | jq -r '.[] | "\(.connectorName) (\(.connectorType)): \(.connectorID)"'

echo ""
echo "Total: $(echo "$CONNECTORS" | jq 'length') connectors"
```

## Configuration File Templates

### MySQL

```json
{
  "projectId": "5QiuoY0J",
  "name": "My MySQL Database",
  "type": "MySQL",
  "config": {
    "host": "mysql.example.com",
    "port": 3306,
    "database": "mydb",
    "username": "readonly_user",
    "password": "secure-password",
    "ssl": true
  }
}
```

### PostgreSQL

```json
{
  "projectId": "5QiuoY0J",
  "name": "My PostgreSQL Database",
  "type": "PostgreSQL",
  "config": {
    "host": "postgres.example.com",
    "port": 5432,
    "database": "mydb",
    "username": "readonly_user",
    "password": "secure-password",
    "schema": "public",
    "ssl": true
  }
}
```

### Snowflake

```json
{
  "projectId": "5QiuoY0J",
  "name": "My Snowflake Warehouse",
  "type": "Snowflake",
  "config": {
    "account": "company.us-east-1",
    "username": "etl_user",
    "password": "secure-password",
    "warehouse": "COMPUTE_WH",
    "database": "PRODUCTION",
    "schema": "PUBLIC",
    "role": "ETL_ROLE"
  }
}
```

## Quick Reference

| Task | Command |
|------|---------|
| Count connectors | `databasin connectors list` |
| List with details | `databasin connectors list --full` |
| Get details | `databasin connectors get conn-123` |
| Create | `databasin connectors create config.json` |
| Update | `databasin connectors update conn-123 config.json` |
| Delete | `databasin connectors delete conn-123` |
| Filter by project | `databasin connectors list --project 5QiuoY0J --full` |
| Limited fields | `databasin connectors list --full --fields "id,name,type"` |
| Export | `databasin connectors list --full --json > backup.json` |

## Token Efficiency Comparison

| Command | Tokens | Speed |
|---------|--------|-------|
| `list` (count) | ~10 | ⚡ Fast |
| `list --full --fields id,name --limit 20` | ~1-2K | 🚀 Fast |
| `list --full --limit 20` | ~5-10K | ✓ Good |
| `list --full --limit 100` | ~30-50K | ⚠️  Caution |
| `list --full` (all) | 200K+ | ❌ Avoid |

## Next Steps

- 📖 Full documentation: `docs/connectors.md` (renamed to `docs/connectors-guide.md`)
- 🔧 API documentation: `docs/connectors-client.md`
- 📋 Examples: `docs/usage-examples.md`
- 🚀 Getting started: `docs/quickstart.md`

---

**Happy connecting! 🔌**
