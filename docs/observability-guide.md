# Pipeline & Automation Observability Commands

Monitor and troubleshoot Databasin pipelines and automations with comprehensive observability commands.

## Overview

The observability commands provide detailed insights into:
- **Pipeline execution history** - Track all pipeline runs with status, duration, and metadata
- **Artifact execution logs and history** - Monitor individual artifact processing
- **Automation execution logs and history** - View automation runs and task execution
- **Automation task logs and history** - Track specific task execution within automations

All commands support multiple output formats (table, JSON, CSV) and token efficiency options.

## Commands

### `pipelines history`

View pipeline execution history to track all runs, statuses, and performance metrics.

```bash
databasin pipelines history <pipelineId>
```

**Arguments:**

- `id` - Pipeline ID (required)

**Options:**

- `--count` - Return only the count of history entries
- `--limit <number>` - Limit number of results
- `--fields <fields>` - Comma-separated fields to display

**Examples:**

```bash
# View all pipeline runs
databasin pipelines history pipeline-123

# Get count only (efficient)
databasin pipelines history pipeline-123 --count

# Limit to recent 10 runs
databasin pipelines history pipeline-123 --limit 10

# Specific fields only
databasin pipelines history pipeline-123 --fields "timestamp,status,duration"

# Output as JSON
databasin pipelines history pipeline-123 --json

# Output as CSV
databasin pipelines history pipeline-123 --csv
```

**Output:**

```
Fetching pipeline history...
✔ Fetched 15 history entries

┌────────────────────┬──────────┬──────────┬────────────┬──────────────┐
│ Timestamp          │ Status   │ Duration │ Triggered  │ Error        │
├────────────────────┼──────────┼──────────┼────────────┼──────────────┤
│ 2024-12-06 14:30   │ success  │ 125s     │ scheduler  │ -            │
│ 2024-12-06 02:00   │ success  │ 118s     │ scheduler  │ -            │
│ 2024-12-05 02:00   │ failed   │ 45s      │ scheduler  │ Connection timeout │
│ 2024-12-04 02:00   │ success  │ 132s     │ manual     │ -            │
└────────────────────┴──────────┴──────────┴────────────┴──────────────┘
```

**Common Use Cases:**

```bash
# Monitor recent pipeline performance
databasin pipelines history pipeline-123 --limit 5

# Count total runs
databasin pipelines history pipeline-123 --count

# Export history for analysis
databasin pipelines history pipeline-123 --json > pipeline-history.json

# Check for failures
databasin pipelines history pipeline-123 --json | \
  jq '.[] | select(.status == "failed")'
```

---

### `pipelines artifacts logs`

View execution logs for a specific artifact within a pipeline.

```bash
databasin pipelines artifacts logs <artifactId>
```

**Arguments:**

- `id` - Artifact ID (required)

**Options:**

- `--run-id <id>` - Filter logs for a specific run (default: "0" for current run)
- `--limit <number>` - Limit number of log entries

**Examples:**

```bash
# View current run logs
databasin pipelines artifacts logs artifact-456

# View logs for specific run
databasin pipelines artifacts logs artifact-456 --run-id run-789

# Limit to recent 50 entries
databasin pipelines artifacts logs artifact-456 --limit 50

# Output as JSON
databasin pipelines artifacts logs artifact-456 --json

# Output as CSV
databasin pipelines artifacts logs artifact-456 --csv
```

**Output:**

```
Fetching artifact logs...
✔ Fetched 23 log entries

2024-12-06 14:30:15 [INFO] Starting artifact execution
2024-12-06 14:30:16 [INFO] Connected to source database
2024-12-06 14:30:17 [INFO] Executing query: SELECT * FROM orders WHERE...
2024-12-06 14:30:45 [INFO] Retrieved 1,250 records
2024-12-06 14:31:02 [INFO] Transforming data batch 1/5
2024-12-06 14:31:15 [INFO] Transforming data batch 2/5
2024-12-06 14:32:10 [INFO] All transformations complete
2024-12-06 14:32:11 [INFO] Writing to destination
2024-12-06 14:32:40 [INFO] Artifact execution completed successfully
```

**Parameter Mapping:**

The `--run-id` CLI option maps to the API's `currentRunID` parameter:
- `--run-id 0` or omitted = current/latest run
- `--run-id run-123` = specific run ID

**Common Use Cases:**

```bash
# Monitor current execution
databasin pipelines artifacts logs artifact-456

# Debug failed run
databasin pipelines artifacts logs artifact-456 --run-id run-failed-789

# Export logs for analysis
databasin pipelines artifacts logs artifact-456 --json > artifact-logs.json

# Real-time monitoring (combine with watch)
watch -n 5 'databasin pipelines artifacts logs artifact-456 --limit 10'
```

---

### `pipelines artifacts history`

View execution history for a specific artifact.

```bash
databasin pipelines artifacts history <artifactId>
```

**Arguments:**

- `id` - Artifact ID (required)

**Options:**

- `--count` - Return only the count of history entries
- `--limit <number>` - Limit number of results
- `--fields <fields>` - Comma-separated fields to display

**Examples:**

```bash
# View all artifact runs
databasin pipelines artifacts history artifact-456

# Get count only
databasin pipelines artifacts history artifact-456 --count

# Limit to recent 10 runs
databasin pipelines artifacts history artifact-456 --limit 10

# Specific fields only
databasin pipelines artifacts history artifact-456 --fields "timestamp,status,recordsProcessed"

# Output as JSON
databasin pipelines artifacts history artifact-456 --json
```

**Output:**

```
Fetching artifact history...
✔ Fetched 8 history entries

┌────────────────────┬──────────┬──────────────────┬────────┐
│ Timestamp          │ Status   │ Records Proc.    │ Errors │
├────────────────────┼──────────┼──────────────────┼────────┤
│ 2024-12-06 14:30   │ success  │ 1,250            │ 0      │
│ 2024-12-06 02:00   │ success  │ 1,198            │ 0      │
│ 2024-12-05 02:00   │ failed   │ 0                │ 1      │
│ 2024-12-04 02:00   │ success  │ 1,305            │ 0      │
└────────────────────┴──────────┴──────────────────┴────────┘
```

**Common Use Cases:**

```bash
# Track artifact performance
databasin pipelines artifacts history artifact-456 --limit 20

# Count total executions
databasin pipelines artifacts history artifact-456 --count

# Export for analysis
databasin pipelines artifacts history artifact-456 --json > artifact-history.json

# Check for errors
databasin pipelines artifacts history artifact-456 --json | \
  jq '.[] | select(.errors > 0)'
```

---

### `automations logs`

View execution logs for an automation.

```bash
databasin automations logs <automationId>
```

**Arguments:**

- `id` - Automation ID (required)

**Options:**

- `--run-id <id>` - Filter logs for a specific run (default: "0" for current run)
- `--limit <number>` - Limit number of log entries

**Examples:**

```bash
# View current run logs
databasin automations logs auto-123

# View logs for specific run
databasin automations logs auto-123 --run-id run-456

# Limit to recent 100 entries
databasin automations logs auto-123 --limit 100

# Output as JSON
databasin automations logs auto-123 --json

# Output as CSV
databasin automations logs auto-123 --csv
```

**Output:**

```
Fetching automation logs...
✔ Fetched 45 log entries

2024-12-06 10:00:00 [INFO] Automation started
2024-12-06 10:00:01 [INFO] Executing task: Extract Data
2024-12-06 10:01:15 [INFO] Task 'Extract Data' completed successfully
2024-12-06 10:01:16 [INFO] Executing task: Transform Data
2024-12-06 10:02:30 [INFO] Task 'Transform Data' completed successfully
2024-12-06 10:02:31 [INFO] Executing task: Load Data
2024-12-06 10:03:45 [INFO] Task 'Load Data' completed successfully
2024-12-06 10:03:46 [INFO] Automation completed successfully
```

**Parameter Mapping:**

The `--run-id` CLI option maps to the API's `currentRunID` parameter:
- `--run-id 0` or omitted = current/latest run
- `--run-id run-123` = specific run ID

**Common Use Cases:**

```bash
# Monitor current execution
databasin automations logs auto-123

# Debug failed run
databasin automations logs auto-123 --run-id run-failed-456

# Export logs
databasin automations logs auto-123 --json > automation-logs.json

# Monitor with live updates
watch -n 5 'databasin automations logs auto-123 --limit 20'
```

---

### `automations tasks logs`

View execution logs for a specific automation task.

```bash
databasin automations tasks logs <taskId>
```

**Arguments:**

- `id` - Automation Task ID (required)

**Options:**

- `--run-id <id>` - Filter logs for a specific run (default: "0" for current run)
- `--limit <number>` - Limit number of log entries

**Examples:**

```bash
# View current run logs
databasin automations tasks logs task-789

# View logs for specific run
databasin automations tasks logs task-789 --run-id run-456

# Limit to recent 50 entries
databasin automations tasks logs task-789 --limit 50

# Output as JSON
databasin automations tasks logs task-789 --json
```

**Output:**

```
Fetching automation task logs...
✔ Fetched 12 log entries

2024-12-06 10:01:16 [INFO] Task started: Transform Data
2024-12-06 10:01:17 [INFO] Loading transformation rules
2024-12-06 10:01:18 [INFO] Processing batch 1/5
2024-12-06 10:01:45 [INFO] Processing batch 2/5
2024-12-06 10:02:12 [INFO] Processing batch 3/5
2024-12-06 10:02:25 [INFO] All batches processed
2024-12-06 10:02:30 [INFO] Task completed successfully
```

**Common Use Cases:**

```bash
# Debug task execution
databasin automations tasks logs task-789

# Monitor specific task run
databasin automations tasks logs task-789 --run-id run-456

# Export task logs
databasin automations tasks logs task-789 --json > task-logs.json
```

---

### `automations history`

View automation execution history.

```bash
databasin automations history <automationId>
```

**Arguments:**

- `id` - Automation ID (required)

**Options:**

- `--count` - Return only the count of history entries
- `--limit <number>` - Limit number of results
- `--fields <fields>` - Comma-separated fields to display

**Examples:**

```bash
# View all automation runs
databasin automations history auto-123

# Get count only
databasin automations history auto-123 --count

# Limit to recent 10 runs
databasin automations history auto-123 --limit 10

# Specific fields only
databasin automations history auto-123 --fields "timestamp,status,duration,tasksCompleted"

# Output as JSON
databasin automations history auto-123 --json
```

**Output:**

```
Fetching automation history...
✔ Fetched 20 history entries

┌────────────────────┬──────────┬──────────┬────────────┬──────────┐
│ Timestamp          │ Status   │ Duration │ Tasks Done │ Failed   │
├────────────────────┼──────────┼──────────┼────────────┼──────────┤
│ 2024-12-06 10:00   │ success  │ 225s     │ 3          │ 0        │
│ 2024-12-05 10:00   │ success  │ 218s     │ 3          │ 0        │
│ 2024-12-04 10:00   │ failed   │ 95s      │ 1          │ 2        │
│ 2024-12-03 10:00   │ success  │ 230s     │ 3          │ 0        │
└────────────────────┴──────────┴──────────┴────────────┴──────────┘
```

**Common Use Cases:**

```bash
# Track automation reliability
databasin automations history auto-123 --limit 30

# Count total runs
databasin automations history auto-123 --count

# Export for analysis
databasin automations history auto-123 --json > automation-history.json

# Find failures
databasin automations history auto-123 --json | \
  jq '.[] | select(.status == "failed")'
```

---

### `automations tasks history`

View execution history for a specific automation task.

```bash
databasin automations tasks history <taskId>
```

**Arguments:**

- `id` - Automation Task ID (required)

**Options:**

- `--count` - Return only the count of history entries
- `--limit <number>` - Limit number of results
- `--fields <fields>` - Comma-separated fields to display

**Examples:**

```bash
# View all task executions
databasin automations tasks history task-789

# Get count only
databasin automations tasks history task-789 --count

# Limit to recent 10 runs
databasin automations tasks history task-789 --limit 10

# Specific fields only
databasin automations tasks history task-789 --fields "timestamp,status,duration,result"

# Output as JSON
databasin automations tasks history task-789 --json
```

**Output:**

```
Fetching automation task history...
✔ Fetched 15 history entries

┌────────────────────┬──────────┬──────────┬──────────┐
│ Timestamp          │ Status   │ Duration │ Type     │
├────────────────────┼──────────┼──────────┼──────────┤
│ 2024-12-06 10:01   │ success  │ 74s      │ transform│
│ 2024-12-05 10:01   │ success  │ 71s      │ transform│
│ 2024-12-04 10:01   │ failed   │ 12s      │ transform│
│ 2024-12-03 10:01   │ success  │ 75s      │ transform│
└────────────────────┴──────────┴──────────┴──────────┘
```

**Common Use Cases:**

```bash
# Track task performance
databasin automations tasks history task-789 --limit 20

# Count executions
databasin automations tasks history task-789 --count

# Export for analysis
databasin automations tasks history task-789 --json > task-history.json

# Check task failures
databasin automations tasks history task-789 --json | \
  jq '.[] | select(.status == "failed")'
```

---

## Token Efficiency

All observability commands support token efficiency options:

### Count Only

Get just the count without fetching full data:

```bash
databasin pipelines history pipeline-123 --count
# Output: 42

databasin automations history auto-456 --count
# Output: 18
```

### Field Filtering

Fetch only specific fields:

```bash
databasin pipelines history pipeline-123 --fields "timestamp,status,duration"
databasin automations history auto-456 --fields "timestamp,status,tasksCompleted"
```

### Result Limiting

Limit number of results:

```bash
databasin pipelines history pipeline-123 --limit 10
databasin automations history auto-456 --limit 20
```

### Combined Optimization

```bash
databasin pipelines history pipeline-123 \
  --fields "timestamp,status" \
  --limit 5

databasin automations history auto-456 \
  --fields "timestamp,status,duration" \
  --limit 10
```

---

## Output Formats

All commands support multiple output formats:

### Table (Default)

Human-readable table format:

```bash
databasin pipelines history pipeline-123
databasin automations logs auto-456
```

### JSON

Machine-readable JSON for scripting:

```bash
databasin pipelines history pipeline-123 --json
databasin automations history auto-456 --json
```

### CSV

Spreadsheet-compatible CSV:

```bash
databasin pipelines history pipeline-123 --csv
databasin automations history auto-456 --csv
```

---

## Common Workflows

### Monitor Pipeline Health

```bash
#!/bin/bash
# Check recent pipeline executions for failures

PIPELINE_ID="pipeline-123"

# Get recent runs
RECENT_RUNS=$(databasin pipelines history "$PIPELINE_ID" --limit 10 --json)

# Count failures
FAILURE_COUNT=$(echo "$RECENT_RUNS" | jq '[.[] | select(.status == "failed")] | length')

echo "Recent failures: $FAILURE_COUNT"

if [ "$FAILURE_COUNT" -gt 0 ]; then
  echo "Failed runs:"
  echo "$RECENT_RUNS" | jq -r '.[] | select(.status == "failed") | "\(.timestamp) - \(.errorMessage)"'
fi
```

### Track Automation Performance

```bash
#!/bin/bash
# Calculate average automation duration

AUTO_ID="auto-456"

# Get recent runs
HISTORY=$(databasin automations history "$AUTO_ID" --limit 20 --json)

# Calculate average duration
AVG_DURATION=$(echo "$HISTORY" | jq '[.[] | .duration] | add / length')

echo "Average automation duration: ${AVG_DURATION}s"

# Find slowest run
SLOWEST=$(echo "$HISTORY" | jq -r 'max_by(.duration) | "\(.timestamp) - \(.duration)s"')
echo "Slowest run: $SLOWEST"
```

### Export Logs for Analysis

```bash
#!/bin/bash
# Export all logs to timestamped files

DATE=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="./logs/$DATE"

mkdir -p "$OUTPUT_DIR"

# Export pipeline history
databasin pipelines history pipeline-123 --json > "$OUTPUT_DIR/pipeline-history.json"

# Export artifact logs
databasin pipelines artifacts logs artifact-456 --json > "$OUTPUT_DIR/artifact-logs.json"

# Export automation history
databasin automations history auto-789 --json > "$OUTPUT_DIR/automation-history.json"

# Compress exports
tar -czf "logs-$DATE.tar.gz" "$OUTPUT_DIR"

echo "Logs exported to logs-$DATE.tar.gz"
```

### Real-Time Monitoring

```bash
#!/bin/bash
# Monitor current automation execution

AUTO_ID="auto-123"

echo "Monitoring automation: $AUTO_ID"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  clear
  echo "=== Automation Logs ($(date)) ==="
  databasin automations logs "$AUTO_ID" --limit 20
  sleep 5
done
```

### Failure Alerting

```bash
#!/bin/bash
# Check for failures and send alerts

check_pipeline_failures() {
  local pipeline_id=$1

  # Get recent runs
  local runs=$(databasin pipelines history "$pipeline_id" --limit 5 --json)

  # Check for failures
  local failures=$(echo "$runs" | jq '[.[] | select(.status == "failed")] | length')

  if [ "$failures" -gt 0 ]; then
    echo "ALERT: Pipeline $pipeline_id has $failures failed runs"

    # Get error messages
    echo "$runs" | jq -r '.[] | select(.status == "failed") | "  \(.timestamp): \(.errorMessage)"'

    # Send notification (example)
    # curl -X POST https://alerts.example.com/webhook \
    #   -d "Pipeline $pipeline_id has failures"

    return 1
  fi

  return 0
}

# Check multiple pipelines
for pipeline in pipeline-123 pipeline-456 pipeline-789; do
  check_pipeline_failures "$pipeline"
done
```

---

## Related Commands

- [`databasin pipelines`](./pipelines-guide.md) - Manage and run pipelines
- [`databasin automations`](./automations-guide.md) - Manage and run automations
- [`databasin projects`](./projects-guide.md) - Manage projects

---

## API Reference

Observability commands use these API endpoints:

**Pipeline Observability:**
- `GET /api/pipeline/history/{id}` - Get pipeline history
- `GET /api/artifacts/logs` - Get artifact logs
- `GET /api/artifacts/history/{id}` - Get artifact history

**Automation Observability:**
- `GET /api/automations/logs` - Get automation logs
- `GET /api/automations/tasks/logs` - Get automation task logs
- `GET /api/automations/history/{id}` - Get automation history
- `GET /api/automations/tasks/history/{id}` - Get automation task history

---

## Troubleshooting

### "Pipeline not found" error

**Problem:** Invalid pipeline or artifact ID

**Solution:**

```bash
# List pipelines to find valid IDs
databasin pipelines list --project proj-123

# Get pipeline details
databasin pipelines get pipeline-123
```

### "Automation not found" error

**Problem:** Invalid automation or task ID

**Solution:**

```bash
# List automations to find valid IDs
databasin automations list --project proj-123

# Get automation details
databasin automations get auto-456
```

### Empty logs or history

**Problem:** No execution logs or history available

**Solution:**

- Verify the resource has been executed at least once
- Check if you're using the correct resource ID
- Ensure you have permissions to view the logs

```bash
# Check if pipeline has been run
databasin pipelines get pipeline-123 --fields "lastRunDate"

# Check automation status
databasin automations get auto-456 --fields "lastRunDate,status"
```

### Large response warnings

**Problem:** Token usage warning when fetching extensive history

**Solution:**

```bash
# Use token efficiency options
databasin pipelines history pipeline-123 --limit 20
databasin pipelines history pipeline-123 --fields "timestamp,status"
databasin pipelines history pipeline-123 --count
```

---

## Next Steps

- See implementation details in `OBSERVABILITY_IMPLEMENTATION.md`
- Review quick start guide in `docs/observability-quickstart.md`
- Check usage examples in `docs/usage-examples.md`
