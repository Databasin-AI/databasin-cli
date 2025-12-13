/**
 * Databasin CLI - Usage Metrics Client
 *
 * Client for interacting with usage metrics endpoints.
 * Provides methods to fetch usage statistics for users, projects, and institutions.
 *
 * @module client/usage-metrics
 */

import { DatabasinClient } from './base.ts';
import type { UsageSummary } from '../types/api.ts';

/**
 * Usage Metrics API Client
 *
 * Provides methods for retrieving usage metrics data.
 * Handles authentication and request formatting automatically.
 */
export class UsageMetricsClient extends DatabasinClient {
	/**
	 * Get current user's usage summary
	 *
	 * @returns Usage summary for authenticated user
	 * @throws {ApiError} If request fails or user is unauthorized
	 *
	 * @example
	 * const client = createUsageMetricsClient();
	 * const myUsage = await client.getMyUsage();
	 * console.log(`Pipelines run: ${myUsage.pipelinesRun}`);
	 */
	async getMyUsage(): Promise<UsageSummary> {
		return this.get<UsageSummary>('/api/usage-metrics/users/me');
	}

	/**
	 * Get usage summary for a specific user
	 *
	 * @param userId - User ID to fetch usage for
	 * @returns Usage summary for specified user
	 * @throws {ApiError} If request fails or insufficient permissions
	 *
	 * @example
	 * const client = createUsageMetricsClient();
	 * const usage = await client.getUserUsage(123);
	 */
	async getUserUsage(userId: number): Promise<UsageSummary> {
		return this.get<UsageSummary>(`/api/usage-metrics/users/${userId}`);
	}

	/**
	 * Get usage summaries for all users
	 *
	 * @returns Array of usage summaries
	 * @throws {ApiError} If request fails or insufficient permissions
	 *
	 * @example
	 * const client = createUsageMetricsClient();
	 * const allUsage = await client.getAllUserUsage();
	 */
	async getAllUserUsage(): Promise<UsageSummary[]> {
		return this.get<UsageSummary[]>('/api/usage-metrics/users');
	}

	/**
	 * Get usage summary for a specific project
	 *
	 * @param projectId - Project ID to fetch usage for
	 * @returns Usage summary for specified project
	 * @throws {ApiError} If request fails or insufficient permissions
	 *
	 * @example
	 * const client = createUsageMetricsClient();
	 * const usage = await client.getProjectUsage(456);
	 */
	async getProjectUsage(projectId: number): Promise<UsageSummary> {
		return this.get<UsageSummary>(`/api/usage-metrics/projects/${projectId}`);
	}

	/**
	 * Get usage summaries for all projects
	 *
	 * @returns Array of usage summaries
	 * @throws {ApiError} If request fails or insufficient permissions
	 *
	 * @example
	 * const client = createUsageMetricsClient();
	 * const allUsage = await client.getAllProjectUsage();
	 */
	async getAllProjectUsage(): Promise<UsageSummary[]> {
		return this.get<UsageSummary[]>('/api/usage-metrics/projects');
	}

	/**
	 * Get usage summary for a specific institution
	 *
	 * @param institutionId - Institution ID to fetch usage for
	 * @returns Usage summary for specified institution
	 * @throws {ApiError} If request fails or insufficient permissions
	 *
	 * @example
	 * const client = createUsageMetricsClient();
	 * const usage = await client.getInstitutionUsage(789);
	 */
	async getInstitutionUsage(institutionId: number): Promise<UsageSummary> {
		return this.get<UsageSummary>(`/api/usage-metrics/institutions/${institutionId}`);
	}

	/**
	 * Get usage summaries for all institutions
	 *
	 * @returns Array of usage summaries
	 * @throws {ApiError} If request fails or insufficient permissions
	 *
	 * @example
	 * const client = createUsageMetricsClient();
	 * const allUsage = await client.getAllInstitutionUsage();
	 */
	async getAllInstitutionUsage(): Promise<UsageSummary[]> {
		return this.get<UsageSummary[]>('/api/usage-metrics/institutions');
	}
}

/**
 * Factory function to create a new UsageMetricsClient instance
 *
 * @param config - Optional CLI configuration
 * @returns Configured UsageMetricsClient
 *
 * @example
 * const client = createUsageMetricsClient();
 * const myUsage = await client.getMyUsage();
 */
export function createUsageMetricsClient(config?: import('../types/config.ts').CliConfig) {
	return new UsageMetricsClient(config);
}
