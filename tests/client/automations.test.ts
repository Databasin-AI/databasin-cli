/**
 * Tests for Automations API Client
 *
 * Verifies:
 * - Null handling when no projectId provided
 * - Proper parameter passing for filters
 * - All CRUD operations
 * - Run endpoint behavior
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AutomationsClient } from '../../src/client/automations.ts';
import type { Automation } from '../../src/types/api.ts';

/**
 * Mock client for testing (extends base with mock fetch)
 */
class MockAutomationsClient extends AutomationsClient {
	public lastRequest: {
		method: string;
		endpoint: string;
		body?: unknown;
		params?: Record<string, string | number | boolean>;
	} | null = null;

	// Override request to capture calls without hitting network
	protected async request<T>(
		method: string,
		endpoint: string,
		body?: unknown,
		options?: any
	): Promise<T> {
		this.lastRequest = {
			method,
			endpoint,
			body,
			params: options?.params
		};

		// Simulate API responses
		if (method === 'GET' && endpoint === '/api/automations') {
			if (!options?.params?.internalID) {
				return null as T;
			}
			return [
				{
					automationID: 1,
					internalID: 'auto1',
					automationName: 'Daily ETL',
					isActive: true
				}
			] as T;
		}

		if (method === 'GET' && endpoint.startsWith('/api/automations/')) {
			return {
				automationID: 1,
				internalID: 'auto1',
				institutionID: 1,
				automationName: 'Daily ETL',
				isActive: true
			} as T;
		}

		if (method === 'POST' && endpoint === '/api/automations') {
			return {
				...body,
				automationID: 1,
				internalID: 'auto1'
			} as T;
		}

		if (method === 'PUT') {
			return {
				automationID: 1,
				...body
			} as T;
		}

		if (method === 'DELETE') {
			return undefined as T;
		}

		if (method === 'POST' && endpoint.includes('/run')) {
			return {
				status: 'started',
				jobId: 'job123'
			} as T;
		}

		return {} as T;
	}
}

describe('AutomationsClient', () => {
	let client: MockAutomationsClient;

	beforeEach(() => {
		client = new MockAutomationsClient();
	});

	describe('list()', () => {
		it('should throw ValidationError when no projectId provided', async () => {
			await expect(client.list()).rejects.toThrow('Project ID is required for listing automations');
		});

		it('should pass projectId as internalID parameter', async () => {
			await client.list('N1r8Do');

			expect(client.lastRequest).toBeDefined();
			expect(client.lastRequest?.params?.internalID).toBe('N1r8Do');
		});

		it('should pass active filter when provided', async () => {
			await client.list('N1r8Do', { active: true });

			expect(client.lastRequest?.params?.active).toBe(true);
		});

		it('should pass running filter when provided', async () => {
			await client.list('N1r8Do', { running: false });

			expect(client.lastRequest?.params?.running).toBe(false);
		});

		it('should pass sort options when provided', async () => {
			await client.list('N1r8Do', {
				sortBy: 'automationName',
				sortOrder: 'asc'
			});

			expect(client.lastRequest?.params?.sortBy).toBe('automationName');
			expect(client.lastRequest?.params?.sortOrder).toBe('asc');
		});
	});

	describe('getById()', () => {
		it('should call correct endpoint with ID', async () => {
			await client.getById('auto123');

			expect(client.lastRequest?.method).toBe('GET');
			expect(client.lastRequest?.endpoint).toBe('/api/automations/auto123');
		});
	});

	describe('create()', () => {
		it('should POST to correct endpoint with data', async () => {
			const data = {
				automationName: 'Test Automation',
				jobRunSchedule: '0 2 * * *',
				isActive: true
			};

			await client.create(data);

			expect(client.lastRequest?.method).toBe('POST');
			expect(client.lastRequest?.endpoint).toBe('/api/automations');
			expect(client.lastRequest?.body).toEqual(data);
		});
	});

	describe('update()', () => {
		it('should PUT to correct endpoint with data', async () => {
			const data = {
				automationName: 'Updated Name',
				isActive: false
			};

			await client.update('auto123', data);

			expect(client.lastRequest?.method).toBe('PUT');
			expect(client.lastRequest?.endpoint).toBe('/api/automations/auto123');
			expect(client.lastRequest?.body).toEqual(data);
		});
	});

	describe('deleteById()', () => {
		it('should DELETE correct endpoint', async () => {
			await client.deleteById('auto123');

			expect(client.lastRequest?.method).toBe('DELETE');
			expect(client.lastRequest?.endpoint).toBe('/api/automations/auto123');
		});
	});

	describe('run()', () => {
		it('should POST to run endpoint with correct body', async () => {
			const result = await client.run('1');

			expect(client.lastRequest?.method).toBe('POST');
			expect(client.lastRequest?.endpoint).toBe('/api/automations/run');
			expect(client.lastRequest?.body).toEqual({
				automationID: 1,
				institutionID: 1,
				internalID: 'auto1'
			});
			expect(result.status).toBe('started');
			expect(result.jobId).toBe('job123');
		});
	});
});
