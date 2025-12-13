# Automations Commands

Manage Databasin automations with the `databasin automations` command suite.

## Overview

Automations orchestrate data workflows by executing multiple tasks in sequence or parallel. These commands provide full CRUD operations, execution control, and comprehensive observability.

## Commands

### `automations list`

List automations with optional project filtering.

```bash
databasin automations list [--project <projectId>]
```

**Options:**

- `-p, --project <id>` - Project ID (optional - will prompt if filtering desired)
- `--count` - Return only the count of automations
- `--limit <number>` - Limit number of results
- `--fields <fields>` - Comma-separated fields to display
- `--active` - Filter to active automations only
- `--running` - Filter to currently running automations only

**Examples:**

```bash
# List all automations (prompts for project filter)
databasin automations list

# List automations in specific project
databasin automations list --project 5QiuoY0J

# Get count only (efficient)
databasin automations list --project 5QiuoY0J --count

# Filter to active automations
databasin automations list --project 5QiuoY0J --active

# Filter to running automations
databasin automations list --project 5QiuoY0J --running

# Limit fields and results (token efficiency)
databasin automations list --project 5QiuoY0J --fields "automationID,name,status" --limit 10

# Output as JSON
databasin automations list --project 5QiuoY0J --json

# Output as CSV
databasin automations list --project 5QiuoY0J --csv
```

**Output:**

```
Fetching automations...
✔ Fetched 3 automations

┌──────────┬─────────────────────┬──────────┬──────────────────┐
│ ID       │ Name                │ Status   │ Last Run         │
├──────────┼─────────────────────┼──────────┼──────────────────┤
│ auto-123 │ Nightly ETL         │ active   │ 5 hours ago      │
│ auto-456 │ Data Validation     │ active   │ 30 minutes ago   │
│ auto-789 │ Archive Old Data    │ inactive │ 3 days ago       │
└──────────┴─────────────────────┴──────────┴──────────────────┘
```

**Error Handling:**

```bash
# Invalid project ID
$ databasin automations list --project invalid-id
✖ Bad request - verify project ID is correct
  Project ID: invalid-id
  Suggestion: Run 'databasin projects list' to see valid project IDs
```

---

### `automations get`

Get detailed information about a specific automation.

```bash
databasin automations get <automationId>
```

**Arguments:**

- `id` - Automation ID (will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive selection)
- `--fields <fields>` - Comma-separated fields to display

**Examples:**

```bash
# Get automation by ID
databasin automations get auto-123

# Interactive selection
databasin automations get
# Prompts for project, then automation

# With project specified for interactive selection
databasin automations get --project 5QiuoY0J

# Specific fields only
databasin automations get auto-123 --fields "automationID,name,status,schedule"

# Output as JSON
databasin automations get auto-123 --json
```

**Output:**

```
Fetching automation details...
✔ Automation retrieved

┌──────────────────┬────────────────────────────┐
│ Field            │ Value                      │
├──────────────────┼────────────────────────────┤
│ automationID     │ auto-123                   │
│ name             │ Nightly ETL Automation     │
│ status           │ active                     │
│ enabled          │ true                       │
│ schedule         │ Daily at 2 AM (0 2 * * *)  │
│ lastRunDate      │ 2024-12-06T02:00:15.000Z   │
│ lastRunStatus    │ success                    │
│ createdAt        │ 2024-01-01T00:00:00.000Z   │
│ tasks            │ 3 items                    │
└──────────────────┴────────────────────────────┘
```

**Error Handling:**

```bash
# Automation not found
$ databasin automations get auto-999
✖ Automation not found (404)
  Automation ID: auto-999
  Suggestion: Run 'databasin automations list --project <id>' to see available automations

# Access denied
$ databasin automations get auto-123
✖ Access denied (403)
  Automation ID: auto-123
  Suggestion: You don't have permission to access this automation
```

---

### `automations run`

Execute an automation immediately.

```bash
databasin automations run <automationId>
```

**Arguments:**

- `id` - Automation ID (will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive selection)
- `--wait` - Wait for automation execution to complete (experimental)

**Examples:**

```bash
# Run automation by ID
databasin automations run auto-123

# Interactive selection
databasin automations run
# Prompts for project, then automation

# Run and wait for completion
databasin automations run auto-123 --wait
```

**Output:**

```
Starting automation execution...
✔ Automation execution started

✔ Automation started successfully
  Status: running
  Run ID: run-abc-123
  Tasks queued: 3

ℹ Use 'databasin automations logs auto-123' to view logs
ℹ Use 'databasin automations history auto-123' to view execution history
```

**With --wait flag:**

```
Starting automation execution...
✔ Automation execution started
  Run ID: run-abc-123

ℹ Waiting for automation to complete...
⚠ Polling not yet implemented - automation is running in background
```

**Error Handling:**

```bash
# Automation not enabled
$ databasin automations run auto-123
✖ Automation cannot be executed (400)
  Automation ID: auto-123
  Suggestion: Check automation status and configuration
  Details: {"error": "Automation is not enabled"}

# Automation already running
$ databasin automations run auto-123
✖ Automation execution failed (409)
  Automation ID: auto-123
  Suggestion: Automation is already running. Wait for current execution to complete.
```

---

### `automations stop`

Stop a running automation.

```bash
databasin automations stop <automationId>
```

**Arguments:**

- `id` - Automation ID (will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive selection)
- `--force` - Force stop without confirmation

**Examples:**

```bash
# Stop automation (with confirmation)
databasin automations stop auto-123

# Force stop without confirmation
databasin automations stop auto-123 --force

# Interactive selection
databasin automations stop
```

**Output:**

```
⚠ Stop automation: Nightly ETL Automation (auto-123)?
  This will interrupt the current execution.
? Are you sure? (y/N) y

Stopping automation...
✔ Automation stopped successfully
  Status: stopped
  Interrupted run: run-abc-123
```

---

### `automations create`

Create a new automation from a JSON file or interactively.

```bash
databasin automations create [file]
```

**Arguments:**

- `file` - JSON file with automation configuration (optional, will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive mode)

**Examples:**

```bash
# Create from file
databasin automations create automation-config.json

# Interactive mode
databasin automations create
# Prompts for: project, name, schedule, tasks

# Interactive with project specified
databasin automations create --project 5QiuoY0J
```

**Configuration File Format:**

```json
{
  "name": "Nightly ETL Automation",
  "projectId": "5QiuoY0J",
  "enabled": true,
  "schedule": "0 2 * * *",
  "tasks": [
    {
      "name": "Extract Data",
      "type": "pipeline",
      "config": {
        "pipelineId": "pipeline-456"
      }
    },
    {
      "name": "Validate Data",
      "type": "validation",
      "config": {
        "rules": [...]
      }
    },
    {
      "name": "Load to Warehouse",
      "type": "pipeline",
      "config": {
        "pipelineId": "pipeline-789"
      }
    }
  ]
}
```

**Output:**

```
Reading automation configuration from: automation-config.json
Creating automation...
✔ Automation created successfully

✔ Automation created: Nightly ETL Automation
  ID: auto-123
  Status: active
  Enabled: true
  Schedule: Daily at 2 AM
  Tasks: 3

ℹ Run the automation with: databasin automations run auto-123
```

---

### `automations update`

Update an existing automation.

```bash
databasin automations update <automationId> [file]
```

**Arguments:**

- `id` - Automation ID (will prompt if not provided)
- `file` - JSON file with updated configuration (will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive selection)

**Examples:**

```bash
# Update from file
databasin automations update auto-123 updated-config.json

# Interactive file selection
databasin automations update auto-123

# Interactive automation and file selection
databasin automations update
```

**Output:**

```
Reading updated configuration from: updated-config.json
Updating automation...
✔ Automation updated successfully

✔ Automation updated: Nightly ETL Automation
  ID: auto-123
  Changes applied:
  - Schedule: 0 2 * * * → 0 3 * * *
  - Tasks: 3 → 4

ℹ Changes will take effect on next scheduled run
```

---

### `automations delete`

Delete an automation.

```bash
databasin automations delete <automationId>
```

**Arguments:**

- `id` - Automation ID (will prompt if not provided)

**Options:**

- `-p, --project <id>` - Project ID (for interactive selection)
- `--force` - Skip confirmation prompt

**Examples:**

```bash
# Delete with confirmation
databasin automations delete auto-123

# Force delete without confirmation
databasin automations delete auto-123 --force

# Interactive selection
databasin automations delete
```

**Output:**

```
⚠ Delete automation: Nightly ETL Automation (auto-123)?
  This action cannot be undone.
? Are you sure? (y/N) y

Deleting automation...
✔ Automation deleted successfully
  ID: auto-123
```

---

## Observability Commands

See [Observability Guide](./observability-guide.md) for detailed documentation on:

- `automations logs <id>` - View automation execution logs
- `automations tasks logs <id>` - View task execution logs
- `automations history <id>` - View automation execution history
- `automations tasks history <id>` - View task execution history

**Quick Examples:**

```bash
# View current automation logs
databasin automations logs auto-123

# View logs for specific run
databasin automations logs auto-123 --run-id run-456

# View automation execution history
databasin automations history auto-123 --limit 10

# View task execution logs
databasin automations tasks logs task-789

# View task execution history
databasin automations tasks history task-789
```

---

## Token Efficiency

Automation commands support token efficiency options to reduce API response size:

### Count Only

Get just the count without fetching full data:

```bash
databasin automations list --project 5QiuoY0J --count
# Output: 15
```

### Field Filtering

Fetch only specific fields:

```bash
databasin automations list --project 5QiuoY0J --fields "automationID,name,status"
```

### Result Limiting

Limit number of results:

```bash
databasin automations list --project 5QiuoY0J --limit 10
```

### Combined Optimization

```bash
databasin automations list --project 5QiuoY0J \
  --fields "automationID,name" \
  --limit 5 \
  --active
```

---

## Output Formats

All commands support multiple output formats:

### Table (Default)

Human-readable table format:

```bash
databasin automations list --project 5QiuoY0J
```

### JSON

Machine-readable JSON:

```bash
databasin automations list --project 5QiuoY0J --json
```

### CSV

Spreadsheet-compatible CSV:

```bash
databasin automations list --project 5QiuoY0J --csv
```

---

## Common Workflows

### List All Automations Across All Projects

```bash
# Get all projects
PROJECTS=$(databasin projects list --fields internalID --json | jq -r '.[].internalID')

# List automations in each project
for project in $PROJECTS; do
  echo "Project: $project"
  databasin automations list --project $project
done
```

### Create and Run an Automation

```bash
# Create automation
databasin automations create my-automation.json

# Extract automation ID from output
AUTO_ID=$(databasin automations list --project 5QiuoY0J --json | \
  jq -r '.[] | select(.name=="My Automation") | .automationID')

# Run the automation
databasin automations run $AUTO_ID
```

### Monitor Automation Status

```bash
# Get automation status
databasin automations get auto-123 --fields "status,lastRunDate,lastRunStatus"

# Check if automation is enabled
ENABLED=$(databasin automations get auto-123 --json | jq -r '.enabled')
if [ "$ENABLED" = "true" ]; then
  echo "Automation is enabled"
fi
```

### Monitor Running Automations

```bash
#!/bin/bash
# Monitor all running automations

# Get running automations
RUNNING=$(databasin automations list --project 5QiuoY0J --running --json)

echo "Currently running automations:"
echo "$RUNNING" | jq -r '.[] | "\(.automationID): \(.name)"'

# Monitor logs for each
echo "$RUNNING" | jq -r '.[].automationID' | while read id; do
  echo ""
  echo "=== Logs for $id ==="
  databasin automations logs "$id" --limit 10
done
```

### Export Automation Configurations

```bash
# Export all automations to JSON
databasin automations list --project 5QiuoY0J --json > automations-backup.json

# Export specific automation
databasin automations get auto-123 --json > automation-123.json
```

### Check Automation Health

```bash
#!/bin/bash
# Check automation health across all projects

check_automation_health() {
  local auto_id=$1
  local name=$2

  # Get recent history
  HISTORY=$(databasin automations history "$auto_id" --limit 5 --json)

  # Count failures
  FAILURES=$(echo "$HISTORY" | jq '[.[] | select(.status == "failed")] | length')

  if [ "$FAILURES" -gt 0 ]; then
    echo "⚠️  $name ($auto_id): $FAILURES recent failures"
    return 1
  else
    echo "✅ $name ($auto_id): Healthy"
    return 0
  fi
}

# Get all automations
AUTOMATIONS=$(databasin automations list --project 5QiuoY0J --json)

# Check each
echo "$AUTOMATIONS" | jq -r '.[] | "\(.automationID) \(.name)"' | while read id name; do
  check_automation_health "$id" "$name"
done
```

---

## Related Commands

- [`databasin projects`](./projects-guide.md) - Manage projects (required for automation listing)
- [`databasin pipelines`](./pipelines-guide.md) - Manage pipelines (often used as automation tasks)
- [`databasin automations logs`](./observability-guide.md) - View automation logs
- [`databasin automations history`](./observability-guide.md) - View automation history

---

## API Reference

Automation commands use these API endpoints:

- `GET /api/automations?projectId={id}` - List automations
- `GET /api/automations/{id}` - Get automation details
- `POST /api/automations` - Create automation
- `PUT /api/automations/{id}` - Update automation
- `DELETE /api/automations/{id}` - Delete automation
- `POST /api/automations/{id}/run` - Execute automation
- `POST /api/automations/{id}/stop` - Stop automation
- `GET /api/automations/logs` - Get automation logs
- `GET /api/automations/tasks/logs` - Get task logs
- `GET /api/automations/history/{id}` - Get automation history
- `GET /api/automations/tasks/history/{id}` - Get task history

---

## Troubleshooting

### "No automations found" message

**Problem:** No automations in the specified project

**Solution:**

```bash
# Create a new automation
databasin automations create automation-config.json

# Or check if filtering by wrong project
databasin projects list
databasin automations list --project correct-project-id
```

### "Automation not found" error

**Problem:** Invalid automation ID

**Solution:**

```bash
# List automations to find valid IDs
databasin automations list --project 5QiuoY0J
```

### "Access denied" error

**Problem:** Insufficient permissions

**Solution:**

- Verify you have access to the project
- Check project membership with `databasin projects get <id>`
- Contact project administrator

### "Automation is not enabled" error

**Problem:** Trying to run a disabled automation

**Solution:**

```bash
# Check automation status
databasin automations get auto-123 --fields "enabled,status"

# Enable automation (via update)
# Edit config file to set "enabled": true
databasin automations update auto-123 updated-config.json
```

### Large response warnings

**Problem:** Token usage warning when listing many automations

**Solution:**

```bash
# Use token efficiency options
databasin automations list --project 5QiuoY0J --limit 20
databasin automations list --project 5QiuoY0J --fields "automationID,name"
databasin automations list --project 5QiuoY0J --count
```

---

## Next Steps

- See `docs/automations-quickstart.md` for quick reference
- See `docs/observability-guide.md` for monitoring automation execution
- Review automation configuration examples in `examples/`
- Set up monitoring with `databasin automations logs` and `databasin automations history`
