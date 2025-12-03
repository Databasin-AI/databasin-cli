/**
 * Connectors Command Implementation
 *
 * Provides CLI commands for managing DataBasin data connectors:
 * - list: List connectors (count mode by default for token efficiency)
 * - get: Get detailed connector information
 * - create: Create new connector from file or interactive wizard
 * - update: Update connector configuration
 * - delete: Delete connector with confirmation
 *
 * IMPORTANT TOKEN EFFICIENCY:
 * The connectors API can return 200K+ tokens without optimization.
 * The list command defaults to count mode to prevent massive responses.
 * Users must explicitly use --full flag to fetch complete connector objects.
 *
 * @module commands/connectors
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { ConnectorsClient } from '../client/connectors.ts';
import type { ProjectsClient } from '../client/projects.ts';
import type { CliConfig } from '../types/config.ts';
import type { Connector } from '../types/api.ts';
import {
	formatOutput,
	formatTable,
	formatJson,
	formatCsv,
	detectFormat
} from '../utils/formatters.ts';
import {
	startSpinner,
	succeedSpinner,
	failSpinner,
	warnTokenUsage,
	logError,
	logWarning,
	logSuccess,
	logInfo,
	type Ora
} from '../utils/progress.ts';
import { promptForProject, promptConfirm, promptInput, promptSelect } from '../utils/prompts.ts';
import { parseFields, readJsonFile, formatSingleObject } from '../utils/command-helpers.ts';
import { ApiError, ValidationError } from '../utils/errors.ts';

/**
 * Prompt user to select a connector from available connectors
 *
 * @param client - ConnectorsClient instance
 * @param projectId - Optional project ID filter
 * @param message - Prompt message
 * @returns Selected connector ID
 */
async function promptForConnector(
	client: ConnectorsClient,
	projectId?: string,
	message: string = 'Select a connector'
): Promise<string> {
	// Fetch available connectors (with limit for performance)
	const connectors = (await client.list(projectId, {
		count: false,
		fields: 'connectorID,connectorName,connectorType',
		limit: 100
	})) as Connector[];

	if (!Array.isArray(connectors) || connectors.length === 0) {
		throw new Error('No connectors available');
	}

	// Create choices array with formatted names
	const choices = connectors.map((connector) => ({
		title: `${connector.connectorName} (${connector.connectorType}) - ${connector.connectorID}`,
		value: connector.connectorID
	}));

	// Show interactive select prompt
	const connectorId = await promptSelect(message, choices);
	return connectorId;
}

/**
 * Interactive wizard for creating a connector
 *
 * @param client - ConnectorsClient instance
 * @param projectsClient - ProjectsClient instance
 * @param projectId - Optional project ID
 * @returns Connector data object
 */
async function interactiveCreateConnector(
	client: ConnectorsClient,
	projectsClient: ProjectsClient,
	projectId?: string
): Promise<Partial<Connector>> {
	console.log(chalk.cyan('\n📝 Interactive Connector Creation\n'));

	// 1. Prompt for project if not provided
	if (!projectId) {
		projectId = await promptForProject(projectsClient, 'Select project for connector');
	}

	// 2. Prompt for connector name
	const connectorName = await promptInput('Enter connector name', undefined, (val) => {
		if (val.length < 3) return 'Name must be at least 3 characters';
		return true;
	});

	// 3. Prompt for connector type
	const connectorType = await promptSelect<string>('Select connector type', [
		{ title: 'Database', value: 'database' },
		{ title: 'Application/API', value: 'app' },
		{ title: 'File & API', value: 'file & api' },
		{ title: 'Cloud Storage', value: 'cloud' }
	]);

	// 4. Prompt for basic configuration
	console.log(chalk.gray('\nEnter connection details (press Enter to skip optional fields):'));

	const configuration: Record<string, any> = {};

	// Common fields based on connector type
	if (connectorType === 'database') {
		configuration.host = await promptInput('Host', 'localhost');
		configuration.port = await promptInput('Port', '5432');
		configuration.database = await promptInput('Database name');
		configuration.username = await promptInput('Username');

		const includePassword = await promptConfirm('Include password in configuration?', false);
		if (includePassword) {
			configuration.password = await promptInput('Password');
		}
	} else if (connectorType === 'app' || connectorType === 'file & api') {
		configuration.baseUrl = await promptInput('API Base URL');
		const requiresAuth = await promptConfirm('Requires authentication?', true);
		if (requiresAuth) {
			configuration.authType = await promptSelect('Authentication type', [
				'oauth2',
				'apikey',
				'basic'
			]);
		}
	}

	return {
		connectorName,
		connectorType,
		internalID: projectId,
		configuration,
		status: 'active'
	};
}

/**
 * Interactive wizard for updating a connector
 *
 * @param client - ConnectorsClient instance
 * @param connectorId - Connector ID to update
 * @returns Updated connector data
 */
async function interactiveUpdateConnector(
	client: ConnectorsClient,
	connectorId: string
): Promise<Partial<Connector>> {
	console.log(chalk.cyan('\n📝 Interactive Connector Update\n'));

	// Fetch current connector
	const spinner = startSpinner('Fetching current connector...');
	const current = await client.getById(connectorId);
	succeedSpinner(spinner, 'Connector loaded');

	console.log(chalk.gray('\nCurrent configuration:'));
	console.log(chalk.gray(`  Name: ${current.connectorName}`));
	console.log(chalk.gray(`  Type: ${current.connectorType}`));
	console.log(chalk.gray(`  Status: ${current.status}`));

	const updates: Partial<Connector> = {};

	// Prompt for name update
	const updateName = await promptConfirm('\nUpdate connector name?', false);
	if (updateName) {
		updates.connectorName = await promptInput('Enter new name', current.connectorName, (val) => {
			if (val.length < 3) return 'Name must be at least 3 characters';
			return true;
		});
	}

	// Prompt for status update
	const updateStatus = await promptConfirm('Update status?', false);
	if (updateStatus) {
		updates.status = (await promptSelect('Select new status', [
			'active',
			'inactive',
			'error',
			'pending'
		])) as any;
	}

	// Prompt for configuration update
	const updateConfig = await promptConfirm('Update configuration?', false);
	if (updateConfig) {
		console.log(chalk.yellow('\n⚠ Configuration update requires manual editing or JSON file.'));
		console.log(chalk.gray('Current configuration:'));
		console.log(chalk.gray(JSON.stringify(current.configuration, null, 2)));

		const configInput = await promptInput(
			'\nEnter new configuration as JSON (or press Enter to keep current)'
		);
		if (configInput) {
			try {
				updates.configuration = JSON.parse(configInput);
			} catch (error) {
				throw new Error('Invalid JSON for configuration');
			}
		}
	}

	if (Object.keys(updates).length === 0) {
		throw new Error('No updates specified');
	}

	return updates;
}

/**
 * List Command
 * Lists connectors with count mode by default for token efficiency
 */
async function listCommand(
	options: {
		project?: string;
		full?: boolean;
		fields?: string;
		limit?: number;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: ConnectorsClient = opts._clients.connectors;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Build request options
		const requestOptions: any = {};

		// CRITICAL: Default to count mode unless --full specified
		if (options.full) {
			requestOptions.count = false;
			if (options.fields) {
				requestOptions.fields = options.fields;
			}
			if (options.limit) {
				requestOptions.limit = options.limit;
			}
		} else {
			requestOptions.count = true;
		}

		// Start spinner
		const spinnerMessage = requestOptions.count
			? 'Fetching connector count...'
			: 'Fetching connectors...';
		if (format === 'table') {
			spinner = startSpinner(spinnerMessage);
		}

		// Fetch connectors
		const result = await client.list(options.project, requestOptions);

		// Handle count mode
		if (typeof result === 'object' && 'count' in result) {
			if (spinner) {
				succeedSpinner(spinner, `Total connectors: ${result.count}`);
			} else {
				console.log(result.count);
			}

			// Show helpful message about --full flag
			if (format === 'table') {
				console.log();
				logWarning('Use --full to fetch full connector objects');
				if (options.project) {
					logInfo(`Filtered by project: ${options.project}`);
				}
			}
			return;
		}

		// Handle array results
		const connectors = Array.isArray(result) ? result : [];

		// Succeed spinner with count
		if (spinner) {
			if (connectors.length === 0) {
				succeedSpinner(spinner, 'No connectors found');
				return;
			}
			succeedSpinner(
				spinner,
				`Fetched ${connectors.length} connector${connectors.length === 1 ? '' : 's'}`
			);
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(connectors, format, {
			fields,
			colors: config.output.colors
		});

		console.log();
		console.log(output);

		// Token efficiency warning for large responses
		const outputSize = output.length;
		if (outputSize > config.tokenEfficiency.warnThreshold) {
			warnTokenUsage(outputSize, config.tokenEfficiency.warnThreshold, [
				'Use count mode (default) to get count only',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results',
				'Use --project to filter by project'
			]);
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch connectors');
		}
		logError('Error fetching connectors', error instanceof Error ? error : undefined);
		throw error;
	}
}

/**
 * Get Command
 * Get detailed information about a specific connector
 */
async function getCommand(
	id: string | undefined,
	options: {
		fields?: string;
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: ConnectorsClient = opts._clients.connectors;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Prompt for connector ID if not provided
		let connectorId = id;
		if (!connectorId) {
			connectorId = await promptForConnector(client, options.project, 'Select a connector');
		}

		// Start spinner
		if (format === 'table') {
			spinner = startSpinner('Fetching connector details...');
		}

		// Fetch connector details
		const connector = await client.getById(connectorId);

		// Succeed spinner
		if (spinner) {
			succeedSpinner(spinner, 'Connector retrieved');
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output based on format
		let output: string;
		if (format === 'json') {
			// For JSON, filter fields if specified
			const filteredConnector = fields
				? Object.fromEntries(Object.entries(connector).filter(([key]) => fields.includes(key)))
				: connector;
			output = formatJson(filteredConnector, { colors: config.output.colors });
		} else if (format === 'csv') {
			// For CSV, use array format
			output = formatCsv([connector], { fields, colors: config.output.colors });
		} else {
			// For table, use transposed key-value format
			output = formatSingleObject(connector, fields);
		}

		console.log();
		console.log(output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch connector');
		}

		// Provide helpful error messages
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Connector not found (404)');
				console.error(chalk.gray(`  Connector ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin connectors list --full' to see available connectors`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Connector ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to access this connector`)
				);
			} else {
				logError('Error fetching connector', error);
			}
		} else if (error instanceof Error) {
			logError('Error fetching connector', error);
		}

		throw error;
	}
}

/**
 * Create Command
 * Create new connector from file or interactive wizard
 */
async function createCommand(
	file: string | undefined,
	options: {
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const client: ConnectorsClient = opts._clients.connectors;
	const projectsClient: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		let connectorData: Partial<Connector>;

		if (file) {
			// Read connector data from file
			logInfo(`Reading connector configuration from: ${file}`);
			connectorData = readJsonFile(file);

			// Override project ID if specified via flag
			if (options.project) {
				connectorData.internalID = options.project;
			}

			// Validate required fields
			if (!connectorData.connectorName) {
				throw new Error('Missing required field: connectorName');
			}
			if (!connectorData.connectorType) {
				throw new Error('Missing required field: connectorType');
			}
		} else {
			// Interactive mode
			connectorData = await interactiveCreateConnector(client, projectsClient, options.project);
		}

		// Confirm creation
		console.log(chalk.cyan('\n📋 Connector Configuration:'));
		console.log(chalk.gray(`  Name: ${connectorData.connectorName}`));
		console.log(chalk.gray(`  Type: ${connectorData.connectorType}`));
		console.log(chalk.gray(`  Project: ${connectorData.internalID}`));
		console.log();

		const confirmed = await promptConfirm('Create this connector?', true);
		if (!confirmed) {
			logWarning('Connector creation cancelled');
			return;
		}

		// Create connector
		spinner = startSpinner('Creating connector...');
		const created = await client.create(connectorData);
		succeedSpinner(spinner, 'Connector created successfully');

		// Display created connector info
		console.log();
		logSuccess('Connector Details:');
		console.log(chalk.gray(`  ID: ${created.connectorID}`));
		console.log(chalk.gray(`  Name: ${created.connectorName}`));
		console.log(chalk.gray(`  Type: ${created.connectorType}`));
		console.log(chalk.gray(`  Status: ${created.status}`));
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to create connector');
		}

		if (error instanceof Error) {
			if (error.message.includes('validation')) {
				logError('Invalid connector configuration');
				console.error(chalk.gray(`  Error: ${error.message}`));
				console.error(chalk.gray(`  Suggestion: Check the connector configuration schema`));
			} else {
				logError('Error creating connector', error);
			}
		}

		throw error;
	}
}

/**
 * Update Command
 * Update connector configuration
 */
async function updateCommand(
	id: string,
	file: string | undefined,
	options: {
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const client: ConnectorsClient = opts._clients.connectors;

	let spinner: Ora | undefined;

	try {
		let updateData: Partial<Connector>;

		if (file) {
			// Read update data from file
			logInfo(`Reading update configuration from: ${file}`);
			updateData = readJsonFile(file);
		} else {
			// Interactive mode
			updateData = await interactiveUpdateConnector(client, id);
		}

		// Show what will be updated
		console.log(chalk.cyan('\n📋 Fields to Update:'));
		Object.entries(updateData).forEach(([key, value]) => {
			const displayValue =
				typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
			console.log(chalk.gray(`  ${key}: ${displayValue}`));
		});
		console.log();

		const confirmed = await promptConfirm('Apply these updates?', true);
		if (!confirmed) {
			logWarning('Update cancelled');
			return;
		}

		// Update connector
		spinner = startSpinner('Updating connector...');
		const updated = await client.update(id, updateData);
		succeedSpinner(spinner, 'Connector updated successfully');

		// Display updated connector info
		console.log();
		logSuccess('Updated Connector:');
		console.log(chalk.gray(`  ID: ${updated.connectorID}`));
		console.log(chalk.gray(`  Name: ${updated.connectorName}`));
		console.log(chalk.gray(`  Status: ${updated.status}`));
		console.log(chalk.gray(`  Updated Fields: ${Object.keys(updateData).join(', ')}`));
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to update connector');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Connector not found (404)');
				console.error(chalk.gray(`  Connector ID: ${id}`));
			} else if (error.statusCode === 400) {
				logError('Invalid update configuration (400)');
				console.error(chalk.gray(`  Suggestion: Check the connector configuration schema`));
				if (error.responseBody) {
					console.error(chalk.gray(`  Details: ${JSON.stringify(error.responseBody, null, 2)}`));
				}
			} else {
				logError('Error updating connector', error);
			}
		} else if (error instanceof ValidationError) {
			logError('Validation failed', error);
		} else if (error instanceof Error) {
			logError('Error updating connector', error);
		}

		throw error;
	}
}

/**
 * Delete Command
 * Delete connector with confirmation
 */
async function deleteCommand(
	id: string,
	options: {
		yes?: boolean;
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const client: ConnectorsClient = opts._clients.connectors;

	let spinner: Ora | undefined;

	try {
		// Fetch connector details for confirmation
		spinner = startSpinner('Fetching connector details...');
		const connector = await client.getById(id);
		succeedSpinner(spinner, `Connector: ${connector.connectorName} (${connector.connectorID})`);

		console.log();
		console.log(chalk.red('⚠ WARNING: This action cannot be undone!'));
		console.log(chalk.gray(`  Connector: ${connector.connectorName}`));
		console.log(chalk.gray(`  Type: ${connector.connectorType}`));
		console.log(chalk.gray(`  ID: ${connector.connectorID}`));
		console.log();

		// Confirm deletion (unless --yes flag)
		if (!options.yes) {
			const confirmed = await promptConfirm(
				'Are you sure you want to delete this connector?',
				false
			);
			if (!confirmed) {
				logWarning('Deletion cancelled');
				return;
			}
		}

		// Delete connector
		spinner = startSpinner('Deleting connector...');
		await client.deleteById(id);
		succeedSpinner(spinner, 'Connector deleted successfully');

		console.log();
		logSuccess(`Deleted connector: ${connector.connectorName}`);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to delete connector');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Connector not found (404)');
				console.error(chalk.gray(`  Connector ID: ${id}`));
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Connector ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to delete this connector`)
				);
			} else {
				logError('Error deleting connector', error);
			}
		} else if (error instanceof Error) {
			logError('Error deleting connector', error);
		}

		throw error;
	}
}

/**
 * Test Command
 * Test connector connection
 */
async function testCommand(
	id: string | undefined,
	options: {
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const client: ConnectorsClient = opts._clients.connectors;

	let spinner: Ora | undefined;

	try {
		// Prompt for connector ID if not provided
		let connectorId = id;
		if (!connectorId) {
			connectorId = await promptForConnector(client, options.project, 'Select connector to test');
		}

		// Start testing
		spinner = startSpinner('Testing connector connection...');
		const result = await client.test(connectorId);

		// Handle test result
		if (result.success) {
			succeedSpinner(spinner, 'Connection test succeeded');
			console.log();
			logSuccess(result.message);

			// Show additional details if present
			if (result.details && Object.keys(result.details).length > 0) {
				console.log();
				console.log(chalk.cyan('Connection Details:'));
				Object.entries(result.details).forEach(([key, value]) => {
					const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
					console.log(chalk.gray(`  ${key}: ${displayValue}`));
				});
			}
		} else {
			failSpinner(spinner, 'Connection test failed');
			console.log();
			logError(result.message);

			// Show error details if present
			if (result.details && Object.keys(result.details).length > 0) {
				console.log();
				console.log(chalk.red('Error Details:'));
				Object.entries(result.details).forEach(([key, value]) => {
					const displayValue =
						typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
					console.log(chalk.gray(`  ${key}: ${displayValue}`));
				});
			}

			// Throw error to set non-zero exit code
			throw new Error('Connector test failed');
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to test connector');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Connector not found (404)');
				console.error(chalk.gray(`  Connector ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin connectors list --full' to see available connectors`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Connector ID: ${id}`));
				console.error(chalk.gray(`  Suggestion: You don't have permission to test this connector`));
			} else {
				logError('Error testing connector', error);
			}
		} else if (error instanceof Error) {
			if (error.message !== 'Connector test failed') {
				// Don't log the error twice if it's the test failure we already showed
				logError('Error testing connector', error);
			}
		}

		throw error;
	}
}

/**
 * Create connectors command with all subcommands
 *
 * @returns Configured Commander Command instance
 */
export function createConnectorsCommand(): Command {
	const connectors = new Command('connectors').description('Manage data connectors');

	// List command
	connectors
		.command('list')
		.description('List connectors (count mode by default for efficiency)')
		.option('-p, --project <id>', 'Filter by project ID')
		.option('--full', 'Fetch full connector objects (may return large response)')
		.option('--fields <fields>', 'Comma-separated list of fields (only with --full)')
		.option('--limit <number>', 'Limit number of results (only with --full)', parseInt)
		.action(listCommand);

	// Get command
	connectors
		.command('get')
		.description('Get connector details')
		.argument('[id]', 'Connector ID (will prompt if not provided)')
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.option('-p, --project <id>', 'Filter connector list by project (for interactive prompt)')
		.action(getCommand);

	// Create command
	connectors
		.command('create')
		.description('Create a new connector')
		.argument('[file]', 'JSON file with connector configuration (interactive if not provided)')
		.option('-p, --project <id>', 'Project ID for the connector')
		.action(createCommand);

	// Update command
	connectors
		.command('update')
		.description('Update connector configuration')
		.argument('<id>', 'Connector ID')
		.argument('[file]', 'JSON file with updated configuration (interactive if not provided)')
		.option('-p, --project <id>', 'Project ID (for filtering in interactive mode)')
		.action(updateCommand);

	// Delete command
	connectors
		.command('delete')
		.description('Delete a connector')
		.argument('<id>', 'Connector ID')
		.option('-y, --yes', 'Skip confirmation prompt')
		.option('-p, --project <id>', 'Project ID (not used, for consistency)')
		.action(deleteCommand);

	// Test command
	connectors
		.command('test')
		.description('Test connector connection')
		.argument('[id]', 'Connector ID (will prompt if not provided)')
		.option('-p, --project <id>', 'Filter connector list by project (for interactive prompt)')
		.action(testCommand);

	return connectors;
}
