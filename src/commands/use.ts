/**
 * Use Command - Set working context for CLI commands
 *
 * Allows users to set default project and connector context that will be used
 * by subsequent commands unless overridden by explicit flags.
 *
 * Usage:
 *   databasin use project <projectId>
 *   databasin use connector <connectorId>
 *
 * @module commands/use
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { setContext, loadContext } from '../utils/context.ts';
import { ValidationError } from '../utils/errors.ts';
import { startSpinner, succeedSpinner, failSpinner } from '../utils/progress.ts';
import type { ProjectsClient } from '../client/projects.ts';
import type { ConnectorsClient } from '../client/connectors.ts';

/**
 * Set project context
 *
 * Validates that the project exists and the user has access before setting context.
 *
 * @param projectId - Project ID to set as context
 * @param options - Command options
 * @param command - Commander command instance
 */
async function setProjectContext(projectId: string, options: any, command: Command): Promise<void> {
	const spinner = startSpinner('Validating project...');

	try {
		const opts = command.optsWithGlobals();
		const client: ProjectsClient = opts._clients.projects;

		// Validate project exists by fetching it
		const project = await client.get(projectId);

		setContext('project', projectId);
		succeedSpinner(spinner, `Working project set to: ${chalk.cyan((project as any).projectName)} (${chalk.dim(projectId)})`);
	} catch (error) {
		failSpinner(spinner, 'Project not found');
		throw new ValidationError(
			`Project "${projectId}" does not exist or you don't have access`,
			'projectId',
			['Verify the project ID is correct and you have access to the project'],
			['databasin projects list', 'databasin projects list --full']
		);
	}
}

/**
 * Set connector context
 *
 * Validates that the connector exists and the user has access before setting context.
 *
 * @param connectorId - Connector ID to set as context
 * @param options - Command options
 * @param command - Commander command instance
 */
async function setConnectorContext(connectorId: string, options: any, command: Command): Promise<void> {
	const spinner = startSpinner('Validating connector...');

	try {
		const opts = command.optsWithGlobals();
		const client: ConnectorsClient = opts._clients.connectors;

		// Validate connector exists by fetching it
		const connector = await client.get(connectorId);

		setContext('connector', connectorId);
		succeedSpinner(
			spinner,
			`Working connector set to: ${chalk.cyan((connector as any).connectorName)} (${chalk.dim(connectorId)})`
		);
	} catch (error) {
		failSpinner(spinner, 'Connector not found');
		throw new ValidationError(
			`Connector "${connectorId}" does not exist or you don't have access`,
			'connectorId',
			['Verify the connector ID is correct and you have access to the connector'],
			['databasin connectors list --full']
		);
	}
}

/**
 * Create use command
 *
 * Creates the main 'use' command with subcommands for project and connector.
 *
 * @returns Configured Commander command
 */
export function createUseCommand(): Command {
	const useCmd = new Command('use')
		.description('Set working context for commands')
		.addHelpText(
			'after',
			`
Examples:
  $ databasin use project abc123        # Set working project
  $ databasin use connector 5459        # Set working connector
  $ databasin context                   # View current context
  $ databasin context clear             # Clear all context

Context allows you to set defaults for commands without repeating flags:
  $ databasin use project abc123
  $ databasin pipelines list            # Uses project abc123
  $ databasin connectors list           # Uses project abc123

Context is stored in ~/.databasin/context.json and persists across sessions.
`
		);

	// Project subcommand
	useCmd
		.command('project <projectId>')
		.description('Set the working project context')
		.action(setProjectContext);

	// Connector subcommand
	useCmd
		.command('connector <connectorId>')
		.description('Set the working connector context')
		.action(setConnectorContext);

	return useCmd;
}
