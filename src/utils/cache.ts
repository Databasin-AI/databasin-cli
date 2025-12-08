/**
 * File-Based Cache with TTL Support
 *
 * Provides file-based caching for API responses to reduce repeated calls.
 * Uses TTL (time to live) expiration and namespace isolation for organization.
 *
 * Cache structure:
 * - ~/.databasin/cache/{namespace}/{hash}.json
 * - Each cache entry contains data, expiration, and metadata
 * - Automatic cleanup of expired entries
 *
 * // TODO: migrate to API - server-side caching would be more efficient
 * Client-side caching is limited by local storage and not shared across machines.
 * A server-side cache would provide better performance and consistency.
 *
 * @module utils/cache
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { getConfigDir } from '../config.ts';
import { FileSystemError } from './errors.ts';

/**
 * Cache entry structure
 *
 * Wraps cached data with metadata for TTL and tracking.
 */
export interface CacheEntry<T> {
	/** Cache key identifier */
	key: string;
	/** Cached data */
	data: T;
	/** Expiration timestamp (milliseconds since epoch) */
	expiresAt: number;
	/** Creation timestamp (milliseconds since epoch) */
	createdAt: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
	/** Time to live in seconds (default: 300 = 5 minutes) */
	ttl?: number;
	/** Cache namespace for organization (default: 'default') */
	namespace?: string;
}

/**
 * Default cache options
 */
const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
	ttl: 300, // 5 minutes
	namespace: 'default'
};

/**
 * Get the cache base directory
 *
 * Returns the path to the cache directory in the user's config directory.
 *
 * @returns Absolute path to cache directory
 */
export function getCacheDir(): string {
	return join(getConfigDir(), 'cache');
}

/**
 * Get the cache file path for a key
 *
 * Generates a deterministic file path for a cache key using hash-based naming.
 * Uses MD5 hash to create short, unique filenames.
 *
 * @param key - Cache key
 * @param namespace - Optional namespace (default: 'default')
 * @returns Absolute path to cache file
 *
 * @example
 * ```typescript
 * getCacheFilePath('projects:list', 'api')
 * // ~/.databasin/cache/api/5d41402abc4b2a76b9719d911017c592.json
 * ```
 */
export function getCacheFilePath(key: string, namespace: string = 'default'): string {
	const hash = createHash('md5').update(key).digest('hex');
	return join(getCacheDir(), namespace, `${hash}.json`);
}

/**
 * Ensure cache directory exists
 *
 * Creates cache directory and namespace subdirectory if they don't exist.
 *
 * @param namespace - Cache namespace
 * @throws {FileSystemError} If directory creation fails
 */
function ensureCacheDir(namespace: string): void {
	const cacheDir = join(getCacheDir(), namespace);

	if (!existsSync(cacheDir)) {
		try {
			mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
		} catch (error: any) {
			throw new FileSystemError(
				`Failed to create cache directory: ${error.message}`,
				cacheDir,
				'write'
			);
		}
	}
}

/**
 * Check if cache entry is valid (not expired)
 *
 * @param entry - Cache entry to check
 * @returns True if entry has not expired
 */
export function isCacheValid(entry: CacheEntry<any>): boolean {
	return entry.expiresAt > Date.now();
}

/**
 * Get cached data
 *
 * Retrieves data from cache if it exists and has not expired.
 * Returns null if cache miss or entry is expired.
 *
 * @param key - Cache key
 * @param options - Cache options
 * @returns Cached data or null
 *
 * @example
 * ```typescript
 * const projects = getCache<Project[]>('projects:list', { namespace: 'api' });
 * if (projects) {
 *   console.log('Cache hit!');
 *   return projects;
 * }
 * ```
 */
export function getCache<T>(key: string, options: CacheOptions = {}): T | null {
	const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
	const filePath = getCacheFilePath(key, opts.namespace);

	// Cache miss if file doesn't exist
	if (!existsSync(filePath)) {
		return null;
	}

	try {
		const content = readFileSync(filePath, 'utf-8');
		const entry: CacheEntry<T> = JSON.parse(content);

		// Validate entry structure
		if (!entry.data || !entry.expiresAt || !entry.createdAt) {
			// Invalid entry - delete it
			try {
				unlinkSync(filePath);
			} catch {
				// Ignore deletion errors
			}
			return null;
		}

		// Check expiration
		if (!isCacheValid(entry)) {
			// Expired - delete it
			try {
				unlinkSync(filePath);
			} catch {
				// Ignore deletion errors
			}
			return null;
		}

		return entry.data;
	} catch (error: any) {
		// Corrupted cache file - delete it
		try {
			unlinkSync(filePath);
		} catch {
			// Ignore deletion errors
		}
		return null;
	}
}

/**
 * Set cached data
 *
 * Stores data in cache with TTL expiration.
 * Uses atomic write pattern for safety.
 *
 * @param key - Cache key
 * @param data - Data to cache
 * @param options - Cache options
 * @throws {FileSystemError} If write fails
 *
 * @example
 * ```typescript
 * setCache('projects:list', projects, { ttl: 600, namespace: 'api' });
 * ```
 */
export function setCache<T>(key: string, data: T, options: CacheOptions = {}): void {
	const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
	const filePath = getCacheFilePath(key, opts.namespace);

	// Ensure directory exists
	ensureCacheDir(opts.namespace);

	const now = Date.now();
	const entry: CacheEntry<T> = {
		key,
		data,
		expiresAt: now + opts.ttl * 1000,
		createdAt: now
	};

	// Atomic write: write to temp file first, then rename
	const tempFile = `${filePath}.tmp`;

	try {
		// Write to temp file
		const content = JSON.stringify(entry, null, 2) + '\n';
		writeFileSync(tempFile, content, { mode: 0o600 });

		// Atomic rename
		renameSync(tempFile, filePath);
	} catch (error: any) {
		// Clean up temp file if it exists
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore cleanup errors
		}

		throw new FileSystemError(
			`Failed to write cache: ${error.message}`,
			filePath,
			'write'
		);
	}
}

/**
 * Clear cache
 *
 * Clears all cache or specific cache entries.
 * - If no key: clears entire namespace
 * - If key provided: clears specific entry
 * - If no namespace: clears all namespaces
 *
 * @param key - Optional cache key to clear
 * @param namespace - Optional namespace to clear (default: all namespaces)
 *
 * @example
 * ```typescript
 * // Clear specific entry
 * clearCache('projects:list', 'api');
 *
 * // Clear entire namespace
 * clearCache(undefined, 'api');
 *
 * // Clear all cache
 * clearCache();
 * ```
 */
export function clearCache(key?: string, namespace?: string): void {
	if (key && namespace) {
		// Clear specific entry
		const filePath = getCacheFilePath(key, namespace);
		if (existsSync(filePath)) {
			try {
				unlinkSync(filePath);
			} catch (error: any) {
				throw new FileSystemError(
					`Failed to clear cache entry: ${error.message}`,
					filePath,
					'delete'
				);
			}
		}
		return;
	}

	if (namespace) {
		// Clear entire namespace
		const namespaceDir = join(getCacheDir(), namespace);
		if (existsSync(namespaceDir)) {
			try {
				const files = readdirSync(namespaceDir);
				for (const file of files) {
					if (file.endsWith('.json')) {
						unlinkSync(join(namespaceDir, file));
					}
				}
			} catch (error: any) {
				throw new FileSystemError(
					`Failed to clear cache namespace: ${error.message}`,
					namespaceDir,
					'delete'
				);
			}
		}
		return;
	}

	// Clear all cache
	const cacheDir = getCacheDir();
	if (existsSync(cacheDir)) {
		try {
			const namespaces = readdirSync(cacheDir);
			for (const ns of namespaces) {
				const nsPath = join(cacheDir, ns);
				if (statSync(nsPath).isDirectory()) {
					const files = readdirSync(nsPath);
					for (const file of files) {
						if (file.endsWith('.json')) {
							unlinkSync(join(nsPath, file));
						}
					}
				}
			}
		} catch (error: any) {
			throw new FileSystemError(
				`Failed to clear cache: ${error.message}`,
				cacheDir,
				'delete'
			);
		}
	}
}

/**
 * Invalidate all cache entries in a namespace
 *
 * Call this after mutations (create, update, delete) to prevent stale cache.
 * Can optionally filter by pattern to invalidate only matching entries.
 *
 * @param namespace - Cache namespace to invalidate
 * @param pattern - Optional pattern to match (e.g., 'connectors' to clear connector caches)
 *
 * @example
 * ```typescript
 * // After creating a connector, invalidate connector list cache
 * invalidateNamespace('api', 'connectors');
 *
 * // After deleting a pipeline, invalidate all API caches
 * invalidateNamespace('api');
 * ```
 */
export function invalidateNamespace(namespace: string, pattern?: string): void {
	try {
		const namespaceDir = join(getCacheDir(), namespace);
		if (!existsSync(namespaceDir)) {
			return; // Nothing to invalidate
		}

		const files = readdirSync(namespaceDir);
		let cleared = 0;

		for (const file of files) {
			if (!file.endsWith('.json')) continue;

			// If pattern provided, only clear matching keys
			if (pattern) {
				try {
					const content = readFileSync(join(namespaceDir, file), 'utf-8');
					const entry = JSON.parse(content);
					if (!entry.key || !entry.key.includes(pattern)) {
						continue;
					}
				} catch {
					// Skip corrupted files - will be cleaned up eventually
					continue;
				}
			}

			try {
				unlinkSync(join(namespaceDir, file));
				cleared++;
			} catch {
				// Ignore deletion errors - file may have been removed already
			}
		}

		if (process.env.DATABASIN_DEBUG) {
			console.error(
				`[CACHE] Invalidated ${cleared} entries in namespace '${namespace}'${pattern ? ` matching '${pattern}'` : ''}`
			);
		}
	} catch (error: any) {
		// Silent failure - cache invalidation shouldn't break operations
		if (process.env.DATABASIN_DEBUG) {
			console.error(`[CACHE] Failed to invalidate namespace: ${error.message}`);
		}
	}
}

/**
 * Cache status information
 */
export interface CacheStatus {
	/** Cache key */
	key: string;
	/** File size in bytes */
	size: number;
	/** Expiration timestamp */
	expiresAt: number;
	/** Namespace */
	namespace: string;
}

/**
 * Get cache status
 *
 * Returns information about all cached entries across all namespaces.
 * Useful for debugging and cache management.
 *
 * @returns Array of cache status objects
 *
 * @example
 * ```typescript
 * const status = getCacheStatus();
 * console.log(`Total cached entries: ${status.length}`);
 * for (const entry of status) {
 *   const ttl = Math.floor((entry.expiresAt - Date.now()) / 1000);
 *   console.log(`${entry.key}: ${entry.size} bytes, expires in ${ttl}s`);
 * }
 * ```
 */
export function getCacheStatus(): CacheStatus[] {
	const status: CacheStatus[] = [];
	const cacheDir = getCacheDir();

	if (!existsSync(cacheDir)) {
		return status;
	}

	try {
		const namespaces = readdirSync(cacheDir);
		for (const namespace of namespaces) {
			const nsPath = join(cacheDir, namespace);
			if (!statSync(nsPath).isDirectory()) {
				continue;
			}

			const files = readdirSync(nsPath);
			for (const file of files) {
				if (!file.endsWith('.json')) {
					continue;
				}

				const filePath = join(nsPath, file);
				try {
					const content = readFileSync(filePath, 'utf-8');
					const entry: CacheEntry<any> = JSON.parse(content);
					const stats = statSync(filePath);

					status.push({
						key: entry.key,
						size: stats.size,
						expiresAt: entry.expiresAt,
						namespace
					});
				} catch {
					// Skip corrupted files
				}
			}
		}
	} catch (error) {
		// Return partial status on error
	}

	return status;
}
