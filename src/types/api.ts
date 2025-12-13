/**
 * Databasin API Type Definitions
 *
 * Comprehensive types matching backend API response structures.
 * Based on Databasin API v2 endpoint specifications.
 *
 * @see .claude-plugin/plugins/databasin/skills/databasin-api/references/working-endpoints.md
 */

/**
 * Project entity returned by /api/my/projects
 * Represents a data integration project within Databasin
 */
export interface Project {
	/** Numeric project identifier */
	id: number;

	/** Short internal project code (e.g., "N1r8Do") - API returns as "internalId" */
	internalId: string;

	/** Human-readable project name */
	name: string;

	/** Optional project description */
	description?: string;

	/** Parent institution/organization identifier - API returns as "institutionId" */
	institutionId: number;

	/** Parent organization identifier (legacy field name, use institutionId instead) */
	organizationId?: number;

	/** Parent organization name */
	organizationName?: string;

	/** User ID of project administrator */
	administratorId?: number;

	/** ISO timestamp of creation */
	createdDate: string;

	/** Soft delete flag */
	deleted: boolean;

	/** Whether current user has favorited this project */
	favorited?: boolean;
}

/**
 * Organization entity returned by /api/my/organizations
 * Represents a top-level organization containing projects
 */
export interface Organization {
	/** Numeric organization identifier */
	id: number;

	/** Organization name */
	name: string;

	/** Optional short name */
	shortName?: string;

	/** Optional organization description */
	description?: string;

	/** ISO timestamp of creation */
	createdDate: string;

	/** Whether organization is enabled */
	enabled?: boolean;

	/** Soft delete flag */
	deleted?: boolean;

	/** Administrator user object */
	administrator?: User;

	/** Array of projects with role information */
	projects?: ProjectMembership[];

	/** Last modification timestamp */
	modifiedAt?: string;
}

/**
 * User entity returned by /api/my/account and /api/users
 * Represents a Databasin user account
 */
export interface User {
	/** Numeric user identifier */
	id: number;

	/** User's email address */
	email: string;

	/** User's first name */
	firstName: string;

	/** User's last name */
	lastName: string;

	/** Whether user account is enabled */
	enabled?: boolean;

	/** Array of user roles */
	roles?: string[];

	/** Organization memberships with roles */
	organizationMemberships?: OrganizationMembership[];

	/** Project memberships with roles */
	projectMemberships?: ProjectMembership[];
}

/**
 * Organization membership with role information
 */
export interface OrganizationMembership {
	/** Organization identifier */
	organizationId: number;

	/** Organization name */
	organizationName: string;

	/** User's role in organization */
	role: UserRole;
}

/**
 * Project membership with role information
 */
export interface ProjectMembership {
	/** Project identifier */
	projectId: number;

	/** Project name */
	projectName: string;

	/** Project internal ID */
	internalID: string;

	/** User's role in project */
	role: UserRole;
}

/**
 * User role types across the platform
 */
export type UserRole = 'admin' | 'user' | 'viewer' | 'owner';

/**
 * Connector entity returned by /api/connector
 * Represents a data source or destination connection
 */
export interface Connector {
	/** Numeric connector identifier */
	id?: number;

	/** String connector identifier (primary) */
	connectorID: string;

	/** Short internal connector code */
	internalID?: string;

	/** Human-readable connector name */
	connectorName: string;

	/** Connector type/category (e.g., "database", "app", "file & api") */
	connectorType: string;

	/** Connector subtype (e.g., "postgres", "snowflake", "csv") */
	connectorSubType?: string;

	/** Connector operational status (legacy field name) */
	status?: ConnectorStatus;

	/** Connector health status (API field name) */
	connectorHealthStatus?: ConnectorStatus;

	/** Whether connector is active (1=active, 0=inactive) */
	isActive?: number;

	/** Full connector configuration object */
	configuration?: Record<string, unknown>;

	/** ISO timestamp of creation */
	createdAt?: string;

	/** ISO timestamp of last update */
	updatedAt?: string;

	/** Project this connector belongs to */
	projectId?: number;
}

/**
 * Connector operational status
 */
export type ConnectorStatus = 'active' | 'inactive' | 'error' | 'pending';

/**
 * Pipeline entity returned by /api/pipeline
 * Represents a data pipeline between source and target connectors
 */
export interface Pipeline {
	/** Numeric pipeline identifier */
	pipelineID: number;

	/** Short internal pipeline code */
	internalID?: string;

	/** Institution/organization identifier */
	institutionID?: number;

	/** Pipeline owner user ID */
	ownerID?: number;

	/** Human-readable pipeline name */
	pipelineName?: string;

	/** Source connector identifier (string format) */
	sourceConnectorId?: string;

	/** Target connector identifier (string format) */
	targetConnectorId?: string;

	/** Source connector identifier (numeric format from v2 endpoint) */
	sourceConnectorID?: number;

	/** Target connector identifier (numeric format from v2 endpoint) */
	targetConnectorID?: number;

	/** Pipeline configuration object */
	configuration?: Record<string, unknown>;

	/** Job execution configuration (schedule, cluster, notifications) */
	jobDetails?: JobDetails;

	/** Pipeline operational status */
	status?: PipelineStatus;

	/** Whether pipeline is enabled */
	enabled?: boolean;

	/** Whether pipeline is private to owner (1=private, 0=public) */
	isPrivate?: number;

	/** ISO timestamp of last run */
	lastRunDate?: string;

	/** Array of pipeline artifacts (table selections and mappings) */
	artifacts?: PipelineArtifact[];

	/** Legacy array of pipeline items/artifacts */
	items?: unknown[];

	/** Data ingestion pattern (INCREMENTAL, FULL, etc.) */
	ingestionPattern?: string;

	/** Whether to preserve source naming conventions */
	sourceNamingConvention?: boolean;

	/** Whether to create target catalogs if they don't exist */
	createCatalogs?: boolean;

	/** Target catalog/database name for pipeline output */
	targetCatalogName?: string;

	/** Target schema name for pipeline output */
	targetSchemaName?: string;

	/** Source catalog/database name */
	sourceCatalog?: string;

	/** Source schema name */
	sourceSchema?: string;

	/** Soft delete flag */
	deleted?: boolean;

	/** ISO timestamp of creation (alternative field name) */
	createdDate?: string;

	/** ISO timestamp of creation */
	createdAt?: string;

	/** ISO timestamp of last update */
	updatedAt?: string;
}

/**
 * Pipeline operational status
 */
export type PipelineStatus = 'active' | 'inactive' | 'running' | 'error' | 'pending';

/**
 * Pipeline artifact configuration
 */
export interface PipelineArtifact {
	/** Artifact identifier */
	id: string;

	/** Artifact type */
	type: string;

	/** Artifact configuration */
	config: Record<string, unknown>;
}

/**
 * Job execution details for pipeline configuration
 *
 * Defines scheduling, cluster sizing, notifications, and timeout settings
 * for pipeline job execution. Used during pipeline creation and updates.
 *
 * CRITICAL: jobTimeout MUST be a string, not a number, despite being a numeric value.
 * The backend expects string format for timeout values.
 */
export interface JobDetails {
	/** Custom tags for job categorization and filtering */
	tags: string[];

	/** Cluster size for job execution (S=Small, M=Medium, L=Large, XL=Extra Large) */
	jobClusterSize: 'S' | 'M' | 'L' | 'XL';

	/** Email addresses to notify on job completion/failure */
	emailNotifications: string[];

	/** Cron schedule expression for automated job runs (null = manual execution only) */
	jobRunSchedule: string | null;

	/** Timezone for schedule execution (e.g., "UTC", "America/New_York") */
	jobRunTimeZone: string;

	/**
	 * Job timeout in seconds as a STRING
	 *
	 * CRITICAL: Must be string type, not number.
	 * Default: "43200" (12 hours)
	 */
	jobTimeout: string;
}

/**
 * Automation entity returned by /api/automations
 * Represents a scheduled job that executes pipelines/SQL/notebooks
 */
export interface Automation {
	/** Numeric automation identifier */
	automationID: number;

	/** Short internal automation code */
	internalID: string;

	/** Human-readable automation name */
	automationName: string;

	/** Associated pipeline ID (if pipeline automation) */
	pipelineId?: string;

	/** Cron schedule expression (e.g., "0 10 * * *") */
	jobRunSchedule: string;

	/** Whether automation is active */
	isActive: boolean;

	/** Whether automation is private to owner */
	isPrivate?: boolean;

	/** Whether automation is currently executing */
	currentlyRunning?: boolean;

	/** Status of last run */
	lastRunStatus?: AutomationStatus;

	/** Error message from last run (if failed) */
	lastRunErrorMessage?: string;

	/** ISO timestamp of last run */
	lastRun?: string;

	/** ISO timestamp of next scheduled run */
	nextRun?: string;

	/** Array of task types in automation */
	automationTasks?: string[];

	/** Cluster size for execution */
	jobClusterSize?: 's' | 'M' | 'L';

	/** Timeout in seconds */
	jobTimeout?: string;

	/** Organization identifier */
	institutionID?: number;

	/** User ID of automation owner */
	ownerID?: number;

	/** Internal job name */
	jobName?: string;

	/** Custom tags for automation */
	jobTags?: string[];

	/** ISO timestamp of last update */
	lastUpdatedDateTime?: string;

	/** Whether audit logging is enabled */
	auditEnabled?: boolean;

	/** Audit metadata (IRB numbers, PI names, etc.) */
	auditInformation?: Record<string, unknown>;

	/** ISO timestamp of creation */
	createdAt?: string;

	/** ISO timestamp of last update */
	updatedAt?: string;
}

/**
 * Automation execution status
 */
export type AutomationStatus = 'Successful' | 'Failed' | 'Running' | 'Stopped' | 'Pending';

/**
 * Automation log entry returned by /api/automations/logs
 * Represents a single log entry from an automation execution
 */
export interface AutomationLogEntry {
	/** ISO timestamp of log entry */
	timestamp: string;

	/** Log message text */
	message: string;

	/** Log level (INFO, WARN, ERROR, DEBUG) */
	level?: string;

	/** Associated task ID (if log is from a specific task) */
	taskID?: string;

	/** Task name (if log is from a specific task) */
	taskName?: string;

	/** Automation execution run ID */
	runID?: string;

	/** Automation identifier */
	automationID?: number;

	/** Additional log metadata */
	[key: string]: unknown;
}

/**
 * Automation task log entry returned by /api/automations/tasks/logs
 * Represents a single log entry from a specific automation task execution
 */
export interface AutomationTaskLogEntry {
	/** ISO timestamp of log entry */
	timestamp: string;

	/** Log message text */
	message: string;

	/** Log level (INFO, WARN, ERROR, DEBUG) */
	level?: string;

	/** Task name */
	taskName?: string;

	/** Task ID */
	taskID?: string;

	/** Task execution run ID */
	runID?: string;

	/** Automation identifier */
	automationID?: number;

	/** Task type (SQL, Pipeline, etc.) */
	taskType?: string;

	/** Additional log metadata */
	[key: string]: unknown;
}

/**
 * Automation history entry returned by /api/automations/history/:automationID
 * Represents a single automation run in the history
 */
export interface AutomationHistoryEntry {
	/** Numeric history entry identifier */
	id: string;

	/** Automation ID this history belongs to */
	automationID: string;

	/** ISO timestamp of when this run occurred */
	timestamp: string;

	/** Execution status of this run */
	status: string;

	/** Duration of execution in milliseconds */
	duration?: number;

	/** Number of tasks completed successfully */
	tasksCompleted?: number;

	/** Number of tasks that failed */
	tasksFailed?: number;

	/** User or system that triggered this run */
	triggeredBy?: string;

	/** Error message if run failed */
	errorMessage?: string;

	/** ISO timestamp when run started */
	startTime?: string;

	/** ISO timestamp when run ended */
	endTime?: string;
}

/**
 * Automation task history entry returned by /api/automations/tasks/history/:automationTaskID
 * Represents a single task execution in the history
 */
export interface AutomationTaskHistoryEntry {
	/** Numeric history entry identifier */
	id: string;

	/** Automation task ID this history belongs to */
	automationTaskID: string;

	/** ISO timestamp of when this task executed */
	timestamp: string;

	/** Execution status of this task */
	status: string;

	/** Type of task (e.g., 'pipeline', 'sql', 'notebook') */
	taskType?: string;

	/** Duration of task execution in milliseconds */
	duration?: number;

	/** Result data or message from task execution */
	result?: string;

	/** Error message if task failed */
	errorMessage?: string;

	/** ISO timestamp when task started */
	startTime?: string;

	/** ISO timestamp when task ended */
	endTime?: string;

	/** Number of records processed */
	recordsProcessed?: number;
}

/**
 * SQL query result returned by /api/connector/:id/query
 * Represents the result of executing a SQL query
 */
export interface QueryResult {
	/** Whether query executed successfully */
	success: boolean;

	/** The SQL query that was executed */
	sql: string;

	/** Column names in result set */
	columns: string[];

	/** Array of row data (each row is an object keyed by column name) */
	rows: Record<string, unknown>[];

	/** Number of rows returned */
	rowCount: number;

	/** Query execution time in milliseconds */
	executionTime: number;

	/** ISO timestamp of query execution */
	timestamp: string;

	/** Error message (if query failed) */
	error?: string;
}

/**
 * Schema catalog information for Lakebasin connectors
 */
export interface CatalogInfo {
	/** Array of catalog names */
	catalogs: string[];
}

/**
 * Schema information for a specific catalog
 */
export interface SchemaInfo {
	/** Array of schema names */
	schemas: string[];
}

/**
 * Table information for a specific schema
 */
export interface TableInfo {
	/** Array of table metadata */
	tables: TableMetadata[];
}

/**
 * Table metadata
 */
export interface TableMetadata {
	/** Table name */
	name: string;

	/** Table type (TABLE, VIEW, etc.) */
	type: string;
}

/**
 * Column information for a table
 */
export interface ColumnInfo {
	/** Column name */
	name: string;

	/** Column data type */
	type: string;

	/** Whether column is nullable */
	nullable?: boolean;
}

/**
 * Module information returned by /api/databasin-modules
 */
export interface Module {
	/** Numeric module identifier */
	id: number;

	/** Module system name */
	name: string;

	/** Display name */
	displayName: string;

	/** Whether module is enabled */
	enabled: boolean;

	/** Display order */
	order: number;

	/** Icon identifier */
	icon?: string;
}

/**
 * API error response structure
 * Standard error format returned by Databasin API
 */
export interface ApiErrorResponse {
	/** HTTP status code */
	status: number;

	/** Error message */
	message: string;

	/** Additional error details */
	details?: string;

	/** ISO timestamp of error */
	timestamp: string;
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
	/** Page number (0-indexed) */
	page?: number;

	/** Number of items per page */
	limit?: number;

	/** Number of items to skip */
	offset?: number;
}

/**
 * Generic list response wrapper
 * Used by endpoints that return paginated data
 */
export interface ListResponse<T> {
	/** Array of items */
	items: T[];

	/** Total number of items available */
	total: number;

	/** Current page number (if paginated) */
	page?: number;

	/** Items per page (if paginated) */
	limit?: number;
}

/**
 * Health check response from /api/ping
 */
export interface PingResponse {
	/** Whether user is authenticated */
	isLoggedIn: boolean;

	/** Whether user profile is complete */
	hasProfile: boolean;

	/** Whether system is configured */
	isSystemConfigured: boolean;

	/** Status message (usually "pong") */
	message: string;

	/** API version string */
	version?: string;
}

/**
 * Report entity from /api/reports
 */
export interface Report {
	/** Numeric report identifier */
	id: number;

	/** Report name */
	name: string;

	/** Report description */
	description?: string;

	/** ISO timestamp of creation */
	createdDate: string;

	/** Whether report is shared */
	shared: boolean;

	/** Report owner user ID */
	ownerId?: number;

	/** Report configuration/content */
	config?: Record<string, unknown>;
}

/**
 * Project statistics from /api/project/:id/stats
 */
export interface ProjectStats {
	/** Number of connectors in project */
	connectorCount?: number;

	/** Number of pipelines in project */
	pipelineCount?: number;

	/** Number of automations in project */
	automationCount?: number;

	/** Additional metrics */
	[key: string]: number | undefined;
}

/**
 * System configuration from /api/config
 * Contains available connector types and system settings
 */
export interface SystemConfig {
	/** System configuration key */
	key?: string;

	/** Hosting environment (Azure, AWS, etc.) */
	hostingEnvironment?: string;

	/** Available source connector configurations */
	sourceConnectors?: ConnectorConfig[];

	/** Available target connector configurations */
	targetConnectors?: ConnectorConfig[];

	/** Additional configuration properties */
	[key: string]: unknown;
}

/**
 * Connector configuration metadata
 */
export interface ConnectorConfig {
	/** Connector type identifier */
	type: string;

	/** Display name */
	name: string;

	/** Connector category */
	category?: string;

	/** Configuration schema */
	schema?: Record<string, unknown>;

	/** Additional metadata */
	[key: string]: unknown;
}

/**
 * Connector configuration from static JSON files
 *
 * Loaded from static/config/connectors/v2/types/*.json
 * Defines connector capabilities, required screens, and workflow configuration
 *
 * @see static/config/connectors/v2/types/DatabasinConnectorRDBMS.json
 * @see static/config/connectors/v2/types/DatabasinConnectorBigDataNoSQL.json
 */
export interface ConnectorConfiguration {
	/** Display name of connector (e.g., "Postgres", "MySQL") */
	connectorName: string;

	/** Image URI for connector icon */
	connectorImageURI?: string;

	/** Required form field IDs for connector creation */
	connectorRequiredFields?: number[];

	/** Optional form field IDs for connector creation */
	connectorOptionalFields?: number[];

	/** Supported authentication type IDs */
	connectorAuthTypes?: number[];

	/**
	 * Pipeline wizard screen sequence
	 *
	 * Determines discovery pattern:
	 * - [1, 2, 3, 4, 5] = RDBMS-style (single schema selection)
	 * - [6, 7, 2, 3, 4, 5] = Lakehouse-style (catalog → schema)
	 * - [7, 2, 3, 4, 5] = Schema-only (no catalog level)
	 *
	 * Screen IDs:
	 * - 1: Catalogs/Schemas (RDBMS)
	 * - 6: Database/Catalog (Lakehouse)
	 * - 7: Schemas (Lakehouse)
	 * - 2: Artifacts/Tables
	 * - 3: Columns
	 * - 4: Ingestion Options
	 * - 5: Final Configuration
	 */
	pipelineRequiredScreens: number[];

	/** Required pipeline configuration field IDs */
	pipelineRequiredFields?: number[];

	/** Optional pipeline configuration field IDs */
	pipelineOptionalFields?: number[];

	/** Whether connector supports ingress (source) pipelines */
	ingressTargetSupport?: boolean;

	/** Whether connector supports egress (target) pipelines */
	egressTargetSupport?: boolean;

	/** Whether connector supports test connection feature */
	testConnectorSupport?: boolean;

	/** Whether connector supports global OAuth */
	globalOAuthSupport?: boolean;

	/** Whether connector is currently active/available */
	active: boolean;

	/** Can be used as pipeline source */
	pipelineSource?: boolean;

	/** Can be used as pipeline target */
	pipelineTarget?: boolean;

	/** Can be used as automation source */
	automationSource?: boolean;

	/** Can be used as automation target */
	automationTarget?: boolean;

	/** Can be used as file drop target */
	fileDropTarget?: boolean;

	/** Supports automation SQL execution */
	supportsAutomationSQL?: boolean;

	/** Additional configuration properties */
	[key: string]: unknown;
}

/**
 * Pipeline screen definition
 *
 * Loaded from static/config/pipelines/FlowbasinPipelineScreens.json
 * Defines available screens in pipeline wizard workflow
 */
export interface PipelineScreen {
	/** Numeric screen identifier */
	screenID: number;

	/** Human-readable screen name (e.g., "Catalogs", "Schemas", "Artifacts") */
	screenName: string;

	/** Help text displayed to user on this screen */
	helpText: string;

	/** Screen type ("static" or "dynamic") */
	screenType: string;

	/** API endpoint template for fetching screen data */
	apiRouteURI: string;

	/** Whether screen is active/available */
	active: boolean;
}

/**
 * Pipeline screen configuration
 *
 * Contains all available pipeline wizard screens
 */
export interface PipelineScreenConfiguration {
	/** Array of all available pipeline screens */
	pipelineRequiredScreens: PipelineScreen[];
}

/**
 * Connector type category configuration
 *
 * Groups connectors by category (RDBMS, File & API, etc.)
 * Each category file contains multiple connector configurations
 */
export interface ConnectorTypeConfiguration {
	/** Category name (e.g., "RDBMS", "File & API", "BigDataNoSQL") */
	connectorType: string;

	/** Numeric category identifier */
	id: number;

	/** Array of connector configurations in this category */
	availableConnectors: ConnectorConfiguration[];
}

/**
 * Response from /api/v2/connector/catalogs/:id
 * Returns database/catalog names (lakehouse-style)
 *
 * Used for lakehouse connectors (Postgres, MSSQL, Databricks) where users
 * must first select a database/catalog before selecting schemas within it.
 */
export interface CatalogsResponse {
	/** Connector identifier */
	connectorID: number;

	/** Connector type (e.g., "RDBMS") */
	connectorType: string;

	/** Configured database name */
	connectorDatabase: string;

	/** User-friendly connector name */
	connectorName: string;

	/** Array of database/catalog names */
	objects: string[];

	/** Technology identifier (e.g., "postgres", "mssql", "databricks") */
	connectorTechnology: string;
}

/**
 * Response from /api/v2/connector/schemas/:id?catalog=X
 * Returns schema names for a specific catalog
 *
 * Used after database/catalog selection in lakehouse-style discovery.
 * The catalog parameter in the URL determines which database's schemas to list.
 */
export interface SchemasResponse {
	/** Identifier of the selected catalog/database */
	schemaCatalogIdentifier?: string;

	/** Connector identifier */
	connectorID: number;

	/** Connector type (e.g., "RDBMS") */
	connectorType: string;

	/** Configured database name */
	connectorDatabase: string;

	/** User-friendly connector name */
	connectorName: string;

	/** Array of schema names */
	objects: string[];

	/** Technology identifier (e.g., "postgres", "mssql", "databricks") */
	connectorTechnology: string;
}

/**
 * Pipeline history entry from /api/pipeline/history/:pipelineID
 * Represents a single run in a pipeline's execution history
 */
export interface PipelineHistoryEntry {
	/** History entry identifier */
	id: string;

	/** Associated pipeline ID */
	pipelineID: string;

	/** Timestamp of execution */
	timestamp: string;

	/** Execution status */
	status: string;

	/** Execution duration in milliseconds */
	duration?: number;

	/** User or system that triggered the execution */
	triggeredBy?: string;

	/** Number of records processed */
	recordsProcessed?: number;

	/** Number of errors encountered */
	errors?: number;

	/** Job ID associated with this run */
	jobId?: string;

	/** Error message if execution failed */
	errorMessage?: string;
}

/**
 * Artifact log entry from /api/artifacts/logs
 * Represents a single log message from artifact execution
 */
export interface ArtifactLogEntry {
	/** Log timestamp */
	timestamp: string;

	/** Log message text */
	message: string;

	/** Log level (INFO, WARN, ERROR, DEBUG) */
	level?: string;

	/** Artifact ID that generated this log */
	artifactId?: string;

	/** Run ID associated with this log */
	runId?: string;

	/** Additional log metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Artifact history entry from /api/artifacts/history/:artifactID
 * Represents a single execution in an artifact's history
 */
export interface ArtifactHistoryEntry {
	/** History entry identifier */
	id: string;

	/** Associated artifact ID */
	artifactID: string;

	/** Execution timestamp */
	timestamp: string;

	/** Execution status */
	status: string;

	/** Number of records processed */
	recordsProcessed?: number;

	/** Number of errors encountered */
	errors?: number;

	/** Execution duration in milliseconds */
	duration?: number;

	/** Run ID */
	runId?: string;

	/** Error message if execution failed */
	errorMessage?: string;

	/** Start timestamp */
	startedAt?: string;

	/** Completion timestamp */
	completedAt?: string;
}

/**
 * Usage metrics summary returned by /api/usage-metrics/*
 * Represents usage statistics for users, projects, or institutions
 *
 * Note: API returns different field names for different entity types:
 * - User: userId, fullName, email
 * - Project: projectId, projectName, institutionId, institutionName
 * - Institution: institutionId, institutionName
 */
export interface UsageSummary {
	// User-specific fields
	/** User ID (for user metrics) */
	userId?: number;
	/** User's full name (for user metrics) */
	fullName?: string;
	/** User's email (for user metrics) */
	email?: string;

	// Project-specific fields
	/** Project ID (for project metrics) */
	projectId?: number;
	/** Project internal ID (enriched client-side from projects list) */
	projectInternalId?: string;
	/** Project name (for project metrics) */
	projectName?: string;
	/** Institution ID (for project/institution metrics) */
	institutionId?: number;
	/** Institution name (for project/institution metrics) */
	institutionName?: string;
	/** Administrator ID (for project metrics) */
	administratorId?: number;
	/** Administrator name (for project metrics) */
	administratorName?: string;

	// Institution-specific fields (reuses institutionId/institutionName above)
	/** Short name for institution */
	shortName?: string;
	/** Whether institution is enabled */
	enabled?: boolean;

	// Common count fields
	/** Total number of users */
	totalUsers?: number;
	/** Number of active users */
	activeUsers?: number;
	/** Total number of projects */
	totalProjects?: number;
	/** Number of active projects */
	activeProjects?: number;

	// Pipeline metrics
	/** Total pipelines owned/created */
	totalPipelinesOwned?: number;
	/** Total pipelines in the entity */
	totalPipelines?: number;
	/** Number of active pipelines */
	activePipelines?: number;
	/** Total number of pipeline runs */
	totalPipelineRuns?: number;
	/** Number of successful pipeline runs */
	successfulPipelineRuns?: number;
	/** Number of failed pipeline runs */
	failedPipelineRuns?: number;
	/** Total pipeline runtime in seconds */
	totalPipelineRuntimeSeconds?: number;
	/** Total artifacts processed */
	totalArtifactsProcessed?: number;
	/** Total records ingested */
	totalRecordsIngested?: number;

	// Automation metrics
	/** Total automations owned/created */
	totalAutomationsOwned?: number;
	/** Total automations in the entity */
	totalAutomations?: number;
	/** Number of active automations */
	activeAutomations?: number;
	/** Total number of automation runs */
	totalAutomationRuns?: number;
	/** Number of successful automation runs */
	successfulAutomationRuns?: number;
	/** Number of failed automation runs */
	failedAutomationRuns?: number;
	/** Total automation runtime in seconds */
	totalAutomationRuntimeSeconds?: number;

	// Connection metrics
	/** Total number of connections/connectors */
	totalConnections?: number;

	// LLM/Token metrics
	/** Total prompt tokens used */
	totalPromptTokens?: number;
	/** Total completion tokens generated */
	totalCompletionTokens?: number;
	/** Total tokens (prompt + completion) */
	totalTokens?: number;
	/** Total LLM cost in dollars */
	totalLlmCost?: number;
	/** Total number of LLM requests */
	totalLlmRequests?: number;

	// Activity timestamps
	/** Last activity timestamp */
	lastActivityDate?: string;

	/** Additional usage metrics */
	[key: string]: unknown;
}
