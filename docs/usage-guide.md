# Usage Metrics Guide

Comprehensive guide to viewing and tracking usage metrics with the Databasin CLI.

## Overview

The `databasin usage` command provides access to usage metrics and statistics across users, projects, and institutions. Track pipeline executions, automation runs, compute time, storage usage, and more.

## Prerequisites

- Databasin CLI installed and configured
- Valid authentication token
- Appropriate permissions (some metrics require admin access)

## Available Commands

### View My Usage

View usage summary for the currently authenticated user:

```bash
databasin usage me
```

### View User Usage

View usage summary for a specific user (requires admin permissions):

```bash
databasin usage user <userId>
```

Example:
```bash
databasin usage user 123
```

### View All Users

List usage summaries for all users (requires admin permissions):

```bash
databasin usage users
```

### View Project Usage

View usage summary for a specific project:

```bash
databasin usage project <projectId>
```

Example:
```bash
databasin usage project 456
```

### View All Projects

List usage summaries for all projects you have access to:

```bash
databasin usage projects
```

### View Institution Usage

View usage summary for a specific institution (requires admin permissions):

```bash
databasin usage institution <institutionId>
```

Example:
```bash
databasin usage institution 789
```

### View All Institutions

List usage summaries for all institutions (requires admin permissions):

```bash
databasin usage institutions
```

## Output Formats

### Table Format (Default)

Human-readable table output with formatted numbers and dates:

```bash
databasin usage me
```

Example output:
```
Usage Summary: John Doe

┌─────────────────────┬─────────────────┐
│ Metric              │ Value           │
├─────────────────────┼─────────────────┤
│ ID                  │ 123             │
│ Name                │ John Doe        │
│ Type                │ user            │
│ Pipelines Run       │ 45              │
│ Automations Run     │ 12              │
│ SQL Queries         │ 328             │
│ Records Processed   │ 1,234,567       │
│ Compute Time        │ 2,340 min       │
│ Storage Used        │ 45.2 GB         │
│ Last Activity       │ 12/12/2025      │
└─────────────────────┴─────────────────┘
```

### JSON Format

Structured JSON output for programmatic access:

```bash
databasin usage me --json
```

Example output:
```json
{
  "id": 123,
  "name": "John Doe",
  "entityType": "user",
  "pipelinesRun": 45,
  "automationsRun": 12,
  "sqlQueriesExecuted": 328,
  "connectorsCreated": 8,
  "recordsProcessed": 1234567,
  "computeMinutes": 2340,
  "storageGB": 45.2,
  "apiCalls": 1542,
  "firstActivity": "2025-01-15T10:30:00Z",
  "lastActivity": "2025-12-12T14:22:00Z",
  "billingPeriodStart": "2025-12-01T00:00:00Z",
  "billingPeriodEnd": "2025-12-31T23:59:59Z"
}
```

### CSV Format

Comma-separated values for spreadsheet import:

```bash
databasin usage users --csv
```

## Usage Metrics

The following metrics are tracked:

| Metric | Description |
|--------|-------------|
| **Pipelines Run** | Number of pipeline executions |
| **Automations Run** | Number of automation executions |
| **SQL Queries** | Number of SQL queries executed |
| **Connectors Created** | Number of connectors created |
| **Records Processed** | Total number of records processed |
| **Compute Time** | Total compute time in minutes |
| **Storage Used** | Total storage consumed in GB |
| **API Calls** | Number of API requests made |
| **First Activity** | Timestamp of first activity |
| **Last Activity** | Timestamp of most recent activity |
| **Billing Period** | Current billing period date range |

## Examples

### View Personal Usage

```bash
# View my usage summary
databasin usage me

# Export my usage to JSON
databasin usage me --json > my-usage.json
```

### Track Project Usage

```bash
# View usage for a specific project
databasin usage project 456

# Compare all project usage
databasin usage projects --csv | sort -t',' -k5 -rn | head -10
```

### Monitor Team Usage

```bash
# View all user usage (admin only)
databasin usage users

# Find top users by pipeline executions
databasin usage users --json | jq 'sort_by(.pipelinesRun) | reverse | .[0:5]'
```

### Institution-Level Analytics

```bash
# View institution usage
databasin usage institution 789

# Export all institution metrics
databasin usage institutions --json > institution-metrics.json
```

## Permission Requirements

| Command | Required Permission |
|---------|---------------------|
| `usage me` | Authenticated user |
| `usage user <id>` | Organization admin or viewing own data |
| `usage users` | Organization admin |
| `usage project <id>` | Project member or admin |
| `usage projects` | User's accessible projects |
| `usage institution <id>` | Organization admin |
| `usage institutions` | Organization admin |

## Common Use Cases

### 1. Monthly Usage Reports

Generate monthly usage reports:

```bash
# Export all project usage
databasin usage projects --json > "usage-$(date +%Y-%m).json"

# View top projects by compute time
databasin usage projects --json | jq 'sort_by(.computeMinutes) | reverse | .[0:10]'
```

### 2. Cost Tracking

Track resource consumption:

```bash
# View compute and storage usage
databasin usage me --json | jq '{compute: .computeMinutes, storage: .storageGB}'

# Compare project resource usage
databasin usage projects --csv | awk -F',' '{print $2, $7, $8}' | column -t
```

### 3. Activity Monitoring

Monitor user and project activity:

```bash
# Check recent activity
databasin usage me | grep "Last Activity"

# Find inactive projects
databasin usage projects --json | jq '.[] | select(.lastActivity < "2025-11-01") | {name, lastActivity}'
```

### 4. Capacity Planning

Analyze trends for capacity planning:

```bash
# Aggregate institution metrics
databasin usage institutions --json | jq '[.[] | .recordsProcessed] | add'

# Track growth over time (combine with historical data)
databasin usage me --json > "daily-usage/$(date +%Y-%m-%d).json"
```

## Troubleshooting

### Permission Denied

If you receive a permission denied error:

```
Error: Insufficient permissions to view this usage data
```

**Solution**: Ensure you have the required role (organization admin) or are accessing your own data.

### Empty Metrics

If metrics show as 0 or N/A:

**Possible causes**:
- No activity in the current billing period
- Metrics collection not enabled
- Recent account creation

**Solution**: Check with your organization admin about metrics collection settings.

### Invalid ID

If you receive an "Invalid ID" error:

```
Error: User ID must be a number
```

**Solution**: Ensure you're providing numeric IDs, not names or internal IDs.

## Integration Examples

### Python Script

```python
import subprocess
import json

# Fetch usage metrics
result = subprocess.run(
    ['databasin', 'usage', 'projects', '--json'],
    capture_output=True,
    text=True
)

usage_data = json.loads(result.stdout)

# Analyze metrics
total_compute = sum(p['computeMinutes'] for p in usage_data if 'computeMinutes' in p)
print(f"Total compute time: {total_compute} minutes")
```

### Shell Script

```bash
#!/bin/bash
# Generate weekly usage report

WEEK=$(date +%Y-W%U)
REPORT_FILE="usage-report-${WEEK}.csv"

echo "Generating usage report for week ${WEEK}..."

# Export all usage metrics
databasin usage projects --csv > "${REPORT_FILE}"

echo "Report saved to ${REPORT_FILE}"

# Email report (if sendmail configured)
if command -v sendmail &> /dev/null; then
    cat "${REPORT_FILE}" | mail -s "Weekly Usage Report - ${WEEK}" admin@example.com
fi
```

## Best Practices

1. **Regular Monitoring**: Schedule periodic usage checks to track trends
2. **Export Historical Data**: Maintain historical usage records for trend analysis
3. **Set Alerts**: Use scripts to alert on unusual usage patterns
4. **Optimize Resources**: Use metrics to identify optimization opportunities
5. **Budget Planning**: Track usage to predict future resource needs

## Related Commands

- `databasin projects list` - List all projects
- `databasin pipelines list` - List pipeline executions
- `databasin automations list` - List automation runs
- `databasin sql exec` - Execute SQL queries

## API Reference

The usage command uses the following API endpoints:

- `GET /api/usage-metrics/users/me` - Current user usage
- `GET /api/usage-metrics/users/{userId}` - Specific user usage
- `GET /api/usage-metrics/users` - All users usage
- `GET /api/usage-metrics/projects/{projectId}` - Specific project usage
- `GET /api/usage-metrics/projects` - All projects usage
- `GET /api/usage-metrics/institutions/{institutionId}` - Specific institution usage
- `GET /api/usage-metrics/institutions` - All institutions usage

## Support

For additional help:

- View command help: `databasin usage --help`
- View subcommand help: `databasin usage <subcommand> --help`
- Check API documentation: `databasin docs`
- Report issues: https://github.com/Databasin-AI/databasin-cli/issues
