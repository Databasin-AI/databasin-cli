/**
 * Connectors Inspect Command Implementation
 *
 * Comprehensive connector inspection that provides all relevant information
 * about a connector in a single command:
 * - Connection test
 * - Metadata (ID, name, type, status, project)
 * - Configuration (sanitized)
 * - Database structure discovery (for SQL connectors)
 * - Pipeline usage analysis
 * - Quick action suggestions
 *
 * @module commands/connectors-inspect
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { ConnectorsClient } from '../client/connectors.ts';
import type { PipelinesClient } from '../client/pipelines.ts';
import type { ProjectsClient } from '../client/projects.ts';
import type { SqlClient } from '../client/sql.ts';
import type { CliConfig } from '../types/config.ts';
import type { Connector, Pipeline, Project } from '../types/api.ts';
import {
	startSpinner,
	succeedSpinner,
	failSpinner,
	logError,
	type Ora
} from '../utils/progress.ts';

/**
 * SQL connector types that support schema discovery
 */
const SQL_CONNECTOR_TYPES = [
	'postgres',
	'postgresql',
	'mysql',
	'mariadb',
	'sqlserver',
	'mssql',
	'oracle',
	'snowflake',
	'databricks',
	'redshift',
	'bigquery',
	'trino',
	'presto',
	'db2',
	'sybase'
];

/**
 * Display limits for database structure discovery
 */
const DISPLAY_LIMITS = {
	/** Maximum databases to show in structure tree */
	MAX_DATABASES: 3,
	/** Maximum schemas to show per database */
	MAX_SCHEMAS: 3,
	/** Maximum tables to show per schema */
	MAX_TABLES: 5,
	/** Maximum pipelines to show in usage section */
	MAX_PIPELINES: 10
} as const;

/**
 * Command options interface with global options
 */
interface InspectCommandOptions {
	/** CLI configuration object */
	_config: CliConfig;
	/** API client instances */
	_clients: {
		connectors: ConnectorsClient;
		pipelines: PipelinesClient;
		projects: ProjectsClient;
		sql: SqlClient;
	};
	/** Enable debug mode with verbose logging */
	debug: boolean;
}

/**
 * Check if a connector is a SQL-based connector
 */
function isSqlConnector(connector: Connector): boolean {
	const type = (connector.connectorType || '').toLowerCase();
	const subType = (connector.connectorSubType || '').toLowerCase();

	return SQL_CONNECTOR_TYPES.some(sqlType =>
		type.includes(sqlType) || subType.includes(sqlType)
	);
}

/**
 * Sanitize configuration by removing sensitive fields
 */
function sanitizeConfiguration(config: Record<string, unknown>): Record<string, unknown> {
	const sensitive = ['password', 'apikey', 'secret', 'token', 'credential', 'auth'];
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(config)) {
		const lowerKey = key.toLowerCase();
		if (sensitive.some(s => lowerKey.includes(s))) {
			sanitized[key] = '********';
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Display connector metadata section
 */
function displayMetadata(connector: Connector): void {
	console.log(chalk.bold(`Connector: ${connector.connectorName} (${connector.connectorID})`));
	console.log(`Type: ${connector.connectorType || 'Unknown'}`);

	if (connector.connectorSubType) {
		console.log(`Subtype: ${connector.connectorSubType}`);
	}

	if (connector.internalID) {
		console.log(`Project ID: ${connector.internalID}`);
	}

	if (connector.createdAt) {
		const createdDate = new Date(connector.createdAt);
		console.log(`Created: ${createdDate.toLocaleDateString()}`);
	}
}

/**
 * Display connection configuration section
 */
function displayConfiguration(connector: Connector): void {
	if (!connector.configuration || Object.keys(connector.configuration).length === 0) {
		return;
	}

	console.log();
	console.log(chalk.bold('Connection Details:'));

	const sanitized = sanitizeConfiguration(connector.configuration);
	const displayFields = ['host', 'hostname', 'server', 'port', 'database', 'schema', 'bucket', 'region', 'url', 'baseUrl'];

	for (const field of displayFields) {
		if (sanitized[field]) {
			const label = field.charAt(0).toUpperCase() + field.slice(1);
			console.log(`  ${label}: ${sanitized[field]}`);
		}
	}

	if (sanitized.ssl !== undefined) {
		console.log(`  SSL: ${sanitized.ssl ? 'Enabled' : 'Disabled'}`);
	}
}

/**
 * Discover and display database structure
 */
async function displayDatabaseStructure(
	connectorId: string,
	sqlClient: SqlClient,
	opts: Pick<InspectCommandOptions, 'debug'>
): Promise<void> {
	console.log();
	const discoverSpinner = startSpinner('Discovering database structure...');

	try {
		// Try to get catalogs/databases first
		const catalogsResponse = await sqlClient.getCatalogs(connectorId);
		const databases = catalogsResponse.objects || [];

		succeedSpinner(discoverSpinner, `Found ${databases.length} database(s)`);

		if (databases.length === 0) {
			return;
		}

		console.log();
		console.log(chalk.bold('Database Structure:'));

		// Limit databases for brevity
		const displayDatabases = databases.slice(0, DISPLAY_LIMITS.MAX_DATABASES);

		for (const database of displayDatabases) {
			console.log(`  └─ ${chalk.cyan(database)} (database)`);

			try {
				// Get schemas for this database
				const schemasResponse = await sqlClient.getSchemas(connectorId, database);
				const schemas = schemasResponse.objects || [];

				if (schemas.length === 0) {
					console.log(`      (no schemas found)`);
					continue;
				}

				// Limit schemas for brevity
				const displaySchemas = schemas.slice(0, DISPLAY_LIMITS.MAX_SCHEMAS);

				for (let i = 0; i < displaySchemas.length; i++) {
					const schema = displaySchemas[i];
					const isLastSchema = i === displaySchemas.length - 1 && schemas.length <= DISPLAY_LIMITS.MAX_SCHEMAS;
					const schemaPrefix = isLastSchema ? '└─' : '├─';

					console.log(`      ${schemaPrefix} ${chalk.yellow(schema)} (schema)`);

					try {
						// Get tables for this schema
						const tables = await sqlClient.listTables(connectorId, database, schema);

						if (tables.length === 0) {
							continue;
						}

						// Limit tables for brevity
						const displayTables = tables.slice(0, DISPLAY_LIMITS.MAX_TABLES);

						for (let j = 0; j < displayTables.length; j++) {
							const table = displayTables[j];
							const isLastTable = j === displayTables.length - 1 && tables.length <= DISPLAY_LIMITS.MAX_TABLES;
							const tablePrefix = isLastTable ? '└─' : '├─';
							const schemaIndent = isLastSchema ? ' ' : '│';

							console.log(`      ${schemaIndent}   ${tablePrefix} ${table.name}`);
						}

						if (tables.length > DISPLAY_LIMITS.MAX_TABLES) {
							const schemaIndent = isLastSchema ? ' ' : '│';
							console.log(`      ${schemaIndent}       ... and ${tables.length - DISPLAY_LIMITS.MAX_TABLES} more tables`);
						}
					} catch (err) {
						// Skip table listing if it fails
						if (opts.debug) {
							console.error(`      (could not list tables: ${err instanceof Error ? err.message : String(err)})`);
						}
					}
				}

				if (schemas.length > DISPLAY_LIMITS.MAX_SCHEMAS) {
					console.log(`      ... and ${schemas.length - DISPLAY_LIMITS.MAX_SCHEMAS} more schemas`);
				}
			} catch (err) {
				// Skip schema listing if it fails
				if (opts.debug) {
					console.error(`      (could not list schemas: ${err instanceof Error ? err.message : String(err)})`);
				}
			}
		}

		if (databases.length > DISPLAY_LIMITS.MAX_DATABASES) {
			console.log(`  ... and ${databases.length - DISPLAY_LIMITS.MAX_DATABASES} more databases`);
		}
	} catch (err) {
		failSpinner(discoverSpinner, 'Could not discover structure');
		if (opts.debug) {
			console.error(`Discovery error: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
}

/**
 * Find and display pipeline usage
 */
async function displayPipelineUsage(
	connector: Connector,
	pipelinesClient: PipelinesClient,
	projectsClient: ProjectsClient,
	opts: Pick<InspectCommandOptions, 'debug'>
): Promise<void> {
	console.log();
	const pipelineSpinner = startSpinner('Finding pipeline usage...');

	try {
		// Get all projects the user has access to
		const projectsResult = await projectsClient.list();

		// Handle both array and count responses
		const projects = Array.isArray(projectsResult) ? projectsResult : [];
		const allPipelines: Pipeline[] = [];

		// Fetch pipelines from each project
		for (const project of projects) {
			try {
				const projectPipelinesResult = await pipelinesClient.list(project.internalId, {
					count: false
				});

				const projectPipelines = Array.isArray(projectPipelinesResult) ? projectPipelinesResult : [];
				allPipelines.push(...projectPipelines);
			} catch (err) {
				// Skip projects we can't access
				if (opts.debug) {
					console.error(`Could not fetch pipelines for project ${project.internalId}: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		}

		// Filter pipelines using this connector
		const usingPipelines = allPipelines.filter(p =>
			p.sourceConnectorId === connector.connectorID ||
			p.targetConnectorId === connector.connectorID
		);

		succeedSpinner(pipelineSpinner);

		if (usingPipelines.length > 0) {
			console.log();
			console.log(chalk.bold(`Pipeline Usage:`));
			console.log(`  Used in ${usingPipelines.length} pipeline(s):`);

			const displayPipelines = usingPipelines.slice(0, DISPLAY_LIMITS.MAX_PIPELINES);

			for (const pipeline of displayPipelines) {
				const role = pipeline.sourceConnectorId === connector.connectorID ? 'Source' : 'Target';
				console.log(`    • ${pipeline.pipelineName || 'Unnamed'} (${pipeline.pipelineID}) - ${chalk.dim(role)}`);
			}

			if (usingPipelines.length > DISPLAY_LIMITS.MAX_PIPELINES) {
				console.log(`    ... and ${usingPipelines.length - DISPLAY_LIMITS.MAX_PIPELINES} more pipelines`);
			}
		} else {
			console.log(chalk.dim('Not currently used in any pipelines'));
		}
	} catch (err) {
		failSpinner(pipelineSpinner, 'Could not check pipeline usage');
		if (opts.debug) {
			console.error(`Pipeline lookup error: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
}

/**
 * Display quick action suggestions
 */
function displayQuickActions(connector: Connector, isSql: boolean): void {
	console.log();
	console.log(chalk.bold('Quick Actions:'));

	const connectorId = connector.connectorID;

	if (isSql) {
		console.log(`  ${chalk.cyan('$')} databasin sql exec ${connectorId} "SELECT * FROM <table> LIMIT 5"`);
		console.log(`  ${chalk.cyan('$')} databasin sql discover ${connectorId}`);
	}

	console.log(`  ${chalk.cyan('$')} databasin pipelines create --source ${connectorId}`);
	console.log(`  ${chalk.cyan('$')} databasin connectors test ${connectorId}`);
	console.log(`  ${chalk.cyan('$')} databasin connectors update ${connectorId}`);
}

/**
 * Inspect Command
 *
 * Comprehensive connector inspection showing all relevant information.
 */
export async function inspectCommand(
	idOrName: string,
	options: {},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals() as InspectCommandOptions;
	const connectorsClient = opts._clients.connectors;
	const pipelinesClient = opts._clients.pipelines;
	const projectsClient = opts._clients.projects;
	const sqlClient = opts._clients.sql;

	let spinner: Ora | undefined;

	try {
		// 1. Find connector by ID or name
		let connector: Connector;

		if (/^\d+$/.test(idOrName)) {
			// ID provided - fetch directly
			spinner = startSpinner('Fetching connector details...');
			connector = await connectorsClient.getById(idOrName);
			succeedSpinner(spinner, 'Connector found');
		} else {
			// Name provided - search for it
			spinner = startSpinner('Searching for connector...');
			const allConnectors = await connectorsClient.list(undefined, {
				count: false,
				fields: 'connectorID,connectorName,connectorType,connectorSubType,internalID,createdAt,configuration'
			});

			if (!Array.isArray(allConnectors)) {
				throw new Error('Failed to list connectors');
			}

			// Case-insensitive partial match
			const matches = allConnectors.filter(c =>
				c.connectorName.toLowerCase().includes(idOrName.toLowerCase())
			);

			if (matches.length === 0) {
				failSpinner(spinner, `No connector found matching "${idOrName}"`);
				process.exit(1);
			}

			if (matches.length > 1) {
				failSpinner(spinner, `Multiple connectors found matching "${idOrName}"`);
				console.log();
				console.log(chalk.yellow('Multiple matches found:'));
				matches.forEach(c => {
					console.log(`  • ${c.connectorName} (${c.connectorID})`);
				});
				console.log();
				console.log(chalk.gray('Please specify a more specific name or use the connector ID'));
				throw new Error('Multiple connectors matched - please be more specific');
			}

			connector = matches[0];
			succeedSpinner(spinner, `Found: ${connector.connectorName}`);
		}

		const connectorId = connector.connectorID.toString();

		// 2. Test connection
		console.log();
		const testSpinner = startSpinner('Testing connection...');
		let connectionStatus = 'Unknown';

		try {
			const testResult = await connectorsClient.test(connectorId);
			connectionStatus = testResult.success ? 'Active' : 'Failed';

			if (testResult.success) {
				succeedSpinner(testSpinner, chalk.green('Connection successful'));
			} else {
				failSpinner(testSpinner, chalk.red('Connection failed'));
				if (testResult.message) {
					console.log(chalk.red(`  ${testResult.message}`));
				}
			}
		} catch (err) {
			connectionStatus = 'Error';
			failSpinner(testSpinner, chalk.red('Connection test failed'));
			if (opts.debug && err instanceof Error) {
				console.error(chalk.gray(`  ${err.message}`));
			}
		}

		console.log();

		// 3. Display connector metadata
		displayMetadata(connector);
		console.log(`Status: ${connectionStatus}`);

		// 4. Display configuration
		displayConfiguration(connector);

		// 5. Discover database structure (if SQL connector)
		const isSql = isSqlConnector(connector);
		if (isSql) {
			await displayDatabaseStructure(connectorId, sqlClient, opts);
		}

		// 6. Find pipeline usage
		await displayPipelineUsage(connector, pipelinesClient, projectsClient, opts);

		// 7. Show quick actions
		displayQuickActions(connector, isSql);

	} catch (error: unknown) {
		if (spinner) {
			failSpinner(spinner, 'Failed to inspect connector');
		}

		if (error instanceof Error) {
			logError(`Error: ${error.message}`);
			if (opts.debug) {
				console.error(error.stack);
			}
		}

		process.exit(1);
	}
}
