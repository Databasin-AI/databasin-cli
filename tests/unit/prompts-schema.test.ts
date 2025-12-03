/**
 * Unit Tests for Schema Discovery Prompt Utilities
 *
 * Tests interactive schema discovery prompts for catalogs, schemas, and tables.
 * These prompts are used in pipeline wizards and schema exploration workflows.
 *
 * Note: These tests use prompts.override() to mock user selections without
 * requiring actual interactive input. This prevents memory leaks from
 * unresolved promises and EventEmitter listeners.
 *
 * @see src/utils/prompts.ts
 */

import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { promptForCatalog, promptForSchema, promptForTables } from '../../src/utils/prompts.ts';
import type { SqlClient } from '../../src/client/sql.ts';
import type { Catalog, Schema, Table } from '../../src/client/sql.ts';
import prompts from 'prompts';

describe('promptForCatalog', () => {
	let mockSqlClient: SqlClient;

	beforeEach(() => {
		// Create mock SQL client
		mockSqlClient = {
			listCatalogs: mock(async () => [] as Catalog[])
		} as unknown as SqlClient;
	});

	afterEach(() => {
		// Clean up prompt overrides to prevent memory leaks
		prompts.override([]);
	});

	test('should call listCatalogs with correct connector ID', async () => {
		const catalogs: Catalog[] = [{ name: 'hive' }];
		mockSqlClient.listCatalogs = mock(async () => catalogs);

		// Mock user selection to prevent hanging on prompt
		prompts.override({ selected: 'hive' });

		const result = await promptForCatalog(mockSqlClient, 123);

		expect(mockSqlClient.listCatalogs).toHaveBeenCalledWith(123);
		expect(result).toBe('hive');
	});

	test('should throw error for empty catalog list', async () => {
		mockSqlClient.listCatalogs = mock(async () => []);

		await expect(promptForCatalog(mockSqlClient, 123)).rejects.toThrow(
			'Catalog discovery failed: No catalogs available for connector 123'
		);
	});

	test('should validate that listCatalogs is called with numeric connector ID', async () => {
		const catalogs: Catalog[] = [{ name: 'hive' }];
		mockSqlClient.listCatalogs = mock(async () => catalogs);

		// Mock user selection
		prompts.override({ selected: 'hive' });

		const result = await promptForCatalog(mockSqlClient, 456);

		expect(mockSqlClient.listCatalogs).toHaveBeenCalledWith(456);
		expect(result).toBe('hive');
	});

	test('should handle SqlClient errors gracefully', async () => {
		mockSqlClient.listCatalogs = mock(async () => {
			throw new Error('Network error');
		});

		await expect(promptForCatalog(mockSqlClient, 123)).rejects.toThrow('Network error');
	});

	test('should extract catalog names from Catalog objects', async () => {
		const catalogs: Catalog[] = [
			{ name: 'hive' },
			{ name: 'lakehouse' },
			{ name: 'hubspot' }
		];
		mockSqlClient.listCatalogs = mock(async () => catalogs);

		// Mock user selection
		prompts.override({ selected: 'lakehouse' });

		const result = await promptForCatalog(mockSqlClient, 123);

		// Verify listCatalogs was called
		expect(mockSqlClient.listCatalogs).toHaveBeenCalled();
		expect(result).toBe('lakehouse');
	});

	test('should be a function that returns a Promise', async () => {
		expect(typeof promptForCatalog).toBe('function');

		const catalogs: Catalog[] = [{ name: 'hive' }];
		mockSqlClient.listCatalogs = mock(async () => catalogs);

		// Mock user selection to prevent hanging promise
		prompts.override({ selected: 'hive' });

		const result = promptForCatalog(mockSqlClient, 123);
		expect(result).toBeInstanceOf(Promise);

		// Clean up the promise
		await result;
	});

	test('should accept optional custom message parameter', async () => {
		const catalogs: Catalog[] = [{ name: 'hive' }];
		mockSqlClient.listCatalogs = mock(async () => catalogs);

		// Mock user selection
		prompts.override({ selected: 'hive' });

		// Should not throw with custom message
		const result = await promptForCatalog(mockSqlClient, 123, 'Custom message');
		expect(result).toBe('hive');
	});

	test('should work without custom message parameter', async () => {
		const catalogs: Catalog[] = [{ name: 'hive' }];
		mockSqlClient.listCatalogs = mock(async () => catalogs);

		// Mock user selection
		prompts.override({ selected: 'hive' });

		// Should not throw without message
		const result = await promptForCatalog(mockSqlClient, 123);
		expect(result).toBe('hive');
	});
});

describe('promptForSchema', () => {
	let mockSqlClient: SqlClient;

	beforeEach(() => {
		mockSqlClient = {
			listSchemas: mock(async () => [] as Schema[])
		} as unknown as SqlClient;
	});

	afterEach(() => {
		// Clean up prompt overrides to prevent memory leaks
		prompts.override([]);
	});

	test('should call listSchemas without catalog filter', async () => {
		const schemas: Schema[] = [{ name: 'public' }];
		mockSqlClient.listSchemas = mock(async () => schemas);

		// Mock user selection
		prompts.override({ selected: 'public' });

		const result = await promptForSchema(mockSqlClient, 123);

		expect(mockSqlClient.listSchemas).toHaveBeenCalledWith(123, undefined);
		expect(result).toBe('public');
	});

	test('should call listSchemas with catalog filter', async () => {
		const schemas: Schema[] = [{ name: 'default', catalog: 'hive' }];
		mockSqlClient.listSchemas = mock(async () => schemas);

		// Mock user selection
		prompts.override({ selected: 'default' });

		const result = await promptForSchema(mockSqlClient, 123, 'hive');

		expect(mockSqlClient.listSchemas).toHaveBeenCalledWith(123, 'hive');
		expect(result).toBe('default');
	});

	test('should pass catalog parameter correctly to SqlClient', async () => {
		const schemas: Schema[] = [{ name: 'default', catalog: 'lakehouse' }];
		mockSqlClient.listSchemas = mock(async () => schemas);

		// Mock user selection
		prompts.override({ selected: 'default' });

		const result = await promptForSchema(mockSqlClient, 123, 'lakehouse');

		expect(mockSqlClient.listSchemas).toHaveBeenCalledWith(123, 'lakehouse');
		expect(result).toBe('default');
	});

	test('should throw error for empty schema list', async () => {
		mockSqlClient.listSchemas = mock(async () => []);

		await expect(promptForSchema(mockSqlClient, 123)).rejects.toThrow(
			'Schema discovery failed: No schemas available for connector 123'
		);
	});

	test('should accept custom message parameter', async () => {
		const schemas: Schema[] = [{ name: 'public' }];
		mockSqlClient.listSchemas = mock(async () => schemas);

		// Mock user selection
		prompts.override({ selected: 'public' });

		const result = await promptForSchema(mockSqlClient, 123, undefined, 'Custom message');
		expect(result).toBe('public');
	});

	test('should work without custom message', async () => {
		const schemas: Schema[] = [{ name: 'public' }];
		mockSqlClient.listSchemas = mock(async () => schemas);

		// Mock user selection
		prompts.override({ selected: 'public' });

		const result = await promptForSchema(mockSqlClient, 123);
		expect(result).toBe('public');
	});

	test('should handle SqlClient errors gracefully', async () => {
		mockSqlClient.listSchemas = mock(async () => {
			throw new Error('Connection failed');
		});

		await expect(promptForSchema(mockSqlClient, 123)).rejects.toThrow('Connection failed');
	});

	test('should be a function that returns a Promise', async () => {
		expect(typeof promptForSchema).toBe('function');

		const schemas: Schema[] = [{ name: 'public' }];
		mockSqlClient.listSchemas = mock(async () => schemas);

		// Mock user selection to prevent hanging promise
		prompts.override({ selected: 'public' });

		const result = promptForSchema(mockSqlClient, 123);
		expect(result).toBeInstanceOf(Promise);

		// Clean up the promise
		await result;
	});
});

describe('promptForTables', () => {
	let mockSqlClient: SqlClient;

	beforeEach(() => {
		mockSqlClient = {
			listTables: mock(async () => [] as Table[])
		} as unknown as SqlClient;
	});

	afterEach(() => {
		// Clean up prompt overrides to prevent memory leaks
		prompts.override([]);
	});

	test('should call listTables with schema only', async () => {
		const tables: Table[] = [{ name: 'customers', type: 'TABLE' }];
		mockSqlClient.listTables = mock(async () => tables);

		// Mock user selection (multi-select)
		prompts.override({ selected: ['customers'] });

		const result = await promptForTables(mockSqlClient, 123, 'public');

		expect(mockSqlClient.listTables).toHaveBeenCalledWith(123, undefined, 'public');
		expect(result).toEqual(['customers']);
	});

	test('should call listTables with schema and catalog', async () => {
		const tables: Table[] = [{ name: 'users', type: 'TABLE' }];
		mockSqlClient.listTables = mock(async () => tables);

		// Mock user selection
		prompts.override({ selected: ['users'] });

		const result = await promptForTables(mockSqlClient, 123, 'default', 'hive');

		expect(mockSqlClient.listTables).toHaveBeenCalledWith(123, 'hive', 'default');
		expect(result).toEqual(['users']);
	});

	test('should throw error for empty table list', async () => {
		mockSqlClient.listTables = mock(async () => []);

		await expect(promptForTables(mockSqlClient, 123, 'public')).rejects.toThrow(
			"No tables available in schema 'public'"
		);
	});

	test('should format table choices with type information', async () => {
		const tables: Table[] = [
			{ name: 'customers', type: 'TABLE' },
			{ name: 'orders_view', type: 'VIEW' }
		];
		mockSqlClient.listTables = mock(async () => tables);

		// Mock user selecting both tables
		prompts.override({ selected: ['customers', 'orders_view'] });

		const result = await promptForTables(mockSqlClient, 123, 'public');

		// Verify the function was called
		expect(mockSqlClient.listTables).toHaveBeenCalled();
		expect(result).toEqual(['customers', 'orders_view']);
	});

	test('should return Promise of string array (multi-select)', async () => {
		const tables: Table[] = [{ name: 'customers', type: 'TABLE' }];
		mockSqlClient.listTables = mock(async () => tables);

		// Mock user selection
		prompts.override({ selected: ['customers'] });

		const result = promptForTables(mockSqlClient, 123, 'public');
		expect(result).toBeInstanceOf(Promise);

		// Clean up the promise
		await result;
	});

	test('should accept custom message parameter', async () => {
		const tables: Table[] = [{ name: 'customers', type: 'TABLE' }];
		mockSqlClient.listTables = mock(async () => tables);

		// Mock user selection
		prompts.override({ selected: ['customers'] });

		const result = await promptForTables(mockSqlClient, 123, 'public', undefined, 'Custom message');
		expect(result).toEqual(['customers']);
	});

	test('should work without custom message', async () => {
		const tables: Table[] = [{ name: 'customers', type: 'TABLE' }];
		mockSqlClient.listTables = mock(async () => tables);

		// Mock user selection
		prompts.override({ selected: ['customers'] });

		const result = await promptForTables(mockSqlClient, 123, 'public');
		expect(result).toEqual(['customers']);
	});

	test('should handle SqlClient errors gracefully', async () => {
		mockSqlClient.listTables = mock(async () => {
			throw new Error('Database connection error');
		});

		await expect(promptForTables(mockSqlClient, 123, 'public')).rejects.toThrow(
			'Database connection error'
		);
	});

	test('should be a function that returns a Promise', async () => {
		expect(typeof promptForTables).toBe('function');

		const tables: Table[] = [{ name: 'customers', type: 'TABLE' }];
		mockSqlClient.listTables = mock(async () => tables);

		// Mock user selection
		prompts.override({ selected: ['customers'] });

		const result = promptForTables(mockSqlClient, 123, 'public');
		expect(result).toBeInstanceOf(Promise);

		// Clean up the promise
		await result;
	});

	test('should handle tables without explicit type', async () => {
		const tables: Table[] = [
			{ name: 'customers', type: 'TABLE' },
			{ name: 'legacy_table', type: '' } // Empty type
		];
		mockSqlClient.listTables = mock(async () => tables);

		// Mock user selection
		prompts.override({ selected: ['legacy_table'] });

		const result = await promptForTables(mockSqlClient, 123, 'public');

		// Should still work and default to 'TABLE' for empty type
		expect(mockSqlClient.listTables).toHaveBeenCalled();
		expect(result).toEqual(['legacy_table']);
	});
});
