/**
 * Pipeline Template Library
 *
 * Pre-configured templates for common data pipeline patterns.
 * Templates support variable substitution and can be customized via interactive prompts.
 *
 * @module utils/pipeline-templates
 */

/**
 * Pipeline template definition
 */
export interface PipelineTemplate {
	/** Unique template identifier */
	name: string;

	/** Human-readable description */
	description: string;

	/** Source connector type (e.g., 'PostgreSQL', 'MySQL') */
	sourceType: string;

	/** Target connector type (e.g., 'Snowflake', 'S3') */
	targetType: string;

	/** Template configuration with placeholders */
	config: any;

	/**
	 * List of variables required for substitution
	 * Extracted automatically from config by findTemplateVariables()
	 */
	variables?: string[];
}

/**
 * Built-in pipeline templates for common data integration patterns
 */
export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
	{
		name: 'postgres-to-snowflake',
		description: 'PostgreSQL to Snowflake data warehouse sync with incremental updates',
		sourceType: 'PostgreSQL',
		targetType: 'Snowflake',
		config: {
			pipelineName: '{SOURCE_NAME} to {TARGET_NAME}',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 2 * * *', // Daily at 2am
			enabled: true,
			artifacts: [
				{
					type: 'table',
					sourceTable: '{SOURCE_CATALOG}.{SOURCE_SCHEMA}.{SOURCE_TABLE}',
					targetTable: '{TARGET_SCHEMA}.{TARGET_TABLE}',
					mode: 'incremental',
					primaryKey: 'id',
					timestampColumn: 'updated_at'
				}
			]
		}
	},
	{
		name: 'mysql-to-s3',
		description: 'MySQL to S3 data lake export in Parquet format',
		sourceType: 'MySQL',
		targetType: 'S3',
		config: {
			pipelineName: '{SOURCE_NAME} to {TARGET_NAME} Data Lake',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 6 * * *', // Daily at 6am
			enabled: true,
			artifacts: [
				{
					type: 'table',
					sourceTable: '{SOURCE_SCHEMA}.{SOURCE_TABLE}',
					targetPath: 's3://{S3_BUCKET}/data/{TARGET_TABLE}',
					format: 'parquet',
					mode: 'full_refresh',
					compression: 'snappy'
				}
			]
		}
	},
	{
		name: 'salesforce-to-postgres',
		description: 'Salesforce to PostgreSQL CRM data sync',
		sourceType: 'Salesforce',
		targetType: 'PostgreSQL',
		config: {
			pipelineName: 'Salesforce {OBJECT} to {TARGET_NAME}',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 */6 * * *', // Every 6 hours
			enabled: true,
			artifacts: [
				{
					type: 'object',
					sourceObject: '{SALESFORCE_OBJECT}',
					targetTable: '{TARGET_SCHEMA}.{TARGET_TABLE}',
					mode: 'upsert',
					primaryKey: 'Id'
				}
			]
		}
	},
	{
		name: 'api-to-snowflake',
		description: 'REST API to Snowflake with JSON transformation',
		sourceType: 'REST API',
		targetType: 'Snowflake',
		config: {
			pipelineName: '{API_NAME} to {TARGET_NAME}',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 * * * *', // Hourly
			enabled: true,
			artifacts: [
				{
					type: 'api',
					endpoint: '{API_ENDPOINT}',
					method: 'GET',
					targetTable: '{TARGET_SCHEMA}.{TARGET_TABLE}',
					mode: 'append',
					jsonPath: '{JSON_PATH}'
				}
			]
		}
	},
	{
		name: 'postgres-to-redshift',
		description: 'PostgreSQL to Amazon Redshift data warehouse',
		sourceType: 'PostgreSQL',
		targetType: 'Redshift',
		config: {
			pipelineName: '{SOURCE_NAME} to Redshift',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 3 * * *', // Daily at 3am
			enabled: true,
			artifacts: [
				{
					type: 'table',
					sourceTable: '{SOURCE_CATALOG}.{SOURCE_SCHEMA}.{SOURCE_TABLE}',
					targetTable: '{TARGET_SCHEMA}.{TARGET_TABLE}',
					mode: 'full_refresh',
					distribution: 'key',
					distributionKey: '{DISTRIBUTION_KEY}',
					sortKey: '{SORT_KEY}'
				}
			]
		}
	},
	{
		name: 'mongodb-to-postgres',
		description: 'MongoDB to PostgreSQL with document flattening',
		sourceType: 'MongoDB',
		targetType: 'PostgreSQL',
		config: {
			pipelineName: '{COLLECTION} to {TARGET_NAME}',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 4 * * *', // Daily at 4am
			enabled: true,
			artifacts: [
				{
					type: 'collection',
					sourceCollection: '{SOURCE_DATABASE}.{COLLECTION}',
					targetTable: '{TARGET_SCHEMA}.{TARGET_TABLE}',
					mode: 'upsert',
					primaryKey: '_id',
					flatten: true
				}
			]
		}
	},
	{
		name: 'csv-to-databricks',
		description: 'CSV file to Databricks delta table',
		sourceType: 'S3',
		targetType: 'Databricks',
		config: {
			pipelineName: 'CSV Import to {TARGET_NAME}',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 8 * * *', // Daily at 8am
			enabled: true,
			artifacts: [
				{
					type: 'file',
					sourceFile: 's3://{S3_BUCKET}/{FILE_PATH}',
					fileFormat: 'csv',
					delimiter: ',',
					header: true,
					targetTable: '{TARGET_CATALOG}.{TARGET_SCHEMA}.{TARGET_TABLE}',
					mode: 'overwrite',
					deltaFormat: true
				}
			]
		}
	},
	{
		name: 'realtime-cdc',
		description: 'Real-time change data capture (CDC) pipeline',
		sourceType: 'PostgreSQL',
		targetType: 'Kafka',
		config: {
			pipelineName: '{SOURCE_TABLE} CDC Stream',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: 'realtime', // Continuous
			enabled: true,
			artifacts: [
				{
					type: 'cdc',
					sourceTable: '{SOURCE_CATALOG}.{SOURCE_SCHEMA}.{SOURCE_TABLE}',
					targetTopic: '{KAFKA_TOPIC}',
					mode: 'cdc',
					primaryKey: '{PRIMARY_KEY}',
					cdcColumn: '{CDC_COLUMN}'
				}
			]
		}
	},
	{
		name: 'weekly-batch',
		description: 'Weekly batch processing pipeline',
		sourceType: 'PostgreSQL',
		targetType: 'Snowflake',
		config: {
			pipelineName: 'Weekly {SOURCE_TABLE} Batch',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 2 * * 0', // Weekly on Sunday at 2am
			enabled: true,
			artifacts: [
				{
					type: 'table',
					sourceTable: '{SOURCE_CATALOG}.{SOURCE_SCHEMA}.{SOURCE_TABLE}',
					targetTable: '{TARGET_SCHEMA}.{TARGET_TABLE}',
					mode: 'full_refresh',
					preScript: '{PRE_SCRIPT}',
					postScript: '{POST_SCRIPT}'
				}
			]
		}
	},
	{
		name: 'multi-table-sync',
		description: 'Sync multiple tables from source to target',
		sourceType: 'PostgreSQL',
		targetType: 'Snowflake',
		config: {
			pipelineName: '{SOURCE_NAME} Multi-Table Sync',
			sourceConnectorId: '{SOURCE_ID}',
			targetConnectorId: '{TARGET_ID}',
			schedule: '0 1 * * *', // Daily at 1am
			enabled: true,
			artifacts: [
				{
					type: 'table',
					sourceTable: '{SOURCE_CATALOG}.{SOURCE_SCHEMA}.{TABLE_1}',
					targetTable: '{TARGET_SCHEMA}.{TABLE_1}',
					mode: 'incremental',
					primaryKey: 'id',
					timestampColumn: 'updated_at'
				},
				{
					type: 'table',
					sourceTable: '{SOURCE_CATALOG}.{SOURCE_SCHEMA}.{TABLE_2}',
					targetTable: '{TARGET_SCHEMA}.{TABLE_2}',
					mode: 'incremental',
					primaryKey: 'id',
					timestampColumn: 'updated_at'
				},
				{
					type: 'table',
					sourceTable: '{SOURCE_CATALOG}.{SOURCE_SCHEMA}.{TABLE_3}',
					targetTable: '{TARGET_SCHEMA}.{TABLE_3}',
					mode: 'incremental',
					primaryKey: 'id',
					timestampColumn: 'updated_at'
				}
			]
		}
	}
];

/**
 * Find a template by name
 *
 * @param name - Template name (case-insensitive)
 * @returns Template definition or undefined if not found
 *
 * @example
 * ```typescript
 * const template = findTemplate('postgres-to-snowflake');
 * if (template) {
 *   console.log(template.description);
 * }
 * ```
 */
export function findTemplate(name: string): PipelineTemplate | undefined {
	const normalizedName = name.toLowerCase().trim();
	return PIPELINE_TEMPLATES.find((t) => t.name.toLowerCase() === normalizedName);
}

/**
 * List all available templates
 *
 * @param filterType - Optional filter by source or target type
 * @returns Array of templates
 *
 * @example
 * ```typescript
 * // All templates
 * const all = listTemplates();
 *
 * // Filter by source type
 * const postgresTemplates = listTemplates('PostgreSQL');
 * ```
 */
export function listTemplates(filterType?: string): PipelineTemplate[] {
	if (!filterType) {
		return PIPELINE_TEMPLATES;
	}

	const normalized = filterType.toLowerCase();
	return PIPELINE_TEMPLATES.filter(
		(t) =>
			t.sourceType.toLowerCase().includes(normalized) ||
			t.targetType.toLowerCase().includes(normalized)
	);
}

/**
 * Extract variables from template config
 *
 * Finds all placeholders in format {VARIABLE_NAME} within the template config.
 * Variables can be nested within objects and arrays.
 *
 * @param config - Template configuration object
 * @returns Array of unique variable names (without braces)
 *
 * @example
 * ```typescript
 * const config = {
 *   name: '{SOURCE_NAME} to {TARGET_NAME}',
 *   sourceId: '{SOURCE_ID}'
 * };
 * const vars = findTemplateVariables(config);
 * // Returns: ['SOURCE_NAME', 'TARGET_NAME', 'SOURCE_ID']
 * ```
 */
export function findTemplateVariables(config: any): string[] {
	const variables = new Set<string>();
	const varPattern = /\{([^}]+)\}/g;

	function extractFromValue(value: any): void {
		if (typeof value === 'string') {
			let match;
			while ((match = varPattern.exec(value)) !== null) {
				variables.add(match[1]);
			}
		} else if (Array.isArray(value)) {
			value.forEach(extractFromValue);
		} else if (typeof value === 'object' && value !== null) {
			Object.values(value).forEach(extractFromValue);
		}
	}

	extractFromValue(config);
	return Array.from(variables).sort();
}

/**
 * Substitute variables in template
 *
 * Replaces all {VARIABLE_NAME} placeholders with provided values.
 * Handles nested objects and arrays recursively.
 *
 * @param template - Template object with placeholders
 * @param variables - Record mapping variable names to values
 * @returns New object with substituted values
 *
 * @example
 * ```typescript
 * const template = {
 *   pipelineName: '{SOURCE} to {TARGET}',
 *   sourceId: '{SOURCE_ID}'
 * };
 *
 * const result = substituteVariables(template, {
 *   SOURCE: 'PostgreSQL',
 *   TARGET: 'Snowflake',
 *   SOURCE_ID: '123'
 * });
 * // Returns: {
 * //   pipelineName: 'PostgreSQL to Snowflake',
 * //   sourceId: '123'
 * // }
 * ```
 */
export function substituteVariables(template: any, variables: Record<string, string>): any {
	// Convert to JSON string for bulk replacement
	let json = JSON.stringify(template);

	// Replace each variable
	for (const [key, value] of Object.entries(variables)) {
		const placeholder = `{${key}}`;
		const regex = new RegExp(escapeRegExp(placeholder), 'g');
		json = json.replace(regex, value);
	}

	return JSON.parse(json);
}

/**
 * Escape special regex characters
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate template before generation
 *
 * Ensures all required variables are provided and template is well-formed.
 *
 * @param template - Template to validate
 * @param variables - Variables to substitute
 * @returns Validation result with errors
 *
 * @example
 * ```typescript
 * const result = validateTemplate(template, { SOURCE_ID: '123' });
 * if (!result.valid) {
 *   console.error('Missing variables:', result.errors);
 * }
 * ```
 */
export function validateTemplate(
	template: PipelineTemplate,
	variables: Record<string, string>
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Extract required variables
	const requiredVars = findTemplateVariables(template.config);

	// Check for missing variables
	const missing = requiredVars.filter((varName) => !variables[varName]);
	if (missing.length > 0) {
		errors.push(`Missing required variables: ${missing.join(', ')}`);
	}

	// Check for empty values
	const empty = Object.entries(variables)
		.filter(([key, value]) => !value || value.trim().length === 0)
		.map(([key]) => key);
	if (empty.length > 0) {
		errors.push(`Empty values for variables: ${empty.join(', ')}`);
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Generate pipeline config from template
 *
 * Combines template lookup, variable substitution, and validation.
 *
 * @param templateName - Name of template to use
 * @param variables - Variable values for substitution
 * @returns Generated pipeline configuration
 * @throws Error if template not found or validation fails
 *
 * @example
 * ```typescript
 * const config = generateFromTemplate('postgres-to-snowflake', {
 *   SOURCE_NAME: 'Production DB',
 *   TARGET_NAME: 'Data Warehouse',
 *   SOURCE_ID: '123',
 *   TARGET_ID: '456',
 *   SOURCE_CATALOG: 'postgres',
 *   SOURCE_SCHEMA: 'public',
 *   SOURCE_TABLE: 'users',
 *   TARGET_SCHEMA: 'analytics',
 *   TARGET_TABLE: 'users'
 * });
 * ```
 */
export function generateFromTemplate(
	templateName: string,
	variables: Record<string, string>
): any {
	// Find template
	const template = findTemplate(templateName);
	if (!template) {
		throw new Error(`Template "${templateName}" not found`);
	}

	// Validate variables
	const validation = validateTemplate(template, variables);
	if (!validation.valid) {
		throw new Error(`Template validation failed:\n${validation.errors.join('\n')}`);
	}

	// Substitute variables
	return substituteVariables(template.config, variables);
}
