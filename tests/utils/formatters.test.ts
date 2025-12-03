/**
 * Tests for Output Formatting Utilities
 *
 * Validates table, JSON, and CSV formatting with various options
 * and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
	formatTable,
	formatJson,
	formatCsv,
	formatOutput,
	flattenObject,
	detectFormat,
	checkTokenEfficiency
} from './formatters';

// Sample test data
const sampleData = [
	{ id: '123', name: 'Project A', status: 'active', count: 42 },
	{ id: '456', name: 'Project B', status: 'inactive', count: 0 },
	{ id: '789', name: 'Project C', status: 'active', count: 100 }
];

const singleItem = { id: '123', name: 'Test Project', active: true };

const nestedData = {
	id: '123',
	user: {
		name: 'Alice',
		role: {
			title: 'Admin',
			level: 5
		}
	},
	metadata: {
		created: '2024-01-01',
		updated: '2024-01-15'
	}
};

describe('flattenObject', () => {
	test('flattens nested objects with dot notation', () => {
		const result = flattenObject(nestedData);

		expect(result).toEqual({
			id: '123',
			'user.name': 'Alice',
			'user.role.title': 'Admin',
			'user.role.level': 5,
			'metadata.created': '2024-01-01',
			'metadata.updated': '2024-01-15'
		});
	});

	test('handles flat objects without modification', () => {
		const flat = { a: 1, b: 2, c: 3 };
		const result = flattenObject(flat);

		expect(result).toEqual(flat);
	});

	test('preserves arrays as-is', () => {
		const withArray = {
			id: '123',
			tags: ['a', 'b', 'c'],
			nested: {
				items: [1, 2, 3]
			}
		};

		const result = flattenObject(withArray);

		expect(result.tags).toEqual(['a', 'b', 'c']);
		expect(result['nested.items']).toEqual([1, 2, 3]);
	});

	test('handles empty objects', () => {
		const result = flattenObject({});
		expect(result).toEqual({});
	});

	test('handles null and undefined values', () => {
		const withNulls = {
			a: null,
			b: undefined,
			c: {
				d: null
			}
		};

		const result = flattenObject(withNulls);

		expect(result.a).toBeNull();
		expect(result.b).toBeUndefined();
		expect(result['c.d']).toBeNull();
	});
});

describe('formatTable', () => {
	test('formats basic table with default options', () => {
		const result = formatTable(sampleData, { colors: false });

		expect(result).toContain('Project A');
		expect(result).toContain('Project B');
		expect(result).toContain('active');
		expect(result).toContain('inactive');
	});

	test('handles empty arrays gracefully', () => {
		const result = formatTable([], { colors: false });

		expect(result).toBe('No data to display');
	});

	test('filters fields when specified', () => {
		const result = formatTable(sampleData, {
			fields: ['name', 'status'],
			colors: false
		});

		expect(result).toContain('Project A');
		expect(result).toContain('active');
		expect(result).not.toContain('123'); // ID should be filtered out
	});

	test('uses custom headers when provided', () => {
		const result = formatTable(sampleData, {
			fields: ['name', 'status'],
			headers: ['Project Name', 'Current Status'],
			colors: false
		});

		expect(result).toContain('Project Name');
		expect(result).toContain('Current Status');
	});

	test('handles compact style', () => {
		const result = formatTable(sampleData, {
			style: 'compact',
			colors: false
		});

		expect(result).toContain('Project A');
		// Compact style should have fewer border characters
		expect(result.split('┌').length).toBe(1); // No top border
	});

	test('handles markdown style', () => {
		const result = formatTable(sampleData, {
			style: 'markdown',
			colors: false
		});

		expect(result).toContain('|');
		expect(result).toContain('Project A');
	});

	test('handles single item array', () => {
		const result = formatTable([singleItem], { colors: false });

		expect(result).toContain('Test Project');
		expect(result).toContain('123');
	});

	test('handles null and undefined values', () => {
		const dataWithNulls = [
			{ id: '1', name: 'Test', value: null },
			{ id: '2', name: 'Test2', value: undefined }
		];

		const result = formatTable(dataWithNulls, { colors: false });

		expect(result).toContain('-'); // Default value for null/undefined
	});
});

describe('formatJson', () => {
	test('formats JSON with default indentation', () => {
		const result = formatJson(sampleData, { colors: false });
		const parsed = JSON.parse(result);

		expect(parsed).toEqual(sampleData);
		expect(result).toContain('  '); // 2-space indentation
	});

	test('formats single object', () => {
		const result = formatJson(singleItem, { colors: false });
		const parsed = JSON.parse(result);

		expect(parsed).toEqual(singleItem);
	});

	test('respects custom indentation', () => {
		const result = formatJson(singleItem, {
			indent: 4,
			colors: false
		});

		expect(result).toContain('    '); // 4-space indentation
	});

	test('handles compact format with zero indentation', () => {
		const result = formatJson(singleItem, {
			indent: 0,
			colors: false
		});

		expect(result).not.toContain('\n');
		expect(result).toBe(JSON.stringify(singleItem));
	});

	test('handles nested objects', () => {
		const result = formatJson(nestedData, { colors: false });
		const parsed = JSON.parse(result);

		expect(parsed).toEqual(nestedData);
	});

	test('handles empty arrays', () => {
		const result = formatJson([], { colors: false });

		expect(result).toBe('[]');
	});

	test('handles empty objects', () => {
		const result = formatJson({}, { colors: false });

		expect(result).toBe('{}');
	});

	test('syntax highlighting applies when enabled', () => {
		// Temporarily clear NO_COLOR for this test
		const originalNoColor = process.env.NO_COLOR;
		delete process.env.NO_COLOR;

		// Set colors explicitly to true
		const result = formatJson(singleItem, {
			colors: true,
			syntaxHighlight: true
		});

		// Restore NO_COLOR
		if (originalNoColor !== undefined) {
			process.env.NO_COLOR = originalNoColor;
		}

		// Result should contain ANSI color codes
		expect(result).toMatch(/\x1b\[\d+m/); // ANSI escape sequence pattern
	});

	test('no syntax highlighting when colors disabled', () => {
		const result = formatJson(singleItem, {
			colors: false,
			syntaxHighlight: true
		});

		// Should not contain ANSI codes
		expect(result).not.toMatch(/\x1b\[\d+m/);
	});
});

describe('formatCsv', () => {
	test('formats CSV with headers', () => {
		const result = formatCsv(sampleData);
		const lines = result.split('\n');

		expect(lines[0]).toBe('id,name,status,count');
		expect(lines[1]).toContain('123');
		expect(lines[1]).toContain('Project A');
		expect(lines.length).toBe(4); // Header + 3 data rows
	});

	test('handles empty arrays', () => {
		const result = formatCsv([]);

		expect(result).toBe('');
	});

	test('filters fields when specified', () => {
		const result = formatCsv(sampleData, {
			fields: ['name', 'status']
		});
		const lines = result.split('\n');

		expect(lines[0]).toBe('name,status');
		expect(lines[1]).toContain('Project A');
		expect(lines[1]).not.toContain('123'); // ID should be filtered
	});

	test('escapes quotes in values', () => {
		const dataWithQuotes = [{ name: 'Project "Alpha"', status: 'active' }];

		const result = formatCsv(dataWithQuotes);

		expect(result).toContain('Project ""Alpha""'); // Double-quote escaping
	});

	test('quotes values containing commas', () => {
		const dataWithCommas = [{ name: 'Last, First', status: 'active' }];

		const result = formatCsv(dataWithCommas);
		const lines = result.split('\n');

		expect(lines[1]).toContain('"Last, First"');
	});

	test('quotes values containing newlines', () => {
		const dataWithNewlines = [{ name: 'Line 1\nLine 2', status: 'active' }];

		const result = formatCsv(dataWithNewlines);

		expect(result).toContain('"Line 1\nLine 2"');
	});

	test('uses custom delimiter', () => {
		const result = formatCsv(sampleData, {
			delimiter: ';'
		});
		const lines = result.split('\n');

		expect(lines[0]).toBe('id;name;status;count');
		expect(lines[1]).toContain(';');
		expect(lines[1]).not.toContain(',');
	});

	test('uses custom quote character', () => {
		const dataWithCommas = [{ name: 'Last, First', status: 'active' }];

		const result = formatCsv(dataWithCommas, {
			quote: "'"
		});

		expect(result).toContain("'Last, First'");
	});

	test('handles null and undefined values', () => {
		const dataWithNulls = [{ id: '1', name: null, value: undefined }];

		const result = formatCsv(dataWithNulls);
		const lines = result.split('\n');

		// Null/undefined should be empty strings in CSV (no quotes for empty values)
		expect(lines[1]).toBe('1,,');
	});

	test('handles single item array', () => {
		const result = formatCsv([singleItem]);
		const lines = result.split('\n');

		expect(lines.length).toBe(2); // Header + 1 data row
		expect(lines[0]).toBe('id,name,active');
	});
});

describe('detectFormat', () => {
	let originalEnv: string | undefined;

	beforeEach(() => {
		originalEnv = process.env.DATABASIN_OUTPUT_FORMAT;
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.DATABASIN_OUTPUT_FORMAT = originalEnv;
		} else {
			delete process.env.DATABASIN_OUTPUT_FORMAT;
		}
	});

	test('CLI format has highest priority', () => {
		process.env.DATABASIN_OUTPUT_FORMAT = 'json';
		const result = detectFormat('csv', 'table');

		expect(result).toBe('csv');
	});

	test('environment variable overrides config', () => {
		process.env.DATABASIN_OUTPUT_FORMAT = 'json';
		const result = detectFormat(undefined, 'table');

		expect(result).toBe('json');
	});

	test('config format used when no CLI or env', () => {
		delete process.env.DATABASIN_OUTPUT_FORMAT;
		const result = detectFormat(undefined, 'csv');

		expect(result).toBe('csv');
	});

	test('defaults to table when nothing specified', () => {
		delete process.env.DATABASIN_OUTPUT_FORMAT;
		const result = detectFormat(undefined, undefined);

		expect(result).toBe('table');
	});

	test('ignores invalid environment values', () => {
		process.env.DATABASIN_OUTPUT_FORMAT = 'invalid' as any;
		const result = detectFormat(undefined, 'json');

		expect(result).toBe('json'); // Falls back to config
	});
});

describe('checkTokenEfficiency', () => {
	test('returns empty string when below threshold', () => {
		const output = 'Small output';
		const result = checkTokenEfficiency(output, {
			warnThreshold: 50000,
			enabled: true
		});

		expect(result).toBe('');
	});

	test('returns warning when exceeding threshold', () => {
		const output = 'x'.repeat(60000);
		const result = checkTokenEfficiency(output, {
			warnThreshold: 50000,
			enabled: true
		});

		expect(result).toContain('Token Efficiency Warning');
		expect(result).toContain('60,000'); // Formatted character count
		expect(result).toContain('--fields');
		expect(result).toContain('--limit');
	});

	test('returns empty string when disabled', () => {
		const output = 'x'.repeat(60000);
		const result = checkTokenEfficiency(output, {
			warnThreshold: 50000,
			enabled: false
		});

		expect(result).toBe('');
	});

	test('warning includes threshold value', () => {
		const output = 'x'.repeat(60000);
		const result = checkTokenEfficiency(output, {
			warnThreshold: 50000,
			enabled: true
		});

		expect(result).toContain('50,000');
	});
});

describe('formatOutput', () => {
	test('dispatches to formatTable for table format', () => {
		const result = formatOutput(sampleData, 'table', { colors: false });

		expect(result).toContain('Project A');
		expect(result).toContain('┌'); // Table border character
	});

	test('dispatches to formatJson for json format', () => {
		const result = formatOutput(sampleData, 'json', { colors: false });
		const parsed = JSON.parse(result);

		expect(parsed).toEqual(sampleData);
	});

	test('dispatches to formatCsv for csv format', () => {
		const result = formatOutput(sampleData, 'csv', { colors: false });
		const lines = result.split('\n');

		expect(lines[0]).toBe('id,name,status,count');
		expect(lines.length).toBe(4);
	});

	test('converts single object to array for table format', () => {
		const result = formatOutput(singleItem, 'table', { colors: false });

		expect(result).toContain('Test Project');
	});

	test('preserves single object for JSON format', () => {
		const result = formatOutput(singleItem, 'json', { colors: false });
		const parsed = JSON.parse(result);

		expect(parsed).toEqual(singleItem);
	});

	test('includes token efficiency warning when provided', () => {
		const largeData = Array.from({ length: 1000 }, (_, i) => ({
			id: String(i),
			name: `Project ${i}`,
			description: 'x'.repeat(100)
		}));

		const result = formatOutput(
			largeData,
			'json',
			{ colors: false },
			{
				warnThreshold: 10000,
				enabled: true
			}
		);

		expect(result).toContain('Token Efficiency Warning');
	});

	test('throws error for unknown format', () => {
		expect(() => {
			formatOutput(sampleData, 'unknown' as any, {});
		}).toThrow('Unknown output format');
	});

	test('passes options to underlying formatters', () => {
		const result = formatOutput(sampleData, 'table', {
			fields: ['name', 'status'],
			colors: false
		});

		expect(result).toContain('Project A');
		expect(result).not.toContain('123'); // ID should be filtered
	});
});

describe('Integration Tests', () => {
	test('table format with all options', () => {
		const result = formatOutput(sampleData, 'table', {
			fields: ['name', 'status'],
			headers: ['Project', 'Status'],
			colors: false,
			style: 'compact'
		} as any);

		expect(result).toContain('Project');
		expect(result).toContain('Status');
		expect(result).toContain('Project A');
	});

	test('JSON format with syntax highlighting', () => {
		// Temporarily clear NO_COLOR for this test
		const originalNoColor = process.env.NO_COLOR;
		delete process.env.NO_COLOR;

		const result = formatOutput(sampleData, 'json', {
			colors: true,
			syntaxHighlight: true,
			indent: 2
		} as any);

		// Restore NO_COLOR
		if (originalNoColor !== undefined) {
			process.env.NO_COLOR = originalNoColor;
		}

		// Should contain color codes when colors enabled
		expect(result.length).toBeGreaterThan(JSON.stringify(sampleData, null, 2).length);
	});

	test('CSV format with custom options', () => {
		const result = formatOutput(sampleData, 'csv', {
			fields: ['name', 'status'],
			delimiter: ';'
		} as any);

		const lines = result.split('\n');
		expect(lines[0]).toBe('name;status');
	});

	test('handles mixed data types in table', () => {
		const mixedData = [{ id: 1, name: 'Test', active: true, tags: ['a', 'b'], metadata: { x: 1 } }];

		const result = formatOutput(mixedData, 'table', { colors: false });

		expect(result).toContain('Test');
		expect(result).toContain('true');
	});

	test('empty data handled consistently across formats', () => {
		const emptyArray: any[] = [];

		const tableResult = formatOutput(emptyArray, 'table', { colors: false });
		const jsonResult = formatOutput(emptyArray, 'json', { colors: false });
		const csvResult = formatOutput(emptyArray, 'csv', { colors: false });

		expect(tableResult).toBe('No data to display');
		expect(jsonResult).toBe('[]');
		expect(csvResult).toBe('');
	});
});
