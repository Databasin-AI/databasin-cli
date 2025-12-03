/**
 * Unit Tests for SQL Client Column Discovery Methods
 *
 * Tests batch column retrieval and ingestion recommendation methods
 * used in pipeline wizard schema discovery workflows.
 *
 * @see src/client/sql.ts
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { SqlClient } from '../../src/client/sql.ts';
import type { Column, IngestionRecommendation } from '../../src/client/sql.ts';
import type { ColumnInfo } from '../../src/types/api.ts';

describe('SqlClient.getColumnsBatch', () => {
	let client: SqlClient;

	beforeEach(() => {
		client = new SqlClient();
	});

	test('should validate connectorId greater than 0', async () => {
		await expect(client.getColumnsBatch(0, ['customers'], 'public')).rejects.toThrow(
			'Connector ID must be greater than 0'
		);

		await expect(client.getColumnsBatch(-1, ['customers'], 'public')).rejects.toThrow(
			'Connector ID must be greater than 0'
		);
	});

	test('should validate tables array not empty', async () => {
		await expect(client.getColumnsBatch(123, [], 'public')).rejects.toThrow(
			'Tables array must not be empty'
		);
	});

	test('should validate schema non-empty', async () => {
		await expect(client.getColumnsBatch(123, ['customers'], '')).rejects.toThrow(
			'Schema must not be empty'
		);

		await expect(client.getColumnsBatch(123, ['customers'], '   ')).rejects.toThrow(
			'Schema must not be empty'
		);
	});

	test('should build correct API payload for single table', async () => {
		const mockPost = mock(async () => ({ columns: [] }));
		client.post = mockPost;

		await client.getColumnsBatch(123, ['customers'], 'public');

		expect(mockPost).toHaveBeenCalledWith(
			'/api/connector/columns',
			{
				connectorID: 123,
				objects: ['customers'],
				chosenDatabaseSchema: 'public'
			},
			undefined
		);
	});

	test('should make sequential calls for multiple tables', async () => {
		const mockPost = mock(async () => ({ columns: [] }));
		client.post = mockPost;

		await client.getColumnsBatch(123, ['customers', 'orders'], 'public');

		// Should make two separate API calls (one per table)
		expect(mockPost).toHaveBeenCalledTimes(2);

		// First call for 'customers'
		expect(mockPost.mock.calls[0]).toEqual([
			'/api/connector/columns',
			{
				connectorID: 123,
				objects: ['customers'],
				chosenDatabaseSchema: 'public'
			},
			undefined
		]);

		// Second call for 'orders'
		expect(mockPost.mock.calls[1]).toEqual([
			'/api/connector/columns',
			{
				connectorID: 123,
				objects: ['orders'],
				chosenDatabaseSchema: 'public'
			},
			undefined
		]);
	});

	test('should build correct API payload with catalog', async () => {
		const mockPost = mock(async () => ({ columns: [] }));
		client.post = mockPost;

		await client.getColumnsBatch(123, ['customers'], 'default', 'hive');

		expect(mockPost).toHaveBeenCalledWith(
			'/api/connector/columns',
			{
				connectorID: 123,
				objects: ['customers'],
				chosenDatabaseSchema: 'default',
				catalog: 'hive'
			},
			undefined
		);
	});

	test('should call POST /api/connector/columns', async () => {
		const mockPost = mock(async () => ({ columns: [] }));
		client.post = mockPost;

		await client.getColumnsBatch(123, ['customers'], 'public');

		expect(mockPost).toHaveBeenCalled();
		const callArgs = mockPost.mock.calls[0];
		expect(callArgs[0]).toBe('/api/connector/columns');
	});

	test('should transform response correctly', async () => {
		const mockColumns: ColumnInfo[] = [
			{ name: 'id', type: 'bigint', nullable: false },
			{ name: 'name', type: 'varchar', nullable: true }
		];

		const mockPost = mock(async () => ({ columns: mockColumns }));
		client.post = mockPost;

		const result = await client.getColumnsBatch(123, ['customers'], 'public');

		expect(result).toHaveProperty('customers');
		expect(result.customers).toBeArray();
		expect(result.customers.length).toBe(2);
	});

	test('should add table/schema/catalog context to columns', async () => {
		const mockColumns: ColumnInfo[] = [{ name: 'id', type: 'bigint', nullable: false }];

		const mockPost = mock(async () => ({ columns: mockColumns }));
		client.post = mockPost;

		const result = await client.getColumnsBatch(123, ['customers'], 'public', 'hive');

		const column = result.customers[0];
		expect(column.table).toBe('customers');
		expect(column.schema).toBe('public');
		expect(column.catalog).toBe('hive');
	});

	test('should handle single table', async () => {
		const mockColumns: ColumnInfo[] = [
			{ name: 'id', type: 'bigint', nullable: false },
			{ name: 'email', type: 'varchar', nullable: true }
		];

		const mockPost = mock(async () => ({ columns: mockColumns }));
		client.post = mockPost;

		const result = await client.getColumnsBatch(123, ['users'], 'public');

		expect(Object.keys(result)).toEqual(['users']);
		expect(result.users.length).toBe(2);
	});

	test('should handle multiple tables with sequential calls', async () => {
		const mockColumns: ColumnInfo[] = [
			{ name: 'id', type: 'bigint', nullable: false },
			{ name: 'name', type: 'varchar', nullable: true }
		];

		const mockPost = mock(async () => ({ columns: mockColumns }));
		client.post = mockPost;

		const tables = ['customers', 'orders', 'products'];
		const result = await client.getColumnsBatch(123, tables, 'public');

		// Should make one API call per table
		expect(mockPost).toHaveBeenCalledTimes(tables.length);

		// Should initialize all table keys
		expect(Object.keys(result).length).toBe(3);
		expect(result).toHaveProperty('customers');
		expect(result).toHaveProperty('orders');
		expect(result).toHaveProperty('products');

		// Each table should have the mock columns
		expect(result.customers.length).toBe(2);
		expect(result.orders.length).toBe(2);
		expect(result.products.length).toBe(2);

		// Verify correct table attribution
		expect(result.customers[0].table).toBe('customers');
		expect(result.orders[0].table).toBe('orders');
		expect(result.products[0].table).toBe('products');
	});

	test('should handle optional catalog parameter', async () => {
		const mockPost = mock(async () => ({ columns: [] }));
		client.post = mockPost;

		// Without catalog
		await client.getColumnsBatch(123, ['customers'], 'public');
		expect(mockPost.mock.calls[0][1]).not.toHaveProperty('catalog');

		// With catalog
		await client.getColumnsBatch(123, ['customers'], 'public', 'hive');
		expect(mockPost.mock.calls[1][1]).toHaveProperty('catalog', 'hive');
	});

	test('should handle API failures with error', async () => {
		const mockPost = mock(async () => {
			throw new Error('API error');
		});
		client.post = mockPost;

		await expect(client.getColumnsBatch(123, ['customers'], 'public')).rejects.toThrow(
			'API error'
		);
	});

	test('should include table name in error for multi-table failures', async () => {
		let callCount = 0;
		const mockPost = mock(async () => {
			callCount++;
			if (callCount === 2) {
				throw new Error('Connection timeout');
			}
			return { columns: [] };
		});
		client.post = mockPost;

		await expect(client.getColumnsBatch(123, ['customers', 'orders'], 'public')).rejects.toThrow(
			"Failed to fetch columns for table 'orders': Connection timeout"
		);
	});

	test('should handle invalid input with validation error', async () => {
		// Invalid connector ID
		await expect(client.getColumnsBatch(0, ['customers'], 'public')).rejects.toThrow();

		// Invalid tables array
		await expect(client.getColumnsBatch(123, [], 'public')).rejects.toThrow();

		// Invalid schema
		await expect(client.getColumnsBatch(123, ['customers'], '')).rejects.toThrow();
	});
});

describe('SqlClient.getIngestionRecommendations', () => {
	let client: SqlClient;

	beforeEach(() => {
		client = new SqlClient();
	});

	test('should validate connectorId greater than 0', async () => {
		await expect(
			client.getIngestionRecommendations(0, ['customers'], 'public')
		).rejects.toThrow('Connector ID must be greater than 0');

		await expect(
			client.getIngestionRecommendations(-5, ['customers'], 'public')
		).rejects.toThrow('Connector ID must be greater than 0');
	});

	test('should validate tables array not empty', async () => {
		await expect(client.getIngestionRecommendations(123, [], 'public')).rejects.toThrow(
			'Tables array must not be empty'
		);
	});

	test('should validate schema non-empty', async () => {
		await expect(client.getIngestionRecommendations(123, ['customers'], '')).rejects.toThrow(
			'Schema must not be empty'
		);

		await expect(
			client.getIngestionRecommendations(123, ['customers'], '  ')
		).rejects.toThrow('Schema must not be empty');
	});

	test('should build correct API payload without catalog', async () => {
		const mockPost = mock(async () => ({ recommendations: [] }));
		client.post = mockPost;

		await client.getIngestionRecommendations(123, ['customers', 'orders'], 'public');

		expect(mockPost).toHaveBeenCalledWith(
			'/api/connector/ingestiontype',
			{
				connectorID: 123,
				objects: ['customers', 'orders'],
				chosenDatabaseSchema: 'public'
			},
			undefined
		);
	});

	test('should build correct API payload with catalog', async () => {
		const mockPost = mock(async () => ({ recommendations: [] }));
		client.post = mockPost;

		await client.getIngestionRecommendations(123, ['customers'], 'default', 'hive');

		expect(mockPost).toHaveBeenCalledWith(
			'/api/connector/ingestiontype',
			{
				connectorID: 123,
				objects: ['customers'],
				chosenDatabaseSchema: 'default',
				catalog: 'hive'
			},
			undefined
		);
	});

	test('should call POST /api/connector/ingestiontype', async () => {
		const mockPost = mock(async () => ({ recommendations: [] }));
		client.post = mockPost;

		await client.getIngestionRecommendations(123, ['customers'], 'public');

		expect(mockPost).toHaveBeenCalled();
		const callArgs = mockPost.mock.calls[0];
		expect(callArgs[0]).toBe('/api/connector/ingestiontype');
	});

	test('should map response to IngestionRecommendation array', async () => {
		const mockRecommendations: IngestionRecommendation[] = [
			{
				table: 'customers',
				recommendedType: 'incremental',
				confidence: 85,
				timestampColumn: 'updated_at',
				reason: 'Table has updated_at timestamp column'
			},
			{
				table: 'orders',
				recommendedType: 'full',
				confidence: 95,
				reason: 'No timestamp or primary key detected'
			}
		];

		const mockPost = mock(async () => ({ objects: mockRecommendations }));
		client.post = mockPost;

		const result = await client.getIngestionRecommendations(
			123,
			['customers', 'orders'],
			'public'
		);

		expect(result).toBeArray();
		expect(result.length).toBe(2);
		expect(result[0].table).toBe('customers');
		expect(result[0].recommendedType).toBe('incremental');
		expect(result[1].table).toBe('orders');
		expect(result[1].recommendedType).toBe('full');
	});

	test('should populate all interface fields', async () => {
		const mockRecommendation: IngestionRecommendation = {
			table: 'users',
			recommendedType: 'cdc',
			confidence: 90,
			primaryKeys: ['id'],
			timestampColumn: 'updated_at',
			cdcSupported: true,
			reason: 'CDC is supported and primary key detected'
		};

		const mockPost = mock(async () => ({ objects: [mockRecommendation] }));
		client.post = mockPost;

		const result = await client.getIngestionRecommendations(123, ['users'], 'public');

		expect(result[0]).toHaveProperty('table');
		expect(result[0]).toHaveProperty('recommendedType');
		expect(result[0]).toHaveProperty('confidence');
		expect(result[0]).toHaveProperty('primaryKeys');
		expect(result[0]).toHaveProperty('timestampColumn');
		expect(result[0]).toHaveProperty('cdcSupported');
		expect(result[0]).toHaveProperty('reason');
	});

	test('should handle optional fields gracefully', async () => {
		const mockRecommendation: IngestionRecommendation = {
			table: 'products',
			recommendedType: 'full'
			// No optional fields
		};

		const mockPost = mock(async () => ({ objects: [mockRecommendation] }));
		client.post = mockPost;

		const result = await client.getIngestionRecommendations(123, ['products'], 'public');

		expect(result[0].table).toBe('products');
		expect(result[0].recommendedType).toBe('full');
		expect(result[0].confidence).toBeUndefined();
		expect(result[0].primaryKeys).toBeUndefined();
	});

	test('should handle API failures with error', async () => {
		const mockPost = mock(async () => {
			throw new Error('Service unavailable');
		});
		client.post = mockPost;

		await expect(
			client.getIngestionRecommendations(123, ['customers'], 'public')
		).rejects.toThrow('Service unavailable');
	});

	test('should handle invalid inputs with validation errors', async () => {
		// Invalid connector ID
		await expect(
			client.getIngestionRecommendations(0, ['customers'], 'public')
		).rejects.toThrow();

		// Invalid tables array
		await expect(client.getIngestionRecommendations(123, [], 'public')).rejects.toThrow();

		// Invalid schema
		await expect(
			client.getIngestionRecommendations(123, ['customers'], '')
		).rejects.toThrow();
	});
});
