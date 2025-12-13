# Usage Metrics Quickstart

Get started with usage metrics tracking in 5 minutes.

## Quick Start

### 1. View Your Usage

See your personal usage summary:

```bash
databasin usage me
```

### 2. View Project Usage

Check usage for a specific project:

```bash
# Get project ID
databasin projects list

# View project usage
databasin usage project <project-id>
```

### 3. Export to JSON

Export metrics for analysis:

```bash
databasin usage me --json > my-usage.json
```

## Common Tasks

### Track Pipeline Activity

```bash
# View all project usage
databasin usage projects

# Find projects with high pipeline activity
databasin usage projects --json | jq 'sort_by(.pipelinesRun) | reverse | .[0:5]'
```

### Monitor Resource Consumption

```bash
# View compute and storage usage
databasin usage me

# Export for reporting
databasin usage projects --csv > project-usage-report.csv
```

### Check Team Activity

```bash
# View all user usage (requires admin)
databasin usage users

# Export user metrics
databasin usage users --json > team-usage.json
```

## Output Formats

```bash
# Table (default)
databasin usage me

# JSON
databasin usage me --json

# CSV
databasin usage users --csv
```

## Next Steps

- [Full Usage Guide](usage-guide.md) - Detailed documentation
- [Usage Examples](usage-examples.md) - Real-world examples
- [API Reference](../README.md#usage-metrics-api) - API documentation

## Key Metrics

- **Pipelines Run**: Number of pipeline executions
- **Automations Run**: Number of automation executions
- **SQL Queries**: Number of queries executed
- **Records Processed**: Total records processed
- **Compute Time**: Total compute minutes
- **Storage Used**: Total storage in GB

## Tips

1. Use `--json` for scripting and automation
2. Use `--csv` for spreadsheet import
3. Check `usage me` regularly to track your activity
4. Export metrics periodically for historical analysis
5. Use `jq` with JSON output for advanced filtering

## Help

```bash
# Command help
databasin usage --help

# Subcommand help
databasin usage me --help
```
