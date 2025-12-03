# Databasin CLI - Usage Examples

Real-world examples and common workflows for the Databasin CLI.

## Table of Contents

- [Authentication Setup](#authentication-setup)
- [Project Management](#project-management)
- [Connector Management](#connector-management)
- [Pipeline Workflows](#pipeline-workflows)
- [SQL and Data Exploration](#sql-and-data-exploration)
- [Automation Scenarios](#automation-scenarios)
- [Data Export and Integration](#data-export-and-integration)
- [Scripting and Automation](#scripting-and-automation)
- [CI/CD Integration](#cicd-integration)

## Authentication Setup

### Initial Setup

```bash
# Method 1: Browser login (recommended)
databasin auth login
# Opens browser, authenticates, and saves token to ~/.databasin/.token

# Method 2: Environment variable (for CI/CD or scripting)
export DATABASIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Method 3: Manual token file
mkdir -p ~/.databasin
echo "your-jwt-token" > ~/.databasin/.token
chmod 600 ~/.databasin/.token

# Verify authentication works
databasin auth whoami
```

### Multiple Environment Setup

```bash
# Development environment
export DATABASIN_TOKEN_DEV="dev-token-here"
export DATABASIN_API_URL_DEV="https://dev-api.databasin.com"

# Production environment
export DATABASIN_TOKEN_PROD="prod-token-here"
export DATABASIN_API_URL_PROD="https://api.databasin.com"

# Switch between environments
alias databasin-dev='DATABASIN_TOKEN=$DATABASIN_TOKEN_DEV DATABASIN_API_URL=$DATABASIN_API_URL_DEV databasin'
alias databasin-prod='DATABASIN_TOKEN=$DATABASIN_TOKEN_PROD DATABASIN_API_URL=$DATABASIN_API_URL_PROD databasin'

# Use the aliases
databasin-dev projects list
databasin-prod projects list
```

## Project Management

### List and Filter Projects

```bash
# List all projects
databasin projects list

# Get minimal info (just ID and name)
databasin projects list --fields id,name

# Export to JSON for further processing
databasin projects list --json > projects.json

# Export to CSV for spreadsheet analysis
databasin projects list --csv > projects.csv

# Get full details (all fields)
databasin projects list --full
```

### View Project Details

```bash
# Get specific project details
databasin projects get proj-abc123

# Get only specific fields
databasin projects get proj-abc123 --fields id,name,description,status

# Get project statistics
databasin projects stats proj-abc123

# Monitor multiple projects
for project in proj-001 proj-002 proj-003; do
  echo "Stats for $project:"
  databasin projects stats $project
  echo "---"
done
```

## Connector Management

### Create MySQL Connector

```bash
cat > mysql-production.json <<EOF
{
  "projectId": "proj-abc123",
  "name": "Production MySQL Database",
  "description": "Main production MySQL instance",
  "type": "MySQL",
  "config": {
    "host": "mysql.company.com",
    "port": 3306,
    "database": "production",
    "username": "readonly_user",
    "password": "secure-password-here",
    "ssl": true
  }
}
EOF

databasin connectors create --file mysql-production.json
```

### Create PostgreSQL Connector

```bash
cat > postgres-analytics.json <<EOF
{
  "projectId": "proj-abc123",
  "name": "Analytics PostgreSQL",
  "type": "PostgreSQL",
  "config": {
    "host": "postgres.company.com",
    "port": 5432,
    "database": "analytics",
    "username": "analytics_ro",
    "password": "another-secure-password",
    "schema": "public",
    "ssl": true
  }
}
EOF

databasin connectors create --file postgres-analytics.json
```

### Create Snowflake Connector

```bash
cat > snowflake-warehouse.json <<EOF
{
  "projectId": "proj-abc123",
  "name": "Snowflake Data Warehouse",
  "type": "Snowflake",
  "config": {
    "account": "company.us-east-1",
    "username": "etl_user",
    "password": "snowflake-password",
    "warehouse": "COMPUTE_WH",
    "database": "PRODUCTION",
    "schema": "PUBLIC",
    "role": "ETL_ROLE"
  }
}
EOF

databasin connectors create --file snowflake-warehouse.json
```

## Pipeline Workflows

### Create Simple ETL Pipeline

```bash
cat > simple-etl-pipeline.json <<EOF
{
  "projectId": "proj-abc123",
  "name": "Daily Sales ETL",
  "description": "Extract sales data from MySQL to Snowflake",
  "config": {
    "source": {
      "connectorId": "conn-mysql-001",
      "table": "sales",
      "query": "SELECT * FROM sales WHERE created_date >= CURRENT_DATE"
    },
    "destination": {
      "connectorId": "conn-snowflake-001",
      "table": "SALES_DAILY",
      "mode": "append"
    },
    "schedule": {
      "enabled": true,
      "cron": "0 1 * * *",
      "timezone": "America/New_York"
    }
  }
}
EOF

databasin pipelines create --file simple-etl-pipeline.json
```

### Run and Monitor Pipeline

```bash
# Run pipeline and wait for completion
databasin pipelines run pipeline-123 --wait

# Run with custom timeout (10 minutes)
databasin pipelines run pipeline-123 --wait --timeout 600

# Monitor logs in real-time
databasin pipelines logs pipeline-123 --follow

# Get logs for specific run
databasin pipelines logs pipeline-123 --run run-456 --tail 500
```

## SQL and Data Exploration

### Explore Database Schema

```bash
# List available catalogs
databasin sql catalogs conn-mysql-001

# List schemas in a catalog
databasin sql schemas conn-mysql-001 production

# List tables in a schema
databasin sql tables conn-mysql-001 production public

# Describe table structure
databasin sql describe conn-mysql-001 production public users
```

### Execute Queries and Export Data

```bash
# Simple SELECT query
databasin sql exec conn-mysql-001 "SELECT * FROM users LIMIT 10"

# Complex analytical query
databasin sql exec conn-mysql-001 "
  SELECT
    DATE(created_at) as order_date,
    COUNT(*) as order_count,
    SUM(total_amount) as revenue
  FROM orders
  WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
  GROUP BY DATE(created_at)
  ORDER BY order_date DESC
"

# Export to CSV
databasin sql exec conn-mysql-001 \
  "SELECT * FROM customers WHERE active = true" \
  --csv > active_customers.csv

# Export to JSON
databasin sql exec conn-mysql-001 \
  "SELECT id, email, created_at FROM users" \
  --json > users.json
```

### Data Quality Checks

```bash
# Check for NULL values
databasin sql exec conn-mysql-001 "
  SELECT
    COUNT(*) as total_rows,
    SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) as null_emails,
    SUM(CASE WHEN phone IS NULL THEN 1 ELSE 0 END) as null_phones
  FROM customers
"

# Find duplicates
databasin sql exec conn-mysql-001 "
  SELECT email, COUNT(*) as count
  FROM users
  GROUP BY email
  HAVING COUNT(*) > 1
"

# Data freshness check
databasin sql exec conn-mysql-001 "
  SELECT
    MAX(updated_at) as last_update,
    TIMESTAMPDIFF(HOUR, MAX(updated_at), NOW()) as hours_since_update
  FROM orders
"
```

## Scripting and Automation

### Daily Data Export Script

```bash
#!/bin/bash
# daily-export.sh - Export daily sales data to CSV

DATE=$(date +%Y-%m-%d)
OUTPUT_DIR="./exports/$DATE"

mkdir -p "$OUTPUT_DIR"

# Export sales data
databasin sql exec conn-mysql-001 \
  "SELECT * FROM sales WHERE date = '$DATE'" \
  --csv > "$OUTPUT_DIR/sales.csv"

# Export customer data
databasin sql exec conn-mysql-001 \
  "SELECT * FROM customers WHERE updated_at >= '$DATE'" \
  --csv > "$OUTPUT_DIR/customers.csv"

# Compress exports
tar -czf "$OUTPUT_DIR.tar.gz" "$OUTPUT_DIR"

echo "Daily export completed: $OUTPUT_DIR.tar.gz"
```

### Pipeline Monitoring Script

```bash
#!/bin/bash
# monitor-pipelines.sh - Monitor pipeline health

# Get all pipelines
PIPELINES=$(databasin pipelines list --json)

# Check each pipeline status
echo "$PIPELINES" | jq -r '.[] | "\(.id) \(.name) \(.status)"' | while read id name status; do
  if [ "$status" == "failed" ]; then
    echo "ALERT: Pipeline $name ($id) is in FAILED state"
    
    # Get recent logs
    echo "Recent logs:"
    databasin pipelines logs "$id" --tail 50
    
    # Send alert (example)
    # curl -X POST https://alerts.company.com/webhook \
    #   -d "Pipeline $name failed. Check logs."
  elif [ "$status" == "running" ]; then
    echo "INFO: Pipeline $name ($id) is running"
  fi
done
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh - Check Databasin CLI and API health

echo "Databasin CLI Health Check"
echo "=========================="

# Check CLI version
echo -n "CLI Version: "
databasin --version

# Check authentication
echo -n "Authentication: "
if databasin auth verify >/dev/null 2>&1; then
  echo "✓ OK"
else
  echo "✗ FAILED"
  exit 1
fi

# Check API connectivity
echo -n "API Connection: "
if databasin projects list --limit 1 >/dev/null 2>&1; then
  echo "✓ OK"
else
  echo "✗ FAILED"
  exit 1
fi

# Check project access
PROJECT_COUNT=$(databasin projects list --json | jq 'length')
echo "Accessible Projects: $PROJECT_COUNT"

# Check connector count
CONNECTOR_COUNT=$(databasin connectors list --json | jq 'length')
echo "Total Connectors: $CONNECTOR_COUNT"

echo "=========================="
echo "Health check passed ✓"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/databasin-deploy.yml

name: Deploy Databasin Resources

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install Databasin CLI
        run: bun install -g @databasin/cli
      
      - name: Verify Authentication
        env:
          DATABASIN_TOKEN: ${{ secrets.DATABASIN_TOKEN }}
          DATABASIN_API_URL: ${{ secrets.DATABASIN_API_URL }}
        run: databasin auth verify
      
      - name: Deploy Pipelines
        env:
          DATABASIN_TOKEN: ${{ secrets.DATABASIN_TOKEN }}
          DATABASIN_API_URL: ${{ secrets.DATABASIN_API_URL }}
        run: |
          for file in pipelines/*.json; do
            echo "Deploying pipeline from $file..."
            databasin pipelines create --file "$file"
          done
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml

variables:
  DATABASIN_API_URL: $CI_DATABASIN_API_URL
  DATABASIN_TOKEN: $CI_DATABASIN_TOKEN

stages:
  - validate
  - deploy

validate_pipelines:
  stage: validate
  image: oven/bun:latest
  script:
    - bun install -g @databasin/cli
    - databasin auth verify
    - |
      for pipeline_file in pipelines/*.json; do
        echo "Validating $pipeline_file..."
        jq empty "$pipeline_file"
      done

deploy_pipelines:
  stage: deploy
  image: oven/bun:latest
  only:
    - main
  script:
    - bun install -g @databasin/cli
    - |
      for pipeline_file in pipelines/*.json; do
        echo "Deploying $pipeline_file..."
        databasin pipelines create --file "$pipeline_file"
      done
```

## Advanced Workflows

### Incremental Data Sync

```bash
#!/bin/bash
# incremental-sync.sh - Sync only changed data

LAST_SYNC_FILE=".last_sync_timestamp"

# Get last sync timestamp
if [ -f "$LAST_SYNC_FILE" ]; then
  LAST_SYNC=$(cat "$LAST_SYNC_FILE")
else
  LAST_SYNC="1970-01-01 00:00:00"
fi

echo "Last sync: $LAST_SYNC"

# Get changed records
databasin sql exec conn-source \
  "SELECT * FROM orders WHERE updated_at > '$LAST_SYNC'" \
  --json > /tmp/changed_orders.json

CHANGED_COUNT=$(cat /tmp/changed_orders.json | jq 'length')
echo "Found $CHANGED_COUNT changed records"

if [ "$CHANGED_COUNT" -gt 0 ]; then
  # Run sync pipeline
  databasin pipelines run pipeline-incremental-sync --wait
  
  # Update last sync timestamp
  date '+%Y-%m-%d %H:%M:%S' > "$LAST_SYNC_FILE"
  echo "Sync completed at $(cat $LAST_SYNC_FILE)"
else
  echo "No changes to sync"
fi
```

### Batch Processing

```bash
#!/bin/bash
# batch-process.sh - Process multiple data sources

CONNECTORS=(
  "conn-mysql-001:production:public:customers"
  "conn-postgres-002:analytics:public:events"
  "conn-snowflake-003:warehouse:public:orders"
)

for connector_info in "${CONNECTORS[@]}"; do
  IFS=':' read -r conn_id catalog schema table <<< "$connector_info"
  
  echo "Processing $catalog.$schema.$table from $conn_id..."
  
  # Get row count
  COUNT=$(databasin sql exec "$conn_id" \
    "SELECT COUNT(*) as count FROM $catalog.$schema.$table" \
    --json | jq -r '.[0].count')
  
  echo "  Row count: $COUNT"
  
  # Export data
  databasin sql exec "$conn_id" \
    "SELECT * FROM $catalog.$schema.$table" \
    --csv > "export_${table}.csv"
  
  echo "  Exported to export_${table}.csv"
done

echo "Batch processing complete"
```

---

For more information, see the [main README](./README.md) or visit [databasin.com/docs](https://databasin.com/docs).
