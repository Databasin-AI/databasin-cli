/**
 * Databasin CLI - Usage Metrics Command
 *
 * Provides subcommands for viewing usage metrics and statistics.
 * Supports user, project, and institution-level usage tracking.
 *
 * @module commands/usage
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { CliConfig } from '../types/config.ts';
import type { UsageMetricsClient } from '../client/index.ts';
import type { UsageSummary } from '../types/api.ts';
import { formatOutput, formatTable, formatDuration } from '../utils/formatters.ts';
import { startSpinner, succeedSpinner, failSpinner, type Ora } from '../utils/progress.ts';

/**
 * Create usage command and subcommands
 *
 * @returns Commander Command instance with usage subcommands
 */
export function createUsageCommand(): Command {
	const command = new Command('usage')
		.description('View usage metrics and statistics')
		.addHelpText(
			'after',
			`
Examples:
  $ databasin usage me                          # View my usage summary
  $ databasin usage user 123                    # View specific user's usage
  $ databasin usage users                       # View all users' usage
  $ databasin usage project 456                 # View project usage
  $ databasin usage projects                    # View all projects' usage
  $ databasin usage institution 789             # View institution usage
  $ databasin usage institutions                # View all institutions' usage
  $ databasin usage me --json                   # Output in JSON format
  $ databasin usage users --csv                 # Output in CSV format
`
		);

	// Me subcommand - get current user's usage
	command
		.command('me')
		.description('View current user usage summary')
		.action(async (_options, cmd) => {
			const opts = cmd.optsWithGlobals();
			const config: CliConfig = opts._config;
			const client: UsageMetricsClient = opts._clients.usageMetrics;

			let spinner: Ora | null = null;
			try {
				spinner = startSpinner('Fetching usage metrics...');
				const usage = await client.getMyUsage();
				succeedSpinner(spinner, 'Usage metrics retrieved');

				displayUsage(usage, config);
			} catch (error) {
				if (spinner) failSpinner(spinner, 'Failed to fetch usage metrics');
				throw error;
			}
		});

	// User subcommand - get specific user's usage
	command
		.command('user <userId>')
		.description('View usage summary for a specific user')
		.action(async (userId: string, _options, cmd) => {
			const opts = cmd.optsWithGlobals();
			const config: CliConfig = opts._config;
			const client: UsageMetricsClient = opts._clients.usageMetrics;

			const id = parseInt(userId, 10);
			if (isNaN(id)) {
				throw new Error('User ID must be a number');
			}

			let spinner: Ora | null = null;
			try {
				spinner = startSpinner(`Fetching usage metrics for user ${id}...`);
				const usage = await client.getUserUsage(id);
				succeedSpinner(spinner, 'Usage metrics retrieved');

				displayUsage(usage, config);
			} catch (error) {
				if (spinner) failSpinner(spinner, 'Failed to fetch usage metrics');
				throw error;
			}
		});

	// Users subcommand - get all users' usage
	command
		.command('users')
		.description('View usage summaries for all users')
		.action(async (_options, cmd) => {
			const opts = cmd.optsWithGlobals();
			const config: CliConfig = opts._config;
			const client: UsageMetricsClient = opts._clients.usageMetrics;

			let spinner: Ora | null = null;
			try {
				spinner = startSpinner('Fetching usage metrics...');
				const usages = await client.getAllUserUsage();
				succeedSpinner(spinner, `Fetched ${usages.length} user usage record(s)`);

				displayUsageList(usages, 'user', config);
			} catch (error) {
				if (spinner) failSpinner(spinner, 'Failed to fetch usage metrics');
				throw error;
			}
		});

	// Project subcommand - get specific project's usage
	command
		.command('project <projectId>')
		.description('View usage summary for a specific project')
		.action(async (projectId: string, _options, cmd) => {
			const opts = cmd.optsWithGlobals();
			const config: CliConfig = opts._config;
			const client: UsageMetricsClient = opts._clients.usageMetrics;

			const id = parseInt(projectId, 10);
			if (isNaN(id)) {
				throw new Error('Project ID must be a number');
			}

			let spinner: Ora | null = null;
			try {
				spinner = startSpinner(`Fetching usage metrics for project ${id}...`);
				const usage = await client.getProjectUsage(id);
				succeedSpinner(spinner, 'Usage metrics retrieved');

				displayUsage(usage, config);
			} catch (error) {
				if (spinner) failSpinner(spinner, 'Failed to fetch usage metrics');
				throw error;
			}
		});

	// Projects subcommand - get all projects' usage
	command
		.command('projects')
		.description('View usage summaries for all projects')
		.action(async (_options, cmd) => {
			const opts = cmd.optsWithGlobals();
			const config: CliConfig = opts._config;
			const client: UsageMetricsClient = opts._clients.usageMetrics;
			const projectsClient = opts._clients.projects;

			let spinner: Ora | null = null;
			try {
				spinner = startSpinner('Fetching usage metrics...');
				const usages = await client.getAllProjectUsage();
				
				// Fetch projects to get internalIds
				const projects = await projectsClient.list();
				const projectMap = new Map(Array.isArray(projects) ? projects.map(p => [p.id, p.internalId]) : []);
				
				// Enrich usage data with internalIds
				const enrichedUsages = usages.map(usage => ({
					...usage,
					projectInternalId: usage.projectId ? projectMap.get(usage.projectId) : undefined
				}));
				
				succeedSpinner(spinner, `Fetched ${usages.length} project usage record(s)`);

				displayUsageList(enrichedUsages, 'project', config);
			} catch (error) {
				if (spinner) failSpinner(spinner, 'Failed to fetch usage metrics');
				throw error;
			}
		});

	// Institution subcommand - get specific institution's usage
	command
		.command('institution <institutionId>')
		.description('View usage summary for a specific institution')
		.action(async (institutionId: string, _options, cmd) => {
			const opts = cmd.optsWithGlobals();
			const config: CliConfig = opts._config;
			const client: UsageMetricsClient = opts._clients.usageMetrics;

			const id = parseInt(institutionId, 10);
			if (isNaN(id)) {
				throw new Error('Institution ID must be a number');
			}

			let spinner: Ora | null = null;
			try {
				spinner = startSpinner(`Fetching usage metrics for institution ${id}...`);
				const usage = await client.getInstitutionUsage(id);
				succeedSpinner(spinner, 'Usage metrics retrieved');

				displayUsage(usage, config);
			} catch (error) {
				if (spinner) failSpinner(spinner, 'Failed to fetch usage metrics');
				throw error;
			}
		});

	// Institutions subcommand - get all institutions' usage
	command
		.command('institutions')
		.description('View usage summaries for all institutions')
		.action(async (_options, cmd) => {
			const opts = cmd.optsWithGlobals();
			const config: CliConfig = opts._config;
			const client: UsageMetricsClient = opts._clients.usageMetrics;

			let spinner: Ora | null = null;
			try {
				spinner = startSpinner('Fetching usage metrics...');
				const usages = await client.getAllInstitutionUsage();
				succeedSpinner(spinner, `Fetched ${usages.length} institution usage record(s)`);

				displayUsageList(usages, 'institution', config);
			} catch (error) {
				if (spinner) failSpinner(spinner, 'Failed to fetch usage metrics');
				throw error;
			}
		});

	return command;
}

/**
 * Display a single usage summary
 *
 * @param usage - Usage summary to display
 * @param config - CLI configuration
 */
function displayUsage(usage: UsageSummary, config: CliConfig): void {
	const format = config.output.format;

	if (format === 'json') {
		console.log(formatOutput(usage, 'json', config.output));
		return;
	}

	if (format === 'csv') {
		console.log(formatOutput([usage], 'csv', config.output));
		return;
	}

	// Determine entity type and display name
	let entityType = 'Usage';
	let entityName = 'N/A';
	let entityId: number | undefined;

	if (usage.userId !== undefined) {
		entityType = 'User';
		entityName = usage.fullName || usage.email || 'N/A';
		entityId = usage.userId;
	} else if (usage.projectId !== undefined) {
		entityType = 'Project';
		entityName = usage.projectName || 'N/A';
		entityId = usage.projectId;
	} else if (usage.institutionId !== undefined) {
		entityType = 'Institution';
		entityName = usage.institutionName || 'N/A';
		entityId = usage.institutionId;
	}

	// Table format - human-readable
	console.log(chalk.bold.cyan(`\n${entityType} Summary: ${entityName}\n`));

	const rows: Record<string, string | number>[] = [];

	// Entity info
	if (entityId !== undefined) {
		rows.push({ Metric: 'ID', Value: entityId });
	}

	if (usage.email) {
		rows.push({ Metric: 'Email', Value: usage.email });
	}

	if (usage.institutionName && usage.projectId !== undefined) {
		rows.push({ Metric: 'Institution', Value: usage.institutionName });
	}

	if (usage.administratorName) {
		rows.push({ Metric: 'Administrator', Value: usage.administratorName });
	}

	// User/project/institution counts
	if (usage.totalUsers !== undefined) {
		rows.push({ Metric: 'Total Users', Value: usage.totalUsers.toLocaleString() });
	}

	if (usage.activeUsers !== undefined) {
		rows.push({ Metric: 'Active Users', Value: usage.activeUsers.toLocaleString() });
	}

	if (usage.totalProjects !== undefined) {
		rows.push({ Metric: 'Total Projects', Value: usage.totalProjects.toLocaleString() });
	}

	if (usage.activeProjects !== undefined) {
		rows.push({ Metric: 'Active Projects', Value: usage.activeProjects.toLocaleString() });
	}

	// Pipeline metrics
	if (usage.totalPipelinesOwned !== undefined) {
		rows.push({ Metric: 'Pipelines Owned', Value: usage.totalPipelinesOwned.toLocaleString() });
	}

	if (usage.totalPipelines !== undefined) {
		rows.push({ Metric: 'Total Pipelines', Value: usage.totalPipelines.toLocaleString() });
	}

	if (usage.activePipelines !== undefined) {
		rows.push({ Metric: 'Active Pipelines', Value: usage.activePipelines.toLocaleString() });
	}

	if (usage.totalPipelineRuns !== undefined) {
		rows.push({ Metric: 'Pipeline Runs', Value: usage.totalPipelineRuns.toLocaleString() });
	}

	if (usage.successfulPipelineRuns !== undefined) {
		rows.push({ Metric: 'Successful Runs', Value: usage.successfulPipelineRuns.toLocaleString() });
	}

	if (usage.failedPipelineRuns !== undefined) {
		rows.push({ Metric: 'Failed Runs', Value: usage.failedPipelineRuns.toLocaleString() });
	}

	if (usage.totalPipelineRuntimeSeconds !== undefined) {
		rows.push({ Metric: 'Pipeline Runtime', Value: formatDuration(usage.totalPipelineRuntimeSeconds) });
	}

	if (usage.totalArtifactsProcessed !== undefined) {
		rows.push({ Metric: 'Artifacts Processed', Value: usage.totalArtifactsProcessed.toLocaleString() });
	}

	if (usage.totalRecordsIngested !== undefined) {
		rows.push({ Metric: 'Records Ingested', Value: usage.totalRecordsIngested.toLocaleString() });
	}

	// Automation metrics
	if (usage.totalAutomationsOwned !== undefined) {
		rows.push({ Metric: 'Automations Owned', Value: usage.totalAutomationsOwned.toLocaleString() });
	}

	if (usage.totalAutomations !== undefined) {
		rows.push({ Metric: 'Total Automations', Value: usage.totalAutomations.toLocaleString() });
	}

	if (usage.activeAutomations !== undefined) {
		rows.push({ Metric: 'Active Automations', Value: usage.activeAutomations.toLocaleString() });
	}

	if (usage.totalAutomationRuns !== undefined) {
		rows.push({ Metric: 'Automation Runs', Value: usage.totalAutomationRuns.toLocaleString() });
	}

	if (usage.successfulAutomationRuns !== undefined) {
		rows.push({ Metric: 'Successful Auto Runs', Value: usage.successfulAutomationRuns.toLocaleString() });
	}

	if (usage.failedAutomationRuns !== undefined) {
		rows.push({ Metric: 'Failed Auto Runs', Value: usage.failedAutomationRuns.toLocaleString() });
	}

	if (usage.totalAutomationRuntimeSeconds !== undefined) {
		rows.push({ Metric: 'Automation Runtime', Value: formatDuration(usage.totalAutomationRuntimeSeconds) });
	}

	// Connection metrics
	if (usage.totalConnections !== undefined) {
		rows.push({ Metric: 'Total Connections', Value: usage.totalConnections.toLocaleString() });
	}

	// LLM metrics
	if (usage.totalLlmRequests !== undefined) {
		rows.push({ Metric: 'LLM Requests', Value: usage.totalLlmRequests.toLocaleString() });
	}

	if (usage.totalPromptTokens !== undefined) {
		rows.push({ Metric: 'Prompt Tokens', Value: usage.totalPromptTokens.toLocaleString() });
	}

	if (usage.totalCompletionTokens !== undefined) {
		rows.push({ Metric: 'Completion Tokens', Value: usage.totalCompletionTokens.toLocaleString() });
	}

	if (usage.totalTokens !== undefined) {
		rows.push({ Metric: 'Total Tokens', Value: usage.totalTokens.toLocaleString() });
	}

	if (usage.totalLlmCost !== undefined) {
		rows.push({ Metric: 'LLM Cost', Value: `$${usage.totalLlmCost.toFixed(2)}` });
	}

	// Activity timestamp
	if (usage.lastActivityDate) {
		rows.push({ Metric: 'Last Activity', Value: new Date(usage.lastActivityDate).toLocaleString() });
	}

	console.log(formatTable(rows, { colors: config.output.colors }));
}

/**
 * Display a list of usage summaries
 *
 * @param usages - Array of usage summaries
 * @param entityType - Type of entities (user, project, institution)
 * @param config - CLI configuration
 */
function displayUsageList(usages: UsageSummary[], entityType: string, config: CliConfig): void {
	const format = config.output.format;

	if (format === 'json') {
		console.log(formatOutput(usages, 'json', config.output));
		return;
	}

	if (format === 'csv') {
		console.log(formatOutput(usages, 'csv', config.output));
		return;
	}

	// Table format
	console.log(chalk.bold.cyan(`\n${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Usage Metrics\n`));

	if (!usages || usages.length === 0) {
		console.log(chalk.yellow(`No ${entityType} usage data found.`));
		return;
	}

	console.log(chalk.gray(`Found ${usages.length} ${entityType}(s)\n`));

	// Extract common fields for table display based on entity type
	const rows = usages.map((usage) => {
		// Determine ID and Name based on entity type
		let id: number | string = 'N/A';
		let name = 'N/A';
		let isUser = false;

		if (usage.userId !== undefined) {
			id = usage.userId;
			name = usage.fullName || usage.email || 'N/A';
			isUser = true;
		} else if (usage.projectId !== undefined) {
			// Use internalId if available, otherwise fall back to numeric ID
			id = usage.projectInternalId || usage.projectId;
			name = usage.projectName || 'N/A';
		} else if (usage.institutionId !== undefined) {
			id = usage.institutionId;
			name = usage.institutionName || 'N/A';
		}

		// For users, show run counts; for projects/institutions, show runtime
		if (isUser) {
			return {
				ID: id,
				Name: name,
				'Pipeline Runs': usage.totalPipelineRuns?.toLocaleString() || '0',
				'Auto Runs': usage.totalAutomationRuns?.toLocaleString() || '0',
				'LLM Requests': usage.totalLlmRequests?.toLocaleString() || '0',
				'Total Tokens': usage.totalTokens?.toLocaleString() || '0',
				'LLM Cost': usage.totalLlmCost !== undefined ? `$${usage.totalLlmCost.toFixed(2)}` : '$0.00',
				'Last Activity': usage.lastActivityDate ? new Date(usage.lastActivityDate).toLocaleDateString() : 'N/A'
			};
		} else {
			// Projects and Institutions - show runtime instead of run counts
			return {
				ID: id,
				Name: name,
				'Pipeline Time': usage.totalPipelineRuntimeSeconds !== undefined
					? formatDuration(usage.totalPipelineRuntimeSeconds)
					: '0s',
				'Auto Time': usage.totalAutomationRuntimeSeconds !== undefined
					? formatDuration(usage.totalAutomationRuntimeSeconds)
					: '0s',
				'LLM Requests': usage.totalLlmRequests?.toLocaleString() || '0',
				'Total Tokens': usage.totalTokens?.toLocaleString() || '0',
				'LLM Cost': usage.totalLlmCost !== undefined ? `$${usage.totalLlmCost.toFixed(2)}` : '$0.00',
				'Last Activity': usage.lastActivityDate ? new Date(usage.lastActivityDate).toLocaleDateString() : 'N/A'
			};
		}
	});

	console.log(formatTable(rows, { colors: config.output.colors }));
}
