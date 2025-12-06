/**
 * Project ID Mapping Utility
 *
 * Handles mapping between numeric project IDs and internal IDs.
 * Users often pass numeric IDs (e.g., "123") instead of internal IDs (e.g., "N1r8Do").
 * This utility transparently maps between them using cached project data.
 *
 * @module utils/project-id-mapper
 *
 * @example
 * ```typescript
 * import { resolveProjectId } from './utils/project-id-mapper';
 *
 * // User passes numeric ID "123"
 * const internalId = await resolveProjectId("123", projectsClient);
 * // Returns "N1r8Do" (the internal ID for project 123)
 *
 * // User passes internal ID "N1r8Do"
 * const internalId = await resolveProjectId("N1r8Do", projectsClient);
 * // Returns "N1r8Do" (already in correct format)
 * ```
 */

import type { ProjectsClient } from '../client/projects.ts';
import type { Project } from '../types/api.ts';
import { configCache } from './config-cache.ts';
import { logger } from './debug.ts';

/**
 * Cache key for projects list
 */
const PROJECTS_CACHE_KEY = 'projects_list';

/**
 * Cache TTL for projects (24 hours)
 */
const PROJECTS_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Check if a string looks like a numeric ID
 *
 * @param id - ID to check
 * @returns true if ID is numeric
 *
 * @example
 * ```typescript
 * isNumericId("123")    // true
 * isNumericId("N1r8Do") // false
 * isNumericId("42")     // true
 * ```
 */
export function isNumericId(id: string): boolean {
	return /^\d+$/.test(id);
}

/**
 * Resolve project ID to internal ID format
 *
 * Accepts either numeric ID or internal ID and returns the internal ID.
 * Uses cached project data when available to minimize API calls.
 *
 * Resolution strategy:
 * 1. If ID is already non-numeric (looks like internal ID), return as-is
 * 2. If ID is numeric, try to resolve from cache
 * 3. If cache miss, fetch fresh project list and resolve
 * 4. If no match found, return original ID (let API handle error)
 *
 * @param id - Project ID (numeric or internal)
 * @param client - ProjectsClient instance
 * @param options - Resolution options
 * @returns Internal project ID
 *
 * @example
 * ```typescript
 * // Numeric ID - resolves to internal ID
 * const id1 = await resolveProjectId("123", client);
 * // Returns "N1r8Do"
 *
 * // Internal ID - returns as-is
 * const id2 = await resolveProjectId("N1r8Do", client);
 * // Returns "N1r8Do"
 *
 * // Force bypass cache
 * const id3 = await resolveProjectId("123", client, { useCache: false });
 * ```
 */
export async function resolveProjectId(
	id: string,
	client: ProjectsClient,
	options: {
		/** Use cache for project lookup (default: true) */
		useCache?: boolean;
	} = {}
): Promise<string> {
	const { useCache = true } = options;

	// If ID doesn't look numeric, assume it's already an internal ID
	if (!isNumericId(id)) {
		logger.debug(`Project ID "${id}" is non-numeric, treating as internal ID`);
		return id;
	}

	logger.debug(`Resolving numeric project ID "${id}" to internal ID`);

	// Try to get projects from cache or fetch fresh
	const projects = await getProjectsList(client, useCache);

	// Find project by numeric ID
	const numericId = parseInt(id, 10);
	const project = projects.find((p) => p.id === numericId);

	if (project && project.internalId) {
		logger.debug(`Resolved numeric ID "${id}" to internal ID "${project.internalId}"`);
		return project.internalId;
	}

	// No match found - return original ID and let API handle it
	logger.debug(`No project found for numeric ID "${id}", returning as-is`);
	return id;
}

/**
 * Batch resolve multiple project IDs
 *
 * Efficiently resolves multiple project IDs in a single operation.
 * Fetches project list once and resolves all IDs against it.
 *
 * @param ids - Array of project IDs to resolve
 * @param client - ProjectsClient instance
 * @param options - Resolution options
 * @returns Array of resolved internal IDs (same order as input)
 *
 * @example
 * ```typescript
 * const ids = ["123", "N1r8Do", "456"];
 * const resolved = await resolveProjectIds(ids, client);
 * // Returns ["N1r8Do", "N1r8Do", "XyZ9Kl"]
 * ```
 */
export async function resolveProjectIds(
	ids: string[],
	client: ProjectsClient,
	options: {
		/** Use cache for project lookup (default: true) */
		useCache?: boolean;
	} = {}
): Promise<string[]> {
	const { useCache = true } = options;

	// Get projects list once
	const projects = await getProjectsList(client, useCache);

	// Create lookup maps for efficiency
	const byNumericId = new Map<number, Project>();
	const byInternalId = new Map<string, Project>();

	for (const project of projects) {
		if (project.id) {
			byNumericId.set(project.id, project);
		}
		if (project.internalId) {
			byInternalId.set(project.internalId, project);
		}
	}

	// Resolve each ID
	return ids.map((id) => {
		// Non-numeric - treat as internal ID
		if (!isNumericId(id)) {
			return id;
		}

		// Numeric - look up project
		const numericId = parseInt(id, 10);
		const project = byNumericId.get(numericId);

		if (project && project.internalId) {
			logger.debug(`Resolved numeric ID "${id}" to internal ID "${project.internalId}"`);
			return project.internalId;
		}

		// No match - return original
		logger.debug(`No project found for numeric ID "${id}", returning as-is`);
		return id;
	});
}

/**
 * Get projects list from cache or API
 *
 * Internal helper that handles cache logic for project list fetching.
 *
 * @param client - ProjectsClient instance
 * @param useCache - Whether to use cache
 * @returns Array of projects
 *
 * @private
 */
async function getProjectsList(client: ProjectsClient, useCache: boolean): Promise<Project[]> {
	if (useCache) {
		// Try cache first
		const cached = await configCache.get<Project[]>(
			PROJECTS_CACHE_KEY,
			async () => {
				logger.debug('Fetching projects list for ID resolution (cache miss)');
				const result = await client.list();
				return Array.isArray(result) ? result : [];
			},
			PROJECTS_CACHE_TTL
		);
		return cached;
	} else {
		// Bypass cache
		logger.debug('Fetching projects list for ID resolution (cache bypassed)');
		const result = await client.list();
		return Array.isArray(result) ? result : [];
	}
}

/**
 * Clear cached projects list
 *
 * Useful when projects have been modified and cache needs refresh.
 *
 * @example
 * ```typescript
 * // After creating a new project
 * await client.createProject(...);
 * clearProjectsCache(); // Force cache refresh on next lookup
 * ```
 */
export function clearProjectsCache(): void {
	configCache.delete(PROJECTS_CACHE_KEY);
	logger.debug('Cleared projects cache');
}

/**
 * Validate and resolve project ID with helpful error messages
 *
 * Higher-level function that resolves project ID and validates it exists.
 * Throws descriptive errors if project not found.
 *
 * @param id - Project ID (numeric or internal)
 * @param client - ProjectsClient instance
 * @param options - Resolution options
 * @returns Validated internal project ID
 * @throws {Error} If project not found
 *
 * @example
 * ```typescript
 * try {
 *   const projectId = await validateProjectId("123", client);
 *   // Use projectId...
 * } catch (error) {
 *   console.error("Project not found:", error.message);
 * }
 * ```
 */
export async function validateProjectId(
	id: string,
	client: ProjectsClient,
	options: {
		/** Use cache for project lookup (default: true) */
		useCache?: boolean;
		/** Validate project exists (default: true) */
		validate?: boolean;
	} = {}
): Promise<string> {
	const { useCache = true, validate = true } = options;

	const resolvedId = await resolveProjectId(id, client, { useCache });

	// If validation requested, verify project exists
	if (validate) {
		const projects = await getProjectsList(client, useCache);
		const numericId = isNumericId(id) ? parseInt(id, 10) : null;

		const exists = projects.some(
			(p) =>
				p.internalId === resolvedId ||
				(numericId !== null && p.id === numericId) ||
				p.internalId === id
		);

		if (!exists) {
			const idType = isNumericId(id) ? 'numeric ID' : 'internal ID';
			throw new Error(
				`Project not found: ${id} (${idType}). Run 'databasin projects list' to see available projects.`
			);
		}
	}

	return resolvedId;
}
