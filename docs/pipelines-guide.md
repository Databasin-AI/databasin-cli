# Pipelines Commands

Manage DataBasin data pipelines with the `databasin pipelines` command suite.

## Overview

Pipelines move data between connectors with optional transformations, scheduling, and automation. These commands provide full CRUD operations and execution control.

## Commands

### `pipelines list`

List pipelines in a project.

**CRITICAL**: The `--project` flag or interactive project selection is **REQUIRED**. The API endpoint requires a project ID (internalID) parameter.

```bash
databasin pipelines list --project <projectId>
```

**Options:**

- `-p, --project <id>` - Project ID (required, will prompt if not provided)
- `--count` - Return only the count of pipelines
- `--limit <number>` - Limit number of results
- `--fields <fields>` - Comma-separated fields to display
- `--status <status>` - Filter by status (active, inactive, running, error, pending)

**Examples:**

```bash
# List all pipelines in a project
databasin pipelines list --project N1r8Do

# Interactive project selection
databasin pipelines list

# Get count only (efficient)
databasin pipelines list --project N1r8Do --count

# Filter by status
databasin pipelines list --project N1r8Do --status active

# Limit fields and results (token efficiency)
databasin pipelines list --project N1r8Do --fields "pipelineID,pipelineName,status" --limit 10

# Output as JSON
databasin pipelines list --project N1r8Do --json

# Output as CSV
databasin pipelines list --project N1r8Do --csv
```

**Output:**

```
Fetching pipelines...
✔ Fetched 5 pipelines

┌──────────┬────────────────┬──────────┬─────────────┐
│ ID       │ Name           │ Status   │ Last Run    │
├──────────┼────────────────┼──────────┼─────────────┤
│ 123      │ Daily ETL      │ active   │ 2 hours ago │
│ 456      │ CDC Sync       │ active   │ 10 min ago  │
│ 789      │ Archive        │ inactive │ 3 days ago  │
└──────────┴────────────────┴──────────┴─────────────┘
```

**Error Handling:**

```bash
# Missing project ID
$ databasin pipelines list
? Select project to list pipelines: (cancelled)
✖ Project selection cancelled
  Suggestion: Use --project flag to specify project ID

# Invalid project ID
$ databasin pipelines list --project invalid-id
✖ Bad request - verify project ID is correct
  Project ID: invalid-id
  Suggestion: Run 'databasin projects list' to see valid project IDs
```

---

### `pipelines get`

Get detailed information about a specific pipeline.

```bash
databasin pipelines get <pipelineId>
```

**Arguments:**

- `id` - Pipeline ID (will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive pipeline selection)
- `--fields <fields>` - Comma-separated fields to display

**Examples:**

```bash
# Get pipeline by ID
databasin pipelines get 123

# Interactive selection
databasin pipelines get
# Prompts for project, then pipeline

# With project specified for interactive selection
databasin pipelines get --project N1r8Do

# Specific fields only
databasin pipelines get 123 --fields "pipelineID,pipelineName,status,configuration"

# Output as JSON
databasin pipelines get 123 --json
```

**Output:**

```
Fetching pipeline details...
✔ Pipeline retrieved

┌──────────────┬────────────────────────────┐
│ Field        │ Value                      │
├──────────────┼────────────────────────────┤
│ pipelineID   │ 123                        │
│ pipelineName │ Daily ETL Pipeline         │
│ status       │ active                     │
│ enabled      │ true                       │
│ sourceConnectorId │ mysql-prod-123      │
│ targetConnectorId │ snowflake-dw-456    │
│ lastRunDate  │ 2024-03-15T02:00:15.000Z   │
│ createdAt    │ 2024-01-01T00:00:00.000Z   │
│ artifacts    │ 2 items                    │
└──────────────┴────────────────────────────┘
```

**Error Handling:**

```bash
# Pipeline not found
$ databasin pipelines get 999
✖ Pipeline not found (404)
  Pipeline ID: 999
  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines

# Access denied
$ databasin pipelines get 123
✖ Access denied (403)
  Pipeline ID: 123
  Suggestion: You don't have permission to access this pipeline
```

---

### `pipelines create`

Create a new pipeline from a JSON file or interactively.

```bash
databasin pipelines create [file]
```

**Arguments:**

- `file` - JSON file with pipeline configuration (optional, will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive mode)

**Examples:**

```bash
# Create from file
databasin pipelines create pipeline-config.json

# Interactive mode
databasin pipelines create
# Prompts for: project, name, source, target, schedule

# Interactive with project specified
databasin pipelines create --project N1r8Do
```

**Configuration File Format:**

See `examples/pipeline-config.json`:

```json
{
  "pipelineName": "Daily ETL Pipeline",
  "sourceConnectorId": "mysql-prod-123",
  "targetConnectorId": "snowflake-dw-456",
  "enabled": true,
  "configuration": {
    "schedule": "0 2 * * *",
    "batchSize": 1000,
    "retryAttempts": 3
  },
  "artifacts": [
    {
      "type": "sql",
      "name": "Extract Users",
      "config": {
        "query": "SELECT * FROM users WHERE updated_at > :last_run"
      }
    },
    {
      "type": "transform",
      "name": "Clean Data",
      "config": {
        "operations": [...]
      }
    }
  ]
}
```

**Output:**

```
Reading pipeline configuration from: pipeline-config.json
Creating pipeline...
✔ Pipeline created successfully

✔ Pipeline created: Daily ETL Pipeline
  ID: 123
  Status: active
  Enabled: true
  Source: mysql-prod-123
  Target: snowflake-dw-456

ℹ Run the pipeline with: databasin pipelines run 123
```

**Interactive Mode:**

```bash
$ databasin pipelines create
ℹ Starting interactive pipeline creation wizard...
⚠ Interactive wizard is simplified - use a JSON file for complex pipelines

? Select project for pipeline: Analytics Platform (N1r8Do)
? Enter pipeline name: Daily ETL Pipeline
? Enter source connector ID (or leave blank): mysql-prod-123
? Enter target connector ID (or leave blank): snowflake-dw-456
? Enter schedule (cron format, leave blank for manual): 0 2 * * *

ℹ Artifact configuration not yet supported in interactive mode

Creating pipeline...
✔ Pipeline created successfully
```

**Error Handling:**

```bash
# Invalid JSON file
$ databasin pipelines create invalid.json
✖ Failed to read or parse pipeline configuration file: invalid.json
  Suggestions:
  • Ensure the file exists and is valid JSON
  • Check the pipeline configuration schema

# Missing required fields
$ databasin pipelines create incomplete.json
✖ Invalid pipeline configuration (400)
  Suggestion: Check the pipeline configuration schema
  Details: {"error": "pipelineName is required"}
```

---

### `pipelines run`

Execute a pipeline immediately.

```bash
databasin pipelines run <pipelineId>
```

**Arguments:**

- `id` - Pipeline ID (will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive selection)
- `--wait` - Wait for pipeline execution to complete (experimental)

**Examples:**

```bash
# Run pipeline by ID
databasin pipelines run 123

# Interactive selection
databasin pipelines run
# Prompts for project, then pipeline

# Run and wait for completion
databasin pipelines run 123 --wait
```

**Output:**

```
Starting pipeline execution...
✔ Pipeline execution started

✔ Pipeline execution started
  Status: running
  Job ID: job-abc-123
  Message: Pipeline queued for execution

ℹ Use 'databasin pipelines logs 123' to view logs
```

**With --wait flag:**

```
Starting pipeline execution...
✔ Pipeline execution started
  Job ID: job-abc-123

ℹ Waiting for pipeline to complete...
⚠ Polling not yet implemented - pipeline is running in background
```

**Error Handling:**

```bash
# Pipeline not enabled
$ databasin pipelines run 123
✖ Pipeline cannot be executed (400)
  Pipeline ID: 123
  Suggestion: Check pipeline status and configuration
  Details: {"error": "Pipeline is not enabled"}

# Pipeline not found
$ databasin pipelines run 999
✖ Pipeline not found (404)
  Pipeline ID: 999
  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines
```

---

### `pipelines logs`

View pipeline execution logs.

**Note:** This command is a placeholder. The logs endpoint is not yet implemented in the API.

```bash
databasin pipelines logs <pipelineId>
```

**Arguments:**

- `id` - Pipeline ID (will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive selection)
- `--execution <id>` - Specific execution ID
- `--limit <number>` - Limit number of log entries

**Examples:**

```bash
# View latest logs
databasin pipelines logs 123

# Specific execution
databasin pipelines logs 123 --execution exec-555

# Limited entries
databasin pipelines logs 123 --limit 10
```

**Current Output:**

```
⚠ Pipeline logs endpoint not yet implemented

  Pipeline ID: 123
  Execution ID: exec-555
  Limit: 10 entries

ℹ Log viewing will be available in a future release
ℹ For now, check pipeline execution status in the DataBasin UI
```

---

## Token Efficiency

Pipeline commands support token efficiency options to reduce API response size:

### Count Only

Get just the count without fetching full data:

```bash
databasin pipelines list --project N1r8Do --count
# Output: 42
```

### Field Filtering

Fetch only specific fields:

```bash
databasin pipelines list --project N1r8Do --fields "pipelineID,pipelineName,status"
```

### Result Limiting

Limit number of results:

```bash
databasin pipelines list --project N1r8Do --limit 10
```

### Combined Optimization

```bash
databasin pipelines list --project N1r8Do \
  --fields "pipelineID,pipelineName" \
  --limit 5 \
  --status active
```

---

## Output Formats

All commands support multiple output formats:

### Table (Default)

Human-readable table format:

```bash
databasin pipelines list --project N1r8Do
```

### JSON

Machine-readable JSON:

```bash
databasin pipelines list --project N1r8Do --json
```

### CSV

Spreadsheet-compatible CSV:

```bash
databasin pipelines list --project N1r8Do --csv
```

---

## Common Workflows

### List All Pipelines Across All Projects

```bash
# Get all projects
PROJECTS=$(databasin projects list --fields internalID --json | jq -r '.[].internalID')

# List pipelines in each project
for project in $PROJECTS; do
  echo "Project: $project"
  databasin pipelines list --project $project
done
```

### Create and Run a Pipeline

```bash
# Create pipeline
databasin pipelines create my-pipeline.json

# Extract pipeline ID from output
PIPELINE_ID=$(databasin pipelines list --project N1r8Do --json | \
  jq -r '.[] | select(.pipelineName=="My Pipeline") | .pipelineID')

# Run the pipeline
databasin pipelines run $PIPELINE_ID
```

### Monitor Pipeline Status

```bash
# Get pipeline status
databasin pipelines get 123 --fields "status,lastRunDate"

# Check if pipeline is enabled
ENABLED=$(databasin pipelines get 123 --json | jq -r '.enabled')
if [ "$ENABLED" = "true" ]; then
  echo "Pipeline is enabled"
fi
```

### Export Pipeline Configurations

```bash
# Export all pipelines to JSON
databasin pipelines list --project N1r8Do --json > pipelines-backup.json

# Export specific pipeline
databasin pipelines get 123 --json > pipeline-123.json
```

---

## Related Commands

- [`databasin projects`](./projects.md) - Manage projects (required for pipeline listing)
- [`databasin connectors`](./connectors.md) - Manage connectors (source/target for pipelines)
- [`databasin automations`](./automations.md) - Schedule pipeline execution

---

## API Reference

Pipelines commands use these API endpoints:

- `GET /api/pipeline?internalID={projectId}` - List pipelines
- `GET /api/pipeline/{id}` - Get pipeline details
- `POST /api/pipeline` - Create pipeline
- `PUT /api/pipeline/{id}` - Update pipeline
- `DELETE /api/pipeline/{id}` - Delete pipeline
- `POST /api/pipeline/{id}/run` - Execute pipeline

See: `.claude-plugin/plugins/databasin/skills/databasin-api/references/pipelines.md`

---

## Troubleshooting

### "Project ID is required" error

**Problem:** Forgot to specify project ID for list command

**Solution:**

```bash
# Use --project flag
databasin pipelines list --project N1r8Do

# Or use interactive mode
databasin pipelines list
```

### "Pipeline not found" error

**Problem:** Invalid pipeline ID

**Solution:**

```bash
# List pipelines to find valid IDs
databasin pipelines list --project N1r8Do
```

### "Access denied" error

**Problem:** Insufficient permissions

**Solution:**

- Verify you have access to the project
- Check project membership with `databasin projects get <id>`
- Contact project administrator

### Large response warnings

**Problem:** Token usage warning when listing many pipelines

**Solution:**

```bash
# Use token efficiency options
databasin pipelines list --project N1r8Do --limit 20
databasin pipelines list --project N1r8Do --fields "pipelineID,pipelineName"
databasin pipelines list --project N1r8Do --count
```

---

## Next Steps

- See `examples/pipeline-config.json` for complete configuration example
- Review pipeline API documentation for advanced configuration options
- Set up automation with `databasin automations create`
