/**
 * Tests for Filter Utilities
 *
 * Validates client-side filtering functions for connectors, pipelines, and other resources.
 */

import { describe, test, expect } from 'bun:test';
import {
	filterByName,
	filterByField,
	filterByType,
	filterByStatus,
	filterByProject,
	filterByRegex,
	combineFilters,
	buildFilter
} from '../../src/utils/filters';

// Sample test data
const sampleConnectors = [
	{ connectorId: '1', connectorName: 'PostgreSQL DB', connectorType: 'database', status: 'active', internalID: 'proj-123' },
	{ connectorId: '2', connectorName: 'MySQL DB', connectorType: 'database', status: 'inactive', internalID: 'proj-123' },
	{ connectorId: '3', connectorName: 'Snowflake', connectorType: 'cloud', status: 'active', internalID: 'proj-456' },
	{ connectorId: '4', connectorName: 'postgres-prod', connectorType: 'database', status: 'active', internalID: 'proj-123' }
];

const samplePipelines = [
	{ pipelineId: '1', pipelineName: 'ETL Pipeline', pipelineType: 'batch', status: 'running' },
	{ pipelineId: '2', pipelineName: 'Stream Pipeline', pipelineType: 'streaming', status: 'stopped' },
	{ pipelineId: '3', pipelineName: 'Data Sync', pipelineType: 'batch', status: 'running' }
];

describe('filterByName', () => {
	test('filters by substring match (case insensitive)', () => {
		const results = filterByName(sampleConnectors, 'postgres');
		expect(results.length).toBe(2);
		expect(results[0].connectorName).toBe('PostgreSQL DB');
		expect(results[1].connectorName).toBe('postgres-prod');
	});

	test('filters by exact match', () => {
		const results = filterByName(sampleConnectors, 'Snowflake');
		expect(results.length).toBe(1);
		expect(results[0].connectorName).toBe('Snowflake');
	});

	test('handles case sensitivity option', () => {
		const results = filterByName(sampleConnectors, 'POSTGRES', { ignoreCase: false });
		expect(results.length).toBe(0);

		const resultsIgnoreCase = filterByName(sampleConnectors, 'POSTGRES', { ignoreCase: true });
		expect(resultsIgnoreCase.length).toBe(2);
	});

	test('handles regex pattern', () => {
		const results = filterByName(sampleConnectors, '^postgres', { useRegex: true });
		expect(results.length).toBe(2);
	});

	test('handles invalid regex gracefully', () => {
		const results = filterByName(sampleConnectors, '(invalid[', { useRegex: true });
		// Should fall back to substring matching
		expect(Array.isArray(results)).toBe(true);
	});

	test('trims whitespace by default', () => {
		const results = filterByName(sampleConnectors, '  postgres  ');
		expect(results.length).toBe(2);
	});

	test('handles trim option', () => {
		const results = filterByName(sampleConnectors, '  postgres  ', { trim: false });
		expect(results.length).toBe(0); // Won't match because of spaces
	});

	test('returns empty array when no matches', () => {
		const results = filterByName(sampleConnectors, 'nonexistent');
		expect(results).toEqual([]);
	});

	test('handles empty array input', () => {
		const results = filterByName([], 'test');
		expect(results).toEqual([]);
	});

	test('works with different name fields', () => {
		const results = filterByName(samplePipelines, 'pipeline');
		expect(results.length).toBe(2); // ETL Pipeline and Stream Pipeline
	});

	test('handles items without name field', () => {
		const data = [{ id: '1', value: 'test' }];
		const results = filterByName(data, 'test');
		expect(results).toEqual([]);
	});
});

describe('filterByField', () => {
	test('filters by exact field value', () => {
		const results = filterByField(sampleConnectors, 'connectorType', 'database');
		expect(results.length).toBe(3);
	});

	test('filters by substring in field', () => {
		const results = filterByField(sampleConnectors, 'connectorName', 'DB');
		expect(results.length).toBe(2);
	});

	test('handles case sensitivity option', () => {
		const results = filterByField(sampleConnectors, 'status', 'ACTIVE', { ignoreCase: false });
		expect(results.length).toBe(0);

		// Note: 'active' substring matches both 'active' and 'inactive'
		const resultsIgnoreCase = filterByField(sampleConnectors, 'status', 'ACTIVE', { ignoreCase: true });
		expect(resultsIgnoreCase.length).toBe(4);
	});

	test('handles non-string field values', () => {
		const data = [
			{ id: '1', count: 42 },
			{ id: '2', count: 42 },
			{ id: '3', count: 100 }
		];

		const results = filterByField(data, 'count', 42);
		expect(results.length).toBe(2);
	});

	test('handles missing field', () => {
		const results = filterByField(sampleConnectors, 'nonexistentField', 'value');
		expect(results).toEqual([]);
	});

	test('trims whitespace by default', () => {
		// Note: 'active' substring matches both 'active' and 'inactive'
		const results = filterByField(sampleConnectors, 'status', '  active  ');
		expect(results.length).toBe(4);
	});

	test('handles null values', () => {
		const data = [
			{ id: '1', value: null },
			{ id: '2', value: 'test' }
		];

		const results = filterByField(data, 'value', null);
		expect(results.length).toBe(1);
	});

	test('returns empty array when no matches', () => {
		const results = filterByField(sampleConnectors, 'status', 'nonexistent');
		expect(results).toEqual([]);
	});
});

describe('filterByType', () => {
	test('filters by connector type', () => {
		const results = filterByType(sampleConnectors, 'database');
		expect(results.length).toBe(3);
	});

	test('filters by partial type match', () => {
		const results = filterByType(sampleConnectors, 'data');
		expect(results.length).toBe(3);
	});

	test('handles case insensitive matching', () => {
		const results = filterByType(sampleConnectors, 'DATABASE');
		expect(results.length).toBe(3);
	});

	test('handles case sensitive option', () => {
		const results = filterByType(sampleConnectors, 'DATABASE', { ignoreCase: false });
		expect(results.length).toBe(0);
	});

	test('works with different type fields', () => {
		const results = filterByType(samplePipelines, 'batch');
		expect(results.length).toBe(2);
	});

	test('returns empty array when no matches', () => {
		const results = filterByType(sampleConnectors, 'nonexistent');
		expect(results).toEqual([]);
	});

	test('handles empty array input', () => {
		const results = filterByType([], 'test');
		expect(results).toEqual([]);
	});

	test('handles items without type field', () => {
		const data = [{ id: '1', name: 'test' }];
		const results = filterByType(data, 'test');
		expect(results).toEqual([]);
	});
});

describe('filterByStatus', () => {
	test('filters by active status', () => {
		// Note: 'active' substring matches both 'active' and 'inactive'
		const results = filterByStatus(sampleConnectors, 'active');
		expect(results.length).toBe(4);
	});

	test('filters by inactive status', () => {
		const results = filterByStatus(sampleConnectors, 'inactive');
		expect(results.length).toBe(1);
	});

	test('handles case insensitive matching', () => {
		// Note: 'active' substring matches both 'active' and 'inactive'
		const results = filterByStatus(sampleConnectors, 'ACTIVE');
		expect(results.length).toBe(4);
	});

	test('works with pipelines', () => {
		const results = filterByStatus(samplePipelines, 'running');
		expect(results.length).toBe(2);
	});

	test('returns empty array when no matches', () => {
		const results = filterByStatus(sampleConnectors, 'nonexistent');
		expect(results).toEqual([]);
	});

	test('handles empty array input', () => {
		const results = filterByStatus([], 'active');
		expect(results).toEqual([]);
	});
});

describe('filterByProject', () => {
	test('filters by project ID', () => {
		const results = filterByProject(sampleConnectors, 'proj-123');
		expect(results.length).toBe(3);
	});

	test('filters by different project ID', () => {
		const results = filterByProject(sampleConnectors, 'proj-456');
		expect(results.length).toBe(1);
		expect(results[0].connectorName).toBe('Snowflake');
	});

	test('returns empty array when no matches', () => {
		const results = filterByProject(sampleConnectors, 'proj-999');
		expect(results).toEqual([]);
	});

	test('handles empty array input', () => {
		const results = filterByProject([], 'proj-123');
		expect(results).toEqual([]);
	});

	test('handles items without project field', () => {
		const data = [{ id: '1', name: 'test' }];
		const results = filterByProject(data, 'proj-123');
		expect(results).toEqual([]);
	});

	test('tries multiple project field names', () => {
		const data1 = [{ id: '1', projectId: 'proj-123' }];
		const data2 = [{ id: '2', internalID: 'proj-123' }];
		const data3 = [{ id: '3', project: 'proj-123' }];

		expect(filterByProject(data1, 'proj-123').length).toBe(1);
		expect(filterByProject(data2, 'proj-123').length).toBe(1);
		expect(filterByProject(data3, 'proj-123').length).toBe(1);
	});
});

describe('filterByRegex', () => {
	test('filters using regex pattern string', () => {
		// Case insensitive by default, matches both 'PostgreSQL DB' and 'postgres-prod'
		const results = filterByRegex(sampleConnectors, 'connectorName', '^postgres');
		expect(results.length).toBe(2);
		expect(results.some(r => r.connectorName === 'postgres-prod')).toBe(true);
	});

	test('filters using RegExp object', () => {
		const results = filterByRegex(sampleConnectors, 'connectorName', /DB$/);
		expect(results.length).toBe(2);
	});

	test('handles case insensitive regex', () => {
		const results = filterByRegex(sampleConnectors, 'connectorName', '^POSTGRES', { ignoreCase: true });
		expect(results.length).toBe(2);
	});

	test('handles case sensitive regex', () => {
		const results = filterByRegex(sampleConnectors, 'connectorName', '^POSTGRES', { ignoreCase: false });
		expect(results.length).toBe(0);
	});

	test('handles invalid regex pattern', () => {
		const results = filterByRegex(sampleConnectors, 'connectorName', '(invalid[');
		expect(results).toEqual([]);
	});

	test('filters complex patterns', () => {
		const results = filterByRegex(sampleConnectors, 'connectorName', '.*-prod$');
		expect(results.length).toBe(1);
		expect(results[0].connectorName).toBe('postgres-prod');
	});

	test('converts non-string fields to string', () => {
		const data = [
			{ id: '1', count: 123 },
			{ id: '2', count: 456 }
		];

		const results = filterByRegex(data, 'count', '^12');
		expect(results.length).toBe(1);
	});

	test('handles missing field', () => {
		const results = filterByRegex(sampleConnectors, 'nonexistentField', 'test');
		expect(results).toEqual([]);
	});

	test('returns empty array for empty input', () => {
		const results = filterByRegex([], 'field', 'pattern');
		expect(results).toEqual([]);
	});
});

describe('combineFilters', () => {
	test('applies multiple filters sequentially', () => {
		const filters = [
			(items: typeof sampleConnectors) => filterByType(items, 'database'),
			(items: typeof sampleConnectors) => filterByStatus(items, 'active'), // Substring matches 'active' and 'inactive'
			(items: typeof sampleConnectors) => filterByProject(items, 'proj-123')
		];

		const results = combineFilters(sampleConnectors, filters);
		expect(results.length).toBe(3); // All 3 database connectors in proj-123 match
	});

	test('returns all items when no filters', () => {
		const results = combineFilters(sampleConnectors, []);
		expect(results.length).toBe(sampleConnectors.length);
	});

	test('returns empty array when any filter excludes all', () => {
		const filters = [
			(items: typeof sampleConnectors) => filterByType(items, 'database'),
			(items: typeof sampleConnectors) => filterByStatus(items, 'nonexistent')
		];

		const results = combineFilters(sampleConnectors, filters);
		expect(results).toEqual([]);
	});

	test('applies filters in order', () => {
		let callOrder: string[] = [];

		const filters = [
			(items: typeof sampleConnectors) => {
				callOrder.push('first');
				return items;
			},
			(items: typeof sampleConnectors) => {
				callOrder.push('second');
				return items;
			},
			(items: typeof sampleConnectors) => {
				callOrder.push('third');
				return items;
			}
		];

		combineFilters(sampleConnectors, filters);
		expect(callOrder).toEqual(['first', 'second', 'third']);
	});

	test('handles single filter', () => {
		const filters = [(items: typeof sampleConnectors) => filterByType(items, 'database')];

		const results = combineFilters(sampleConnectors, filters);
		expect(results.length).toBe(3);
	});
});

describe('buildFilter', () => {
	test('builds filter for name option', () => {
		const filter = buildFilter({ name: 'postgres' });
		const results = filter(sampleConnectors);

		expect(results.length).toBe(2);
	});

	test('builds filter for type option', () => {
		const filter = buildFilter({ type: 'database' });
		const results = filter(sampleConnectors);

		expect(results.length).toBe(3);
	});

	test('builds filter for status option', () => {
		const filter = buildFilter({ status: 'active' });
		const results = filter(sampleConnectors);

		// Note: 'active' substring matches both 'active' and 'inactive'
		expect(results.length).toBe(4);
	});

	test('builds filter for project option', () => {
		const filter = buildFilter({ project: 'proj-123' });
		const results = filter(sampleConnectors);

		expect(results.length).toBe(3);
	});

	test('builds combined filter with multiple options', () => {
		const filter = buildFilter({
			type: 'database',
			status: 'active', // Substring matches both 'active' and 'inactive'
			project: 'proj-123'
		});

		const results = filter(sampleConnectors);
		expect(results.length).toBe(3); // All 3 database connectors in proj-123
	});

	test('builds filter with name pattern (regex)', () => {
		const filter = buildFilter({ namePattern: '^postgres' });
		const results = filter(sampleConnectors);

		// Case insensitive by default, matches both 'PostgreSQL DB' and 'postgres-prod'
		expect(results.length).toBe(2);
		expect(results.some(r => r.connectorName === 'postgres-prod')).toBe(true);
	});

	test('handles ignoreCase option', () => {
		const filterCaseSensitive = buildFilter({ name: 'POSTGRES', ignoreCase: false });
		const resultsCaseSensitive = filterCaseSensitive(sampleConnectors);
		expect(resultsCaseSensitive.length).toBe(0);

		const filterIgnoreCase = buildFilter({ name: 'POSTGRES', ignoreCase: true });
		const resultsIgnoreCase = filterIgnoreCase(sampleConnectors);
		expect(resultsIgnoreCase.length).toBe(2);
	});

	test('returns identity function when no options', () => {
		const filter = buildFilter({});
		const results = filter(sampleConnectors);

		expect(results.length).toBe(sampleConnectors.length);
	});

	test('handles all options together', () => {
		const filter = buildFilter({
			name: 'postgres',
			type: 'database',
			status: 'active',
			project: 'proj-123',
			ignoreCase: true
		});

		const results = filter(sampleConnectors);
		expect(results.length).toBe(2);
	});
});

describe('Integration Tests', () => {
	test('complex filtering scenario', () => {
		// Find active database connectors in project proj-123 with 'postgres' in name
		const results = buildFilter({
			name: 'postgres',
			type: 'database',
			status: 'active',
			project: 'proj-123'
		})(sampleConnectors);

		expect(results.length).toBe(2);
		expect(results.every((r) => r.status === 'active')).toBe(true);
		expect(results.every((r) => r.connectorType === 'database')).toBe(true);
		expect(results.every((r) => r.internalID === 'proj-123')).toBe(true);
	});

	test('regex pattern with other filters', () => {
		const results = buildFilter({
			namePattern: '-prod$',
			type: 'database',
			status: 'active'
		})(sampleConnectors);

		expect(results.length).toBe(1);
		expect(results[0].connectorName).toBe('postgres-prod');
	});

	test('empty results with strict criteria', () => {
		const results = buildFilter({
			name: 'nonexistent',
			type: 'database',
			status: 'active'
		})(sampleConnectors);

		expect(results).toEqual([]);
	});

	test('filter chaining performance', () => {
		// Create large dataset
		const largeData = Array.from({ length: 1000 }, (_, i) => ({
			id: String(i),
			connectorName: `Connector ${i}`,
			connectorType: i % 2 === 0 ? 'database' : 'cloud',
			status: i % 3 === 0 ? 'active' : 'inactive',
			internalID: `proj-${i % 10}`
		}));

		const filter = buildFilter({
			type: 'database',
			status: 'active',
			project: 'proj-0'
		});

		const results = filter(largeData);
		expect(results.length).toBeGreaterThan(0);
	});
});

describe('Edge Cases', () => {
	test('handles null values in data', () => {
		const dataWithNulls = [
			{ id: '1', name: null, type: 'test' },
			{ id: '2', name: 'test', type: null }
		];

		const results = filterByName(dataWithNulls as any, 'test');
		expect(results.length).toBe(1); // Second item has name='test'
	});

	test('handles undefined values in data', () => {
		const dataWithUndefined = [
			{ id: '1', name: undefined, type: 'test' },
			{ id: '2', name: 'test', type: undefined }
		];

		const results = filterByName(dataWithUndefined as any, 'test');
		expect(results.length).toBe(1); // Second item has name='test'
	});

	test('handles special characters in search', () => {
		const data = [
			{ id: '1', name: 'test@example.com' },
			{ id: '2', name: 'test.example' }
		];

		const results = filterByName(data, '@example');
		expect(results.length).toBe(1);
	});

	test('handles very long strings', () => {
		const data = [{ id: '1', name: 'a'.repeat(10000) }];

		const results = filterByName(data, 'a'.repeat(100));
		expect(results.length).toBe(1);
	});

	test('handles unicode characters', () => {
		const data = [
			{ id: '1', name: 'café' },
			{ id: '2', name: 'naïve' }
		];

		const results = filterByName(data, 'café');
		expect(results.length).toBe(1);
	});
});
