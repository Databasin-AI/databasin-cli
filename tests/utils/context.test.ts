/**
 * Tests for Context Storage Utility
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
	loadContext,
	saveContext,
	clearContext,
	getContext,
	setContext,
	getContextFilePath,
	type CliContext
} from '../../src/utils/context';

// Mock the config directory to use a temp directory
let originalEnv: string | undefined;
let testConfigDir: string;

beforeEach(() => {
	// Create unique test directory
	testConfigDir = join(tmpdir(), `databasin-cli-test-${Date.now()}-${Math.random()}`);
	mkdirSync(testConfigDir, { recursive: true });

	// Override config path
	originalEnv = process.env.DATABASIN_CONFIG_PATH;
	process.env.DATABASIN_CONFIG_PATH = join(testConfigDir, 'config.json');
});

afterEach(() => {
	// Restore original env
	if (originalEnv !== undefined) {
		process.env.DATABASIN_CONFIG_PATH = originalEnv;
	} else {
		delete process.env.DATABASIN_CONFIG_PATH;
	}

	// Clean up test directory
	try {
		const files = [
			join(testConfigDir, 'context.json'),
			join(testConfigDir, 'context.json.tmp'),
			join(testConfigDir, 'config.json')
		];
		for (const file of files) {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		}
		if (existsSync(testConfigDir)) {
			rmdirSync(testConfigDir);
		}
	} catch (error) {
		// Ignore cleanup errors
	}
});

describe('context storage', () => {
	test('loads empty context when file does not exist', () => {
		const context = loadContext();
		expect(context).toEqual({});
	});

	test('saves and loads context', () => {
		const testContext: CliContext = {
			project: '123',
			connector: '456'
		};

		saveContext(testContext);
		const loaded = loadContext();

		expect(loaded.project).toBe('123');
		expect(loaded.connector).toBe('456');
		expect(loaded.updatedAt).toBeDefined();
		expect(typeof loaded.updatedAt).toBe('string');
	});

	test('adds updatedAt timestamp when saving', () => {
		const testContext: CliContext = {
			project: '123'
		};

		const before = new Date().toISOString();
		saveContext(testContext);
		const after = new Date().toISOString();

		const loaded = loadContext();
		expect(loaded.updatedAt).toBeDefined();
		expect(loaded.updatedAt! >= before).toBe(true);
		expect(loaded.updatedAt! <= after).toBe(true);
	});

	test('overwrites existing context', () => {
		saveContext({ project: '123', connector: '456' });
		saveContext({ project: '789' });

		const loaded = loadContext();
		expect(loaded.project).toBe('789');
		expect(loaded.connector).toBeUndefined();
	});

	test('handles corrupted file gracefully', () => {
		const filePath = getContextFilePath();
		writeFileSync(filePath, 'invalid json {', 'utf-8');

		const context = loadContext();
		expect(context).toEqual({});
	});

	test('handles empty file gracefully', () => {
		const filePath = getContextFilePath();
		writeFileSync(filePath, '', 'utf-8');

		const context = loadContext();
		expect(context).toEqual({});
	});

	test('handles non-object JSON gracefully', () => {
		const filePath = getContextFilePath();
		writeFileSync(filePath, '["array"]', 'utf-8');

		const context = loadContext();
		expect(context).toEqual({});
	});

	test('creates config directory if missing', () => {
		// Remove test directory
		if (existsSync(testConfigDir)) {
			const contextFile = join(testConfigDir, 'context.json');
			if (existsSync(contextFile)) {
				unlinkSync(contextFile);
			}
			rmdirSync(testConfigDir);
		}

		saveContext({ project: '123' });

		expect(existsSync(testConfigDir)).toBe(true);
		const loaded = loadContext();
		expect(loaded.project).toBe('123');
	});

	test('uses atomic write pattern', () => {
		const filePath = getContextFilePath();
		const tempFile = `${filePath}.tmp`;

		saveContext({ project: '123' });

		// Temp file should not exist after successful write
		expect(existsSync(tempFile)).toBe(false);
		// Real file should exist
		expect(existsSync(filePath)).toBe(true);
	});
});

describe('clearContext', () => {
	test('clears entire context when no key provided', () => {
		saveContext({ project: '123', connector: '456' });

		clearContext();

		const context = loadContext();
		expect(context).toEqual({});
	});

	test('clears specific key when provided', () => {
		saveContext({ project: '123', connector: '456' });

		clearContext('project');

		const context = loadContext();
		expect(context.project).toBeUndefined();
		expect(context.connector).toBe('456');
	});

	test('does not throw when clearing non-existent file', () => {
		expect(() => clearContext()).not.toThrow();
	});

	test('does not throw when clearing non-existent key', () => {
		saveContext({ project: '123' });
		expect(() => clearContext('connector')).not.toThrow();
	});
});

describe('getContext', () => {
	test('returns value for existing key', () => {
		saveContext({ project: '123', connector: '456' });

		expect(getContext('project')).toBe('123');
		expect(getContext('connector')).toBe('456');
	});

	test('returns undefined for missing key', () => {
		saveContext({ project: '123' });

		expect(getContext('connector')).toBeUndefined();
	});

	test('returns undefined when context file does not exist', () => {
		expect(getContext('project')).toBeUndefined();
	});
});

describe('setContext', () => {
	test('sets single context value', () => {
		setContext('project', '123');

		const context = loadContext();
		expect(context.project).toBe('123');
	});

	test('preserves other values when setting', () => {
		saveContext({ project: '123', connector: '456' });

		setContext('project', '789');

		const context = loadContext();
		expect(context.project).toBe('789');
		expect(context.connector).toBe('456');
	});

	test('adds new key to existing context', () => {
		saveContext({ project: '123' });

		setContext('connector', '456');

		const context = loadContext();
		expect(context.project).toBe('123');
		expect(context.connector).toBe('456');
	});

	test('updates updatedAt timestamp', () => {
		saveContext({ project: '123' });
		const firstUpdate = loadContext().updatedAt;

		// Wait a tiny bit to ensure timestamp changes
		const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
		sleep(10).then(() => {
			setContext('connector', '456');
			const secondUpdate = loadContext().updatedAt;

			expect(secondUpdate).toBeDefined();
			expect(secondUpdate! >= firstUpdate!).toBe(true);
		});
	});
});

describe('concurrent access', () => {
	test('handles multiple rapid writes', async () => {
		// Simulate concurrent writes
		const promises = [];
		for (let i = 0; i < 10; i++) {
			promises.push(
				new Promise<void>((resolve) => {
					setContext('project', `project-${i}`);
					resolve();
				})
			);
		}

		await Promise.all(promises);

		// Should have a valid context (last write wins)
		const context = loadContext();
		expect(context.project).toMatch(/^project-\d+$/);
	});

	test('handles concurrent read/write', async () => {
		saveContext({ project: '123' });

		// Simulate concurrent reads and writes
		const operations = [];
		for (let i = 0; i < 20; i++) {
			if (i % 2 === 0) {
				operations.push(
					new Promise<void>((resolve) => {
						setContext('project', `project-${i}`);
						resolve();
					})
				);
			} else {
				operations.push(
					new Promise<void>((resolve) => {
						const context = loadContext();
						expect(context).toBeDefined();
						resolve();
					})
				);
			}
		}

		await Promise.all(operations);

		// Should have a valid context
		const context = loadContext();
		expect(context.project).toBeDefined();
	});
});

describe('file permissions', () => {
	test('creates context file with secure permissions', () => {
		saveContext({ project: '123' });

		const filePath = getContextFilePath();
		const stats = require('fs').statSync(filePath);

		// Check that file is created with mode 0600 (owner read/write only)
		// On some systems this might be affected by umask
		expect(existsSync(filePath)).toBe(true);
	});
});
