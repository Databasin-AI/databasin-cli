/**
 * Projects API Client for DataBasin CLI
 *
 * Provides comprehensive access to project-related endpoints including:
 * - Project listing and details
 * - Organization management
 * - User account information
 * - Project user membership
 * - Project statistics
 *
 * All methods extend DataBasinClient with automatic authentication,
 * error handling, and token efficiency support.
 *
 * @module client/projects
 */

import { DataBasinClient, TokenEfficiencyOptions, RequestOptions } from './base.ts';
import type { Project, Organization, User, ProjectStats } from '../types/api.ts';

/**
 * Projects API Client
 *
 * Handles all project-related operations for DataBasin CLI.
 * Extends base client with project-specific methods for managing
 * projects, organizations, users, and statistics.
 *
 * @example
 * ```typescript
 * const client = new ProjectsClient();
 *
 * // List all accessible projects
 * const projects = await client.list();
 *
 * // Get specific project details
 * const project = await client.get('N1r8Do');
 *
 * // Get current user info
 * const user = await client.getCurrentUser();
 * ```
 */
export class ProjectsClient extends DataBasinClient {
	/**
	 * List all accessible projects
	 *
	 * Returns all projects the current user has access to.
	 * Supports full token efficiency features to reduce payload size.
	 *
	 * @param options - Token efficiency and request options
	 * @returns Array of projects (or count/filtered based on options)
	 *
	 * @example
	 * ```typescript
	 * // Get all projects
	 * const projects = await client.list();
	 *
	 * // Count only
	 * const count = await client.list({ count: true });
	 * // Returns: { count: 42 }
	 *
	 * // Limited results
	 * const recent = await client.list({ limit: 5 });
	 *
	 * // Specific fields only
	 * const names = await client.list({
	 *   fields: 'id,name,internalID,organizationName'
	 * });
	 *
	 * // Combined options
	 * const topFive = await client.list({
	 *   fields: 'id,name',
	 *   limit: 5
	 * });
	 * ```
	 */
	async list(
		options?: TokenEfficiencyOptions & RequestOptions
	): Promise<Project[] | { count: number }> {
		return await this.get('/api/my/projects', options);
	}

	/**
	 * Get specific project details
	 *
	 * Retrieves full details for a single project by ID or internal ID.
	 *
	 * @param id - Project ID (numeric) or internal ID (e.g., "N1r8Do")
	 * @param options - Request options
	 * @returns Project details
	 *
	 * @example
	 * ```typescript
	 * // By internal ID
	 * const project = await client.getById('N1r8Do');
	 *
	 * // By numeric ID
	 * const project = await client.getById('123');
	 *
	 * // With debug logging
	 * const project = await client.getById('N1r8Do', { debug: true });
	 * ```
	 */
	async getById(id: string, options?: RequestOptions): Promise<Project> {
		return await this.get(`/api/project/${id}`, options);
	}

	/**
	 * List all accessible organizations
	 *
	 * Returns all organizations the current user has access to.
	 * Organizations are top-level containers that hold projects.
	 *
	 * @param options - Token efficiency and request options
	 * @returns Array of organizations (or count/filtered based on options)
	 *
	 * @example
	 * ```typescript
	 * // Get all organizations
	 * const orgs = await client.listOrganizations();
	 *
	 * // Count only
	 * const count = await client.listOrganizations({ count: true });
	 *
	 * // Specific fields
	 * const orgNames = await client.listOrganizations({
	 *   fields: 'id,name,shortName'
	 * });
	 * ```
	 */
	async listOrganizations(
		options?: TokenEfficiencyOptions & RequestOptions
	): Promise<Organization[] | { count: number }> {
		return await this.get('/api/my/organizations', options);
	}

	/**
	 * Get current user profile
	 *
	 * Retrieves the authenticated user's account information including:
	 * - Basic profile (name, email)
	 * - Organization memberships and roles
	 * - Project memberships and roles
	 *
	 * @param options - Request options
	 * @returns Current user profile
	 *
	 * @example
	 * ```typescript
	 * const user = await client.getCurrentUser();
	 * console.log(`Logged in as: ${user.firstName} ${user.lastName}`);
	 * console.log(`Email: ${user.email}`);
	 * console.log(`Organizations: ${user.organizationMemberships?.length || 0}`);
	 * console.log(`Projects: ${user.projectMemberships?.length || 0}`);
	 * ```
	 */
	async getCurrentUser(options?: RequestOptions): Promise<User> {
		return await this.get('/api/my/account', options);
	}

	/**
	 * Get all users in a project
	 *
	 * Returns list of all users who have access to the specified project.
	 * Includes their roles and permissions within the project.
	 *
	 * @param projectId - Project ID (numeric) or internal ID
	 * @param options - Token efficiency and request options
	 * @returns Array of users (or count/filtered based on options)
	 *
	 * @example
	 * ```typescript
	 * // Get all project users
	 * const users = await client.getProjectUsers('N1r8Do');
	 *
	 * // Count only
	 * const userCount = await client.getProjectUsers('N1r8Do', {
	 *   count: true
	 * });
	 *
	 * // Specific fields
	 * const userEmails = await client.getProjectUsers('N1r8Do', {
	 *   fields: 'id,email,firstName,lastName'
	 * });
	 * ```
	 */
	async getProjectUsers(
		projectId: string,
		options?: TokenEfficiencyOptions & RequestOptions
	): Promise<User[] | { count: number }> {
		return await this.get(`/api/project/${projectId}/users`, options);
	}

	/**
	 * Get project statistics
	 *
	 * Retrieves aggregated statistics for a project including counts of:
	 * - Connectors
	 * - Pipelines
	 * - Automations
	 * - Other metrics
	 *
	 * @param projectId - Project ID (numeric) or internal ID
	 * @param options - Request options
	 * @returns Project statistics object
	 *
	 * @example
	 * ```typescript
	 * const stats = await client.getProjectStats('N1r8Do');
	 * console.log(`Connectors: ${stats.connectorCount || 0}`);
	 * console.log(`Pipelines: ${stats.pipelineCount || 0}`);
	 * console.log(`Automations: ${stats.automationCount || 0}`);
	 * ```
	 */
	async getProjectStats(projectId: string, options?: RequestOptions): Promise<ProjectStats> {
		return await this.get(`/api/project/${projectId}/stats`, options);
	}
}

/**
 * Create a new Projects API client instance
 *
 * Factory function for creating configured client instances.
 * Recommended over direct constructor usage for consistency with base client pattern.
 *
 * @returns Configured ProjectsClient instance
 *
 * @example
 * ```typescript
 * const client = createProjectsClient();
 * const projects = await client.list();
 * ```
 */
export function createProjectsClient(): ProjectsClient {
	return new ProjectsClient();
}
