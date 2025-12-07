# Pipeline & Automation Observability - Quick Start Guide

Fast reference for monitoring and troubleshooting Databasin pipelines and automations.

## Quick Commands

### Pipeline Observability

```bash
# View pipeline execution history
databasin pipelines history pipeline-123

# View artifact logs
databasin pipelines artifacts logs artifact-456

# View artifact execution history
databasin pipelines artifacts history artifact-456
```

### Automation Observability

```bash
# View automation logs
databasin automations logs auto-123

# View automation task logs
databasin automations tasks logs task-789

# View automation execution history
databasin automations history auto-123

# View automation task execution history
databasin automations tasks history task-789
```

## Common Use Cases

### 1. Check if pipeline ran successfully

```bash
# Get recent runs
databasin pipelines history pipeline-123 --limit 5

# Check for failures
databasin pipelines history pipeline-123 --json | \
  jq '.[] | select(.status == "failed")'
```

### 2. Debug failed pipeline run

```bash
# Get pipeline history to find failed run
databasin pipelines history pipeline-123 --limit 10

# View artifact logs for failed run
databasin pipelines artifacts logs artifact-456 --run-id run-failed-789

# Check artifact execution history
databasin pipelines artifacts history artifact-456 --limit 10
```

### 3. Monitor automation execution

```bash
# View current automation logs
databasin automations logs auto-123

# Check automation run history
databasin automations history auto-123 --limit 10

# View specific task logs
databasin automations tasks logs task-789
```

### 4. Track performance trends

```bash
# Export pipeline history for analysis
databasin pipelines history pipeline-123 --json > pipeline-history.json

# Calculate average duration
cat pipeline-history.json | jq '[.[] | .duration] | add / length'

# Find slowest runs
cat pipeline-history.json | jq -r 'sort_by(.duration) | reverse | .[0:5] | .[] | "\(.timestamp) - \(.duration)s"'
```

### 5. Export logs for debugging

```bash
# Create logs directory
mkdir -p ./logs/$(date +%Y%m%d)

# Export all logs
databasin pipelines history pipeline-123 --json > ./logs/$(date +%Y%m%d)/pipeline-history.json
databasin pipelines artifacts logs artifact-456 --json > ./logs/$(date +%Y%m%d)/artifact-logs.json
databasin automations history auto-123 --json > ./logs/$(date +%Y%m%d)/automation-history.json
```

### 6. Count executions

```bash
# Count pipeline runs
databasin pipelines history pipeline-123 --count

# Count automation runs
databasin automations history auto-123 --count

# Count artifact executions
databasin pipelines artifacts history artifact-456 --count
```

## Token Efficiency Tips

```bash
# Get count only (fast)
databasin pipelines history pipeline-123 --count
databasin automations history auto-123 --count

# Limit fields (reduce data)
databasin pipelines history pipeline-123 --fields "timestamp,status,duration"
databasin automations history auto-123 --fields "timestamp,status,tasksCompleted"

# Limit results (paginate)
databasin pipelines history pipeline-123 --limit 10
databasin automations history auto-123 --limit 20

# Combine all
databasin pipelines history pipeline-123 \
  --fields "timestamp,status" \
  --limit 5
```

## Output Formats

```bash
# Table (default)
databasin pipelines history pipeline-123

# JSON (for scripts)
databasin pipelines history pipeline-123 --json

# CSV (for spreadsheets)
databasin pipelines history pipeline-123 --csv
```

## Error Recovery

### "Pipeline not found"

```bash
# Solution: List pipelines first
databasin pipelines list --project proj-123
```

### "Automation not found"

```bash
# Solution: List automations first
databasin automations list --project proj-123
```

### Empty logs or history

```bash
# Solution: Check if resource has been executed
databasin pipelines get pipeline-123 --fields "lastRunDate"
databasin automations get auto-123 --fields "lastRunDate,status"
```

## Scripting Examples

### Monitor pipeline health

```bash
#!/bin/bash
PIPELINE_ID="pipeline-123"

# Get recent runs
RECENT=$(databasin pipelines history "$PIPELINE_ID" --limit 10 --json)

# Count failures
FAILURES=$(echo "$RECENT" | jq '[.[] | select(.status == "failed")] | length')

if [ "$FAILURES" -gt 0 ]; then
  echo "⚠ Pipeline has $FAILURES recent failures"
  echo "$RECENT" | jq -r '.[] | select(.status == "failed") | "\(.timestamp): \(.errorMessage)"'
else
  echo "✓ Pipeline is healthy"
fi
```

### Real-time log monitoring

```bash
#!/bin/bash
AUTO_ID="auto-123"

echo "Monitoring automation logs (Ctrl+C to stop)..."
while true; do
  clear
  echo "=== Logs ($(date +%H:%M:%S)) ==="
  databasin automations logs "$AUTO_ID" --limit 15
  sleep 5
done
```

### Calculate success rate

```bash
#!/bin/bash
PIPELINE_ID="pipeline-123"

# Get last 50 runs
HISTORY=$(databasin pipelines history "$PIPELINE_ID" --limit 50 --json)

# Calculate success rate
TOTAL=$(echo "$HISTORY" | jq 'length')
SUCCESS=$(echo "$HISTORY" | jq '[.[] | select(.status == "success")] | length')
RATE=$(echo "scale=2; $SUCCESS * 100 / $TOTAL" | bc)

echo "Pipeline success rate: ${RATE}% ($SUCCESS/$TOTAL)"
```

### Export logs with timestamp

```bash
#!/bin/bash
# export-logs.sh - Export all observability data

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="./exports/$TIMESTAMP"

mkdir -p "$OUTPUT_DIR"

# Pipeline observability
databasin pipelines history pipeline-123 --json > "$OUTPUT_DIR/pipeline-history.json"
databasin pipelines artifacts logs artifact-456 --json > "$OUTPUT_DIR/artifact-logs.json"
databasin pipelines artifacts history artifact-456 --json > "$OUTPUT_DIR/artifact-history.json"

# Automation observability
databasin automations logs auto-123 --json > "$OUTPUT_DIR/automation-logs.json"
databasin automations history auto-123 --json > "$OUTPUT_DIR/automation-history.json"
databasin automations tasks logs task-789 --json > "$OUTPUT_DIR/task-logs.json"
databasin automations tasks history task-789 --json > "$OUTPUT_DIR/task-history.json"

# Compress
tar -czf "exports-$TIMESTAMP.tar.gz" "$OUTPUT_DIR"
echo "Logs exported to exports-$TIMESTAMP.tar.gz"
```

### Check for recent failures

```bash
#!/bin/bash
# check-failures.sh - Alert on recent failures

check_failures() {
  local type=$1
  local id=$2

  case $type in
    pipeline)
      RECENT=$(databasin pipelines history "$id" --limit 5 --json)
      ;;
    automation)
      RECENT=$(databasin automations history "$id" --limit 5 --json)
      ;;
  esac

  FAILURES=$(echo "$RECENT" | jq -r '.[] | select(.status == "failed") | "\(.timestamp): \(.errorMessage // "Unknown error")"')

  if [ -n "$FAILURES" ]; then
    echo "❌ $type $id has recent failures:"
    echo "$FAILURES"
    return 1
  else
    echo "✅ $type $id is healthy"
    return 0
  fi
}

# Check multiple resources
check_failures pipeline pipeline-123
check_failures pipeline pipeline-456
check_failures automation auto-123
check_failures automation auto-789
```

## Advanced Filtering with jq

### Filter by date range

```bash
# Get runs from last 7 days
databasin pipelines history pipeline-123 --json | \
  jq --arg date "$(date -d '7 days ago' +%Y-%m-%d)" \
    '[.[] | select(.timestamp >= $date)]'
```

### Group by status

```bash
# Count runs by status
databasin pipelines history pipeline-123 --json | \
  jq 'group_by(.status) | map({status: .[0].status, count: length})'
```

### Find longest runs

```bash
# Get top 5 longest runs
databasin pipelines history pipeline-123 --json | \
  jq 'sort_by(.duration) | reverse | .[0:5] | .[] | {timestamp, duration, status}'
```

### Calculate total processing time

```bash
# Sum all durations
databasin pipelines history pipeline-123 --json | \
  jq '[.[] | .duration] | add'
```

### Find error patterns

```bash
# Extract all error messages
databasin pipelines history pipeline-123 --json | \
  jq -r '.[] | select(.errorMessage != null) | .errorMessage' | \
  sort | uniq -c | sort -nr
```

## Monitoring Dashboard (Terminal)

```bash
#!/bin/bash
# dashboard.sh - Simple terminal dashboard

PIPELINE_ID="pipeline-123"
AUTO_ID="auto-123"

while true; do
  clear
  echo "==================================="
  echo "  Databasin Observability Dashboard"
  echo "  $(date)"
  echo "==================================="
  echo ""

  # Pipeline stats
  echo "📊 Pipeline Statistics"
  echo "-----------------------------------"
  PIPELINE_COUNT=$(databasin pipelines history "$PIPELINE_ID" --count)
  echo "Total runs: $PIPELINE_COUNT"

  PIPELINE_RECENT=$(databasin pipelines history "$PIPELINE_ID" --limit 10 --json)
  SUCCESS=$(echo "$PIPELINE_RECENT" | jq '[.[] | select(.status == "success")] | length')
  echo "Recent successes (last 10): $SUCCESS/10"
  echo ""

  # Automation stats
  echo "🤖 Automation Statistics"
  echo "-----------------------------------"
  AUTO_COUNT=$(databasin automations history "$AUTO_ID" --count)
  echo "Total runs: $AUTO_COUNT"

  AUTO_RECENT=$(databasin automations history "$AUTO_ID" --limit 10 --json)
  AUTO_SUCCESS=$(echo "$AUTO_RECENT" | jq '[.[] | select(.status == "success")] | length')
  echo "Recent successes (last 10): $AUTO_SUCCESS/10"
  echo ""

  # Recent logs
  echo "📝 Recent Logs"
  echo "-----------------------------------"
  databasin automations logs "$AUTO_ID" --limit 5
  echo ""

  echo "Refreshing in 30s... (Ctrl+C to stop)"
  sleep 30
done
```

## Quick Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `pipelines history` | View pipeline runs | `databasin pipelines history pipeline-123` |
| `pipelines artifacts logs` | View artifact logs | `databasin pipelines artifacts logs artifact-456` |
| `pipelines artifacts history` | View artifact runs | `databasin pipelines artifacts history artifact-456` |
| `automations logs` | View automation logs | `databasin automations logs auto-123` |
| `automations tasks logs` | View task logs | `databasin automations tasks logs task-789` |
| `automations history` | View automation runs | `databasin automations history auto-123` |
| `automations tasks history` | View task runs | `databasin automations tasks history task-789` |

## Options Reference

| Option | Purpose | Works With |
|--------|---------|------------|
| `--count` | Get count only | history commands |
| `--limit <n>` | Limit results | all commands |
| `--fields <fields>` | Filter fields | history commands |
| `--run-id <id>` | Specific run | log commands |
| `--json` | JSON output | all commands |
| `--csv` | CSV output | all commands |

## Next Steps

- 📖 Full documentation: `docs/observability-guide.md`
- 📝 Implementation details: `OBSERVABILITY_IMPLEMENTATION.md`
- 🔧 Related commands: `docs/pipelines-guide.md`, `docs/automations-guide.md`
- 💡 More examples: `docs/usage-examples.md`

---

**Happy monitoring! 🔍**
