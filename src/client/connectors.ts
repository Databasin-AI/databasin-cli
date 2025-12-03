/**
 * Connectors API Client for Databasin CLI
 *
 * Manages data source and destination connections within Databasin.
 * Provides methods for CRUD operations on connectors and fetching
 * system connector configuration.
 *
 * ⚠️ CRITICAL TOKEN WARNING:
 * The /api/connector endpoint can return 200,000+ tokens for all connectors!
 * This client DEFAULTS to count mode for list() operations to prevent
 * massive response payloads. Always use token efficiency options.
 *
 * @module client/connectors
 */

import { DatabasinClient, type TokenEfficiencyOptions, type RequestOptions } from './base.ts';
import type { Connector, SystemConfig } from '../types/api.ts';

/**
 * Extended options for connector listing
 */
export interface ConnectorListOptions extends RequestOptions, TokenEfficiencyOptions {
	/** Project internal ID to filter connectors (e.g., "N1r8Do") */
	projectId?: string;
}

/**
 * Result from testing a connector connection
 */
export interface TestResult {
	/** Whether the connection test succeeded */
	success: boolean;
	/** Human-readable message about the test result */
	message: string;
	/** Additional details about the test (errors, diagnostics, etc.) */
	details?: Record<string, unknown>;
}

/**
 * Connectors API Client
 *
 * Handles all connector-related API operations including:
 * - Listing connectors (with token-efficient defaults)
 * - Getting specific connector details
 * - Creating new connectors
 * - Updating connector configuration
 * - Deleting connectors
 * - Fetching system connector types
 *
 * @example Basic usage
 * ```typescript
 * const client = new ConnectorsClient();
 *
 * // Count connectors (minimal tokens)
 * const count = await client.list();
 * console.log(count); // { count: 434 }
 *
 * // Get connectors for a project
 * const projectConnectors = await client.list('N1r8Do', { count: false, limit: 10 });
 *
 * // Get specific connector
 * const connector = await client.get('conn-123');
 * ```
 *
 * @example Creating a connector
 * ```typescript
 * const newConnector = await client.create({
 *   connectorName: 'My PostgreSQL DB',
 *   connectorType: 'database',
 *   internalID: 'N1r8Do',
 *   configuration: {
 *     host: 'localhost',
 *     port: 5432,
 *     database: 'mydb'
 *   }
 * });
 * ```
 */
export class ConnectorsClient extends DatabasinClient {
	/**
	 * List connectors with token-efficient defaults
	 *
	 * ⚠️ CRITICAL: This endpoint can return 200,000+ tokens for all connectors.
	 * By default, this method returns only a count to prevent token bloat.
	 * Explicitly set count=false to get full data.
	 *
	 * @param projectId - Optional project internal ID to filter connectors (e.g., "N1r8Do")
	 * @param options - Request and token efficiency options
	 * @returns Promise resolving to connector array or count object
	 *
	 * @example Count all connectors (default - minimal tokens)
	 * ```typescript
	 * const result = await client.list();
	 * console.log(result); // { count: 434 }
	 * ```
	 *
	 * @example Count project connectors
	 * ```typescript
	 * const result = await client.list('N1r8Do');
	 * console.log(result); // { count: 12 }
	 * ```
	 *
	 * @example Get limited connector data
	 * ```typescript
	 * const connectors = await client.list('N1r8Do', {
	 *   count: false,
	 *   fields: 'connectorID,connectorName,connectorType,status',
	 *   limit: 20
	 * });
	 * ```
	 *
	 * @example Get full connector data (use sparingly!)
	 * ```typescript
	 * const allConnectors = await client.list('N1r8Do', { count: false });
	 * ```
	 */
	async list(
		projectId?: string,
		options?: ConnectorListOptions
	): Promise<Connector[] | { count: number }> {
		// CRITICAL: Default to count mode to prevent token bloat
		const defaultOptions: ConnectorListOptions = {
			count: true,
			...options
		};

		// Build params with optional project filter
		const params = projectId ? { internalID: projectId } : undefined;

		return await this.get('/api/connector', {
			...defaultOptions,
			params
		});
	}

	/**
	 * Get a specific connector by ID
	 *
	 * Fetches full connector details including configuration.
	 *
	 * @param id - Connector ID (connectorID field)
	 * @returns Promise resolving to connector object
	 *
	 * @example
	 * ```typescript
	 * const connector = await client.getById('conn-123');
	 * console.log(connector.connectorName);
	 * console.log(connector.configuration);
	 * ```
	 */
	async getById(id: string): Promise<Connector> {
		return await this.get(`/api/connector/${id}`);
	}

	/**
	 * Create a new connector
	 *
	 * Creates a new data source or destination connector with the
	 * specified configuration.
	 *
	 * @param data - Partial connector data (connectorName, connectorType, configuration required)
	 * @returns Promise resolving to created connector
	 *
	 * @example Create a database connector
	 * ```typescript
	 * const connector = await client.create({
	 *   connectorName: 'Production DB',
	 *   connectorType: 'database',
	 *   internalID: 'N1r8Do',
	 *   configuration: {
	 *     host: 'prod-db.example.com',
	 *     port: 5432,
	 *     database: 'production',
	 *     username: 'app_user'
	 *   },
	 *   status: 'active'
	 * });
	 * ```
	 *
	 * @example Create an API connector
	 * ```typescript
	 * const connector = await client.create({
	 *   connectorName: 'Salesforce Production',
	 *   connectorType: 'app',
	 *   internalID: 'N1r8Do',
	 *   configuration: {
	 *     instanceUrl: 'https://mycompany.salesforce.com',
	 *     apiVersion: '58.0'
	 *   }
	 * });
	 * ```
	 */
	async create(data: Partial<Connector>): Promise<Connector> {
		return await this.post<Connector>('/api/connector', data);
	}

	/**
	 * Update an existing connector
	 *
	 * Updates connector configuration, status, or other properties.
	 * Only provided fields will be updated (partial update).
	 *
	 * @param id - Connector ID to update
	 * @param data - Partial connector data with fields to update
	 * @returns Promise resolving to updated connector
	 *
	 * @example Update connector name
	 * ```typescript
	 * const updated = await client.update('conn-123', {
	 *   connectorName: 'Updated Name'
	 * });
	 * ```
	 *
	 * @example Update connector configuration
	 * ```typescript
	 * const updated = await client.update('conn-123', {
	 *   configuration: {
	 *     host: 'new-host.example.com',
	 *     port: 5433
	 *   }
	 * });
	 * ```
	 *
	 * @example Change connector status
	 * ```typescript
	 * const updated = await client.update('conn-123', {
	 *   status: 'inactive'
	 * });
	 * ```
	 */
	async update(id: string, data: Partial<Connector>): Promise<Connector> {
		return await this.put<Connector>(`/api/connector/${id}`, data);
	}

	/**
	 * Delete a connector
	 *
	 * Permanently removes a connector. This operation cannot be undone.
	 * Consider setting status to 'inactive' instead for soft deletion.
	 *
	 * @param id - Connector ID to delete
	 * @returns Promise resolving when deletion completes
	 *
	 * @example
	 * ```typescript
	 * await client.deleteById('conn-123');
	 * console.log('Connector deleted');
	 * ```
	 */
	async deleteById(id: string): Promise<void> {
		return await this.delete(`/api/connector/${id}`);
	}

	/**
	 * Test a connector's connection
	 *
	 * Validates that the connector can successfully connect to its
	 * configured data source. This performs an actual connection attempt
	 * using the stored credentials and configuration.
	 *
	 * @param id - Connector ID to test
	 * @returns Promise resolving to test result with success status and details
	 *
	 * @example Test a database connector
	 * ```typescript
	 * const result = await client.test('conn-123');
	 * if (result.success) {
	 *   console.log('Connection successful:', result.message);
	 * } else {
	 *   console.error('Connection failed:', result.message);
	 *   console.error('Details:', result.details);
	 * }
	 * ```
	 *
	 * @example Handle connection errors
	 * ```typescript
	 * try {
	 *   const result = await client.test('conn-123');
	 *   if (!result.success) {
	 *     console.log('Test failed but connector exists');
	 *     if (result.details?.error) {
	 *       console.log('Error:', result.details.error);
	 *     }
	 *   }
	 * } catch (error) {
	 *   console.error('Could not reach connector or API error');
	 * }
	 * ```
	 */
	async test(id: string): Promise<TestResult> {
		return await this.post<TestResult>(`/api/connector/${id}/test`, {});
	}

	/**
	 * Get system connector configuration
	 *
	 * Fetches available connector types and their configuration schemas.
	 * Includes both source and target connector definitions.
	 *
	 * ⚠️ Token Warning: This endpoint returns ~50,000 tokens of configuration data.
	 * Consider using token efficiency options to reduce response size.
	 *
	 * @param options - Optional token efficiency options
	 * @returns Promise resolving to system configuration
	 *
	 * @example Get full config (large response)
	 * ```typescript
	 * const config = await client.getConfig();
	 * console.log(config.sourceConnectors.length);
	 * console.log(config.targetConnectors.length);
	 * ```
	 *
	 * @example Get specific fields only
	 * ```typescript
	 * const config = await client.getConfig({
	 *   fields: 'hostingEnvironment,sourceConnectors,targetConnectors'
	 * });
	 * ```
	 */
	async getConfig(options?: TokenEfficiencyOptions): Promise<SystemConfig> {
		return await this.get('/api/config', options);
	}
}

/**
 * Create a new Connectors API client
 *
 * Factory function for creating connector client instances.
 *
 * @returns Configured ConnectorsClient instance
 *
 * @example
 * ```typescript
 * import { createConnectorsClient } from './client/connectors.ts';
 *
 * const client = createConnectorsClient();
 *
 * // Count connectors
 * const count = await client.list();
 *
 * // Get project connectors
 * const connectors = await client.list('N1r8Do', {
 *   count: false,
 *   fields: 'connectorID,connectorName,status',
 *   limit: 10
 * });
 * ```
 */
export function createConnectorsClient(): ConnectorsClient {
	return new ConnectorsClient();
}
