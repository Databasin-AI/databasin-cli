/**
 * Bulk Operations Utilities
 *
 * Provides utilities for handling bulk operations like fetching or deleting
 * multiple resources in parallel with progress indicators.
 *
 * // TODO: migrate to API - server-side bulk endpoints would be more efficient
 *
 * @module utils/bulk-operations
 */

import type { Ora } from 'ora';
import { startSpinner, succeedSpinner, failSpinner, logWarning } from './progress.ts';

/**
 * Bulk operation options
 */
export interface BulkOptions {
	/** Maximum number of concurrent operations (default: 5) */
	concurrency?: number;
	/** Stop on first error (default: false) */
	failFast?: boolean;
	/** Show progress indicator (default: true) */
	showProgress?: boolean;
	/** Operation description for progress messages */
	operation?: string;
}

/**
 * Result of a bulk operation for a single item
 */
export interface BulkResult<T> {
	/** The ID that was processed */
	id: string;
	/** Whether the operation succeeded */
	success: boolean;
	/** The result data (if successful) */
	data?: T;
	/** Error information (if failed) */
	error?: {
		message: string;
		statusCode?: number;
	};
}

/**
 * Parse comma or space-separated IDs into an array
 *
 * Supports multiple input formats:
 * - Comma-separated: "123,456,789"
 * - Space-separated: "123 456 789"
 * - Mixed: "123, 456 789"
 * - Array: ["123", "456", "789"]
 *
 * @param input - ID string or array of IDs
 * @returns Array of trimmed, deduplicated IDs
 *
 * @example
 * ```typescript
 * parseBulkIds('123,456,789')
 * // ['123', '456', '789']
 *
 * parseBulkIds('123, 456, 789')
 * // ['123', '456', '789']
 *
 * parseBulkIds(['123', '456'])
 * // ['123', '456']
 * ```
 */
export function parseBulkIds(input: string | string[]): string[] {
	// If already an array, just trim and deduplicate
	if (Array.isArray(input)) {
		return Array.from(new Set(input.map((id) => id.trim()).filter((id) => id.length > 0)));
	}

	// Split by comma or space, trim, and deduplicate
	const ids = input
		.split(/[,\s]+/)
		.map((id) => id.trim())
		.filter((id) => id.length > 0);

	return Array.from(new Set(ids));
}

/**
 * Execute bulk operations with concurrency control and progress tracking
 *
 * Fetches multiple items in parallel with configurable concurrency.
 * Handles partial failures gracefully and provides progress feedback.
 *
 * @param ids - Array of IDs to process
 * @param fetchFn - Async function that fetches/processes a single ID
 * @param options - Bulk operation options
 * @returns Array of bulk results (one per ID)
 *
 * @example
 * ```typescript
 * const ids = ['123', '456', '789'];
 * const results = await fetchBulk(
 *   ids,
 *   (id) => connectorsClient.getById(id),
 *   { concurrency: 3, operation: 'Fetching connectors' }
 * );
 *
 * // Filter successful results
 * const successful = results.filter(r => r.success).map(r => r.data);
 * const failed = results.filter(r => !r.success);
 * ```
 */
export async function fetchBulk<T>(
	ids: string[],
	fetchFn: (id: string) => Promise<T>,
	options: BulkOptions = {}
): Promise<BulkResult<T>[]> {
	const {
		concurrency = 5,
		failFast = false,
		showProgress = true,
		operation = 'Fetching items'
	} = options;

	const results: BulkResult<T>[] = [];
	let spinner: Ora | undefined;

	if (showProgress) {
		spinner = startSpinner(`${operation}... (0/${ids.length})`);
	}

	// Process IDs in batches based on concurrency
	for (let i = 0; i < ids.length; i += concurrency) {
		const batch = ids.slice(i, i + concurrency);

		// Execute batch in parallel
		const batchPromises = batch.map(async (id): Promise<BulkResult<T>> => {
			try {
				const data = await fetchFn(id);
				return { id, success: true, data };
			} catch (error: any) {
				return {
					id,
					success: false,
					error: {
						message: error.message || String(error),
						statusCode: error.statusCode
					}
				};
			}
		});

		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults);

		// Update progress
		if (spinner) {
			const completed = results.length;
			const successful = results.filter((r) => r.success).length;
			const failed = results.filter((r) => !r.success).length;

			const progressMsg = failed > 0
				? `${operation}... (${successful} ok, ${failed} failed / ${ids.length} total)`
				: `${operation}... (${completed}/${ids.length})`;

			spinner.text = progressMsg;
		}

		// Stop if failFast and we have errors
		if (failFast && batchResults.some((r) => !r.success)) {
			if (spinner) {
				failSpinner(spinner, `${operation} failed (stopped on first error)`);
			}
			break;
		}
	}

	// Final spinner status
	if (spinner) {
		const successful = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;

		if (failed === 0) {
			succeedSpinner(spinner, `${operation} complete (${successful} items)`);
		} else if (successful === 0) {
			failSpinner(spinner, `${operation} failed (all ${failed} items failed)`);
		} else {
			// Partial success - show as warning
			succeedSpinner(spinner, `${operation} complete (${successful} ok, ${failed} failed)`);
			if (showProgress) {
				logWarning(`${failed} of ${ids.length} items failed`);
			}
		}
	}

	return results;
}

/**
 * Format bulk results for display
 *
 * Creates a human-readable summary of bulk operation results,
 * showing which IDs succeeded and which failed.
 *
 * @param results - Array of bulk results
 * @param resourceName - Name of the resource type (e.g., "connector", "pipeline")
 * @returns Formatted summary string
 *
 * @example
 * ```typescript
 * const summary = formatBulkResults(results, 'connector');
 * console.log(summary);
 * // Output:
 * // Successfully processed 2 connectors:
 * //   - 123
 * //   - 456
 * //
 * // Failed to process 1 connector:
 * //   - 789: Connector not found (404)
 * ```
 */
export function formatBulkResults<T>(results: BulkResult<T>[], resourceName: string): string {
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	const lines: string[] = [];

	if (successful.length > 0) {
		const plural = successful.length === 1 ? resourceName : `${resourceName}s`;
		lines.push(`Successfully processed ${successful.length} ${plural}:`);
		for (const result of successful) {
			lines.push(`  - ${result.id}`);
		}
	}

	if (failed.length > 0) {
		if (successful.length > 0) {
			lines.push('');
		}
		const plural = failed.length === 1 ? resourceName : `${resourceName}s`;
		lines.push(`Failed to process ${failed.length} ${plural}:`);
		for (const result of failed) {
			const statusCode = result.error?.statusCode ? ` (${result.error.statusCode})` : '';
			lines.push(`  - ${result.id}: ${result.error?.message}${statusCode}`);
		}
	}

	return lines.join('\n');
}

/**
 * Handle bulk errors and format for display
 *
 * Analyzes bulk results and throws an error if any operations failed,
 * or returns successfully if all passed.
 *
 * @param results - Array of bulk results
 * @param resourceName - Name of the resource type
 * @throws Error if any operations failed
 *
 * @example
 * ```typescript
 * const results = await fetchBulk(...);
 * try {
 *   handleBulkErrors(results, 'connector');
 *   console.log('All operations successful!');
 * } catch (error) {
 *   console.error(error.message); // Shows failure summary
 * }
 * ```
 */
export function handleBulkErrors<T>(results: BulkResult<T>[], resourceName: string): void {
	const failed = results.filter((r) => !r.success);

	if (failed.length > 0) {
		const plural = failed.length === 1 ? resourceName : `${resourceName}s`;
		const failedIds = failed.map((r) => r.id).join(', ');
		throw new Error(
			`Failed to process ${failed.length} ${plural} (${failedIds})\n\n${formatBulkResults(results, resourceName)}`
		);
	}
}

/**
 * Split an array into chunks of specified size
 *
 * Utility function for batching operations.
 *
 * @param array - Array to chunk
 * @param chunkSize - Size of each chunk
 * @returns Array of chunks
 *
 * @example
 * ```typescript
 * chunkArray([1, 2, 3, 4, 5], 2)
 * // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}

/**
 * Execute bulk delete operations with confirmation
 *
 * Similar to fetchBulk but optimized for delete operations.
 * Deletes items in parallel with progress tracking.
 *
 * @param ids - Array of IDs to delete
 * @param deleteFn - Async function that deletes a single ID
 * @param options - Bulk operation options
 * @returns Array of bulk results
 *
 * @example
 * ```typescript
 * const ids = ['123', '456', '789'];
 * const results = await deleteBulk(
 *   ids,
 *   (id) => connectorsClient.deleteById(id),
 *   { operation: 'Deleting connectors' }
 * );
 * ```
 */
export async function deleteBulk(
	ids: string[],
	deleteFn: (id: string) => Promise<void>,
	options: BulkOptions = {}
): Promise<BulkResult<void>[]> {
	const defaultOptions: BulkOptions = {
		operation: 'Deleting items',
		...options
	};

	return fetchBulk(ids, deleteFn, defaultOptions);
}
