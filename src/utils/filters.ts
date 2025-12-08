/**
 * Filter Utilities for Client-Side Data Filtering
 *
 * Provides reusable functions for filtering arrays of objects by various criteria.
 * Designed for use with connector, pipeline, and other resource lists.
 *
 * // TODO: migrate to API - server-side filtering would be more efficient
 *
 * @module utils/filters
 */

/**
 * Filter options for flexible filtering
 */
export interface FilterOptions {
	/** Case-insensitive matching (default: true) */
	ignoreCase?: boolean;
	/** Use regex pattern matching (default: false) */
	useRegex?: boolean;
	/** Trim whitespace before matching (default: true) */
	trim?: boolean;
}

/**
 * Filter items by name using substring or regex matching
 *
 * Searches for a pattern in the specified field (default: name-related fields).
 * Supports case-insensitive substring matching and regex patterns.
 *
 * @param items - Array of items to filter
 * @param pattern - Pattern to match (substring or regex)
 * @param options - Filter options (case sensitivity, regex mode, etc.)
 * @returns Filtered array containing only matching items
 *
 * @example
 * ```typescript
 * const connectors = [
 *   { connectorName: 'PostgreSQL DB', connectorType: 'database' },
 *   { connectorName: 'MySQL DB', connectorType: 'database' },
 *   { connectorName: 'Snowflake', connectorType: 'cloud' }
 * ];
 *
 * filterByName(connectors, 'postgres')
 * // [{ connectorName: 'PostgreSQL DB', ... }]
 *
 * filterByName(connectors, '^MySQL', { useRegex: true })
 * // [{ connectorName: 'MySQL DB', ... }]
 * ```
 */
export function filterByName<T extends Record<string, any>>(
	items: T[],
	pattern: string,
	options: FilterOptions = {}
): T[] {
	const { ignoreCase = true, useRegex = false, trim = true } = options;

	// Normalize pattern
	let searchPattern = trim ? pattern.trim() : pattern;
	if (ignoreCase && !useRegex) {
		searchPattern = searchPattern.toLowerCase();
	}

	// Create regex if requested
	let regex: RegExp | null = null;
	if (useRegex) {
		try {
			const flags = ignoreCase ? 'i' : '';
			regex = new RegExp(searchPattern, flags);
		} catch (error) {
			// Invalid regex, fall back to substring matching
			regex = null;
		}
	}

	return items.filter((item) => {
		// Try multiple name-related fields
		const nameFields = ['name', 'connectorName', 'pipelineName', 'automationName', 'projectName'];

		for (const field of nameFields) {
			if (field in item && typeof item[field] === 'string') {
				let value = trim ? item[field].trim() : item[field];

				if (regex) {
					if (regex.test(value)) {
						return true;
					}
				} else {
					if (ignoreCase) {
						value = value.toLowerCase();
					}
					if (value.includes(searchPattern)) {
						return true;
					}
				}
			}
		}

		return false;
	});
}

/**
 * Filter items by a specific field value
 *
 * Performs exact or partial matching on a specified field.
 *
 * @param items - Array of items to filter
 * @param field - Field name to filter on
 * @param value - Value to match (exact or substring)
 * @param options - Filter options
 * @returns Filtered array containing only matching items
 *
 * @example
 * ```typescript
 * const connectors = [
 *   { connectorType: 'database', status: 'active' },
 *   { connectorType: 'cloud', status: 'inactive' },
 *   { connectorType: 'database', status: 'active' }
 * ];
 *
 * filterByField(connectors, 'connectorType', 'database')
 * // Returns first and third connectors
 *
 * filterByField(connectors, 'status', 'active')
 * // Returns first and third connectors
 * ```
 */
export function filterByField<T extends Record<string, any>>(
	items: T[],
	field: string,
	value: any,
	options: FilterOptions = {}
): T[] {
	const { ignoreCase = true, trim = true } = options;

	// Normalize value for string comparison
	let searchValue = value;
	if (typeof value === 'string') {
		searchValue = trim ? value.trim() : value;
		if (ignoreCase) {
			searchValue = searchValue.toLowerCase();
		}
	}

	return items.filter((item) => {
		if (!(field in item)) {
			return false;
		}

		let itemValue = item[field];

		// Handle string comparisons
		if (typeof itemValue === 'string' && typeof searchValue === 'string') {
			if (trim) {
				itemValue = itemValue.trim();
			}
			if (ignoreCase) {
				itemValue = itemValue.toLowerCase();
			}
			return itemValue === searchValue || itemValue.includes(searchValue);
		}

		// Handle exact matches for other types
		return itemValue === value;
	});
}

/**
 * Filter items by type
 *
 * Convenience function for filtering by connectorType, pipelineType, etc.
 * Searches both 'type' and '{resource}Type' fields.
 *
 * @param items - Array of items to filter
 * @param type - Type value to match
 * @param options - Filter options
 * @returns Filtered array containing only matching items
 *
 * @example
 * ```typescript
 * const connectors = [
 *   { connectorType: 'database' },
 *   { connectorType: 'cloud' },
 *   { connectorType: 'database' }
 * ];
 *
 * filterByType(connectors, 'database')
 * // Returns first and third connectors
 * ```
 */
export function filterByType<T extends Record<string, any>>(
	items: T[],
	type: string,
	options: FilterOptions = {}
): T[] {
	const { ignoreCase = true } = options;

	const searchType = ignoreCase ? type.toLowerCase() : type;

	return items.filter((item) => {
		// Try multiple type fields
		const typeFields = ['type', 'connectorType', 'pipelineType', 'automationType'];

		for (const field of typeFields) {
			if (field in item && typeof item[field] === 'string') {
				const itemType = ignoreCase ? item[field].toLowerCase() : item[field];
				if (itemType === searchType || itemType.includes(searchType)) {
					return true;
				}
			}
		}

		return false;
	});
}

/**
 * Filter items by status
 *
 * Convenience function for filtering by status field.
 *
 * @param items - Array of items to filter
 * @param status - Status value to match (e.g., 'active', 'inactive', 'running')
 * @param options - Filter options
 * @returns Filtered array containing only matching items
 *
 * @example
 * ```typescript
 * const pipelines = [
 *   { pipelineName: 'Pipeline 1', status: 'active' },
 *   { pipelineName: 'Pipeline 2', status: 'inactive' },
 *   { pipelineName: 'Pipeline 3', status: 'running' }
 * ];
 *
 * filterByStatus(pipelines, 'active')
 * // Returns first pipeline
 * ```
 */
export function filterByStatus<T extends Record<string, any>>(
	items: T[],
	status: string,
	options: FilterOptions = {}
): T[] {
	return filterByField(items, 'status', status, options);
}

/**
 * Filter items by project ID
 *
 * Convenience function for filtering by project-related fields.
 * Searches both 'projectId' and 'internalID' fields.
 *
 * @param items - Array of items to filter
 * @param projectId - Project ID to match
 * @returns Filtered array containing only matching items
 *
 * @example
 * ```typescript
 * const connectors = [
 *   { connectorName: 'Connector 1', internalID: 'proj-123' },
 *   { connectorName: 'Connector 2', internalID: 'proj-456' },
 *   { connectorName: 'Connector 3', internalID: 'proj-123' }
 * ];
 *
 * filterByProject(connectors, 'proj-123')
 * // Returns first and third connectors
 * ```
 */
export function filterByProject<T extends Record<string, any>>(items: T[], projectId: string): T[] {
	return items.filter((item) => {
		const projectFields = ['projectId', 'internalID', 'project'];

		for (const field of projectFields) {
			if (field in item && item[field] === projectId) {
				return true;
			}
		}

		return false;
	});
}

/**
 * Filter items by regex pattern on a specific field
 *
 * Applies a regex pattern to a specified field.
 *
 * @param items - Array of items to filter
 * @param field - Field name to apply regex to
 * @param pattern - Regex pattern (as string or RegExp)
 * @param options - Filter options (mainly ignoreCase)
 * @returns Filtered array containing only matching items
 *
 * @example
 * ```typescript
 * const connectors = [
 *   { connectorName: 'PostgreSQL-prod' },
 *   { connectorName: 'PostgreSQL-dev' },
 *   { connectorName: 'MySQL-prod' }
 * ];
 *
 * filterByRegex(connectors, 'connectorName', '.*-prod$')
 * // Returns first and third connectors
 *
 * filterByRegex(connectors, 'connectorName', '^PostgreSQL')
 * // Returns first and second connectors
 * ```
 */
export function filterByRegex<T extends Record<string, any>>(
	items: T[],
	field: string,
	pattern: string | RegExp,
	options: FilterOptions = {}
): T[] {
	const { ignoreCase = true } = options;

	// Create regex
	let regex: RegExp;
	try {
		if (typeof pattern === 'string') {
			const flags = ignoreCase ? 'i' : '';
			regex = new RegExp(pattern, flags);
		} else {
			regex = pattern;
		}
	} catch (error) {
		// Invalid regex, return empty array
		return [];
	}

	return items.filter((item) => {
		if (!(field in item)) {
			return false;
		}

		const value = item[field];

		if (typeof value === 'string') {
			return regex.test(value);
		}

		// Try to convert to string for non-string fields
		return regex.test(String(value));
	});
}

/**
 * Combine multiple filters with AND logic
 *
 * Applies multiple filter functions sequentially, keeping only items
 * that pass all filters.
 *
 * @param items - Array of items to filter
 * @param filters - Array of filter functions to apply
 * @returns Filtered array containing only items that pass all filters
 *
 * @example
 * ```typescript
 * const connectors = [
 *   { connectorName: 'PostgreSQL-prod', connectorType: 'database', status: 'active' },
 *   { connectorName: 'PostgreSQL-dev', connectorType: 'database', status: 'inactive' },
 *   { connectorName: 'Snowflake-prod', connectorType: 'cloud', status: 'active' }
 * ];
 *
 * const filtered = combineFilters(connectors, [
 *   (items) => filterByType(items, 'database'),
 *   (items) => filterByStatus(items, 'active'),
 *   (items) => filterByName(items, 'postgres')
 * ]);
 * // Returns only the first connector
 * ```
 */
export function combineFilters<T>(items: T[], filters: Array<(items: T[]) => T[]>): T[] {
	return filters.reduce((result, filter) => filter(result), items);
}

/**
 * Build a filter function from command-line options
 *
 * Convenience function for creating a combined filter based on common CLI options.
 *
 * @param options - Filter options from CLI flags
 * @returns Filter function that applies all specified filters
 *
 * @example
 * ```typescript
 * const connectors = [...];
 * const filterFn = buildFilter({
 *   name: 'postgres',
 *   type: 'database',
 *   status: 'active',
 *   project: 'proj-123'
 * });
 * const filtered = filterFn(connectors);
 * ```
 */
export function buildFilter<T extends Record<string, any>>(options: {
	name?: string;
	namePattern?: string;
	type?: string;
	status?: string;
	project?: string;
	ignoreCase?: boolean;
}): (items: T[]) => T[] {
	const filters: Array<(items: T[]) => T[]> = [];

	// Add name filter if provided
	if (options.name) {
		filters.push((items) => filterByName(items, options.name!, { ignoreCase: options.ignoreCase }));
	}

	// Add name pattern filter if provided (regex)
	if (options.namePattern) {
		filters.push((items) =>
			filterByName(items, options.namePattern!, {
				ignoreCase: options.ignoreCase,
				useRegex: true
			})
		);
	}

	// Add type filter if provided
	if (options.type) {
		filters.push((items) => filterByType(items, options.type!, { ignoreCase: options.ignoreCase }));
	}

	// Add status filter if provided
	if (options.status) {
		filters.push((items) =>
			filterByStatus(items, options.status!, { ignoreCase: options.ignoreCase })
		);
	}

	// Add project filter if provided
	if (options.project) {
		filters.push((items) => filterByProject(items, options.project!));
	}

	// Return combined filter function
	return (items: T[]) => combineFilters(items, filters);
}
