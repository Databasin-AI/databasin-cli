/**
 * Pipelines Command Implementation
 *
 * Provides CLI commands for managing Databasin pipelines:
 * - list: List pipelines in a project (requires projectId)
 * - get: Get detailed pipeline information
 * - create: Create new pipeline (from file or interactive)
 * - run: Execute a pipeline immediately
 * - logs: View pipeline execution logs
 *
 * @module commands/pipelines
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import type { PipelinesClient } from '../client/pipelines.ts';
import type { ProjectsClient } from '../client/projects.ts';
import type { CliConfig } from '../types/config.ts';
import type { Pipeline, PipelineStatus, PipelineArtifact } from '../types/api.ts';
import type { PipelineData, PipelineRunResponse } from '../client/pipelines.ts';
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
	logInfo,
	logSuccess,
	logWarning,
	type Ora
} from '../utils/progress.ts';
import { promptForProject, promptConfirm, promptInput, promptSelect } from '../utils/prompts.ts';
import { ValidationError, ApiError } from '../utils/errors.ts';
import { parseFields, formatSingleObject } from '../utils/command-helpers.ts';
import { createPipelineWizardCommand } from './pipelines-wizard.ts';
import { createPipelineTemplateCommand } from './pipelines-template.ts';
import { resolveProjectId } from '../utils/project-id-mapper.ts';

/**
 * Prompt user to select a pipeline from a list
 *
 * @param client - PipelinesClient instance
 * @param projectId - Project to list pipelines from
 * @param message - Prompt message
 * @returns Selected pipeline ID
 */
async function promptForPipeline(
	client: PipelinesClient,
	projectId: string,
	message: string = 'Select a pipeline'
): Promise<string> {
	// Fetch pipelines for this project
	const pipelines = (await client.list(projectId)) as Pipeline[];

	if (!Array.isArray(pipelines) || pipelines.length === 0) {
		throw new Error('No pipelines available in this project');
	}

	// Create choices array
	const choices = pipelines.map((pipeline) => ({
		title: `${pipeline.pipelineName} (${pipeline.pipelineID}) - ${pipeline.status}`,
		value: String(pipeline.pipelineID)
	}));

	// Show interactive select prompt
	const selected = await promptSelect(message, choices);

	return selected;
}

/**
 * List Command
 * Lists pipelines in a project (projectId REQUIRED)
 */
async function listCommand(
	options: {
		project?: string;
		count?: boolean;
		limit?: number;
		fields?: string;
		status?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;
	const projectsClient: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		// Get projectId (from option or prompt, resolving numeric IDs to internal IDs)
		let projectId = options.project;
		if (!projectId) {
			try {
				projectId = await promptForProject(projectsClient, 'Select project to list pipelines');
			} catch (error) {
				throw new ValidationError('Project selection cancelled', 'projectId', [
					'Use --project flag to specify project ID'
				]);
			}
		}

		// Resolve project ID (map numeric ID to internal ID)
		if (projectId) {
			projectId = await resolveProjectId(projectId, projectsClient);
		}

		// Validate projectId before API call (CRITICAL)
		if (!projectId || projectId.trim().length === 0) {
			throw new ValidationError('Project ID is required for listing pipelines', 'projectId', [
				'Use --project flag or select a project from the interactive prompt'
			]);
		}

		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		const spinnerMessage = options.count ? 'Fetching pipeline count...' : 'Fetching pipelines...';
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
		if (options.status) {
			requestOptions.status = options.status;
		}

		// Fetch pipelines
		const result = await pipelinesClient.list(projectId, requestOptions);

		// Handle count mode
		if (options.count && typeof result === 'object' && 'count' in result) {
			if (spinner) {
				succeedSpinner(spinner, `Pipeline count: ${result.count}`);
			} else {
				console.log(result.count);
			}
			return;
		}

		// Handle array results
		const pipelines = Array.isArray(result) ? result : [];

		// Succeed spinner with count
		if (spinner) {
			if (pipelines.length === 0) {
				succeedSpinner(spinner, 'No pipelines found in this project');
				logInfo('Create a pipeline with: databasin pipelines create');
				return;
			}
			succeedSpinner(
				spinner,
				`Fetched ${pipelines.length} pipeline${pipelines.length === 1 ? '' : 's'}`
			);
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(
			pipelines,
			format,
			{ fields, colors: config.output.colors },
			{ warnThreshold: config.tokenEfficiency.warnThreshold, enabled: true }
		);

		console.log(output);

		// Token efficiency warning (for large result sets without limit)
		if (!options.count && !options.limit && pipelines.length > 50) {
			warnTokenUsage(output.length, config.tokenEfficiency.warnThreshold, [
				'Use --count to get only the count',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results'
			]);
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch pipelines');
		}

		if (error instanceof ValidationError) {
			// Re-throw validation errors (already formatted)
			throw error;
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 400) {
				logError('Bad request - verify project ID is correct');
				console.error(chalk.gray(`  Project ID: ${options.project || 'not provided'}`));
				console.error(
					chalk.gray(`  Suggestion: Run 'databasin projects list' to see valid project IDs`)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied');
				console.error(chalk.gray(`  Project ID: ${options.project}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to view pipelines in this project`)
				);
			} else {
				logError('Error fetching pipelines', error);
			}
		} else {
			logError('Error fetching pipelines', error instanceof Error ? error : undefined);
		}

		throw error;
	}
}

/**
 * Get Command
 * Get detailed information about a specific pipeline
 */
async function getCommand(
	id: string | undefined,
	options: {
		project?: string;
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;
	const projectsClient: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Prompt for pipeline ID if not provided
		let pipelineId = id;
		if (!pipelineId) {
			// First, get project ID
			let projectId = options.project;
			if (!projectId) {
				projectId = await promptForProject(projectsClient, 'Select a project');
			}

			// Then prompt for pipeline
			pipelineId = await promptForPipeline(pipelinesClient, projectId, 'Select a pipeline');
		}

		// Start spinner
		if (format === 'table') {
			spinner = startSpinner('Fetching pipeline details...');
		}

		// Fetch pipeline details
		const pipeline = await pipelinesClient.getById(pipelineId);

		// Succeed spinner
		if (spinner) {
			succeedSpinner(spinner, 'Pipeline retrieved');
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output based on format
		let output: string;
		if (format === 'json') {
			// For JSON, filter fields if specified
			const filteredPipeline = fields
				? Object.fromEntries(Object.entries(pipeline).filter(([key]) => fields.includes(key)))
				: pipeline;
			output = formatJson(filteredPipeline, { colors: config.output.colors });
		} else if (format === 'csv') {
			// For CSV, use array format
			output = formatCsv([pipeline], { fields, colors: config.output.colors });
		} else {
			// For table, use transposed key-value format
			output = formatSingleObject(pipeline, fields);
		}

		console.log(output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch pipeline');
		}

		// Provide helpful error messages
		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Pipeline not found (404)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to access this pipeline`)
				);
			} else {
				logError('Error fetching pipeline', error);
			}
		} else if (error instanceof Error) {
			logError('Error fetching pipeline', error);
		}

		throw error;
	}
}

/**
 * Create Command
 * Create a new pipeline (from file or interactive)
 */
async function createCommand(
	file: string | undefined,
	options: {
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;
	const projectsClient: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		let pipelineData: PipelineData;

		if (file) {
			// Load from file
			logInfo(`Reading pipeline configuration from: ${file}`);
			try {
				const fileContent = readFileSync(file, 'utf-8');
				pipelineData = JSON.parse(fileContent);
			} catch (error) {
				throw new ValidationError(
					`Failed to read or parse pipeline configuration file: ${file}`,
					'file',
					['Ensure the file exists and is valid JSON', 'Check the pipeline configuration schema']
				);
			}
		} else {
			// Interactive mode
			logInfo('Starting interactive pipeline creation wizard...');
			logWarning('Interactive wizard is simplified - use a JSON file for complex pipelines');

			// Get project ID
			let projectId = options.project;
			if (!projectId) {
				projectId = await promptForProject(projectsClient, 'Select project for pipeline');
			}

			// Prompt for pipeline name
			const pipelineName = await promptInput('Enter pipeline name:', undefined, (value) => {
				if (!value || value.trim().length === 0) {
					return 'Pipeline name is required';
				}
				return true;
			});

			// Prompt for source connector ID
			const sourceConnectorId = await promptInput(
				'Enter source connector ID (or leave blank):',
				undefined
			);

			// Prompt for target connector ID
			const targetConnectorId = await promptInput(
				'Enter target connector ID (or leave blank):',
				undefined
			);

			// Prompt for schedule (optional)
			const schedule = await promptInput(
				'Enter schedule (cron format, leave blank for manual execution):',
				undefined,
				(value) => {
					if (!value) return true; // Optional
					// Basic cron validation
					if (!/^[\d\*\,\-\/\s]+$/.test(value)) {
						return 'Invalid cron format (use digits, *, -, /, and spaces)';
					}
					return true;
				}
			);

			// Build pipeline data
			pipelineData = {
				pipelineName: pipelineName.trim()
			};

			if (sourceConnectorId && sourceConnectorId.trim().length > 0) {
				pipelineData.sourceConnectorId = sourceConnectorId.trim();
			}

			if (targetConnectorId && targetConnectorId.trim().length > 0) {
				pipelineData.targetConnectorId = targetConnectorId.trim();
			}

			if (schedule && schedule.trim().length > 0) {
				pipelineData.configuration = {
					schedule: schedule.trim()
				};
			}

			logInfo('Artifact configuration not yet supported in interactive mode');
		}

		// Start spinner
		spinner = startSpinner('Creating pipeline...');

		// Create pipeline
		const createdPipeline = await pipelinesClient.create(pipelineData);

		// Succeed spinner
		succeedSpinner(spinner, 'Pipeline created successfully');

		// Display created pipeline info
		console.log();
		logSuccess(`Pipeline created: ${createdPipeline.pipelineName}`);
		console.log(chalk.gray(`  ID: ${createdPipeline.pipelineID}`));
		console.log(chalk.gray(`  Status: ${createdPipeline.status}`));
		console.log(chalk.gray(`  Enabled: ${createdPipeline.enabled}`));

		if (createdPipeline.sourceConnectorId) {
			console.log(chalk.gray(`  Source: ${createdPipeline.sourceConnectorId}`));
		}
		if (createdPipeline.targetConnectorId) {
			console.log(chalk.gray(`  Target: ${createdPipeline.targetConnectorId}`));
		}

		console.log();
		logInfo(`Run the pipeline with: databasin pipelines run ${createdPipeline.pipelineID}`);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to create pipeline');
		}

		if (error instanceof ValidationError) {
			// Re-throw validation errors
			throw error;
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 400) {
				logError('Invalid pipeline configuration (400)');
				console.error(chalk.gray(`  Suggestion: Check the pipeline configuration schema`));
				if (error.responseBody) {
					console.error(chalk.gray(`  Details: ${JSON.stringify(error.responseBody, null, 2)}`));
				}
			} else {
				logError('Error creating pipeline', error);
			}
		} else if (error instanceof Error) {
			logError('Error creating pipeline', error);
		}

		throw error;
	}
}

/**
 * Run Command
 * Execute a pipeline immediately
 */
async function runCommand(
	id: string | undefined,
	options: {
		project?: string;
		wait?: boolean;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;
	const projectsClient: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		// Prompt for pipeline ID if not provided
		let pipelineId = id;
		if (!pipelineId) {
			// First, get project ID
			let projectId = options.project;
			if (!projectId) {
				projectId = await promptForProject(projectsClient, 'Select a project');
			}

			// Then prompt for pipeline
			pipelineId = await promptForPipeline(pipelinesClient, projectId, 'Select pipeline to run');
		}

		// Start spinner
		spinner = startSpinner('Starting pipeline execution...');

		// Execute pipeline
		const result: PipelineRunResponse = await pipelinesClient.run(pipelineId);

		// Succeed spinner
		succeedSpinner(spinner, 'Pipeline execution started');

		// Display execution info
		console.log();
		logSuccess(`Pipeline execution started`);
		console.log(chalk.gray(`  Status: ${result.status}`));
		if (result.jobId) {
			console.log(chalk.gray(`  Job ID: ${result.jobId}`));
		}
		if (result.message) {
			console.log(chalk.gray(`  Message: ${result.message}`));
		}

		// Wait for completion if requested
		if (options.wait) {
			console.log();
			logInfo('Waiting for pipeline to complete...');
			logWarning('Polling not yet implemented - pipeline is running in background');
			// TODO: Implement polling when API supports execution status endpoint
		} else {
			console.log();
			logInfo(`Use 'databasin pipelines logs ${pipelineId}' to view logs`);
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to start pipeline execution');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Pipeline not found (404)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines`
					)
				);
			} else if (error.statusCode === 400) {
				logError('Pipeline cannot be executed (400)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
				console.error(chalk.gray(`  Suggestion: Check pipeline status and configuration`));
				if (error.responseBody) {
					console.error(chalk.gray(`  Details: ${JSON.stringify(error.responseBody, null, 2)}`));
				}
			} else {
				logError('Error executing pipeline', error);
			}
		} else if (error instanceof Error) {
			logError('Error executing pipeline', error);
		}

		throw error;
	}
}

/**
 * Logs Command
 * View pipeline execution logs
 */
async function logsCommand(
	id: string | undefined,
	options: {
		project?: string;
		execution?: string;
		limit?: number;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;
	const projectsClient: ProjectsClient = opts._clients.projects;

	try {
		// Prompt for pipeline ID if not provided
		let pipelineId = id;
		if (!pipelineId) {
			// First, get project ID
			let projectId = options.project;
			if (!projectId) {
				projectId = await promptForProject(projectsClient, 'Select a project');
			}

			// Then prompt for pipeline
			pipelineId = await promptForPipeline(
				pipelinesClient,
				projectId,
				'Select pipeline to view logs'
			);
		}

		// Log endpoint may not exist yet - show helpful message
		logWarning('Pipeline logs endpoint not yet implemented');
		console.log();
		console.log(chalk.gray(`  Pipeline ID: ${pipelineId}`));
		if (options.execution) {
			console.log(chalk.gray(`  Execution ID: ${options.execution}`));
		}
		if (options.limit) {
			console.log(chalk.gray(`  Limit: ${options.limit} entries`));
		}
		console.log();
		logInfo('Log viewing will be available in a future release');
		logInfo('For now, check pipeline execution status in the Databasin UI');
	} catch (error) {
		if (error instanceof Error) {
			logError('Error fetching logs', error);
		}
		throw error;
	}
}

/**
 * Update Command
 * Update pipeline configuration
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
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;

	let spinner: Ora | undefined;

	try {
		let updateData: PipelineData;

		// Fetch current pipeline for display
		spinner = startSpinner('Fetching current pipeline configuration...');
		const current = await pipelinesClient.getById(id);
		succeedSpinner(spinner, `Pipeline: ${current.pipelineName}`);

		console.log();
		console.log(chalk.cyan('Current Configuration:'));
		console.log(chalk.gray(`  Name: ${current.pipelineName}`));
		console.log(chalk.gray(`  Status: ${current.status}`));
		console.log(chalk.gray(`  Enabled: ${current.enabled}`));
		if (current.sourceConnectorId) {
			console.log(chalk.gray(`  Source: ${current.sourceConnectorId}`));
		}
		if (current.targetConnectorId) {
			console.log(chalk.gray(`  Target: ${current.targetConnectorId}`));
		}
		console.log();

		if (file) {
			// Read update data from file
			logInfo(`Reading update configuration from: ${file}`);
			try {
				const fileContent = readFileSync(file, 'utf-8');
				updateData = JSON.parse(fileContent);
			} catch (error) {
				throw new ValidationError(
					`Failed to read or parse update configuration file: ${file}`,
					'file',
					['Ensure the file exists and is valid JSON', 'Check the pipeline configuration schema']
				);
			}
		} else {
			// Interactive mode
			console.log(chalk.cyan('Interactive Update Mode'));
			console.log(chalk.gray('Press Enter to keep current values\n'));

			updateData = {};

			// Prompt for name update
			const updateName = await promptConfirm('Update pipeline name?', false);
			if (updateName) {
				const newName = await promptInput('Enter new name', current.pipelineName, (value) => {
					if (!value || value.trim().length === 0) {
						return 'Pipeline name cannot be empty';
					}
					return true;
				});
				if (newName !== current.pipelineName) {
					updateData.pipelineName = newName.trim();
				}
			}

			// Prompt for status update
			const updateEnabled = await promptConfirm('Update enabled status?', false);
			if (updateEnabled) {
				const enabled = await promptConfirm('Enable pipeline?', current.enabled ?? true);
				if (enabled !== current.enabled) {
					updateData.enabled = enabled;
				}
			}

			// Prompt for schedule update
			const updateSchedule = await promptConfirm('Update schedule?', false);
			if (updateSchedule) {
				const schedule = await promptInput(
					'Enter schedule (cron format, leave blank to remove)',
					undefined,
					(value) => {
						if (!value) return true; // Optional
						if (!/^[\d\*\,\-\/\s]+$/.test(value)) {
							return 'Invalid cron format (use digits, *, -, /, and spaces)';
						}
						return true;
					}
				);
				if (schedule) {
					updateData.configuration = {
						...current.configuration,
						schedule: schedule.trim()
					};
				}
			}

			if (Object.keys(updateData).length === 0) {
				logWarning('No changes made');
				return;
			}
		}

		// Show what will be updated
		console.log(chalk.cyan('\nFields to Update:'));
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

		// Update pipeline
		spinner = startSpinner('Updating pipeline...');
		const updated = await pipelinesClient.update(id, updateData);
		succeedSpinner(spinner, 'Pipeline updated successfully');

		// Display updated pipeline info
		console.log();
		logSuccess('Updated Pipeline:');
		console.log(chalk.gray(`  ID: ${updated.pipelineID}`));
		console.log(chalk.gray(`  Name: ${updated.pipelineName}`));
		console.log(chalk.gray(`  Status: ${updated.status}`));
		console.log(chalk.gray(`  Updated Fields: ${Object.keys(updateData).join(', ')}`));
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to update pipeline');
		}

		if (error instanceof ValidationError) {
			throw error;
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Pipeline not found (404)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines`
					)
				);
			} else if (error.statusCode === 400) {
				logError('Invalid update configuration (400)');
				console.error(chalk.gray(`  Suggestion: Check the pipeline configuration schema`));
				if (error.responseBody) {
					console.error(chalk.gray(`  Details: ${JSON.stringify(error.responseBody, null, 2)}`));
				}
			} else {
				logError('Error updating pipeline', error);
			}
		} else if (error instanceof Error) {
			logError('Error updating pipeline', error);
		}

		throw error;
	}
}

/**
 * Delete Command
 * Delete pipeline with confirmation
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
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;

	let spinner: Ora | undefined;

	try {
		// Fetch pipeline details for confirmation
		spinner = startSpinner('Fetching pipeline details...');
		const pipeline = await pipelinesClient.getById(id);
		succeedSpinner(spinner, `Pipeline: ${pipeline.pipelineName} (${pipeline.pipelineID})`);

		// Warn if pipeline is currently running
		const isRunning = pipeline.status === 'running';
		if (isRunning) {
			console.log();
			console.log(chalk.yellow('⚠ WARNING: This pipeline is currently running!'));
		}

		console.log();
		console.log(chalk.red('⚠ WARNING: This action cannot be undone!'));
		console.log(chalk.gray(`  Pipeline: ${pipeline.pipelineName}`));
		console.log(chalk.gray(`  ID: ${pipeline.pipelineID}`));
		console.log(chalk.gray(`  Status: ${pipeline.status}`));
		if (pipeline.artifacts && pipeline.artifacts.length > 0) {
			console.log(chalk.gray(`  Artifacts: ${pipeline.artifacts.length}`));
		}
		console.log();

		// Confirm deletion (unless --yes flag)
		if (!options.yes) {
			const confirmed = await promptConfirm(
				'Are you sure you want to delete this pipeline?',
				false
			);
			if (!confirmed) {
				logWarning('Deletion cancelled');
				return;
			}
		}

		// Delete pipeline
		spinner = startSpinner('Deleting pipeline...');
		await pipelinesClient.deleteById(id);
		succeedSpinner(spinner, 'Pipeline deleted successfully');

		console.log();
		logSuccess(`Deleted pipeline: ${pipeline.pipelineName}`);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to delete pipeline');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Pipeline not found (404)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
				console.error(
					chalk.gray(
						`  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines`
					)
				);
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to delete this pipeline`)
				);
			} else {
				logError('Error deleting pipeline', error);
			}
		} else if (error instanceof Error) {
			logError('Error deleting pipeline', error);
		}

		throw error;
	}
}

/**
 * Artifacts Add Command
 * Add artifact to pipeline
 */
async function artifactsAddCommand(
	id: string,
	file: string | undefined,
	options: {
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;

	let spinner: Ora | undefined;

	try {
		let artifactData: Partial<PipelineArtifact>;

		// Fetch pipeline for context
		spinner = startSpinner('Fetching pipeline details...');
		const pipeline = await pipelinesClient.getById(id);
		succeedSpinner(spinner, `Pipeline: ${pipeline.pipelineName}`);

		console.log();
		console.log(chalk.gray(`  Current artifacts: ${pipeline.artifacts?.length || 0}`));
		console.log();

		if (file) {
			// Read artifact data from file
			logInfo(`Reading artifact configuration from: ${file}`);
			try {
				const fileContent = readFileSync(file, 'utf-8');
				artifactData = JSON.parse(fileContent);
			} catch (error) {
				throw new ValidationError(
					`Failed to read or parse artifact configuration file: ${file}`,
					'file',
					['Ensure the file exists and is valid JSON', 'Check the artifact configuration schema']
				);
			}
		} else {
			// Interactive mode
			console.log(chalk.cyan('Interactive Artifact Creation'));
			console.log();

			const artifactType = await promptSelect<string>('Select artifact type', [
				{ title: 'Table', value: 'table' },
				{ title: 'File', value: 'file' },
				{ title: 'API Endpoint', value: 'api' }
			]);

			const config: Record<string, any> = {};

			// Type-specific configuration
			if (artifactType === 'table') {
				config.tableName = await promptInput('Enter table name', undefined, (value) => {
					if (!value || value.trim().length === 0) {
						return 'Table name is required';
					}
					return true;
				});

				config.schema = await promptInput('Enter schema name (optional)', 'public');

				config.mode = await promptSelect<string>('Select mode', [
					{ title: 'Append', value: 'append' },
					{ title: 'Overwrite', value: 'overwrite' },
					{ title: 'Upsert', value: 'upsert' }
				]);
			} else if (artifactType === 'file') {
				config.filePath = await promptInput('Enter file path', undefined, (value) => {
					if (!value || value.trim().length === 0) {
						return 'File path is required';
					}
					return true;
				});

				config.format = await promptSelect<string>('Select file format', [
					{ title: 'CSV', value: 'csv' },
					{ title: 'JSON', value: 'json' },
					{ title: 'Parquet', value: 'parquet' },
					{ title: 'Excel', value: 'excel' }
				]);
			} else if (artifactType === 'api') {
				config.endpoint = await promptInput('Enter API endpoint', undefined, (value) => {
					if (!value || value.trim().length === 0) {
						return 'API endpoint is required';
					}
					return true;
				});

				config.method = await promptSelect<string>('Select HTTP method', [
					{ title: 'GET', value: 'GET' },
					{ title: 'POST', value: 'POST' },
					{ title: 'PUT', value: 'PUT' }
				]);
			}

			artifactData = {
				type: artifactType,
				config
			};
		}

		// Show artifact configuration
		console.log();
		console.log(chalk.cyan('Artifact Configuration:'));
		console.log(chalk.gray(`  Type: ${artifactData.type}`));
		console.log(chalk.gray(`  Config: ${JSON.stringify(artifactData.config, null, 2)}`));
		console.log();

		const confirmed = await promptConfirm('Add this artifact?', true);
		if (!confirmed) {
			logWarning('Artifact creation cancelled');
			return;
		}

		// Add artifact
		spinner = startSpinner('Adding artifact...');
		const created = await pipelinesClient.addArtifact(id, artifactData);
		succeedSpinner(spinner, 'Artifact added successfully');

		// Display created artifact info
		console.log();
		logSuccess('Artifact Details:');
		console.log(chalk.gray(`  ID: ${created.id}`));
		console.log(chalk.gray(`  Type: ${created.type}`));
		console.log(chalk.gray(`  Pipeline: ${pipeline.pipelineName}`));
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to add artifact');
		}

		if (error instanceof ValidationError) {
			throw error;
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Pipeline not found (404)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
			} else if (error.statusCode === 400) {
				logError('Invalid artifact configuration (400)');
				console.error(chalk.gray(`  Suggestion: Check the artifact configuration schema`));
				if (error.responseBody) {
					console.error(chalk.gray(`  Details: ${JSON.stringify(error.responseBody, null, 2)}`));
				}
			} else {
				logError('Error adding artifact', error);
			}
		} else if (error instanceof Error) {
			logError('Error adding artifact', error);
		}

		throw error;
	}
}

/**
 * Artifacts Remove Command
 * Remove artifact from pipeline
 */
async function artifactsRemoveCommand(
	id: string,
	artifactId: string | undefined,
	options: {
		yes?: boolean;
		project?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;

	let spinner: Ora | undefined;

	try {
		// Fetch pipeline for context
		spinner = startSpinner('Fetching pipeline details...');
		const pipeline = await pipelinesClient.getById(id);
		succeedSpinner(spinner, `Pipeline: ${pipeline.pipelineName}`);

		// Check if pipeline has artifacts
		if (!pipeline.artifacts || pipeline.artifacts.length === 0) {
			console.log();
			logWarning('This pipeline has no artifacts');
			return;
		}

		// If artifactId not provided, prompt for selection
		let selectedArtifactId = artifactId;
		if (!selectedArtifactId) {
			console.log();
			console.log(chalk.cyan('Available Artifacts:'));
			console.log();

			const choices = pipeline.artifacts.map((artifact) => ({
				title: `${artifact.type} - ${artifact.id} (${JSON.stringify(artifact.config)})`,
				value: artifact.id
			}));

			selectedArtifactId = await promptSelect('Select artifact to remove', choices);
		}

		// Find the artifact for confirmation
		const artifact = pipeline.artifacts.find((a) => a.id === selectedArtifactId);
		if (!artifact) {
			throw new Error(`Artifact ${selectedArtifactId} not found in pipeline ${id}`);
		}

		console.log();
		console.log(chalk.red('⚠ WARNING: This will remove the artifact from the pipeline!'));
		console.log(chalk.gray(`  Artifact ID: ${artifact.id}`));
		console.log(chalk.gray(`  Type: ${artifact.type}`));
		console.log(chalk.gray(`  Config: ${JSON.stringify(artifact.config, null, 2)}`));
		console.log();

		// Confirm removal (unless --yes flag)
		if (!options.yes) {
			const confirmed = await promptConfirm(
				'Are you sure you want to remove this artifact?',
				false
			);
			if (!confirmed) {
				logWarning('Artifact removal cancelled');
				return;
			}
		}

		// Remove artifact
		spinner = startSpinner('Removing artifact...');
		await pipelinesClient.removeArtifact(id, selectedArtifactId);
		succeedSpinner(spinner, 'Artifact removed successfully');

		console.log();
		logSuccess(`Removed artifact: ${artifact.id} from pipeline ${pipeline.pipelineName}`);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to remove artifact');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Pipeline or artifact not found (404)');
				console.error(chalk.gray(`  Pipeline ID: ${id}`));
				if (artifactId) {
					console.error(chalk.gray(`  Artifact ID: ${artifactId}`));
				}
			} else if (error.statusCode === 403) {
				logError('Access denied (403)');
				console.error(
					chalk.gray(`  Suggestion: You don't have permission to modify this pipeline`)
				);
			} else {
				logError('Error removing artifact', error);
			}
		} else if (error instanceof Error) {
			logError('Error removing artifact', error);
		}

		throw error;
	}
}

/**
 * Create pipelines command with all subcommands
 *
 * @returns Configured Commander Command instance
 */
export function createPipelinesCommand(): Command {
	const pipelines = new Command('pipelines').description('Manage data pipelines');

	// List command
	pipelines
		.command('list')
		.description('List pipelines in a project')
		.option('-p, --project <id>', 'Project ID (required)')
		.option('--count', 'Return only the count of pipelines')
		.option('--limit <number>', 'Limit number of results', parseInt)
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.option('--status <status>', 'Filter by status (active, inactive, running, error, pending)')
		.action(listCommand);

	// Get command
	pipelines
		.command('get')
		.description('Get detailed pipeline information')
		.argument('[id]', 'Pipeline ID (will prompt if not provided)')
		.option('-p, --project <id>', 'Project ID (for interactive selection)')
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(getCommand);

	// Create command
	pipelines
		.command('create')
		.description('Create a new pipeline')
		.argument('[file]', 'JSON file with pipeline configuration')
		.option('-p, --project <id>', 'Project ID (for interactive mode)')
		.action(createCommand);

	// Update command
	pipelines
		.command('update')
		.description('Update pipeline configuration')
		.argument('<id>', 'Pipeline ID')
		.argument('[file]', 'JSON file with updated configuration (interactive if not provided)')
		.option('-p, --project <id>', 'Project ID (not used, for consistency)')
		.action(updateCommand);

	// Delete command
	pipelines
		.command('delete')
		.description('Delete a pipeline')
		.argument('<id>', 'Pipeline ID')
		.option('-y, --yes', 'Skip confirmation prompt')
		.option('-p, --project <id>', 'Project ID (not used, for consistency)')
		.action(deleteCommand);

	// Run command
	pipelines
		.command('run')
		.description('Execute a pipeline immediately')
		.argument('[id]', 'Pipeline ID (will prompt if not provided)')
		.option('-p, --project <id>', 'Project ID (for interactive selection)')
		.option('--wait', 'Wait for pipeline execution to complete')
		.action(runCommand);

	// Logs command
	pipelines
		.command('logs')
		.description('View pipeline execution logs')
		.argument('[id]', 'Pipeline ID (will prompt if not provided)')
		.option('-p, --project <id>', 'Project ID (for interactive selection)')
		.option('--execution <id>', 'Specific execution ID')
		.option('--limit <number>', 'Limit number of log entries', parseInt)
		.action(logsCommand);

	// Artifacts sub-command
	const artifacts = pipelines.command('artifacts').description('Manage pipeline artifacts');

	artifacts
		.command('add')
		.description('Add artifact to pipeline')
		.argument('<id>', 'Pipeline ID')
		.argument('[file]', 'Artifact config JSON file (interactive if not provided)')
		.option('-p, --project <id>', 'Project ID (not used, for consistency)')
		.action(artifactsAddCommand);

	artifacts
		.command('remove')
		.description('Remove artifact from pipeline')
		.argument('<id>', 'Pipeline ID')
		.argument('[artifactId]', 'Artifact ID (will prompt if not provided)')
		.option('-y, --yes', 'Skip confirmation prompt')
		.option('-p, --project <id>', 'Project ID (not used, for consistency)')
		.action(artifactsRemoveCommand);

	// Wizard command (Phase 3 - WS7)
	pipelines.addCommand(createPipelineWizardCommand());

	// Template commands (Phase 3 - WS9)
	pipelines.addCommand(createPipelineTemplateCommand());

	return pipelines;
}
