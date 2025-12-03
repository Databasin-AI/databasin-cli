#!/usr/bin/env bun

/**
 * Databasin CLI - Main Entry Point
 *
 * Command-line interface for Databasin API operations.
 * Uses Commander.js for command parsing and routing.
 *
 * Configuration Priority:
 * 1. CLI flags (highest)
 * 2. Environment variables
 * 3. Config file (~/.databasin/config.json)
 * 4. Defaults (lowest)
 *
 * @module cli
 */

import { Command } from 'commander';
import chalk from 'chalk';
import packageJson from '../package.json' assert { type: 'json' };

import { loadConfig } from './config.ts';
import { createAllClients } from './client/index.ts';
import { formatError, getExitCode, CliError } from './utils/errors.ts';
import type { CliConfig, PartialCliConfig } from './types/config.ts';
import { setGlobalFlags } from './utils/progress.ts';
import { createAuthCommand } from './commands/auth.ts';
import { createProjectsCommand } from './commands/projects.ts';
import { createConnectorsCommand } from './commands/connectors.ts';
import { createPipelinesCommand } from './commands/pipelines.ts';
import { createSqlCommand } from './commands/sql.ts';
import { createAutomationsCommand } from './commands/automations.ts';
import { createApiCommand } from './commands/api.ts';
import { createUpdateCommand } from './commands/update.ts';

// Get package.json version for --version flag (embedded at build time)
const VERSION = packageJson.version;

/**
 * Create main CLI program
 *
 * Sets up Commander with global options and command structure.
 * Parses CLI options and builds configuration before command execution.
 *
 * @returns Configured Commander program
 */
function createProgram(): Command {
	const program = new Command();

	// Program metadata
	program
		.name('databasin')
		.version(VERSION, '-V, --version', 'Display CLI version')
		.description('Databasin CLI - Manage your data integration platform from the command line')
		.addHelpText(
			'after',
			`
Examples:
  $ databasin auth whoami
  $ databasin projects list
  $ databasin connectors list --full --fields id,name,type
  $ databasin pipelines list --project proj-123
  $ databasin sql exec conn-123 "SELECT * FROM users LIMIT 10"
  $ databasin automations run auto-456

Environment Variables:
  DATABASIN_API_URL         Override API base URL
  DATABASIN_TOKEN           Authentication token
  DEBUG or DATABASIN_DEBUG  Enable debug mode with stack traces
  NO_COLOR                  Disable colored output

Configuration:
  Config file: ~/.databasin/config.json
  Token file: ~/.databasin/.token or ./.token

Documentation:
  https://github.com/databasin/cli#readme
  https://docs.databasin.com/cli

For more help on a specific command:
  databasin <command> --help
`
		);

	// Global options (apply to all commands)
	program
		.option('--api-url <url>', 'Databasin API base URL')
		.option('--token <token>', 'Authentication token (overrides stored token)')
		.option('--json', 'Output in JSON format')
		.option('--csv', 'Output in CSV format')
		.option('--verbose', 'Enable verbose logging')
		.option('--no-color', 'Disable colored output')
		.option('--debug', 'Enable debug mode with stack traces');

	// Hook: Before each command execution, parse global options and build config
	program.hook('preAction', (thisCommand) => {
		// Parse global options from the command tree
		const opts = thisCommand.optsWithGlobals();

		// Build CLI options from flags
		const cliOptions: PartialCliConfig = {};

		if (opts.apiUrl) {
			cliOptions.apiUrl = opts.apiUrl;
		}

		if (opts.json || opts.csv) {
			cliOptions.output = {
				format: opts.json ? 'json' : 'csv',
				colors: opts.color !== false, // Commander converts --no-color to color: false
				verbose: opts.verbose || false
			};
		}

		if (opts.verbose !== undefined) {
			cliOptions.output = {
				...cliOptions.output,
				verbose: opts.verbose
			};
		}

		if (opts.color === false) {
			cliOptions.output = {
				...cliOptions.output,
				colors: false
			};
		}

		if (opts.debug) {
			cliOptions.debug = true;
		}

		// Load complete config from all sources
		let config: CliConfig;
		try {
			config = loadConfig(cliOptions);
		} catch (error) {
			// Config errors should be shown even before commands run
			console.error(chalk.red(formatError(error)));
			process.exit(1);
		}

		// Create API clients with this config
		const clients = createAllClients(config);

		// Store config and clients in command context for subcommands to access
		thisCommand.setOptionValue('_config', config);
		thisCommand.setOptionValue('_clients', clients);

		// Store token override if provided via flag
		if (opts.token) {
			thisCommand.setOptionValue('_tokenOverride', opts.token);
		}

		// Configure chalk based on color preference
		if (!config.output.colors) {
			chalk.level = 0; // Disable colors
		}

		// Set global flags for logging utilities
		setGlobalFlags({
			verbose: config.output.verbose,
			debug: config.debug || process.env.DEBUG === 'true' || process.env.DATABASIN_DEBUG === 'true',
			noColor: !config.output.colors
		});
	});

	return program;
}

/**
 * Register all subcommands
 *
 * Creates placeholder subcommands for each resource type.
 * Actual command implementations will be added in subsequent tasks.
 *
 * @param program - Commander program to register commands with
 */
function registerCommands(program: Command): void {
	// Auth commands
	program.addCommand(createAuthCommand());

	// Projects commands - IMPLEMENTED
	program.addCommand(createProjectsCommand());

	// Connectors commands - IMPLEMENTED
	program.addCommand(createConnectorsCommand());

	// Pipelines commands - IMPLEMENTED
	program.addCommand(createPipelinesCommand());

	// SQL commands - IMPLEMENTED
	program.addCommand(createSqlCommand());

	// Automations commands - IMPLEMENTED
	program.addCommand(createAutomationsCommand());

	// API commands - IMPLEMENTED
	program.addCommand(createApiCommand());

	// Update command - Self-update functionality
	program.addCommand(createUpdateCommand());
}

/**
 * Main CLI entry point
 *
 * Creates and configures the CLI program, then parses command-line arguments.
 * Handles global error catching with user-friendly messages.
 */
async function main(): Promise<void> {
	try {
		const program = createProgram();
		registerCommands(program);

		// Parse command-line arguments
		await program.parseAsync(process.argv);
	} catch (error) {
		// Global error handler for uncaught errors
		// CliErrors are already formatted, others need wrapping
		if (error instanceof CliError) {
			console.error('\n' + chalk.red(formatError(error)));
		} else if (error instanceof Error) {
			console.error('\n' + chalk.red('Error: ' + error.message));

			// Show stack trace in debug mode
			if (process.env.DATABASIN_DEBUG === 'true') {
				console.error('\nDebug stack trace:');
				console.error(chalk.dim(error.stack));
			}
		} else {
			console.error('\n' + chalk.red('Unknown error: ' + String(error)));
		}

		// Exit with appropriate code
		const exitCode = getExitCode(error);
		process.exit(exitCode);
	}
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
	console.error('\n' + chalk.red('Unhandled Promise Rejection:'));
	console.error(chalk.red(formatError(reason)));

	if (process.env.DATABASIN_DEBUG === 'true' && reason instanceof Error) {
		console.error('\nDebug stack trace:');
		console.error(chalk.dim(reason.stack));
	}

	process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
	console.error('\n' + chalk.red('Uncaught Exception:'));
	console.error(chalk.red(formatError(error)));

	if (process.env.DATABASIN_DEBUG === 'true') {
		console.error('\nDebug stack trace:');
		console.error(chalk.dim(error.stack));
	}

	process.exit(1);
});

// Run the CLI
main();
