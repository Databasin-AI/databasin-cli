/**
 * Error Enhancement Utilities
 *
 * Enhances errors with command suggestions and helpful messages.
 * This module is separate from errors.ts to avoid circular dependencies.
 *
 * @module utils/error-enhancement
 */

import { CliError } from './errors.ts';
import { findCommandSuggestions, formatSuggestionMessage } from './command-suggestions.ts';

/**
 * Enhance error with command suggestions if applicable
 *
 * Takes a Commander.js error and enhances it with helpful suggestions
 * for typos or missing commands. Used by the global error handler.
 *
 * @param error - Error to enhance (typically from Commander.js)
 * @param commandAttempted - The command string that was attempted
 * @returns Enhanced error or original error if not applicable
 *
 * @example
 * ```typescript
 * try {
 *   program.parse();
 * } catch (error) {
 *   const enhanced = enhanceError(error, 'connector list');
 *   console.error(enhanced);
 * }
 * ```
 */
export function enhanceError(error: unknown, commandAttempted?: string): unknown {
	// Only enhance standard Error instances (not our custom CliErrors)
	if (!(error instanceof Error) || error instanceof CliError) {
		return error;
	}

	const message = error.message.toLowerCase();

	// Check for unknown command errors from Commander.js
	if (message.includes('unknown command') || message.includes('unknown option')) {
		// Try to extract the unknown command from the error message
		// Commander.js format: "error: unknown command 'connector'"
		const match = error.message.match(/unknown (?:command|option)\s+'([^']+)'/i);
		if (match) {
			const unknownCommand = match[1];

			const suggestions = findCommandSuggestions(unknownCommand);
			const enhancedMessage = formatSuggestionMessage(unknownCommand, suggestions);

			// Create a new CliError with the enhanced message
			return new CliError(enhancedMessage, 1);
		}
	}

	// Check for missing argument/option errors
	if (message.includes('missing required argument') || message.includes('required option')) {
		// Commander.js reports these differently, try to provide help
		const enhancedMessage = `${error.message}\n\nRun the command with --help to see usage information.`;
		return new CliError(enhancedMessage, 1);
	}

	return error;
}
