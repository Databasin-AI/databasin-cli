/**
 * Base API Client for DataBasin CLI
 *
 * Handles all HTTP operations with the DataBasin API including:
 * - Automatic token injection and refresh on 401
 * - Comprehensive error handling with typed errors
 * - Request/response logging for debugging
 * - Token efficiency features (count, fields, limit)
 * - Smart retry logic for network failures
 * - Full TypeScript generic support
 *
 * Pattern based on:
 * - .claude-plugin/plugins/databasin/skills/databasin-api/scripts/api-call.ts
 * - .claude-plugin/plugins/databasin/skills/databasin-pipelines/scripts/api_client.ts
 *
 * @module client/base
 */

import { loadToken } from '../utils/auth.ts';
import { loadConfig } from '../config.ts';
import { ApiError, NetworkError, createApiErrorSync } from '../utils/errors.ts';
import type { CliConfig } from '../types/config.ts';
import { logger } from '../utils/debug.ts';

/**
 * Request options for API calls
 *
 * Provides fine-grained control over individual API requests,
 * allowing override of config defaults on a per-request basis.
 */
export interface RequestOptions {
	/** Query parameters to append to URL */
	params?: Record<string, string | number | boolean>;

	/** Request timeout in ms (overrides config default) */
	timeout?: number;

	/** Additional headers to merge with defaults */
	headers?: Record<string, string>;

	/** Skip authentication (for public endpoints like login) */
	skipAuth?: boolean;

	/** Enable debug logging for this request */
	debug?: boolean;

	/** Number of retry attempts for network failures (default: 0) */
	retries?: number;

	/** Delay between retries in ms (default: 1000) */
	retryDelay?: number;

	/** Internal flag: is this a retry attempt after 401? (prevents infinite retry loops) */
	_isRetry?: boolean;
}

/**
 * Token efficiency options
 *
 * Matches plugin skill patterns for reducing response payload size.
 * Particularly useful for large list responses to avoid token bloat.
 *
 * @see .claude-plugin/plugins/databasin/skills/databasin-api/references/token-efficiency.md
 */
export interface TokenEfficiencyOptions {
	/** Return only count instead of full data array */
	count?: boolean;

	/** Comma-separated field names to return (filters object keys) */
	fields?: string;

	/** Maximum number of items to return from arrays */
	limit?: number;
}

/**
 * Response metadata
 *
 * Additional information about the HTTP response for debugging
 * and monitoring purposes.
 */
export interface ResponseMetadata {
	/** HTTP status code */
	status: number;

	/** HTTP status text */
	statusText: string;

	/** Response headers */
	headers: Record<string, string>;

	/** Request duration in milliseconds */
	duration: number;

	/** Request timestamp */
	timestamp: string;
}

/**
 * Base API Client for DataBasin
 *
 * Central HTTP client for all API interactions. Provides:
 * - Automatic authentication with token injection
 * - Token refresh and retry on 401 responses
 * - Comprehensive error handling
 * - Token efficiency transformations
 * - Debug logging support
 *
 * @example
 * ```typescript
 * const client = new DataBasinClient();
 * const projects = await client.get<Project[]>('/api/my/projects');
 * ```
 *
 * @example With token efficiency
 * ```typescript
 * const client = new DataBasinClient();
 * const count = await client.get('/api/my/projects', { count: true });
 * // Returns: { count: 42 }
 * ```
 */
export class DataBasinClient {
	private baseUrl: string;
	private token: string | null = null;
	protected config: CliConfig;

	/**
	 * Create a new DataBasin API client
	 *
	 * @param config - Optional full configuration (defaults loaded if not provided)
	 */
	constructor(config?: CliConfig) {
		this.config = config || loadConfig();
		this.baseUrl = this.config.apiUrl;
	}

	/**
	 * Get or load authentication token
	 *
	 * Lazy-loads token on first use from configured sources.
	 * Caches token in memory for subsequent requests.
	 *
	 * @returns JWT token string
	 * @throws {AuthError} If token not found in any source
	 */
	private getToken(): string {
		if (!this.token) {
			this.token = loadToken();
		}
		return this.token;
	}

	/**
	 * Refresh authentication token
	 *
	 * Clears cached token, forcing reload from disk/env on next request.
	 * Used when 401 response indicates token may be stale.
	 */
	private refreshToken(): void {
		this.token = null;
	}

	/**
	 * Build full URL with query parameters
	 *
	 * Constructs absolute URL from base URL, endpoint, and query params.
	 * Properly encodes all parameter values.
	 *
	 * @param endpoint - API endpoint path (e.g., '/api/my/projects')
	 * @param params - Optional query parameters
	 * @returns Complete URL with query string
	 */
	private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
		const url = new URL(endpoint, this.baseUrl);

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.append(key, String(value));
			});
		}

		return url.toString();
	}

	/**
	 * Build request headers
	 *
	 * Constructs headers with defaults plus authentication and custom headers.
	 * Automatically injects Bearer token unless skipAuth is true.
	 *
	 * @param options - Request options
	 * @returns Headers object ready for fetch
	 */
	private buildHeaders(options: RequestOptions = {}): Headers {
		const headers = new Headers({
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...(options.headers || {})
		});

		if (!options.skipAuth) {
			const token = this.getToken();
			headers.set('Authorization', `Bearer ${token}`);
		}

		return headers;
	}

	/**
	 * Log request for debugging
	 *
	 * Outputs request details to stderr if debug mode enabled.
	 * Uses stderr to avoid interfering with stdout JSON output.
	 *
	 * @param method - HTTP method
	 * @param url - Request URL
	 * @param body - Optional request body
	 */
	private logRequest(method: string, url: string, body?: unknown): void {
		logger.debug(`[API] ${method} ${url}`);
		if (body) {
			logger.debug('[API] Body:', JSON.stringify(body, null, 2));
		}
	}

	/**
	 * Log response for debugging
	 *
	 * Outputs response status and timing to stderr if debug mode enabled.
	 *
	 * @param status - HTTP status code
	 * @param statusText - HTTP status text
	 * @param duration - Request duration in ms
	 */
	private logResponse(status: number, statusText: string, duration: number): void {
		logger.debug(`[API] ${status} ${statusText} (${duration}ms)`);
	}

	/**
	 * Execute HTTP request with error handling and retries
	 *
	 * Core request method handling:
	 * - Timeout via AbortController
	 * - Debug logging
	 * - Error handling and conversion
	 * - Auto-retry on 401 with token refresh
	 * - Configurable retry logic for network failures
	 *
	 * @param method - HTTP method (GET, POST, PUT, DELETE)
	 * @param endpoint - API endpoint path
	 * @param body - Optional request body
	 * @param options - Request options
	 * @returns Parsed response data
	 * @throws {ApiError} For HTTP errors (4xx, 5xx)
	 * @throws {NetworkError} For network/timeout failures
	 */
	private async request<T>(
		method: string,
		endpoint: string,
		body?: unknown,
		options: RequestOptions = {}
	): Promise<T> {
		const url = this.buildUrl(endpoint, options.params);
		const headers = this.buildHeaders(options);
		const timeout = options.timeout || this.config.timeout;
		const retries = options.retries ?? 0;
		const retryDelay = options.retryDelay ?? 1000;

		const startTime = Date.now();

		// Debug logging
		const debug = options.debug ?? this.config.debug;
		if (debug) {
			this.logRequest(method, endpoint, body);
		}

		// Retry loop for network failures
		let lastError: Error | null = null;
		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				// Setup timeout
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout);

				// Make request
				const response = await fetch(url, {
					method,
					headers,
					body: body ? JSON.stringify(body) : undefined,
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				const duration = Date.now() - startTime;

				// Debug logging
				if (debug) {
					this.logResponse(response.status, response.statusText, duration);
				}

				// Handle non-OK responses
				if (!response.ok) {
					// Special handling for 401: refresh token and retry once per request
					if (response.status === 401 && !options.skipAuth && !options._isRetry) {
						this.refreshToken();

						// Retry with new token, marking this as a retry to prevent infinite loops
						return this.request<T>(method, endpoint, body, { ...options, _isRetry: true });
					}

					// For other errors, create and throw ApiError (using sync version for performance)
					throw createApiErrorSync(response, endpoint);
				}

				// Success - parse and return JSON response
				const contentType = response.headers.get('content-type');
				logger.debug(`[API] Response Content-Type: ${contentType}`);

				const data = await response.json();

				logger.debug(`[API] Parsed data type: ${typeof data}`);
				if (typeof data === 'string') {
					logger.debug(`[API] WARNING: response.json() returned a string instead of object!`);
					logger.debug(`[API] First 100 chars: ${data.substring(0, 100)}`);
				}

				return data as T;
			} catch (error) {
				// Handle abort/timeout
				if (error instanceof Error && error.name === 'AbortError') {
					throw new NetworkError(`Request timeout after ${timeout}ms`, url);
				}

				// Re-throw API errors immediately (don't retry 4xx/5xx)
				if (error instanceof ApiError) {
					throw error;
				}

				// Network errors - retry if attempts remain
				if (error instanceof Error) {
					const isNetworkError =
						error.message.includes('fetch failed') ||
						error.message.includes('ECONNREFUSED') ||
						error.message.includes('ENOTFOUND');

					if (isNetworkError) {
						lastError = error;

						// If we have retries remaining, wait and retry
						if (attempt < retries) {
							if (debug) {
								console.error(
									`[API] Network error, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${retries})...`
								);
							}
							await new Promise((resolve) => setTimeout(resolve, retryDelay));
							continue;
						}

						// No more retries - throw NetworkError
						throw new NetworkError(error.message, url);
					}
				}

				// Unknown error - re-throw
				throw error;
			}
		}

		// If we exhausted retries without success
		throw new NetworkError(lastError?.message || 'Network request failed after retries', url);
	}

	/**
	 * Apply token efficiency transformations to response data
	 *
	 * Transforms response data based on token efficiency options:
	 * - count: Return { count: N } instead of full array
	 * - limit: Slice array to specified length
	 * - fields: Filter object keys to specified fields
	 *
	 * These transformations reduce response payload size, critical
	 * for CLI performance and API token usage.
	 *
	 * @param data - Response data to transform
	 * @param options - Token efficiency options
	 * @returns Transformed data
	 */
	private applyTokenEfficiency<T>(
		data: T,
		options: TokenEfficiencyOptions
	): T | { count: number } | T[] {
		if (!data) return data;

		// Count mode: return only item count
		if (options.count) {
			if (Array.isArray(data)) {
				return { count: data.length };
			}
			return { count: 1 };
		}

		// Limit mode: truncate arrays
		if (options.limit && Array.isArray(data)) {
			return data.slice(0, options.limit) as T;
		}

		// Field filtering: return only specified fields from objects
		if (options.fields && Array.isArray(data)) {
			const fieldList = options.fields.split(',').map((f) => f.trim());
			return (data as any[]).map((item) => {
				const filtered: any = {};
				fieldList.forEach((field) => {
					if (field in item) {
						filtered[field] = item[field];
					}
				});
				return filtered;
			}) as T;
		}

		// Single object field filtering
		if (options.fields && !Array.isArray(data) && typeof data === 'object') {
			const fieldList = options.fields.split(',').map((f) => f.trim());
			const filtered: any = {};
			fieldList.forEach((field) => {
				if (field in (data as any)) {
					filtered[field] = (data as any)[field];
				}
			});
			return filtered as T;
		}

		return data;
	}

	/**
	 * GET request
	 *
	 * Executes HTTP GET request with full support for token efficiency.
	 * Ideal for fetching resources and lists.
	 *
	 * @param endpoint - API endpoint path
	 * @param options - Request and token efficiency options
	 * @returns Response data (possibly transformed by token efficiency options)
	 *
	 * @example
	 * ```typescript
	 * // Simple GET
	 * const projects = await client.get<Project[]>('/api/my/projects');
	 *
	 * // With query params
	 * const project = await client.get('/api/project/123', {
	 *   params: { includeStats: true }
	 * });
	 *
	 * // Count only
	 * const count = await client.get('/api/my/projects', { count: true });
	 * // Returns: { count: 42 }
	 *
	 * // Limited results
	 * const recent = await client.get('/api/my/projects', { limit: 5 });
	 *
	 * // Specific fields
	 * const names = await client.get('/api/my/projects', {
	 *   fields: 'id,name,internalID'
	 * });
	 * ```
	 */
	async get<T>(endpoint: string, options?: RequestOptions & TokenEfficiencyOptions): Promise<T> {
		const data = await this.request<T>('GET', endpoint, undefined, options);
		return this.applyTokenEfficiency(data, options || {}) as T;
	}

	/**
	 * POST request
	 *
	 * Executes HTTP POST request for creating resources.
	 *
	 * @param endpoint - API endpoint path
	 * @param body - Request payload
	 * @param options - Request options
	 * @returns Response data
	 *
	 * @example
	 * ```typescript
	 * const newProject = await client.post('/api/project', {
	 *   name: 'My Project',
	 *   organizationId: 123
	 * });
	 * ```
	 */
	async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>('POST', endpoint, body, options);
	}

	/**
	 * PUT request
	 *
	 * Executes HTTP PUT request for updating resources.
	 *
	 * @param endpoint - API endpoint path
	 * @param body - Request payload
	 * @param options - Request options
	 * @returns Response data
	 *
	 * @example
	 * ```typescript
	 * const updated = await client.put('/api/project/123', {
	 *   name: 'Updated Name',
	 *   description: 'New description'
	 * });
	 * ```
	 */
	async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>('PUT', endpoint, body, options);
	}

	/**
	 * DELETE request
	 *
	 * Executes HTTP DELETE request for removing resources.
	 * Supports optional request body (uncommon but valid per RFC 7231).
	 *
	 * @param endpoint - API endpoint path
	 * @param body - Optional request payload (uncommon but supported)
	 * @param options - Request options
	 * @returns Response data
	 *
	 * @example Simple DELETE
	 * ```typescript
	 * await client.delete('/api/project/123');
	 * ```
	 *
	 * @example DELETE with body (uncommon pattern)
	 * ```typescript
	 * await client.delete('/api/resource', {
	 *   resourceId: 123,
	 *   reason: 'cleanup'
	 * });
	 * ```
	 */
	async delete<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>('DELETE', endpoint, body, options);
	}

	/**
	 * Verify API connectivity
	 *
	 * Tests connection to DataBasin API by calling /api/ping endpoint.
	 * Useful for health checks and validating configuration.
	 *
	 * @returns True if API is reachable, false otherwise
	 *
	 * @example
	 * ```typescript
	 * const isOnline = await client.ping();
	 * if (!isOnline) {
	 *   console.error('API is not reachable');
	 * }
	 * ```
	 */
	async ping(): Promise<boolean> {
		try {
			await this.get('/api/ping');
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Update base URL
	 *
	 * Changes the API base URL for this client instance.
	 * Useful for switching between environments.
	 *
	 * @param url - New base URL
	 *
	 * @example
	 * ```typescript
	 * client.setBaseUrl('https://api.staging.databasin.ai');
	 * ```
	 */
	setBaseUrl(url: string): void {
		this.baseUrl = url;
	}

	/**
	 * Get current base URL
	 *
	 * @returns Current API base URL
	 */
	getBaseUrl(): string {
		return this.baseUrl;
	}

	/**
	 * Clear cached token
	 *
	 * Forces token reload on next request.
	 * Useful after token file changes or explicit logout.
	 */
	clearToken(): void {
		this.token = null;
	}
}

/**
 * Create a new DataBasin API client instance
 *
 * Factory function for creating configured client instances.
 * Recommended over direct constructor usage.
 *
 * @param config - Optional full configuration (defaults loaded if not provided)
 * @returns Configured DataBasinClient instance
 *
 * @example
 * ```typescript
 * const client = createClient();
 * const projects = await client.get<Project[]>('/api/my/projects');
 * ```
 *
 * @example With custom config
 * ```typescript
 * const customConfig = loadConfig({ debug: true, timeout: 60000 });
 * const client = createClient(customConfig);
 * ```
 */
export function createClient(config?: CliConfig): DataBasinClient {
	return new DataBasinClient(config);
}
