/**
 * SQL Command Implementation
 *
 * Provides CLI commands for SQL query execution and schema exploration:
 * - catalogs: List available catalogs for a connector
 * - schemas: List schemas in a catalog
 * - tables: List tables in a schema
 * - exec/execute: Execute SQL queries
 *
 * @module commands/sql
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import type { SqlClient } from '../client/sql.ts';
import type { CliConfig } from '../types/config.ts';
import type { QueryResult } from '../types/api.ts';
import type { Catalog, Schema, Table, Column, IngestionRecommendation } from '../client/sql.ts';
import {
	formatOutput,
	formatTable,
	detectFormat,
	type FormatOptions
} from '../utils/formatters.ts';
import {
	startSpinner,
	succeedSpinner,
	failSpinner,
	logInfo,
	logError,
	startTimer,
	formatDuration,
	type Ora
} from '../utils/progress.ts';
import { ApiError, FileSystemError, formatError, MissingArgumentError } from '../utils/errors.ts';
import { parseFields } from '../utils/command-helpers.ts';
import { promptForTables } from '../utils/prompts.ts';
import { loadContext } from '../utils/context.ts';
import CliTable from 'cli-table3';
import chalk from 'chalk';

/**
 * Read SQL query from file
 *
 * @param filePath - Path to SQL file
 * @returns Query string (trimmed)
 * @throws FileSystemError if file cannot be read
 */
function readQueryFromFile(filePath: string): string {
	try {
		const query = readFileSync(filePath, 'utf-8');
		return query.trim();
	} catch (error) {
		throw new FileSystemError(`Query file not found: ${filePath}`, filePath, 'read');
	}
}

/**
 * Format query result as table, JSON, or CSV
 *
 * @param result - Query result with rows and metadata
 * @param format - Output format
 * @param colors - Whether to use colors
 * @returns Formatted output string
 */
function formatQueryResult(
	result: QueryResult,
	format: 'table' | 'json' | 'csv',
	colors: boolean
): string {
	if (!result.rows || result.rows.length === 0) {
		return 'No rows returned';
	}

	return formatOutput(result.rows, format, { colors });
}

/**
 * Catalogs Command
 * List all catalogs for a connector
 */
async function catalogsCommand(
	connectorId: string | undefined,
	options: {
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: SqlClient = opts._clients.sql;

	let spinner: Ora | undefined;

	try {
		// Priority: CLI argument > Context > Error
		if (!connectorId) {
			const context = loadContext();
			connectorId = context.connector;
			if (connectorId && opts.debug) {
				console.error(`[CONTEXT] Using connector from context: ${connectorId}`);
			}
		}

		if (!connectorId) {
			throw new MissingArgumentError(
				'connectorId',
				'sql catalogs',
				undefined,
				['databasin sql catalogs 5459', 'databasin set connector 5459 && databasin sql catalogs']
			);
		}

		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		if (format === 'table') {
			spinner = startSpinner('Fetching catalogs...');
		}

		// Fetch catalogs
		const catalogs = await client.listCatalogs(connectorId);

		// Succeed spinner with count
		if (spinner) {
			succeedSpinner(
				spinner,
				`Found ${catalogs.length} catalog${catalogs.length === 1 ? '' : 's'}`
			);
		}

		// Handle empty results
		if (catalogs.length === 0) {
			logInfo('No catalogs found for this connector');
			return;
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(catalogs, format, { fields, colors: config.output.colors });

		console.log('\n' + output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch catalogs');
		}

		// Handle specific error cases
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				console.error(`✖ Connector not found (${error.statusCode})`);
				console.error(`  Connector ID: ${connectorId}`);
				console.error(
					`  Suggestion: Run 'databasin connectors list --full' to see available connectors`
				);
			} else if (error.statusCode === 403) {
				console.error(`✖ Access denied (${error.statusCode})`);
				console.error(`  Connector ID: ${connectorId}`);
				console.error(`  Suggestion: You don't have permission to query this connector`);
			} else {
				logError('Error fetching catalogs', error);
			}
		} else {
			logError('Error fetching catalogs', error instanceof Error ? error : undefined);
		}

		throw error;
	}
}

/**
 * Schemas Command
 * List schemas in a catalog
 */
async function schemasCommand(
	connectorId: string | undefined,
	options: {
		catalog: string;
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: SqlClient = opts._clients.sql;

	let spinner: Ora | undefined;

	try {
		// Priority: CLI argument > Context > Error
		if (!connectorId) {
			const context = loadContext();
			connectorId = context.connector;
			if (connectorId && opts.debug) {
				console.error(`[CONTEXT] Using connector from context: ${connectorId}`);
			}
		}

		if (!connectorId) {
			throw new MissingArgumentError(
				'connectorId',
				'sql schemas',
				undefined,
				['databasin sql schemas 5459 --catalog my_catalog', 'databasin set connector 5459 && databasin sql schemas --catalog my_catalog']
			);
		}

		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		if (format === 'table') {
			spinner = startSpinner('Fetching schemas...');
		}

		// Fetch schemas
		const schemas = await client.listSchemas(connectorId, options.catalog);

		// Succeed spinner with count
		if (spinner) {
			succeedSpinner(spinner, `Found ${schemas.length} schema${schemas.length === 1 ? '' : 's'}`);
		}

		// Handle empty results
		if (schemas.length === 0) {
			logInfo(`No schemas found in catalog '${options.catalog}'`);
			return;
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(schemas, format, { fields, colors: config.output.colors });

		console.log('\n' + output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch schemas');
		}

		// Handle specific error cases
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				console.error(`✖ Catalog not found`);
				console.error(`  Catalog: ${options.catalog}`);
				console.error(
					`  Suggestion: Run 'databasin sql catalogs ${connectorId}' to see available catalogs`
				);
			} else if (error.statusCode === 403) {
				console.error(`✖ Access denied (${error.statusCode})`);
				console.error(`  Connector ID: ${connectorId}`);
				console.error(`  Suggestion: You don't have permission to query this connector`);
			} else {
				logError('Error fetching schemas', error);
			}
		} else {
			logError('Error fetching schemas', error instanceof Error ? error : undefined);
		}

		throw error;
	}
}

/**
 * Tables Command
 * List tables in a schema
 */
async function tablesCommand(
	connectorId: string | undefined,
	options: {
		catalog: string;
		schema: string;
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: SqlClient = opts._clients.sql;

	let spinner: Ora | undefined;

	try {
		// Priority: CLI argument > Context > Error
		if (!connectorId) {
			const context = loadContext();
			connectorId = context.connector;
			if (connectorId && opts.debug) {
				console.error(`[CONTEXT] Using connector from context: ${connectorId}`);
			}
		}

		if (!connectorId) {
			throw new MissingArgumentError(
				'connectorId',
				'sql tables',
				undefined,
				['databasin sql tables 5459 --catalog my_catalog --schema my_schema', 'databasin set connector 5459 && databasin sql tables --catalog my_catalog --schema my_schema']
			);
		}

		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		if (format === 'table') {
			spinner = startSpinner('Fetching tables...');
		}

		// Fetch tables
		const tables = await client.listTables(connectorId, options.catalog, options.schema);

		// Succeed spinner with count
		if (spinner) {
			succeedSpinner(spinner, `Found ${tables.length} table${tables.length === 1 ? '' : 's'}`);
		}

		// Handle empty results
		if (tables.length === 0) {
			logInfo(`No tables found in schema '${options.catalog}.${options.schema}'`);
			return;
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(tables, format, { fields, colors: config.output.colors });

		console.log('\n' + output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch tables');
		}

		// Handle specific error cases
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				console.error(`✖ Schema not found`);
				console.error(`  Catalog: ${options.catalog}`);
				console.error(`  Schema: ${options.schema}`);
				console.error(
					`  Suggestion: Run 'databasin sql schemas ${connectorId} --catalog ${options.catalog}' to see available schemas`
				);
			} else if (error.statusCode === 403) {
				console.error(`✖ Access denied (${error.statusCode})`);
				console.error(`  Connector ID: ${connectorId}`);
				console.error(`  Suggestion: You don't have permission to query this connector`);
			} else {
				logError('Error fetching tables', error);
			}
		} else {
			logError('Error fetching tables', error instanceof Error ? error : undefined);
		}

		throw error;
	}
}

/**
 * Get table list from options (either --tables or --interactive)
 *
 * Validates that exactly one method is provided and returns the table list.
 *
 * @param options - Command options with tables and/or interactive flag
 * @param sqlClient - SQL client instance for interactive prompts
 * @param connectorId - Connector ID
 * @param schema - Schema name
 * @param catalog - Optional catalog name
 * @returns Array of table names
 * @throws Error if validation fails
 */
async function getTableList(
	options: {
		tables?: string;
		interactive?: boolean;
	},
	sqlClient: SqlClient,
	connectorId: number,
	schema: string,
	catalog?: string
): Promise<string[]> {
	// Validate: Either --tables OR --interactive required
	const hasTables = options.tables !== undefined;
	const hasInteractive = options.interactive === true;

	if (hasTables && hasInteractive) {
		throw new Error('Cannot use --tables and --interactive together');
	}

	if (!hasTables && !hasInteractive) {
		throw new Error('Must provide either --tables or --interactive');
	}

	// Get table list
	if (hasInteractive) {
		// Interactive mode - prompt user
		const selectedTables = await promptForTables(sqlClient, connectorId, schema, catalog);
		if (!selectedTables || selectedTables.length === 0) {
			throw new Error('No tables selected');
		}
		return selectedTables;
	} else {
		// Parse comma-separated table names
		return options
			.tables!.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
	}
}

/**
 * Format columns output by table
 *
 * @param columnsByTable - Record of table name to columns array
 * @param format - Output format
 * @param colors - Whether to use colors
 * @returns Formatted output string
 */
function formatColumnsOutput(
	columnsByTable: Record<string, Column[]>,
	format: 'table' | 'json' | 'csv',
	colors: boolean
): string {
	if (format === 'json') {
		return JSON.stringify(columnsByTable, null, 2);
	}

	if (format === 'csv') {
		// Flatten to CSV format
		const rows: any[] = [];
		for (const [tableName, columns] of Object.entries(columnsByTable)) {
			for (const col of columns) {
				rows.push({
					table: tableName,
					column: col.name,
					type: col.type,
					nullable: col.nullable ? 'YES' : 'NO'
				});
			}
		}
		return formatOutput(rows, 'csv', { colors });
	}

	// Table format - group by table
	const sections: string[] = [];

	for (const [tableName, columns] of Object.entries(columnsByTable)) {
		if (columns.length === 0) {
			continue;
		}

		// Add table header
		const tableHeader = colors ? chalk.cyan.bold(`Table: ${tableName}`) : `Table: ${tableName}`;
		sections.push(tableHeader);

		// Create table for columns
		const table = new CliTable({
			head: colors
				? [chalk.cyan.bold('Column'), chalk.cyan.bold('Type'), chalk.cyan.bold('Nullable')]
				: ['Column', 'Type', 'Nullable']
		});

		for (const col of columns) {
			table.push([col.name, col.type, col.nullable ? 'YES' : 'NO']);
		}

		sections.push(table.toString());
		sections.push(''); // Empty line between tables
	}

	return sections.join('\n');
}

/**
 * Format ingestion recommendations output
 *
 * @param recommendations - Array of recommendations
 * @param format - Output format
 * @param colors - Whether to use colors
 * @returns Formatted output string
 */
function formatRecommendationsOutput(
	recommendations: IngestionRecommendation[],
	format: 'table' | 'json' | 'csv',
	colors: boolean
): string {
	if (format === 'json') {
		return JSON.stringify(recommendations, null, 2);
	}

	if (format === 'csv') {
		// Flatten to CSV format
		const rows = recommendations.map((rec) => ({
			table: rec.table,
			recommendedType: rec.recommendedType,
			confidence: rec.confidence || '',
			primaryKeys: rec.primaryKeys ? rec.primaryKeys.join(';') : '',
			timestampColumn: rec.timestampColumn || '',
			reason: rec.reason || ''
		}));
		return formatOutput(rows, 'csv', { colors });
	}

	// Table format
	const header = colors
		? chalk.cyan.bold('Ingestion Type Recommendations')
		: 'Ingestion Type Recommendations';

	const table = new CliTable({
		head: colors
			? [
					chalk.cyan.bold('Table'),
					chalk.cyan.bold('Recommended Type'),
					chalk.cyan.bold('Confidence'),
					chalk.cyan.bold('Primary Keys'),
					chalk.cyan.bold('Timestamp Column')
			  ]
			: ['Table', 'Recommended Type', 'Confidence', 'Primary Keys', 'Timestamp Column']
	});

	for (const rec of recommendations) {
		table.push([
			rec.table,
			rec.recommendedType,
			rec.confidence !== undefined ? `${rec.confidence}%` : '-',
			rec.primaryKeys ? rec.primaryKeys.join(', ') : '-',
			rec.timestampColumn || '-'
		]);
	}

	const sections = [header, table.toString()];

	// Add reasons if present
	const reasonsWithText = recommendations.filter((r) => r.reason);
	if (reasonsWithText.length > 0) {
		sections.push('');
		for (const rec of reasonsWithText) {
			const reasonLine = colors
				? chalk.gray(`Reason: ${rec.table} - ${rec.reason}`)
				: `Reason: ${rec.table} - ${rec.reason}`;
			sections.push(reasonLine);
		}
	}

	return sections.join('\n');
}

/**
 * Columns Command
 * Discover columns for tables in a schema
 */
async function columnsCommand(
	connectorId: string,
	options: {
		schema: string;
		catalog?: string;
		tables?: string;
		interactive?: boolean;
		output?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: SqlClient = opts._clients.sql;

	let spinner: Ora | undefined;

	try {
		// Parse connector ID
		const connectorIdNum = parseInt(connectorId);
		if (isNaN(connectorIdNum) || connectorIdNum <= 0) {
			throw new Error('Connector ID must be a positive number');
		}

		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const outputFormat = options.output || cliFormat || config.output.format || 'table';
		const format = outputFormat as 'table' | 'json' | 'csv';

		// Get table list (validates --tables vs --interactive)
		const tableList = await getTableList(
			options,
			client,
			connectorIdNum,
			options.schema,
			options.catalog
		);

		// Start spinner (only for table format)
		if (format === 'table') {
			spinner = startSpinner(
				`Fetching columns for ${tableList.length} table${tableList.length === 1 ? '' : 's'}...`
			);
		}

		// Fetch columns
		const columnsByTable = await client.getColumnsBatch(
			connectorIdNum,
			tableList,
			options.schema,
			options.catalog
		);

		// Succeed spinner
		if (spinner) {
			const totalColumns = Object.values(columnsByTable).reduce(
				(sum, cols) => sum + cols.length,
				0
			);
			succeedSpinner(spinner, `Found ${totalColumns} columns across ${tableList.length} tables`);
		}

		// Format and display output
		const output = formatColumnsOutput(columnsByTable, format, config.output.colors);
		console.log('\n' + output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch columns');
		}

		// Handle specific error cases
		if (error instanceof Error) {
			if (error.message.includes('Cannot use --tables and --interactive')) {
				console.error('✖ Cannot use --tables and --interactive together');
				console.error('  Use either --tables "table1,table2" OR --interactive (not both)');
			} else if (error.message.includes('Must provide either --tables or --interactive')) {
				console.error('✖ Must provide either --tables or --interactive');
				console.error('  Use --tables "table1,table2" OR --interactive');
			} else if (error instanceof ApiError) {
				if (error.statusCode === 404) {
					console.error(`✖ Connector or schema not found (${error.statusCode})`);
					console.error(`  Connector ID: ${connectorId}`);
					console.error(`  Schema: ${options.schema}`);
					if (options.catalog) {
						console.error(`  Catalog: ${options.catalog}`);
					}
				} else if (error.statusCode === 403) {
					console.error(`✖ Access denied (${error.statusCode})`);
					console.error(`  Connector ID: ${connectorId}`);
				} else {
					logError('Error fetching columns', error);
				}
			} else {
				logError('Error fetching columns', error);
			}
		} else {
			logError('Error fetching columns');
		}

		throw error;
	}
}

/**
 * Ingestion Types Command
 * Get AI recommendations for table ingestion types
 */
async function ingestionTypesCommand(
	connectorId: string,
	options: {
		schema: string;
		catalog?: string;
		tables?: string;
		interactive?: boolean;
		output?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: SqlClient = opts._clients.sql;

	let spinner: Ora | undefined;

	try {
		// Parse connector ID
		const connectorIdNum = parseInt(connectorId);
		if (isNaN(connectorIdNum) || connectorIdNum <= 0) {
			throw new Error('Connector ID must be a positive number');
		}

		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const outputFormat = options.output || cliFormat || config.output.format || 'table';
		const format = outputFormat as 'table' | 'json' | 'csv';

		// Get table list (validates --tables vs --interactive)
		const tableList = await getTableList(
			options,
			client,
			connectorIdNum,
			options.schema,
			options.catalog
		);

		// Start spinner (only for table format)
		if (format === 'table') {
			spinner = startSpinner(
				`Analyzing ${tableList.length} table${tableList.length === 1 ? '' : 's'} for ingestion recommendations...`
			);
		}

		// Fetch recommendations
		const recommendations = await client.getIngestionRecommendations(
			connectorIdNum,
			tableList,
			options.schema,
			options.catalog
		);

		// Succeed spinner
		if (spinner) {
			succeedSpinner(
				spinner,
				`Generated ${recommendations.length} recommendation${recommendations.length === 1 ? '' : 's'}`
			);
		}

		// Format and display output
		const output = formatRecommendationsOutput(recommendations, format, config.output.colors);
		console.log('\n' + output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to get ingestion recommendations');
		}

		// Handle specific error cases
		if (error instanceof Error) {
			if (error.message.includes('Cannot use --tables and --interactive')) {
				console.error('✖ Cannot use --tables and --interactive together');
				console.error('  Use either --tables "table1,table2" OR --interactive (not both)');
			} else if (error.message.includes('Must provide either --tables or --interactive')) {
				console.error('✖ Must provide either --tables or --interactive');
				console.error('  Use --tables "table1,table2" OR --interactive');
			} else if (error instanceof ApiError) {
				if (error.statusCode === 404) {
					console.error(`✖ Connector or schema not found (${error.statusCode})`);
					console.error(`  Connector ID: ${connectorId}`);
					console.error(`  Schema: ${options.schema}`);
					if (options.catalog) {
						console.error(`  Catalog: ${options.catalog}`);
					}
				} else if (error.statusCode === 403) {
					console.error(`✖ Access denied (${error.statusCode})`);
					console.error(`  Connector ID: ${connectorId}`);
				} else {
					logError('Error getting ingestion recommendations', error);
				}
			} else {
				logError('Error getting ingestion recommendations', error);
			}
		} else {
			logError('Error getting ingestion recommendations');
		}

		throw error;
	}
}

/**
 * Execute Command
 * Execute a SQL query
 */
async function execCommand(
	connectorId: string,
	query: string | undefined,
	options: {
		file?: string;
		limit?: number;
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: SqlClient = opts._clients.sql;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Get query from file or argument
		let sqlQuery: string;
		if (options.file) {
			// Read from file
			logInfo(`Executing query from file: ${options.file}`);
			sqlQuery = readQueryFromFile(options.file);
		} else if (query) {
			// Use provided query
			sqlQuery = query.trim();
		} else {
			// No query provided
			throw new Error('No query provided. Use [query] argument or --file option.');
		}

		// Apply limit if specified
		if (options.limit && !sqlQuery.toLowerCase().includes('limit')) {
			sqlQuery = `${sqlQuery.replace(/;?\s*$/, '')} LIMIT ${options.limit}`;
		}

		// Start spinner and timer (only for table format)
		const startTime = startTimer();
		if (format === 'table') {
			spinner = startSpinner('Executing query...');
		}

		// Execute query
		const result = await client.executeQuery(connectorId, sqlQuery);

		// Calculate duration
		const duration = formatDuration(startTime);

		// Handle query errors
		if (!result.success) {
			if (spinner) {
				failSpinner(spinner, 'Query failed');
			}
			console.error(`  Error: ${result.error || 'Unknown error'}`);
			console.error(`  Query: ${sqlQuery.substring(0, 100)}${sqlQuery.length > 100 ? '...' : ''}`);
			throw new Error(result.error || 'Query execution failed');
		}

		// Succeed spinner with duration
		if (spinner) {
			succeedSpinner(spinner, `Query completed in ${duration}`);
		}

		// Format and display results
		if (result.rows && result.rows.length > 0) {
			// Parse fields option
			const fields = parseFields(options.fields);

			// Format output
			const output = formatQueryResult(result, format, config.output.colors);
			console.log('\n' + output);

			// Show row count
			console.log('');
			logInfo(`Rows returned: ${result.rows.length}`);
		} else {
			logInfo('Query completed successfully (no rows returned)');
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Query failed');
		}

		// Handle specific error cases
		if (error instanceof FileSystemError) {
			console.error(`✖ Query file not found`);
			console.error(`  File: ${error.path}`);
			console.error(`  Suggestion: Check that the file path is correct`);
		} else if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				console.error(`✖ Connector not found (${error.statusCode})`);
				console.error(`  Connector ID: ${connectorId}`);
				console.error(
					`  Suggestion: Run 'databasin connectors list --full' to see available connectors`
				);
			} else if (error.statusCode === 403) {
				console.error(`✖ Access denied (${error.statusCode})`);
				console.error(`  Connector ID: ${connectorId}`);
				console.error(`  Suggestion: You don't have permission to query this connector`);
			} else if (error.statusCode === 400) {
				console.error(`✖ Query failed`);
				console.error(`  Error: You have an error in your SQL syntax`);
				console.error(`  Suggestion: Check your SQL syntax`);
			} else {
				logError('Query execution failed', error);
			}
		} else {
			logError('Query execution failed', error instanceof Error ? error : undefined);
		}

		throw error;
	}
}

/**
 * Database structure for discover output
 */
interface DatabaseStructure {
	catalogs: Array<{
		name: string;
		schemas: Array<{
			name: string;
			tables: Array<{
				name: string;
				metadata?: {
					rowCount: number | null;
					columns: number | null;
				};
			}>;
		}>;
	}>;
}

/**
 * Discover database structure
 *
 * Recursively fetches catalogs, schemas, and tables with optional filtering.
 *
 * @param client - SQL client instance
 * @param connectorId - Connector ID
 * @param options - Discovery options
 * @returns Database structure
 */
async function discoverDatabaseStructure(
	client: SqlClient,
	connectorId: string,
	options: {
		catalog?: string;
		schema?: string;
		tablePattern?: string;
		maxDepth?: string;
		metadata?: boolean;
	}
): Promise<DatabaseStructure> {
	const maxDepth = parseInt(options.maxDepth || '3', 10);
	const result: DatabaseStructure = { catalogs: [] };

	// 1. Fetch catalogs
	const catalogsResponse = await client.getCatalogs(connectorId);
	const catalogsList = catalogsResponse.objects || [];
	const catalogs = Array.isArray(catalogsList) ? catalogsList : [catalogsList];

	for (const catalogItem of catalogs) {
		const catalogName = typeof catalogItem === 'string' ? catalogItem : (catalogItem as any).name;

		// Apply catalog filter
		if (options.catalog && catalogName !== options.catalog) continue;

		const catalogNode: DatabaseStructure['catalogs'][0] = {
			name: catalogName,
			schemas: []
		};

		if (maxDepth >= 2) {
			// 2. Fetch schemas
			const schemasResponse = await client.getSchemas(connectorId, catalogName);
			const schemasList = schemasResponse.objects || [];
			const schemas = Array.isArray(schemasList) ? schemasList : [schemasList];

			for (const schemaItem of schemas) {
				const schemaName = typeof schemaItem === 'string' ? schemaItem : (schemaItem as any).name;

				// Apply schema filter
				if (options.schema && schemaName !== options.schema) continue;

				const schemaNode: DatabaseStructure['catalogs'][0]['schemas'][0] = {
					name: schemaName,
					tables: []
				};

				if (maxDepth >= 3) {
					// 3. Fetch tables
					const tablesList = await client.listTables(connectorId, catalogName, schemaName);
					const tables = Array.isArray(tablesList) ? tablesList : [tablesList];

					for (const tableItem of tables) {
						const tableName = typeof tableItem === 'string' ? tableItem : (tableItem as any).name;

						// Apply table pattern filter
						if (options.tablePattern) {
							const regex = new RegExp(options.tablePattern, 'i');
							if (!regex.test(tableName)) continue;
						}

						const tableNode: DatabaseStructure['catalogs'][0]['schemas'][0]['tables'][0] = {
							name: tableName
						};

						// Optionally fetch metadata
						if (options.metadata) {
							// TODO: Add metadata fetching if API supports it
							tableNode.metadata = { rowCount: null, columns: null };
						}

						schemaNode.tables.push(tableNode);
					}
				}

				if (schemaNode.tables.length > 0 || maxDepth < 3) {
					catalogNode.schemas.push(schemaNode);
				}
			}
		}

		if (catalogNode.schemas.length > 0 || maxDepth < 2) {
			result.catalogs.push(catalogNode);
		}
	}

	return result;
}

/**
 * Discover Command
 * Discovers and displays database structure (catalogs, schemas, tables)
 */
async function discoverCommand(
	connectorId: string | undefined,
	options: {
		catalog?: string;
		schema?: string;
		tablePattern?: string;
		maxDepth?: string;
		metadata?: boolean;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: SqlClient = opts._clients.sql;

	// Get connector from arg or context
	if (!connectorId) {
		const context = loadContext();
		connectorId = context.connector;
	}

	if (!connectorId) {
		throw new MissingArgumentError('connectorId', 'sql discover', undefined, [
			'databasin sql discover 5459',
			'databasin set connector 5459 && databasin sql discover'
		]);
	}

	const spinner = startSpinner('Discovering database structure...');

	try {
		// Fetch hierarchy
		const structure = await discoverDatabaseStructure(client, connectorId, options);

		succeedSpinner(spinner, 'Discovery complete');

		// Output format
		const format = detectFormat(config.output.format);

		if (format === 'json') {
			console.log(formatOutput(structure, format));
		} else {
			// Tree-like output for table format
			console.log(chalk.bold('\nDatabase Structure:\n'));

			for (const catalog of structure.catalogs) {
				console.log(chalk.cyan(`📁 ${catalog.name}`));

				for (const schema of catalog.schemas) {
					console.log(`  ${chalk.yellow(`📁 ${schema.name}`)}`);

					for (const table of schema.tables) {
						console.log(`    ${chalk.green(`📄 ${table.name}`)}`);
						if (table.metadata) {
							if (table.metadata.rowCount !== null) {
								console.log(`      ${chalk.dim(`Rows: ${table.metadata.rowCount}`)}`);
							}
							if (table.metadata.columns !== null) {
								console.log(`      ${chalk.dim(`Columns: ${table.metadata.columns}`)}`);
							}
						}
					}

					if (schema.tables.length === 0) {
						console.log(`    ${chalk.dim('(no tables)')}`);
					}
				}

				if (catalog.schemas.length === 0) {
					console.log(`  ${chalk.dim('(no schemas)')}`);
				}
			}

			if (structure.catalogs.length === 0) {
				console.log(chalk.yellow('No catalogs found'));
			}
		}
	} catch (error) {
		failSpinner(spinner, 'Discovery failed');
		throw error;
	}
}

/**
 * Create SQL command with all subcommands
 *
 * @returns Configured SQL command
 */
export function createSqlCommand(): Command {
	const sql = new Command('sql').description('Execute SQL queries and explore schemas');

	// Catalogs command
	sql
		.command('catalogs')
		.description('List catalogs for a connector')
		.argument('[connector-id]', 'Connector ID (or use context via "databasin set connector <id>")')
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(catalogsCommand);

	// Schemas command
	sql
		.command('schemas')
		.description('List schemas in a catalog')
		.argument('[connector-id]', 'Connector ID (or use context via "databasin set connector <id>")')
		.requiredOption('-c, --catalog <name>', 'Catalog name')
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(schemasCommand);

	// Tables command
	sql
		.command('tables')
		.description('List tables in a schema')
		.argument('[connector-id]', 'Connector ID (or use context via "databasin set connector <id>")')
		.requiredOption('-c, --catalog <name>', 'Catalog name')
		.requiredOption('-s, --schema <name>', 'Schema name')
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(tablesCommand);

	// Execute command
	sql
		.command('exec')
		.alias('execute')
		.description('Execute a SQL query')
		.argument('<connector-id>', 'Connector ID')
		.argument('[query]', 'SQL query to execute')
		.option('-f, --file <path>', 'Read query from file')
		.option('--limit <number>', 'Limit number of rows returned', parseInt)
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(execCommand);

	// Columns command
	sql
		.command('columns')
		.description('Discover columns for tables in a schema')
		.argument('<connector-id>', 'Connector ID')
		.requiredOption('--schema <schema>', 'Schema name')
		.option('--catalog <catalog>', 'Catalog name (for lakehouse connectors)')
		.option('--tables <tables>', 'Comma-separated table names')
		.option('--interactive', 'Interactively select tables')
		.option('-o, --output <format>', 'Output format (table|json|csv)', 'table')
		.action(columnsCommand);

	// Ingestion Types command
	sql
		.command('ingestion-types')
		.description('Get AI recommendations for table ingestion types')
		.argument('<connector-id>', 'Connector ID')
		.requiredOption('--schema <schema>', 'Schema name')
		.option('--catalog <catalog>', 'Catalog name (for lakehouse connectors)')
		.option('--tables <tables>', 'Comma-separated table names')
		.option('--interactive', 'Interactively select tables')
		.option('-o, --output <format>', 'Output format (table|json|csv)', 'table')
		.action(ingestionTypesCommand);

	// Discover command (Phase 2B)
	sql
		.command('discover [connector-id]')
		.description('Discover database structure (catalogs, schemas, tables)')
		.option('--catalog <catalog>', 'Filter to specific catalog')
		.option('--schema <schema>', 'Filter to specific schema')
		.option('--table-pattern <pattern>', 'Filter tables by pattern (regex)')
		.option('--max-depth <depth>', 'Maximum depth (1=catalogs, 2=schemas, 3=tables)', '3')
		.option('--metadata', 'Include table metadata (row counts, columns)')
		.action(discoverCommand);

	return sql;
}
