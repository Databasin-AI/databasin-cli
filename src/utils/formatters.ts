/**
 * Output Formatting Utilities for DataBasin CLI
 *
 * Provides consistent output formatting across table, JSON, and CSV formats.
 * Supports token efficiency warnings, syntax highlighting, and flexible field filtering.
 *
 * Features:
 * - Table output with auto-sizing columns (cli-table3)
 * - JSON output with optional syntax highlighting (chalk)
 * - CSV output with RFC 4180 compliance
 * - Automatic format detection from config and CLI options
 * - Token efficiency warnings for large outputs
 * - Nested object handling (flatten or stringify)
 *
 * @module utils/formatters
 *
 * @example
 * ```typescript
 * import { formatOutput, formatTable, formatJson, formatCsv } from './formatters';
 *
 * const data = [
 *   { id: '123', name: 'Project A', status: 'active' },
 *   { id: '456', name: 'Project B', status: 'inactive' }
 * ];
 *
 * // Auto-detect format from config
 * console.log(formatOutput(data, 'table'));
 *
 * // Table with specific fields
 * console.log(formatTable(data, { fields: ['name', 'status'] }));
 *
 * // JSON with syntax highlighting
 * console.log(formatJson(data, { syntaxHighlight: true }));
 *
 * // CSV export
 * console.log(formatCsv(data));
 * ```
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import type { OutputFormat } from '../types/config.ts';

/**
 * Base formatting options shared across all formats
 */
export interface FormatOptions {
	/**
	 * Enable colored output using chalk
	 * Automatically disabled if NO_COLOR environment variable is set
	 * @default true
	 */
	colors?: boolean;

	/**
	 * Specific fields to include in output (filters columns)
	 * If not provided, all fields from the first object are included
	 * @example ['id', 'name', 'status']
	 */
	fields?: string[];

	/**
	 * Maximum width for each column in characters
	 * Only applies to table format
	 * @default undefined (auto-size)
	 */
	maxWidth?: number;
}

/**
 * Table-specific formatting options
 */
export interface TableOptions extends FormatOptions {
	/**
	 * Custom header labels (overrides field names)
	 * Array length must match number of fields
	 */
	headers?: string[];

	/**
	 * Table styling preset
	 * - default: Standard table with borders
	 * - compact: Minimal borders for dense data
	 * - markdown: Markdown-compatible table format
	 * @default 'default'
	 */
	style?: 'default' | 'compact' | 'markdown';
}

/**
 * JSON-specific formatting options
 */
export interface JsonOptions extends FormatOptions {
	/**
	 * Number of spaces for indentation
	 * @default 2
	 */
	indent?: number;

	/**
	 * Enable syntax highlighting with chalk
	 * Automatically disabled if colors is false
	 * @default true
	 */
	syntaxHighlight?: boolean;
}

/**
 * CSV-specific formatting options
 */
export interface CsvOptions extends FormatOptions {
	/**
	 * Field delimiter character
	 * @default ','
	 */
	delimiter?: string;

	/**
	 * Quote character for string values
	 * @default '"'
	 */
	quote?: string;
}

/**
 * Token efficiency configuration
 */
export interface TokenEfficiencyConfig {
	/**
	 * Threshold in characters to trigger warning
	 * @default 50000
	 */
	warnThreshold: number;

	/**
	 * Enable token efficiency warnings
	 * @default true
	 */
	enabled: boolean;
}

/**
 * Flatten nested object into dot-notation keys
 *
 * Converts nested objects into a flat structure with dot-separated keys.
 * Useful for displaying complex objects in table or CSV format.
 *
 * @param obj - Object to flatten
 * @param prefix - Key prefix for recursion (internal use)
 * @returns Flattened object with dot-notation keys
 *
 * @example
 * ```typescript
 * const nested = {
 *   user: { name: 'Alice', role: { title: 'Admin' } },
 *   count: 5
 * };
 * flattenObject(nested);
 * // Returns: {
 * //   'user.name': 'Alice',
 * //   'user.role.title': 'Admin',
 * //   'count': 5
 * // }
 * ```
 */
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
	const flattened: Record<string, any> = {};

	for (const key in obj) {
		if (!Object.prototype.hasOwnProperty.call(obj, key)) {
			continue;
		}

		const value = obj[key];
		const newKey = prefix ? `${prefix}.${key}` : key;

		if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
			// Recursively flatten nested objects
			Object.assign(flattened, flattenObject(value, newKey));
		} else {
			// Primitive value or array - store as-is
			flattened[newKey] = value;
		}
	}

	return flattened;
}

/**
 * Format a value for display
 *
 * Handles different value types consistently:
 * - null/undefined: '-' or empty string
 * - Arrays: JSON.stringify
 * - Objects: JSON.stringify
 * - Dates: ISO string
 * - Others: String conversion
 *
 * @param value - Value to format
 * @param defaultValue - Value to return for null/undefined
 * @returns Formatted string representation
 */
function formatValue(value: any, defaultValue = '-'): string {
	if (value === null || value === undefined) {
		return defaultValue;
	}

	if (Array.isArray(value)) {
		return JSON.stringify(value);
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return String(value);
}

/**
 * Extract field names from data array
 *
 * Gets all unique field names from an array of objects.
 * If fields option is provided, uses that instead.
 *
 * @param data - Array of objects
 * @param fields - Optional field filter
 * @returns Array of field names
 */
function extractFields(data: any[], fields?: string[]): string[] {
	if (fields && fields.length > 0) {
		return fields;
	}

	if (data.length === 0) {
		return [];
	}

	// Get all unique keys from first object
	const firstItem = data[0];
	return Object.keys(firstItem);
}

/**
 * Format data as table using cli-table3
 *
 * Creates a formatted ASCII table with auto-sized columns.
 * Supports field filtering, custom headers, and multiple style presets.
 *
 * @param data - Array of objects to display
 * @param options - Table formatting options
 * @returns Formatted table string
 *
 * @example
 * ```typescript
 * const data = [
 *   { id: '123', name: 'Project A', status: 'active' },
 *   { id: '456', name: 'Project B', status: 'inactive' }
 * ];
 *
 * // Basic table
 * console.log(formatTable(data));
 * // ┌─────┬───────────┬──────────┐
 * // │ id  │ name      │ status   │
 * // ├─────┼───────────┼──────────┤
 * // │ 123 │ Project A │ active   │
 * // │ 456 │ Project B │ inactive │
 * // └─────┴───────────┴──────────┘
 *
 * // Filtered fields
 * console.log(formatTable(data, { fields: ['name', 'status'] }));
 *
 * // Compact style
 * console.log(formatTable(data, { style: 'compact' }));
 * ```
 */
export function formatTable(data: any[], options: TableOptions = {}): string {
	// Handle empty arrays
	if (!Array.isArray(data) || data.length === 0) {
		return options.colors !== false ? chalk.yellow('No data to display') : 'No data to display';
	}

	const colors = options.colors !== false && !process.env.NO_COLOR;
	const fields = extractFields(data, options.fields);
	const headers = options.headers || fields;

	// Determine table style
	let tableChars: any = undefined;
	if (options.style === 'compact') {
		tableChars = {
			top: '',
			'top-mid': '',
			'top-left': '',
			'top-right': '',
			bottom: '',
			'bottom-mid': '',
			'bottom-left': '',
			'bottom-right': '',
			left: '',
			'left-mid': '',
			mid: '',
			'mid-mid': '',
			right: '',
			'right-mid': '',
			middle: ' '
		};
	} else if (options.style === 'markdown') {
		tableChars = {
			top: '',
			'top-mid': '',
			'top-left': '',
			'top-right': '',
			bottom: '',
			'bottom-mid': '',
			'bottom-left': '',
			'bottom-right': '',
			left: '|',
			'left-mid': '|',
			mid: '-',
			'mid-mid': '|',
			right: '|',
			'right-mid': '|',
			middle: '|'
		};
	}

	// Create table instance configuration
	const tableConfig: any = {
		head: colors ? headers.map((h) => chalk.cyan.bold(h)) : headers,
		chars: tableChars
	};

	// Only add wordWrap and colWidths if maxWidth is specified
	if (options.maxWidth !== undefined) {
		tableConfig.wordWrap = true;
		tableConfig.colWidths = new Array(fields.length).fill(options.maxWidth);
	}

	const table = new Table(tableConfig);

	// Add rows
	for (const item of data) {
		const row = fields.map((field) => formatValue(item[field]));
		table.push(row);
	}

	return table.toString();
}

/**
 * Syntax highlight JSON string with chalk
 *
 * Applies color highlighting to JSON strings for better readability.
 * Colors:
 * - Keys: cyan
 * - Strings: green
 * - Numbers: yellow
 * - Booleans: magenta
 * - Null: gray
 *
 * @param json - JSON string to highlight
 * @returns Highlighted JSON string
 */
function highlightJson(json: string): string {
	// Force chalk to use colors by setting level
	const originalLevel = chalk.level;
	if (chalk.level === 0) {
		chalk.level = 1; // Force basic color support
	}

	const highlighted = json
		.replace(/"([^"]+)":/g, (match, key) => `${chalk.cyan(`"${key}"`)}:`) // Keys
		.replace(/:\s*"([^"]*)"/g, (match, value) => `: ${chalk.green(`"${value}"`)}`) // String values
		.replace(/:\s*(\d+\.?\d*)/g, (match, num) => `: ${chalk.yellow(num)}`) // Numbers
		.replace(/:\s*(true|false)/g, (match, bool) => `: ${chalk.magenta(bool)}`) // Booleans
		.replace(/:\s*null/g, `: ${chalk.gray('null')}`); // Null

	// Restore original level
	chalk.level = originalLevel;

	return highlighted;
}

/**
 * Format data as JSON with optional syntax highlighting
 *
 * Serializes data to pretty-printed JSON with configurable indentation.
 * Optionally applies syntax highlighting using chalk.
 *
 * @param data - Data to serialize (object or array)
 * @param options - JSON formatting options
 * @returns Formatted JSON string
 *
 * @example
 * ```typescript
 * const data = { id: '123', name: 'Project A', active: true };
 *
 * // Basic JSON
 * console.log(formatJson(data));
 * // {
 * //   "id": "123",
 * //   "name": "Project A",
 * //   "active": true
 * // }
 *
 * // With syntax highlighting
 * console.log(formatJson(data, { syntaxHighlight: true }));
 *
 * // Compact (no indentation)
 * console.log(formatJson(data, { indent: 0 }));
 * ```
 */
export function formatJson(data: unknown, options: JsonOptions = {}): string {
	const indent = options.indent ?? 2;
	const colors = options.colors !== false && !process.env.NO_COLOR;
	const syntaxHighlight = options.syntaxHighlight !== false && colors;

	const json = JSON.stringify(data, null, indent);

	if (syntaxHighlight) {
		return highlightJson(json);
	}

	return json;
}

/**
 * Escape CSV value according to RFC 4180
 *
 * Handles quote escaping and determines when values need to be quoted.
 * Values containing delimiter, quote, or newline are always quoted.
 * Empty strings are returned as-is (not quoted unless they contain special chars).
 *
 * @param value - Value to escape
 * @param delimiter - Field delimiter
 * @param quote - Quote character
 * @returns Escaped CSV value
 */
function escapeCsvValue(value: string, delimiter: string, quote: string): string {
	// Empty strings don't need quoting
	if (value === '') {
		return value;
	}

	const needsQuoting =
		value.includes(delimiter) ||
		value.includes(quote) ||
		value.includes('\n') ||
		value.includes('\r');

	if (needsQuoting) {
		// Escape quotes by doubling them
		const escaped = value.replace(new RegExp(quote, 'g'), quote + quote);
		return `${quote}${escaped}${quote}`;
	}

	return value;
}

/**
 * Format data as CSV (RFC 4180 compliant)
 *
 * Generates CSV output with proper escaping for quotes and special characters.
 * Includes header row with field names.
 *
 * @param data - Array of objects to export
 * @param options - CSV formatting options
 * @returns CSV string with headers
 *
 * @example
 * ```typescript
 * const data = [
 *   { id: '123', name: 'Project A', status: 'active' },
 *   { id: '456', name: 'Project B', status: 'inactive' }
 * ];
 *
 * console.log(formatCsv(data));
 * // id,name,status
 * // "123","Project A","active"
 * // "456","Project B","inactive"
 *
 * // Custom delimiter
 * console.log(formatCsv(data, { delimiter: ';' }));
 * // id;name;status
 * // "123";"Project A";"active"
 * ```
 */
export function formatCsv(data: any[], options: CsvOptions = {}): string {
	// Handle empty arrays
	if (!Array.isArray(data) || data.length === 0) {
		return '';
	}

	const delimiter = options.delimiter || ',';
	const quote = options.quote || '"';
	const fields = extractFields(data, options.fields);

	const lines: string[] = [];

	// Header row
	const headerRow = fields.map((field) => escapeCsvValue(field, delimiter, quote)).join(delimiter);
	lines.push(headerRow);

	// Data rows
	for (const item of data) {
		const row = fields
			.map((field) => {
				const value = formatValue(item[field], '');
				return escapeCsvValue(value, delimiter, quote);
			})
			.join(delimiter);
		lines.push(row);
	}

	return lines.join('\n');
}

/**
 * Check if output exceeds token efficiency threshold
 *
 * Counts characters in output and warns if threshold is exceeded.
 * Provides suggestions to reduce output size using --fields or --limit.
 *
 * @param output - Formatted output string
 * @param config - Token efficiency configuration
 * @returns Warning message if threshold exceeded, empty string otherwise
 *
 * @example
 * ```typescript
 * const output = formatJson(largeDataset);
 * const warning = checkTokenEfficiency(output, {
 *   warnThreshold: 50000,
 *   enabled: true
 * });
 * if (warning) {
 *   console.error(warning);
 * }
 * ```
 */
export function checkTokenEfficiency(output: string, config: TokenEfficiencyConfig): string {
	if (!config.enabled) {
		return '';
	}

	const charCount = output.length;

	if (charCount > config.warnThreshold) {
		const message = [
			chalk.yellow('⚠ Token Efficiency Warning:'),
			chalk.yellow(`Output size: ${charCount.toLocaleString()} characters`),
			chalk.yellow(`Threshold: ${config.warnThreshold.toLocaleString()} characters`),
			'',
			chalk.gray('Suggestions to reduce output size:'),
			chalk.gray('  • Use --fields to select specific columns'),
			chalk.gray('  • Use --limit to reduce number of rows'),
			chalk.gray('  • Consider --format json for more compact output'),
			''
		].join('\n');

		return message;
	}

	return '';
}

/**
 * Determine output format from configuration and CLI options
 *
 * Priority order (highest to lowest):
 * 1. CLI flag (--format)
 * 2. Environment variable (DATABASIN_OUTPUT_FORMAT)
 * 3. Config file setting (config.output.format)
 * 4. Default value ('table')
 *
 * @param cliFormat - Format from CLI flag (highest priority)
 * @param configFormat - Format from config file
 * @returns Resolved output format
 *
 * @example
 * ```typescript
 * // CLI flag overrides config
 * const format = detectFormat('json', 'table'); // Returns 'json'
 *
 * // Config used when no CLI flag
 * const format = detectFormat(undefined, 'csv'); // Returns 'csv'
 *
 * // Default when neither provided
 * const format = detectFormat(undefined, undefined); // Returns 'table'
 * ```
 */
export function detectFormat(cliFormat?: OutputFormat, configFormat?: OutputFormat): OutputFormat {
	// Priority 1: CLI flag
	if (cliFormat) {
		return cliFormat;
	}

	// Priority 2: Environment variable
	const envFormat = process.env.DATABASIN_OUTPUT_FORMAT;
	if (envFormat === 'table' || envFormat === 'json' || envFormat === 'csv') {
		return envFormat;
	}

	// Priority 3: Config file
	if (configFormat) {
		return configFormat;
	}

	// Priority 4: Default
	return 'table';
}

/**
 * Format output using detected format
 *
 * Main formatting function that dispatches to the appropriate formatter
 * based on the detected or specified format. Handles token efficiency
 * warnings automatically.
 *
 * @param data - Data to format (object or array)
 * @param format - Output format to use
 * @param options - Format-specific options
 * @param tokenConfig - Token efficiency configuration
 * @returns Formatted output string with optional warnings
 *
 * @example
 * ```typescript
 * import { formatOutput } from './formatters';
 *
 * const data = [
 *   { id: '123', name: 'Project A' },
 *   { id: '456', name: 'Project B' }
 * ];
 *
 * // Table format
 * console.log(formatOutput(data, 'table'));
 *
 * // JSON format with highlighting
 * console.log(formatOutput(data, 'json', {
 *   syntaxHighlight: true
 * }));
 *
 * // CSV format with token warning
 * console.log(formatOutput(data, 'csv', {}, {
 *   warnThreshold: 1000,
 *   enabled: true
 * }));
 * ```
 */
export function formatOutput(
	data: unknown,
	format: OutputFormat,
	options: FormatOptions = {},
	tokenConfig?: TokenEfficiencyConfig
): string {
	let output: string;

	// Ensure data is an array for table/csv formats
	const arrayData = Array.isArray(data) ? data : [data];

	switch (format) {
		case 'table':
			output = formatTable(arrayData, options as TableOptions);
			break;

		case 'json':
			output = formatJson(data, options as JsonOptions);
			break;

		case 'csv':
			output = formatCsv(arrayData, options as CsvOptions);
			break;

		default:
			throw new Error(`Unknown output format: ${format}`);
	}

	// Check token efficiency if config provided
	if (tokenConfig) {
		const warning = checkTokenEfficiency(output, tokenConfig);
		if (warning) {
			// Return warning before output (to stderr in practice)
			return warning + output;
		}
	}

	return output;
}
