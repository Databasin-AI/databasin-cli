/**
 * Projects Command Implementation
 *
 * Provides CLI commands for managing Databasin projects:
 * - list: List all accessible projects
 * - get: Get detailed project information
 * - users: List users in a project
 * - stats: Show project statistics
 *
 * @module commands/projects
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { ProjectsClient } from '../client/projects.ts';
import type { CliConfig } from '../types/config.ts';
import type { Project, User, ProjectStats } from '../types/api.ts';
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
	warnTokenUsage,
	logError,
	type Ora
} from '../utils/progress.ts';
import { promptForProject } from '../utils/prompts.ts';
import { formatError } from '../utils/errors.ts';
import { parseFields, formatSingleObject } from '../utils/command-helpers.ts';

/**
 * List Command
 * Lists all accessible projects with token efficiency support
 */
async function listCommand(
	options: {
		count?: boolean;
		limit?: number;
		fields?: string;
		status?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Start spinner (only for table format)
		const spinnerMessage = options.count ? 'Fetching project count...' : 'Fetching projects...';
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

		// Fetch projects
		const result = await client.list(requestOptions);

		// Handle count mode
		if (options.count && typeof result === 'object' && 'count' in result) {
			if (spinner) {
				succeedSpinner(spinner, `Project count: ${result.count}`);
			} else {
				console.log(result.count);
			}
			return;
		}

		// Handle array results
		let projects = Array.isArray(result) ? result : [];

		// Apply status filter if provided
		if (options.status && projects.length > 0) {
			const statusFilter = options.status.toLowerCase();
			projects = projects.filter((p: Project) => {
				// Check if project has a status field, otherwise consider "active" if not deleted
				const projectStatus = (p as any).status || (p.deleted ? 'inactive' : 'active');
				return projectStatus.toLowerCase() === statusFilter;
			});
		}

		// Succeed spinner with count
		if (spinner) {
			if (projects.length === 0) {
				succeedSpinner(spinner, 'No projects found');
				return;
			}
			succeedSpinner(
				spinner,
				`Fetched ${projects.length} project${projects.length === 1 ? '' : 's'}`
			);
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(
			projects,
			format,
			{ fields, colors: config.output.colors },
			{ warnThreshold: config.tokenEfficiency.warnThreshold, enabled: true }
		);

		console.log(output);

		// Token efficiency warning (for large result sets without limit)
		if (!options.count && !options.limit && projects.length > 50) {
			warnTokenUsage(output.length, config.tokenEfficiency.warnThreshold, [
				'Use --count to get only the count',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results'
			]);
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch projects');
		}
		logError('Error fetching projects', error instanceof Error ? error : undefined);
		throw error;
	}
}

/**
 * Get Command
 * Get detailed information about a specific project
 */
async function getCommand(
	id: string | undefined,
	options: {
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Prompt for project ID if not provided
		let projectId = id;
		if (!projectId) {
			projectId = await promptForProject(client, 'Select a project');
		}

		// Start spinner
		if (format === 'table') {
			spinner = startSpinner('Fetching project details...');
		}

		// Fetch project details
		const project = await client.getById(projectId);

		// Succeed spinner
		if (spinner) {
			succeedSpinner(spinner, 'Project retrieved');
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output based on format
		let output: string;
		if (format === 'json') {
			// For JSON, filter fields if specified
			const filteredProject = fields
				? Object.fromEntries(Object.entries(project).filter(([key]) => fields.includes(key)))
				: project;
			output = formatJson(filteredProject, { colors: config.output.colors });
		} else if (format === 'csv') {
			// For CSV, use array format
			output = formatCsv([project], { fields, colors: config.output.colors });
		} else {
			// For table, use transposed key-value format
			output = formatSingleObject(project, fields);
		}

		console.log(output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch project');
		}

		// Provide helpful error messages
		if (error instanceof Error) {
			if (error.message.includes('404')) {
				logError('Project not found');
				console.error(chalk.gray(`  Project ID: ${id}`));
				console.error(
					chalk.gray(`  Suggestion: Run 'databasin projects list' to see available projects`)
				);
			} else if (error.message.includes('403')) {
				logError('Access denied');
				console.error(chalk.gray(`  Project ID: ${id}`));
				console.error(chalk.gray(`  Suggestion: You don't have permission to access this project`));
			} else {
				logError('Error fetching project', error);
			}
		}

		throw error;
	}
}

/**
 * Users Command
 * List users in a project
 */
async function usersCommand(
	id: string | undefined,
	options: {
		fields?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Prompt for project ID if not provided
		let projectId = id;
		if (!projectId) {
			projectId = await promptForProject(client, 'Select a project');
		}

		// Start spinner
		if (format === 'table') {
			spinner = startSpinner('Fetching project users...');
		}

		// Fetch project users
		const result = await client.getProjectUsers(projectId);
		const users = Array.isArray(result) ? result : [];

		// Succeed spinner
		if (spinner) {
			if (users.length === 0) {
				succeedSpinner(spinner, 'No users found');
				return;
			}
			succeedSpinner(spinner, `Fetched ${users.length} user${users.length === 1 ? '' : 's'}`);
		}

		// Parse fields option
		const fields = parseFields(options.fields);

		// Format output
		const output = formatOutput(users, format, {
			fields,
			colors: config.output.colors
		});

		console.log(output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch project users');
		}

		if (error instanceof Error) {
			if (error.message.includes('404')) {
				logError('Project not found');
				console.error(chalk.gray(`  Project ID: ${id}`));
			} else if (error.message.includes('403')) {
				logError('Access denied');
				console.error(chalk.gray(`  Project ID: ${id}`));
			} else {
				logError('Error fetching project users', error);
			}
		}

		throw error;
	}
}

/**
 * Stats Command
 * Show project statistics
 */
async function statsCommand(id: string | undefined, options: {}, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: ProjectsClient = opts._clients.projects;

	let spinner: Ora | undefined;

	try {
		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Prompt for project ID if not provided
		let projectId = id;
		if (!projectId) {
			projectId = await promptForProject(client, 'Select a project');
		}

		// Start spinner
		if (format === 'table') {
			spinner = startSpinner('Fetching project statistics...');
		}

		// Fetch project stats
		const stats = await client.getProjectStats(projectId);

		// Succeed spinner
		if (spinner) {
			succeedSpinner(spinner, 'Statistics retrieved');
		}

		// Format output based on format
		let output: string;
		if (format === 'json') {
			output = formatJson(stats, { colors: config.output.colors });
		} else if (format === 'csv') {
			// For CSV, convert to array of key-value pairs
			const rows = Object.entries(stats).map(([key, value]) => ({
				Metric: key,
				Count: value
			}));
			output = formatCsv(rows, { colors: config.output.colors });
		} else {
			// For table, format as key-value pairs
			const rows = Object.entries(stats)
				.filter(([_, value]) => value !== undefined)
				.map(([key, value]) => ({
					Metric: key,
					Count: value ?? 0
				}));
			output = formatTable(rows, { fields: ['Metric', 'Count'] });
		}

		console.log(output);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to fetch project statistics');
		}

		if (error instanceof Error) {
			if (error.message.includes('404')) {
				logError('Project not found');
				console.error(chalk.gray(`  Project ID: ${id}`));
			} else if (error.message.includes('403')) {
				logError('Access denied');
				console.error(chalk.gray(`  Project ID: ${id}`));
			} else {
				logError('Error fetching project statistics', error);
			}
		}

		throw error;
	}
}

/**
 * Create projects command with all subcommands
 *
 * @returns Configured Commander Command instance
 */
export function createProjectsCommand(): Command {
	const projects = new Command('projects').description('Manage Databasin projects');

	// List command
	projects
		.command('list')
		.description('List all accessible projects')
		.option('--count', 'Return only the count of projects')
		.option('--limit <number>', 'Limit number of results', parseInt)
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.option('--status <status>', 'Filter by status (active, inactive)')
		.action(listCommand);

	// Get command
	projects
		.command('get')
		.description('Get detailed project information')
		.argument('[id]', 'Project ID (will prompt if not provided)')
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(getCommand);

	// Users command
	projects
		.command('users')
		.description('List users in a project')
		.argument('[id]', 'Project ID (will prompt if not provided)')
		.option('--fields <fields>', 'Comma-separated list of fields to display')
		.action(usersCommand);

	// Stats command
	projects
		.command('stats')
		.description('Show project statistics')
		.argument('[id]', 'Project ID (will prompt if not provided)')
		.action(statsCommand);

	return projects;
}
