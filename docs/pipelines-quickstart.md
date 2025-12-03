# Pipelines Commands - Quick Start Guide

Fast reference for using DataBasin CLI pipeline commands.

## Quick Commands

```bash
# List all pipelines in a project
databasin pipelines list --project N1r8Do

# Get pipeline details
databasin pipelines get 123

# Create pipeline from file
databasin pipelines create pipeline-config.json

# Run a pipeline
databasin pipelines run 123

# View logs (placeholder)
databasin pipelines logs 123
```

## Common Use Cases

### 1. Find a pipeline by name

```bash
databasin pipelines list --project N1r8Do --json | \
  jq '.[] | select(.pipelineName | contains("ETL"))'
```

### 2. List only active pipelines

```bash
databasin pipelines list --project N1r8Do --status active
```

### 3. Get pipeline count

```bash
databasin pipelines list --project N1r8Do --count
```

### 4. Create pipeline quickly

```bash
cat > my-pipeline.json << 'EOF'
{
  "pipelineName": "My Pipeline",
  "sourceConnectorId": "source-123",
  "targetConnectorId": "target-456",
  "enabled": true
}
EOF

databasin pipelines create my-pipeline.json
```

### 5. Run pipeline and check status

```bash
# Run it
databasin pipelines run 123

# Check status
databasin pipelines get 123 --fields "status,lastRunDate"
```

### 6. Export all pipelines

```bash
databasin pipelines list --project N1r8Do --json > pipelines-backup.json
```

## Interactive Mode

For any command without required arguments, interactive mode kicks in:

```bash
# Interactive project selection
databasin pipelines list

# Interactive pipeline selection
databasin pipelines get

# Interactive pipeline creation
databasin pipelines create
```

## Token Efficiency Tips

```bash
# Get count only (fast)
databasin pipelines list --project N1r8Do --count

# Limit fields (reduce data)
databasin pipelines list --project N1r8Do --fields "pipelineID,pipelineName,status"

# Limit results (paginate)
databasin pipelines list --project N1r8Do --limit 10

# Combine all
databasin pipelines list --project N1r8Do \
  --fields "pipelineID,pipelineName" \
  --limit 5 \
  --status active
```

## Output Formats

```bash
# Table (default)
databasin pipelines list --project N1r8Do

# JSON (for scripts)
databasin pipelines list --project N1r8Do --json

# CSV (for spreadsheets)
databasin pipelines list --project N1r8Do --csv
```

## Error Recovery

### "Project ID is required"

```bash
# Solution: Add --project flag
databasin pipelines list --project N1r8Do
```

### "Pipeline not found"

```bash
# Solution: List pipelines first
databasin pipelines list --project N1r8Do
```

### "Access denied"

```bash
# Solution: Check project access
databasin projects get N1r8Do
```

## Scripting Examples

### Loop through all projects

```bash
for project in $(databasin projects list --json | jq -r '.[].internalID'); do
  echo "Pipelines in $project:"
  databasin pipelines list --project $project
done
```

### Find pipelines by connector

```bash
databasin pipelines list --project N1r8Do --json | \
  jq '.[] | select(.sourceConnectorId == "mysql-prod")'
```

### Count pipelines by status

```bash
PROJECT="N1r8Do"
echo "Active: $(databasin pipelines list --project $PROJECT --status active --count)"
echo "Inactive: $(databasin pipelines list --project $PROJECT --status inactive --count)"
```

## Configuration File Template

Minimal:
```json
{
  "pipelineName": "My Pipeline"
}
```

Complete:
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
      "name": "Extract",
      "config": {
        "query": "SELECT * FROM users"
      }
    }
  ]
}
```

## Next Steps

- 📖 Full documentation: `docs/commands/pipelines.md`
- 🧪 Testing guide: `TEST-PIPELINES.md`
- 📋 Example config: `examples/pipeline-config.json`
- 📝 Implementation details: `IMPLEMENTATION-SUMMARY-PIPELINES.md`
