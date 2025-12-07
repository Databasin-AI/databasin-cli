/**
 * Shared Command Helper Utilities
 *
 * Common utility functions used across multiple CLI commands.
 * This module extracts duplicate code patterns to ensure DRY principles
 * and maintain consistency across command implementations.
 *
 * @module utils/command-helpers
 */

import { readFileSync } from 'fs';
import { formatTable } from './formatters.ts';

/**
 * Parse comma-separated fields option into array
 *
 * Converts a comma-separated string of field names into an array,
 * trimming whitespace from each field name.
 *
 * @param fieldsOption - Comma-separated field string (e.g., "id,name,status")
 * @returns Array of field names, or undefined if not provided
 *
 * @example
 * ```typescript
 * parseFields('id, name, status') // ['id', 'name', 'status']
 * parseFields('id,name') // ['id', 'name']
 * parseFields(undefined) // undefined
 * ```
 */
export function parseFields(fieldsOption?: string): string[] | undefined {
	if (!fieldsOption) return undefined;
	return fieldsOption.split(',').map((f) => f.trim());
}

/**
 * Read and parse JSON file with helpful error messages
 *
 * Reads a file from disk and parses it as JSON, providing clear error
 * messages for common failure scenarios (file not found, invalid JSON).
 *
 * @param filePath - Path to JSON file (relative or absolute)
 * @returns Parsed JSON object
 * @throws {Error} For file not found or invalid JSON with descriptive message
 *
 * @example
 * ```typescript
 * const config = readJsonFile<ConnectorConfig>('./connector.json');
 * const pipeline = readJsonFile('./pipeline.json');
 * ```
 */
export function readJsonFile<T = any>(filePath: string): T {
	try {
		const content = readFileSync(filePath, 'utf-8');
		return JSON.parse(content) as T;
	} catch (error) {
		if (error instanceof Error) {
			if ((error as any).code === 'ENOENT') {
				throw new Error(`File not found: ${filePath}`);
			} else if (error instanceof SyntaxError) {
				throw new Error(`Invalid JSON in file: ${filePath}\n${error.message}`);
			}
		}
		throw error;
	}
}

/**
 * Filter object or array to only include specified fields
 *
 * Supports nested paths using dot notation (e.g., 'account.email').
 * This is the shared implementation used across all commands for
 * consistent field filtering behavior.
 *
 * Features:
 * - Handles arrays by filtering each element
 * - Supports nested field paths with dot notation
 * - Handles null/undefined gracefully
 * - Preserves nested structure for dot paths
 *
 * @param data - Object or array to filter
 * @param fields - Comma-separated string or array of field names
 * @returns Filtered data with only specified fields
 *
 * @example Simple fields
 * ```typescript
 * filterFields({ id: 1, name: 'test', age: 30 }, 'id,name')
 * // Returns: { id: 1, name: 'test' }
 * ```
 *
 * @example Nested paths
 * ```typescript
 * filterFields({ account: { email: 'test@example.com', id: 5 } }, 'account.email')
 * // Returns: { account: { email: 'test@example.com' } }
 * ```
 *
 * @example Arrays
 * ```typescript
 * filterFields([{ id: 1, name: 'a' }, { id: 2, name: 'b' }], 'id')
 * // Returns: [{ id: 1 }, { id: 2 }]
 * ```
 *
 * @example Mixed paths and fields
 * ```typescript
 * filterFields(
 *   { account: { email: 'test@example.com', id: 5 }, organizations: [...] },
 *   'account.email,organizations'
 * )
 * // Returns: { account: { email: 'test@example.com' }, organizations: [...] }
 * ```
 */
export function filterFields(data: any, fields: string | string[]): any {
	// Handle null/undefined
	if (data === null || data === undefined) {
		return data;
	}

	// Parse fields if string
	const fieldList = typeof fields === 'string' ? fields.split(',').map((f) => f.trim()) : fields;

	// Handle arrays - filter each element
	if (Array.isArray(data)) {
		return data.map((item) => filterFields(item, fieldList));
	}

	// Handle primitives
	if (typeof data !== 'object') {
		return data;
	}

	// Filter object fields
	const result: Record<string, any> = {};

	for (const field of fieldList) {
		// Handle nested paths (e.g., 'account.email')
		if (field.includes('.')) {
			const parts = field.split('.');
			const firstPart = parts[0];

			if (firstPart in data) {
				// Ensure nested structure exists
				if (!result[firstPart]) {
					result[firstPart] = {};
				}

				// Recursively filter nested object
				const remainingPath = parts.slice(1).join('.');
				const nestedFiltered = filterFields(data[firstPart], [remainingPath]);

				// Merge into result
				if (typeof nestedFiltered === 'object' && nestedFiltered !== null) {
					result[firstPart] = { ...result[firstPart], ...nestedFiltered };
				}
			}
		} else {
			// Simple field
			if (field in data) {
				result[field] = data[field];
			}
		}
	}

	return result;
}

/**
 * Format single object as transposed key-value table
 *
 * Used for displaying single resource details in a vertical key-value format.
 * This is more readable than horizontal tables for detailed object views.
 *
 * Handles various value types:
 * - null/undefined: displayed as '-'
 * - Objects: pretty-printed JSON (2-space indent)
 * - Arrays: JSON stringified
 * - Primitives: converted to string
 *
 * Special handling for 'configuration' fields to ensure proper formatting.
 *
 * @param data - Single object to display
 * @param fields - Optional field filter (only show specified fields)
 * @returns Formatted table string
 *
 * @example
 * ```typescript
 * const connector = {
 *   connectorID: '123',
 *   connectorName: 'My DB',
 *   status: 'active',
 *   configuration: { host: 'dbserver', port: 5432 }
 * };
 *
 * console.log(formatSingleObject(connector));
 * // Output:
 * // ┌───────────────┬──────────────────────┐
 * // │ Field         │ Value                │
 * // ├───────────────┼──────────────────────┤
 * // │ connectorID   │ 123                  │
 * // │ connectorName │ My DB                │
 * // │ status        │ active               │
 * // │ configuration │ {                    │
 * // │               │   "host": "dbserver"│
 * // │               │   "port": 5432       │
 * // │               │ }                    │
 * // └───────────────┴──────────────────────┘
 *
 * // Filter specific fields
 * console.log(formatSingleObject(connector, ['connectorName', 'status']));
 * ```
 */
export function formatSingleObject(data: Record<string, any>, fields?: string[]): string {
	const keys = fields || Object.keys(data);
	const rows = keys
		.filter((key) => data[key] !== undefined)
		.map((key) => {
			let value = data[key];

			// Format values for display
			if (value === null || value === undefined) {
				value = '-';
			} else if (key === 'configuration' || (typeof value === 'object' && !Array.isArray(value))) {
				// Pretty-print configuration objects
				value = JSON.stringify(value, null, 2);
			} else if (Array.isArray(value)) {
				value = JSON.stringify(value);
			} else {
				value = String(value);
			}

			return { Field: key, Value: value };
		});

	return formatTable(rows, { fields: ['Field', 'Value'] });
}
