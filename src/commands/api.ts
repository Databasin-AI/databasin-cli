/**
 * Generic API Command Implementation
 *
 * Provides a universal endpoint caller supporting ANY Databasin API endpoint.
 * This command enables direct API access without creating specialized commands.
 *
 * Features:
 * - All HTTP methods: GET, POST, PUT, DELETE
 * - Query parameters for GET requests
 * - JSON body support for POST/PUT/DELETE
 * - Token efficiency options (count, summary, fields, limit, offset)
 * - Output format flexibility (JSON/CSV/table)
 * - Comprehensive error handling
 * - Debug logging support
 *
 * Token Efficiency Philosophy:
 * Large API responses can consume massive token counts. This command provides
 * multiple strategies to minimize response size:
 * - --count: Returns only { count: N } (most efficient)
 * - --summary: Returns { total: N, sample: [first 3] } for arrays
 * - --fields: Filters response to specific fields only
 * - --limit/--offset: Pagination support for arrays
 * - --compact: No pretty-printing (saves characters)
 *
 * Based on patterns from:
 * - .claude-plugin/plugins/databasin/skills/databasin-api/scripts/api-call.ts
 * - src/cli/src/commands/connectors.ts
 *
 * @module commands/api
 *
 * @example Count connectors
 * ```bash
 * databasin api GET /api/connector --count
 * # Output: {"count": 42}
 * ```
 *
 * @example Get first 10 connectors with specific fields
 * ```bash
 * databasin api GET /api/connector --fields=connectorID,connectorName --limit=10
 * ```
 *
 * @example Create connector with POST
 * ```bash
 * databasin api POST /api/connector '{"connectorName":"test","connectorType":"database"}'
 * ```
 *
 * @example GET with query parameters
 * ```bash
 * databasin api GET /api/pipeline "institutionID=1"
 * databasin api GET "/api/automations?internalID=abc123" --count
 * ```
 *
 * @example Delete connector
 * ```bash
 * databasin api DELETE /api/connector '{"connectorID":58}'
 * ```
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { DatabasinClient } from '../client/base.ts';
import type { CliConfig, OutputFormat } from '../types/config.ts';
import {
	formatOutput,
	formatJson,
	formatCsv,
	detectFormat
} from '../utils/formatters.ts';
import {
	startSpinner,
	succeedSpinner,
	failSpinner,
	logError,
	logInfo,
	logDebug,
	warnTokenUsage,
	type Ora
} from '../utils/progress.ts';
import { ApiError, NetworkError } from '../utils/errors.ts';
import { parseFields, filterFields } from '../utils/command-helpers.ts';

/**
 * Token efficiency options for API command
 *
 * These options allow users to significantly reduce response payload size
 * which is critical for token efficiency when working with large datasets.
 */
interface TokenEfficiencyOptions {
	/** Return only count instead of full data */
	count?: boolean;

	/** Return summary with total count and sample items */
	summary?: boolean;

	/** Comma-separated field names to return */
	fields?: string;

	/** Maximum number of items to return */
	limit?: number;

	/** Number of items to skip (for pagination) */
	offset?: number;

	/** Compact JSON output (no pretty printing) */
	compact?: boolean;
}

/**
 * Validated API request inputs
 */
interface ValidatedRequest {
	/** HTTP method in uppercase */
	httpMethod: string;
	/** Parsed request body (if any) */
	parsedBody?: any;
}

/**
 * Process response data according to token efficiency options
 *
 * Applies transformations to reduce response size based on provided options.
 * This is the core token efficiency implementation.
 *
 * Processing order:
 * 1. --count: Return { count: N } only
 * 2. --summary: Return { total: N, sample: [...] }
 * 3. --offset/--limit: Apply array slicing
 * 4. --fields: Filter object keys
 *
 * --count behavior (from api-call.ts lines 108-120):
 * - null/undefined responses → { count: 0 }
 *   (Some endpoints like /api/automations return null when required params missing)
 * - Array responses → { count: array.length }
 *   (Most list endpoints return arrays)
 * - Object responses → { count: 1 }
 *   (Single entity endpoints return objects)
 * - Other types → { count: 0 }
 *   (Fallback for primitive types)
 *
 * @param data - Response data from API
 * @param options - Token efficiency options
 * @returns Processed data (may be transformed)
 *
 * @example Count mode
 * ```typescript
 * processData([1, 2, 3], { count: true })
 * // Returns: { count: 3 }
 * ```
 *
 * @example Summary mode
 * ```typescript
 * processData([1, 2, 3, 4, 5], { summary: true })
 * // Returns: { total: 5, sample: [1, 2, 3] }
 * ```
 *
 * @example Fields + limit
 * ```typescript
 * processData(
 *   [
 *     { id: 1, name: 'A', status: 'active' },
 *     { id: 2, name: 'B', status: 'inactive' }
 *   ],
 *   { fields: 'id,name', limit: 1 }
 * )
 * // Returns: [{ id: 1, name: 'A' }]
 * ```
 */
function processData(data: any, options: TokenEfficiencyOptions): any {
	// Return count if requested
	if (options.count) {
		if (data === null || data === undefined) {
			return { count: 0 };
		}
		if (Array.isArray(data)) {
			return { count: data.length };
		}
		// For objects, return count of 1
		if (typeof data === 'object') {
			return { count: 1 };
		}
		return { count: 0 };
	}

	// Return summary if requested
	if (options.summary) {
		if (Array.isArray(data)) {
			return {
				total: data.length,
				sample: data.slice(0, 3)
			};
		}
		return { summary: 'Single object returned' };
	}

	// Process arrays with offset/limit/fields
	if (Array.isArray(data)) {
		let processed = data;

		// Apply offset
		if (options.offset !== undefined && options.offset > 0) {
			processed = processed.slice(options.offset);
		}

		// Apply limit
		if (options.limit !== undefined && options.limit > 0) {
			processed = processed.slice(0, options.limit);
		}

		// Filter fields (shared utility handles arrays automatically)
		if (options.fields) {
			processed = filterFields(processed, options.fields);
		}

		return processed;
	}

	// Process single object with field filtering
	if (options.fields && typeof data === 'object' && data !== null) {
		return filterFields(data, options.fields);
	}

	return data;
}

/**
 * Build URL with query parameters
 *
 * For GET requests, appends query parameters to the endpoint.
 * Handles both endpoint-embedded params (endpoint?param=value) and
 * separate param strings.
 *
 * @param endpoint - API endpoint path
 * @param params - Optional query parameters string
 * @returns Endpoint with query parameters appended
 *
 * @example
 * ```typescript
 * buildUrlWithParams('/api/connector', 'limit=10')
 * // Returns: '/api/connector?limit=10'
 *
 * buildUrlWithParams('/api/connector?type=db', 'limit=10')
 * // Returns: '/api/connector?type=db&limit=10'
 * ```
 */
function buildUrlWithParams(endpoint: string, params?: string): string {
	if (!params) {
		return endpoint;
	}

	const separator = endpoint.includes('?') ? '&' : '?';
	return `${endpoint}${separator}${params}`;
}

/**
 * Validate and parse request body
 *
 * Ensures request body is valid JSON if provided.
 * Provides clear error messages for common mistakes.
 *
 * @param body - Request body string (should be valid JSON)
 * @param method - HTTP method (for error messages)
 * @returns Parsed JSON object
 * @throws {Error} If body is invalid JSON with helpful error message
 *
 * @example
 * ```typescript
 * parseRequestBody('{"name":"test"}', 'POST')
 * // Returns: { name: 'test' }
 *
 * parseRequestBody('invalid json', 'POST')
 * // Throws: Error with parsing details
 * ```
 */
function parseRequestBody(body: string, method: string): any {
	try {
		return JSON.parse(body);
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(
				`Invalid JSON in request body for ${method} request.\n` +
					`  Body: ${body}\n` +
					`  Error: ${error.message}\n\n` +
					`  Tip: Ensure the body is valid JSON, e.g., '{"key":"value"}'`
			);
		}
		throw error;
	}
}

/**
 * Get helpful error suggestions based on status code and endpoint
 *
 * Provides context-specific suggestions for common API errors.
 * Goes beyond generic error messages to help users resolve issues.
 *
 * @param statusCode - HTTP status code
 * @param endpoint - API endpoint that failed
 * @param method - HTTP method used
 * @returns Helpful suggestion string
 */
function getErrorSuggestion(statusCode: number, endpoint: string, method: string): string {
	switch (statusCode) {
		case 400:
			return (
				'Bad request - check your parameters and body syntax.\n' +
				'  • Verify all required fields are present\n' +
				'  • Ensure JSON is properly formatted\n' +
				'  • Check parameter data types match API expectations'
			);

		case 401:
			return (
				'Authentication failed - your token may be invalid or expired.\n' +
				'  • Run: databasin auth verify\n' +
				'  • Try logging in again: databasin auth login'
			);

		case 403:
			return (
				'Access denied - you do not have permission for this resource.\n' +
				'  • Verify you have access to the project\n' +
				'  • Check if the resource exists in your account\n' +
				'  • Contact your administrator for access'
			);

		case 404:
			if (endpoint.includes('/api/')) {
				return (
					'Endpoint or resource not found.\n' +
					'  • Verify the endpoint path is correct\n' +
					'  • Check if the resource ID exists\n' +
					'  • Ensure you are using the correct API version'
				);
			}
			return 'Resource not found - verify the ID and try again.';

		case 405:
			return (
				`Method ${method} not allowed for this endpoint.\n` +
				'  • Check the API documentation for supported methods\n' +
				'  • Verify you are using the correct HTTP method'
			);

		case 422:
			return (
				'Validation failed - request data is invalid.\n' +
				'  • Check required fields are present\n' +
				'  • Verify data types and formats\n' +
				'  • Review the response body for specific errors'
			);

		case 429:
			return (
				'Rate limit exceeded.\n' +
				'  • Wait a moment before retrying\n' +
				'  • Consider adding delays between requests\n' +
				'  • Contact support if you need higher limits'
			);

		case 500:
		case 502:
		case 503:
		case 504:
			return (
				'Databasin API is experiencing issues.\n' +
				'  • Try again in a few moments\n' +
				'  • Check Databasin status page\n' +
				'  • Contact support if issue persists'
			);

		default:
			return 'Check the error message and response body for details.';
	}
}

/**
 * Validate API request inputs
 *
 * Ensures HTTP method is valid and endpoint format is correct.
 * For POST/PUT/DELETE requests with body, validates JSON syntax.
 *
 * @param method - HTTP method (will be normalized to uppercase)
 * @param endpoint - API endpoint path
 * @param bodyOrParams - Request body or query parameters
 * @returns Validated and normalized request inputs
 * @throws {Error} If method is invalid, endpoint format is wrong, or body JSON is malformed
 *
 * @example
 * ```typescript
 * validateApiRequest('get', '/api/connector', undefined)
 * // Returns: { httpMethod: 'GET', parsedBody: undefined }
 *
 * validateApiRequest('POST', '/api/connector', '{"name":"test"}')
 * // Returns: { httpMethod: 'POST', parsedBody: { name: 'test' } }
 * ```
 */
function validateApiRequest(
	method: string,
	endpoint: string,
	bodyOrParams: string | undefined
): ValidatedRequest {
	// Normalize method to uppercase
	const httpMethod = method.toUpperCase();

	// Validate HTTP method
	const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
	if (!validMethods.includes(httpMethod)) {
		throw new Error(
			`Invalid HTTP method: ${method}\n` +
				`  Supported methods: ${validMethods.join(', ')}\n` +
				`  Example: databasin api GET /api/connector`
		);
	}

	// Validate endpoint format
	if (!endpoint.startsWith('/')) {
		throw new Error(
			`Invalid endpoint format: ${endpoint}\n` +
				`  Endpoint must start with '/' (e.g., '/api/connector')\n` +
				`  Example: databasin api GET /api/connector`
		);
	}

	// Parse body for POST/PUT/DELETE if provided
	let parsedBody: any;
	if (httpMethod !== 'GET' && bodyOrParams) {
		parsedBody = parseRequestBody(bodyOrParams, httpMethod);
	}

	return { httpMethod, parsedBody };
}

/**
 * Execute API request via appropriate client method
 *
 * Routes the request to the correct HTTP method on the Databasin client.
 * Handles GET query parameters and POST/PUT/DELETE bodies.
 *
 * @param client - Databasin API client
 * @param httpMethod - HTTP method (GET, POST, PUT, DELETE)
 * @param endpoint - API endpoint path
 * @param bodyOrParams - Request body or query parameters
 * @param parsedBody - Pre-parsed request body (for POST/PUT/DELETE)
 * @returns Raw response data from API
 *
 * @example
 * ```typescript
 * await executeApiRequest(client, 'GET', '/api/connector', 'limit=10', undefined)
 * // Calls: client.get('/api/connector?limit=10')
 *
 * await executeApiRequest(client, 'POST', '/api/connector', undefined, { name: 'test' })
 * // Calls: client.post('/api/connector', { name: 'test' })
 * ```
 */
async function executeApiRequest(
	client: DatabasinClient,
	httpMethod: string,
	endpoint: string,
	bodyOrParams: string | undefined,
	parsedBody?: any
): Promise<any> {
	if (httpMethod === 'GET') {
		const urlWithParams = buildUrlWithParams(endpoint, bodyOrParams);
		return await client.get(urlWithParams);
	}

	if (httpMethod === 'POST') {
		return await client.post(endpoint, parsedBody);
	}

	if (httpMethod === 'PUT') {
		return await client.put(endpoint, parsedBody);
	}

	if (httpMethod === 'DELETE') {
		return await client.delete(endpoint, parsedBody);
	}

	// Should never reach here due to validation
	throw new Error(`Unsupported HTTP method: ${httpMethod}`);
}

/**
 * Format and display API response
 *
 * Handles JSON, CSV, and table output formats.
 * Displays token usage warnings if output exceeds threshold.
 * Shows processing options that were applied.
 *
 * @param data - Processed response data
 * @param format - Output format (json, csv, table)
 * @param config - CLI configuration
 * @param options - Token efficiency options
 * @param fieldsOption - Fields filter option
 *
 * @example
 * ```typescript
 * outputApiResult(
 *   [{ id: 1, name: 'A' }],
 *   'json',
 *   config,
 *   { count: false, limit: 10 },
 *   'id,name'
 * )
 * ```
 */
function outputApiResult(
	data: any,
	format: OutputFormat,
	config: CliConfig,
	options: TokenEfficiencyOptions,
	fieldsOption?: string
): void {
	// Format output based on format type
	let output: string;

	if (format === 'json') {
		const indent = options.compact ? 0 : 2;
		output = formatJson(data, {
			indent,
			colors: config.output.colors,
			syntaxHighlight: true
		});
	} else if (format === 'csv') {
		const csvData = Array.isArray(data) ? data : [data];
		const fields = parseFields(fieldsOption);
		output = formatCsv(csvData, {
			fields,
			colors: config.output.colors
		});
	} else {
		const tableData = Array.isArray(data) ? data : [data];
		const fields = parseFields(fieldsOption);
		output = formatOutput(tableData, format, {
			fields,
			colors: config.output.colors
		});
	}

	// Display output
	console.log();
	console.log(output);

	// Token usage warning
	const outputSize = output.length;
	if (outputSize > config.tokenEfficiency.warnThreshold && !options.count && !options.summary) {
		const suggestions = [
			'Use --count to get count only (most efficient)',
			'Use --summary to get total + sample items',
			'Use --fields to filter response fields',
			'Use --limit to reduce number of results',
			'Use --compact for no pretty-printing'
		];

		warnTokenUsage(outputSize, config.tokenEfficiency.warnThreshold, suggestions);
	}

	// Show processing applied (if not default)
	const processing: string[] = [];
	if (options.count) processing.push('count mode');
	if (options.summary) processing.push('summary mode');
	if (options.fields) processing.push(`fields: ${options.fields}`);
	if (options.limit) processing.push(`limit: ${options.limit}`);
	if (options.offset) processing.push(`offset: ${options.offset}`);
	if (options.compact) processing.push('compact output');

	if (processing.length > 0 && format === 'table') {
		console.log();
		logInfo(`Processing applied: ${processing.join(', ')}`);
	}
}

/**
 * Handle API request errors with helpful suggestions
 *
 * Provides context-specific error messages and suggestions based on error type.
 * Displays endpoint, method, response body (in debug mode), and actionable suggestions.
 *
 * @param error - Error object (ApiError, NetworkError, or generic Error)
 * @param endpoint - API endpoint that failed
 * @param method - HTTP method used
 * @param config - CLI configuration
 * @param client - Databasin client (for base URL in network errors)
 * @throws {Error} Re-throws the original error after logging
 *
 * @example
 * ```typescript
 * try {
 *   await client.get('/api/invalid')
 * } catch (error) {
 *   handleApiError(error, '/api/invalid', 'GET', config, client)
 * }
 * ```
 */
function handleApiError(
	error: unknown,
	endpoint: string,
	method: string,
	config: CliConfig,
	client: DatabasinClient
): never {
	if (error instanceof ApiError) {
		console.error();
		logError(`API Error (${error.statusCode}): ${error.message}`);
		console.error(chalk.gray(`  Endpoint: ${endpoint}`));
		console.error(chalk.gray(`  Method: ${method.toUpperCase()}`));

		if (error.responseBody && config.debug) {
			console.error();
			console.error(chalk.gray('Response body:'));
			console.error(chalk.gray(JSON.stringify(error.responseBody, null, 2)));
		}

		console.error();
		console.error(chalk.cyan('Suggestion:'));
		const suggestion = getErrorSuggestion(error.statusCode, endpoint, method.toUpperCase());
		suggestion.split('\n').forEach((line) => {
			console.error(chalk.gray(`  ${line}`));
		});
	} else if (error instanceof NetworkError) {
		console.error();
		logError('Network Error: Failed to connect to API');
		console.error(chalk.gray(`  API URL: ${client.getBaseUrl()}`));
		console.error(chalk.gray(`  Error: ${error.message}`));
		console.error();
		console.error(chalk.cyan('Suggestions:'));
		console.error(chalk.gray('  • Check your internet connection'));
		console.error(chalk.gray('  • Verify the API URL is correct'));
		console.error(chalk.gray('  • Check if the API is online and accessible'));
		console.error(chalk.gray('  • Try: curl ' + client.getBaseUrl() + '/api/ping'));
	} else if (error instanceof Error) {
		console.error();
		logError('Error executing API request');
		console.error(chalk.gray(`  ${error.message}`));

		if (config.debug && error.stack) {
			console.error();
			console.error(chalk.gray('Stack trace:'));
			console.error(chalk.gray(error.stack));
		}
	}

	throw error;
}

/**
 * API Command Handler
 *
 * Main command handler that orchestrates the API request flow:
 * 1. Validate inputs (method, endpoint, body)
 * 2. Build and execute request
 * 3. Process response with token efficiency options
 * 4. Format and output results
 * 5. Handle errors with helpful suggestions
 *
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @param endpoint - API endpoint path (e.g., '/api/connector')
 * @param bodyOrParams - Request body (POST/PUT/DELETE) or query params (GET)
 * @param options - Command options including token efficiency flags
 * @param command - Commander Command instance
 */
async function apiCommand(
	method: string,
	endpoint: string,
	bodyOrParams: string | undefined,
	options: TokenEfficiencyOptions & {
		json?: boolean;
		csv?: boolean;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: DatabasinClient = opts._clients.base;

	let spinner: Ora | undefined;

	try {
		// 1. Validate inputs
		const { httpMethod, parsedBody } = validateApiRequest(method, endpoint, bodyOrParams);

		// 2. Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// 3. Start progress indicator
		const showSpinner = format === 'table' && !config.debug;
		if (showSpinner) {
			const action = httpMethod === 'GET' ? 'Fetching' : 'Sending';
			spinner = startSpinner(`${action} ${httpMethod} ${endpoint}...`);
		}

		// 4. Debug logging
		if (config.debug) {
			logDebug(`HTTP Method: ${httpMethod}`);
			logDebug(`Endpoint: ${endpoint}`);
			if (bodyOrParams) {
				logDebug(`Body/Params: ${bodyOrParams}`);
			}
			logDebug(`Token efficiency options: ${JSON.stringify(options)}`);
		}

		// 5. Execute request
		const data = await executeApiRequest(client, httpMethod, endpoint, bodyOrParams, parsedBody);

		// 6. Process response with token efficiency options
		const processedData = processData(data, options);

		// 7. Success feedback
		if (spinner) {
			succeedSpinner(spinner, `${httpMethod} ${endpoint} completed`);
		}

		// 8. Output result
		outputApiResult(processedData, format, config, options, options.fields);
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Request failed');
		}

		handleApiError(error, endpoint, method, config, client);
	}
}

/**
 * Create API command with all options and help text
 *
 * Configures the Commander Command instance with:
 * - Command signature and arguments
 * - Token efficiency options
 * - Output format options
 * - Comprehensive help examples
 * - Action handler
 *
 * @returns Configured Commander Command instance
 */
export function createApiCommand(): Command {
	const api = new Command('api')
		.description('Call any Databasin API endpoint directly')
		.argument('<method>', 'HTTP method (GET, POST, PUT, DELETE)')
		.argument('<endpoint>', 'API endpoint path (e.g., /api/connector)')
		.argument('[body]', 'Request body for POST/PUT/DELETE or query params for GET')
		.option('--count', 'Return count only (most efficient)')
		.option('--summary', 'Return summary with total count and sample items')
		.option('--fields <fields>', 'Comma-separated list of fields to return')
		.option('--limit <number>', 'Limit number of results', parseInt)
		.option('--offset <number>', 'Skip first N results', parseInt)
		.option('--compact', 'Compact JSON output (no pretty printing)')
		.addHelpText(
			'after',
			`
Token Efficiency Options:
  Token-efficient options reduce response size to minimize token usage when
  working with large datasets. These are especially important for list endpoints
  that can return 200K+ tokens without optimization.

  --count              Most efficient: returns {"count": N} only
  --summary            Returns {total: N, sample: [first 3 items]}
  --fields=f1,f2       Returns only specified fields from objects
  --limit=N            Returns only first N items from arrays
  --offset=N           Skips first N items (for pagination)
  --compact            No JSON pretty-printing (saves characters)

Examples:
  # Count endpoints (most efficient)
  $ databasin api GET /api/connector --count
  $ databasin api GET "/api/automations?internalID=abc" --count

  # Get specific fields with limit
  $ databasin api GET /api/connector --fields=connectorID,connectorName --limit=10

  # Summary view
  $ databasin api GET /api/my/projects --summary

  # Query parameters (GET)
  $ databasin api GET /api/pipeline "institutionID=1"
  $ databasin api GET /api/connector "connectorType=database&status=active"

  # Create resource (POST)
  $ databasin api POST /api/connector '{"connectorName":"test","connectorType":"db"}'

  # Update resource (PUT)
  $ databasin api PUT /api/project/123 '{"name":"Updated Name"}'

  # Delete resource (DELETE)
  $ databasin api DELETE /api/connector/58

  # Delete with body (uncommon but supported)
  $ databasin api DELETE /api/resource '{"resourceId":123,"reason":"cleanup"}'

  # Pagination with offset and limit
  $ databasin api GET /api/connector --offset=20 --limit=10

  # CSV output with specific fields
  $ databasin api GET /api/connector --fields=connectorID,connectorName --csv

  # Compact JSON (no formatting)
  $ databasin api GET /api/connector --compact

Note: Always check API documentation or working-endpoints.md for required
parameters. Some endpoints return null when required params are missing.
`
		)
		.action(apiCommand);

	return api;
}
