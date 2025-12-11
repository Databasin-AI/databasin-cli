/**
 * Context Command - Manage CLI working context
 *
 * Displays the current working context (project, connector) and allows clearing it.
 *
 * Usage:
 *   databasin context              # Show current context
 *   databasin context clear [key]  # Clear context
 *
 * @module commands/context
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadContext, clearContext } from '../utils/context.ts';
import { ValidationError } from '../utils/errors.ts';

/**
 * Display current context
 *
 * Shows all active context values with formatting.
 */
function displayContext(): void {
	const context = loadContext();

	if (!context.project && !context.connector) {
		console.log(chalk.yellow('No working context set.'));
		console.log('\nSet context with:');
		console.log('  databasin set project <projectId>');
		console.log('  databasin set connector <connectorId>');
		return;
	}

	console.log(chalk.bold('Working Context:'));
	if (context.project) {
		console.log(`  ${chalk.cyan('Project:')} ${context.project}`);
	}
	if (context.connector) {
		console.log(`  ${chalk.cyan('Connector:')} ${context.connector}`);
	}
	if (context.updatedAt) {
		const date = new Date(context.updatedAt);
		console.log(`  ${chalk.dim('Last updated:')} ${date.toLocaleString()}`);
	}
}

/**
 * Clear context
 *
 * Clears all context or a specific context key.
 *
 * @param key - Optional context key to clear
 */
function clearContextAction(key?: string): void {
	// Validate key if provided
	if (key && key !== 'project' && key !== 'connector') {
		throw new ValidationError(
			`Invalid context key: ${key}`,
			'key',
			['Must be "project" or "connector"'],
			['databasin context clear project', 'databasin context clear connector', 'databasin context clear']
		);
	}

	clearContext(key as 'project' | 'connector' | undefined);

	if (key) {
		console.log(chalk.green(`✓ Cleared ${chalk.cyan(key)} from context`));
	} else {
		console.log(chalk.green('✓ Cleared all context'));
	}
}

/**
 * Create context command
 *
 * Creates the main 'context' command with display and clear subcommands.
 *
 * @returns Configured Commander command
 */
export function createContextCommand(): Command {
	const contextCmd = new Command('context')
		.description('Manage working context')
		.action(displayContext)
		.addHelpText(
			'after',
			`
Examples:
  $ databasin context                   # Show current context
  $ databasin context clear             # Clear all context
  $ databasin context clear project     # Clear only project context
  $ databasin context clear connector   # Clear only connector context

Context is stored in ~/.databasin/context.json and persists across sessions.
Use 'databasin set' to set context values.
`
		);

	// Clear subcommand
	contextCmd
		.command('clear [key]')
		.description('Clear working context (or specific key: project, connector)')
		.action(clearContextAction);

	return contextCmd;
}
