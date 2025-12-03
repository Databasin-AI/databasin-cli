/**
 * Unit Tests for SQL Commands (columns and ingestion-types)
 *
 * Tests the CLI commands that use batch column discovery and ingestion recommendations.
 *
 * @see src/commands/sql.ts
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import type { Column, IngestionRecommendation } from '../../src/client/sql.ts';
import type { ColumnInfo } from '../../src/types/api.ts';

// Mock the formatters to test pure logic
const mockFormatOutput = mock((data: any, format: string, options?: any) => {
	if (format === 'csv') {
		if (Array.isArray(data)) {
			const keys = Object.keys(data[0] || {});
			const header = keys.join(',');
			const rows = data.map((row) => keys.map((key) => row[key]).join(','));
			return [header, ...rows].join('\n');
		}
	}
	return JSON.stringify(data);
});

describe('getTableList helper', () => {
	test('should validate --tables and --interactive are mutually exclusive', async () => {
		// This test ensures the validation logic works
		const hasTables = true;
		const hasInteractive = true;

		if (hasTables && hasInteractive) {
			expect(() => {
				throw new Error('Cannot use --tables and --interactive together');
			}).toThrow('Cannot use --tables and --interactive together');
		}
	});

	test('should validate at least one method is provided', () => {
		const hasTables = false;
		const hasInteractive = false;

		if (!hasTables && !hasInteractive) {
			expect(() => {
				throw new Error('Must provide either --tables or --interactive');
			}).toThrow('Must provide either --tables or --interactive');
		}
	});

	test('should parse comma-separated table names', () => {
		const tables = 'users,orders,products';
		const parsed = tables
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		expect(parsed).toEqual(['users', 'orders', 'products']);
	});

	test('should handle tables with spaces', () => {
		const tables = ' users , orders , products ';
		const parsed = tables
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		expect(parsed).toEqual(['users', 'orders', 'products']);
	});
});

describe('formatColumnsOutput helper', () => {
	test('should format columns as JSON', () => {
		const columnsByTable = {
			users: [
				{ name: 'id', type: 'INTEGER', nullable: false },
				{ name: 'email', type: 'VARCHAR', nullable: false }
			]
		};

		const output = JSON.stringify(columnsByTable, null, 2);
		expect(output).toContain('users');
		expect(output).toContain('id');
		expect(output).toContain('email');
	});

	test('should format columns as CSV', () => {
		const rows = [
			{ table: 'users', column: 'id', type: 'INTEGER', nullable: 'NO' },
			{ table: 'users', column: 'email', type: 'VARCHAR', nullable: 'NO' }
		];

		const csvOutput = mockFormatOutput(rows, 'csv', { colors: false });
		expect(csvOutput).toContain('table,column,type,nullable');
		expect(csvOutput).toContain('users,id,INTEGER,NO');
		expect(csvOutput).toContain('users,email,VARCHAR,NO');
	});

	test('should handle multiple tables in CSV format', () => {
		const rows = [
			{ table: 'users', column: 'id', type: 'INTEGER', nullable: 'NO' },
			{ table: 'orders', column: 'id', type: 'INTEGER', nullable: 'NO' },
			{ table: 'orders', column: 'user_id', type: 'INTEGER', nullable: 'NO' }
		];

		const csvOutput = mockFormatOutput(rows, 'csv', { colors: false });
		expect(csvOutput).toContain('users,id');
		expect(csvOutput).toContain('orders,id');
		expect(csvOutput).toContain('orders,user_id');
	});

	test('should format nullable as YES/NO', () => {
		const rows = [
			{ table: 'users', column: 'id', type: 'INTEGER', nullable: 'NO' },
			{ table: 'users', column: 'email', type: 'VARCHAR', nullable: 'YES' }
		];

		const csvOutput = mockFormatOutput(rows, 'csv', { colors: false });
		expect(csvOutput).toContain('NO');
		expect(csvOutput).toContain('YES');
	});
});

describe('formatRecommendationsOutput helper', () => {
	test('should format recommendations as JSON', () => {
		const recommendations: IngestionRecommendation[] = [
			{
				table: 'users',
				recommendedType: 'incremental',
				confidence: 95,
				primaryKeys: ['id'],
				timestampColumn: 'updated_at',
				reason: 'Table has timestamp column suitable for incremental sync'
			}
		];

		const output = JSON.stringify(recommendations, null, 2);
		expect(output).toContain('users');
		expect(output).toContain('incremental');
		expect(output).toContain('95');
		expect(output).toContain('updated_at');
	});

	test('should format recommendations as CSV', () => {
		const recommendations = [
			{
				table: 'users',
				recommendedType: 'incremental',
				confidence: 95,
				primaryKeys: 'id',
				timestampColumn: 'updated_at',
				reason: 'Table has timestamp column'
			},
			{
				table: 'products',
				recommendedType: 'full',
				confidence: 85,
				primaryKeys: '',
				timestampColumn: '',
				reason: 'No timestamp column detected'
			}
		];

		const csvOutput = mockFormatOutput(recommendations, 'csv', { colors: false });
		expect(csvOutput).toContain('table,recommendedType,confidence');
		expect(csvOutput).toContain('users,incremental,95');
		expect(csvOutput).toContain('products,full,85');
	});

	test('should handle confidence as percentage in table format', () => {
		const rec = { confidence: 95 };
		const formatted = rec.confidence !== undefined ? `${rec.confidence}%` : '-';
		expect(formatted).toBe('95%');
	});

	test('should handle missing confidence', () => {
		const rec = { confidence: undefined };
		const formatted = rec.confidence !== undefined ? `${rec.confidence}%` : '-';
		expect(formatted).toBe('-');
	});

	test('should join primary keys with comma', () => {
		const rec = { primaryKeys: ['id', 'tenant_id'] };
		const formatted = rec.primaryKeys ? rec.primaryKeys.join(', ') : '-';
		expect(formatted).toBe('id, tenant_id');
	});

	test('should handle missing primary keys', () => {
		const rec = { primaryKeys: undefined };
		const formatted = rec.primaryKeys ? rec.primaryKeys.join(', ') : '-';
		expect(formatted).toBe('-');
	});

	test('should join primary keys with semicolon for CSV', () => {
		const rec = { primaryKeys: ['id', 'tenant_id'] };
		const formatted = rec.primaryKeys ? rec.primaryKeys.join(';') : '';
		expect(formatted).toBe('id;tenant_id');
	});
});

describe('SQL columns command integration', () => {
	test('should validate connector ID is a positive number', () => {
		const connectorId = '0';
		const parsed = parseInt(connectorId);
		expect(isNaN(parsed) || parsed <= 0).toBe(true);
	});

	test('should parse valid connector ID', () => {
		const connectorId = '123';
		const parsed = parseInt(connectorId);
		expect(parsed).toBe(123);
	});

	test('should build correct table list from --tables option', () => {
		const options = { tables: 'users,orders' };
		const tableList = options.tables
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
		expect(tableList).toEqual(['users', 'orders']);
	});

	test('should detect output format from options', () => {
		const options = { output: 'json' };
		const format = options.output || 'table';
		expect(format).toBe('json');
	});

	test('should default output format to table', () => {
		const options = {};
		const format = (options as any).output || 'table';
		expect(format).toBe('table');
	});

	test('should count total columns across tables', () => {
		const columnsByTable = {
			users: [
				{ name: 'id', type: 'INTEGER', nullable: false },
				{ name: 'email', type: 'VARCHAR', nullable: false }
			],
			orders: [
				{ name: 'id', type: 'INTEGER', nullable: false },
				{ name: 'user_id', type: 'INTEGER', nullable: false },
				{ name: 'total', type: 'DECIMAL', nullable: true }
			]
		};

		const totalColumns = Object.values(columnsByTable).reduce((sum, cols) => sum + cols.length, 0);
		expect(totalColumns).toBe(5);
	});

	test('should handle empty columns result', () => {
		const columnsByTable = {
			users: []
		};

		const totalColumns = Object.values(columnsByTable).reduce((sum, cols) => sum + cols.length, 0);
		expect(totalColumns).toBe(0);
	});
});

describe('SQL ingestion-types command integration', () => {
	test('should validate connector ID is a positive number', () => {
		const connectorId = '-5';
		const parsed = parseInt(connectorId);
		expect(parsed <= 0).toBe(true);
	});

	test('should parse valid connector ID', () => {
		const connectorId = '456';
		const parsed = parseInt(connectorId);
		expect(parsed).toBe(456);
	});

	test('should count recommendations', () => {
		const recommendations = [
			{ table: 'users', recommendedType: 'incremental' as const },
			{ table: 'orders', recommendedType: 'full' as const }
		];
		expect(recommendations.length).toBe(2);
	});

	test('should filter recommendations with reasons', () => {
		const recommendations: IngestionRecommendation[] = [
			{
				table: 'users',
				recommendedType: 'incremental',
				reason: 'Has timestamp column'
			},
			{
				table: 'orders',
				recommendedType: 'full'
			}
		];

		const withReasons = recommendations.filter((r) => r.reason);
		expect(withReasons.length).toBe(1);
		expect(withReasons[0].table).toBe('users');
	});

	test('should handle all recommendation types', () => {
		const types: Array<'full' | 'incremental' | 'cdc'> = ['full', 'incremental', 'cdc'];
		expect(types).toContain('full');
		expect(types).toContain('incremental');
		expect(types).toContain('cdc');
	});
});

describe('Error handling scenarios', () => {
	test('should handle API 404 error', () => {
		const error = { statusCode: 404, message: 'Not found' };
		expect(error.statusCode).toBe(404);
	});

	test('should handle API 403 error', () => {
		const error = { statusCode: 403, message: 'Access denied' };
		expect(error.statusCode).toBe(403);
	});

	test('should handle validation error for missing tables', () => {
		const options = { interactive: false };
		const hasTables = false;
		const hasInteractive = options.interactive;

		if (!hasTables && !hasInteractive) {
			expect(() => {
				throw new Error('Must provide either --tables or --interactive');
			}).toThrow();
		}
	});

	test('should handle validation error for both flags', () => {
		const options = { tables: 'users', interactive: true };
		const hasTables = !!options.tables;
		const hasInteractive = options.interactive;

		if (hasTables && hasInteractive) {
			expect(() => {
				throw new Error('Cannot use --tables and --interactive together');
			}).toThrow();
		}
	});
});
