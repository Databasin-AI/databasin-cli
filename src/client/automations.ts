/**
 * Automations API Client for Databasin CLI
 *
 * Handles all automation-related operations including:
 * - Listing automations with project filtering
 * - Creating, updating, and deleting automations
 * - Triggering manual automation execution
 *
 * Based on Databasin API endpoint specifications:
 * - GET /api/automations - List automations (requires internalID param)
 * - GET /api/automations/{id} - Get specific automation
 * - POST /api/automations - Create new automation
 * - PUT /api/automations/{id} - Update automation
 * - DELETE /api/automations/{id} - Delete automation
 * - POST /api/automations/{id}/run - Trigger automation execution
 *
 * IMPORTANT: The list endpoint requires the internalID parameter.
 * If not provided, a ValidationError will be thrown.
 *
 * @module client/automations
 */

import { DatabasinClient } from './base.ts';
import { ValidationError } from '../utils/errors.ts';
import type { RequestOptions, TokenEfficiencyOptions } from './base.ts';
import type { Automation } from '../types/api.ts';

/**
 * Automation execution response
 *
 * Returned when triggering a manual automation run.
 */
export interface AutomationRunResponse {
	/** Execution status message */
	status: string;

	/** Optional job identifier for tracking execution */
	jobId?: string;

	/** Optional message with additional details */
	message?: string;
}

/**
 * Options for listing automations
 *
 * Extends base request and token efficiency options with automation-specific filters.
 */
export interface ListAutomationsOptions extends RequestOptions, TokenEfficiencyOptions {
	/** Filter by active status */
	active?: boolean;

	/** Filter by currently running status */
	running?: boolean;

	/** Sort field (e.g., 'automationName', 'lastRun') */
	sortBy?: string;

	/** Sort direction */
	sortOrder?: 'asc' | 'desc';
}

/**
 * Automations API Client
 *
 * Provides type-safe interface to Databasin automation endpoints.
 * Handles scheduling, execution, and management of automated jobs.
 *
 * Key features:
 * - Project-scoped automation listing with required validation
 * - Manual execution triggering
 * - Full CRUD operations
 *
 * @example
 * ```typescript
 * const client = new AutomationsClient();
 *
 * // List automations for a project (throws ValidationError if no projectId)
 * const automations = await client.list('N1r8Do');
 *
 * // Get specific automation
 * const automation = await client.get('auto123');
 *
 * // Create new automation
 * const newAutomation = await client.create({
 *   automationName: 'Daily ETL',
 *   jobRunSchedule: '0 2 * * *',
 *   isActive: true
 * });
 *
 * // Trigger manual execution
 * const result = await client.run('auto123');
 * console.log(`Job started: ${result.jobId}`);
 * ```
 *
 * @example With filters and token efficiency
 * ```typescript
 * // Get count of active automations
 * const count = await client.list('N1r8Do', { active: true, count: true });
 * // Returns: { count: 5 }
 *
 * // Get limited fields for UI display
 * const names = await client.list('N1r8Do', {
 *   fields: 'automationID,automationName,isActive,lastRun'
 * });
 * ```
 */
export class AutomationsClient extends DatabasinClient {
	/**
	 * List all automations for a project
	 *
	 * CRITICAL: This endpoint requires the project's internalID parameter.
	 * If projectId is not provided, a ValidationError is thrown.
	 *
	 * @param projectId - Project internal ID (e.g., "N1r8Do") - required
	 * @param options - List options including filters and token efficiency
	 * @returns Array of automations or count object
	 * @throws {ValidationError} If projectId is not provided or is empty
	 *
	 * @example
	 * ```typescript
	 * // List all automations for project
	 * const automations = await client.list('N1r8Do');
	 *
	 * // Filter by active status
	 * const active = await client.list('N1r8Do', { active: true });
	 *
	 * // Get only automation names (token efficiency)
	 * const names = await client.list('N1r8Do', {
	 *   fields: 'automationID,automationName'
	 * });
	 *
	 * // Count total automations
	 * const count = await client.list('N1r8Do', { count: true });
	 * // Returns: { count: 10 }
	 *
	 * // No project specified - throws ValidationError
	 * try {
	 *   const result = await client.list();
	 * } catch (error) {
	 *   // Handles ValidationError
	 * }
	 * ```
	 */
	async list(projectId?: string, options?: ListAutomationsOptions): Promise<Automation[]> {
		// CRITICAL: Project ID is required by the API
		if (!projectId) {
			throw new ValidationError('Project ID is required for listing automations', 'projectId', [
				'The Databasin API requires internalID parameter',
				'Provide a project ID via --project flag'
			]);
		}

		// Build params with project filter and optional additional filters
		const params: Record<string, string | number | boolean> = {
			internalID: projectId
		};

		// Add optional filters
		if (options?.active !== undefined) {
			params.active = options.active;
		}
		if (options?.running !== undefined) {
			params.running = options.running;
		}
		if (options?.sortBy) {
			params.sortBy = options.sortBy;
		}
		if (options?.sortOrder) {
			params.sortOrder = options.sortOrder;
		}

		return super.get<Automation[]>('/api/automations', {
			...options,
			params
		});
	}

	/**
	 * Get a specific automation by ID
	 *
	 * Retrieves full details for a single automation including configuration,
	 * schedule, status, and execution history.
	 *
	 * @param id - Automation ID (automationID field)
	 * @param options - Request options
	 * @returns Automation object with full details
	 * @throws {ApiError} If automation not found (404) or access denied (403)
	 *
	 * @example
	 * ```typescript
	 * const automation = await client.getById('auto123');
	 * console.log(`Name: ${automation.automationName}`);
	 * console.log(`Schedule: ${automation.jobRunSchedule}`);
	 * console.log(`Last run: ${automation.lastRun}`);
	 * console.log(`Next run: ${automation.nextRun}`);
	 * ```
	 */
	async getById(id: string, options?: RequestOptions): Promise<Automation> {
		return this.get(`/api/automations/${id}`, options);
	}

	/**
	 * Create a new automation
	 *
	 * Creates a new scheduled automation job. At minimum, must specify
	 * name and schedule. Can optionally link to pipeline or SQL script.
	 *
	 * @param data - Automation creation data
	 * @param options - Request options
	 * @returns Created automation with generated ID and defaults
	 *
	 * @example
	 * ```typescript
	 * // Create pipeline automation with cron schedule
	 * const automation = await client.create({
	 *   automationName: 'Daily ETL Pipeline',
	 *   pipelineId: 'pipeline123',
	 *   jobRunSchedule: '0 2 * * *', // 2 AM daily
	 *   isActive: true,
	 *   jobClusterSize: 'M',
	 *   jobTimeout: '3600'
	 * });
	 *
	 * // Create SQL script automation
	 * const sqlAuto = await client.create({
	 *   automationName: 'Weekly Report Generation',
	 *   automationTasks: ['sql'],
	 *   jobRunSchedule: '0 8 * * MON', // 8 AM Mondays
	 *   isActive: true,
	 *   isPrivate: false
	 * });
	 * ```
	 */
	async create(data: Partial<Automation>, options?: RequestOptions): Promise<Automation> {
		return super.post<Automation>('/api/automations', data, options);
	}

	/**
	 * Update an existing automation
	 *
	 * Updates automation properties. Can modify schedule, enable/disable,
	 * change configuration, etc. Only provided fields are updated.
	 *
	 * @param id - Automation ID to update
	 * @param data - Partial automation data with fields to update
	 * @param options - Request options
	 * @returns Updated automation object
	 * @throws {ApiError} If automation not found (404) or access denied (403)
	 *
	 * @example
	 * ```typescript
	 * // Disable automation
	 * const updated = await client.update('auto123', {
	 *   isActive: false
	 * });
	 *
	 * // Change schedule to run hourly
	 * await client.update('auto123', {
	 *   jobRunSchedule: '0 * * * *'
	 * });
	 *
	 * // Update multiple properties
	 * await client.update('auto123', {
	 *   automationName: 'Updated ETL Pipeline',
	 *   jobClusterSize: 'L',
	 *   jobTimeout: '7200'
	 * });
	 * ```
	 */
	async update(
		id: string,
		data: Partial<Automation>,
		options?: RequestOptions
	): Promise<Automation> {
		return super.put<Automation>(`/api/automations/${id}`, data, options);
	}

	/**
	 * Delete an automation
	 *
	 * Permanently deletes an automation. This cannot be undone.
	 * If automation is currently running, it will be stopped.
	 *
	 * @param id - Automation ID to delete
	 * @param options - Request options
	 * @returns Promise that resolves when deletion completes
	 * @throws {ApiError} If automation not found (404) or access denied (403)
	 *
	 * @example
	 * ```typescript
	 * // Delete automation
	 * await client.deleteById('auto123');
	 * console.log('Automation deleted successfully');
	 * ```
	 */
	async deleteById(id: string, options?: RequestOptions): Promise<void> {
		return this.delete(`/api/automations/${id}`, options);
	}

	/**
	 * Trigger manual execution of an automation
	 *
	 * Starts an automation run immediately, bypassing the schedule.
	 * Useful for testing, manual data refreshes, or on-demand processing.
	 * The automation does not need to be active to be run manually.
	 *
	 * @param id - Automation ID to execute
	 * @param options - Request options
	 * @returns Execution response with status and optional job ID
	 * @throws {ApiError} If automation not found (404), already running (409), or access denied (403)
	 *
	 * @example
	 * ```typescript
	 * // Trigger automation run
	 * const result = await client.run('auto123');
	 * console.log(`Status: ${result.status}`);
	 *
	 * if (result.jobId) {
	 *   console.log(`Track job at: ${result.jobId}`);
	 * }
	 *
	 * // With error handling
	 * try {
	 *   await client.run('auto123');
	 * } catch (error) {
	 *   if (error.status === 409) {
	 *     console.error('Automation is already running');
	 *   } else {
	 *     throw error;
	 *   }
	 * }
	 * ```
	 */
	async run(id: string, options?: RequestOptions): Promise<AutomationRunResponse> {
		return super.post<AutomationRunResponse>(`/api/automations/${id}/run`, undefined, options);
	}

	/**
	 * Stop a running automation
	 *
	 * Stops an automation that is currently executing. If the automation
	 * is not running, this operation will succeed with a message indicating
	 * the automation was not running.
	 *
	 * @param id - Automation ID to stop
	 * @param options - Request options
	 * @returns Stop response with status message
	 * @throws {ApiError} If automation not found (404) or access denied (403)
	 *
	 * @example
	 * ```typescript
	 * // Stop a running automation
	 * const result = await client.stop('auto123');
	 * console.log(`Status: ${result.status}`);
	 *
	 * // With error handling
	 * try {
	 *   await client.stop('auto123');
	 * } catch (error) {
	 *   if (error.status === 404) {
	 *     console.error('Automation not found');
	 *   } else {
	 *     throw error;
	 *   }
	 * }
	 * ```
	 */
	async stop(id: string, options?: RequestOptions): Promise<AutomationRunResponse> {
		return super.post<AutomationRunResponse>(`/api/automations/${id}/stop`, undefined, options);
	}
}

/**
 * Create a new Automations API client instance
 *
 * Factory function for creating configured client instances.
 * Recommended over direct constructor usage for consistency.
 *
 * @returns Configured AutomationsClient instance
 *
 * @example
 * ```typescript
 * import { createAutomationsClient } from './client/automations.ts';
 *
 * const client = createAutomationsClient();
 * const automations = await client.list('N1r8Do');
 * ```
 */
export function createAutomationsClient(): AutomationsClient {
	return new AutomationsClient();
}
