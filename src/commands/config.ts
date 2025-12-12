/**
 * Config Command - Display current CLI configuration
 *
 * Allows users to view the current merged configuration from all sources
 * (defaults, config file, environment variables, and CLI flags).
 *
 * Usage:
 *   databasin config
 *
 * @module commands/config
 */

import { Command } from 'commander';
import type { CliConfig } from '../types/config.ts';

/**
 * Display current configuration
 *
 * Dumps the current merged configuration to stdout in JSON format.
 *
 * @param _options - Command options (unused)
 * @param command - Commander command instance
 */
async function showConfig(_options: any, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;

	// Output the config as JSON to stdout
	console.log(JSON.stringify(config, null, 2));
}

/**
 * Create config command
 *
 * Creates the main 'config' command to display current configuration.
 *
 * @returns Configured Commander command
 */
export function createConfigCommand(): Command {
	const configCmd = new Command('config')
		.description('Display current CLI configuration')
		.action(showConfig)
		.addHelpText(
			'after',
			`
Examples:
  $ databasin config                       # Show current configuration
  $ databasin config > config.json         # Save configuration to file
  $ databasin config | jq .apiUrl          # Extract specific values

The output shows the merged configuration from all sources:
  1. Default values (lowest priority)
  2. Config file (~/.databasin/config.json)
  3. Environment variables (DATABASIN_*)
  4. CLI flags (highest priority)

Configuration file location:
  ~/.databasin/config.json
`
		);

	return configCmd;
}
