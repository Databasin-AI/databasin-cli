# DataBasin CLI - Usage Examples

This document provides comprehensive examples for all CLI features.

## Table of Contents
- [Context Management](#context-management)
- [Connector Operations](#connector-operations)
- [Pipeline Operations](#pipeline-operations)
- [SQL Operations](#sql-operations)
- [Cache Management](#cache-management)
- [Search & Filter](#search--filter)
- [Bulk Operations](#bulk-operations)
- [Advanced Examples](#advanced-examples)
- [Error Handling Examples](#error-handling-examples)
- [Performance Tips](#performance-tips)
- [Troubleshooting](#troubleshooting)

---

## Context Management

### Setting Context
```bash
# Set working project (validates it exists)
databasin set project N1r8Do
# Output: ✓ Working project set to: Datalake Project (N1r8Do)

# Set working connector (validates it exists)
databasin set connector 5459
# Output: ✓ Working connector set to: PostgreSQL Production (5459)
```

### Viewing Context
```bash
# Show current context
databasin context

# Output:
# Working Context:
#   Project: N1r8Do
#   Connector: 5459
#   Last updated: 2025-12-07 10:30:45
```

### Clearing Context
```bash
# Clear specific context
databasin context clear project

# Clear all context
databasin context clear
```

### Using Context in Commands
```bash
# Set context once
databasin set project N1r8Do

# These commands now use context automatically
databasin connectors list        # Uses context.project
databasin pipelines list         # Uses context.project

# Set connector context
databasin set connector 5459

# SQL commands use connector context
databasin sql catalogs          # Uses context.connector
databasin sql discover          # Uses context.connector
```

---

## Connector Operations

### Listing Connectors
```bash
# List all connectors (uses context.project if set)
databasin connectors list

# List for specific project
databasin connectors list --project N1r8Do

# Full details
databasin connectors list --full

# Limit results
databasin connectors list --limit 20

# Skip cache
databasin connectors list --no-cache
```

### Searching Connectors
```bash
# Search by name (case-insensitive)
databasin connectors search "postgres"

# Search with filters
databasin connectors search --type database --status active

# Search in specific project
databasin connectors search "prod" --project N1r8Do

# Search with regex pattern
databasin connectors list --full --name-pattern ".*mysql.*"
```

### Getting Connector Details
```bash
# Get single connector
databasin connectors get 5459

# Get multiple connectors (bulk operation)
databasin connectors get 5459,5765,5543

# Get by name (partial match)
databasin connectors get --name "postgres"

# Get with specific output format
databasin connectors get 5459 --format json
```

### Creating Connectors
```bash
# Create from config file
databasin connectors create connector-config.json

# Cache is automatically invalidated after creation
```

### Inspecting Connectors
```bash
# Comprehensive connector analysis (all-in-one command)
databasin connectors inspect 5459

# Inspect by name (partial match)
databasin connectors inspect "postgres"

# Output includes:
# - Connection test with status
# - Metadata (ID, name, type, project, creation date)
# - Configuration (host, port, database, SSL - passwords hidden)
# - Database structure (for SQL connectors)
# - Pipeline usage (where this connector is used)
# - Quick action suggestions
```

**Example Output:**
```
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

Pipeline Usage:
  Used in 3 pipeline(s):
    • Daily User Sync (8901) - Source
    • Weekly Orders Export (8902) - Source

Quick Actions:
  $ databasin sql exec 5459 "SELECT * FROM users LIMIT 5"
  $ databasin sql discover 5459
  $ databasin pipelines create --source 5459
```

---

## Pipeline Operations

### Listing Pipelines
```bash
# List all pipelines (uses context.project if set)
databasin pipelines list

# List for specific project
databasin pipelines list --project N1r8Do

# Full details
databasin pipelines list --full
```

### Getting Pipeline Details
```bash
# Get single pipeline
databasin pipelines get 123

# Get multiple pipelines (bulk operation)
databasin pipelines get 123,456,789 --project N1r8Do

# Get by name
databasin pipelines get --name "ETL" --project N1r8Do
```

### Validating Pipeline Config
```bash
# Validate before creating
databasin pipelines validate pipeline-config.json

# Example output (valid):
# ✓ Pipeline configuration is valid
#
# Warnings:
#   ⚠  artifacts: No artifacts configured
#
# Next steps:
#   • Create pipeline: databasin pipelines create pipeline-config.json

# Example output (invalid):
# ✖ Pipeline configuration is invalid
#
# Errors:
#   ✖  sourceConnectorId: Source connector 999 not found
#   ✖  schedule: Invalid cron expression: "invalid"
#
# Fix these errors before creating the pipeline.
```

### Creating Pipelines
```bash
# Validate first (recommended)
databasin pipelines validate config.json

# Then create
databasin pipelines create config.json

# Cache is automatically invalidated after creation
```

### Cloning Pipelines
```bash
# Clone a pipeline with default name (adds " (Clone)" suffix)
databasin pipelines clone 8901

# Clone with custom name
databasin pipelines clone 8901 --name "Production ETL Pipeline"

# Clone with different source connector
databasin pipelines clone 8901 --source 5460

# Clone with different target connector
databasin pipelines clone 8901 --target 5766

# Clone with different schedule
databasin pipelines clone 8901 --schedule "0 3 * * *"

# Combine multiple overrides
databasin pipelines clone 8901 \
  --name "Dev Pipeline" \
  --source 5460 \
  --target 5766 \
  --schedule "0 */6 * * *"

# Preview changes without creating (dry-run)
databasin pipelines clone 8901 --dry-run

# Dry run with modifications
databasin pipelines clone 8901 --source 5460 --dry-run
```

**Example Dry-Run Output:**
```
✔ Source pipeline loaded: Daily User Sync (8901)
✔ Configuration valid (with warnings)

Warnings:
  ⚠ artifacts[0]: Artifact should have targetTable defined

Changes:
  ~ Name: "Daily User Sync" → "Daily User Sync (Clone)"
  ~ Source: StarlingPostgres (5459) → NewPostgres (5460)
  ✓ Target: ITL TPI Databricks (5765) [unchanged]
  ✓ Schedule: "0 2 * * *" [unchanged]
  ✓ Artifacts: 2 items [unchanged]

Preview: Pipeline would be cloned as follows

Original:
  Name: Daily User Sync
  Source: StarlingPostgres (5459)
  Target: ITL TPI Databricks (5765)
  Schedule: 0 2 * * *
  Artifacts: 2 items

Cloned:
  Name: Daily User Sync (Clone)
  Source: NewPostgres (5460)
  Target: ITL TPI Databricks (5765)
  Schedule: 0 2 * * *
  Artifacts: 2 items

✓ Dry run successful
Use --confirm (or remove --dry-run) to create this pipeline
```

---

## SQL Operations

### Database Discovery (Recommended)
```bash
# Discover entire database structure (uses context.connector if set)
databasin sql discover

# Discover specific connector
databasin sql discover 5459

# Filter to specific catalog
databasin sql discover --catalog production

# Filter to specific schema
databasin sql discover --schema public

# Filter tables by pattern
databasin sql discover --table-pattern "user.*"

# Limit depth (1=catalogs, 2=schemas, 3=tables)
databasin sql discover --max-depth 2

# JSON output
databasin sql discover --format json

# Table output (tree view - default)
databasin sql discover
# Output:
# 📁 production (catalog)
#   📁 public (schema)
#     📄 users
#     📄 orders
#   📁 analytics (schema)
#     📄 reports
```

### Step-by-Step Exploration
```bash
# Set connector context
databasin set connector 5459

# List catalogs
databasin sql catalogs

# List schemas in catalog
databasin sql schemas --catalog production

# List tables in schema
databasin sql tables --catalog production --schema public

# Execute query
databasin sql exec "SELECT * FROM users LIMIT 10"
```

---

## Cache Management

### Viewing Cache Status
```bash
# Show all cached entries
databasin cache status

# Output:
# Cache Status (3 entries):
#
# GET /api/connectors
#   Namespace: connectors:N1r8Do
#   Size: 45.2 KB
#   Expires: 3m 42s
#
# GET /api/projects
#   Namespace: projects:all
#   Size: 12.1 KB
#   Expires: 8m 15s
```

### Clearing Cache
```bash
# Clear all cache
databasin cache clear

# Clear specific cache key
databasin cache clear "GET:/api/connectors:N1r8Do"
```

### Cache Behavior
```bash
# First call - fetches from API
databasin connectors list
# ~200ms

# Second call within TTL - uses cache
databasin connectors list
# ~2ms (99% faster)

# Force fresh data
databasin connectors list --no-cache

# After mutation, cache auto-invalidates
databasin connectors create config.json
databasin connectors list  # Fresh data (cache was invalidated)
```

---

## Search & Filter

### Connector Search
```bash
# Simple search
databasin connectors search "postgres"

# Multi-criteria search
databasin connectors search --type database --status active --project N1r8Do

# Case-insensitive pattern
databasin connectors list --full --name-pattern ".*prod.*" --ignore-case
```

### Pipeline Search
```bash
# Search pipelines by name
databasin pipelines get --name "ETL" --project N1r8Do

# With partial match
databasin pipelines get --name "sync"
```

---

## Bulk Operations

### Bulk Get
```bash
# Get multiple connectors
databasin connectors get 5459,5765,5543

# Output shows all results:
# [
#   { "connectorID": "5459", "connectorName": "PostgreSQL", ... },
#   { "connectorID": "5765", "connectorName": "Snowflake", ... },
#   { "connectorID": "5543", "connectorName": "MySQL", ... }
# ]

# Space-separated also works
databasin connectors get 5459 5765 5543

# Get multiple pipelines
databasin pipelines get 123,456,789 --project N1r8Do
```

### Partial Failures
```bash
# Some IDs invalid
databasin connectors get 5459,9999,5765

# Output shows successes and errors separately:
# [
#   { "connectorID": "5459", ... },
#   { "connectorID": "5765", ... }
# ]
#
# ✖ Failed to process 1 connector:
#   • 9999: Not found (404)
```

---

## Advanced Examples

### Pipeline Creation Workflow
```bash
# 1. Set project context
databasin set project N1r8Do

# 2. Find source connector
databasin connectors search "postgres"
# Note the ID: 5459

# 3. Find target connector
databasin connectors search "snowflake"
# Note the ID: 5765

# 4. Explore source data
databasin sql discover 5459 --schema public

# 5. Create pipeline config file (pipeline-config.json)
# {
#   "pipelineName": "PostgreSQL to Snowflake Sync",
#   "sourceConnectorId": "5459",
#   "targetConnectorId": "5765",
#   "schedule": "0 2 * * *",
#   "artifacts": [...]
# }

# 6. Validate config
databasin pipelines validate pipeline-config.json

# 7. Create pipeline
databasin pipelines create pipeline-config.json
```

### Multi-Project Workflow
```bash
# Work with Project A
databasin set project PROJECT_A_ID
databasin connectors list
databasin pipelines list

# Switch to Project B
databasin set project PROJECT_B_ID
databasin connectors list
databasin pipelines list

# Clear context to work without default
databasin context clear
databasin connectors list --project PROJECT_C_ID
```

### Interactive Pipeline Creation
```bash
# Use the interactive wizard
databasin pipelines wizard

# Follow the prompts to:
# 1. Select or create project
# 2. Select source connector
# 3. Select target connector
# 4. Configure pipeline schedule
# 5. Define artifacts (tables/files to sync)
# 6. Review and create
```

---

## Error Handling Examples

### Enhanced Error Messages
```bash
# Typo in command
$ databasin connector list

# Output:
# Unknown command 'connector'
#
# Did you mean?
#   connectors list          # List all connectors
#     $ databasin connectors list
#     $ databasin connectors list --full
#
# Run 'databasin --help' for all commands.

# Missing required argument
$ databasin pipelines list

# Output:
# ✖ Missing required argument: --project
#
# Usage: databasin pipelines list --project <projectId>
#
# Or set context:
#   $ databasin set project <projectId>
#   $ databasin pipelines list
#
# Run 'databasin projects list' to see available projects.
```

### Validation Errors
```bash
# Invalid connector ID in pipeline config
$ databasin pipelines validate bad-config.json

# Output:
# ✖ Pipeline configuration is invalid
#
# Errors:
#   ✖  sourceConnectorId: Source connector 999 not found
#   ✖  targetConnectorId: Target connector 888 not found
#   ✖  schedule: Invalid cron expression: "every day"
#
# Suggestions:
#   • Verify connector IDs: databasin connectors list --full
#   • Check cron format: https://crontab.guru/
#   • Valid cron example: "0 2 * * *" (daily at 2am)
#
# Fix these errors before creating the pipeline.
```

---

## Performance Tips

### Use Context for Repeated Operations
```bash
# Bad - specifying project each time
databasin connectors list --project N1r8Do
databasin pipelines list --project N1r8Do
databasin automations list --project N1r8Do

# Good - set context once
databasin set project N1r8Do
databasin connectors list
databasin pipelines list
databasin automations list
```

### Leverage Caching
```bash
# First call fetches from API
databasin connectors list

# Subsequent calls use cache (5 min TTL)
databasin connectors list  # Fast!
databasin connectors list  # Fast!

# Force refresh when needed
databasin connectors list --no-cache
```

### Use Bulk Operations
```bash
# Bad - multiple sequential calls
databasin connectors get 5459
databasin connectors get 5765
databasin connectors get 5543

# Good - single bulk call
databasin connectors get 5459,5765,5543
```

### Use SQL Discover
```bash
# Bad - many commands
databasin sql catalogs 5459
databasin sql schemas 5459 --catalog prod
databasin sql tables 5459 --catalog prod --schema public
# ... repeat for each schema

# Good - single discover command
databasin sql discover 5459
```

### Field Selection
```bash
# Bad - fetch all fields
databasin connectors list --full

# Good - only fields you need
databasin connectors list --full --fields connectorID,connectorName,connectorType
```

---

## Troubleshooting

### Debug Mode
```bash
# Enable debug logging
export DATABASIN_DEBUG=1
databasin connectors list

# Shows:
# [CONTEXT] Using project from context: N1r8Do
# [CACHE HIT] GET:/api/connectors:N1r8Do
# ...
```

### Cache Issues
```bash
# Stale data?
databasin cache status          # Check cache state
databasin cache clear           # Clear all cache
databasin connectors list --no-cache  # Bypass cache
```

### Context Issues
```bash
# Not using context?
databasin context              # Check what's set
databasin set project <id>     # Set project
export DATABASIN_DEBUG=1       # Enable debug logging
```

### Validation Errors
```bash
# Pipeline validation failing?
databasin pipelines validate config.json  # See detailed errors

# Check connectors exist:
databasin connectors get <sourceId>
databasin connectors get <targetId>

# Validate cron expression separately
# Supports: */5, 0-23, 1,15, * * * * * (5-6 fields)
```

### Authentication Issues
```bash
# Token expired?
databasin auth verify          # Check token validity
databasin login                # Re-authenticate (opens browser)

# Login to a custom instance
databasin login https://your-instance.databasin.com

# Check current user
databasin auth whoami
```

### Network Issues
```bash
# Connection problems?
databasin api GET /api/health  # Test API connectivity

# View current configuration
databasin config

# Check specific config value
databasin config | grep apiUrl

# Save configuration to file
databasin config > my-config.json

# Override API URL
export DATABASIN_API_URL=https://api.databasin.ai
```

---

## Command Reference Quick Guide

### Projects
```bash
databasin projects list                           # List all projects
databasin projects get <id>                       # Get project details
databasin projects users <id>                     # List project users
databasin projects stats <id>                     # Project statistics
```

### Connectors
```bash
databasin connectors list [--project <id>]        # List connectors
databasin connectors search <name>                # Search by name
databasin connectors get <id>                     # Get connector details
databasin connectors get <id1>,<id2>,<id3>        # Bulk get
databasin connectors get --name <name>            # Get by name
databasin connectors create <file>                # Create connector
databasin connectors update <id> <file>           # Update connector
databasin connectors delete <id>                  # Delete connector
databasin connectors test <id>                    # Test connection
databasin connectors config <type>                # View connector config
```

### Pipelines
```bash
databasin pipelines list --project <id>           # List pipelines
databasin pipelines get <id>                      # Get pipeline details
databasin pipelines get <id1>,<id2>,<id3>         # Bulk get
databasin pipelines get --name <name>             # Get by name
databasin pipelines validate <file>               # Validate config
databasin pipelines create <file>                 # Create pipeline
databasin pipelines update <id> <file>            # Update pipeline
databasin pipelines delete <id>                   # Delete pipeline
databasin pipelines run <id>                      # Execute pipeline
databasin pipelines logs <id>                     # View logs
databasin pipelines wizard                        # Interactive creator
```

### SQL
```bash
databasin sql discover [<connector-id>]           # Full DB structure
databasin sql catalogs [<connector-id>]           # List catalogs
databasin sql schemas <connector-id>              # List schemas
databasin sql tables <connector-id>               # List tables
databasin sql exec <connector-id> <query>         # Execute query
```

### Automations
```bash
databasin automations list --project <id>         # List automations
databasin automations get <id>                    # Get automation details
databasin automations run <id>                    # Execute automation
databasin automations create <file>               # Create automation
databasin automations update <id> <file>          # Update automation
databasin automations delete <id>                 # Delete automation
```

### Context & Cache
```bash
databasin set project <id>                        # Set project context
databasin set connector <id>                      # Set connector context
databasin context                                 # View context
databasin context clear [key]                     # Clear context
databasin cache status                            # View cache
databasin cache clear [key]                       # Clear cache
```

### Utilities
```bash
databasin login                                   # Authenticate (browser)
databasin login databasin.example.com             # Login to custom instance
databasin auth whoami                             # Current user context
databasin auth verify                             # Verify token validity
databasin config                                  # Display current configuration
databasin update                                  # Update CLI
databasin docs [name]                             # View documentation
databasin completion install [shell]              # Install completions
databasin api <method> <path> [body]              # Generic API call
```

---

## Tips for Scripting

### JSON Output
```bash
# Get raw JSON for scripting
databasin projects list --json > projects.json

# Parse with jq
databasin connectors list --json | jq '.[] | select(.connectorType=="database")'

# CSV for spreadsheets
databasin pipelines list --csv > pipelines.csv
```

### Error Handling in Scripts
```bash
#!/bin/bash

# Check if connector exists
if databasin connectors get 5459 &>/dev/null; then
  echo "Connector exists"
else
  echo "Connector not found"
  exit 1
fi

# Validate before creating
if databasin pipelines validate config.json; then
  databasin pipelines create config.json
else
  echo "Validation failed"
  exit 1
fi
```

### Batch Operations
```bash
# Create multiple connectors
for config in configs/*.json; do
  databasin connectors create "$config"
done

# Run multiple pipelines
for id in 123 456 789; do
  databasin pipelines run "$id"
done
```

---

For more information, see:
- [README](./README.md) - Main documentation
- [Quickstart](./docs/quickstart.md) - Getting started guide
- [Developer Guide](./docs/developers.md) - Development setup

Report issues at: https://github.com/Databasin-AI/databasin-cli/issues
