/**
 * Configuration Cache System for Databasin CLI
 *
 * Provides local caching of API responses to improve wizard performance
 * and reduce API calls. Cache entries have configurable TTL (time-to-live)
 * and are stored in the user's home directory.
 *
 * Cache directory: ~/.databasin/cache/
 * Default TTL: 24 hours
 *
 * @module utils/config-cache
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';

/**
 * Default cache directory in user's home
 */
const DEFAULT_CACHE_DIR = join(homedir(), '.databasin', 'cache');

/**
 * Default cache TTL (24 hours in milliseconds)
 */
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Cache entry with timestamp and TTL
 *
 * @template T - Type of cached data
 */
interface CacheEntry<T> {
	/** Cached data */
	data: T;

	/** Timestamp when entry was created (milliseconds) */
	timestamp: number;

	/** Time-to-live in milliseconds */
	ttl: number;
}

/**
 * Cache statistics for debugging and monitoring
 */
export interface CacheStats {
	/** Total number of cache files */
	totalEntries: number;

	/** Number of expired entries */
	expiredEntries: number;

	/** Total cache size in bytes (approximate) */
	totalSizeBytes: number;

	/** Cache directory path */
	cacheDir: string;
}

/**
 * Configuration Cache Manager
 *
 * Manages local file-based caching with TTL expiration.
 * Thread-safe for single-process usage (not designed for multi-process concurrency).
 *
 * @example Basic usage
 * ```typescript
 * const cache = new ConfigCache();
 *
 * // Fetch with cache
 * const projects = await cache.get(
 *   'projects_list',
 *   async () => await client.projects.list()
 * );
 *
 * // Custom TTL (1 hour)
 * const connectors = await cache.get(
 *   'connectors_project_123',
 *   async () => await client.connectors.list({ projectId: '123' }),
 *   60 * 60 * 1000
 * );
 *
 * // Clear specific entry
 * cache.delete('projects_list');
 *
 * // Clear all cache
 * cache.clear();
 * ```
 *
 * @example With wizard
 * ```typescript
 * // Cache connector list during wizard
 * const connectors = await configCache.get(
 *   `connectors_${projectId}`,
 *   () => clients.connectors.list({ projectId })
 * );
 *
 * // Cache schemas (shorter TTL for dynamic data)
 * const schemas = await configCache.get(
 *   `schemas_${connectorId}`,
 *   () => clients.sql.listSchemas(connectorId),
 *   60 * 60 * 1000 // 1 hour
 * );
 * ```
 */
export class ConfigCache {
	private cacheDir: string;
	private defaultTtl: number;

	/**
	 * Create a new configuration cache manager
	 *
	 * @param cacheDir - Cache directory path (default: ~/.databasin/cache)
	 * @param defaultTtl - Default TTL in milliseconds (default: 24 hours)
	 */
	constructor(cacheDir: string = DEFAULT_CACHE_DIR, defaultTtl: number = DEFAULT_CACHE_TTL) {
		this.cacheDir = cacheDir;
		this.defaultTtl = defaultTtl;
		this.ensureCacheDir();
	}

	/**
	 * Ensure cache directory exists
	 *
	 * Creates the cache directory and parent directories if they don't exist.
	 *
	 * @private
	 */
	private ensureCacheDir(): void {
		if (!existsSync(this.cacheDir)) {
			mkdirSync(this.cacheDir, { recursive: true });
		}
	}

	/**
	 * Get cached value or fetch if missing/expired
	 *
	 * Primary cache access method. Returns cached data if valid,
	 * otherwise calls fetcher function and caches the result.
	 *
	 * @template T - Type of data being cached
	 * @param key - Unique cache key
	 * @param fetcher - Async function to fetch data if cache miss
	 * @param ttl - Time-to-live in milliseconds (optional, uses default if omitted)
	 * @returns Cached or freshly fetched data
	 *
	 * @example
	 * ```typescript
	 * const data = await cache.get('my-key', async () => {
	 *   return await fetchDataFromAPI();
	 * });
	 * ```
	 */
	async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
		// Try to read from cache
		const cached = this.read<T>(key);

		// Return cached data if valid
		if (cached && !this.isExpired(cached)) {
			return cached.data;
		}

		// Cache miss or expired - fetch fresh data
		const data = await fetcher();

		// Write to cache with specified or default TTL
		this.write(key, data, ttl ?? this.defaultTtl);

		return data;
	}

	/**
	 * Read entry from cache
	 *
	 * Returns cached entry if it exists, null otherwise.
	 * Does not check expiration - use isExpired() separately.
	 *
	 * @template T - Type of cached data
	 * @param key - Cache key
	 * @returns Cache entry or null if not found
	 *
	 * @private
	 */
	private read<T>(key: string): CacheEntry<T> | null {
		const filePath = this.getFilePath(key);

		if (!existsSync(filePath)) {
			return null;
		}

		try {
			const content = readFileSync(filePath, 'utf-8');
			return JSON.parse(content) as CacheEntry<T>;
		} catch (error) {
			// Corrupted cache file - ignore and return null
			return null;
		}
	}

	/**
	 * Write entry to cache
	 *
	 * Serializes data as JSON and writes to cache file.
	 * Overwrites existing entry if present.
	 *
	 * @template T - Type of data being cached
	 * @param key - Cache key
	 * @param data - Data to cache
	 * @param ttl - Time-to-live in milliseconds
	 *
	 * @private
	 */
	private write<T>(key: string, data: T, ttl: number): void {
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			ttl
		};

		const filePath = this.getFilePath(key);

		try {
			writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
		} catch (error) {
			// Silently fail if cache write fails (non-critical)
			// Cache is a performance optimization, not a requirement
		}
	}

	/**
	 * Check if cache entry is expired
	 *
	 * Compares current time against entry timestamp + TTL.
	 *
	 * @template T - Type of cached data
	 * @param entry - Cache entry to check
	 * @returns true if entry is expired
	 *
	 * @private
	 */
	private isExpired<T>(entry: CacheEntry<T>): boolean {
		const now = Date.now();
		const expiresAt = entry.timestamp + entry.ttl;
		return now > expiresAt;
	}

	/**
	 * Get file path for cache key
	 *
	 * Sanitizes key to safe filename and returns full path.
	 * Replaces unsafe characters with underscores.
	 *
	 * @param key - Cache key
	 * @returns Full file path
	 *
	 * @private
	 */
	private getFilePath(key: string): string {
		// Sanitize key to safe filename (alphanumeric, dash, underscore only)
		const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
		return join(this.cacheDir, `${safeKey}.json`);
	}

	/**
	 * Clear all cache entries
	 *
	 * Deletes all cache files in the cache directory.
	 * Does not delete the cache directory itself.
	 *
	 * @example
	 * ```typescript
	 * cache.clear();
	 * console.log('All cache cleared');
	 * ```
	 */
	clear(): void {
		if (!existsSync(this.cacheDir)) {
			return;
		}

		try {
			const files = readdirSync(this.cacheDir);

			for (const file of files) {
				if (file.endsWith('.json')) {
					const filePath = join(this.cacheDir, file);
					unlinkSync(filePath);
				}
			}
		} catch (error) {
			// Silently fail if clear fails (permission issues, etc.)
		}
	}

	/**
	 * Delete specific cache entry
	 *
	 * Removes cache file for the specified key.
	 * Does nothing if entry doesn't exist.
	 *
	 * @param key - Cache key to delete
	 *
	 * @example
	 * ```typescript
	 * cache.delete('projects_list');
	 * console.log('Specific cache entry cleared');
	 * ```
	 */
	delete(key: string): void {
		const filePath = this.getFilePath(key);

		if (existsSync(filePath)) {
			try {
				unlinkSync(filePath);
			} catch (error) {
				// Silently fail if delete fails
			}
		}
	}

	/**
	 * Clear expired cache entries
	 *
	 * Removes all cache files that have exceeded their TTL.
	 * Useful for maintenance and cleanup.
	 *
	 * @returns Number of entries cleared
	 *
	 * @example
	 * ```typescript
	 * const cleared = cache.clearExpired();
	 * console.log(`Cleared ${cleared} expired cache entries`);
	 * ```
	 */
	clearExpired(): number {
		if (!existsSync(this.cacheDir)) {
			return 0;
		}

		let clearedCount = 0;

		try {
			const files = readdirSync(this.cacheDir);

			for (const file of files) {
				if (!file.endsWith('.json')) {
					continue;
				}

				const filePath = join(this.cacheDir, file);

				try {
					const content = readFileSync(filePath, 'utf-8');
					const entry = JSON.parse(content) as CacheEntry<any>;

					if (this.isExpired(entry)) {
						unlinkSync(filePath);
						clearedCount++;
					}
				} catch (error) {
					// Corrupted file - delete it
					unlinkSync(filePath);
					clearedCount++;
				}
			}
		} catch (error) {
			// Silently fail if cleanup fails
		}

		return clearedCount;
	}

	/**
	 * Get cache statistics
	 *
	 * Returns information about cache usage for debugging and monitoring.
	 *
	 * @returns Cache statistics object
	 *
	 * @example
	 * ```typescript
	 * const stats = cache.getStats();
	 * console.log(`Cache has ${stats.totalEntries} entries`);
	 * console.log(`${stats.expiredEntries} are expired`);
	 * ```
	 */
	getStats(): CacheStats {
		const stats: CacheStats = {
			totalEntries: 0,
			expiredEntries: 0,
			totalSizeBytes: 0,
			cacheDir: this.cacheDir
		};

		if (!existsSync(this.cacheDir)) {
			return stats;
		}

		try {
			const files = readdirSync(this.cacheDir);

			for (const file of files) {
				if (!file.endsWith('.json')) {
					continue;
				}

				const filePath = join(this.cacheDir, file);

				try {
					const content = readFileSync(filePath, 'utf-8');
					const entry = JSON.parse(content) as CacheEntry<any>;

					stats.totalEntries++;
					stats.totalSizeBytes += content.length;

					if (this.isExpired(entry)) {
						stats.expiredEntries++;
					}
				} catch (error) {
					// Corrupted file - count as expired
					stats.totalEntries++;
					stats.expiredEntries++;
				}
			}
		} catch (error) {
			// Ignore errors
		}

		return stats;
	}

	/**
	 * Check if cache has valid entry for key
	 *
	 * Returns true if cache has non-expired entry for the key.
	 *
	 * @param key - Cache key to check
	 * @returns true if valid cache entry exists
	 *
	 * @example
	 * ```typescript
	 * if (cache.has('projects_list')) {
	 *   console.log('Cache hit!');
	 * }
	 * ```
	 */
	has(key: string): boolean {
		const entry = this.read(key);
		return entry !== null && !this.isExpired(entry);
	}
}

/**
 * Global configuration cache instance
 *
 * Shared cache instance for use across the CLI.
 * Uses default cache directory and TTL.
 *
 * @example
 * ```typescript
 * import { configCache } from './utils/config-cache';
 *
 * const data = await configCache.get('my-key', async () => {
 *   return await fetchData();
 * });
 * ```
 */
export const configCache = new ConfigCache();
