/**
 * Automations Command Implementation
 *
 * Provides CLI commands for managing Databasin automations:
 * - list: List automations (with required project filtering)
 * - get: Get detailed automation information
 * - run: Execute an automation immediately
 *
 * IMPORTANT: The list endpoint requires a project ID.
 * If not provided, the client will throw a ValidationError.
 *
 * @module commands/automations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { AutomationsClient } from '../client/automations.ts';
import type { ProjectsClient } from '../client/projects.ts';
import type { CliConfig } from '../types/config.ts';
import type { Automation, AutomationLogEntry, AutomationTaskLogEntry } from '../types/api.ts';
import {
	formatOutput,
	formatTable,
	formatJson,
	formatCsv,
	detectFormat,
	type FormatOptions
} from '../utils/formatters.ts';
import {
	startSpinner,
	succeedSpinner,
	failSpinner,
	logInfo,
	logWarning,
	logSuccess,
	warnTokenUsage,
	logError,
	type Ora
} from '../utils/progress.ts';
import { promptForProject, promptConfirm, promptInput, promptSelect } from '../utils/prompts.ts';
import { parseFields, readJsonFile, formatSingleObject } from '../utils/command-helpers.ts';
import { ApiError, ValidationError } from '../utils/errors.ts';
import { resolveProjectId } from '../utils/project-id-mapper.ts';

/**
 * Format cron schedule for human-readable display
 *
 * @param cronSchedule - Cron expression (e.g., "0 2 * * *")
 * @returns Human-readable schedule description
 */
function formatSchedule(cronSchedule?: string): string {
	if (!cronSchedule) return '-';

	// Common cron patterns
	const patterns: Record<string, string> = {
		'0 * * * *': 'Every hour',
		'0 0 * * *': 'Daily at midnight',
		'0 2 * * *': 'Daily at 2 AM',
		'0 0 * * 0': 'Weekly on Sunday',
		'0 0 * * 1': 'Weekly on Monday',
		'0 0 1 * *': 'Monthly on the 1st',
		'*/5 * * * *': 'Every 5 minutes',
		'*/10 * * * *': 'Every 10 minutes',
		'*/15 * * * *': 'Every 15 minutes',
		'*/30 * * * *': 'Every 30 minutes'
	};

	return patterns[cronSchedule] || cronSchedule;
}

/**
 * List Command
 * Lists automations with required project filtering
 *
 * IMPORTANT: Client throws ValidationError if no project ID provided
 */
async function listCommand(
	options: {
		count?: boolean;
		limit?: number;
		fields?: string;
		project?: string;
		active?: boolean;
		running?: boolean;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const automationsClient: AutomationsClient = opts._clients.automations;
	const projectsClient: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Determine project ID
		let projectId = options.project;

		// If no project provided, prompt user to decide if they want to filter by project
		if (!projectId) {
			const useProject = await promptConfirm('Filter by project? (No = list all)', false);

			if (useProject) {
				try {
					projectId = await promptForProject(projectsClient, 'Select project');
				} catch (error) {
					// User cancelled selection
					if (error instanceof Error && error.message.includes('cancel')) {
						logInfo('Selection cancelled');
						return;
					}
					throw error;
				}
			}
		}

		// Resolve project ID if provided (map numeric ID to internal ID)
		if (projectId) {
			projectId = await resolveProjectId(projectId, projectsClient);
		}

		// Start spinner (only for table format)
		const spinnerMessage = options.count
			? 'Fetching automation count...'
			: 'Fetching automations...';
		if (format === 'table') {
			spinner = startSpinner(spinnerMessage);
		}

		// Build request options
		const requestOptions: any = {};
		if (options.count) {
			requestOptions.count = true;
		}
		if (options.limit) {
			requestOptions.limit = options.limit;
		}
		if (options.fields) {
			requestOptions.fields = options.fields;
		}
		if (options.active !== undefined) {
			requestOptions.active = options.active;
		}
		if (options.running !== undefined) {
			requestOptions.running = options.running;
		}

		// Fetch automations (throws ValidationError if projectId is undefined)
		const result = await automationsClient.list(projectId, requestOptions);

		// Handle count mode
		if (options.count && typeof result === 'object' && 'count' in result) {
			if (spinner) {
				succeedSpinner(spinner, `Automation count: ${result.count}`);
			} else {
				console.log(result.count);
			}
			return;
		}

		// Handle array results
		let automations = Array.isArray(result) ? result : [];

		// Succeed spinner with count
		if (spinner) {
			if (automations.length === 0) {
				succeedSpinner(spinner, 'No automations found');
				console.log('');
				logInfo(`No automations found${projectId ? ` in project ${projectId}` : ''}`);
				return;
			}
			succeedSpinner(
				spinner,
				`Fetched ${automations.length} automation${automations.length === 1 ? '' : 's'}`
			);
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(
			automations,
			format,
			{ fields, colors: config.output.colors },
			{ warnThreshold: config.tokenEfficiency.warnThreshold, enabled: true }
		);

		console.log('\n' + output);

		// Token efficiency warning (for large result sets without limit)
		if (!options.count && !options.limit && automations.length > 50) {
			warnTokenUsage(output.length, config.tokenEfficiency.warnThreshold, [
				'Use --count to get only the count',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results'
			]);
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch automations');
		}
		logError('Error fetching automations', error instanceof Error ? error : undefined);
		throw error;
	}
}

/**
 * Get Command
 * Get detailed information about a specific automation
 */
async function getCommand(
	id: string,
	options: {
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner
		if (format === 'table') {
			spinner = startSpinner('Fetching automation details...');
		}

		// Fetch automation details
		const automation = await automationsClient.getById(id);

		// Succeed spinner
		if (spinner) {
			succeedSpinner(spinner, 'Automation retrieved');
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output based on format
		let output: string;
		if (format === 'json') {
			// For JSON, filter fields if specified
			const filteredAutomation = fields
				? Object.fromEntries(Object.entries(automation).filter(([key]) => fields.includes(key)))
				: automation;
			output = formatJson(filteredAutomation, { colors: config.output.colors });
		} else if (format === 'csv') {
			// For CSV, use array format
			output = formatCsv([automation], { fields, colors: config.output.colors });
		} else {
			// For table, use transposed key-value format with enhanced display
			const displayData: Record<string, any> = { ...automation };

			// Enhance schedule display
			if (automation.jobRunSchedule) {
				displayData.schedule = `${automation.jobRunSchedule} (${formatSchedule(automation.jobRunSchedule)})`;
			}

			// Enhance status display
			if (automation.isActive !== undefined) {
				displayData.status = automation.isActive ? 'active' : 'inactive';
			}

			output = formatSingleObject(displayData, fields);
		}

		console.log('\n' + output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch automation');
		}

		// Provide helpful error messages
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation not found (404)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin automations list --project <id>' to see available automations`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to access this automation`)
				);
			} else {
				logError('Error fetching automation', error);
			}
		} else if (error instanceof Error) {
			logError('Error fetching automation', error);
		}

		throw error;
	}
}

/**
 * Run Command
 * Execute an automation immediately
 */
async function runCommand(id: string, options: {}, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		// Start spinner
		spinner = startSpinner('Starting automation execution...');

		// Execute automation
		const result = await automationsClient.run(id);

		// Succeed spinner
		succeedSpinner(spinner, 'Automation execution started');

		// Display execution details
		console.log(chalk.cyan(`  Execution ID: ${result.jobId || 'N/A'}`));
		console.log(chalk.cyan(`  Status: ${result.status || 'running'}`));

		if (result.message) {
			console.log(chalk.gray(`  Message: ${result.message}`));
		}

		console.log('');
		logInfo('Automation is running in the background');
		logInfo(`Check status with 'databasin automations get ${id}'`);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Automation execution failed');
		}

		// Provide helpful error messages
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation not found (404)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin automations list --project <id>' to see available automations`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(chalk.gray(`  Suggestion: You don't have permission to run this automation`));
			} else if (error.statusCode === 409) {
				logError('Automation is already running (409)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(chalk.gray(`  Suggestion: Wait for current execution to complete`));
			} else {
				logError('Error executing automation', error);
			}
		} else if (error instanceof Error) {
			if (error.message.toLowerCase().includes('already running')) {
				logError('Automation is already running');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(chalk.gray(`  Suggestion: Wait for current execution to complete`));
			} else {
				logError('Error executing automation', error);
			}
		}

		throw error;
	}
}

/**
 * Interactive wizard for creating an automation
 *
 * @param client - AutomationsClient instance
 * @param projectsClient - ProjectsClient instance
 * @param projectId - Optional project ID
 * @returns Automation data object
 */
async function interactiveCreateAutomation(
	client: AutomationsClient,
	projectsClient: ProjectsClient,
	projectId?: string
): Promise<Partial<Automation>> {
	console.log(chalk.cyan('\n📝 Interactive Automation Creation\n'));

	// 1. Prompt for project if not provided
	if (!projectId) {
		projectId = await promptForProject(projectsClient, 'Select project for automation');
	}

	// 2. Prompt for automation name
	const automationName = await promptInput('Enter automation name', undefined, (val) => {
		if (val.length < 3) return 'Name must be at least 3 characters';
		return true;
	});

	// 3. Prompt for schedule (cron expression)
	const jobRunSchedule = await promptInput(
		'Enter schedule (cron format, e.g., "0 2 * * *" for 2 AM daily)',
		'0 2 * * *',
		(val) => {
			if (!val) return 'Schedule is required';
			if (!/^[\d\*\,\-\/\s]+$/.test(val)) {
				return 'Invalid cron format (use digits, *, -, /, and spaces)';
			}
			return true;
		}
	);

	// 4. Prompt for active status
	const isActive = await promptConfirm('Enable automation immediately?', true);

	// 5. Prompt for pipeline ID (optional)
	const hasPipeline = await promptConfirm('Link to a pipeline?', false);
	let pipelineId: string | undefined;
	if (hasPipeline) {
		pipelineId = await promptInput('Enter pipeline ID');
	}

	// 6. Prompt for cluster size
	const jobClusterSize = await promptSelect<'s' | 'M' | 'L'>('Select cluster size', [
		{ title: 'Small (s)', value: 's' as 's' },
		{ title: 'Medium (M)', value: 'M' as 'M' },
		{ title: 'Large (L)', value: 'L' as 'L' }
	]);

	// 7. Prompt for timeout
	const jobTimeout = await promptInput('Enter job timeout (seconds)', '3600', (val) => {
		const num = parseInt(val);
		if (isNaN(num) || num <= 0) return 'Timeout must be a positive number';
		return true;
	});

	return {
		automationName,
		jobRunSchedule,
		isActive,
		internalID: projectId,
		pipelineId,
		jobClusterSize,
		jobTimeout,
		isPrivate: false
	};
}

/**
 * Interactive wizard for updating an automation
 *
 * @param client - AutomationsClient instance
 * @param automationId - Automation ID to update
 * @returns Updated automation data
 */
async function interactiveUpdateAutomation(
	client: AutomationsClient,
	automationId: string
): Promise<Partial<Automation>> {
	console.log(chalk.cyan('\n📝 Interactive Automation Update\n'));

	// Fetch current automation
	const spinner = startSpinner('Fetching current automation...');
	const current = await client.getById(automationId);
	succeedSpinner(spinner, 'Automation loaded');

	console.log(chalk.gray('\nCurrent configuration:'));
	console.log(chalk.gray(`  Name: ${current.automationName}`));
	console.log(
		chalk.gray(`  Schedule: ${current.jobRunSchedule} (${formatSchedule(current.jobRunSchedule)})`)
	);
	console.log(chalk.gray(`  Active: ${current.isActive}`));
	console.log(chalk.gray(`  Running: ${current.currentlyRunning || false}`));

	const updates: Partial<Automation> = {};

	// Prompt for name update
	const updateName = await promptConfirm('\nUpdate automation name?', false);
	if (updateName) {
		updates.automationName = await promptInput('Enter new name', current.automationName, (val) => {
			if (val.length < 3) return 'Name must be at least 3 characters';
			return true;
		});
	}

	// Prompt for schedule update
	const updateSchedule = await promptConfirm('Update schedule?', false);
	if (updateSchedule) {
		updates.jobRunSchedule = await promptInput(
			'Enter new schedule (cron format)',
			current.jobRunSchedule,
			(val) => {
				if (!val) return 'Schedule is required';
				if (!/^[\d\*\,\-\/\s]+$/.test(val)) {
					return 'Invalid cron format (use digits, *, -, /, and spaces)';
				}
				return true;
			}
		);
	}

	// Prompt for active status update
	const updateActive = await promptConfirm('Update active status?', false);
	if (updateActive) {
		updates.isActive = await promptConfirm('Enable automation?', current.isActive);
	}

	// Prompt for cluster size update
	const updateClusterSize = await promptConfirm('Update cluster size?', false);
	if (updateClusterSize) {
		updates.jobClusterSize = await promptSelect<'s' | 'M' | 'L'>('Select cluster size', [
			{ title: 'Small (s)', value: 's' as 's' },
			{ title: 'Medium (M)', value: 'M' as 'M' },
			{ title: 'Large (L)', value: 'L' as 'L' }
		]);
	}

	// Prompt for timeout update
	const updateTimeout = await promptConfirm('Update timeout?', false);
	if (updateTimeout) {
		updates.jobTimeout = await promptInput(
			'Enter job timeout (seconds)',
			current.jobTimeout || '3600',
			(val) => {
				const num = parseInt(val);
				if (isNaN(num) || num <= 0) return 'Timeout must be a positive number';
				return true;
			}
		);
	}

	if (Object.keys(updates).length === 0) {
		throw new Error('No updates specified');
	}

	return updates;
}

/**
 * Create Command
 * Create new automation from file or interactive wizard
 */
async function createCommand(
	file: string | undefined,
	options: {
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const automationsClient: AutomationsClient = opts._clients.automations;
	const projectsClient: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		let automationData: Partial<Automation>;

		if (file) {
			// Read automation data from file
			logInfo(`Reading automation configuration from: ${file}`);
			automationData = readJsonFile(file);

			// Override project ID if specified via flag
			if (options.project) {
				automationData.internalID = options.project;
			}

			// Validate required fields
			if (!automationData.automationName) {
				throw new Error('Missing required field: automationName');
			}
			if (!automationData.jobRunSchedule) {
				throw new Error('Missing required field: jobRunSchedule');
			}
		} else {
			// Interactive mode
			automationData = await interactiveCreateAutomation(
				automationsClient,
				projectsClient,
				options.project
			);
		}

		// Confirm creation
		console.log(chalk.cyan('\n📋 Automation Configuration:'));
		console.log(chalk.gray(`  Name: ${automationData.automationName}`));
		console.log(
			chalk.gray(
				`  Schedule: ${automationData.jobRunSchedule} (${formatSchedule(automationData.jobRunSchedule)})`
			)
		);
		console.log(chalk.gray(`  Active: ${automationData.isActive}`));
		console.log(chalk.gray(`  Project: ${automationData.internalID}`));
		if (automationData.pipelineId) {
			console.log(chalk.gray(`  Pipeline: ${automationData.pipelineId}`));
		}
		console.log();

		const confirmed = await promptConfirm('Create this automation?', true);
		if (!confirmed) {
			logWarning('Automation creation cancelled');
			return;
		}

		// Create automation
		spinner = startSpinner('Creating automation...');
		const created = await automationsClient.create(automationData);
		succeedSpinner(spinner, 'Automation created successfully');

		// Display created automation info
		console.log();
		logSuccess('Automation Details:');
		console.log(chalk.gray(`  ID: ${created.automationID}`));
		console.log(chalk.gray(`  Name: ${created.automationName}`));
		console.log(chalk.gray(`  Schedule: ${created.jobRunSchedule}`));
		console.log(chalk.gray(`  Active: ${created.isActive}`));
		console.log();
		logInfo(`Run automation manually: databasin automations run ${created.automationID}`);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to create automation');
		}

		if (error instanceof Error) {
			if (error.message.includes('validation')) {
				logError('Invalid automation configuration');
				console.error(chalk.gray(`  Error: ${error.message}`));
				console.error(chalk.gray(`  Suggestion: Check the automation configuration schema`));
			} else {
				logError('Error creating automation', error);
			}
		}

		throw error;
	}
}

/**
 * Update Command
 * Update automation configuration
 */
async function updateCommand(
	id: string,
	file: string | undefined,
	options: {},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		let updateData: Partial<Automation>;

		if (file) {
			// Read update data from file
			logInfo(`Reading update configuration from: ${file}`);
			updateData = readJsonFile(file);
		} else {
			// Interactive mode
			updateData = await interactiveUpdateAutomation(automationsClient, id);
		}

		// Show what will be updated
		console.log(chalk.cyan('\n📋 Fields to Update:'));
		Object.entries(updateData).forEach(([key, value]) => {
			let displayValue = String(value);
			if (key === 'jobRunSchedule' && typeof value === 'string') {
				displayValue = `${value} (${formatSchedule(value)})`;
			}
			console.log(chalk.gray(`  ${key}: ${displayValue}`));
		});
		console.log();

		const confirmed = await promptConfirm('Apply these updates?', true);
		if (!confirmed) {
			logWarning('Update cancelled');
			return;
		}

		// Update automation
		spinner = startSpinner('Updating automation...');
		const updated = await automationsClient.update(id, updateData);
		succeedSpinner(spinner, 'Automation updated successfully');

		// Display updated automation info
		console.log();
		logSuccess('Updated Automation:');
		console.log(chalk.gray(`  ID: ${updated.automationID}`));
		console.log(chalk.gray(`  Name: ${updated.automationName}`));
		console.log(chalk.gray(`  Schedule: ${updated.jobRunSchedule}`));
		console.log(chalk.gray(`  Active: ${updated.isActive}`));
		console.log(chalk.gray(`  Updated Fields: ${Object.keys(updateData).join(', ')}`));
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to update automation');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation not found (404)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
			} else if (error.statusCode === 400) {
				logError('Invalid update configuration (400)');
				console.error(chalk.gray(`  Suggestion: Check the automation configuration schema`));
				if (error.responseBody) {
					console.error(chalk.gray(`  Details: ${JSON.stringify(error.responseBody, null, 2)}`));
				}
			} else {
				logError('Error updating automation', error);
			}
		} else if (error instanceof ValidationError) {
			logError('Validation failed', error);
		} else if (error instanceof Error) {
			logError('Error updating automation', error);
		}

		throw error;
	}
}

/**
 * Stop Command
 * Stop a running automation
 */
async function stopCommand(id: string, options: {}, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		// Fetch automation details to check if running
		spinner = startSpinner('Checking automation status...');
		const automation = await automationsClient.getById(id);
		succeedSpinner(spinner, `Automation: ${automation.automationName}`);

		// Check if automation is running
		if (!automation.currentlyRunning) {
			console.log();
			logWarning('Automation is not currently running');
			console.log(chalk.gray(`  Automation: ${automation.automationName}`));
			console.log(chalk.gray(`  Status: ${automation.isActive ? 'active' : 'inactive'}`));
			console.log();
			logInfo('No action needed - automation is already stopped');
			return;
		}

		// Confirm stop
		console.log();
		console.log(chalk.yellow('⚠ This will stop the currently running execution'));
		console.log(chalk.gray(`  Automation: ${automation.automationName}`));
		console.log(chalk.gray(`  Status: Running`));
		console.log();

		const confirmed = await promptConfirm('Stop this automation?', true);
		if (!confirmed) {
			logWarning('Stop cancelled');
			return;
		}

		// Stop automation
		spinner = startSpinner('Stopping automation...');
		const result = await automationsClient.stop(id);
		succeedSpinner(spinner, 'Automation stopped successfully');

		// Display result
		console.log();
		logSuccess('Automation stopped');
		console.log(chalk.gray(`  Status: ${result.status}`));
		if (result.message) {
			console.log(chalk.gray(`  Message: ${result.message}`));
		}
		console.log();
		logInfo(`Check status with: databasin automations get ${id}`);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to stop automation');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation not found (404)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin automations list --project <id>' to see available automations`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to stop this automation`)
				);
			} else {
				logError('Error stopping automation', error);
			}
		} else if (error instanceof Error) {
			logError('Error stopping automation', error);
		}

		throw error;
	}
}

/**
 * Logs Command
 * View automation execution logs
 */
async function logsCommand(
	id: string,
	options: {
		limit?: number;
		runId?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		// Determine output format (C1: Fix format flag support)
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		if (format === 'table') {
			spinner = startSpinner('Fetching automation logs...');
		}

		// Map user-friendly --run-id option to API's currentRunID parameter (C2: Parameter naming alignment)
		// '0' means current run in the API
		const params = {
			currentRunID: options.runId || '0',
			limit: options.limit
		};

		// Fetch automation logs
		const logs = await automationsClient.getAutomationLogs(id, params);

		// Succeed spinner
		if (spinner) {
			succeedSpinner(spinner, `Fetched ${Array.isArray(logs) ? logs.length : 0} log entr${Array.isArray(logs) && logs.length === 1 ? 'y' : 'ies'}`);
		}

		// Format output based on format flag (C1: Fix format flag support)
		const output = formatOutput(
			logs,
			format,
			{ colors: config.output.colors }
		);

		console.log(output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch automation logs');
		}

		// Provide helpful error messages
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation not found (404)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin automations list --project <id>' to see available automations`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to access this automation's logs`)
				);
			} else {
				logError('Error fetching automation logs', error);
			}
		} else if (error instanceof Error) {
			logError('Error fetching automation logs', error);
		}

		throw error;
	}
}

/**
 * Task Logs Command
 * View automation task execution logs
 */
async function taskLogsCommand(
	id: string,
	options: {
		limit?: number;
		runId?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		// Determine output format (C1: Fix format flag support)
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		if (format === 'table') {
			spinner = startSpinner('Fetching task logs...');
		}

		// Map user-friendly --run-id option to API's currentRunID parameter (C2: Parameter naming alignment)
		// '0' means current run in the API
		const params = {
			currentRunID: options.runId || '0',
			limit: options.limit
		};

		// Fetch automation task logs
		const logs = await automationsClient.getAutomationTaskLogs(id, params);

		// Succeed spinner
		if (spinner) {
			succeedSpinner(spinner, `Fetched ${Array.isArray(logs) ? logs.length : 0} log entr${Array.isArray(logs) && logs.length === 1 ? 'y' : 'ies'}`);
		}

		// Format output based on format flag (C1: Fix format flag support)
		const output = formatOutput(
			logs,
			format,
			{ colors: config.output.colors }
		);

		console.log(output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch task logs');
		}

		// Provide helpful error messages
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation task not found (404)');
				console.error(chalk.gray(`  Task ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: Verify the automation task ID is correct`)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Task ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to access this automation task's logs`)
				);
			} else {
				logError('Error fetching automation task logs', error);
			}
		} else if (error instanceof Error) {
			logError('Error fetching automation task logs', error);
		}

		throw error;
	}
}

/**
 * Delete Command
 * Delete automation with confirmation
 */
async function deleteCommand(
	id: string,
	options: {
		yes?: boolean;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		// Fetch automation details for confirmation
		spinner = startSpinner('Fetching automation details...');
		const automation = await automationsClient.getById(id);
		succeedSpinner(
			spinner,
			`Automation: ${automation.automationName} (${automation.automationID})`
		);

		// Warn if automation is currently running
		console.log();
		console.log(chalk.red('⚠ WARNING: This action cannot be undone!'));
		console.log(chalk.gray(`  Automation: ${automation.automationName}`));
		console.log(
			chalk.gray(
				`  Schedule: ${automation.jobRunSchedule} (${formatSchedule(automation.jobRunSchedule)})`
			)
		);
		console.log(chalk.gray(`  Active: ${automation.isActive}`));
		console.log(chalk.gray(`  ID: ${automation.automationID}`));

		if (automation.currentlyRunning) {
			console.log();
			console.log(chalk.yellow('⚠ This automation is currently running and will be stopped'));
		}
		console.log();

		// Confirm deletion (unless --yes flag)
		if (!options.yes) {
			const confirmed = await promptConfirm(
				'Are you sure you want to delete this automation?',
				false
			);
			if (!confirmed) {
				logWarning('Deletion cancelled');
				return;
			}
		}

		// Delete automation
		spinner = startSpinner('Deleting automation...');
		await automationsClient.deleteById(id);
		succeedSpinner(spinner, 'Automation deleted successfully');

		console.log();
		logSuccess(`Deleted automation: ${automation.automationName}`);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to delete automation');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation not found (404)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to delete this automation`)
				);
			} else {
				logError('Error deleting automation', error);
			}
		} else if (error instanceof Error) {
			logError('Error deleting automation', error);
		}

		throw error;
	}
}

/**
 * History Command
 * View automation run history and status changes
 */
async function historyCommand(
	id: string,
	options: {
		count?: boolean;
		limit?: number;
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		const spinnerMessage = options.count
			? 'Fetching automation history count...'
			: 'Fetching automation history...';
		if (format === 'table') {
			spinner = startSpinner(spinnerMessage);
		}

		// Build request options with proper params (M3: Token efficiency implementation)
		const requestOptions: any = {
			params: {}
		};
		if (options.limit) {
			requestOptions.params.limit = options.limit;
		}
		if (options.fields) {
			requestOptions.params.fields = options.fields;
		}
		if (options.count) {
			requestOptions.params.count = true;
		}

		// Fetch automation history
		const result = await automationsClient.getAutomationHistory(id, requestOptions);

		// Handle count mode with type guard (C3: Count mode type guards)
		if (options.count) {
			const count = typeof result === 'object' && 'count' in result
				? (result as { count: number }).count
				: Array.isArray(result) ? result.length : 0;

			if (spinner) {
				succeedSpinner(spinner, `History entry count: ${count}`);
			} else {
				console.log(count);
			}
			return;
		}

		// Type guard for array mode (C3: Count mode type guards)
		let history = Array.isArray(result) ? result : [];

		// Succeed spinner with count
		if (spinner) {
			if (history.length === 0) {
				succeedSpinner(spinner, 'No history entries found');
				console.log('');
				logInfo(`No history entries found for automation ${id}`);
				return;
			}
			succeedSpinner(
				spinner,
				`Fetched ${history.length} history entr${history.length === 1 ? 'y' : 'ies'}`
			);
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(
			history,
			format,
			{ fields, colors: config.output.colors },
			{ warnThreshold: config.tokenEfficiency.warnThreshold, enabled: true }
		);

		console.log('\n' + output);

		// Token efficiency warning (for large result sets without limit)
		if (!options.count && !options.limit && history.length > 50) {
			warnTokenUsage(output.length, config.tokenEfficiency.warnThreshold, [
				'Use --count to get only the count',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results'
			]);
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch automation history');
		}

		// Provide helpful error messages
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation not found (404)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin automations list --project <id>' to see available automations`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Automation ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to access this automation's history`)
				);
			} else {
				logError('Error fetching automation history', error);
			}
		} else if (error instanceof Error) {
			logError('Error fetching automation history', error);
		}

		throw error;
	}
}

/**
 * Task History Command
 * View automation task execution history
 */
async function taskHistoryCommand(
	id: string,
	options: {
		count?: boolean;
		limit?: number;
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const automationsClient: AutomationsClient = opts._clients.automations;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		const spinnerMessage = options.count
			? 'Fetching task history count...'
			: 'Fetching task history...';
		if (format === 'table') {
			spinner = startSpinner(spinnerMessage);
		}

		// Build request options with proper params (M3: Token efficiency implementation)
		const requestOptions: any = {
			params: {}
		};
		if (options.limit) {
			requestOptions.params.limit = options.limit;
		}
		if (options.fields) {
			requestOptions.params.fields = options.fields;
		}
		if (options.count) {
			requestOptions.params.count = true;
		}

		// Fetch automation task history
		const result = await automationsClient.getAutomationTaskHistory(id, requestOptions);

		// Handle count mode with type guard (C3: Count mode type guards)
		if (options.count) {
			const count = typeof result === 'object' && 'count' in result
				? (result as { count: number }).count
				: Array.isArray(result) ? result.length : 0;

			if (spinner) {
				succeedSpinner(spinner, `History entry count: ${count}`);
			} else {
				console.log(count);
			}
			return;
		}

		// Type guard for array mode (C3: Count mode type guards)
		let history = Array.isArray(result) ? result : [];

		// Succeed spinner with count
		if (spinner) {
			if (history.length === 0) {
				succeedSpinner(spinner, 'No history entries found');
				console.log('');
				logInfo(`No history entries found for task ${id}`);
				return;
			}
			succeedSpinner(
				spinner,
				`Fetched ${history.length} history entr${history.length === 1 ? 'y' : 'ies'}`
			);
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(
			history,
			format,
			{ fields, colors: config.output.colors },
			{ warnThreshold: config.tokenEfficiency.warnThreshold, enabled: true }
		);

		console.log('\n' + output);

		// Token efficiency warning (for large result sets without limit)
		if (!options.count && !options.limit && history.length > 50) {
			warnTokenUsage(output.length, config.tokenEfficiency.warnThreshold, [
				'Use --count to get only the count',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results'
			]);
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch task history');
		}

		// Provide helpful error messages
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Automation task not found (404)');
				console.error(chalk.gray(`  Task ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: Verify the task ID and try again`)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Task ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to access this task's history`)
				);
			} else {
				logError('Error fetching task history', error);
			}
		} else if (error instanceof Error) {
			logError('Error fetching task history', error);
		}

		throw error;
	}
}

/**
 * Create automations command with all subcommands
 *
 * @returns Configured Commander Command instance
 */
export function createAutomationsCommand(): Command {
	const automations = new Command('automations').description('Manage automation workflows');

	// List command
	automations
		.command('list')
		.description('List automations')
		.option('-p, --project <id>', 'Filter by project ID')
		.option('--count', 'Return only the count of automations')
		.option('--limit <number>', 'Limit number of results', parseInt)
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.option('--active', 'Filter to only active automations')
		.option('--running', 'Filter to only currently running automations')
		.action(listCommand);

	// Get command
	automations
		.command('get')
		.description('Get detailed automation information')
		.argument('<id>', 'Automation ID')
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(getCommand);

	// Create command
	automations
		.command('create')
		.description('Create a new automation')
		.argument('[file]', 'JSON file with automation configuration (interactive if not provided)')
		.option('-p, --project <id>', 'Project ID for the automation')
		.action(createCommand);

	// Update command
	automations
		.command('update')
		.description('Update automation configuration')
		.argument('<id>', 'Automation ID')
		.argument('[file]', 'JSON file with updated configuration (interactive if not provided)')
		.action(updateCommand);

	// Run command
	automations
		.command('run')
		.description('Execute an automation immediately')
		.argument('<id>', 'Automation ID')
		.action(runCommand);

	// Stop command
	automations
		.command('stop')
		.description('Stop a running automation')
		.argument('<id>', 'Automation ID')
		.action(stopCommand);

	// Logs command
	automations
		.command('logs')
		.description('Get automation execution logs')
		.argument('<id>', 'Automation ID')
		.option('--limit <n>', 'Limit number of log entries', parseInt)
		.option('--run-id <id>', 'Specific run ID (default: current run)')
		.action(logsCommand);

	// History command
	automations
		.command('history')
		.description('Get automation run history and status changes')
		.argument('<id>', 'Automation ID')
		.option('--count', 'Return only the count of history entries')
		.option('--limit <n>', 'Limit number of results', parseInt)
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(historyCommand);

	// Tasks subcommand
	const tasks = automations.command('tasks').description('Manage automation tasks');

	tasks
		.command('logs')
		.description('Get automation task execution logs')
		.argument('<id>', 'Automation task ID')
		.option('--limit <n>', 'Limit number of log entries', parseInt)
		.option('--run-id <id>', 'Specific run ID (default: current run)')
		.action(taskLogsCommand);

	tasks
		.command('history')
		.description('Get automation task execution history')
		.argument('<id>', 'Automation task ID')
		.option('--count', 'Return only the count of history entries')
		.option('--limit <n>', 'Limit number of results', parseInt)
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(taskHistoryCommand);

	// Delete command
	automations
		.command('delete')
		.description('Delete an automation')
		.argument('<id>', 'Automation ID')
		.option('-y, --yes', 'Skip confirmation prompt')
		.action(deleteCommand);

	return automations;
}
