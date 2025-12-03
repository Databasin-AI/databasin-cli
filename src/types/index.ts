/**
 * DataBasin CLI Type Definitions
 *
 * Central export point for all CLI type definitions.
 * Import types from this file in your CLI code.
 *
 * @example
 * ```typescript
 * import type { Project, Connector, CliConfig, CommandContext } from './types/index';
 * ```
 */

// API entity types
export type {
	Project,
	Organization,
	User,
	UserRole,
	OrganizationMembership,
	ProjectMembership,
	Connector,
	ConnectorStatus,
	Pipeline,
	PipelineStatus,
	PipelineArtifact,
	Automation,
	AutomationStatus,
	QueryResult,
	CatalogInfo,
	SchemaInfo,
	TableInfo,
	TableMetadata,
	ColumnInfo,
	Module,
	ApiErrorResponse,
	PaginationParams,
	ListResponse,
	PingResponse,
	Report,
	ProjectStats
} from './api';

// Configuration types
export type { OutputFormat, LogLevel, CliConfig, PartialCliConfig, ConfigPaths } from './config';

export {
	DEFAULT_CONFIG,
	ENV_VARS,
	getConfigPaths,
	validateConfig,
	mergeConfigs,
	configFromEnv
} from './config';

// CLI command types
export type {
	GlobalOptions,
	CommandContext,
	ListOptions,
	CreateOptions,
	BulkOptions,
	SqlOptions,
	ReportFormat,
	ReportOptions,
	CommandResult,
	CommandHandler,
	CommandDefinition,
	TableOptions,
	ProgressOptions,
	PromptType,
	PromptConfig,
	ValidationError,
	ValidationResult
} from './cli';
