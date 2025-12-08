/**
 * Tests for Bulk Operations Utilities
 *
 * Validates bulk fetching, deletion, ID parsing, and parallel operation handling.
 */

import { describe, test, expect, mock } from 'bun:test';
import {
	parseBulkIds,
	fetchBulk,
	formatBulkResults,
	handleBulkErrors,
	chunkArray,
	deleteBulk
} from '../../src/utils/bulk-operations';
import type { BulkResult } from '../../src/utils/bulk-operations';

describe('parseBulkIds', () => {
	test('parses comma-separated IDs', () => {
		const result = parseBulkIds('123,456,789');
		expect(result).toEqual(['123', '456', '789']);
	});

	test('parses space-separated IDs', () => {
		const result = parseBulkIds('123 456 789');
		expect(result).toEqual(['123', '456', '789']);
	});

	test('parses mixed comma and space separated IDs', () => {
		const result = parseBulkIds('123, 456 789');
		expect(result).toEqual(['123', '456', '789']);
	});

	test('handles array input', () => {
		const result = parseBulkIds(['123', '456', '789']);
		expect(result).toEqual(['123', '456', '789']);
	});

	test('trims whitespace from IDs', () => {
		const result = parseBulkIds('  123  ,  456  ,  789  ');
		expect(result).toEqual(['123', '456', '789']);
	});

	test('removes duplicate IDs', () => {
		const result = parseBulkIds('123,456,123,789,456');
		expect(result).toEqual(['123', '456', '789']);
	});

	test('filters out empty strings', () => {
		const result = parseBulkIds('123,,456,,,789');
		expect(result).toEqual(['123', '456', '789']);
	});

	test('handles empty string input', () => {
		const result = parseBulkIds('');
		expect(result).toEqual([]);
	});

	test('handles empty array input', () => {
		const result = parseBulkIds([]);
		expect(result).toEqual([]);
	});

	test('handles single ID', () => {
		const result = parseBulkIds('123');
		expect(result).toEqual(['123']);
	});

	test('handles IDs with leading zeros', () => {
		const result = parseBulkIds('001,002,003');
		expect(result).toEqual(['001', '002', '003']);
	});

	test('handles alphanumeric IDs', () => {
		const result = parseBulkIds('abc123,def456,ghi789');
		expect(result).toEqual(['abc123', 'def456', 'ghi789']);
	});

	test('handles IDs with hyphens and underscores', () => {
		const result = parseBulkIds('proj-123,user_456,item-789');
		expect(result).toEqual(['proj-123', 'user_456', 'item-789']);
	});
});

describe('chunkArray', () => {
	test('splits array into chunks of specified size', () => {
		const result = chunkArray([1, 2, 3, 4, 5], 2);
		expect(result).toEqual([[1, 2], [3, 4], [5]]);
	});

	test('handles exact division', () => {
		const result = chunkArray([1, 2, 3, 4, 5, 6], 3);
		expect(result).toEqual([[1, 2, 3], [4, 5, 6]]);
	});

	test('handles chunk size larger than array', () => {
		const result = chunkArray([1, 2, 3], 10);
		expect(result).toEqual([[1, 2, 3]]);
	});

	test('handles empty array', () => {
		const result = chunkArray([], 3);
		expect(result).toEqual([]);
	});

	test('handles chunk size of 1', () => {
		const result = chunkArray([1, 2, 3], 1);
		expect(result).toEqual([[1], [2], [3]]);
	});

	test('handles string array', () => {
		const result = chunkArray(['a', 'b', 'c', 'd', 'e'], 2);
		expect(result).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
	});

	test('preserves object references', () => {
		const obj1 = { id: 1 };
		const obj2 = { id: 2 };
		const result = chunkArray([obj1, obj2], 1);

		expect(result[0][0]).toBe(obj1);
		expect(result[1][0]).toBe(obj2);
	});
});

describe('fetchBulk', () => {
	test('fetches all items successfully', async () => {
		const mockFetch = mock(async (id: string) => ({ id, name: `Item ${id}` }));

		const results = await fetchBulk(['1', '2', '3'], mockFetch, { showProgress: false });

		expect(results.length).toBe(3);
		expect(results.every((r) => r.success)).toBe(true);
		expect(results[0].data).toEqual({ id: '1', name: 'Item 1' });
		expect(results[1].data).toEqual({ id: '2', name: 'Item 2' });
		expect(results[2].data).toEqual({ id: '3', name: 'Item 3' });
	});

	test('handles partial failures gracefully', async () => {
		const mockFetch = mock(async (id: string) => {
			if (id === '2') {
				throw new Error('Item not found');
			}
			return { id, name: `Item ${id}` };
		});

		const results = await fetchBulk(['1', '2', '3'], mockFetch, { showProgress: false });

		expect(results.length).toBe(3);
		expect(results[0].success).toBe(true);
		expect(results[1].success).toBe(false);
		expect(results[2].success).toBe(true);

		expect(results[1].error?.message).toBe('Item not found');
	});

	test('respects concurrency limit', async () => {
		let activeRequests = 0;
		let maxConcurrent = 0;

		const mockFetch = mock(async (id: string) => {
			activeRequests++;
			maxConcurrent = Math.max(maxConcurrent, activeRequests);
			await new Promise((resolve) => setTimeout(resolve, 10));
			activeRequests--;
			return { id };
		});

		await fetchBulk(['1', '2', '3', '4', '5', '6'], mockFetch, {
			concurrency: 2,
			showProgress: false
		});

		expect(maxConcurrent).toBeLessThanOrEqual(2);
	});

	test('stops on first error when failFast is true', async () => {
		const mockFetch = mock(async (id: string) => {
			if (id === '2') {
				throw new Error('Item not found');
			}
			return { id, name: `Item ${id}` };
		});

		const results = await fetchBulk(['1', '2', '3', '4', '5'], mockFetch, {
			failFast: true,
			showProgress: false,
			concurrency: 1 // Process one at a time to ensure order
		});

		// Should stop after encountering error on '2'
		expect(results.length).toBeLessThan(5);
		expect(results.some((r) => !r.success)).toBe(true);
	});

	test('continues on error when failFast is false', async () => {
		const mockFetch = mock(async (id: string) => {
			if (id === '2') {
				throw new Error('Item not found');
			}
			return { id, name: `Item ${id}` };
		});

		const results = await fetchBulk(['1', '2', '3'], mockFetch, {
			failFast: false,
			showProgress: false
		});

		expect(results.length).toBe(3);
		expect(results.filter((r) => r.success).length).toBe(2);
		expect(results.filter((r) => !r.success).length).toBe(1);
	});

	test('handles empty ID array', async () => {
		const mockFetch = mock(async (id: string) => ({ id }));

		const results = await fetchBulk([], mockFetch, { showProgress: false });

		expect(results).toEqual([]);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('includes status codes in error results', async () => {
		const mockFetch = mock(async (id: string) => {
			if (id === '2') {
				const error: any = new Error('Not found');
				error.statusCode = 404;
				throw error;
			}
			return { id };
		});

		const results = await fetchBulk(['1', '2', '3'], mockFetch, { showProgress: false });

		expect(results[1].success).toBe(false);
		expect(results[1].error?.statusCode).toBe(404);
	});

	test('uses custom operation description', async () => {
		const mockFetch = mock(async (id: string) => ({ id }));

		// This test just verifies the operation parameter is accepted
		await fetchBulk(['1', '2'], mockFetch, {
			operation: 'Custom operation',
			showProgress: false
		});

		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	test('handles async errors correctly', async () => {
		const mockFetch = mock(async (id: string) => {
			throw new Error(`Error for ${id}`);
		});

		const results = await fetchBulk(['1', '2'], mockFetch, { showProgress: false });

		expect(results.every((r) => !r.success)).toBe(true);
		expect(results[0].error?.message).toBe('Error for 1');
		expect(results[1].error?.message).toBe('Error for 2');
	});
});

describe('deleteBulk', () => {
	test('deletes all items successfully', async () => {
		const mockDelete = mock(async (id: string) => {});

		const results = await deleteBulk(['1', '2', '3'], mockDelete, { showProgress: false });

		expect(results.length).toBe(3);
		expect(results.every((r) => r.success)).toBe(true);
		expect(mockDelete).toHaveBeenCalledTimes(3);
	});

	test('handles deletion failures', async () => {
		const mockDelete = mock(async (id: string) => {
			if (id === '2') {
				throw new Error('Cannot delete');
			}
		});

		const results = await deleteBulk(['1', '2', '3'], mockDelete, { showProgress: false });

		expect(results.length).toBe(3);
		expect(results[0].success).toBe(true);
		expect(results[1].success).toBe(false);
		expect(results[2].success).toBe(true);
	});

	test('uses default operation description', async () => {
		const mockDelete = mock(async (id: string) => {});

		// Verify it accepts the operation parameter
		await deleteBulk(['1'], mockDelete, {
			operation: 'Deleting items',
			showProgress: false
		});

		expect(mockDelete).toHaveBeenCalledTimes(1);
	});
});

describe('formatBulkResults', () => {
	test('formats successful results', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: true, data: { name: 'Item 1' } },
			{ id: '2', success: true, data: { name: 'Item 2' } }
		];

		const formatted = formatBulkResults(results, 'connector');

		expect(formatted).toContain('Successfully processed 2 connectors');
		expect(formatted).toContain('- 1');
		expect(formatted).toContain('- 2');
	});

	test('formats failed results', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: false, error: { message: 'Not found', statusCode: 404 } },
			{ id: '2', success: false, error: { message: 'Access denied', statusCode: 403 } }
		];

		const formatted = formatBulkResults(results, 'connector');

		expect(formatted).toContain('Failed to process 2 connectors');
		expect(formatted).toContain('- 1: Not found (404)');
		expect(formatted).toContain('- 2: Access denied (403)');
	});

	test('formats mixed results', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: true, data: { name: 'Item 1' } },
			{ id: '2', success: false, error: { message: 'Not found', statusCode: 404 } },
			{ id: '3', success: true, data: { name: 'Item 3' } }
		];

		const formatted = formatBulkResults(results, 'connector');

		expect(formatted).toContain('Successfully processed 2 connectors');
		expect(formatted).toContain('Failed to process 1 connector');
		expect(formatted).toContain('- 1');
		expect(formatted).toContain('- 3');
		expect(formatted).toContain('- 2: Not found (404)');
	});

	test('handles singular resource name', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: true, data: { name: 'Item 1' } }
		];

		const formatted = formatBulkResults(results, 'connector');

		expect(formatted).toContain('Successfully processed 1 connector');
		expect(formatted).not.toContain('connectors'); // Should be singular
	});

	test('handles plural resource name', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: true, data: { name: 'Item 1' } },
			{ id: '2', success: true, data: { name: 'Item 2' } }
		];

		const formatted = formatBulkResults(results, 'connector');

		expect(formatted).toContain('Successfully processed 2 connectors');
	});

	test('formats errors without status codes', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: false, error: { message: 'Unknown error' } }
		];

		const formatted = formatBulkResults(results, 'connector');

		expect(formatted).toContain('- 1: Unknown error');
		expect(formatted).not.toContain('('); // No status code
	});

	test('handles empty results', () => {
		const results: BulkResult<any>[] = [];
		const formatted = formatBulkResults(results, 'connector');

		expect(formatted).toBe('');
	});
});

describe('handleBulkErrors', () => {
	test('does not throw when all results successful', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: true, data: { name: 'Item 1' } },
			{ id: '2', success: true, data: { name: 'Item 2' } }
		];

		expect(() => {
			handleBulkErrors(results, 'connector');
		}).not.toThrow();
	});

	test('throws error when any result failed', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: true, data: { name: 'Item 1' } },
			{ id: '2', success: false, error: { message: 'Not found', statusCode: 404 } }
		];

		expect(() => {
			handleBulkErrors(results, 'connector');
		}).toThrow();
	});

	test('error message includes failed IDs', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: false, error: { message: 'Not found', statusCode: 404 } },
			{ id: '2', success: false, error: { message: 'Access denied', statusCode: 403 } }
		];

		try {
			handleBulkErrors(results, 'connector');
			expect(true).toBe(false); // Should not reach here
		} catch (error: any) {
			expect(error.message).toContain('Failed to process 2 connectors');
			expect(error.message).toContain('1, 2');
		}
	});

	test('error message includes formatted results', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: false, error: { message: 'Not found', statusCode: 404 } }
		];

		try {
			handleBulkErrors(results, 'connector');
			expect(true).toBe(false); // Should not reach here
		} catch (error: any) {
			expect(error.message).toContain('- 1: Not found (404)');
		}
	});

	test('uses singular form for single failure', () => {
		const results: BulkResult<any>[] = [
			{ id: '1', success: false, error: { message: 'Not found', statusCode: 404 } }
		];

		try {
			handleBulkErrors(results, 'connector');
			expect(true).toBe(false); // Should not reach here
		} catch (error: any) {
			expect(error.message).toContain('Failed to process 1 connector');
			expect(error.message).not.toContain('connectors');
		}
	});
});

describe('Integration Tests', () => {
	test('complete bulk fetch flow', async () => {
		const mockFetch = mock(async (id: string) => {
			if (id === '2') {
				throw new Error('Item not found');
			}
			return { id, name: `Item ${id}` };
		});

		const results = await fetchBulk(['1', '2', '3'], mockFetch, { showProgress: false });
		const formatted = formatBulkResults(results, 'connector');

		expect(results.length).toBe(3);
		expect(formatted).toContain('Successfully processed 2 connectors');
		expect(formatted).toContain('Failed to process 1 connector');
	});

	test('bulk operation with error handling', async () => {
		const mockFetch = mock(async (id: string) => {
			throw new Error('All failed');
		});

		const results = await fetchBulk(['1', '2'], mockFetch, { showProgress: false });

		expect(() => {
			handleBulkErrors(results, 'connector');
		}).toThrow('Failed to process 2 connectors');
	});

	test('parse IDs and fetch bulk', async () => {
		const ids = parseBulkIds('1, 2, 3');
		const mockFetch = mock(async (id: string) => ({ id, name: `Item ${id}` }));

		const results = await fetchBulk(ids, mockFetch, { showProgress: false });

		expect(results.length).toBe(3);
		expect(results.every((r) => r.success)).toBe(true);
	});

	test('chunked processing with concurrency', async () => {
		const ids = Array.from({ length: 10 }, (_, i) => String(i + 1));
		const mockFetch = mock(async (id: string) => ({ id }));

		const results = await fetchBulk(ids, mockFetch, {
			concurrency: 3,
			showProgress: false
		});

		expect(results.length).toBe(10);
		expect(mockFetch).toHaveBeenCalledTimes(10);
	});
});

describe('Edge Cases', () => {
	test('handles non-standard error objects', async () => {
		const mockFetch = mock(async (id: string) => {
			throw 'String error'; // Non-Error object
		});

		const results = await fetchBulk(['1'], mockFetch, { showProgress: false });

		expect(results[0].success).toBe(false);
		expect(results[0].error?.message).toBe('String error');
	});

	test('handles errors without messages', async () => {
		const mockFetch = mock(async (id: string) => {
			const error: any = new Error();
			error.message = '';
			throw error;
		});

		const results = await fetchBulk(['1'], mockFetch, { showProgress: false });

		expect(results[0].success).toBe(false);
		expect(results[0].error?.message).toBeDefined();
	});

	test('handles very large batch sizes', async () => {
		const ids = Array.from({ length: 100 }, (_, i) => String(i));
		const mockFetch = mock(async (id: string) => ({ id }));

		const results = await fetchBulk(ids, mockFetch, {
			concurrency: 10,
			showProgress: false
		});

		expect(results.length).toBe(100);
		expect(results.every((r) => r.success)).toBe(true);
	});

	test('handles IDs with special characters', () => {
		const result = parseBulkIds('id-1, id_2, id.3, id@4');
		expect(result).toEqual(['id-1', 'id_2', 'id.3', 'id@4']);
	});

	test('handles very long ID strings', () => {
		const longId = 'a'.repeat(1000);
		const result = parseBulkIds(`${longId}, 123`);
		expect(result).toEqual([longId, '123']);
	});
});
