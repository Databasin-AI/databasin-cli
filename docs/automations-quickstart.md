# Automations Commands - Quick Start Guide

Fast reference for using Databasin CLI automation commands.

## Quick Commands

```bash
# List automations in a project
databasin automations list --project 5QiuoY0J

# Get automation details
databasin automations get auto-456

# Run an automation
databasin automations run auto-456

# View automation logs
databasin automations logs auto-456

# View automation history
databasin automations history auto-456
```

## Common Use Cases

### 1. Find an automation by name

```bash
databasin automations list --project 5QiuoY0J --json | \
  jq '.[] | select(.name | contains("ETL"))'
```

### 2. List only active automations

```bash
databasin automations list --project 5QiuoY0J --active
```

### 3. List running automations

```bash
databasin automations list --project 5QiuoY0J --running
```

### 4. Get automation count

```bash
databasin automations list --project 5QiuoY0J --count
```

### 5. Create automation from file

```bash
cat > my-automation.json << 'EOF'
{
  "name": "My Automation",
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
    }
  ]
}
EOF

databasin automations create my-automation.json
```

### 6. Run automation and check logs

```bash
# Run it
databasin automations run auto-456

# View logs
databasin automations logs auto-456

# Check status
databasin automations get auto-456 --fields "status,lastRunStatus"
```

### 7. Export all automations

```bash
databasin automations list --project 5QiuoY0J --json > automations-backup.json
```

### 8. Monitor automation execution

```bash
# View current logs
databasin automations logs auto-456

# View execution history
databasin automations history auto-456 --limit 10

# View specific task logs
databasin automations tasks logs task-789
```

## Interactive Mode

For any command without required arguments, interactive mode kicks in:

```bash
# Interactive project selection
databasin automations list

# Interactive automation selection
databasin automations get

# Interactive automation run
databasin automations run
```

## Token Efficiency Tips

```bash
# Get count only (fast)
databasin automations list --project 5QiuoY0J --count

# Limit fields (reduce data)
databasin automations list --project 5QiuoY0J --fields "automationID,name,status"

# Limit results (paginate)
databasin automations list --project 5QiuoY0J --limit 10

# Combine all
databasin automations list --project 5QiuoY0J \
  --fields "automationID,name" \
  --limit 5 \
  --active
```

## Output Formats

```bash
# Table (default)
databasin automations list --project 5QiuoY0J

# JSON (for scripts)
databasin automations list --project 5QiuoY0J --json

# CSV (for spreadsheets)
databasin automations list --project 5QiuoY0J --csv
```

## Error Recovery

### "No automations found"

```bash
# Solution: Check project or create new automation
databasin automations create automation-config.json
```

### "Automation not found"

```bash
# Solution: List automations first
databasin automations list --project 5QiuoY0J
```

### "Access denied"

```bash
# Solution: Check project access
databasin projects get 5QiuoY0J
```

### "Automation is not enabled"

```bash
# Solution: Enable the automation
# Update config file to set "enabled": true
databasin automations update auto-456 updated-config.json
```

## Scripting Examples

### Loop through all projects

```bash
for project in $(databasin projects list --json | jq -r '.[].internalID'); do
  echo "Automations in $project:"
  databasin automations list --project $project
done
```

### Find automations by status

```bash
# Active automations
databasin automations list --project 5QiuoY0J --active --json

# Running automations
databasin automations list --project 5QiuoY0J --running --json
```

### Count automations by status

```bash
PROJECT="5QiuoY0J"
echo "Active: $(databasin automations list --project $PROJECT --active --count)"
echo "Running: $(databasin automations list --project $PROJECT --running --count)"
```

### Monitor automation health

```bash
#!/bin/bash
# check-automation-health.sh

AUTO_ID="auto-456"

# Get recent history
HISTORY=$(databasin automations history "$AUTO_ID" --limit 10 --json)

# Count failures
FAILURES=$(echo "$HISTORY" | jq '[.[] | select(.status == "failed")] | length')

if [ "$FAILURES" -gt 0 ]; then
  echo "⚠️  Automation has $FAILURES recent failures"
  echo "$HISTORY" | jq -r '.[] | select(.status == "failed") | "\(.timestamp): \(.errorMessage)"'
else
  echo "✅ Automation is healthy"
fi
```

### Real-time log monitoring

```bash
#!/bin/bash
# monitor-automation.sh

AUTO_ID="auto-456"

echo "Monitoring automation logs (Ctrl+C to stop)..."
while true; do
  clear
  echo "=== Automation Logs ($(date +%H:%M:%S)) ==="
  databasin automations logs "$AUTO_ID" --limit 20
  sleep 5
done
```

### Auto-restart failed automations

```bash
#!/bin/bash
# auto-restart.sh - Restart failed automations

AUTO_IDS=("auto-123" "auto-456" "auto-789")

for auto_id in "${AUTO_IDS[@]}"; do
  # Check last run status
  STATUS=$(databasin automations get "$auto_id" --json | jq -r '.lastRunStatus')

  if [ "$STATUS" = "failed" ]; then
    echo "⚠️  Automation $auto_id failed. Restarting..."
    databasin automations run "$auto_id"
  else
    echo "✅ Automation $auto_id is healthy ($STATUS)"
  fi
done
```

### Export automation stats

```bash
#!/bin/bash
# export-automation-stats.sh

PROJECT="5QiuoY0J"
OUTPUT_FILE="automation-stats-$(date +%Y%m%d).json"

# Get all automations
AUTOMATIONS=$(databasin automations list --project "$PROJECT" --json)

# For each automation, get history
echo "$AUTOMATIONS" | jq -r '.[].automationID' | while read auto_id; do
  HISTORY=$(databasin automations history "$auto_id" --limit 30 --json)

  # Calculate stats
  TOTAL=$(echo "$HISTORY" | jq 'length')
  SUCCESS=$(echo "$HISTORY" | jq '[.[] | select(.status == "success")] | length')
  FAILED=$(echo "$HISTORY" | jq '[.[] | select(.status == "failed")] | length')

  # Output stats
  jq -n \
    --arg id "$auto_id" \
    --argjson total "$TOTAL" \
    --argjson success "$SUCCESS" \
    --argjson failed "$FAILED" \
    '{
      automationID: $id,
      totalRuns: $total,
      successCount: $success,
      failureCount: $failed,
      successRate: (if $total > 0 then ($success * 100 / $total) else 0 end)
    }'
done | jq -s '.' > "$OUTPUT_FILE"

echo "Stats exported to $OUTPUT_FILE"
```

### Batch create automations

```bash
#!/bin/bash
# batch-create-automations.sh

CONFIG_DIR="./automation-configs"

for config_file in "$CONFIG_DIR"/*.json; do
  echo "Creating automation from $config_file..."
  databasin automations create "$config_file"
done
```

### Daily automation report

```bash
#!/bin/bash
# daily-automation-report.sh - Generate daily automation report

PROJECT="5QiuoY0J"
DATE=$(date +%Y-%m-%d)

echo "Automation Report - $DATE"
echo "================================"
echo ""

# Get all automations
AUTOMATIONS=$(databasin automations list --project "$PROJECT" --json)

# Count by status
TOTAL=$(echo "$AUTOMATIONS" | jq 'length')
ACTIVE=$(echo "$AUTOMATIONS" | jq '[.[] | select(.status == "active")] | length')
RUNNING=$(echo "$AUTOMATIONS" | jq '[.[] | select(.status == "running")] | length')

echo "Summary:"
echo "  Total automations: $TOTAL"
echo "  Active: $ACTIVE"
echo "  Running: $RUNNING"
echo ""

# Check each automation's last run
echo "Last Run Status:"
echo "$AUTOMATIONS" | jq -r '.[] | "\(.name) (\(.automationID)): \(.lastRunStatus // "never run")"'
echo ""

# Check for failures in last 24 hours
echo "Recent Failures:"
YESTERDAY=$(date -d '1 day ago' +%Y-%m-%d)

echo "$AUTOMATIONS" | jq -r '.[].automationID' | while read auto_id; do
  HISTORY=$(databasin automations history "$auto_id" --limit 10 --json)
  RECENT_FAILURES=$(echo "$HISTORY" | jq --arg date "$YESTERDAY" \
    '[.[] | select(.status == "failed" and .timestamp >= $date)] | length')

  if [ "$RECENT_FAILURES" -gt 0 ]; then
    NAME=$(echo "$AUTOMATIONS" | jq -r ".[] | select(.automationID == \"$auto_id\") | .name")
    echo "  $NAME ($auto_id): $RECENT_FAILURES failures"
  fi
done
```

## Configuration File Template

Minimal:
```json
{
  "name": "My Automation",
  "projectId": "5QiuoY0J",
  "enabled": true,
  "schedule": "0 2 * * *",
  "tasks": []
}
```

Complete:
```json
{
  "name": "Nightly ETL Automation",
  "projectId": "5QiuoY0J",
  "enabled": true,
  "schedule": "0 2 * * *",
  "tasks": [
    {
      "name": "Extract from MySQL",
      "type": "pipeline",
      "config": {
        "pipelineId": "pipeline-123"
      }
    },
    {
      "name": "Validate Data",
      "type": "validation",
      "config": {
        "rules": [
          {
            "field": "email",
            "type": "email"
          }
        ]
      }
    },
    {
      "name": "Load to Snowflake",
      "type": "pipeline",
      "config": {
        "pipelineId": "pipeline-456"
      }
    }
  ]
}
```

## Common Cron Schedules

```
*/5 * * * *     Every 5 minutes
*/15 * * * *    Every 15 minutes
0 * * * *       Every hour
0 */2 * * *     Every 2 hours
0 0 * * *       Daily at midnight
0 2 * * *       Daily at 2 AM
0 0 * * 0       Weekly on Sunday
0 0 1 * *       Monthly on the 1st
```

## Observability Quick Reference

```bash
# View automation logs
databasin automations logs auto-456

# View logs for specific run
databasin automations logs auto-456 --run-id run-789

# View automation execution history
databasin automations history auto-456 --limit 10

# Get history count
databasin automations history auto-456 --count

# View task logs
databasin automations tasks logs task-123

# View task execution history
databasin automations tasks history task-123
```

See [Observability Guide](./observability-guide.md) for comprehensive monitoring documentation.

## Next Steps

- 📖 Full documentation: `docs/automations-guide.md`
- 🔍 Monitoring: `docs/observability-guide.md`
- 📋 Examples: `docs/usage-examples.md`
- 🚀 Getting started: `docs/quickstart.md`

---

**Happy automating! 🤖**
