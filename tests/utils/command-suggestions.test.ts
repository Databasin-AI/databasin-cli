/**
 * Tests for Command Suggestion Engine
 *
 * Validates command suggestion, formatting, and "did you mean?" functionality.
 */

import { describe, test, expect } from 'bun:test';
import {
	findCommandSuggestions,
	formatSuggestionMessage,
	suggestSubcommand,
	isValidCommand,
	getCommandDefinition,
	AVAILABLE_COMMANDS
} from '../../src/utils/command-suggestions';

describe('AVAILABLE_COMMANDS', () => {
	test('contains expected core commands', () => {
		const commandNames = AVAILABLE_COMMANDS.map((cmd) => cmd.name);

		expect(commandNames).toContain('auth login');
		expect(commandNames).toContain('connectors list');
		expect(commandNames).toContain('pipelines list');
		expect(commandNames).toContain('projects list');
		expect(commandNames).toContain('sql exec');
	});

	test('all commands have required fields', () => {
		for (const cmd of AVAILABLE_COMMANDS) {
			expect(cmd.name).toBeDefined();
			expect(cmd.name.length).toBeGreaterThan(0);
			expect(cmd.description).toBeDefined();
			expect(cmd.description.length).toBeGreaterThan(0);
		}
	});

	test('all commands have examples', () => {
		for (const cmd of AVAILABLE_COMMANDS) {
			expect(cmd.examples).toBeDefined();
			expect(cmd.examples!.length).toBeGreaterThan(0);
		}
	});

	test('no duplicate command names', () => {
		const names = AVAILABLE_COMMANDS.map((cmd) => cmd.name);
		const uniqueNames = new Set(names);
		expect(names.length).toBe(uniqueNames.size);
	});
});

describe('findCommandSuggestions', () => {
	test('finds exact match', () => {
		const suggestions = findCommandSuggestions('connectors list');
		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions[0].command).toBe('connectors list');
		expect(suggestions[0].score).toBe(1);
	});

	test('finds close typo matches', () => {
		const suggestions = findCommandSuggestions('connector list'); // Missing 's'
		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions[0].command).toBe('connectors list');
		expect(suggestions[0].score).toBeGreaterThan(0.8);
	});

	test('finds matches for partial commands', () => {
		const suggestions = findCommandSuggestions('pipelines');
		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions[0].command).toContain('pipelines');
	});

	test('returns multiple suggestions sorted by score', () => {
		const suggestions = findCommandSuggestions('project', 3);

		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions.length).toBeLessThanOrEqual(3);

		// Verify scores are descending
		for (let i = 0; i < suggestions.length - 1; i++) {
			expect(suggestions[i].score).toBeGreaterThanOrEqual(suggestions[i + 1].score);
		}
	});

	test('respects limit parameter', () => {
		const suggestions = findCommandSuggestions('con', 2);
		expect(suggestions.length).toBeLessThanOrEqual(2);
	});

	test('respects threshold parameter', () => {
		const suggestions = findCommandSuggestions('xyz', 3, 0.8);
		// Very unlikely to find matches with 80% similarity for 'xyz'
		expect(suggestions.length).toBe(0);
	});

	test('uses default limit of 3', () => {
		const suggestions = findCommandSuggestions('list');
		expect(suggestions.length).toBeLessThanOrEqual(3);
	});

	test('uses default threshold of 0.3', () => {
		// This should find some matches with default low threshold
		const suggestions = findCommandSuggestions('con');
		expect(suggestions.length).toBeGreaterThan(0);
	});

	test('includes command description in results', () => {
		const suggestions = findCommandSuggestions('connectors list');
		expect(suggestions[0].description).toBeDefined();
		expect(suggestions[0].description.length).toBeGreaterThan(0);
	});

	test('includes command examples in results', () => {
		const suggestions = findCommandSuggestions('connectors list');
		expect(suggestions[0].examples).toBeDefined();
		expect(suggestions[0].examples.length).toBeGreaterThan(0);
	});

	test('handles unknown commands gracefully', () => {
		const suggestions = findCommandSuggestions('asdfghjkl');
		// Should return empty array or very few results
		expect(Array.isArray(suggestions)).toBe(true);
	});

	test('is case insensitive', () => {
		const suggestions = findCommandSuggestions('CONNECTORS LIST');
		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions[0].command).toBe('connectors list');
	});

	test('finds aliases', () => {
		const suggestions = findCommandSuggestions('login');
		expect(suggestions.length).toBeGreaterThan(0);
		// Should find both 'login' and 'auth login'
		const commands = suggestions.map((s) => s.command);
		expect(commands).toContain('login');
	});

	test('returns command definition even for alias matches', () => {
		const suggestions = findCommandSuggestions('login');
		const loginSuggestion = suggestions.find((s) => s.command === 'login');
		expect(loginSuggestion).toBeDefined();
		expect(loginSuggestion!.description).toBeDefined();
	});
});

describe('formatSuggestionMessage', () => {
	test('formats message with suggestions', () => {
		const suggestions = [
			{
				command: 'connectors list',
				description: 'List connectors',
				examples: ['databasin connectors list', 'databasin connectors list --full'],
				score: 0.95
			}
		];

		const message = formatSuggestionMessage('connector list', suggestions);

		expect(message).toContain('connector list');
		expect(message).toContain('Did you mean?');
		expect(message).toContain('connectors list');
		expect(message).toContain('List connectors');
		expect(message).toContain('databasin connectors list');
	});

	test('includes multiple suggestions', () => {
		const suggestions = [
			{
				command: 'connectors list',
				description: 'List connectors',
				examples: ['databasin connectors list'],
				score: 0.95
			},
			{
				command: 'connectors get',
				description: 'Get connector details',
				examples: ['databasin connectors get 5459'],
				score: 0.85
			}
		];

		const message = formatSuggestionMessage('connector', suggestions);

		expect(message).toContain('connectors list');
		expect(message).toContain('connectors get');
		expect(message).toContain('List connectors');
		expect(message).toContain('Get connector details');
	});

	test('limits examples to 2 per suggestion', () => {
		const suggestions = [
			{
				command: 'connectors list',
				description: 'List connectors',
				examples: [
					'databasin connectors list',
					'databasin connectors list --full',
					'databasin connectors list --project N1r8Do',
					'databasin connectors list --name postgres'
				],
				score: 0.95
			}
		];

		const message = formatSuggestionMessage('connector', suggestions);

		// Count number of examples shown (should be 2)
		const exampleCount = (message.match(/\$ databasin connectors list/g) || []).length;
		expect(exampleCount).toBe(2);
	});

	test('handles empty suggestions array', () => {
		const message = formatSuggestionMessage('asdfghjkl', []);

		expect(message).toContain('Unknown command');
		expect(message).toContain('asdfghjkl');
		expect(message).toContain('--help');
		expect(message).not.toContain('Did you mean?');
	});

	test('includes help suggestion', () => {
		const message = formatSuggestionMessage('unknown', []);
		expect(message).toContain('databasin --help');
	});

	test('formats command and description with padding', () => {
		const suggestions = [
			{
				command: 'auth login',
				description: 'Login via browser',
				examples: ['databasin auth login'],
				score: 0.9
			}
		];

		const message = formatSuggestionMessage('login', suggestions);

		// Should have padding between command name and description
		expect(message).toMatch(/auth login\s+# Login via browser/);
	});
});

describe('suggestSubcommand', () => {
	test('suggests available subcommands', () => {
		const message = suggestSubcommand('connectors');

		expect(message).toContain('Missing subcommand');
		expect(message).toContain('connectors list');
		expect(message).toContain('connectors get');
		expect(message).toContain('connectors create');
	});

	test('includes subcommand descriptions', () => {
		const message = suggestSubcommand('pipelines');

		expect(message).toContain('List pipelines');
		expect(message).toContain('Get pipeline details');
	});

	test('limits suggestions to 5 subcommands', () => {
		const message = suggestSubcommand('connectors');

		// Count how many subcommands are shown
		const lines = message.split('\n');
		const commandLines = lines.filter((line) => line.includes('databasin connectors'));

		expect(commandLines.length).toBeLessThanOrEqual(6); // May include more if there are exactly that many
	});

	test('includes help suggestion', () => {
		const message = suggestSubcommand('pipelines');
		expect(message).toContain('databasin pipelines --help');
	});

	test('handles unknown base command', () => {
		const message = suggestSubcommand('unknown');

		expect(message).toContain('Unknown command');
		expect(message).toContain('databasin --help');
	});

	test('handles commands with no subcommands', () => {
		const message = suggestSubcommand('update');
		expect(message).toContain('Unknown command');
	});
});

describe('isValidCommand', () => {
	test('returns true for valid commands', () => {
		expect(isValidCommand('connectors list')).toBe(true);
		expect(isValidCommand('pipelines get')).toBe(true);
		expect(isValidCommand('auth login')).toBe(true);
	});

	test('returns true for aliases', () => {
		expect(isValidCommand('login')).toBe(true);
	});

	test('returns false for invalid commands', () => {
		expect(isValidCommand('connector list')).toBe(false);
		expect(isValidCommand('unknown command')).toBe(false);
		expect(isValidCommand('asdfghjkl')).toBe(false);
	});

	test('is case sensitive', () => {
		// Command names are stored in lowercase
		expect(isValidCommand('CONNECTORS LIST')).toBe(false);
	});

	test('handles empty string', () => {
		expect(isValidCommand('')).toBe(false);
	});
});

describe('getCommandDefinition', () => {
	test('returns definition for valid command', () => {
		const def = getCommandDefinition('connectors list');

		expect(def).not.toBeNull();
		expect(def!.name).toBe('connectors list');
		expect(def!.description).toBeDefined();
		expect(def!.examples).toBeDefined();
	});

	test('returns definition for alias', () => {
		const def = getCommandDefinition('login');

		expect(def).not.toBeNull();
		expect(def!.description).toBeDefined();
	});

	test('returns null for invalid command', () => {
		const def = getCommandDefinition('unknown command');
		expect(def).toBeNull();
	});

	test('handles empty string', () => {
		const def = getCommandDefinition('');
		expect(def).toBeNull();
	});

	test('returned definition is complete', () => {
		const def = getCommandDefinition('pipelines list');

		expect(def).not.toBeNull();
		expect(def!.name).toBe('pipelines list');
		expect(def!.description.length).toBeGreaterThan(0);
		expect(def!.examples).toBeDefined();
		expect(def!.examples!.length).toBeGreaterThan(0);
	});
});

describe('Integration Tests', () => {
	test('typo correction flow', () => {
		// Simulate user typing "connector list" instead of "connectors list"
		const suggestions = findCommandSuggestions('connector list');
		const message = formatSuggestionMessage('connector list', suggestions);

		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions[0].command).toBe('connectors list');
		expect(message).toContain('Did you mean?');
		expect(message).toContain('connectors list');
	});

	test('missing subcommand flow', () => {
		// Simulate user typing just "connectors" without subcommand
		const message = suggestSubcommand('connectors');

		expect(message).toContain('Missing subcommand');
		expect(message).toContain('connectors list');
		expect(message).toContain('connectors get');
	});

	test('command validation flow', () => {
		// Valid command
		const valid = isValidCommand('connectors list');
		expect(valid).toBe(true);

		// Invalid command - get suggestion
		const invalid = isValidCommand('connector list');
		expect(invalid).toBe(false);

		if (!invalid) {
			const suggestions = findCommandSuggestions('connector list');
			expect(suggestions.length).toBeGreaterThan(0);
		}
	});

	test('complete error message generation', () => {
		// Simulate complete error message for unknown command
		const unknownCmd = 'pipelne list'; // Typo
		const suggestions = findCommandSuggestions(unknownCmd, 3, 0.3);
		const message = formatSuggestionMessage(unknownCmd, suggestions);

		expect(message).toContain('pipelne list');
		expect(message).toContain('Did you mean?');
		expect(message).toContain('pipelines list');
		expect(message).toContain('--help');
	});

	test('handles various typo patterns', () => {
		const typos = [
			'connector list', // Missing 's'
			'connectors lst', // Typo in subcommand
			'conecters list', // Transposed letters
			'connectors lsit' // Swapped letters
		];

		for (const typo of typos) {
			const suggestions = findCommandSuggestions(typo, 1);
			expect(suggestions.length).toBeGreaterThan(0);
			// Should suggest something with 'connectors' or 'list'
			const suggestion = suggestions[0].command;
			expect(suggestion.includes('connectors') || suggestion.includes('list')).toBe(true);
		}
	});
});
