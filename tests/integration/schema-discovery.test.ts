/**
 * E2E Integration Tests for Schema Discovery Workflow
 *
 * Tests the complete end-to-end workflow from catalog/schema selection
 * through table selection and column discovery with ingestion recommendations.
 *
 * These tests use real API calls to validate the entire schema discovery
 * pipeline that powers the CLI wizard and connector configuration.
 *
 * @see src/utils/prompts.ts
 * @see src/client/sql.ts
 * @see src/commands/sql.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { SqlClient } from '../../src/client/sql.ts';
import {
	promptForCatalog,
	promptForSchema,
	promptForTables
} from '../../src/utils/prompts.ts';
import prompts from 'prompts';
import { AuthService } from '../../src/utils/auth.ts';

describe('Complete Schema Discovery Workflow', () => {
	let sqlClient: SqlClient;
	let authService: AuthService;

	/**
	 * Test Connector IDs
	 *
	 * These connectors should be available in the test environment:
	 * - Standard connector (MySQL/PostgreSQL): Regular database without catalogs
	 * - Lakehouse connector (Iceberg/Hive): Supports catalog-based discovery
	 */
	const TEST_CONNECTOR_STANDARD = 5768; // Update with real test connector ID
	const TEST_CONNECTOR_LAKEHOUSE = 5769; // Update with real lakehouse connector ID

	beforeEach(async () => {
		// Initialize auth service and login
		authService = new AuthService();
		await authService.login();

		// Initialize SQL client with auth token
		const token = authService.getToken();
		if (!token) {
			throw new Error('Authentication required for integration tests');
		}

		sqlClient = new SqlClient({
			apiUrl: process.env.API_URL || 'http://localhost:9000',
			token
		});
	});

	afterEach(() => {
		// Clean up prompt overrides to prevent memory leaks
		prompts.override([]);
	});

	/**
	 * Test 1: Complete workflow for standard connector (no catalog)
	 *
	 * Validates the full discovery flow:
	 * 1. Select schema from available schemas
	 * 2. Select multiple tables from schema
	 * 3. Fetch column metadata for selected tables
	 * 4. Get AI-powered ingestion recommendations
	 */
	test('should complete full workflow from schema to recommendations (standard connector)', async () => {
		// Step 1: Fetch available schemas
		const schemas = await sqlClient.listSchemas(TEST_CONNECTOR_STANDARD);
		expect(schemas).toBeDefined();
		expect(Array.isArray(schemas)).toBe(true);
		expect(schemas.length).toBeGreaterThan(0);

		// Mock user selecting first available schema
		const selectedSchema = schemas[0].name;
		prompts.override({ selected: selectedSchema });

		const schema = await promptForSchema(sqlClient, TEST_CONNECTOR_STANDARD);
		expect(schema).toBe(selectedSchema);

		// Step 2: Fetch tables in selected schema
		const tables = await sqlClient.listTables(TEST_CONNECTOR_STANDARD, undefined, schema);
		expect(tables).toBeDefined();
		expect(Array.isArray(tables)).toBe(true);
		expect(tables.length).toBeGreaterThan(0);

		// Mock user selecting first two tables (or all if less than 2)
		const selectedTables = tables.slice(0, Math.min(2, tables.length)).map((t) => t.name);
		prompts.override({ selected: selectedTables });

		const selectedTableNames = await promptForTables(
			sqlClient,
			TEST_CONNECTOR_STANDARD,
			schema
		);
		expect(selectedTableNames).toEqual(selectedTables);

		// Step 3: Fetch column metadata for selected tables
		const columns = await sqlClient.getColumnsBatch(
			TEST_CONNECTOR_STANDARD,
			selectedTables,
			schema
		);
		expect(columns).toBeDefined();
		expect(typeof columns).toBe('object');
		expect(Object.keys(columns).length).toBeGreaterThan(0);

		// Validate column structure for each table
		for (const tableName of selectedTables) {
			expect(columns[tableName]).toBeDefined();
			expect(Array.isArray(columns[tableName])).toBe(true);
			expect(columns[tableName].length).toBeGreaterThan(0);

			// Validate column metadata
			const firstColumn = columns[tableName][0];
			expect(firstColumn).toHaveProperty('name');
			expect(firstColumn).toHaveProperty('type');
			expect(firstColumn).toHaveProperty('table');
			expect(firstColumn).toHaveProperty('schema');
			expect(firstColumn.table).toBe(tableName);
			expect(firstColumn.schema).toBe(schema);
		}

		// Step 4: Get ingestion recommendations
		const recommendations = await sqlClient.getIngestionRecommendations(
			TEST_CONNECTOR_STANDARD,
			selectedTables,
			schema
		);
		expect(recommendations).toBeDefined();
		expect(Array.isArray(recommendations)).toBe(true);
		expect(recommendations.length).toBe(selectedTables.length);

		// Validate recommendation structure
		recommendations.forEach((rec) => {
			expect(rec).toHaveProperty('table');
			expect(rec).toHaveProperty('recommendedType');
			expect(rec).toHaveProperty('reason');
			expect(rec).toHaveProperty('details');
			expect(selectedTables).toContain(rec.table);
			expect(['full', 'incremental', 'cdc']).toContain(rec.recommendedType);
		});
	}, 30000); // 30 second timeout for API calls

	/**
	 * Test 2: Complete workflow for lakehouse connector (with catalog)
	 *
	 * Validates catalog-based discovery flow:
	 * 1. Select catalog from available catalogs
	 * 2. Select schema from catalog
	 * 3. Select tables from schema
	 * 4. Fetch column metadata
	 * 5. Get ingestion recommendations
	 */
	test('should complete full workflow with catalog selection (lakehouse connector)', async () => {
		// Step 1: Fetch available catalogs
		const catalogs = await sqlClient.listCatalogs(TEST_CONNECTOR_LAKEHOUSE);
		expect(catalogs).toBeDefined();
		expect(Array.isArray(catalogs)).toBe(true);
		expect(catalogs.length).toBeGreaterThan(0);

		// Mock user selecting first available catalog
		const selectedCatalog = catalogs[0].name;
		prompts.override({ selected: selectedCatalog });

		const catalog = await promptForCatalog(sqlClient, TEST_CONNECTOR_LAKEHOUSE);
		expect(catalog).toBe(selectedCatalog);

		// Step 2: Fetch schemas in selected catalog
		const schemas = await sqlClient.listSchemas(TEST_CONNECTOR_LAKEHOUSE, catalog);
		expect(schemas).toBeDefined();
		expect(Array.isArray(schemas)).toBe(true);
		expect(schemas.length).toBeGreaterThan(0);

		// Mock user selecting first available schema
		const selectedSchema = schemas[0].name;
		prompts.override({ selected: selectedSchema });

		const schema = await promptForSchema(sqlClient, TEST_CONNECTOR_LAKEHOUSE, catalog);
		expect(schema).toBe(selectedSchema);

		// Step 3: Fetch tables in selected schema/catalog
		const tables = await sqlClient.listTables(TEST_CONNECTOR_LAKEHOUSE, catalog, schema);
		expect(tables).toBeDefined();
		expect(Array.isArray(tables)).toBe(true);
		expect(tables.length).toBeGreaterThan(0);

		// Mock user selecting first table
		const selectedTables = [tables[0].name];
		prompts.override({ selected: selectedTables });

		const selectedTableNames = await promptForTables(
			sqlClient,
			TEST_CONNECTOR_LAKEHOUSE,
			schema,
			catalog
		);
		expect(selectedTableNames).toEqual(selectedTables);

		// Step 4: Fetch column metadata
		const columns = await sqlClient.getColumnsBatch(
			TEST_CONNECTOR_LAKEHOUSE,
			selectedTables,
			schema,
			catalog
		);
		expect(columns).toBeDefined();
		expect(typeof columns).toBe('object');

		// Validate column structure includes catalog
		const firstColumn = columns[selectedTables[0]][0];
		expect(firstColumn).toHaveProperty('catalog');
		expect(firstColumn.catalog).toBe(catalog);

		// Step 5: Get ingestion recommendations
		const recommendations = await sqlClient.getIngestionRecommendations(
			TEST_CONNECTOR_LAKEHOUSE,
			selectedTables,
			schema,
			catalog
		);
		expect(recommendations).toBeDefined();
		expect(Array.isArray(recommendations)).toBe(true);
		expect(recommendations.length).toBe(selectedTables.length);
	}, 30000);

	/**
	 * Test 3: Multi-table batch column fetching
	 *
	 * Validates that getColumnsBatch correctly handles multiple tables
	 * and returns properly structured results with correct table associations.
	 */
	test('should correctly batch fetch columns for multiple tables', async () => {
		// Get first available schema
		const schemas = await sqlClient.listSchemas(TEST_CONNECTOR_STANDARD);
		const schema = schemas[0].name;

		// Get multiple tables (at least 2)
		const tables = await sqlClient.listTables(TEST_CONNECTOR_STANDARD, undefined, schema);
		expect(tables.length).toBeGreaterThanOrEqual(2);

		const selectedTables = tables.slice(0, 3).map((t) => t.name);

		// Fetch columns for multiple tables
		const columns = await sqlClient.getColumnsBatch(
			TEST_CONNECTOR_STANDARD,
			selectedTables,
			schema
		);

		// Validate each table has its own column set
		selectedTables.forEach((tableName) => {
			expect(columns[tableName]).toBeDefined();
			expect(Array.isArray(columns[tableName])).toBe(true);

			// Validate all columns in this table have correct table name
			columns[tableName].forEach((col) => {
				expect(col.table).toBe(tableName);
				expect(col.schema).toBe(schema);
			});
		});

		// Validate we got unique columns for different tables
		const table1Columns = columns[selectedTables[0]];
		const table2Columns = columns[selectedTables[1]];

		// Tables should have different column sets (or at least different counts)
		// This is a weak assertion but validates they're not the same reference
		expect(table1Columns).not.toBe(table2Columns);
	}, 30000);

	/**
	 * Test 4: Error handling for invalid inputs
	 *
	 * Validates that the workflow properly handles error conditions.
	 */
	test('should handle errors gracefully', async () => {
		// Test 1: Invalid connector ID
		await expect(sqlClient.listSchemas(999999)).rejects.toThrow();

		// Test 2: Empty table list for recommendations
		const schemas = await sqlClient.listSchemas(TEST_CONNECTOR_STANDARD);
		const schema = schemas[0].name;

		await expect(
			sqlClient.getIngestionRecommendations(TEST_CONNECTOR_STANDARD, [], schema)
		).rejects.toThrow();

		// Test 3: Invalid schema name
		await expect(
			sqlClient.listTables(TEST_CONNECTOR_STANDARD, undefined, 'nonexistent_schema_12345')
		).rejects.toThrow();
	}, 30000);

	/**
	 * Test 5: Column metadata completeness
	 *
	 * Validates that column metadata includes all required fields
	 * and optional fields are properly typed.
	 */
	test('should return complete column metadata', async () => {
		const schemas = await sqlClient.listSchemas(TEST_CONNECTOR_STANDARD);
		const schema = schemas[0].name;

		const tables = await sqlClient.listTables(TEST_CONNECTOR_STANDARD, undefined, schema);
		const tableName = tables[0].name;

		const columns = await sqlClient.getColumnsBatch(TEST_CONNECTOR_STANDARD, [tableName], schema);

		const columnList = columns[tableName];
		expect(columnList.length).toBeGreaterThan(0);

		columnList.forEach((col) => {
			// Required fields
			expect(col).toHaveProperty('name');
			expect(col).toHaveProperty('type');
			expect(col).toHaveProperty('table');
			expect(col).toHaveProperty('schema');

			// Type validation
			expect(typeof col.name).toBe('string');
			expect(typeof col.type).toBe('string');
			expect(typeof col.table).toBe('string');
			expect(typeof col.schema).toBe('string');

			// Optional fields should be properly typed if present
			if (col.nullable !== undefined) {
				expect(typeof col.nullable).toBe('boolean');
			}

			if (col.defaultValue !== undefined) {
				expect(typeof col.defaultValue === 'string' || col.defaultValue === null).toBe(true);
			}

			if (col.catalog !== undefined) {
				expect(typeof col.catalog).toBe('string');
			}
		});
	}, 30000);
});
