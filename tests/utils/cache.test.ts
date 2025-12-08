/**
 * Tests for Cache Storage Utility
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
	getCache,
	setCache,
	clearCache,
	getCacheStatus,
	isCacheValid,
	getCacheDir,
	getCacheFilePath,
	type CacheEntry
} from '../../src/utils/cache';

// Mock the config directory to use a temp directory
let originalEnv: string | undefined;
let testConfigDir: string;

beforeEach(() => {
	// Create unique test directory
	testConfigDir = join(tmpdir(), `databasin-cli-test-${Date.now()}-${Math.random()}`);
	mkdirSync(testConfigDir, { recursive: true });

	// Override config path
	originalEnv = process.env.DATABASIN_CONFIG_PATH;
	process.env.DATABASIN_CONFIG_PATH = join(testConfigDir, 'config.json');
});

afterEach(() => {
	// Restore original env
	if (originalEnv !== undefined) {
		process.env.DATABASIN_CONFIG_PATH = originalEnv;
	} else {
		delete process.env.DATABASIN_CONFIG_PATH;
	}

	// Clean up test directory recursively
	try {
		const cacheDir = join(testConfigDir, 'cache');
		if (existsSync(cacheDir)) {
			// Remove all files and subdirectories
			const removeRecursive = (dir: string) => {
				if (!existsSync(dir)) return;
				const files = readdirSync(dir);
				for (const file of files) {
					const filePath = join(dir, file);
					const stat = require('fs').statSync(filePath);
					if (stat.isDirectory()) {
						removeRecursive(filePath);
						rmdirSync(filePath);
					} else {
						unlinkSync(filePath);
					}
				}
			};
			removeRecursive(cacheDir);
			rmdirSync(cacheDir);
		}

		if (existsSync(testConfigDir)) {
			const files = readdirSync(testConfigDir);
			for (const file of files) {
				const filePath = join(testConfigDir, file);
				if (existsSync(filePath)) {
					unlinkSync(filePath);
				}
			}
			rmdirSync(testConfigDir);
		}
	} catch (error) {
		// Ignore cleanup errors
	}
});

describe('cache storage', () => {
	test('returns null when cache does not exist', () => {
		const data = getCache<string>('test-key');
		expect(data).toBeNull();
	});

	test('saves and retrieves cached data', () => {
		const testData = { foo: 'bar', baz: 123 };
		setCache('test-key', testData);

		const retrieved = getCache<typeof testData>('test-key');
		expect(retrieved).toEqual(testData);
	});

	test('respects TTL expiration', () => {
		const testData = 'test-value';
		// Set cache with 1 second TTL
		setCache('test-key', testData, { ttl: 1 });

		// Should be cached immediately
		expect(getCache<string>('test-key')).toBe(testData);

		// Wait for expiration (1.1 seconds to be safe)
		const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
		return sleep(1100).then(() => {
			// Should be expired and return null
			expect(getCache<string>('test-key')).toBeNull();
		});
	});

	test('uses default TTL of 300 seconds', () => {
		const testData = 'test-value';
		setCache('test-key', testData);

		const filePath = getCacheFilePath('test-key', 'default');
		const content = require('fs').readFileSync(filePath, 'utf-8');
		const entry: CacheEntry<string> = JSON.parse(content);

		// Should expire in ~300 seconds (give or take a few ms)
		const ttl = (entry.expiresAt - entry.createdAt) / 1000;
		expect(ttl).toBeGreaterThanOrEqual(299);
		expect(ttl).toBeLessThanOrEqual(301);
	});

	test('supports namespace isolation', () => {
		setCache('key1', 'value1', { namespace: 'ns1' });
		setCache('key1', 'value2', { namespace: 'ns2' });

		expect(getCache<string>('key1', { namespace: 'ns1' })).toBe('value1');
		expect(getCache<string>('key1', { namespace: 'ns2' })).toBe('value2');
	});

	test('creates cache directory if missing', () => {
		const cacheDir = getCacheDir();
		expect(existsSync(cacheDir)).toBe(false);

		setCache('test-key', 'test-value');

		expect(existsSync(cacheDir)).toBe(true);
		expect(existsSync(join(cacheDir, 'default'))).toBe(true);
	});

	test('uses atomic write pattern', () => {
		const filePath = getCacheFilePath('test-key', 'default');
		const tempFile = `${filePath}.tmp`;

		setCache('test-key', 'test-value');

		// Temp file should not exist after successful write
		expect(existsSync(tempFile)).toBe(false);
		// Real file should exist
		expect(existsSync(filePath)).toBe(true);
	});

	test('handles corrupted cache file', () => {
		const filePath = getCacheFilePath('test-key', 'default');

		// Create cache directory
		const namespaceDir = join(getCacheDir(), 'default');
		mkdirSync(namespaceDir, { recursive: true });

		// Write corrupted file
		writeFileSync(filePath, 'invalid json {', 'utf-8');

		const data = getCache<string>('test-key');
		expect(data).toBeNull();
		// File should be deleted
		expect(existsSync(filePath)).toBe(false);
	});

	test('handles invalid cache entry structure', () => {
		const filePath = getCacheFilePath('test-key', 'default');

		// Create cache directory
		const namespaceDir = join(getCacheDir(), 'default');
		mkdirSync(namespaceDir, { recursive: true });

		// Write invalid entry (missing fields)
		writeFileSync(filePath, JSON.stringify({ data: 'test' }), 'utf-8');

		const data = getCache<string>('test-key');
		expect(data).toBeNull();
		// File should be deleted
		expect(existsSync(filePath)).toBe(false);
	});

	test('caches complex data types', () => {
		const complexData = {
			array: [1, 2, 3],
			nested: { foo: { bar: 'baz' } },
			null: null,
			boolean: true,
			number: 42
		};

		setCache('complex-key', complexData);
		const retrieved = getCache<typeof complexData>('complex-key');
		expect(retrieved).toEqual(complexData);
	});
});

describe('clearCache', () => {
	test('clears specific cache entry', () => {
		setCache('key1', 'value1');
		setCache('key2', 'value2');

		clearCache('key1', 'default');

		expect(getCache<string>('key1')).toBeNull();
		expect(getCache<string>('key2')).toBe('value2');
	});

	test('clears entire namespace', () => {
		setCache('key1', 'value1', { namespace: 'ns1' });
		setCache('key2', 'value2', { namespace: 'ns1' });
		setCache('key3', 'value3', { namespace: 'ns2' });

		clearCache(undefined, 'ns1');

		expect(getCache<string>('key1', { namespace: 'ns1' })).toBeNull();
		expect(getCache<string>('key2', { namespace: 'ns1' })).toBeNull();
		expect(getCache<string>('key3', { namespace: 'ns2' })).toBe('value3');
	});

	test('clears all cache', () => {
		setCache('key1', 'value1', { namespace: 'ns1' });
		setCache('key2', 'value2', { namespace: 'ns2' });
		setCache('key3', 'value3', { namespace: 'default' });

		clearCache();

		expect(getCache<string>('key1', { namespace: 'ns1' })).toBeNull();
		expect(getCache<string>('key2', { namespace: 'ns2' })).toBeNull();
		expect(getCache<string>('key3')).toBeNull();
	});

	test('does not throw when clearing non-existent entry', () => {
		expect(() => clearCache('nonexistent', 'default')).not.toThrow();
	});

	test('does not throw when clearing non-existent namespace', () => {
		expect(() => clearCache(undefined, 'nonexistent')).not.toThrow();
	});

	test('does not throw when clearing empty cache', () => {
		expect(() => clearCache()).not.toThrow();
	});
});

describe('isCacheValid', () => {
	test('returns true for non-expired entry', () => {
		const entry: CacheEntry<string> = {
			key: 'test',
			data: 'value',
			createdAt: Date.now(),
			expiresAt: Date.now() + 10000 // 10 seconds from now
		};

		expect(isCacheValid(entry)).toBe(true);
	});

	test('returns false for expired entry', () => {
		const entry: CacheEntry<string> = {
			key: 'test',
			data: 'value',
			createdAt: Date.now() - 20000,
			expiresAt: Date.now() - 10000 // 10 seconds ago
		};

		expect(isCacheValid(entry)).toBe(false);
	});
});

describe('getCacheStatus', () => {
	test('returns empty array when no cache exists', () => {
		const status = getCacheStatus();
		expect(status).toEqual([]);
	});

	test('returns status for cached entries', () => {
		setCache('key1', 'value1', { namespace: 'ns1' });
		setCache('key2', 'value2', { namespace: 'ns2' });

		const status = getCacheStatus();
		expect(status.length).toBe(2);

		const keys = status.map(s => s.key).sort();
		expect(keys).toEqual(['key1', 'key2']);

		const namespaces = status.map(s => s.namespace).sort();
		expect(namespaces).toEqual(['ns1', 'ns2']);
	});

	test('includes size and expiration information', () => {
		setCache('test-key', 'test-value', { ttl: 600 });

		const status = getCacheStatus();
		expect(status.length).toBe(1);

		const entry = status[0];
		expect(entry.key).toBe('test-key');
		expect(entry.size).toBeGreaterThan(0);
		expect(entry.expiresAt).toBeGreaterThan(Date.now());
		expect(entry.namespace).toBe('default');
	});

	test('skips corrupted cache files', () => {
		// Create valid cache entry
		setCache('valid-key', 'valid-value');

		// Create corrupted cache file
		const namespaceDir = join(getCacheDir(), 'default');
		const corruptedFile = join(namespaceDir, 'corrupted.json');
		writeFileSync(corruptedFile, 'invalid json', 'utf-8');

		const status = getCacheStatus();

		// Should only include valid entry
		expect(status.length).toBe(1);
		expect(status[0].key).toBe('valid-key');
	});
});

describe('getCacheFilePath', () => {
	test('generates consistent hash-based paths', () => {
		const path1 = getCacheFilePath('test-key', 'default');
		const path2 = getCacheFilePath('test-key', 'default');

		expect(path1).toBe(path2);
	});

	test('generates different paths for different keys', () => {
		const path1 = getCacheFilePath('key1', 'default');
		const path2 = getCacheFilePath('key2', 'default');

		expect(path1).not.toBe(path2);
	});

	test('generates different paths for different namespaces', () => {
		const path1 = getCacheFilePath('test-key', 'ns1');
		const path2 = getCacheFilePath('test-key', 'ns2');

		expect(path1).not.toBe(path2);
	});

	test('uses default namespace when not specified', () => {
		const path1 = getCacheFilePath('test-key');
		const path2 = getCacheFilePath('test-key', 'default');

		expect(path1).toBe(path2);
	});
});

describe('expired entry cleanup', () => {
	test('automatically deletes expired entries on get', () => {
		setCache('test-key', 'test-value', { ttl: 1 });
		const filePath = getCacheFilePath('test-key', 'default');

		// File should exist
		expect(existsSync(filePath)).toBe(true);

		// Wait for expiration
		const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
		return sleep(1100).then(() => {
			// Get should return null and delete file
			expect(getCache<string>('test-key')).toBeNull();
			expect(existsSync(filePath)).toBe(false);
		});
	});
});

describe('large cache entries', () => {
	test('handles large data objects', () => {
		// Create large object (1000 items)
		const largeData = Array.from({ length: 1000 }, (_, i) => ({
			id: i,
			name: `Item ${i}`,
			description: 'A'.repeat(100)
		}));

		setCache('large-key', largeData);
		const retrieved = getCache<typeof largeData>('large-key');

		expect(retrieved).toEqual(largeData);
		expect(retrieved?.length).toBe(1000);
	});

	test('reports size accurately for large entries', () => {
		const largeData = Array.from({ length: 100 }, (_, i) => ({
			id: i,
			data: 'X'.repeat(1000)
		}));

		setCache('large-key', largeData);
		const status = getCacheStatus();

		expect(status.length).toBe(1);
		// Size should be substantial (>100KB)
		expect(status[0].size).toBeGreaterThan(100000);
	});
});
