#!/bin/bash

################################################################################
# Databasin CLI - Programmatic Pipeline Creation Example
#
# This script demonstrates how to use individual CLI commands to gather
# information and create a pipeline without using the interactive wizard.
#
# This is useful for:
# - Automation and scripting
# - CI/CD pipelines
# - Batch pipeline creation
# - Understanding the underlying workflow
#
# Usage:
#   ./example-pipeline-create.sh
#
################################################################################

set -e  # Exit on error

# Color output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    error "jq is required but not installed. Please install jq to run this script."
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  macOS: brew install jq"
    exit 1
fi

# Configuration - Edit these values for your environment
PROJECT_ID="N1r8Do"
SOURCE_CONNECTOR_ID="5464"  # Postgres connector
TARGET_CONNECTOR_ID="5075"  # Databricks connector
PIPELINE_NAME="Programmatic-Pipeline-$(date +%s)"

################################################################################
# STEP 1: Get Project Information
################################################################################

section "Step 1: Get Project Information"

info "Fetching project details for: $PROJECT_ID"

PROJECT_JSON=$(./dist/linux-x64/databasin projects list --json 2>/dev/null | \
    jq -r ".[] | select(.internalId == \"$PROJECT_ID\" or .id == \"$PROJECT_ID\")")

if [ -z "$PROJECT_JSON" ]; then
    error "Project $PROJECT_ID not found"
    exit 1
fi

PROJECT_NAME=$(echo "$PROJECT_JSON" | jq -r '.name')
INSTITUTION_ID=$(echo "$PROJECT_JSON" | jq -r '.institutionId')

success "Found project: $PROJECT_NAME"
info "  Project ID: $PROJECT_ID"
info "  Institution ID: $INSTITUTION_ID"

################################################################################
# STEP 2: Get User Information
################################################################################

section "Step 2: Get User Information"

info "Fetching current user information..."

USER_JSON=$(./dist/linux-x64/databasin auth whoami --json 2>/dev/null)
USER_ID=$(echo "$USER_JSON" | jq -r '.id')
USER_NAME=$(echo "$USER_JSON" | jq -r '"\(.firstName) \(.lastName)"')

success "Logged in as: $USER_NAME (ID: $USER_ID)"

################################################################################
# STEP 3: List and Verify Connectors
################################################################################

section "Step 3: Verify Connectors"

info "Fetching connectors for project: $PROJECT_ID"

CONNECTORS_JSON=$(./dist/linux-x64/databasin connectors list \
    --project "$PROJECT_ID" \
    --full \
    --json 2>/dev/null)

# Verify source connector
SOURCE_CONNECTOR=$(echo "$CONNECTORS_JSON" | jq -r ".[] | select(.connectorID == \"$SOURCE_CONNECTOR_ID\")")
if [ -z "$SOURCE_CONNECTOR" ]; then
    error "Source connector $SOURCE_CONNECTOR_ID not found in project"
    exit 1
fi

SOURCE_NAME=$(echo "$SOURCE_CONNECTOR" | jq -r '.connectorName')
SOURCE_TYPE=$(echo "$SOURCE_CONNECTOR" | jq -r '.connectorSubType')

success "Source connector: $SOURCE_NAME ($SOURCE_TYPE)"

# Verify target connector
TARGET_CONNECTOR=$(echo "$CONNECTORS_JSON" | jq -r ".[] | select(.connectorID == \"$TARGET_CONNECTOR_ID\")")
if [ -z "$TARGET_CONNECTOR" ]; then
    error "Target connector $TARGET_CONNECTOR_ID not found in project"
    exit 1
fi

TARGET_NAME=$(echo "$TARGET_CONNECTOR" | jq -r '.connectorName')
TARGET_TYPE=$(echo "$TARGET_CONNECTOR" | jq -r '.connectorSubType')

success "Target connector: $TARGET_NAME ($TARGET_TYPE)"

################################################################################
# STEP 4: Discover Source Schema Structure
################################################################################

section "Step 4: Discover Source Schema"

info "Discovering schemas for source connector..."

# Note: The actual schema discovery depends on connector type
# For RDBMS connectors (postgres, mysql, etc.):
# - Use: databasin sql catalogs <connectorId>
# - Then: databasin sql tables <connectorId> <schema>

# For this example, we'll use hardcoded values
# In a real script, you would fetch these dynamically

SOURCE_CATALOG="config"  # For lakehouse connectors (Databricks, Snowflake, etc.)
SOURCE_SCHEMA="main"

info "Using source schema: $SOURCE_SCHEMA"
if [ -n "$SOURCE_CATALOG" ]; then
    info "Using source catalog: $SOURCE_CATALOG"
fi

################################################################################
# STEP 5: List Available Tables
################################################################################

section "Step 5: List Available Tables"

info "Fetching tables from source connector..."

# Note: Use the SQL commands to list tables
# Example: ./dist/linux-x64/databasin sql tables <connectorId> <schema>
# For this example, we'll hardcode some tables

# In a real script:
# TABLES_JSON=$(./dist/linux-x64/databasin sql tables "$SOURCE_CONNECTOR_ID" "$SOURCE_SCHEMA" --json)

# Hardcoded for demonstration
SELECTED_TABLES=("users" "orders" "products")

success "Selected ${#SELECTED_TABLES[@]} tables:"
for table in "${SELECTED_TABLES[@]}"; do
    info "  - $table"
done

################################################################################
# STEP 6: Get AI Ingestion Recommendations (Optional)
################################################################################

section "Step 6: Get AI Ingestion Recommendations"

info "Fetching AI recommendations for ingestion types..."

# Note: This would use the /api/connector/ingestiontype endpoint
# For this example, we'll use default values

warn "Using default ingestion types (full refresh)"

################################################################################
# STEP 7: Determine Ingestion Pattern
################################################################################

section "Step 7: Determine Ingestion Pattern"

# Detect ingestion pattern based on target type
if [[ "$TARGET_TYPE" =~ (databricks|snowflake|redshift|bigquery) ]]; then
    INGESTION_PATTERN="datalake"
    info "Detected lakehouse target connector"
else
    INGESTION_PATTERN="data warehouse"
    info "Detected data warehouse target connector"
fi

success "Ingestion pattern: $INGESTION_PATTERN"

################################################################################
# STEP 8: Configure Target Schema
################################################################################

section "Step 8: Configure Target Schema"

if [ "$INGESTION_PATTERN" == "datalake" ]; then
    TARGET_CATALOG="hive_metastore"
    TARGET_SCHEMA="default"
    info "Target catalog: $TARGET_CATALOG"
    info "Target schema: $TARGET_SCHEMA"
else
    TARGET_SCHEMA="public"
    TARGET_CATALOG=""
    info "Target schema: $TARGET_SCHEMA"
fi

################################################################################
# STEP 9: Build Pipeline Artifacts
################################################################################

section "Step 9: Build Pipeline Artifacts"

info "Building artifact configurations..."

# Build artifacts array
ARTIFACTS_JSON="[]"

for table in "${SELECTED_TABLES[@]}"; do
    ARTIFACT=$(cat <<EOF
{
    "sourceObjectName": "$table",
    "targetObjectName": "$table",
    "sourceSchema": "$SOURCE_SCHEMA",
    "columns": "*",
    "ingestionType": "full",
    "primaryKeys": null,
    "timestampColumn": null,
    "autoExplode": false,
    "detectDeletes": false,
    "priority": false,
    "replaceTable": false,
    "backloadNumDays": 0,
    "snapshotRetentionPeriod": 3
}
EOF
    )

    ARTIFACTS_JSON=$(echo "$ARTIFACTS_JSON" | jq ". += [$ARTIFACT]")
done

success "Created ${#SELECTED_TABLES[@]} artifact configurations"

################################################################################
# STEP 10: Configure Job Scheduling
################################################################################

section "Step 10: Configure Job Scheduling"

JOB_SCHEDULE="0 2 * * *"  # 2 AM daily
JOB_TIMEZONE="America/New_York"
JOB_CLUSTER_SIZE="Small"

info "Schedule: Daily at 2 AM"
info "Timezone: $JOB_TIMEZONE"
info "Cluster size: $JOB_CLUSTER_SIZE"

# Build job details
JOB_DETAILS=$(cat <<EOF
{
    "jobName": "$PIPELINE_NAME-job",
    "jobRunSchedule": "$JOB_SCHEDULE",
    "jobRunTimeZone": "$JOB_TIMEZONE",
    "jobClusterSize": "$JOB_CLUSTER_SIZE",
    "jobTimeoutSeconds": "43200",
    "jobOwnerEmail": "",
    "tags": [],
    "emailNotifications": [],
    "jobTimeout": "43200"
}
EOF
)

################################################################################
# STEP 11: Build Complete Pipeline Payload
################################################################################

section "Step 11: Build Pipeline Payload"

info "Assembling complete pipeline configuration..."

# Build the complete payload
PAYLOAD=$(cat <<EOF
{
    "pipelineName": "$PIPELINE_NAME",
    "sourceConnectorID": "$SOURCE_CONNECTOR_ID",
    "targetConnectorID": "$TARGET_CONNECTOR_ID",
    "institutionID": $INSTITUTION_ID,
    "internalID": "$PROJECT_ID",
    "ownerID": $USER_ID,
    "ingestionPattern": "$INGESTION_PATTERN",
    "targetCatalogName": "$TARGET_CATALOG",
    "targetSchemaName": "$TARGET_SCHEMA",
    "jobDetails": $JOB_DETAILS,
    "items": $ARTIFACTS_JSON
}
EOF
)

# Validate JSON
if ! echo "$PAYLOAD" | jq empty 2>/dev/null; then
    error "Invalid JSON payload generated"
    exit 1
fi

success "Payload assembled successfully"

# Display payload summary
echo ""
info "Pipeline Configuration Summary:"
echo "$PAYLOAD" | jq '{
    pipelineName,
    sourceConnector: .sourceConnectorID,
    targetConnector: .targetConnectorID,
    ingestionPattern,
    targetSchema: .targetSchemaName,
    artifactCount: (.items | length),
    schedule: .jobDetails.jobRunSchedule
}'

################################################################################
# STEP 12: Create Pipeline via API
################################################################################

section "Step 12: Create Pipeline"

info "Submitting pipeline to Databasin API..."

# Save payload to temp file
PAYLOAD_FILE="/tmp/databasin-pipeline-$$.json"
echo "$PAYLOAD" | jq . > "$PAYLOAD_FILE"

echo ""
warn "Review the payload above before proceeding."
read -p "Create this pipeline? [y/N] " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warn "Pipeline creation cancelled by user"
    rm -f "$PAYLOAD_FILE"
    exit 0
fi

# Create the pipeline using the API command
# Note: Assuming there's a 'databasin pipelines create' command that accepts JSON
# If not, we can use the API command directly

if ./dist/linux-x64/databasin pipelines create --help 2>&1 | grep -q "json"; then
    # Use pipelines create command
    RESULT=$(./dist/linux-x64/databasin pipelines create --json-file "$PAYLOAD_FILE" 2>&1)
    CREATE_EXIT_CODE=$?
else
    # Use generic API command
    RESULT=$(./dist/linux-x64/databasin api post /api/pipeline --data "@$PAYLOAD_FILE" 2>&1)
    CREATE_EXIT_CODE=$?
fi

# Clean up temp file
rm -f "$PAYLOAD_FILE"

if [ $CREATE_EXIT_CODE -eq 0 ]; then
    echo ""
    success "Pipeline created successfully!"
    echo ""

    # Extract pipeline ID if available
    PIPELINE_ID=$(echo "$RESULT" | jq -r '.pipelineID // .id // empty' 2>/dev/null)

    if [ -n "$PIPELINE_ID" ]; then
        success "Pipeline ID: $PIPELINE_ID"
        echo ""
        info "Next steps:"
        echo "  View pipeline:  ./dist/linux-x64/databasin pipelines get $PIPELINE_ID"
        echo "  Run pipeline:   ./dist/linux-x64/databasin pipelines run $PIPELINE_ID"
        echo "  List pipelines: ./dist/linux-x64/databasin pipelines list --project $PROJECT_ID"
    fi
else
    error "Failed to create pipeline"
    echo ""
    echo "$RESULT"
    exit 1
fi

################################################################################
# COMPLETE
################################################################################

section "Complete"

success "Pipeline creation workflow completed successfully!"

echo ""
info "Summary of what was created:"
echo "  Pipeline Name: $PIPELINE_NAME"
echo "  Source: $SOURCE_NAME ($SOURCE_TYPE)"
echo "  Target: $TARGET_NAME ($TARGET_TYPE)"
echo "  Artifacts: ${#SELECTED_TABLES[@]} tables"
echo "  Schedule: $JOB_SCHEDULE ($JOB_TIMEZONE)"

echo ""
info "This script demonstrated the full workflow for programmatic pipeline creation."
info "You can adapt this script for automation, CI/CD, or batch operations."

exit 0
