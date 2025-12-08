# Pipelines Clone Command

## Overview

The `pipelines clone` command duplicates an existing pipeline with optional modifications to name, source connector, target connector, or schedule. This enables quick pipeline creation for testing, environment promotion, and backup scenarios.

## Usage

```bash
databasin pipelines clone <pipeline-id> [options]
```

### Arguments

- `<pipeline-id>` - ID of the pipeline to clone (required)

### Options

- `--name <name>` - Override pipeline name (default: original name + " (Clone)")
- `--source <id>` - Override source connector ID
- `--target <id>` - Override target connector ID
- `--schedule <cron>` - Override schedule (cron expression)
- `--dry-run` - Preview changes without creating the pipeline

### Examples

```bash
# Clone with default name (adds " (Clone)" suffix)
databasin pipelines clone 8901

# Clone with custom name
databasin pipelines clone 8901 --name "Production ETL Pipeline"

# Clone with different source connector
databasin pipelines clone 8901 --source 5460

# Clone with different target connector
databasin pipelines clone 8901 --target 5766

# Clone with different schedule (run at 3 AM instead of 2 AM)
databasin pipelines clone 8901 --schedule "0 3 * * *"

# Combine multiple overrides
databasin pipelines clone 8901 \
  --name "Dev Pipeline" \
  --source 5460 \
  --target 5766 \
  --schedule "0 */6 * * *"

# Preview changes without creating (dry-run)
databasin pipelines clone 8901 --dry-run

# Dry-run with modifications
databasin pipelines clone 8901 --source 5460 --target 5766 --dry-run
```

## Features

### 1. Smart Name Generation

If no name is specified, the command automatically appends " (Clone)" to the original pipeline name:

- Original: "Daily User Sync" → Cloned: "Daily User Sync (Clone)"
- Original: "ETL Pipeline" → Cloned: "ETL Pipeline (Clone)"

### 2. Configuration Validation

Before creating the pipeline, the command validates:

- **Source connector exists** and is accessible
- **Target connector exists** and is accessible
- **Cron expression is valid** (if schedule is provided)
- **Required fields** are present
- **Data types** are correct

### 3. Connector Caching

To prevent duplicate API calls, the command caches connector lookups:

- First lookup fetches from API and caches result
- Subsequent lookups use cached data
- Improves performance and reduces API load

### 4. Clear Diff Display

The command shows exactly what changes from the original:

- `~` - Field changed
- `✓` - Field unchanged
- Lists both old and new values for changed fields

### 5. Dry-Run Mode

Use `--dry-run` to preview changes without creating the pipeline:

- Fetches and validates source pipeline
- Shows configuration diff
- Displays what the cloned pipeline would look like
- Does NOT create the pipeline
- Perfect for testing before committing

### 6. Preserves Everything

The clone operation preserves all pipeline settings:

- **Artifacts** - Table selections and column mappings
- **Job details** - Cluster size, timeout, notifications
- **Configuration** - All custom settings
- **Ingestion pattern** - Full, incremental, etc.
- **Schema settings** - Catalog/schema names, naming conventions

## Output Examples

### Successful Clone

```
$ databasin pipelines clone 8901 --name "Production ETL"

✔ Source pipeline loaded: Daily User Sync (8901)
✔ Configuration valid

Changes:
  ~ Name: "Daily User Sync" → "Production ETL"
  ✓ Source: StarlingPostgres (5459) [unchanged]
  ✓ Target: ITL TPI Databricks (5765) [unchanged]
  ✓ Schedule: "0 2 * * *" [unchanged]
  ✓ Artifacts: 2 items [unchanged]

✔ Pipeline created: 8903

Next steps:
  $ databasin pipelines run 8903    # Test the cloned pipeline
  $ databasin pipelines logs 8903   # View execution logs
```

### Dry-Run Example

```
$ databasin pipelines clone 8901 --source 5460 --dry-run

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

### Clone with Validation Warnings

```
$ databasin pipelines clone 8901

✔ Source pipeline loaded: Daily User Sync (8901)
✔ Configuration valid (with warnings)

Warnings:
  ⚠ artifacts[0]: Artifact should have either sourceQuery or sourceTable defined
  ⚠ artifacts[0]: Artifact should have targetTable defined
  ⚠ artifacts[1]: Artifact should have either sourceQuery or sourceTable defined
  ⚠ artifacts[1]: Artifact should have targetTable defined

Changes:
  ~ Name: "Daily User Sync" → "Daily User Sync (Clone)"
  ✓ Source: StarlingPostgres (5459) [unchanged]
  ✓ Target: ITL TPI Databricks (5765) [unchanged]
  ✓ Schedule: "0 2 * * *" [unchanged]
  ✓ Artifacts: 2 items [unchanged]

✔ Pipeline created: 8902

Note: Pipeline created with warnings. Review artifacts configuration.

Next steps:
  $ databasin pipelines run 8902    # Test the cloned pipeline
  $ databasin pipelines logs 8902   # View execution logs
```

## Error Handling

### Pipeline Not Found

```
$ databasin pipelines clone 99999
✖ Failed to clone pipeline
Error: Pipeline not found
```

### Invalid Connector ID

```
$ databasin pipelines clone 8901 --source 99999
✖ Configuration validation failed

Errors:
  ✖ sourceConnectorId: Connector 99999 not found or not accessible

Fix these errors before creating the pipeline.
```

### Invalid Cron Expression

```
$ databasin pipelines clone 8901 --schedule "invalid"
✖ Configuration validation failed

Errors:
  ✖ schedule: Invalid cron expression: "invalid"
  Expected format: "minute hour day month dayOfWeek" (e.g., "0 2 * * *")

Fix these errors before creating the pipeline.
```

### Multiple Validation Errors

```
$ databasin pipelines clone 8901 --source 99999 --schedule "bad"
✖ Configuration validation failed

Errors:
  ✖ sourceConnectorId: Connector 99999 not found or not accessible
  ✖ schedule: Invalid cron expression: "bad"

Fix these errors before creating the pipeline.
```

## Use Cases

### 1. Environment Promotion

Clone a pipeline from development to production with different connectors:

```bash
# Clone dev pipeline to prod
databasin pipelines clone 8901 \
  --name "Production Data Sync" \
  --source 5459 \
  --target 5766
```

### 2. Testing

Create a test version of a production pipeline with test connectors:

```bash
# Clone production pipeline for testing
databasin pipelines clone 8901 \
  --name "Test - Daily User Sync" \
  --source 5460 \
  --target 5767
```

### 3. Schedule Variations

Create an hourly version of a daily pipeline:

```bash
# Clone daily pipeline to run every 6 hours
databasin pipelines clone 8901 \
  --name "6-Hour User Sync" \
  --schedule "0 */6 * * *"
```

### 4. Backup Before Modifications

Clone a pipeline before making major changes:

```bash
# Create backup before modifying original
databasin pipelines clone 8901 --name "Daily User Sync (Backup)"

# Now safely modify the original
databasin pipelines update 8901 config.json
```

### 5. Multi-Environment Deployment

Deploy the same pipeline to multiple environments:

```bash
# Production
databasin pipelines clone 8901 \
  --name "Prod ETL" \
  --source 5459 \
  --target 5765

# Staging
databasin pipelines clone 8901 \
  --name "Staging ETL" \
  --source 5460 \
  --target 5766

# Development
databasin pipelines clone 8901 \
  --name "Dev ETL" \
  --source 5461 \
  --target 5767
```

## Implementation Details

### File Locations

- **Command Implementation**: `/home/founder3/code/tpi/databasin-cli/src/commands/pipelines-clone.ts`
- **Command Registration**: `/home/founder3/code/tpi/databasin-cli/src/commands/pipelines.ts`
- **Tests**: `/home/founder3/code/tpi/databasin-cli/tests/commands/pipelines-clone.test.ts`

### Dependencies

- `PipelinesClient` - Pipeline CRUD operations
- `ConnectorsClient` - Connector validation and lookup
- `validatePipelineConfig()` - Configuration validation utility

### Performance

- **Connector caching** - Reduces API calls when same connector checked multiple times
- **Single API call** - Fetches source pipeline in one request
- **Validation before creation** - Prevents failed creates

## Related Commands

- `databasin pipelines create` - Create pipeline from scratch with JSON config
- `databasin pipelines get <id>` - Get full pipeline details
- `databasin pipelines validate <config>` - Validate pipeline configuration
- `databasin pipelines run <id>` - Execute a pipeline
- `databasin connectors inspect <id>` - View connector details
