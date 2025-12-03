/**
 * Type Coercion Utilities for Databasin CLI
 *
 * Provides type-safe utilities for parsing and coercing values from various input types.
 * These utilities handle user input from JSON files, command-line arguments, and API responses
 * where type information may be ambiguous or inconsistent.
 *
 * Based on frontend implementation:
 * @see /home/founder3/code/tpi/databasin-sv/src/lib/shared/utils/formatters.js:111-121
 * @see /home/founder3/code/tpi/databasin-sv/src/lib/pipelines/PipelinesApiClient.js:99-158
 *
 * @module utils/type-coercion
 */

/**
 * Parse boolean from various input types
 *
 * Handles multiple common boolean representations:
 * - Boolean values: true/false
 * - Strings: "true"/"false", "t"/"f", "on"/"off", "1"/"0" (case-insensitive)
 * - Numbers: 1 (true), 0 or other (false)
 * - Null/undefined: false
 *
 * This implementation matches the frontend parseBool() function exactly
 * for consistent behavior across CLI and web UI.
 *
 * @param value - Value to parse as boolean
 * @returns Boolean interpretation of the value
 *
 * @example
 * ```typescript
 * parseBool(true)              // true
 * parseBool(false)             // false
 * parseBool('true')            // true
 * parseBool('TRUE')            // true
 * parseBool('t')               // true
 * parseBool('on')              // true
 * parseBool('1')               // true
 * parseBool(1)                 // true
 * parseBool('false')           // false
 * parseBool('off')             // false
 * parseBool('0')               // false
 * parseBool(0)                 // false
 * parseBool(null)              // false
 * parseBool(undefined)         // false
 * ```
 */
export function parseBool(value: unknown): boolean {
	// Handle null/undefined
	if (value === undefined || value === null) {
		return false;
	}

	// Handle numbers - only 1 is true
	if (typeof value === 'number') {
		return value === 1;
	}

	// Handle booleans
	if (typeof value === 'boolean') {
		return value;
	}

	// Handle strings (case-insensitive)
	if (typeof value === 'string') {
		const lowerInput = value.toLowerCase();
		return lowerInput === 'true' || lowerInput === 't' || lowerInput === 'on' || lowerInput === '1';
	}

	// Default: false
	return false;
}

/**
 * Parse integer with default fallback
 *
 * Safely converts values to integers with a default value for invalid inputs.
 * Handles strings, numbers, and null/undefined gracefully.
 *
 * @param value - Value to parse as integer
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 *
 * @example
 * ```typescript
 * parseIntSafe(42, 0)            // 42
 * parseIntSafe('42', 0)          // 42
 * parseIntSafe('42.7', 0)        // 42 (floors to integer)
 * parseIntSafe(42.7, 0)          // 42 (floors to integer)
 * parseIntSafe('invalid', 0)     // 0 (default)
 * parseIntSafe(null, 0)          // 0 (default)
 * parseIntSafe(undefined, 0)     // 0 (default)
 * parseIntSafe('', 10)           // 10 (default)
 * parseIntSafe(NaN, 5)           // 5 (default)
 * ```
 */
export function parseIntSafe(value: unknown, defaultValue: number): number {
	// Handle null/undefined
	if (value === undefined || value === null) {
		return defaultValue;
	}

	// Handle numbers - floor to integer
	if (typeof value === 'number') {
		return isNaN(value) ? defaultValue : Math.floor(value);
	}

	// Handle strings
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '') {
			return defaultValue;
		}
		const parsed = parseInt(trimmed, 10);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	// Default for any other type
	return defaultValue;
}

/**
 * Ensure value is string
 *
 * Converts values to strings with a default fallback for null/undefined.
 * Numbers are converted to strings, other types use the default.
 *
 * @param value - Value to convert to string
 * @param defaultValue - Default string if value is null/undefined (default: empty string)
 * @returns String representation of value or default
 *
 * @example
 * ```typescript
 * ensureString('hello')              // 'hello'
 * ensureString('hello', 'default')   // 'hello'
 * ensureString(42)                   // '42'
 * ensureString(42, 'default')        // '42'
 * ensureString(null)                 // ''
 * ensureString(undefined)            // ''
 * ensureString(null, 'default')      // 'default'
 * ensureString(undefined, 'default') // 'default'
 * ensureString(true)                 // '' (non-string/number uses default)
 * ensureString(true, 'default')      // 'default'
 * ```
 */
export function ensureString(value: unknown, defaultValue: string = ''): string {
	// Handle null/undefined
	if (value === undefined || value === null) {
		return defaultValue;
	}

	// Handle strings
	if (typeof value === 'string') {
		return value;
	}

	// Handle numbers
	if (typeof value === 'number') {
		return String(value);
	}

	// Default for any other type
	return defaultValue;
}
