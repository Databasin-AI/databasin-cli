/**
 * Tests for Config Command
 *
 * Verifies:
 * - config command outputs JSON configuration
 * - Correct structure of output
 * - Integration with global config system
 */

import { describe, it, expect } from 'bun:test';
import { Command } from 'commander';
import { createConfigCommand } from '../../src/commands/config.ts';
import type { CliConfig } from '../../src/types/config.ts';

/**
 * Helper to create mock program context
 */
function createMockProgram(): Command {
	const mockConfig: CliConfig = {
		apiUrl: 'http://localhost:9000',
		webUrl: 'http://localhost:3000',
		timeout: 30000,
		debug: false,
		noUpdateCheck: false,
		output: {
			format: 'table',
			colors: true,
			verbose: false
		},
		tokenEfficiency: {
			warnThreshold: 50000,
			defaultLimit: 100
		}
	};

	const program = new Command();
	program.setOptionValue('_config', mockConfig);

	return program;
}

/**
 * Helper to execute command and capture output
 */
async function executeConfigCommand(): Promise<string> {
	const program = createMockProgram();
	const configCommand = createConfigCommand();
	program.addCommand(configCommand);

	let output = '';
	const originalLog = console.log;
	console.log = (...args: any[]) => {
		output += args.join(' ');
	};

	try {
		await program.parseAsync(['node', 'test', 'config']);
		return output;
	} finally {
		console.log = originalLog;
	}
}

describe('Config Command', () => {
	describe('Command Structure', () => {
		it('should create config command', () => {
			const configCommand = createConfigCommand();
			expect(configCommand.name()).toBe('config');
		});

		it('should have correct description', () => {
			const configCommand = createConfigCommand();
			expect(configCommand.description()).toBe('Display current CLI configuration');
		});
	});

	describe('Output Format', () => {
		it('should output valid JSON', async () => {
			const output = await executeConfigCommand();
			
			// Should be valid JSON
			expect(() => JSON.parse(output)).not.toThrow();
		});

		it('should include all config fields', async () => {
			const output = await executeConfigCommand();
			const config = JSON.parse(output);

			expect(config).toHaveProperty('apiUrl');
			expect(config).toHaveProperty('webUrl');
			expect(config).toHaveProperty('timeout');
			expect(config).toHaveProperty('debug');
			expect(config).toHaveProperty('output');
			expect(config).toHaveProperty('tokenEfficiency');
		});

		it('should have correct nested output structure', async () => {
			const output = await executeConfigCommand();
			const config = JSON.parse(output);

			expect(config.output).toHaveProperty('format');
			expect(config.output).toHaveProperty('colors');
			expect(config.output).toHaveProperty('verbose');
		});

		it('should have correct nested tokenEfficiency structure', async () => {
			const output = await executeConfigCommand();
			const config = JSON.parse(output);

			expect(config.tokenEfficiency).toHaveProperty('warnThreshold');
			expect(config.tokenEfficiency).toHaveProperty('defaultLimit');
		});

		it('should output pretty-printed JSON', async () => {
			const output = await executeConfigCommand();

			// Pretty-printed JSON should have newlines and indentation
			expect(output).toContain('\n');
			expect(output).toContain('  '); // 2-space indentation
		});
	});

	describe('Config Values', () => {
		it('should reflect correct apiUrl', async () => {
			const output = await executeConfigCommand();
			const config = JSON.parse(output);

			expect(config.apiUrl).toBe('http://localhost:9000');
		});

		it('should reflect correct webUrl', async () => {
			const output = await executeConfigCommand();
			const config = JSON.parse(output);

			expect(config.webUrl).toBe('http://localhost:3000');
		});

		it('should reflect correct timeout', async () => {
			const output = await executeConfigCommand();
			const config = JSON.parse(output);

			expect(config.timeout).toBe(30000);
		});

		it('should reflect correct debug setting', async () => {
			const output = await executeConfigCommand();
			const config = JSON.parse(output);

			expect(config.debug).toBe(false);
		});

		it('should reflect correct output format', async () => {
			const output = await executeConfigCommand();
			const config = JSON.parse(output);

			expect(config.output.format).toBe('table');
			expect(config.output.colors).toBe(true);
			expect(config.output.verbose).toBe(false);
		});
	});
});
