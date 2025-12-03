/**
 * Interactive Pipeline Creation Wizard for DataBasin CLI
 *
 * Provides guided step-by-step pipeline creation matching the frontend wizard UX.
 * Includes smart defaults, auto-detection, validation, and preview before submission.
 *
 * Based on frontend implementation:
 * @see PipelineCreationWizardViewModel.svelte.js
 * @see PipelinesApiClient.js
 *
 * @module commands/pipelines-wizard
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import type { CliConfig } from '../types/config.ts';
import type { PipelineData } from '../client/pipelines.ts';
import type { Connector } from '../types/api.ts';
import {
	promptForProject,
	promptInput,
	promptSelect,
	promptConfirm,
	promptForCatalog,
	promptForSchema,
	promptForTables,
	promptForDatabase,
	promptForSchemaInCatalog
} from '../utils/prompts.ts';
import {
	startSpinner,
	succeedSpinner,
	failSpinner,
	logError,
	type Ora
} from '../utils/progress.ts';
import { formatJson } from '../utils/formatters.ts';
import { ValidationError } from '../utils/errors.ts';
import { configCache } from '../utils/config-cache.ts';
import {
	createSqlClient,
	type SqlClient,
	type IngestionRecommendation
} from '../client/sql.ts';
import { createConfigurationClient } from '../client/configuration.ts';
import { getDiscoveryPattern, requiresDatabaseSelection, requiresSchemaSelection, validateConnectorConfiguration } from '../utils/discovery-patterns.ts';
import { logger } from '../utils/debug.ts';

/**
 * Magic number constants for pipeline configuration
 */
const DEFAULT_JOB_TIMEOUT_SECONDS = 12 * 60 * 60; // 12 hours
const CONNECTOR_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CRON_FIELD_COUNT = 5;

/**
 * Pipeline artifact configuration
 */
interface PipelineArtifact {
	sourceObjectName: string;
	targetObjectName: string;
	sourceSchema: string;
	columns: string;
	ingestionType: 'cdc' | 'delta' | 'historical' | 'snapshot' | 'stored_procedure';
	primaryKeys: string[] | null;
	timestampColumn: string | null;
	incrementalColumn?: string;
	autoExplode: boolean;
	detectDeletes: boolean;
	priority: boolean;
	replaceTable: boolean;
	backloadNumDays: number;
	snapshotRetentionPeriod: number;
}

/**
 * Detect ingestion pattern from target connector type
 *
 * @param targetSubType - Target connector subtype
 * @returns Ingestion pattern: "datalake" or "data warehouse"
 */
function detectIngestionPattern(targetSubType: string): string {
	const lakehouseTypes = ['databricks', 'snowflake', 'lakehouse', 'redshift', 'bigquery'];
	return lakehouseTypes.includes(targetSubType.toLowerCase()) ? 'datalake' : 'data warehouse';
}

/**
 * Format connector for display in selection list
 *
 * @param connector - Connector object
 * @returns Formatted display string
 */
function formatConnectorTitle(connector: Connector): string {
	return `${connector.connectorName} (${connector.connectorSubType}) - ID: ${connector.connectorID}`;
}

/**
 * Validate pipeline payload before submission
 *
 * Ensures all required fields are present and properly formatted.
 * Throws ValidationError if any issues are found.
 *
 * @param payload - Pipeline data payload to validate
 * @throws {ValidationError} If validation fails
 */
function validatePipelinePayload(payload: PipelineData): void {
	const errors: string[] = [];

	// Required string fields
	if (!payload.pipelineName || payload.pipelineName.trim() === '') {
		errors.push('Pipeline name is required');
	}

	// Required connector IDs (strings)
	if (!payload.sourceConnectorID || payload.sourceConnectorID.trim() === '') {
		errors.push('Valid source connector ID is required');
	}
	if (!payload.targetConnectorID || payload.targetConnectorID.trim() === '') {
		errors.push('Valid target connector ID is required');
	}

	// Required numeric IDs
	if (!payload.institutionID || payload.institutionID <= 0) {
		errors.push('Institution ID is required (from organization membership)');
	}
	if (!payload.ownerID || payload.ownerID <= 0) {
		errors.push('Owner ID is required');
	}

	// Project ID (string)
	if (!payload.internalID || payload.internalID.trim() === '') {
		errors.push('Project ID is required');
	}

	// Ingestion pattern
	if (!payload.ingestionPattern || payload.ingestionPattern.trim() === '') {
		errors.push('Ingestion pattern is required');
	}

	// Target location (either schema or catalog name required)
	if (!payload.targetSchemaName && !payload.targetCatalogName) {
		errors.push('Target schema or catalog name is required');
	}

	// Job details
	if (!payload.jobDetails) {
		errors.push('Job scheduling details are required');
	} else {
		if (!payload.jobDetails.jobRunTimeZone) {
			errors.push('Job timezone is required');
		}
		if (!payload.jobDetails.jobClusterSize) {
			errors.push('Job cluster size is required');
		}
	}

	// Artifacts validation
	if (!payload.items || !Array.isArray(payload.items)) {
		errors.push('Items array is required');
	} else if (payload.items.length === 0) {
		errors.push('At least one artifact/item is required');
	} else {
		// Validate each artifact
		payload.items.forEach((item, index) => {
			if (!item.sourceObjectName || item.sourceObjectName.trim() === '') {
				errors.push(`Item ${index + 1}: Source object name is required`);
			}
			if (!item.targetObjectName || item.targetObjectName.trim() === '') {
				errors.push(`Item ${index + 1}: Target object name is required`);
			}
			if (!item.ingestionType || !['cdc', 'delta', 'historical', 'snapshot', 'stored_procedure'].includes(item.ingestionType)) {
				errors.push(`Item ${index + 1}: Valid ingestion type (cdc/delta/historical/snapshot/stored_procedure) is required`);
			}
			// Delta and historical ingestion types may require timestamp or incremental column
			if (item.ingestionType === 'delta' || item.ingestionType === 'historical') {
				// Note: These validations are warnings only - some delta/historical loads may not require timestamp columns
				// The API will validate if required
			}
		});
	}

	// If any errors found, throw validation error
	if (errors.length > 0) {
		throw new ValidationError(
			'Pipeline payload validation failed:\n  - ' + errors.join('\n  - ')
		);
	}
}

/**
 * Prompt user to select source connector
 *
 * Filters connectors that support ingress (reading data).
 *
 * @param connectors - Array of available connectors
 * @returns Selected connector ID
 */
async function promptForSourceConnector(connectors: Connector[]): Promise<string> {
	// Filter connectors that can be sources (have tables/files to read)
	// In practice, most connectors can be sources except pure egress-only connectors
	const sourceConnectors = connectors;

	if (sourceConnectors.length === 0) {
		throw new ValidationError('No source connectors available', 'connectors', [
			'Create a connector first using: databasin connectors create'
		]);
	}

	const choices = sourceConnectors.map((c) => ({
		title: formatConnectorTitle(c),
		value: String(c.connectorID)
	}));

	return await promptSelect('Select source connector:', choices);
}

/**
 * Prompt user to select target connector
 *
 * Filters connectors that support egress (writing data).
 *
 * @param connectors - Array of available connectors
 * @param sourceConnectorId - Selected source connector ID (to exclude)
 * @returns Selected connector ID
 */
async function promptForTargetConnector(
	connectors: Connector[],
	sourceConnectorId: string
): Promise<string> {
	// Filter out the source connector from target options
	const targetConnectors = connectors.filter((c) => String(c.connectorID) !== sourceConnectorId);

	if (targetConnectors.length === 0) {
		throw new ValidationError('No target connectors available', 'connectors', [
			'Create another connector to use as target',
			'Source and target must be different connectors'
		]);
	}

	const choices = targetConnectors.map((c) => ({
		title: formatConnectorTitle(c),
		value: String(c.connectorID)
	}));

	return await promptSelect('Select target connector:', choices);
}

/**
 * Create a pipeline artifact with default configuration
 *
 * @param tableName - Source table name
 * @param sourceSchema - Source schema name
 * @param sourceCatalog - Optional source catalog name
 * @returns Pipeline artifact object
 */
function createDefaultArtifact(
	tableName: string,
	sourceSchema: string,
	sourceCatalog?: string
): PipelineArtifact {
	// NOTE: sourceSchema should be just the schema name, NOT combined with catalog
	// The catalog is set separately as sourceDatabaseName on each item via enrichArtifacts
	return {
		sourceObjectName: tableName,
		targetObjectName: tableName,
		sourceSchema,  // Just the schema name - catalog is handled separately
		columns: '*',
		ingestionType: 'snapshot',
		primaryKeys: null,
		timestampColumn: null,
		autoExplode: false,
		detectDeletes: false,
		priority: false,
		replaceTable: false,
		backloadNumDays: 0,
		snapshotRetentionPeriod: 3
	};
}

/**
 * Prompt user to select artifact entry mode
 *
 * @returns Selected mode
 */
async function promptArtifactMode(): Promise<'discover' | 'file' | 'manual' | 'skip'> {
	return await promptSelect<'discover' | 'file' | 'manual' | 'skip'>(
		'How would you like to add artifacts?',
		[
			{ title: 'Browse tables (schema discovery)', value: 'discover' },
			{ title: 'Upload JSON file', value: 'file' },
			{ title: 'Enter manually', value: 'manual' },
			{ title: 'Skip (add later)', value: 'skip' }
		]
	);
}

/**
 * Handle skip mode - no artifacts added
 *
 * @returns Empty array
 */
function handleSkipMode(): PipelineArtifact[] {
	console.log(chalk.yellow('\nNo artifacts added. You can add them later via:'));
	console.log(chalk.dim('  databasin pipelines update <pipeline-id> --from-file artifacts.json'));
	return [];
}

/**
 * Handle file mode - load artifacts from JSON file
 *
 * @returns Array of artifacts loaded from file
 */
async function handleFileMode(): Promise<PipelineArtifact[]> {
	const filePath = await promptInput(
		'Enter path to artifacts JSON file:',
		undefined,
		(val) => {
			if (!val) return 'File path is required';
			if (!existsSync(val)) return 'File does not exist';
			return true;
		}
	);

	const content = readFileSync(filePath, 'utf-8');
	const artifacts = JSON.parse(content);

	if (!Array.isArray(artifacts)) {
		throw new Error('Artifacts file must contain an array');
	}

	console.log(chalk.green(`✓ Loaded ${artifacts.length} artifact(s) from file\n`));
	return artifacts;
}

/**
 * Handle manual mode - interactive artifact entry
 *
 * @param sourceSchema - Source schema name
 * @param sourceCatalog - Optional source catalog name
 * @returns Array of manually entered artifacts
 */
async function handleManualMode(
	sourceSchema: string,
	sourceCatalog?: string
): Promise<PipelineArtifact[]> {
	const artifacts: PipelineArtifact[] = [];
	let addMore = true;

	while (addMore) {
		const artifactName = await promptInput('Enter artifact name (table name):');
		artifacts.push(createDefaultArtifact(artifactName, sourceSchema, sourceCatalog));
		addMore = await promptConfirm('Add another artifact?', false);
	}

	console.log(chalk.green(`✓ Created ${artifacts.length} artifact(s)\n`));
	return artifacts;
}

/**
 * Handle discover mode - schema discovery with table selection
 *
 * @param sqlClient - SQL client instance
 * @param sourceConnector - Source connector object
 * @param sourceSchema - Source schema name
 * @param sourceCatalog - Optional source catalog name
 * @returns Array of artifacts from discovered tables
 */
async function handleDiscoverMode(
	sqlClient: SqlClient,
	sourceConnector: Connector,
	sourceSchema: string,
	sourceCatalog?: string
): Promise<PipelineArtifact[]> {
	console.log(chalk.cyan('\nFetching tables from source connector...'));

	// DEBUG: Log parameters being passed
	logger.debug('handleDiscoverMode parameters:', {
		connectorID: sourceConnector.connectorID,
		schema: sourceSchema,
		schemaType: typeof sourceSchema,
		schemaLength: sourceSchema?.length,
		catalog: sourceCatalog || 'undefined'
	});

	try {
		const tables = await promptForTables(
			sqlClient,
			Number(sourceConnector.connectorID),
			sourceSchema,
			sourceCatalog,
			'Select tables to include in pipeline (space to select, enter to confirm)'
		);

		if (tables.length === 0) {
			console.warn(chalk.yellow('No tables selected'));
			return [];
		}

		console.log(chalk.green(`✓ Selected ${tables.length} table(s)\n`));

		return tables.map((tableName) =>
			createDefaultArtifact(tableName, sourceSchema, sourceCatalog)
		);
	} catch (error) {
		console.error(chalk.red(`Failed to fetch tables: ${(error as Error).message}`));
		console.log(chalk.yellow('Falling back to manual entry...'));

		const artifactName = await promptInput('Enter table name:');
		return [createDefaultArtifact(artifactName, sourceSchema, sourceCatalog)];
	}
}

/**
 * Prompt for pipeline artifacts using schema discovery or manual entry
 *
 * @param sqlClient - SQL client instance
 * @param sourceConnector - Source connector object
 * @param sourceCatalog - Optional source catalog name
 * @param sourceSchema - Source schema name
 * @returns Array of pipeline artifacts
 */
async function promptForArtifacts(
	sqlClient: SqlClient,
	sourceConnector: Connector,
	sourceCatalog: string | undefined,
	sourceSchema: string
): Promise<PipelineArtifact[]> {
	const mode = await promptArtifactMode();

	switch (mode) {
		case 'skip':
			return handleSkipMode();
		case 'file':
			return await handleFileMode();
		case 'manual':
			return await handleManualMode(sourceSchema, sourceCatalog);
		case 'discover':
			return await handleDiscoverMode(sqlClient, sourceConnector, sourceSchema, sourceCatalog);
	}
}

/**
 * Configure job scheduling
 *
 * Prompts user for schedule type, timezone, and cluster size.
 *
 * @returns Job details configuration
 */
async function configureJobScheduling(): Promise<any> {
	const scheduleType = await promptSelect<'manual' | 'hourly' | 'daily' | 'weekly' | 'custom'>('Job schedule:', [
		{ title: 'Manual only (no automatic schedule)', value: 'manual' },
		{ title: 'Hourly', value: 'hourly' },
		{ title: 'Daily', value: 'daily' },
		{ title: 'Weekly', value: 'weekly' },
		{ title: 'Custom cron expression', value: 'custom' }
	]);

	let jobRunSchedule: string | null = null;

	if (scheduleType !== 'manual') {
		if (scheduleType === 'custom') {
			jobRunSchedule = await promptInput(
				'Enter cron expression (e.g., "0 2 * * *" for 2 AM daily):',
				'0 2 * * *',
				(val) => {
					// Basic cron validation (5 fields)
					const parts = val.trim().split(/\s+/);
					return parts.length === CRON_FIELD_COUNT || `Invalid cron expression (expected ${CRON_FIELD_COUNT} fields)`;
				}
			);
		} else if (scheduleType === 'hourly') {
			jobRunSchedule = '0 * * * *';
		} else if (scheduleType === 'daily') {
			const hour = await promptInput('Hour (0-23):', '2', (val) => {
				const num = parseInt(val, 10);
				return (num >= 0 && num <= 23) || 'Hour must be between 0 and 23';
			});
			jobRunSchedule = `0 ${hour} * * *`;
		} else if (scheduleType === 'weekly') {
			const day = await promptSelect<'0' | '1' | '2' | '3' | '4' | '5' | '6'>('Day of week:', [
				{ title: 'Sunday', value: '0' },
				{ title: 'Monday', value: '1' },
				{ title: 'Tuesday', value: '2' },
				{ title: 'Wednesday', value: '3' },
				{ title: 'Thursday', value: '4' },
				{ title: 'Friday', value: '5' },
				{ title: 'Saturday', value: '6' }
			]);
			const hour = await promptInput('Hour (0-23):', '2', (val) => {
				const num = parseInt(val, 10);
				return (num >= 0 && num <= 23) || 'Hour must be between 0 and 23';
			});
			jobRunSchedule = `0 ${hour} * * ${day}`;
		}
	}

	const timezone = await promptSelect<string>('Timezone:', [
		{ title: 'UTC', value: 'UTC' },
		{ title: 'America/New_York (EST/EDT)', value: 'America/New_York' },
		{ title: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
		{ title: 'America/Denver (MST/MDT)', value: 'America/Denver' },
		{ title: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
		{ title: 'Europe/London (GMT/BST)', value: 'Europe/London' },
		{ title: 'Europe/Paris (CET/CEST)', value: 'Europe/Paris' },
		{ title: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
		{ title: 'Australia/Sydney (AEST/AEDT)', value: 'Australia/Sydney' }
	]);

	const clusterSize = await promptSelect<'S' | 'M' | 'L' | 'XL'>('Cluster size:', [
		{ title: 'Small (S) - Development and testing', value: 'S' },
		{ title: 'Medium (M) - Small production workloads', value: 'M' },
		{ title: 'Large (L) - Standard production workloads', value: 'L' },
		{ title: 'Extra Large (XL) - Heavy production workloads', value: 'XL' }
	]);

	return {
		jobRunSchedule,
		jobRunTimeZone: timezone,
		jobClusterSize: clusterSize,
		tags: [],
		emailNotifications: [],
		jobTimeout: String(DEFAULT_JOB_TIMEOUT_SECONDS)
	};
}

/**
 * Interactive pipeline creation wizard command
 *
 * Guides user through complete pipeline creation process with 11 steps:
 * 1. Select project
 * 2. Enter pipeline name
 * 3. Select source connector
 * 4. Source schema discovery
 * 5. Select target connector
 * 6. Confirm/change ingestion pattern
 * 7. Target configuration (catalog or schema)
 * 8-9. Configure artifacts (schema discovery, file, manual, or skip)
 * 10. Configure job scheduling
 * 11. Review and confirm
 */
async function wizardCommand(
	options: {
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const clients = {
		...opts._clients,
		sql: createSqlClient()
	};

	console.log(chalk.bold.cyan('\n════════════════════════════════════════════════════'));
	console.log(chalk.bold.cyan('   DataBasin Pipeline Creation Wizard'));
	console.log(chalk.bold.cyan('════════════════════════════════════════════════════\n'));

	try {
		// STEP 1: Select project
		console.log(chalk.bold('Step 1: Select Project'));
		const projectId =
			options.project || (await promptForProject(clients.projects, 'Select project:'));
		console.log(chalk.green(`✓ Project: ${projectId}\n`));

		// STEP 2: Pipeline name
		console.log(chalk.bold('Step 2: Pipeline Name'));
		const pipelineName = await promptInput('Enter pipeline name:', '', (val) => {
			if (val.trim().length === 0) return 'Pipeline name is required';
			if (val.trim().length < 3) return 'Pipeline name must be at least 3 characters';
			return true;
		});
		console.log(chalk.green(`✓ Name: ${pipelineName}\n`));

		// STEP 3: Source connector
		console.log(chalk.bold('Step 3: Source Connector'));
		const connectorsSpinner = startSpinner('Loading connectors...');

		// Use cache for connector list
		const connectors = await configCache.get(
			`connectors_${projectId}`,
			async () => {
				const result = await clients.connectors.list(projectId, { count: false });
				return Array.isArray(result) ? result : [];
			},
			CONNECTOR_CACHE_TTL_MS
		);

		succeedSpinner(connectorsSpinner, `Loaded ${connectors.length} connector(s)`);

		const sourceConnectorId = await promptForSourceConnector(connectors);
		const sourceConnector = connectors.find((c) => String(c.connectorID) === sourceConnectorId);
		console.log(
			chalk.green(`✓ Source: ${sourceConnector?.connectorName} (${sourceConnector?.connectorSubType})\n`)
		);

		if (!sourceConnector) {
			throw new Error(`Source connector selection failed: Connector with ID ${sourceConnectorId} not found in available connectors list. Please verify the connector exists.`);
		}

		// STEP 3.5: Fetch connector configuration
		console.log(chalk.bold('\nFetching connector configuration...'));

		const configClient = createConfigurationClient();
		let connectorConfig;

		try {
			connectorConfig = await configClient.getConnectorConfiguration(
				sourceConnector.connectorSubType
			);
			console.log(chalk.green(`✓ Configuration loaded for ${sourceConnector.connectorSubType}\n`));

		// Validate the configuration
		const validation = validateConnectorConfiguration(connectorConfig);

		if (!validation.valid) {
			console.error(chalk.red('✗ Invalid connector configuration:'));
			validation.errors.forEach(err => {
				console.error(chalk.red(`  - ${err}`));
			});
			console.log(chalk.yellow('Skipping discovery due to invalid configuration...\n'));
			connectorConfig = null;
		} else if (validation.warnings.length > 0) {
			console.log(chalk.yellow('⚠ Configuration warnings:'));
			validation.warnings.forEach(warn => {
				console.log(chalk.yellow(`  - ${warn}`));
			});
			console.log(); // Empty line
		}

		logger.debug('Configuration validation result', {
			valid: validation.valid,
			errorCount: validation.errors.length,
			warningCount: validation.warnings.length
		});

	} catch (error) {
		console.error(chalk.red(`✗ Failed to load connector configuration: ${(error as Error).message}`));
		console.log(chalk.yellow('Skipping schema discovery...\n'));
		connectorConfig = null;
	}

		// Determine discovery workflow
		let discoveryPattern: 'lakehouse' | 'rdbms' | 'none' = 'none';
		let requiresDatabase = false;
		let requiresSchema = false;

		if (connectorConfig) {
			discoveryPattern = getDiscoveryPattern(connectorConfig);
			requiresDatabase = requiresDatabaseSelection(connectorConfig);
			requiresSchema = requiresSchemaSelection(connectorConfig);

			logger.debug('Discovery configuration:', {
				pattern: discoveryPattern,
				requiresDatabase,
				requiresSchema
			});
		}

		// STEP 4: Target connector
		console.log(chalk.bold('Step 4: Target Connector'));
		const targetConnectorId = await promptForTargetConnector(connectors, sourceConnectorId);
		const targetConnector = connectors.find((c) => String(c.connectorID) === targetConnectorId);
		console.log(
			chalk.green(`✓ Target: ${targetConnector?.connectorName} (${targetConnector?.connectorSubType})\n`)
		);

		// STEP 5: Ingestion pattern
		console.log(chalk.bold('Step 5: Ingestion Pattern'));
		const detectedPattern = detectIngestionPattern(targetConnector!.connectorSubType);
		console.log(chalk.dim(`Auto-detected: ${detectedPattern}\n`));

		const ingestionPattern = await promptSelect<'data warehouse' | 'datalake'>(`Confirm ingestion pattern:`, [
			{ title: `Use detected (${detectedPattern}) - Recommended`, value: detectedPattern as 'data warehouse' | 'datalake' },
			{ title: 'Data warehouse', value: 'data warehouse' },
			{ title: 'Datalake', value: 'datalake' }
		]);
		console.log(chalk.green(`✓ Ingestion pattern: ${ingestionPattern}\n`));

		// STEP 6: Target configuration (Pattern-specific)
		let targetCatalogName = '';
		let targetSchemaName = '';

		if (ingestionPattern === 'data warehouse') {
			console.log(chalk.bold('Step 6: Target Catalog'));
			targetCatalogName = await promptInput('Enter target catalog name:', '', (val) => {
				return val.trim().length > 0 || 'Catalog name is required for data warehouse mode';
			});
			console.log(chalk.green(`✓ Target catalog: ${targetCatalogName}\n`));
		} else {
			console.log(chalk.bold('Step 6: Target Schema'));
			targetSchemaName = await promptInput('Enter target schema name:', '', (val) => {
				return val.trim().length > 0 || 'Schema name is required for datalake mode';
			});
			console.log(chalk.green(`✓ Target schema: ${targetSchemaName}\n`));
		}

		// STEP 7: Source Schema Discovery (Configuration-Driven)
		let sourceCatalog: string | undefined;
		let sourceSchema: string = '';

		if (discoveryPattern === 'none') {
			console.log(chalk.yellow('No schema discovery needed for this connector type\n'));
			sourceSchema = ''; // Or prompt user for manual entry if needed
		} else {
			console.log(chalk.bold(`Step 7: Source ${discoveryPattern === 'lakehouse' ? 'Database & ' : ''}Schema Discovery`));

			try {
				if (discoveryPattern === 'lakehouse') {
					// LAKEHOUSE PATTERN: Database → Schema (two-phase)
					logger.debug('Using lakehouse-style discovery (database → schema)');

					// Phase 1: Database selection
					console.log(chalk.bold('Phase 1: Select Database/Catalog'));
					const catalogsResponse = await clients.sql.getCatalogs(
						Number(sourceConnector.connectorID)
					);

					if (catalogsResponse.objects && catalogsResponse.objects.length > 0) {
						logger.debug(`Found ${catalogsResponse.objects.length} database(s)`);

						sourceCatalog = await promptForDatabase(
							clients.sql,
							Number(sourceConnector.connectorID),
							'Select source database/catalog'
						);
						console.log(chalk.green(`✓ Database: ${sourceCatalog}\n`));
					} else {
						throw new Error(`Database discovery failed: No databases available for lakehouse connector ${sourceConnector.connectorID} (${sourceConnector.connectorName}). Verify the connector is properly configured and has accessible databases.`);
					}

					// Phase 2: Schema selection
					console.log(chalk.bold('Phase 2: Select Schema'));
					const schemasResponse = await clients.sql.getSchemas(
						Number(sourceConnector.connectorID),
						sourceCatalog
					);

					if (schemasResponse.objects && schemasResponse.objects.length > 0) {
						logger.debug(`Found ${schemasResponse.objects.length} schema(s)`);

						sourceSchema = await promptForSchemaInCatalog(
							clients.sql,
							Number(sourceConnector.connectorID),
							sourceCatalog,
							`Select schema from database '${sourceCatalog}'`
						);
						console.log(chalk.green(`✓ Schema: ${sourceSchema}\n`));
					} else {
						throw new Error(`Schema discovery failed: No schemas available in database '${sourceCatalog}' for connector ${sourceConnector.connectorID} (${sourceConnector.connectorName}). The selected database may be empty or you may lack permissions.`);
					}

				} else if (discoveryPattern === 'rdbms') {
					// RDBMS PATTERN: Schema only (single-phase)
					logger.debug('Using RDBMS-style discovery (schema only)');

					const catalogData = await clients.sql.getCatalogsWithSchemas(
						Number(sourceConnector.connectorID)
					);

					const schemas = catalogData.objects || [];

					if (schemas.length === 0) {
						throw new Error(`Schema discovery failed: No schemas available for RDBMS connector ${sourceConnector.connectorID} (${sourceConnector.connectorName}). Verify the connector is properly configured and has accessible schemas.`);
					}

					logger.debug(`Found ${schemas.length} schema(s)`);

					const choices = schemas.map((name: string) => ({ title: name, value: name }));
					sourceSchema = await promptSelect('Select source schema:', choices);
					console.log(chalk.green(`✓ Schema: ${sourceSchema}\n`));
				}

			} catch (error) {
				console.warn(chalk.yellow(`⚠ Schema discovery failed: ${(error as Error).message}`));
				console.log(chalk.yellow('Falling back to manual schema entry...\n'));

				sourceSchema = await promptInput(
					sourceCatalog
						? `Enter schema name for database '${sourceCatalog}'`
						: 'Enter schema name',
					'public'
				);
				console.log(chalk.green(`✓ Schema: ${sourceSchema}\n`));
			}
		}

		// STEP 8-9: Pipeline Artifacts

		// STEP 8-9: Artifacts
		console.log(chalk.bold('Step 8-9: Pipeline Artifacts'));
		const artifacts = await promptForArtifacts(
			clients.sql,
			sourceConnector,
			sourceCatalog,
			sourceSchema
		);

		// Apply AI ingestion recommendations
		// Auto-fetch and apply recommendations if we have artifacts AND a valid schema
		// (schema is required for recommendations API)
		if (artifacts.length > 0 && sourceSchema && sourceSchema.trim() !== '') {
			console.log(chalk.cyan('\nAnalyzing tables for AI-powered ingestion recommendations...'));

			try {
				// Note: getIngestionRecommendations signature is (connectorId, tables, schema, catalog?)
				const recommendations = await clients.sql.getIngestionRecommendations(
					Number(sourceConnector.connectorID),
					artifacts.map((a) => a.sourceObjectName),
					sourceSchema,  // Required: schema parameter
					sourceCatalog  // Optional: catalog parameter
				);

				// Display recommendations
				console.log(chalk.bold('\nAI Recommendations (automatically applied):'));
				for (const rec of recommendations) {
					const tableName = (rec as any).sourceTableName || rec.table;
					const ingestionType = (rec as any).ingestionType || rec.recommendedType;

					console.log(chalk.cyan(`  ${tableName}:`));
					console.log(`    Type: ${chalk.green(ingestionType)}`);
					if (rec.confidence) {
						console.log(`    Confidence: ${rec.confidence}%`);
					}
					if (rec.reason) {
						console.log(`    Reason: ${rec.reason}`);
					}

					// Check for merge columns (API uses mergeColumns not primaryKeys)
					const primaryKeys = (rec as any).mergeColumns || rec.primaryKeys;
					if (primaryKeys && Array.isArray(primaryKeys) && primaryKeys.length > 0) {
						console.log(`    Primary Keys: ${primaryKeys.join(', ')}`);
					}

					// Check for watermark column (API uses watermarkColumnName not timestampColumn)
					const timestampCol = (rec as any).watermarkColumnName || rec.timestampColumn;
					if (timestampCol) {
						console.log(`    Timestamp Column: ${timestampCol}`);
					}
					console.log('');
				}

				// Auto-apply recommendations to artifacts
				for (const artifact of artifacts) {
					const rec = recommendations.find(
						(rec: IngestionRecommendation) => {
							const tableName = (rec as any).sourceTableName || rec.table;
							return tableName === artifact.sourceObjectName;
						}
					);
					if (rec) {
						const ingestionType = (rec as any).ingestionType || rec.recommendedType;
						artifact.ingestionType = ingestionType as 'cdc' | 'delta' | 'historical' | 'snapshot' | 'stored_procedure';

						// Map merge columns to primary keys
						const mergeColumns = (rec as any).mergeColumns || rec.primaryKeys;
						if (mergeColumns && Array.isArray(mergeColumns)) {
							artifact.primaryKeys = mergeColumns;
						}

						// Map watermark column to timestamp column
						// Note: API may return watermarkColumnName as array or string
						let watermarkCol = (rec as any).watermarkColumnName || rec.timestampColumn;

						// If watermarkCol is an array, extract first element
						if (Array.isArray(watermarkCol) && watermarkCol.length > 0) {
							watermarkCol = watermarkCol[0];
						}

						if (watermarkCol && typeof watermarkCol === 'string') {
							artifact.timestampColumn = watermarkCol;
						}

						if ((ingestionType === 'delta' || ingestionType === 'historical') && watermarkCol && typeof watermarkCol === 'string') {
							artifact.incrementalColumn = watermarkCol;
						}
					}
				}
				console.log(chalk.green('✓ AI recommendations applied automatically\n'));

			} catch (error) {
				console.warn(
					chalk.yellow(`⚠ Failed to get AI recommendations: ${(error as Error).message}`)
				);
				console.log(chalk.yellow('Continuing with default settings...\n'));
			}
		}

		// STEP 10: Job scheduling
		console.log(chalk.bold('Step 10: Job Scheduling'));
		const jobDetails = await configureJobScheduling();
		console.log(chalk.green(`✓ Job scheduling configured\n`));

		// Get project and user info for payload
		const projectSpinner = startSpinner('Fetching project information...');
		const allProjects = await clients.projects.list();
		const projects = Array.isArray(allProjects) ? allProjects : [];
		const project = projects.find(p => p.internalId === projectId || String(p.id) === projectId);

		if (!project) {
			failSpinner(projectSpinner, 'Project not found');
			throw new Error(`Project ${projectId} not found in accessible projects.`);
		}

		logger.debug(`Found project: ${project.name} (ID: ${project.id}, Internal: ${project.internalId})`);
		logger.debug(`Project institutionId: ${project.institutionId}`);
		logger.debug(`Project organizationName: ${project.organizationName}`);

		succeedSpinner(projectSpinner, 'Project information loaded');

		const userSpinner = startSpinner('Fetching user information...');
		const userInfo = await clients.projects.getCurrentUser();

		logger.debug(`User: ${userInfo.firstName} ${userInfo.lastName} (ID: ${userInfo.id})`);
		logger.debug(`User email: ${userInfo.email}`);

		succeedSpinner(userSpinner, 'User information loaded');

		// Extract institution ID from project (API returns this as institutionId)
		const institutionID = project.institutionId;
		logger.debug(`Extracted institutionID: ${institutionID}`);

		if (!institutionID || institutionID <= 0) {
			throw new Error(`Project ${projectId} has no valid institution ID (got: ${institutionID}). Please contact your administrator.`);
		}

		// Build pipeline payload
		// Note: sourceCatalog is used to set sourceDatabaseName on each item
		// targetCatalogName is used to set targetDatabaseName on each item
		// These match the frontend behavior at ArtifactWizardViewModelBase.svelte.js:604-606
		const payload: PipelineData = {
			pipelineName,
			sourceConnectorID: sourceConnectorId,
			targetConnectorID: targetConnectorId,
			institutionID,
			internalID: projectId,
			ownerID: userInfo.id,
			ingestionPattern,
			targetCatalogName,
			targetSchemaName,
			sourceCatalog,      // Sets sourceDatabaseName on each item
			sourceSchema,       // Preserved for reference
			jobDetails,
			items: artifacts
		};

		// STEP 11: Review and confirm
		console.log(chalk.bold.cyan('\n════════════════════════════════════════════════════'));
		console.log(chalk.bold.cyan('   Pipeline Configuration Review'));
		console.log(chalk.bold.cyan('════════════════════════════════════════════════════\n'));

		console.log(chalk.bold('Pipeline Details:'));
		console.log(chalk.dim(`  Name:              ${pipelineName}`));
		console.log(
			chalk.dim(`  Source:            ${sourceConnector?.connectorName} (${sourceConnector?.connectorSubType})`)
		);
		console.log(
			chalk.dim(`  Target:            ${targetConnector?.connectorName} (${targetConnector?.connectorSubType})`)
		);
		console.log(chalk.dim(`  Ingestion Pattern: ${ingestionPattern}`));
		console.log(
			chalk.dim(`  Target ${ingestionPattern === 'datalake' ? 'Schema' : 'Catalog'}: ${targetSchemaName || targetCatalogName}`)
		);
		console.log(chalk.dim(`  Artifacts:         ${artifacts.length}`));
		console.log(
			chalk.dim(
				`  Schedule:          ${jobDetails.jobRunSchedule || 'Manual only'} (${jobDetails.jobRunTimeZone})`
			)
		);
		console.log(chalk.dim(`  Cluster Size:      ${jobDetails.jobClusterSize}`));
		console.log();

		const showFullPayload = await promptConfirm('Show full configuration payload?', false);

		if (showFullPayload) {
			console.log(chalk.bold('\nFull Configuration:\n'));
			console.log(formatJson(payload));
			console.log();
		}

		const confirm = await promptConfirm('\nCreate this pipeline?', true);

		if (!confirm) {
			console.log(chalk.yellow('\n✗ Pipeline creation cancelled.\n'));
			return;
		}

		// Validate payload before submission
		try {
			validatePipelinePayload(payload);
			console.log(chalk.green('✓ Payload validation passed\n'));
		} catch (error) {
			if (error instanceof ValidationError) {
				console.error(chalk.red('\n✗ Payload validation failed:'));
				console.error(chalk.red(error.message));
				console.log(chalk.yellow('\nPlease review the configuration and try again.\n'));
				return;
			}
			throw error;
		}

		// Create pipeline
		const createSpinner = startSpinner('Creating pipeline...');

		try {
			const pipeline = await clients.pipelines.create(payload);
			succeedSpinner(
				createSpinner,
				`Pipeline created successfully! ID: ${pipeline.pipelineID}`
			);

			console.log(chalk.green('\n✓ Pipeline is ready to use!\n'));
			console.log(chalk.dim('View pipeline:'));
			console.log(chalk.dim(`  databasin pipelines get ${pipeline.pipelineID}`));
			console.log(chalk.dim('\nRun pipeline:'));
			console.log(chalk.dim(`  databasin pipelines run ${pipeline.pipelineID}\n`));
		} catch (error) {
			failSpinner(createSpinner, 'Failed to create pipeline');
			throw error;
		}
	} catch (error) {
		logError('Wizard failed', error as Error);
		process.exit(1);
	}
}

/**
 * Create pipeline wizard command
 *
 * Registers the interactive wizard command.
 *
 * @returns Configured Commander command
 */
export function createPipelineWizardCommand(): Command {
	const command = new Command('wizard')
		.description('Interactive pipeline creation wizard')
		.option('--project <projectId>', 'Project ID (skip project selection prompt)')
		.action(wizardCommand);

	return command;
}
