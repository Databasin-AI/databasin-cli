/**
 * CLI Command Type Definitions
 *
 * Defines types for command handlers, options, and execution context.
 * Used across all CLI command implementations.
 */

import type { CliConfig } from './config.ts';
import type { OutputFormat } from './config.ts';

/**
 * Global CLI options available on all commands
 * These can be specified before or after the command name
 */
export interface GlobalOptions {
	/**
	 * API base URL override
	 * @example "https://api.databasin.com"
	 */
	apiUrl?: string;

	/**
	 * JWT authentication token override
	 * Takes precedence over token file
	 */
	token?: string;

	/**
	 * Output in JSON format
	 * Shorthand for --format=json
	 */
	json?: boolean;

	/**
	 * Enable verbose output
	 * Shows additional debug information
	 */
	verbose?: boolean;

	/**
	 * Disable colored output
	 * Useful for CI/CD or log files
	 */
	noColor?: boolean;

	/**
	 * Enable debug logging
	 * Shows all API requests and responses
	 */
	debug?: boolean;

	/**
	 * Output format override
	 */
	format?: OutputFormat;
}

/**
 * Command context passed to all command handlers
 * Contains resolved configuration and authentication
 */
export interface CommandContext {
	/**
	 * Merged CLI configuration
	 * Combines defaults, config file, env vars, and CLI flags
	 */
	config: CliConfig;

	/**
	 * JWT authentication token
	 * Loaded from token file or environment
	 */
	token: string;

	/**
	 * Resolved API base URL
	 * From config or override
	 */
	apiUrl: string;

	/**
	 * Whether verbose logging is enabled
	 */
	verbose: boolean;

	/**
	 * Whether debug logging is enabled
	 */
	debug: boolean;
}

/**
 * List command options
 * Used by commands that list resources (projects, connectors, pipelines, etc.)
 */
export interface ListOptions extends GlobalOptions {
	/**
	 * Return count only (no data)
	 * Minimal token usage
	 */
	count?: boolean;

	/**
	 * Comma-separated field list
	 * Only return specified fields
	 * @example "id,name,status"
	 */
	fields?: string;

	/**
	 * Maximum number of items to return
	 * @default 100
	 */
	limit?: number;

	/**
	 * Number of items to skip
	 * Used for pagination
	 */
	offset?: number;

	/**
	 * Project ID or internal ID filter
	 * @example "N1r8Do"
	 */
	project?: string;

	/**
	 * Sort field
	 * @example "name" or "createdDate"
	 */
	sort?: string;

	/**
	 * Sort order
	 */
	order?: 'asc' | 'desc';
}

/**
 * Create/Update command options
 * Used by commands that create or update resources
 */
export interface CreateOptions extends GlobalOptions {
	/**
	 * JSON file containing resource configuration
	 * Alternative to providing JSON inline
	 */
	file?: string;

	/**
	 * Enable interactive prompts
	 * Guides user through creating resource
	 */
	interactive?: boolean;

	/**
	 * Template name to use
	 * Pre-defined configuration templates
	 */
	template?: string;

	/**
	 * Skip confirmation prompts
	 * Useful for automation
	 */
	yes?: boolean;
}

/**
 * Bulk operation options
 * Used by commands that process multiple resources
 */
export interface BulkOptions extends GlobalOptions {
	/**
	 * JSON file containing bulk operations
	 * Array of resource configurations
	 */
	file: string;

	/**
	 * Continue processing on error
	 * Don't stop after first failure
	 */
	continueOnError?: boolean;

	/**
	 * Dry run mode
	 * Preview changes without executing
	 */
	dryRun?: boolean;

	/**
	 * Parallelism level
	 * Number of concurrent operations
	 * @default 5
	 */
	parallel?: number;
}

/**
 * SQL command options
 * Used by sql:query and related commands
 */
export interface SqlOptions extends GlobalOptions {
	/**
	 * SQL file to execute
	 * Alternative to inline SQL
	 */
	file?: string;

	/**
	 * Output format for query results
	 * @default "table"
	 */
	format?: 'table' | 'json' | 'csv';

	/**
	 * Output file path
	 * Write results to file instead of stdout
	 */
	output?: string;

	/**
	 * Query timeout in seconds
	 * @default 30
	 */
	timeout?: number;

	/**
	 * Maximum number of rows to return
	 * @default 100
	 */
	limit?: number;

	/**
	 * Connector ID to execute query against
	 * Required for SQL execution
	 */
	connector?: string;
}

/**
 * Report output format
 */
export type ReportFormat = 'html' | 'pdf' | 'json';

/**
 * Report generation options
 * Used by report commands
 */
export interface ReportOptions extends Omit<GlobalOptions, 'format'> {
	/**
	 * Natural language query for report
	 */
	query?: string;

	/**
	 * Report template to use
	 */
	template?: string;

	/**
	 * Output file path for report
	 */
	output?: string;

	/**
	 * Report output format (HTML, PDF, or JSON)
	 */
	reportFormat?: ReportFormat;

	/**
	 * Include data in output
	 * Otherwise only include visualizations
	 */
	includeData?: boolean;
}

/**
 * Command result for consistent return values
 * All command handlers return this structure
 */
export interface CommandResult<T = unknown> {
	/**
	 * Whether command succeeded
	 */
	success: boolean;

	/**
	 * Result data (if successful)
	 */
	data?: T;

	/**
	 * Error message (if failed)
	 */
	error?: string;

	/**
	 * Exit code for process
	 * 0 for success, non-zero for error
	 */
	exitCode: number;

	/**
	 * Warning messages
	 * Non-fatal issues encountered
	 */
	warnings?: string[];
}

/**
 * Command handler function signature
 * All command implementations must match this signature
 */
export type CommandHandler<TOptions = GlobalOptions, TResult = unknown> = (
	context: CommandContext,
	options: TOptions
) => Promise<CommandResult<TResult>>;

/**
 * Command definition
 * Metadata and handler for a CLI command
 */
export interface CommandDefinition<TOptions = GlobalOptions, TResult = unknown> {
	/**
	 * Command name
	 * @example "projects:list"
	 */
	name: string;

	/**
	 * Command description
	 * Shown in help text
	 */
	description: string;

	/**
	 * Command aliases
	 * Alternative names for the command
	 */
	aliases?: string[];

	/**
	 * Usage examples
	 * Shown in help text
	 */
	examples?: string[];

	/**
	 * Command handler function
	 */
	handler: CommandHandler<TOptions, TResult>;
}

/**
 * Table formatting options
 */
export interface TableOptions {
	/**
	 * Column headers
	 */
	headers: string[];

	/**
	 * Column alignments
	 */
	alignments?: ('left' | 'right' | 'center')[];

	/**
	 * Maximum column widths
	 */
	maxWidths?: number[];

	/**
	 * Show borders
	 */
	borders?: boolean;

	/**
	 * Use colors
	 */
	colors?: boolean;
}

/**
 * Progress indicator options
 */
export interface ProgressOptions {
	/**
	 * Total number of steps
	 */
	total: number;

	/**
	 * Current step
	 */
	current: number;

	/**
	 * Progress message
	 */
	message?: string;

	/**
	 * Show percentage
	 */
	showPercentage?: boolean;

	/**
	 * Show time remaining
	 */
	showTime?: boolean;
}

/**
 * Interactive prompt types
 */
export type PromptType = 'input' | 'select' | 'multiselect' | 'confirm' | 'password';

/**
 * Interactive prompt configuration
 */
export interface PromptConfig {
	/**
	 * Prompt type
	 */
	type: PromptType;

	/**
	 * Prompt message
	 */
	message: string;

	/**
	 * Default value
	 */
	default?: string | boolean;

	/**
	 * Choices for select/multiselect
	 */
	choices?: string[];

	/**
	 * Validation function
	 */
	validate?: (value: string) => boolean | string;

	/**
	 * Whether field is required
	 */
	required?: boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
	/**
	 * Field that failed validation
	 */
	field: string;

	/**
	 * Validation error message
	 */
	message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
	/**
	 * Whether validation passed
	 */
	valid: boolean;

	/**
	 * Validation errors (if any)
	 */
	errors?: ValidationError[];
}
