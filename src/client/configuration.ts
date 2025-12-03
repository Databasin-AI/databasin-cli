/**
 * Configuration Client for Databasin CLI
 *
 * Fetches connector and pipeline screen configurations from static JSON files.
 * Enables configuration-driven discovery patterns by determining the correct
 * workflow at runtime based on connector type.
 *
 * Based on UI implementation:
 * @see src/lib/system/ConfigurationApiClient.js
 *
 * Configuration files are served as static assets from:
 * - /config/connectors/v2/types/DatabasinConnector{Category}.json
 * - /config/pipelines/FlowbasinPipelineScreens.json
 *
 * @module client/configuration
 */

import { DatabasinClient } from './base.ts';
import type {
	ConnectorConfiguration,
	PipelineScreenConfiguration,
	ConnectorTypeConfiguration
} from '../types/api.ts';
import type { RequestOptions } from './base.ts';
import { logger } from '../utils/debug.ts';

/**
 * Connector category identifiers
 *
 * Maps to configuration file names in /config/connectors/v2/types/
 */
type ConnectorCategory =
	| 'RDBMS'
	| 'Marketing'
	| 'FileAPI'
	| 'Accounting'
	| 'BigDataNoSQL'
	| 'CRMERP'
	| 'ECommerce'
	| 'Collaboration'
	| 'AILLM';

/**
 * Cache entry with timestamp and optional TTL
 */
interface CacheEntry<T> {
	/** Cached data */
	data: T;
	/** Timestamp when the entry was cached (milliseconds) */
	timestamp: number;
	/** Optional time-to-live in milliseconds (defaults to 5 minutes) */
	ttl?: number;
}

/**
 * Default cache TTL (5 minutes)
 */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Cache key prefixes
 */
const CACHE_KEY_PREFIX = {
	CONNECTOR: 'connector:',
	PIPELINE_SCREENS: 'pipeline:screens'
} as const;

/**
 * Error encountered while loading a category file
 */
interface CategoryLoadError {
	/** Path to the category file that failed */
	file: string;
	/** Error message */
	error: string;
	/** Full error object for debugging */
	details?: Error;
}

/**
 * Configuration Client for Databasin
 *
 * Fetches and caches connector and pipeline configurations from the server.
 * Provides configuration-driven discovery by determining workflow patterns
 * at runtime based on connector configuration.
 *
 * @example Basic usage
 * ```typescript
 * const client = new ConfigurationClient();
 *
 * // Fetch Postgres connector configuration
 * const postgresConfig = await client.getConnectorConfiguration('Postgres');
 * console.log('Required screens:', postgresConfig.pipelineRequiredScreens);
 * // Output: [6, 7, 2, 3, 4, 5] (catalog → schema → tables workflow)
 *
 * // Fetch pipeline screens
 * const screens = await client.getPipelineScreenConfiguration();
 * console.log('Available screens:', screens.pipelineRequiredScreens.length);
 * ```
 *
 * @example Determining discovery pattern
 * ```typescript
 * const client = new ConfigurationClient();
 * const config = await client.getConnectorConfiguration('Postgres');
 *
 * // Check if uses lakehouse-style discovery (catalog → schema)
 * if (config.pipelineRequiredScreens.includes(6) && config.pipelineRequiredScreens.includes(7)) {
 *   console.log('Uses catalog → schema → tables workflow');
 * } else if (config.pipelineRequiredScreens.includes(1)) {
 *   console.log('Uses single schema selection workflow');
 * }
 * ```
 */
export class ConfigurationClient extends DatabasinClient {
	/**
	 * In-memory cache for configurations
	 *
	 * Cache keys:
	 * - `connector:{connectorSubType}` - Individual connector configurations
	 * - `pipeline:screens` - Pipeline screen configuration
	 */
	private cache: Map<string, CacheEntry<any>>;

	/**
	 * All available connector category configuration files
	 *
	 * These are static files served from the web app's /config/ directory.
	 * Order matches UI loading sequence in ConfigurationApiClient.js
	 */
	private readonly categoryFiles: readonly string[] = [
		'config/connectors/v2/types/DatabasinConnectorRDBMS.json',
		'config/connectors/v2/types/DatabasinConnectorMarketing.json',
		'config/connectors/v2/types/DatabasinConnectorFileAPI.json',
		'config/connectors/v2/types/DatabasinConnectorAccounting.json',
		'config/connectors/v2/types/DatabasinConnectorBigDataNoSQL.json',
		'config/connectors/v2/types/DatabasinConnectorCRMERP.json',
		'config/connectors/v2/types/DatabasinConnectorECommerce.json',
		'config/connectors/v2/types/DatabasinConnectorCollaboration.json',
		'config/connectors/v2/types/DatabasinConnectorAILLM.json'
	];

	constructor() {
		super();
		this.cache = new Map();
	}

	/**
	 * Fetch a static file from the web app
	 *
	 * Static files are served from the web app URL (configured via webUrl),
	 * which may be different from the API URL. In development, the web app
	 * runs on a different port than the API.
	 *
	 * @param path - Relative path to static file (e.g., 'config/connectors/v2/types/...')
	 * @param options - Request options
	 * @returns Parsed JSON response
	 *
	 * @example Development
	 * ```typescript
	 * // Web app: http://localhost:3000
	 * // Fetches: http://localhost:3000/config/connectors/v2/types/RDBMS.json
	 * const config = await this.fetchStaticFile('config/connectors/v2/types/RDBMS.json');
	 * ```
	 *
	 * @example Production
	 * ```typescript
	 * // Web app: https://starling.test.databasin.co
	 * // Fetches: https://starling.test.databasin.co/config/connectors/v2/types/RDBMS.json
	 * const config = await this.fetchStaticFile('config/connectors/v2/types/RDBMS.json');
	 * ```
	 */
	private async fetchStaticFile<T>(path: string, options?: RequestOptions): Promise<T> {
		// Use webUrl from config (defaults to http://localhost:3000 in dev)
		const webUrl = this.config.webUrl.replace(/\/$/, ''); // Remove trailing slash
		const url = `${webUrl}/${path}`;

		logger.debug(`Fetching static file: ${url}`);

		// Use native fetch since we need to bypass the normal API request flow
		const response = await fetch(url, {
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`${response.statusText}`);
		}

		return await response.json() as T;
	}

	/**
	 * Check if a cache entry is still valid
	 *
	 * @param key Cache key to check
	 * @param defaultTTL Default TTL if entry doesn't specify one (default: 5 minutes)
	 * @returns true if cache entry exists and is not expired
	 */
	private isCacheValid(key: string, defaultTTL: number = DEFAULT_CACHE_TTL_MS): boolean {
		const cached = this.cache.get(key);

		if (!cached) {
			logger.debug(`Cache miss: ${key}`);
			return false;
		}

		const ttl = cached.ttl ?? defaultTTL;
		const age = Date.now() - cached.timestamp;
		const isValid = age < ttl;

		if (isValid) {
			const remainingMs = ttl - age;
			const remainingSec = Math.round(remainingMs / 1000);
			logger.debug(`Cache hit: ${key} (expires in ${remainingSec}s)`);
		} else {
			logger.debug(
				`Cache expired: ${key} (age: ${Math.round(age / 1000)}s, ttl: ${Math.round(ttl / 1000)}s)`
			);
			// Remove expired entry
			this.cache.delete(key);
		}

		return isValid;
	}

	/**
	 * Get connector configuration by subtype name
	 *
	 * Searches all connector category files for the specified connector.
	 * Results are cached to minimize redundant network requests.
	 *
	 * @param connectorSubType - Connector subtype name (e.g., "Postgres", "MySQL", "Amazon S3")
	 * @param options - Request options
	 * @returns Connector configuration with workflow details
	 * @throws Error if connector not found in any category
	 *
	 * @example
	 * ```typescript
	 * const postgresConfig = await client.getConnectorConfiguration('Postgres');
	 * console.log('Screens:', postgresConfig.pipelineRequiredScreens);
	 * // Output: [6, 7, 2, 3, 4, 5]
	 * ```
	 */
	async getConnectorConfiguration(
		connectorSubType: string,
		options?: RequestOptions
	): Promise<ConnectorConfiguration> {
		const cacheKey = `${CACHE_KEY_PREFIX.CONNECTOR}${connectorSubType.toLowerCase()}`;

		// Check cache with TTL validation
		if (this.isCacheValid(cacheKey)) {
			const cached = this.cache.get(cacheKey);
			logger.debug(`Returning cached config for ${connectorSubType}`);
			return cached!.data as ConnectorConfiguration;
		}

		logger.debug(`Fetching fresh config for ${connectorSubType}`);

		// Track errors for detailed reporting
		const errors: CategoryLoadError[] = [];
		let successCount = 0;

		// Search all category files for the connector
		for (const categoryFile of this.categoryFiles) {
			try {
				logger.debug(`Loading category file: ${categoryFile}`);

				const categoryConfig = await this.fetchStaticFile<ConnectorTypeConfiguration>(
					categoryFile,
					options
				);

				successCount++;
				logger.debug(
					`Successfully loaded ${categoryFile} (${categoryConfig.availableConnectors?.length || 0} connectors)`
				);

				// Search for connector in this category
				const connectorConfig = categoryConfig.availableConnectors?.find(
					(connector) =>
						connector.connectorName.toLowerCase() === connectorSubType.toLowerCase()
				);

				if (connectorConfig) {
					// Add category to configuration (not in JSON file)
					const configWithCategory: ConnectorConfiguration = {
						...connectorConfig,
						category: categoryConfig.connectorType
					};

					// Cache the result with explicit TTL
					this.cache.set(cacheKey, {
						data: configWithCategory,
						timestamp: Date.now(),
						ttl: DEFAULT_CACHE_TTL_MS
					});

					logger.debug(
						`Found and cached config for ${connectorSubType} in ${categoryFile}`
					);

					return configWithCategory;
				}
			} catch (error) {
				// Track the error but continue searching
				const errorMessage = error instanceof Error ? error.message : String(error);
				errors.push({
					file: categoryFile,
					error: errorMessage,
					details: error instanceof Error ? error : undefined
				});

				logger.debug(`Failed to load ${categoryFile}: ${errorMessage}`);
			}
		}

		// Connector not found - generate detailed error message
		const errorReport = this.generateErrorReport(
			connectorSubType,
			errors,
			successCount,
			this.categoryFiles.length
		);

		logger.debug(`Configuration load failed for ${connectorSubType}`, {
			successCount,
			errorCount: errors.length,
			totalFiles: this.categoryFiles.length
		});

		throw new Error(errorReport);
	}

	/**
	 * Get pipeline screen configuration
	 *
	 * Fetches all available pipeline wizard screens from the server.
	 * Results are cached for the lifetime of the client instance.
	 *
	 * @param options - Request options
	 * @returns Pipeline screen configuration with all available screens
	 *
	 * @example
	 * ```typescript
	 * const screenConfig = await client.getPipelineScreenConfiguration();
	 *
	 * // Find specific screen by ID
	 * const catalogScreen = screenConfig.pipelineRequiredScreens.find(s => s.screenID === 1);
	 * console.log('Screen:', catalogScreen.screenName); // "Catalogs"
	 * ```
	 */
	async getPipelineScreenConfiguration(
		options?: RequestOptions
	): Promise<PipelineScreenConfiguration> {
		const cacheKey = CACHE_KEY_PREFIX.PIPELINE_SCREENS;

		// Check cache with TTL validation
		if (this.isCacheValid(cacheKey)) {
			const cached = this.cache.get(cacheKey);
			logger.debug('Returning cached pipeline screens');
			return cached!.data as PipelineScreenConfiguration;
		}

		logger.debug('Fetching fresh pipeline screens configuration');

		const response = await this.fetchStaticFile<PipelineScreenConfiguration>(
			'config/pipelines/FlowbasinPipelineScreens.json',
			options
		);

		// Cache with timestamp and TTL
		this.cache.set(cacheKey, {
			data: response,
			timestamp: Date.now(),
			ttl: DEFAULT_CACHE_TTL_MS
		});

		logger.debug(`Cached pipeline screens (ttl: ${DEFAULT_CACHE_TTL_MS / 1000}s)`);

		return response;
	}

	/**
	 * Clear configuration cache
	 *
	 * Removes all cached configurations. Call this when starting a new
	 * pipeline wizard workflow or when configuration files may have changed.
	 *
	 * @example
	 * ```typescript
	 * const client = new ConfigurationClient();
	 *
	 * // Use client...
	 * await client.getConnectorConfiguration('Postgres');
	 *
	 * // Clear cache before starting new workflow
	 * client.clearCache();
	 * ```
	 */
	clearCache(): void {
		const size = this.cache.size;
		this.cache.clear();
		logger.debug(`Cache cleared (${size} entries removed)`);
	}

	/**
	 * Get connector configuration category
	 *
	 * Determines which category file contains a connector configuration.
	 * Useful for debugging or advanced use cases.
	 *
	 * @param connectorSubType - Connector subtype name
	 * @param options - Request options
	 * @returns Category name or null if not found
	 *
	 * @example
	 * ```typescript
	 * const category = await client.getConnectorCategory('Postgres');
	 * console.log(category); // "RDBMS"
	 * ```
	 */
	async getConnectorCategory(
		connectorSubType: string,
		options?: RequestOptions
	): Promise<string | null> {
		try {
			const config = await this.getConnectorConfiguration(connectorSubType, options);
			const category = config.category;
			return typeof category === 'string' ? category : null;
		} catch {
			return null;
		}
	}

	/**
	 * Get all available connectors
	 *
	 * Fetches and aggregates all connectors from all category files.
	 * Only returns active connectors.
	 *
	 * @param options - Request options
	 * @returns Array of all active connector configurations
	 *
	 * @example
	 * ```typescript
	 * const allConnectors = await client.getAllConnectors();
	 * console.log('Available connectors:', allConnectors.map(c => c.connectorName));
	 * ```
	 */
	async getAllConnectors(options?: RequestOptions): Promise<ConnectorConfiguration[]> {
		const allConnectors: ConnectorConfiguration[] = [];

		for (const categoryFile of this.categoryFiles) {
			try {
				const categoryConfig = await this.fetchStaticFile<ConnectorTypeConfiguration>(
					categoryFile,
					options
				);

				// Add connectors with category information
				const connectorsWithCategory = categoryConfig.availableConnectors
					.filter((c) => c.active)
					.map((c) => ({
						...c,
						category: categoryConfig.connectorType
					}));

				allConnectors.push(...connectorsWithCategory);
			} catch (error) {
				// Continue loading other categories even if one fails
				logger.warn(
					`Failed to load category file ${categoryFile}:`,
					error instanceof Error ? error.message : String(error)
				);
			}
		}

		return allConnectors;
	}

	/**
	 * Generate a detailed error report for configuration loading failures
	 *
	 * @param connectorSubType Connector being searched for
	 * @param errors Errors encountered during loading
	 * @param successCount Number of files loaded successfully
	 * @param totalFiles Total number of category files
	 * @returns Formatted error message
	 */
	private generateErrorReport(
		connectorSubType: string,
		errors: CategoryLoadError[],
		successCount: number,
		totalFiles: number
	): string {
		const errorCount = errors.length;

		// Case 1: All files failed to load
		if (errorCount === totalFiles) {
			const errorDetails = errors.map((e) => `  ${e.file}: ${e.error}`).join('\n');
			return (
				`Failed to load any connector configuration files (0/${totalFiles} succeeded).\n` +
				`This may indicate a network issue, permission problem, or missing configuration files.\n\n` +
				`Errors encountered:\n${errorDetails}\n\n` +
				`Troubleshooting:\n` +
				`  - Check network connectivity to configuration server\n` +
				`  - Verify configuration files exist in static/config/connectors/v2/types/\n` +
				`  - Check file permissions\n` +
				`  - Enable debug logging with DEBUG=true for more details`
			);
		}

		// Case 2: Some files failed, connector not found
		if (errorCount > 0) {
			const errorDetails = errors.map((e) => `  ${e.file}: ${e.error}`).join('\n');
			return (
				`Connector "${connectorSubType}" not found in any category.\n` +
				`Searched ${totalFiles} categories: ${successCount} succeeded, ${errorCount} failed.\n\n` +
				`Files that failed to load:\n${errorDetails}\n\n` +
				`The connector may be:\n` +
				`  - Misspelled (check exact connector name)\n` +
				`  - Defined in a category file that failed to load\n` +
				`  - Not yet configured (inactive or missing from configuration)\n\n` +
				`Troubleshooting:\n` +
				`  - Check connector name spelling (case-insensitive match)\n` +
				`  - Review failed category files above\n` +
				`  - Enable debug logging with DEBUG=true for more details`
			);
		}

		// Case 3: All files loaded successfully, connector just not found
		return (
			`Connector "${connectorSubType}" not found in any category.\n` +
			`Searched all ${totalFiles} category files successfully.\n\n` +
			`This connector may be:\n` +
			`  - Misspelled (check exact connector name, case-insensitive)\n` +
			`  - Inactive (not configured for use)\n` +
			`  - Not yet added to the configuration files\n\n` +
			`Available categories searched:\n${this.categoryFiles.map((f) => `  - ${f}`).join('\n')}\n\n` +
			`Troubleshooting:\n` +
			`  - List available connectors with: getAllConnectors()\n` +
			`  - Check spelling against available connector names\n` +
			`  - Verify connector is marked as active in configuration`
		);
	}

	/**
	 * Get cache statistics for debugging
	 *
	 * @returns Cache statistics including entry count and ages
	 *
	 * @example
	 * ```typescript
	 * const stats = client.getCacheStats();
	 * console.log(`Cache has ${stats.entryCount} entries`);
	 * stats.entries.forEach(entry => {
	 *   console.log(`${entry.key}: ${entry.ageSeconds}s old (ttl: ${entry.ttlSeconds}s)`);
	 * });
	 * ```
	 */
	getCacheStats(): {
		entryCount: number;
		entries: Array<{
			key: string;
			ageSeconds: number;
			ttlSeconds: number;
			expired: boolean;
		}>;
	} {
		const now = Date.now();
		const entries: Array<{
			key: string;
			ageSeconds: number;
			ttlSeconds: number;
			expired: boolean;
		}> = [];

		this.cache.forEach((value, key) => {
			const age = now - value.timestamp;
			const ttl = value.ttl ?? DEFAULT_CACHE_TTL_MS;
			const expired = age >= ttl;

			entries.push({
				key,
				ageSeconds: Math.round(age / 1000),
				ttlSeconds: Math.round(ttl / 1000),
				expired
			});
		});

		return {
			entryCount: this.cache.size,
			entries
		};
	}
}

/**
 * Create a new configuration client instance
 *
 * Factory function for creating configured configuration client instances.
 * Recommended over direct constructor usage for consistency.
 *
 * @returns Configured ConfigurationClient instance
 *
 * @example
 * ```typescript
 * import { createConfigurationClient } from './client/configuration.ts';
 *
 * const client = createConfigurationClient();
 * const config = await client.getConnectorConfiguration('Postgres');
 * ```
 */
export function createConfigurationClient(): ConfigurationClient {
	return new ConfigurationClient();
}
