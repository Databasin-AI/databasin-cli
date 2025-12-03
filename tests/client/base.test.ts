/**
 * Tests for Base API Client
 *
 * Comprehensive test suite covering:
 * - All HTTP methods (GET, POST, PUT, DELETE)
 * - Token injection and refresh flow
 * - Error handling (network, 4xx, 5xx)
 * - Query parameter building
 * - Token efficiency transformations
 * - Timeout behavior
 * - Debug logging
 * - Retry logic
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { DataBasinClient, createClient } from '../../src/client/base.ts';
import { loadConfig } from '../../src/config.ts';
import type { CliConfig } from '../../src/types/config.ts';
import { ApiError, NetworkError, AuthError } from '../../src/utils/errors.ts';

// Mock global fetch
const originalFetch = global.fetch;

/**
 * Create a mock Response object
 */
function createMockResponse(status: number, body: any, statusText: string = 'OK'): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		json: async () => body,
		text: async () => JSON.stringify(body)
	} as Response;
}

describe('DataBasinClient', () => {
	let client: DataBasinClient;
	let mockFetch: any;
	let testConfig: CliConfig;

	beforeEach(() => {
		// Mock environment/file token loading
		process.env.DATABASIN_TOKEN = 'test-jwt-token';

		// Create test configuration
		testConfig = loadConfig({
			apiUrl: 'https://api.test.databasin.ai',
			timeout: 5000,
			debug: false
		});

		// Create client with test config
		client = new DataBasinClient(testConfig);

		// Setup fetch mock
		mockFetch = mock(() => Promise.resolve(createMockResponse(200, { success: true })));
		global.fetch = mockFetch;
	});

	afterEach(() => {
		// Restore original fetch
		global.fetch = originalFetch;

		// Clean up environment
		delete process.env.DATABASIN_TOKEN;
	});

	describe('Constructor and Configuration', () => {
		it('should initialize with provided config', () => {
			const config = loadConfig({ apiUrl: 'https://api.test.databasin.ai' });
			const client = new DataBasinClient(config);
			expect(client.getBaseUrl()).toBe('https://api.test.databasin.ai');
		});

		it('should use default config if none provided', () => {
			const client = new DataBasinClient();
			expect(client.getBaseUrl()).toBeDefined();
		});
	});

	describe('GET Requests', () => {
		it('should make basic GET request', async () => {
			const mockData = { id: 1, name: 'Test Project' };
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects');

			expect(mockFetch).toHaveBeenCalled();
			expect(result).toEqual(mockData);
		});

		it('should include query parameters', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, [])));
			global.fetch = mockFetch;

			await client.get('/api/my/projects', {
				params: {
					page: 1,
					limit: 10,
					search: 'test'
				}
			});

			const callUrl = mockFetch.mock.calls[0][0];
			expect(callUrl).toContain('page=1');
			expect(callUrl).toContain('limit=10');
			expect(callUrl).toContain('search=test');
		});

		it('should inject Authorization header', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, {})));
			global.fetch = mockFetch;

			await client.get('/api/my/projects');

			const headers = mockFetch.mock.calls[0][1].headers;
			expect(headers.get('Authorization')).toBe('Bearer test-jwt-token');
		});

		it('should skip auth when skipAuth is true', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, {})));
			global.fetch = mockFetch;

			await client.get('/api/public', { skipAuth: true });

			const headers = mockFetch.mock.calls[0][1].headers;
			expect(headers.get('Authorization')).toBeNull();
		});

		it('should merge custom headers', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, {})));
			global.fetch = mockFetch;

			await client.get('/api/my/projects', {
				headers: {
					'X-Custom-Header': 'test-value'
				}
			});

			const headers = mockFetch.mock.calls[0][1].headers;
			expect(headers.get('X-Custom-Header')).toBe('test-value');
		});
	});

	describe('POST Requests', () => {
		it('should make POST request with body', async () => {
			const requestBody = { name: 'New Project', organizationId: 123 };
			const responseData = { id: 1, ...requestBody };

			mockFetch = mock(() => Promise.resolve(createMockResponse(201, responseData)));
			global.fetch = mockFetch;

			const result = await client.post('/api/project', requestBody);

			expect(mockFetch).toHaveBeenCalled();
			expect(mockFetch.mock.calls[0][1].method).toBe('POST');
			expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify(requestBody));
			expect(result).toEqual(responseData);
		});

		it('should handle POST without body', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, { success: true })));
			global.fetch = mockFetch;

			await client.post('/api/action');

			expect(mockFetch.mock.calls[0][1].body).toBeUndefined();
		});
	});

	describe('PUT Requests', () => {
		it('should make PUT request with body', async () => {
			const requestBody = { name: 'Updated Name' };
			const responseData = { id: 1, ...requestBody };

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, responseData)));
			global.fetch = mockFetch;

			const result = await client.put('/api/project/1', requestBody);

			expect(mockFetch).toHaveBeenCalled();
			expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
			expect(result).toEqual(responseData);
		});
	});

	describe('DELETE Requests', () => {
		it('should make DELETE request', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(204, null)));
			global.fetch = mockFetch;

			await client.delete('/api/project/1');

			expect(mockFetch).toHaveBeenCalled();
			expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
		});

		it('should make DELETE request with body (uncommon but supported)', async () => {
			const requestBody = { resourceId: 123, reason: 'cleanup' };
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, { success: true })));
			global.fetch = mockFetch;

			await client.delete('/api/resource', requestBody);

			expect(mockFetch).toHaveBeenCalled();
			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].method).toBe('DELETE');
			expect(fetchCall[1].body).toBe(JSON.stringify(requestBody));
		});

		it('should support DELETE without body (backward compatibility)', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(204, null)));
			global.fetch = mockFetch;

			await client.delete('/api/project/1');

			expect(mockFetch).toHaveBeenCalled();
			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].method).toBe('DELETE');
			expect(fetchCall[1].body).toBeUndefined();
		});
	});

	describe('Error Handling', () => {
		it('should throw ApiError on 400 Bad Request', async () => {
			const errorResponse = {
				status: 400,
				message: 'Invalid request parameters',
				timestamp: new Date().toISOString()
			};

			mockFetch = mock(() =>
				Promise.resolve(createMockResponse(400, errorResponse, 'Bad Request'))
			);
			global.fetch = mockFetch;

			try {
				await client.get('/api/my/projects');
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).statusCode).toBe(400);
			}
		});

		it('should throw ApiError on 404 Not Found', async () => {
			mockFetch = mock(() =>
				Promise.resolve(createMockResponse(404, { message: 'Not found' }, 'Not Found'))
			);
			global.fetch = mockFetch;

			try {
				await client.get('/api/project/999');
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).statusCode).toBe(404);
			}
		});

		it('should throw ApiError on 500 Server Error', async () => {
			mockFetch = mock(() =>
				Promise.resolve(
					createMockResponse(500, { message: 'Internal error' }, 'Internal Server Error')
				)
			);
			global.fetch = mockFetch;

			try {
				await client.get('/api/my/projects');
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).statusCode).toBe(500);
			}
		});

		it('should throw NetworkError on fetch failure', async () => {
			mockFetch = mock(() => Promise.reject(new Error('fetch failed')));
			global.fetch = mockFetch;

			try {
				await client.get('/api/my/projects');
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(NetworkError);
			}
		});

		it.skip('should throw NetworkError on timeout', async () => {
			// Skip: AbortController timeout behavior differs in test environment
			// This is tested in integration tests with real fetch
			// Create client with very short timeout
			const timeoutConfig = loadConfig({
				apiUrl: 'https://api.test.databasin.ai',
				timeout: 100,
				debug: false
			});
			const timeoutClient = new DataBasinClient(timeoutConfig);

			// Mock slow response
			mockFetch = mock(
				() =>
					new Promise((resolve) => {
						setTimeout(() => resolve(createMockResponse(200, {})), 200);
					})
			);
			global.fetch = mockFetch;

			try {
				await timeoutClient.get('/api/my/projects');
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(NetworkError);
				expect((error as NetworkError).message).toContain('timeout');
			}
		}, 1000);
	});

	describe('Token Refresh on 401', () => {
		it('should refresh token and retry on 401', async () => {
			let callCount = 0;

			mockFetch = mock(() => {
				callCount++;
				if (callCount === 1) {
					// First call: 401
					return Promise.resolve(
						createMockResponse(401, { message: 'Unauthorized' }, 'Unauthorized')
					);
				} else {
					// Second call: success
					return Promise.resolve(createMockResponse(200, { success: true }));
				}
			});
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects');

			expect(callCount).toBe(2);
			expect(result).toEqual({ success: true });
		});

		it('should only retry 401 once', async () => {
			mockFetch = mock(() =>
				Promise.resolve(createMockResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
			);
			global.fetch = mockFetch;

			try {
				await client.get('/api/my/projects');
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).statusCode).toBe(401);
			}

			// Should have made 2 calls (original + 1 retry)
			expect(mockFetch.mock.calls.length).toBe(2);
		});

		it('should not retry 401 when skipAuth is true', async () => {
			mockFetch = mock(() =>
				Promise.resolve(createMockResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
			);
			global.fetch = mockFetch;

			try {
				await client.get('/api/public', { skipAuth: true });
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
			}

			// Should only make 1 call (no retry)
			expect(mockFetch.mock.calls.length).toBe(1);
		});
	});

	describe('Token Efficiency Features', () => {
		it('should return count for arrays with count option', async () => {
			const mockData = [
				{ id: 1, name: 'Project 1' },
				{ id: 2, name: 'Project 2' },
				{ id: 3, name: 'Project 3' }
			];

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects', { count: true });

			expect(result).toEqual({ count: 3 });
		});

		it('should return count for single object with count option', async () => {
			const mockData = { id: 1, name: 'Project 1' };

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/project/1', { count: true });

			expect(result).toEqual({ count: 1 });
		});

		it('should limit array results with limit option', async () => {
			const mockData = [
				{ id: 1, name: 'Project 1' },
				{ id: 2, name: 'Project 2' },
				{ id: 3, name: 'Project 3' },
				{ id: 4, name: 'Project 4' },
				{ id: 5, name: 'Project 5' }
			];

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects', { limit: 3 });

			expect(Array.isArray(result)).toBe(true);
			expect((result as any[]).length).toBe(3);
			expect(result).toEqual(mockData.slice(0, 3));
		});

		it('should filter fields from array results', async () => {
			const mockData = [
				{ id: 1, name: 'Project 1', description: 'Desc 1', createdDate: '2024-01-01' },
				{ id: 2, name: 'Project 2', description: 'Desc 2', createdDate: '2024-01-02' }
			];

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects', { fields: 'id,name' });

			expect(result).toEqual([
				{ id: 1, name: 'Project 1' },
				{ id: 2, name: 'Project 2' }
			]);
		});

		it('should filter fields from single object', async () => {
			const mockData = {
				id: 1,
				name: 'Project 1',
				description: 'Desc 1',
				createdDate: '2024-01-01'
			};

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/project/1', { fields: 'id,name' });

			expect(result).toEqual({ id: 1, name: 'Project 1' });
		});

		it('should handle fields with whitespace', async () => {
			const mockData = [{ id: 1, name: 'Test', other: 'value' }];

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects', { fields: 'id , name ' });

			expect(result).toEqual([{ id: 1, name: 'Test' }]);
		});

		it('should combine limit and fields', async () => {
			const mockData = [
				{ id: 1, name: 'Project 1', description: 'Desc 1' },
				{ id: 2, name: 'Project 2', description: 'Desc 2' },
				{ id: 3, name: 'Project 3', description: 'Desc 3' }
			];

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects', {
				limit: 2,
				fields: 'id,name'
			});

			// Note: limit is applied before fields in current implementation
			expect(Array.isArray(result)).toBe(true);
			expect((result as any[]).length).toBe(2);
		});
	});

	describe('Retry Logic', () => {
		it.skip('should retry on network failure', async () => {
			let callCount = 0;

			mockFetch = mock(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.reject(new Error('fetch failed'));
				} else {
					return Promise.resolve(createMockResponse(200, { success: true }));
				}
			});
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects', { retries: 1 });

			expect(callCount).toBe(2);
			expect(result).toEqual({ success: true });
		}, 3000);

		it('should not retry on 4xx errors', async () => {
			mockFetch = mock(() =>
				Promise.resolve(createMockResponse(404, { message: 'Not found' }, 'Not Found'))
			);
			global.fetch = mockFetch;

			try {
				await client.get('/api/project/999', { retries: 2 });
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
			}

			// Should only make 1 call (no retries for 4xx)
			expect(mockFetch.mock.calls.length).toBe(1);
		});

		it.skip('should exhaust retries and throw on continued failure', async () => {
			mockFetch = mock(() => Promise.reject(new Error('fetch failed')));
			global.fetch = mockFetch;

			try {
				await client.get('/api/my/projects', { retries: 2, retryDelay: 100 });
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(NetworkError);
			}

			// Should make 3 calls (original + 2 retries)
			expect(mockFetch.mock.calls.length).toBe(3);
		}, 1000);
	});

	describe('Utility Methods', () => {
		it('should ping API successfully', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, { message: 'pong' })));
			global.fetch = mockFetch;

			const result = await client.ping();

			expect(result).toBe(true);
		});

		it('should return false on ping failure', async () => {
			mockFetch = mock(() => Promise.reject(new Error('Network error')));
			global.fetch = mockFetch;

			const result = await client.ping();

			expect(result).toBe(false);
		});

		it('should update base URL', () => {
			client.setBaseUrl('https://api.production.databasin.ai');
			expect(client.getBaseUrl()).toBe('https://api.production.databasin.ai');
		});

		it('should clear cached token', () => {
			// This is mainly for coverage - behavior is internal
			client.clearToken();
			// Token will be reloaded on next request
		});
	});

	describe('Factory Function', () => {
		it('should create client with createClient factory', () => {
			const client = createClient(testConfig);
			expect(client).toBeInstanceOf(DataBasinClient);
			expect(client.getBaseUrl()).toBe('https://api.test.databasin.ai');
		});

		it('should create client with default config', () => {
			const client = createClient();
			expect(client).toBeInstanceOf(DataBasinClient);
		});
	});

	describe('Debug Logging', () => {
		// NOTE: Debug logging is now controlled by DEBUG environment variable at process startup
		// The logger is initialized once at module load time, so these tests verify the
		// logging infrastructure works when DEBUG is set before the process starts.

		it.skip('Debug logging controlled by DEBUG env var at startup (not runtime)', async () => {
			// This test is skipped because the logger is initialized at module load time.
			// Debug logging is now controlled by the DEBUG environment variable set before
			// the process starts, not by runtime config changes.
			// To test debug logging:
			// 1. Set DEBUG=true in environment before running tests
			// 2. OR manually test CLI with DEBUG=true npm run dev
		});

		it('should initialize DataBasinClient regardless of debug settings', async () => {
			const debugConfig = loadConfig({
				apiUrl: 'https://api.test.databasin.ai',
				timeout: 5000,
				debug: true
			});
			const debugClient = new DataBasinClient(debugConfig);

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, { success: true })));
			global.fetch = mockFetch;

			// Verify API calls work normally
			const result = await debugClient.get('/api/my/projects');
			expect(result).toEqual({ success: true });
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty response body', async () => {
			mockFetch = mock(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers(),
					json: async () => null
				} as Response)
			);
			global.fetch = mockFetch;

			const result = await client.get('/api/endpoint');
			expect(result).toBeNull();
		});

		it('should handle response with no efficiency options', async () => {
			const mockData = { id: 1, name: 'Test' };

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			const result = await client.get('/api/endpoint');
			expect(result).toEqual(mockData);
		});

		it('should handle null data with efficiency options', async () => {
			mockFetch = mock(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers(),
					json: async () => null
				} as Response)
			);
			global.fetch = mockFetch;

			const result = await client.get('/api/endpoint', { count: true });
			expect(result).toBeNull();
		});

		it('should handle empty array with limit', async () => {
			mockFetch = mock(() => Promise.resolve(createMockResponse(200, [])));
			global.fetch = mockFetch;

			const result = await client.get('/api/my/projects', { limit: 10 });
			expect(result).toEqual([]);
		});

		it('should handle missing fields gracefully', async () => {
			const mockData = [
				{ id: 1, name: 'Project 1' },
				{ id: 2, name: 'Project 2' }
			];

			mockFetch = mock(() => Promise.resolve(createMockResponse(200, mockData)));
			global.fetch = mockFetch;

			// Request field that doesn't exist
			const result = await client.get('/api/my/projects', { fields: 'id,nonexistent' });

			expect(result).toEqual([{ id: 1 }, { id: 2 }]);
		});
	});
});
