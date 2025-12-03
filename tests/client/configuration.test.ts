/**
 * Unit tests for ConfigurationClient
 *
 * Tests configuration fetching, caching, and error handling
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigurationClient } from '../../src/client/configuration.ts';
import type {
	ConnectorConfiguration,
	ConnectorTypeConfiguration,
	PipelineScreenConfiguration
} from '../../src/types/api.ts';

/**
 * Mock connector configuration data
 */
const mockRDBMSConfig: ConnectorTypeConfiguration = {
	connectorType: 'RDBMS',
	id: 1,
	availableConnectors: [
		{
			connectorName: 'Postgres',
			connectorImageURI: 'https://example.com/postgres.png',
			connectorRequiredFields: [1, 2, 3, 4],
			connectorOptionalFields: [1, 2],
			connectorAuthTypes: [2],
			pipelineRequiredScreens: [6, 7, 2, 3, 4, 5],
			pipelineRequiredFields: [1, 2, 12, 13, 3, 4, 5, 6, 7],
			pipelineOptionalFields: [1, 2, 3],
			ingressTargetSupport: true,
			egressTargetSupport: true,
			testConnectorSupport: true,
			active: true
		},
		{
			connectorName: 'MySQL',
			connectorImageURI: 'https://example.com/mysql.png',
			connectorRequiredFields: [1, 2, 3, 4],
			connectorOptionalFields: [1, 2],
			connectorAuthTypes: [2],
			pipelineRequiredScreens: [1, 2, 3, 4, 5],
			pipelineRequiredFields: [1, 2, 3, 4, 5, 6, 7],
			pipelineOptionalFields: [1, 2, 3],
			ingressTargetSupport: true,
			egressTargetSupport: true,
			testConnectorSupport: true,
			active: true
		}
	]
};

const mockFileAPIConfig: ConnectorTypeConfiguration = {
	connectorType: 'File & API',
	id: 3,
	availableConnectors: [
		{
			connectorName: 'Amazon S3',
			connectorImageURI: 'https://example.com/s3.png',
			connectorRequiredFields: [1, 10],
			connectorOptionalFields: [],
			connectorAuthTypes: [7],
			pipelineRequiredScreens: [2, 4, 5],
			pipelineRequiredFields: [1, 11, 2, 3, 5, 7, 8, 9, 10, 14, 15],
			pipelineOptionalFields: [1, 2, 3, 21, 22],
			ingressTargetSupport: true,
			egressTargetSupport: true,
			testConnectorSupport: false,
			active: true
		}
	]
};

const mockPipelineScreens: PipelineScreenConfiguration = {
	pipelineRequiredScreens: [
		{
			screenID: 1,
			screenName: 'Catalogs',
			helpText: 'Please choose a database/schema',
			screenType: 'static',
			apiRouteURI: '/api/connector/catalogs/{connectorID}',
			active: true
		},
		{
			screenID: 2,
			screenName: 'Artifacts',
			helpText: 'Please select the objects',
			screenType: 'static',
			apiRouteURI: '/api/connector/tables/{connectorID}',
			active: true
		},
		{
			screenID: 6,
			screenName: 'Database',
			helpText: 'Please choose a database/catalog',
			screenType: 'static',
			apiRouteURI: '/api/v2/connector/catalogs/{connectorID}',
			active: true
		},
		{
			screenID: 7,
			screenName: 'Schemas',
			helpText: 'Please choose a schema',
			screenType: 'static',
			apiRouteURI: '/api/v2/connector/schemas/{connectorID}',
			active: true
		}
	]
};

describe('ConfigurationClient', () => {
	let client: ConfigurationClient;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		client = new ConfigurationClient();

		// Mock fetch to return our test data
		originalFetch = globalThis.fetch;
		globalThis.fetch = async (url: string | URL | Request) => {
			const urlString = typeof url === 'string' ? url : url.toString();

			if (urlString.includes('DatabasinConnectorRDBMS.json')) {
				return new Response(JSON.stringify(mockRDBMSConfig), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (urlString.includes('DatabasinConnectorFileAPI.json')) {
				return new Response(JSON.stringify(mockFileAPIConfig), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (urlString.includes('FlowbasinPipelineScreens.json')) {
				return new Response(JSON.stringify(mockPipelineScreens), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// Return 404 for other files
			return new Response('Not Found', { status: 404 });
		};
	});

	test('fetches Postgres connector configuration', async () => {
		const config = await client.getConnectorConfiguration('Postgres');

		expect(config.connectorName).toBe('Postgres');
		expect(config.category).toBe('RDBMS');
		expect(config.pipelineRequiredScreens).toEqual([6, 7, 2, 3, 4, 5]);
		expect(config.ingressTargetSupport).toBe(true);
		expect(config.egressTargetSupport).toBe(true);
		expect(config.testConnectorSupport).toBe(true);
	});

	test('fetches MySQL connector configuration', async () => {
		const config = await client.getConnectorConfiguration('MySQL');

		expect(config.connectorName).toBe('MySQL');
		expect(config.category).toBe('RDBMS');
		expect(config.pipelineRequiredScreens).toEqual([1, 2, 3, 4, 5]);
		expect(config.ingressTargetSupport).toBe(true);
	});

	test('fetches Amazon S3 connector configuration', async () => {
		const config = await client.getConnectorConfiguration('Amazon S3');

		expect(config.connectorName).toBe('Amazon S3');
		expect(config.category).toBe('File & API');
		expect(config.pipelineRequiredScreens).toEqual([2, 4, 5]);
		expect(config.testConnectorSupport).toBe(false);
	});

	test('caches connector configuration', async () => {
		// First fetch
		const config1 = await client.getConnectorConfiguration('Postgres');

		// Second fetch should use cache (no network call)
		const config2 = await client.getConnectorConfiguration('Postgres');

		expect(config1).toEqual(config2);
		expect(config1.connectorName).toBe('Postgres');
	});

	test('throws error for non-existent connector', async () => {
		try {
			await client.getConnectorConfiguration('NonExistent');
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			// Error message should indicate failure
			expect((error as Error).message).toBeTruthy();
		}
	});

	test('fetches pipeline screen configuration', async () => {
		const screens = await client.getPipelineScreenConfiguration();

		expect(screens.pipelineRequiredScreens).toHaveLength(4);
		expect(screens.pipelineRequiredScreens[0].screenName).toBe('Catalogs');
		expect(screens.pipelineRequiredScreens[1].screenName).toBe('Artifacts');
	});

	test('caches pipeline screen configuration', async () => {
		const screens1 = await client.getPipelineScreenConfiguration();
		const screens2 = await client.getPipelineScreenConfiguration();

		expect(screens1).toEqual(screens2);
	});

	test('clears cache', async () => {
		// Fetch to populate cache
		await client.getConnectorConfiguration('Postgres');

		// Clear cache
		client.clearCache();

		// Fetch again should work (cache was cleared)
		const config = await client.getConnectorConfiguration('Postgres');
		expect(config.connectorName).toBe('Postgres');
	});

	test('gets connector category', async () => {
		const category = await client.getConnectorCategory('Postgres');
		expect(category).toBe('RDBMS');
	});

	test('returns null for non-existent connector category', async () => {
		const category = await client.getConnectorCategory('NonExistent');
		expect(category).toBeNull();
	});

	test('gets all connectors', async () => {
		const connectors = await client.getAllConnectors();

		expect(connectors.length).toBeGreaterThan(0);
		expect(connectors.some((c) => c.connectorName === 'Postgres')).toBe(true);
		expect(connectors.some((c) => c.connectorName === 'MySQL')).toBe(true);
		expect(connectors.some((c) => c.connectorName === 'Amazon S3')).toBe(true);
	});

	test('filters only active connectors', async () => {
		const connectors = await client.getAllConnectors();

		connectors.forEach((connector) => {
			expect(connector.active).toBe(true);
		});
	});

	// Clean up
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});
});

describe('ConfigurationClient - Cache TTL', () => {
	let client: ConfigurationClient;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		client = new ConfigurationClient();

		// Mock fetch to return our test data
		originalFetch = globalThis.fetch;
		globalThis.fetch = async (url: string | URL | Request) => {
			const urlString = typeof url === 'string' ? url : url.toString();

			if (urlString.includes('DatabasinConnectorRDBMS.json')) {
				return new Response(JSON.stringify(mockRDBMSConfig), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (urlString.includes('FlowbasinPipelineScreens.json')) {
				return new Response(JSON.stringify(mockPipelineScreens), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			return new Response('Not Found', { status: 404 });
		};
	});

	test('Cache entry has TTL set', async () => {
		const config = await client.getConnectorConfiguration('Postgres');
		expect(config).toBeDefined();

		// Verify cache has the entry with correct TTL
		const stats = client.getCacheStats();
		expect(stats.entryCount).toBeGreaterThan(0);
		expect(stats.entries[0].ttlSeconds).toBe(300); // 5 minutes
		expect(stats.entries[0].expired).toBe(false);
	});

	test('Cache statistics shows correct TTL for multiple entries', async () => {
		await client.getConnectorConfiguration('MySQL');
		await client.getPipelineScreenConfiguration();

		const stats = client.getCacheStats();
		expect(stats.entryCount).toBe(2);
		expect(stats.entries.every((e) => e.ttlSeconds === 300)).toBe(true);
		expect(stats.entries.every((e) => !e.expired)).toBe(true);
	});

	test('Expired cache entries are detected in stats', () => {
		// Manually insert expired entry
		const expiredKey = 'test:expired';
		const fiveMinutesAgo = Date.now() - 6 * 60 * 1000; // 6 minutes ago (expired)

		// Access private cache directly for testing
		(client as any).cache.set(expiredKey, {
			data: { test: true },
			timestamp: fiveMinutesAgo,
			ttl: 5 * 60 * 1000 // 5 minute TTL
		});

		const stats = client.getCacheStats();
		const expiredEntry = stats.entries.find((e) => e.key === expiredKey);

		expect(expiredEntry).toBeDefined();
		expect(expiredEntry?.expired).toBe(true);
		expect(expiredEntry?.ageSeconds).toBeGreaterThan(300);
	});

	test('isCacheValid returns false for expired entries', () => {
		// Manually insert expired entry
		const expiredKey = 'test:expired';
		(client as any).cache.set(expiredKey, {
			data: { test: true },
			timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
			ttl: 5 * 60 * 1000 // 5 minute TTL
		});

		// isCacheValid should return false and remove the entry
		const isValid = (client as any).isCacheValid(expiredKey);
		expect(isValid).toBe(false);
		expect((client as any).cache.has(expiredKey)).toBe(false);
	});

	test('isCacheValid returns true for valid entries', async () => {
		await client.getConnectorConfiguration('Postgres');

		const cacheKey = 'connector:postgres';
		const isValid = (client as any).isCacheValid(cacheKey);

		expect(isValid).toBe(true);
		expect((client as any).cache.has(cacheKey)).toBe(true);
	});

	test('clearCache removes all entries and logs count', async () => {
		await client.getConnectorConfiguration('Postgres');
		await client.getPipelineScreenConfiguration();

		expect(client.getCacheStats().entryCount).toBeGreaterThan(0);

		client.clearCache();

		expect(client.getCacheStats().entryCount).toBe(0);
	});

	test('Cache miss returns fresh data', async () => {
		// First call should fetch from network
		const config1 = await client.getConnectorConfiguration('Postgres');
		expect(config1.connectorName).toBe('Postgres');

		// Clear cache to force miss
		client.clearCache();

		// Second call should fetch again (not from cache)
		const config2 = await client.getConnectorConfiguration('Postgres');
		expect(config2.connectorName).toBe('Postgres');
	});

	test('getCacheStats returns empty stats for empty cache', () => {
		const stats = client.getCacheStats();
		expect(stats.entryCount).toBe(0);
		expect(stats.entries).toEqual([]);
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});
});

describe('ConfigurationClient - Error Aggregation', () => {
	let client: ConfigurationClient;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		client = new ConfigurationClient();
		originalFetch = globalThis.fetch;
	});

	test('Clear error message when all files fail', async () => {
		// Mock fetch to fail all requests
		globalThis.fetch = async () => {
			return new Response('Network Error', { status: 500 });
		};

		try {
			await client.getConnectorConfiguration('TestConnector');
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			const message = (error as Error).message;

			// Should indicate all files failed
			expect(message).toContain('Failed to load any connector configuration files');
			expect(message).toContain('0/9 succeeded');
			expect(message).toContain('network issue');
			expect(message).toContain('permission problem');
			expect(message).toContain('Troubleshooting');
		}
	});

	test('Clear error message when some files fail', async () => {
		let callCount = 0;

		// Mock fetch to fail some requests
		globalThis.fetch = async (url: string | URL | Request) => {
			const urlString = typeof url === 'string' ? url : url.toString();
			callCount++;

			// Fail odd-numbered calls
			if (callCount % 2 === 1) {
				return new Response('Not Found', { status: 404 });
			}

			// Return empty connector list for even calls
			if (urlString.includes('RDBMS')) {
				return new Response(JSON.stringify(mockRDBMSConfig), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			return new Response(
				JSON.stringify({ connectorType: 'Test', id: 1, availableConnectors: [] }),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		};

		try {
			await client.getConnectorConfiguration('NonExistent');
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			const message = (error as Error).message;

			// Should indicate partial success
			expect(message).toContain('not found in any category');
			expect(message).toContain('succeeded');
			expect(message).toContain('failed');
			expect(message).toContain('Files that failed to load');
			expect(message).toContain('Troubleshooting');
		}
	});

	test('Clear error message when connector just not found', async () => {
		// Mock fetch to succeed but return empty connector lists
		globalThis.fetch = async (url: string | URL | Request) => {
			const urlString = typeof url === 'string' ? url : url.toString();

			// Extract category from URL
			const match = urlString.match(/Connector(\w+)\.json/);
			const category = match ? match[1] : 'Unknown';

			return new Response(
				JSON.stringify({
					connectorType: category,
					id: 1,
					availableConnectors: [] // Empty list - no connectors
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		};

		try {
			await client.getConnectorConfiguration('NonExistent');
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			const message = (error as Error).message;

			// Should indicate all files loaded successfully
			expect(message).toContain('not found in any category');
			expect(message).toContain('Searched all 9 category files successfully');
			expect(message).not.toContain('failed');
			expect(message).toContain('Misspelled');
			expect(message).toContain('Inactive');
			expect(message).toContain('Available categories searched');
		}
	});

	test('Error details include file paths and error messages', async () => {
		const failureMessage = 'Custom network timeout';

		// Mock fetch to fail all with custom message
		globalThis.fetch = async () => {
			throw new Error(failureMessage);
		};

		try {
			await client.getConnectorConfiguration('TestConnector');
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			const message = (error as Error).message;

			// Should include the custom error message
			expect(message).toContain(failureMessage);

			// Should include at least one file path
			expect(message).toContain('DatabasinConnector');
			expect(message).toContain('.json');
		}
	});

	test('Successful load after partial failures', async () => {
		// Mock fetch: first file (RDBMS) succeeds, others fail
		globalThis.fetch = async (url: string | URL | Request) => {
			const urlString = typeof url === 'string' ? url : url.toString();

			// RDBMS file succeeds (contains Postgres)
			if (urlString.includes('RDBMS')) {
				return new Response(JSON.stringify(mockRDBMSConfig), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// All other files fail
			return new Response('Not Found', { status: 404 });
		};

		// Should successfully find Postgres despite other file failures
		const config = await client.getConnectorConfiguration('Postgres');
		expect(config.connectorName).toBe('Postgres');
		expect(config.category).toBe('RDBMS');
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});
});
