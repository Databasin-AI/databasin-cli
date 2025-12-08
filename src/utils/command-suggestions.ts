/**
 * Command Suggestion Engine
 *
 * Provides "did you mean?" suggestions for unknown commands and typos.
 * Uses fuzzy matching and Levenshtein distance to suggest similar commands.
 *
 * @module utils/command-suggestions
 */

import { findTopMatches, stringSimilarity } from './string-similarity.ts';

/**
 * Command definition with name, description, and usage examples
 */
export interface CommandDefinition {
	/** Command name (e.g., "connectors list") */
	name: string;
	/** Brief description of what the command does */
	description: string;
	/** Usage examples (optional) */
	examples?: string[];
	/** Aliases for this command (optional) */
	aliases?: string[];
}

/**
 * All available DataBasin CLI commands with descriptions and examples
 *
 * This list should be kept in sync with actual commands defined in src/index.ts
 */
export const AVAILABLE_COMMANDS: CommandDefinition[] = [
	// Auth commands
	{
		name: 'auth login',
		description: 'Login via browser and save authentication token',
		examples: ['databasin auth login', 'databasin auth login --port 3333']
	},
	{
		name: 'auth whoami',
		description: 'Show current user context',
		examples: ['databasin auth whoami']
	},
	{
		name: 'auth verify',
		description: 'Verify authentication token is valid',
		examples: ['databasin auth verify']
	},
	{
		name: 'login',
		description: 'Login via browser (alias for auth login)',
		examples: ['databasin login'],
		aliases: ['auth login']
	},

	// Project commands
	{
		name: 'projects list',
		description: 'List all projects',
		examples: ['databasin projects list', 'databasin projects list --json']
	},
	{
		name: 'projects get',
		description: 'Get project details',
		examples: ['databasin projects get N1r8Do', 'databasin projects get --fields name,status']
	},
	{
		name: 'projects users',
		description: 'List users in a project',
		examples: ['databasin projects users N1r8Do']
	},
	{
		name: 'projects stats',
		description: 'Show project statistics',
		examples: ['databasin projects stats N1r8Do']
	},

	// Connector commands
	{
		name: 'connectors list',
		description: 'List connectors',
		examples: [
			'databasin connectors list',
			'databasin connectors list --full',
			'databasin connectors list --project N1r8Do'
		]
	},
	{
		name: 'connectors get',
		description: 'Get connector details',
		examples: ['databasin connectors get 5459', 'databasin connectors get --fields name,type']
	},
	{
		name: 'connectors create',
		description: 'Create a new connector',
		examples: ['databasin connectors create connector.json', 'databasin connectors create --project N1r8Do']
	},
	{
		name: 'connectors update',
		description: 'Update connector configuration',
		examples: ['databasin connectors update 5459 update.json']
	},
	{
		name: 'connectors delete',
		description: 'Delete a connector',
		examples: ['databasin connectors delete 5459', 'databasin connectors delete 5459 --yes']
	},
	{
		name: 'connectors test',
		description: 'Test connector connection',
		examples: ['databasin connectors test 5459']
	},
	{
		name: 'connectors config',
		description: 'Get connector configuration details',
		examples: [
			'databasin connectors config Postgres',
			'databasin connectors config --all',
			'databasin connectors config Postgres --screens'
		]
	},

	// Pipeline commands
	{
		name: 'pipelines list',
		description: 'List pipelines in a project',
		examples: ['databasin pipelines list --project N1r8Do', 'databasin pipelines list --project N1r8Do --status active']
	},
	{
		name: 'pipelines get',
		description: 'Get pipeline details',
		examples: ['databasin pipelines get 123', 'databasin pipelines get --fields name,status']
	},
	{
		name: 'pipelines create',
		description: 'Create a new pipeline',
		examples: ['databasin pipelines create pipeline.json', 'databasin pipelines create --project N1r8Do']
	},
	{
		name: 'pipelines update',
		description: 'Update pipeline configuration',
		examples: ['databasin pipelines update 123 update.json']
	},
	{
		name: 'pipelines delete',
		description: 'Delete a pipeline',
		examples: ['databasin pipelines delete 123', 'databasin pipelines delete 123 --yes']
	},
	{
		name: 'pipelines run',
		description: 'Execute a pipeline',
		examples: ['databasin pipelines run 123', 'databasin pipelines run 123 --wait']
	},
	{
		name: 'pipelines logs',
		description: 'View pipeline execution logs',
		examples: ['databasin pipelines logs 123', 'databasin pipelines logs 123 --limit 50']
	},
	{
		name: 'pipelines wizard',
		description: 'Interactive pipeline creation wizard',
		examples: ['databasin pipelines wizard', 'databasin pipelines wizard --project N1r8Do']
	},

	// SQL commands
	{
		name: 'sql catalogs',
		description: 'List database catalogs',
		examples: ['databasin sql catalogs 5459']
	},
	{
		name: 'sql schemas',
		description: 'List database schemas',
		examples: ['databasin sql schemas 5459', 'databasin sql schemas 5459 --catalog config']
	},
	{
		name: 'sql tables',
		description: 'List database tables',
		examples: ['databasin sql tables 5459', 'databasin sql tables 5459 --schema current']
	},
	{
		name: 'sql exec',
		description: 'Execute SQL query',
		examples: [
			'databasin sql exec 5459 "SELECT * FROM users LIMIT 10"',
			'databasin sql exec 5459 query.sql'
		]
	},

	// Automation commands
	{
		name: 'automations list',
		description: 'List automations',
		examples: ['databasin automations list --project N1r8Do']
	},
	{
		name: 'automations get',
		description: 'Get automation details',
		examples: ['databasin automations get 456']
	},
	{
		name: 'automations run',
		description: 'Execute an automation',
		examples: ['databasin automations run 456']
	},

	// API commands
	{
		name: 'api get',
		description: 'Call API GET endpoint',
		examples: ['databasin api GET /api/health', 'databasin api GET /api/my/projects']
	},
	{
		name: 'api post',
		description: 'Call API POST endpoint',
		examples: ['databasin api POST /api/connectors data.json']
	},
	{
		name: 'api put',
		description: 'Call API PUT endpoint',
		examples: ['databasin api PUT /api/connectors/5459 update.json']
	},
	{
		name: 'api delete',
		description: 'Call API DELETE endpoint',
		examples: ['databasin api DELETE /api/connectors/5459']
	},

	// Utility commands
	{
		name: 'update',
		description: 'Update CLI to latest version',
		examples: ['databasin update', 'databasin update --check']
	},
	{
		name: 'completion install',
		description: 'Install shell completions',
		examples: ['databasin completion install bash', 'databasin completion install zsh']
	},
	{
		name: 'docs',
		description: 'View documentation',
		examples: ['databasin docs', 'databasin docs automations-quickstart']
	}
];

/**
 * Suggestion result with command name, reason, and examples
 */
export interface Suggestion {
	/** Suggested command name */
	command: string;
	/** Brief description */
	description: string;
	/** Usage examples */
	examples: string[];
	/** Similarity score (0-1) */
	score: number;
}

/**
 * Find command suggestions for an unknown command
 *
 * Uses fuzzy matching to find similar commands and returns top suggestions.
 * Handles multi-word commands (e.g., "connectors list").
 *
 * @param unknownCommand - The command that was not found
 * @param limit - Maximum number of suggestions to return (default: 3)
 * @param threshold - Minimum similarity threshold (default: 0.3)
 * @returns Array of suggestions sorted by similarity
 *
 * @example
 * ```typescript
 * findCommandSuggestions('connector list')
 * // [{ command: 'connectors list', description: '...', examples: [...], score: 0.95 }]
 *
 * findCommandSuggestions('pipelne')
 * // [{ command: 'pipelines list', description: '...', examples: [...], score: 0.85 }, ...]
 * ```
 */
export function findCommandSuggestions(
	unknownCommand: string,
	limit: number = 3,
	threshold: number = 0.3
): Suggestion[] {
	// Extract all command names (including aliases)
	const commandNames: string[] = [];
	const commandMap = new Map<string, CommandDefinition>();

	for (const cmd of AVAILABLE_COMMANDS) {
		commandNames.push(cmd.name);
		commandMap.set(cmd.name, cmd);

		// Add aliases
		if (cmd.aliases) {
			for (const alias of cmd.aliases) {
				commandNames.push(alias);
				commandMap.set(alias, cmd);
			}
		}
	}

	// Find top matches
	const matches = findTopMatches(unknownCommand, commandNames, { limit, threshold });

	// Convert to Suggestion objects
	const suggestions: Suggestion[] = matches
		.map((match) => {
			const cmd = commandMap.get(match.value);
			if (!cmd) {
				return null;
			}

			return {
				command: cmd.name,
				description: cmd.description,
				examples: cmd.examples || [],
				score: match.score
			};
		})
		.filter((s): s is Suggestion => s !== null);

	return suggestions;
}

/**
 * Format command suggestions as a user-friendly error message
 *
 * Creates a formatted "did you mean?" message with suggestions and examples.
 *
 * @param unknownCommand - The command that was not found
 * @param suggestions - Array of suggestions to display
 * @returns Formatted error message string
 *
 * @example
 * ```typescript
 * const suggestions = findCommandSuggestions('connector list');
 * formatSuggestionMessage('connector list', suggestions);
 * // Returns formatted message:
 * // Unknown command 'connector list'
 * //
 * // Did you mean?
 * //   connectors list    # List connectors
 * //     $ databasin connectors list
 * //     $ databasin connectors list --full
 * ```
 */
export function formatSuggestionMessage(unknownCommand: string, suggestions: Suggestion[]): string {
	if (suggestions.length === 0) {
		return `Unknown command '${unknownCommand}'\n\nRun 'databasin --help' to see all available commands.`;
	}

	let message = `Unknown command '${unknownCommand}'\n\nDid you mean?\n`;

	for (const suggestion of suggestions) {
		// Command name and description
		message += `  ${suggestion.command.padEnd(20)} # ${suggestion.description}\n`;

		// Show up to 2 examples
		const examples = suggestion.examples.slice(0, 2);
		for (const example of examples) {
			message += `    $ ${example}\n`;
		}
	}

	message += `\nRun 'databasin --help' for all commands.`;

	return message;
}

/**
 * Suggest the correct subcommand when base command is used incorrectly
 *
 * For example, if user runs "databasin connectors" without a subcommand,
 * suggest "connectors list" or "connectors --help".
 *
 * @param baseCommand - The base command that was run (e.g., "connectors")
 * @returns Suggestion message
 *
 * @example
 * ```typescript
 * suggestSubcommand('connectors')
 * // "Missing subcommand for 'connectors'. Try:\n  databasin connectors list\n  ..."
 * ```
 */
export function suggestSubcommand(baseCommand: string): string {
	// Find commands that start with the base command
	const subcommands = AVAILABLE_COMMANDS.filter((cmd) => cmd.name.startsWith(baseCommand + ' '));

	if (subcommands.length === 0) {
		return `Unknown command '${baseCommand}'\n\nRun 'databasin --help' to see all available commands.`;
	}

	let message = `Missing subcommand for '${baseCommand}'. Try:\n`;

	// Show up to 5 subcommands
	const topSubcommands = subcommands.slice(0, 5);
	for (const cmd of topSubcommands) {
		message += `  databasin ${cmd.name.padEnd(25)} # ${cmd.description}\n`;
	}

	message += `\nRun 'databasin ${baseCommand} --help' for all ${baseCommand} subcommands.`;

	return message;
}

/**
 * Check if a command exists in the available commands list
 *
 * @param commandName - The command name to check (e.g., "connectors list")
 * @returns True if command exists, false otherwise
 */
export function isValidCommand(commandName: string): boolean {
	return AVAILABLE_COMMANDS.some(
		(cmd) => cmd.name === commandName || cmd.aliases?.includes(commandName)
	);
}

/**
 * Get command definition by name or alias
 *
 * @param commandName - The command name or alias to look up
 * @returns Command definition or null if not found
 */
export function getCommandDefinition(commandName: string): CommandDefinition | null {
	return (
		AVAILABLE_COMMANDS.find(
			(cmd) => cmd.name === commandName || cmd.aliases?.includes(commandName)
		) || null
	);
}
