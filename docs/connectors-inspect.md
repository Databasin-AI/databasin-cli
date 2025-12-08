# Connectors Inspect Command

## Overview

The `connectors inspect` command provides comprehensive information about a connector in a single command, including connection testing, metadata display, configuration details, database structure discovery, pipeline usage analysis, and quick action suggestions.

## Usage

```bash
databasin connectors inspect <id-or-name>
```

### Arguments

- `<id-or-name>` - Connector ID (numeric) or connector name (partial match)

### Examples

```bash
# Inspect by ID
databasin connectors inspect 5459

# Inspect by name (case-insensitive partial match)
databasin connectors inspect postgres
databasin connectors inspect "Starling"
```

## Features

### 1. Connection Testing

Tests the connector's connection and displays the result:
- **Active**: Connection successful
- **Failed**: Connection test failed
- **Error**: Unable to test connection

### 2. Metadata Display

Shows key connector information:
- Connector ID and name
- Type and subtype
- Project ID
- Creation date

### 3. Configuration Details

Displays connection configuration with sensitive data sanitized:
- Host/hostname/server
- Port
- Database
- Schema
- SSL status
- **Note**: Passwords, API keys, tokens, and secrets are masked as `********`

### 4. Database Structure Discovery (SQL Connectors Only)

For SQL-based connectors (PostgreSQL, MySQL, SQL Server, Snowflake, etc.), the command:
- Lists databases/catalogs (up to 3)
- Shows schemas per database (up to 3)
- Displays tables per schema (up to 5)
- Provides counts for additional items

Supported SQL connector types:
- PostgreSQL / Postgres
- MySQL / MariaDB
- SQL Server / MSSQL
- Oracle
- Snowflake
- Databricks
- Redshift
- BigQuery
- Trino / Presto
- DB2
- Sybase

### 5. Pipeline Usage Analysis

Scans all accessible projects to find pipelines using this connector:
- Lists up to 10 pipelines
- Shows pipeline name and ID
- Indicates role (Source or Target)
- Displays total count

### 6. Quick Action Suggestions

Provides helpful command suggestions based on connector type:

**For SQL Connectors:**
```bash
databasin sql exec <id> "SELECT * FROM <table> LIMIT 5"
databasin sql discover <id>
databasin pipelines create --source <id>
databasin connectors test <id>
databasin connectors update <id>
```

**For Non-SQL Connectors:**
```bash
databasin pipelines create --source <id>
databasin connectors test <id>
databasin connectors update <id>
```

## Output Example

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
  $ databasin sql exec 5459 "SELECT * FROM <table> LIMIT 5"
  $ databasin sql discover 5459
  $ databasin pipelines create --source 5459
  $ databasin connectors test 5459
  $ databasin connectors update 5459
```

## Error Handling

### No Connector Found
If no connector matches the provided name:
```
✖ No connector found matching "nonexistent"
```

### Multiple Matches
If multiple connectors match the name:
```
✖ Multiple connectors found matching "postgres"

Multiple matches found:
  • Test Postgres 1 (5459)
  • Test Postgres 2 (5460)

Please specify a more specific name or use the connector ID
```

### Connection Test Failure
If the connection test fails, the status will show as "Failed" and the error message will be displayed if available.

### Discovery Errors
If database structure discovery fails, a warning is shown and the command continues with other sections.

## Implementation Details

### File Locations

- **Command Implementation**: `/home/founder3/code/tpi/databasin-cli/src/commands/connectors-inspect.ts`
- **Command Registration**: `/home/founder3/code/tpi/databasin-cli/src/commands/connectors.ts`
- **Tests**: `/home/founder3/code/tpi/databasin-cli/tests/unit/connectors-inspect.test.ts`

### Dependencies

- `ConnectorsClient` - Connector CRUD operations and testing
- `PipelinesClient` - Pipeline listing and filtering
- `ProjectsClient` - Project enumeration
- `SqlClient` - Database structure discovery

### Security

All sensitive configuration fields are automatically sanitized:
- password
- apikey / api_key
- secret
- token
- credential
- auth

These fields are replaced with `********` in the output.

## Related Commands

- `databasin connectors list` - List all connectors
- `databasin connectors get <id>` - Get detailed connector information
- `databasin connectors test <id>` - Test connector connection
- `databasin sql discover <id>` - Detailed database structure discovery
- `databasin pipelines list` - List pipelines
