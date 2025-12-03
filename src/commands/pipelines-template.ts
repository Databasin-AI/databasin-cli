/**
 * Pipeline Template Generator for Databasin CLI
 *
 * Provides commands for generating and validating pipeline configuration templates.
 * Templates help users quickly create pipelines with example configurations and
 * smart defaults based on connector types.
 *
 * Based on frontend wizard implementation:
 * @see PipelineCreationWizardViewModel.svelte.js
 * @see PipelinesApiClient.js
 *
 * @module commands/pipelines-template
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import type { CliConfig } from '../types/config.ts';
import type { PipelineData } from '../client/pipelines.ts';
import { formatJson } from '../utils/formatters.ts';
import { logError } from '../utils/progress.ts';
import { ValidationError } from '../utils/errors.ts';
import { getArtifactTypeFromConnectorSubType } from '../client/connector-types.ts';

/**
 * Detect ingestion pattern from target connector type
 *
 * Based on target connector subtype, determines whether pipeline should use
 * "datalake" or "data warehouse" ingestion pattern.
 *
 * Lakehouse targets (Databricks, Snowflake, Redshift, BigQuery) → datalake mode
 * Other targets → data warehouse mode
 *
 * @param targetType - Target connector subtype (e.g., "snowflake", "postgres")
 * @returns Ingestion pattern: "datalake" or "data warehouse"
 */
function detectIngestionPattern(targetType: string): string {
	const lakehouseTypes = ['databricks', 'snowflake', 'lakehouse', 'redshift', 'bigquery'];
	return lakehouseTypes.includes(targetType.toLowerCase()) ? 'datalake' : 'data warehouse';
}

/**
 * Generate pipeline configuration template
 *
 * Creates a complete pipeline template with smart defaults based on connector types.
 * Includes inline comments documenting required fields and expected values.
 *
 * @param sourceType - Source connector subtype (e.g., "postgres")
 * @param targetType - Target connector subtype (e.g., "snowflake")
 * @returns Pipeline configuration template with documentation
 */
function generatePipelineTemplate(sourceType: string, targetType: string): any {
	const ingestionPattern = detectIngestionPattern(targetType);
	const sourceArtifactType = getArtifactTypeFromConnectorSubType(sourceType);

	// Base template
	const template: any = {
		// REQUIRED: Pipeline name
		pipelineName: 'EXAMPLE: My Pipeline Name',

		// REQUIRED: Source connector ID (get from `databasin connectors list`)
		sourceConnectorID: 0,

		// REQUIRED: Target connector ID (get from `databasin connectors list`)
		targetConnectorID: 0,

		// REQUIRED: Institution ID (get from `databasin auth whoami`)
		institutionID: 0,

		// REQUIRED: Project internal ID (get from `databasin projects list`)
		internalID: 'PROJECT_ID',

		// REQUIRED: Owner user ID (get from `databasin auth whoami`)
		ownerID: 0,

		// OPTIONAL: Make pipeline private (0=public, 1=private)
		isPrivate: 0,

		// AUTO-DETECTED: Ingestion pattern based on target type
		ingestionPattern,

		// AUTO-SET: Source naming convention
		sourceNamingConvention: ingestionPattern === 'data warehouse',

		// AUTO-SET: Create catalogs flag
		createCatalogs: ingestionPattern === 'datalake',

		// AUTO-SET: Connector technology array
		connectorTechnology: [sourceType.toLowerCase()],

		// REQUIRED for data warehouse mode: Target catalog name
		targetCatalogName: ingestionPattern === 'data warehouse' ? 'CATALOG_NAME' : '',

		// REQUIRED for datalake mode: Target schema name
		targetSchemaName: ingestionPattern === 'datalake' ? 'SCHEMA_NAME' : '',

		// Job execution configuration
		jobDetails: {
			// Tags for pipeline organization
			tags: [],

			// Cluster size: S (small), M (medium), L (large), XL (extra large)
			jobClusterSize: 'S',

			// Email addresses for job notifications
			emailNotifications: [],

			// Cron schedule (e.g., '0 10 * * *' = 10 AM daily)
			// Set to null for manual-only pipelines
			jobRunSchedule: '0 10 * * *',

			// Timezone for schedule (e.g., 'UTC', 'America/New_York')
			jobRunTimeZone: 'UTC',

			// Job timeout in seconds (string format required)
			jobTimeout: '43200' // 12 hours
		},

		// Pipeline artifacts (tables/files to sync)
		items: [
			{
				// Source table/file name
				sourceObjectName: 'TABLE_NAME',

				// Target table/file name (can differ from source)
				targetObjectName: 'TABLE_NAME',

				// Source schema (for databases)
				sourceSchema: 'public',

				// Columns to sync: '*' for all, or comma-separated list
				columns: '*',

				// Ingestion type: 'full', 'incremental', 'snapshot'
				ingestionType: 'full',

				// Primary keys for incremental ingestion (optional)
				primaryKeys: null,

				// Timestamp column for incremental ingestion (optional)
				timestampColumn: null,

				// Auto-explode nested structures (true/false)
				autoExplode: false,

				// Detect deleted records (true/false)
				detectDeletes: false,

				// High priority artifact (true/false)
				priority: false,

				// Replace table on each run (true/false)
				replaceTable: false,

				// Number of days to backload for incremental (0 = no backload)
				backloadNumDays: 0,

				// Snapshot retention period in days
				snapshotRetentionPeriod: 3
			}
		]
	};

	// Add CSV/file-specific fields if source is file-based
	if (sourceArtifactType === 3) {
		// File artifact type
		template.items[0] = {
			...template.items[0],

			// File format: 'csv', 'json', 'parquet', 'avro', 'orc', 'xml'
			sourceFileFormat: 'csv',

			// File delimiter for CSV/TXT (default: ',')
			sourceFileDelimiter: ',',

			// File has header row (true/false)
			containsHeader: true,

			// Header line number (1 if has header, 0 if no header)
			columnHeaderLineNumber: 1,

			// File path pattern (e.g., '/data/*.csv')
			sourceFilePath: '/path/to/file.csv'
		};
	}

	return template;
}

/**
 * Validate pipeline template
 *
 * Checks template for required fields and valid values.
 * Returns array of validation errors or empty array if valid.
 *
 * @param template - Pipeline template to validate
 * @returns Array of validation error messages
 */
function validateTemplate(template: any): string[] {
	const errors: string[] = [];

	// Check required fields
	if (!template.pipelineName || template.pipelineName.includes('EXAMPLE')) {
		errors.push('pipelineName is required (replace EXAMPLE value)');
	}

	if (!template.sourceConnectorID || template.sourceConnectorID === 0) {
		errors.push('sourceConnectorID is required (provide valid connector ID)');
	}

	if (!template.targetConnectorID || template.targetConnectorID === 0) {
		errors.push('targetConnectorID is required (provide valid connector ID)');
	}

	if (!template.institutionID || template.institutionID === 0) {
		errors.push('institutionID is required (get from `databasin auth whoami`)');
	}

	if (!template.internalID || template.internalID === 'PROJECT_ID') {
		errors.push('internalID is required (provide project internal ID)');
	}

	if (template.ownerID === undefined || template.ownerID === null || template.ownerID === 0) {
		errors.push('ownerID is required (get from `databasin auth whoami`)');
	}

	// Check pattern-specific required fields
	if (template.ingestionPattern === 'datalake') {
		if (!template.targetSchemaName || template.targetSchemaName === 'SCHEMA_NAME') {
			errors.push('targetSchemaName is required for datalake ingestion pattern');
		}
	} else if (template.ingestionPattern === 'data warehouse') {
		if (!template.targetCatalogName || template.targetCatalogName === 'CATALOG_NAME') {
			errors.push('targetCatalogName is required for data warehouse ingestion pattern');
		}
	}

	// Check job details
	if (!template.jobDetails) {
		errors.push('jobDetails is required');
	} else {
		if (!template.jobDetails.jobClusterSize) {
			errors.push('jobDetails.jobClusterSize is required (S, M, L, or XL)');
		}
		if (!template.jobDetails.jobRunTimeZone) {
			errors.push('jobDetails.jobRunTimeZone is required');
		}
		if (!template.jobDetails.jobTimeout) {
			errors.push('jobDetails.jobTimeout is required (string format)');
		}
	}

	// Check artifacts
	if (!template.items || !Array.isArray(template.items) || template.items.length === 0) {
		errors.push('items array is required (at least one artifact)');
	} else {
		template.items.forEach((item: any, index: number) => {
			if (!item.sourceObjectName || item.sourceObjectName === 'TABLE_NAME') {
				errors.push(`items[${index}].sourceObjectName is required`);
			}
			if (!item.targetObjectName || item.targetObjectName === 'TABLE_NAME') {
				errors.push(`items[${index}].targetObjectName is required`);
			}
		});
	}

	return errors;
}

/**
 * Generate command - Create pipeline template
 */
async function generateCommand(
	options: {
		source: string;
		target: string;
		output?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;

	try {
		console.log(chalk.bold.cyan('\nGenerating Pipeline Template\n'));
		console.log(chalk.dim(`Source type: ${options.source}`));
		console.log(chalk.dim(`Target type: ${options.target}\n`));

		// Generate template
		const template = generatePipelineTemplate(options.source, options.target);

		// Format as JSON with comments preserved
		const formattedTemplate = formatJson(template);

		// Output to file or stdout
		if (options.output) {
			writeFileSync(options.output, formattedTemplate);
			console.log(chalk.green(`✓ Template written to ${options.output}\n`));
			console.log(chalk.dim('Next steps:'));
			console.log(chalk.dim('1. Edit the template and replace placeholder values'));
			console.log(chalk.dim('2. Validate: databasin pipelines template validate --file ' + options.output));
			console.log(
				chalk.dim('3. Create pipeline: databasin pipelines create --from-file ' + options.output)
			);
		} else {
			console.log(formattedTemplate);
			console.log();
			console.log(chalk.dim('To save this template:'));
			console.log(
				chalk.dim(
					`databasin pipelines template generate --source ${options.source} --target ${options.target} --output template.json`
				)
			);
		}
	} catch (error) {
		logError('Failed to generate template', error as Error);
		process.exit(1);
	}
}

/**
 * Validate command - Validate pipeline template
 */
async function validateCommand(
	options: {
		file: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;

	try {
		console.log(chalk.bold.cyan('\nValidating Pipeline Template\n'));

		// Check file exists
		if (!existsSync(options.file)) {
			throw new ValidationError(`Template file not found: ${options.file}`, 'file', [
				'Verify the file path and try again'
			]);
		}

		// Read and parse template
		const content = readFileSync(options.file, 'utf-8');
		let template: any;

		try {
			template = JSON.parse(content);
		} catch (error) {
			throw new ValidationError('Invalid JSON format', 'file', [
				'Template file must contain valid JSON',
				(error as Error)?.message || String(error)
			]);
		}

		// Validate template
		const errors = validateTemplate(template);

		if (errors.length === 0) {
			console.log(chalk.green('✓ Template is valid!\n'));
			console.log(chalk.dim('You can now create a pipeline:'));
			console.log(chalk.dim(`databasin pipelines create --from-file ${options.file}`));
		} else {
			console.log(chalk.red(`✗ Template has ${errors.length} validation error(s):\n`));
			errors.forEach((error, index) => {
				console.log(chalk.red(`  ${index + 1}. ${error}`));
			});
			console.log();
			process.exit(1);
		}
	} catch (error) {
		logError('Failed to validate template', error as Error);
		process.exit(1);
	}
}

/**
 * Create pipeline template command
 *
 * Registers subcommands for template generation and validation.
 *
 * @returns Configured Commander command
 */
export function createPipelineTemplateCommand(): Command {
	const command = new Command('template').description('Generate and validate pipeline templates');

	// Generate subcommand
	command
		.command('generate')
		.description('Generate a pipeline configuration template')
		.requiredOption('--source <type>', 'Source connector type (e.g., postgres, mysql, csv)')
		.requiredOption('--target <type>', 'Target connector type (e.g., snowflake, databricks)')
		.option('--output <file>', 'Output file path (default: stdout)')
		.action(generateCommand);

	// Validate subcommand
	command
		.command('validate')
		.description('Validate a pipeline configuration template')
		.requiredOption('--file <path>', 'Template file to validate')
		.action(validateCommand);

	return command;
}
