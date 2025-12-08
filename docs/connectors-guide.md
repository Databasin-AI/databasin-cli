# Connectors Commands

Manage Databasin data connectors through the CLI.

## Critical Token Efficiency Notice

**⚠️ IMPORTANT:** The connectors API can return **200,000+ tokens** for all connectors without optimization.

The `list` command **defaults to count mode** to prevent massive token usage. You must explicitly use the `--full` flag to fetch complete connector objects.

## Commands

### `databasin connectors list`

List connectors with token-efficient defaults.

**Default behavior (count mode):**

```bash
# Get count only (minimal tokens)
databasin connectors list

# Output:
# ✔ Total connectors: 434
#
# ⚠ Use --full to fetch full connector objects
```

**Full mode with optimization:**

```bash
# Get limited connector data
databasin connectors list --full --fields connectorID,connectorName,connectorType --limit 20

# Filter by project
databasin connectors list --project N1r8Do --full

# Get all connectors (use sparingly!)
databasin connectors list --full
```

**Options:**

- `-p, --project <id>` - Filter by project internal ID
- `--full` - Fetch full connector objects (may return large response)
- `--fields <fields>` - Comma-separated list of fields (only with --full)
- `--limit <number>` - Limit number of results (only with --full)

**Examples:**

```bash
# Count all connectors
databasin connectors list
# Output: 434

# Count connectors in a project
databasin connectors list --project N1r8Do
# Output: 12

# Get basic info for first 10 connectors
databasin connectors list --full --limit 10 --fields connectorID,connectorName,status

# Get all connectors as JSON (for scripting)
databasin connectors list --full --json

# Get all connectors as CSV for export
databasin connectors list --full --csv > connectors.csv
```

**Token Efficiency Warning:**

If response exceeds 50KB, you'll see:

```
⚠ MODERATE TOKEN USAGE WARNING
   Response size: 75.2 KB
   Estimated tokens: ~18,800

   Suggestions to reduce token usage:
   • Use count mode (default) to get count only
   • Use --fields to limit displayed fields
   • Use --limit to reduce number of results
   • Use --project to filter by project
```

---

### `databasin connectors get`

Get detailed information about a specific connector.

**Usage:**

```bash
# With connector ID
databasin connectors get conn-abc123

# Interactive (prompts for connector selection)
databasin connectors get

# Filter connector list by project (for interactive prompt)
databasin connectors get --project N1r8Do

# Get specific fields only
databasin connectors get conn-abc123 --fields connectorID,connectorName,status,configuration

# Output as JSON
databasin connectors get conn-abc123 --json
```

**Arguments:**

- `[id]` - Connector ID (optional, will prompt if not provided)

**Options:**

- `--fields <fields>` - Comma-separated list of fields to display
- `-p, --project <id>` - Filter connector list by project (for interactive prompt)

**Example Output (table format):**

```
✔ Connector retrieved

┌────────────────┬───────────────────────────────────┐
│ Field          │ Value                             │
├────────────────┼───────────────────────────────────┤
│ connectorID    │ conn-abc123                       │
│ connectorName  │ MySQL Production                  │
│ connectorType  │ database                          │
│ status         │ active                            │
│ internalID     │ N1r8Do                            │
│ configuration  │ {                                 │
│                │   "host": "db.example.com",       │
│                │   "port": 3306,                   │
│                │   "database": "production"        │
│                │ }                                 │
│ createdAt      │ 2025-01-15T10:30:00Z              │
│ updatedAt      │ 2025-01-20T14:22:00Z              │
└────────────────┴───────────────────────────────────┘
```

**Error Handling:**

```bash
# Connector not found
$ databasin connectors get invalid-id
✖ Connector not found
  Connector ID: invalid-id
  Suggestion: Run 'databasin connectors list --full' to see available connectors

# Access denied
$ databasin connectors get conn-restricted
✖ Access denied
  Connector ID: conn-restricted
  Suggestion: You don't have permission to access this connector
```

---

### `databasin connectors inspect`

Comprehensive connector analysis in a single command - connection testing, metadata, configuration, database structure, pipeline usage, and quick actions.

**Usage:**

```bash
# Inspect by connector ID
databasin connectors inspect 5459

# Inspect by name (case-insensitive partial match)
databasin connectors inspect "postgres"
databasin connectors inspect "Starling"
```

**Arguments:**

- `<id-or-name>` - Connector ID (numeric) or connector name (partial match)

**Features:**

1. **Connection Testing** - Tests the connector and displays status (Active/Failed/Error)
2. **Metadata Display** - Shows ID, name, type, subtype, project ID, creation date
3. **Configuration Details** - Displays connection settings with sensitive data sanitized
4. **Database Structure** (SQL connectors only) - Shows databases, schemas, and tables
5. **Pipeline Usage** - Lists all pipelines using this connector
6. **Quick Actions** - Provides ready-to-use command suggestions

**Example Output:**

```
$ databasin connectors inspect 5459

✔ Connector found
✔ Connection successful

Connector: StarlingPostgres (5459)
Type: postgres
Subtype: PostgreSQL
Project ID: N1r8Do
Created: 10/15/2024
Status: Active

Connection Details:
  Host: postgres.example.com
  Port: 5432
  Database: production
  SSL: Enabled

Database Structure:
  └─ postgres (database)
      ├─ public (schema)
      │   ├─ users
      │   ├─ sessions
      │   └─ orders
      └─ config (schema)
          ├─ settings
          └─ audit_log

Pipeline Usage:
  Used in 3 pipeline(s):
    • Daily User Sync (8901) - Source
    • Weekly Orders Export (8902) - Source
    • Session Analytics (8903) - Source

Quick Actions:
  $ databasin sql exec 5459 "SELECT * FROM users LIMIT 5"
  $ databasin sql discover 5459
  $ databasin pipelines create --source 5459
  $ databasin connectors test 5459
  $ databasin connectors update 5459
```

**Supported SQL Connector Types:**
- PostgreSQL, MySQL, MariaDB
- SQL Server, Oracle
- Snowflake, Databricks, Redshift
- BigQuery, Trino, Presto
- DB2, Sybase

**Error Handling:**

```bash
# Connector not found
$ databasin connectors inspect nonexistent
✖ No connector found matching "nonexistent"

# Multiple matches
$ databasin connectors inspect "postgres"
✖ Multiple connectors found matching "postgres"

Multiple matches found:
  • Test Postgres 1 (5459)
  • Test Postgres 2 (5460)

Please specify a more specific name or use the connector ID
```

**See Also:**
- Full documentation: `/docs/connectors-inspect.md`
- `databasin connectors get <id>` - Get raw connector data
- `databasin sql discover <id>` - Detailed database structure
- `databasin connectors test <id>` - Connection test only

---

### `databasin connectors create`

Create a new connector from a JSON file or through an interactive wizard.

**Usage:**

**From file:**

```bash
# Create from configuration file
databasin connectors create mysql-config.json

# Override project ID from command line
databasin connectors create mysql-config.json --project N1r8Do
```

**Interactive wizard:**

```bash
# Launch interactive creation wizard
databasin connectors create

# Interactive with pre-selected project
databasin connectors create --project N1r8Do
```

**Arguments:**

- `[file]` - JSON file with connector configuration (optional, launches wizard if not provided)

**Options:**

- `-p, --project <id>` - Project ID for the connector

**JSON Configuration Format:**

```json
{
	"connectorName": "MySQL Production Database",
	"connectorType": "database",
	"internalID": "proj-123",
	"configuration": {
		"host": "db.example.com",
		"port": 3306,
		"database": "production",
		"username": "app_user",
		"ssl": true
	},
	"status": "active"
}
```

**Required Fields:**

- `connectorName` - Human-readable name
- `connectorType` - Connector type (database, app, file & api, cloud)
- `internalID` - Project internal ID (can be overridden with --project flag)

**Optional Fields:**

- `configuration` - Connector-specific configuration object
- `status` - Operational status (active, inactive, error, pending)

**Example Session:**

```bash
$ databasin connectors create mysql-config.json

📋 Connector Configuration:
  Name: MySQL Production Database
  Type: database
  Project: N1r8Do

? Create this connector? (Y/n) y
⠋ Creating connector...
✔ Connector created successfully

✔ Connector Details:
  ID: conn-xyz789
  Name: MySQL Production Database
  Type: database
  Status: active
```

**Interactive Wizard Example:**

```bash
$ databasin connectors create

📝 Interactive Connector Creation

? Select project for connector: Production Environment (N1r8Do)
? Enter connector name: PostgreSQL Analytics
? Select connector type: Database
? Host: analytics-db.example.com
? Port: 5432
? Database name: analytics
? Username: analytics_user
? Include password in configuration? No

📋 Connector Configuration:
  Name: PostgreSQL Analytics
  Type: database
  Project: N1r8Do

? Create this connector? (Y/n) y
⠋ Creating connector...
✔ Connector created successfully

✔ Connector Details:
  ID: conn-new123
  Name: PostgreSQL Analytics
  Type: database
  Status: active
```

**Example Configuration Files:**

See `examples/` directory:

- `connector-create-mysql.json` - MySQL database connector
- `connector-create-api.json` - REST API connector
- `connector-create-s3.json` - AWS S3 connector

---

### `databasin connectors update`

Update an existing connector's configuration.

**Usage:**

**From file:**

```bash
# Update from configuration file
databasin connectors update conn-abc123 update-config.json

# Partial update (only specified fields)
databasin connectors update conn-abc123 partial-update.json
```

**Interactive mode:**

```bash
# Launch interactive update wizard
databasin connectors update conn-abc123
```

**Arguments:**

- `<id>` - Connector ID (required)
- `[file]` - JSON file with updated configuration (optional, launches wizard if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for filtering in interactive mode)

**Update Configuration Format:**

```json
{
	"connectorName": "MySQL Production DB (Updated)",
	"status": "active",
	"configuration": {
		"host": "db2.example.com",
		"port": 3307
	}
}
```

**Notes:**

- Only provided fields are updated (partial update)
- Configuration fields are merged with existing configuration
- Use full configuration object to replace entirely

**Example Session:**

```bash
$ databasin connectors update conn-abc123 update.json

📋 Fields to Update:
  connectorName: MySQL Production DB (Updated)
  status: active
  configuration: {
    "host": "db2.example.com",
    "port": 3307
  }

? Apply these updates? (Y/n) y
⠋ Updating connector...
✔ Connector updated successfully

✔ Updated Connector:
  ID: conn-abc123
  Name: MySQL Production DB (Updated)
  Status: active
  Updated Fields: connectorName, status, configuration
```

**Interactive Update Example:**

```bash
$ databasin connectors update conn-abc123

📝 Interactive Connector Update

⠋ Fetching current connector...
✔ Connector loaded

Current configuration:
  Name: MySQL Production
  Type: database
  Status: active

? Update connector name? No
? Update status? Yes
? Select new status: inactive
? Update configuration? No

📋 Fields to Update:
  status: inactive

? Apply these updates? (Y/n) y
⠋ Updating connector...
✔ Connector updated successfully

✔ Updated Connector:
  ID: conn-abc123
  Name: MySQL Production
  Status: inactive
  Updated Fields: status
```

---

### `databasin connectors delete`

Delete a connector with confirmation.

**⚠️ WARNING:** This action cannot be undone!

**Usage:**

```bash
# Delete with confirmation prompt
databasin connectors delete conn-abc123

# Skip confirmation (for scripts)
databasin connectors delete conn-abc123 --yes
```

**Arguments:**

- `<id>` - Connector ID (required)

**Options:**

- `-y, --yes` - Skip confirmation prompt
- `-p, --project <id>` - Project ID (not used, for consistency)

**Example Session:**

```bash
$ databasin connectors delete conn-abc123

⠋ Fetching connector details...
✔ Connector: MySQL Production (conn-abc123)

⚠ WARNING: This action cannot be undone!
  Connector: MySQL Production
  Type: database
  ID: conn-abc123

? Are you sure you want to delete this connector? (y/N) y
⠋ Deleting connector...
✔ Connector deleted successfully

✔ Deleted connector: MySQL Production
```

**Skip Confirmation:**

```bash
$ databasin connectors delete conn-abc123 --yes
⠋ Deleting connector...
✔ Connector deleted successfully

✔ Deleted connector: MySQL Production
```

**Error Handling:**

```bash
# Connector not found
$ databasin connectors delete invalid-id
✖ Connector not found
  Connector ID: invalid-id

# Access denied
$ databasin connectors delete conn-restricted
✖ Access denied
  Connector ID: conn-restricted
  Suggestion: You don't have permission to delete this connector
```

---

### `databasin connectors test`

Test a connector's connection to verify credentials and configuration.

**Usage:**

```bash
# Test specific connector
databasin connectors test conn-abc123

# Interactive (prompts for connector selection)
databasin connectors test

# Filter connector list by project (for interactive mode)
databasin connectors test --project N1r8Do
```

**Arguments:**

- `[id]` - Connector ID (optional, will prompt if not provided)

**Options:**

- `-p, --project <id>` - Filter connector list by project (for interactive prompt)

**Successful Test:**

```bash
$ databasin connectors test conn-abc123

⠋ Testing connector connection...
✔ Connection test succeeded

✔ Connection successful to MySQL Production database

Connection Details:
  serverVersion: 8.0.32
  database: production
  uptime: 2592000
```

**Failed Test:**

```bash
$ databasin connectors test conn-abc123

⠋ Testing connector connection...
✖ Connection test failed

✖ Unable to connect to database

Error Details:
  error: ECONNREFUSED
  host: db.example.com
  port: 3306
  details: Connection refused by remote server
```

**Interactive Mode:**

```bash
$ databasin connectors test

? Select connector to test:
  ❯ MySQL Production (database) - conn-abc123
    Salesforce API (app) - conn-def456
    S3 Bucket (cloud) - conn-ghi789

⠋ Testing connector connection...
✔ Connection test succeeded
```

---

### `databasin connectors config`

Get connector configuration details including pipeline workflow screens, category, and requirements.

**Usage:**

```bash
# Get configuration for a specific connector type
databasin connectors config Postgres

# Include detailed screen workflow information
databasin connectors config Postgres --screens

# List all available connector configurations
databasin connectors config --all

# JSON output format
databasin connectors config Snowflake --json
```

**Arguments:**

- `[subtype]` - Connector subtype name (e.g., "Postgres", "MySQL", "Snowflake")

**Options:**

- `--screens` - Include detailed pipeline workflow screen information
- `--all` - List all available connector configurations

**Basic Configuration:**

```bash
$ databasin connectors config Postgres

⠋ Fetching configuration for Postgres...
✔ Configuration loaded for Postgres

Connector Configuration: Postgres

  Category: RDBMS
  Active: Yes
  Required Screens: 6, 7, 2, 3, 4, 5

💡 Tip: Use --screens to see detailed screen information
💡 Tip: Use --all to list all available connector configurations
```

**With Screen Details:**

```bash
$ databasin connectors config Postgres --screens

Connector Configuration: Postgres

  Category: RDBMS
  Active: Yes
  Required Screens: 6, 7, 2, 3, 4, 5

Pipeline Workflow Screens:
  1. [6] Database
     Please choose a database/catalog that contains the schemas you are interested in ingesting
  2. [7] Schemas
     Please choose a schema that contains the tables you are interested in ingesting
  3. [2] Artifacts
     Please select the objects you would like to include in this pipeline
  4. [3] Columns
     Uncheck any columns you wish to restrict from the data ingestion, for a given table
  5. [4] Data Ingestion Options
     Please review the information generated to ensure its accuracy and make changes before saving the pipeline
  6. [5] Final Configuration
     Create tags, set the pipeline schedule, and choose a workload size
```

**List All Connectors:**

```bash
$ databasin connectors config --all

⠋ Fetching all connector configurations...
✔ Fetched 51 connector configurations

┌───────────────────────────────┬──────────────────┬────────┐
│ connectorName                 │ category         │ active │
├───────────────────────────────┼──────────────────┼────────┤
│ Anthropic API                 │ AI & LLM         │ true   │
│ Azure OpenAI                  │ AI & LLM         │ true   │
│ OpenAI API                    │ AI & LLM         │ true   │
│ CosmosDB                      │ Big Data & NoSQL │ true   │
│ Databricks                    │ Big Data & NoSQL │ true   │
│ Lakehouse                     │ Big Data & NoSQL │ true   │
│ Microsoft Fabric              │ Big Data & NoSQL │ true   │
│ MongoDB                       │ Big Data & NoSQL │ true   │
│ Snowflake                     │ Big Data & NoSQL │ true   │
│ ...                           │ ...              │ ...    │
└───────────────────────────────┴──────────────────┴────────┘
```

**JSON Output:**

```bash
$ databasin connectors config Snowflake --screens --json

{
  "connectorName": "Snowflake",
  "category": "Big Data & NoSQL",
  "active": true,
  "pipelineRequiredScreens": [6, 7, 2, 3, 4, 5],
  "screenDetails": [
    {
      "screenID": 6,
      "screenName": "Database",
      "description": "Please choose a database/catalog..."
    },
    ...
  ]
}
```

**Use Cases:**

1. **Understanding Pipeline Workflows** - See which screens are required for each connector type
2. **Connector Discovery** - Find available connector types and categories
3. **Automation** - Use JSON output to programmatically determine workflow requirements
4. **Documentation** - Export connector configurations for reference

---

## Global Options

All commands support these global options:

- `--json` - Output in JSON format
- `--csv` - Output in CSV format
- `--verbose` - Enable verbose logging
- `--no-color` - Disable colored output
- `--debug` - Enable debug mode with stack traces
- `--api-url <url>` - Override API base URL
- `--token <token>` - Override authentication token

**Examples:**

```bash
# Get connectors as JSON
databasin connectors list --full --json

# Debug mode for troubleshooting
databasin connectors get conn-abc123 --debug

# Export to CSV
databasin connectors list --full --csv > connectors.csv

# Verbose output
databasin connectors create config.json --verbose
```

---

## Scripting Examples

### Count Connectors Across Projects

```bash
#!/bin/bash
# Count connectors in each project

for project in proj-123 proj-456 proj-789; do
  count=$(databasin connectors list --project $project)
  echo "Project $project: $count connectors"
done
```

### Bulk Export Connector Configurations

```bash
#!/bin/bash
# Export all connector configurations to JSON files

# Get all connector IDs
ids=$(databasin connectors list --full --json | jq -r '.[].connectorID')

# Export each connector
for id in $ids; do
  databasin connectors get $id --json > "connectors/${id}.json"
  echo "Exported $id"
done
```

### Monitor Connector Status

```bash
#!/bin/bash
# Check status of all connectors and report errors

databasin connectors list --full --fields connectorID,connectorName,status --json | \
  jq -r '.[] | select(.status == "error") | "\(.connectorID): \(.connectorName)"'
```

### Create Multiple Connectors

```bash
#!/bin/bash
# Create connectors from multiple config files

for file in configs/*.json; do
  echo "Creating connector from $file..."
  databasin connectors create "$file" --project N1r8Do
done
```

---

## Best Practices

### 1. Use Count Mode First

Always start with count mode to avoid large responses:

```bash
# Check how many connectors exist
databasin connectors list

# If count is reasonable, fetch with optimizations
databasin connectors list --full --limit 50
```

### 2. Filter by Project

Reduce response size by filtering to specific projects:

```bash
databasin connectors list --project N1r8Do --full
```

### 3. Select Minimal Fields

Only fetch fields you need:

```bash
databasin connectors list --full --fields connectorID,connectorName,status
```

### 4. Use JSON for Scripting

JSON output is easier to parse programmatically:

```bash
connectors=$(databasin connectors list --full --json)
echo $connectors | jq '.[] | select(.status == "active")'
```

### 5. Validate Before Creating

Always review connector configuration before creation:

```bash
# Review config file
cat mysql-config.json

# Test with --dry-run (if available)
# Or manually confirm during interactive mode
```

### 6. Back Up Before Deleting

Export connector configuration before deletion:

```bash
# Export first
databasin connectors get conn-abc123 --json > backup.json

# Then delete
databasin connectors delete conn-abc123
```

---

## Common Workflows

### Create Database Connector

```bash
# 1. Create configuration file
cat > postgres-prod.json <<EOF
{
  "connectorName": "PostgreSQL Production",
  "connectorType": "database",
  "internalID": "N1r8Do",
  "configuration": {
    "host": "prod-db.example.com",
    "port": 5432,
    "database": "production",
    "username": "app_user",
    "ssl": true
  },
  "status": "active"
}
EOF

# 2. Create connector
databasin connectors create postgres-prod.json

# 3. Verify creation
databasin connectors get <connector-id>
```

### Update Connector Host

```bash
# 1. Export current config
databasin connectors get conn-abc123 --json > current.json

# 2. Edit configuration
# (manually edit current.json to change host)

# 3. Apply update
databasin connectors update conn-abc123 current.json
```

### Migrate Connector to New Project

```bash
# 1. Export connector
databasin connectors get conn-abc123 --json > connector-backup.json

# 2. Update project ID in file
# (edit connector-backup.json, change internalID)

# 3. Create in new project
databasin connectors create connector-backup.json

# 4. Delete from old project (after verification)
databasin connectors delete conn-abc123
```

---

## Troubleshooting

### "Connector not found" Error

**Problem:** Getting 404 errors when accessing connector

```bash
✖ Connector not found
  Connector ID: conn-abc123
```

**Solutions:**

1. List available connectors: `databasin connectors list --full`
2. Check project access permissions
3. Verify connector ID is correct
4. Use interactive mode: `databasin connectors get`

### Large Token Usage Warnings

**Problem:** Getting token efficiency warnings

```
⚠ HIGH TOKEN USAGE WARNING
   Response size: 250 KB
   Estimated tokens: ~62,500
```

**Solutions:**

1. Use count mode: `databasin connectors list` (default)
2. Add field filtering: `--fields connectorID,connectorName,status`
3. Add limit: `--limit 20`
4. Filter by project: `--project N1r8Do`

### Invalid Configuration Errors

**Problem:** Connector creation/update fails validation

```bash
✖ Invalid connector configuration
  Error: Missing required field 'host'
```

**Solutions:**

1. Check required fields for connector type
2. Validate JSON syntax: `cat config.json | jq`
3. Review example configurations in `examples/` directory
4. Use interactive mode for guided input

### Access Denied Errors

**Problem:** Permission errors when accessing connectors

```bash
✖ Access denied
  Connector ID: conn-abc123
  Suggestion: You don't have permission to access this connector
```

**Solutions:**

1. Verify you have access to the project
2. Check your user role (admin/user/viewer)
3. Contact project administrator for access
4. Re-authenticate: `databasin auth login`

---

## Related Commands

- `databasin projects list` - List projects to get project IDs
- `databasin pipelines list` - List pipelines using connectors
- `databasin auth login` - Authenticate via browser
- `databasin auth verify` - Check authentication status
- `databasin auth whoami` - View current user context

---

## API Reference

For detailed API documentation, see:

- [Connectors API Client](/src/cli/src/client/connectors.ts)
- [API Types](/src/cli/src/types/api.ts)
- [Working Endpoints](/.claude-plugin/plugins/databasin/skills/databasin-api/references/working-endpoints.md)
