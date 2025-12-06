/**
 * Project ID Mapper Tests
 *
 * Tests the project ID mapping utility that converts numeric IDs to internal IDs.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
	isNumericId,
	resolveProjectId,
	resolveProjectIds,
	validateProjectId,
	clearProjectsCache
} from '../../src/utils/project-id-mapper';
import type { ProjectsClient } from '../../src/client/projects';
import type { Project } from '../../src/types/api';

// Mock project data
const mockProjects: Project[] = [
	{
		id: 123,
		internalId: 'N1r8Do',
		name: 'Test Project 1',
		description: 'First test project',
		institutionId: 1,
		organizationName: 'Test Org',
		createdDate: '2024-01-01T00:00:00Z',
		deleted: false
	},
	{
		id: 456,
		internalId: 'XyZ9Kl',
		name: 'Test Project 2',
		description: 'Second test project',
		institutionId: 1,
		organizationName: 'Test Org',
		createdDate: '2024-01-02T00:00:00Z',
		deleted: false
	},
	{
		id: 789,
		internalId: 'AbC3Fg',
		name: 'Test Project 3',
		description: 'Third test project',
		institutionId: 2,
		organizationName: 'Other Org',
		createdDate: '2024-01-03T00:00:00Z',
		deleted: false
	}
];

// Create a mock ProjectsClient
function createMockProjectsClient(): ProjectsClient {
	return {
		list: mock(async () => mockProjects)
	} as unknown as ProjectsClient;
}

describe('isNumericId', () => {
	it('should identify numeric IDs', () => {
		expect(isNumericId('123')).toBe(true);
		expect(isNumericId('456')).toBe(true);
		expect(isNumericId('0')).toBe(true);
		expect(isNumericId('999999')).toBe(true);
	});

	it('should identify non-numeric IDs', () => {
		expect(isNumericId('N1r8Do')).toBe(false);
		expect(isNumericId('XyZ9Kl')).toBe(false);
		expect(isNumericId('abc')).toBe(false);
		expect(isNumericId('123abc')).toBe(false);
		expect(isNumericId('abc123')).toBe(false);
	});

	it('should handle edge cases', () => {
		expect(isNumericId('')).toBe(false);
		expect(isNumericId(' ')).toBe(false);
		expect(isNumericId('12.34')).toBe(false);
		expect(isNumericId('-123')).toBe(false);
		expect(isNumericId('+123')).toBe(false);
	});
});

describe('resolveProjectId', () => {
	let client: ProjectsClient;

	beforeEach(() => {
		client = createMockProjectsClient();
		clearProjectsCache(); // Clear cache before each test
	});

	it('should resolve numeric ID to internal ID', async () => {
		const result = await resolveProjectId('123', client);
		expect(result).toBe('N1r8Do');
	});

	it('should resolve different numeric IDs correctly', async () => {
		const result1 = await resolveProjectId('123', client);
		expect(result1).toBe('N1r8Do');

		const result2 = await resolveProjectId('456', client);
		expect(result2).toBe('XyZ9Kl');

		const result3 = await resolveProjectId('789', client);
		expect(result3).toBe('AbC3Fg');
	});

	it('should return internal ID as-is when already internal format', async () => {
		const result = await resolveProjectId('N1r8Do', client);
		expect(result).toBe('N1r8Do');
	});

	it('should return non-numeric IDs as-is', async () => {
		const result1 = await resolveProjectId('XyZ9Kl', client);
		expect(result1).toBe('XyZ9Kl');

		const result2 = await resolveProjectId('SomeId', client);
		expect(result2).toBe('SomeId');
	});

	it('should return original ID when numeric ID has no match', async () => {
		const result = await resolveProjectId('999', client);
		expect(result).toBe('999'); // No match, returns original
	});

	it('should use cache on subsequent calls', async () => {
		// First call - should fetch from API
		await resolveProjectId('123', client);

		// Second call - should use cache (verify by checking mock call count)
		await resolveProjectId('456', client);

		// Should only call API once (cache used for second call)
		expect(client.list).toHaveBeenCalledTimes(1);
	});

	it('should bypass cache when useCache is false', async () => {
		// First call with cache
		await resolveProjectId('123', client, { useCache: true });

		// Second call bypassing cache
		await resolveProjectId('456', client, { useCache: false });

		// Should call API twice (once for each)
		expect(client.list).toHaveBeenCalledTimes(2);
	});
});

describe('resolveProjectIds', () => {
	let client: ProjectsClient;

	beforeEach(() => {
		client = createMockProjectsClient();
		clearProjectsCache();
	});

	it('should resolve multiple numeric IDs', async () => {
		const result = await resolveProjectIds(['123', '456', '789'], client);
		expect(result).toEqual(['N1r8Do', 'XyZ9Kl', 'AbC3Fg']);
	});

	it('should handle mixed numeric and internal IDs', async () => {
		const result = await resolveProjectIds(['123', 'XyZ9Kl', '789'], client);
		expect(result).toEqual(['N1r8Do', 'XyZ9Kl', 'AbC3Fg']);
	});

	it('should preserve order', async () => {
		const result = await resolveProjectIds(['789', '123', '456'], client);
		expect(result).toEqual(['AbC3Fg', 'N1r8Do', 'XyZ9Kl']);
	});

	it('should handle empty array', async () => {
		const result = await resolveProjectIds([], client);
		expect(result).toEqual([]);
	});

	it('should handle IDs with no match', async () => {
		const result = await resolveProjectIds(['123', '999', '456'], client);
		expect(result).toEqual(['N1r8Do', '999', 'XyZ9Kl']);
	});

	it('should only call API once for batch resolution', async () => {
		await resolveProjectIds(['123', '456', '789'], client);

		// Should call API only once even for multiple IDs
		expect(client.list).toHaveBeenCalledTimes(1);
	});
});

describe('validateProjectId', () => {
	let client: ProjectsClient;

	beforeEach(() => {
		client = createMockProjectsClient();
		clearProjectsCache();
	});

	it('should resolve and validate existing numeric ID', async () => {
		const result = await validateProjectId('123', client);
		expect(result).toBe('N1r8Do');
	});

	it('should resolve and validate existing internal ID', async () => {
		const result = await validateProjectId('N1r8Do', client);
		expect(result).toBe('N1r8Do');
	});

	it('should throw error for non-existent numeric ID', async () => {
		expect(async () => {
			await validateProjectId('999', client);
		}).toThrow();
	});

	it('should throw error for non-existent internal ID', async () => {
		expect(async () => {
			await validateProjectId('Invalid', client);
		}).toThrow();
	});

	it('should skip validation when validate is false', async () => {
		// Should not throw even for invalid ID
		const result = await validateProjectId('999', client, { validate: false });
		expect(result).toBe('999');
	});

	it('should throw descriptive error message', async () => {
		try {
			await validateProjectId('999', client);
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toContain('999');
			expect((error as Error).message).toContain('databasin projects list');
		}
	});
});

describe('integration tests', () => {
	let client: ProjectsClient;

	beforeEach(() => {
		client = createMockProjectsClient();
		clearProjectsCache();
	});

	it('should handle real-world scenario: user passes numeric ID', async () => {
		// User passes "123" instead of "N1r8Do"
		const userInput = '123';

		// Resolve to internal ID
		const internalId = await resolveProjectId(userInput, client);

		// Should get internal ID
		expect(internalId).toBe('N1r8Do');

		// Should be usable in API calls (simulated)
		const project = mockProjects.find((p) => p.internalId === internalId);
		expect(project).toBeDefined();
		expect(project?.id).toBe(123);
	});

	it('should handle real-world scenario: user passes internal ID', async () => {
		// User passes correct internal ID
		const userInput = 'N1r8Do';

		// Resolve (should return as-is)
		const internalId = await resolveProjectId(userInput, client);

		// Should get same ID back
		expect(internalId).toBe('N1r8Do');

		// Should be usable in API calls (simulated)
		const project = mockProjects.find((p) => p.internalId === internalId);
		expect(project).toBeDefined();
		expect(project?.id).toBe(123);
	});

	it('should handle sequential resolutions efficiently with cache', async () => {
		// First resolution
		const id1 = await resolveProjectId('123', client);
		expect(id1).toBe('N1r8Do');

		// Second resolution (should use cache)
		const id2 = await resolveProjectId('456', client);
		expect(id2).toBe('XyZ9Kl');

		// Third resolution (should use cache)
		const id3 = await resolveProjectId('789', client);
		expect(id3).toBe('AbC3Fg');

		// Should only call API once (all three resolutions use same cached projects list)
		expect(client.list).toHaveBeenCalledTimes(1);
	});
});
