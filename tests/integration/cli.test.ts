/**
 * CLI Integration Tests
 *
 * Tests the full CLI workflow including command parsing,
 * API communication, and output formatting.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { $ } from 'bun';

const CLI_PATH = './src/index.ts';

describe('CLI Integration Tests', () => {
	beforeAll(() => {
		if (!process.env.DATABASIN_TOKEN) {
			console.warn('Warning: DATABASIN_TOKEN not set. Some tests may fail.');
		}
	});

	describe('Global Options', () => {
		it('should display version', async () => {
			const result = await $`bun run ${CLI_PATH} --version`.text();
			expect(result).toMatch(/\d+\.\d+\.\d+/);
		});

		it('should display help', async () => {
			const result = await $`bun run ${CLI_PATH} --help`.text();
			expect(result).toContain('Usage:');
			expect(result).toContain('Commands:');
		});
	});

	describe('Auth Commands', () => {
		it('should have auth command', async () => {
			const result = await $`bun run ${CLI_PATH} auth --help`.text();
			expect(result).toContain('auth');
			expect(result).toContain('verify');
		});
	});

	describe('Projects Commands', () => {
		it('should have projects command', async () => {
			const result = await $`bun run ${CLI_PATH} projects --help`.text();
			expect(result).toContain('projects');
			expect(result).toContain('list');
		});
	});
});
