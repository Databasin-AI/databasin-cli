/**
 * Pipelines Client for Databasin CLI
 *
 * Provides full CRUD operations for pipeline management with automatic
 * authentication, validation, and error handling.
 *
 * CRITICAL: The list() endpoint REQUIRES projectId parameter (maps to internalID)
 * or returns 400 Bad Request. All list operations must validate this parameter.
 *
 * Based on:
 * - Base client pattern: src/cli/src/client/base.ts
 * - API types: src/cli/src/types/api.ts
 * - Plugin skills: .claude-plugin/plugins/databasin/skills/databasin-pipelines/
 *
 * @module client/pipelines
 */

import { DatabasinClient } from './base.ts';
import type { RequestOptions, TokenEfficiencyOptions } from './base.ts';
import type { Pipeline, PipelineArtifact, Connector, JobDetails } from '../types/api.ts';
import { ValidationError, ApiError } from '../utils/errors.ts';
import { getArtifactTypeFromConnectorSubType, ConnectorArtifactType } from './connector-types.ts';
import { parseBool, parseIntSafe, ensureString } from '../utils/type-coercion.ts';
import { logger } from '../utils/debug.ts';

/**
 * Pipeline list options
 *
 * Extends standard request and token efficiency options with
 * pipeline-specific filters and parameters.
 */
export interface PipelineListOptions extends RequestOptions, TokenEfficiencyOptions {
	/** Filter by pipeline status */
	status?: 'active' | 'inactive' | 'running' | 'error' | 'pending';

	/** Filter by enabled/disabled state */
	enabled?: boolean;

	/** Filter by source connector ID */
	sourceConnectorId?: string;

	/** Filter by target connector ID */
	targetConnectorId?: string;

	/** Include artifact details in response */
	includeArtifacts?: boolean;
}

/**
 * Pipeline run response
 *
 * Result of executing a pipeline via the run endpoint.
 */
export interface PipelineRunResponse {
	/** Execution status */
	status: string;

	/** Job identifier for tracking execution (if available) */
	jobId?: string;

	/** Execution message or details */
	message?: string;
}

/**
 * Pipeline Create/Update Data
 *
 * Data structure for creating new pipelines or updating existing ones.
 * Field names match the API's expected format (PascalCase IDs, not camelCase).
 *
 * All fields except pipelineName are optional to support partial updates,
 * but create operations require additional fields for validation.
 */
export interface PipelineData {
	/** Pipeline name (required for create) */
	pipelineName?: string;

	/** Source connector ID (required for create) */
	sourceConnectorID?: string;

	/** Target connector ID (required for create) */
	targetConnectorID?: string;

	/** Institution ID (required for create) */
	institutionID?: number;

	/** Project internal ID (required for create) */
	internalID?: string;

	/** Owner user ID (required for create) */
	ownerID?: number;

	/** Private pipeline flag (0=public, 1=private) */
	isPrivate?: number;

	/** Ingestion pattern (auto-detected if not provided) */
	ingestionPattern?: string;

	/** Source naming convention flag */
	sourceNamingConvention?: boolean;

	/** Create catalogs flag */
	createCatalogs?: boolean;

	/** Target catalog name (required for data warehouse mode) */
	targetCatalogName?: string;

	/** Target schema name (required for datalake mode) */
	targetSchemaName?: string;

	/** Source catalog/database name (for lakehouse connectors) */
	sourceCatalog?: string;

	/** Source schema name */
	sourceSchema?: string;

	/** Job execution details */
	jobDetails?: Partial<JobDetails>;

	/** Array of artifact items to include in the pipeline */
	items?: any[];

	/** Additional fields from base Pipeline type */
	[key: string]: any;
}

/**
 * Pipelines API Client
 *
 * Manages all pipeline-related operations in Databasin.
 * Provides type-safe methods for creating, reading, updating,
 * deleting, and executing pipelines.
 *
 * @example Basic usage
 * ```typescript
 * const client = new PipelinesClient();
 *
 * // List all pipelines in a project (projectId REQUIRED)
 * const pipelines = await client.list('N1r8Do');
 *
 * // Get specific pipeline
 * const pipeline = await client.get('123');
 *
 * // Create new pipeline
 * const newPipeline = await client.create({
 *   pipelineName: 'My Pipeline',
 *   sourceConnectorId: 'src123',
 *   targetConnectorId: 'tgt456'
 * });
 *
 * // Run a pipeline
 * const result = await client.run('123');
 * console.log(`Pipeline running with job ID: ${result.jobId}`);
 * ```
 *
 * @example With token efficiency
 * ```typescript
 * const client = new PipelinesClient();
 *
 * // Get count only
 * const { count } = await client.list('N1r8Do', { count: true });
 * console.log(`Total pipelines: ${count}`);
 *
 * // Get specific fields only
 * const pipelines = await client.list('N1r8Do', {
 *   fields: 'pipelineID,pipelineName,status'
 * });
 *
 * // Limit results
 * const recent = await client.list('N1r8Do', { limit: 10 });
 * ```
 *
 * @example With filtering
 * ```typescript
 * const client = new PipelinesClient();
 *
 * // Active pipelines only
 * const active = await client.list('N1r8Do', { status: 'active' });
 *
 * // Enabled pipelines only
 * const enabled = await client.list('N1r8Do', { enabled: true });
 *
 * // Pipelines from specific source
 * const sourcePipelines = await client.list('N1r8Do', {
 *   sourceConnectorId: 'src123'
 * });
 * ```
 */
export class PipelinesClient extends DatabasinClient {
	/**
	 * In-memory connector cache (cleared per operation)
	 *
	 * Prevents duplicate API calls for the same connector within a single operation.
	 * The cache is explicitly cleared at the start and end of each create/update operation
	 * to ensure fresh data for each pipeline operation.
	 *
	 * @private
	 */
	private connectorCache: Map<string, Connector> = new Map();

	/**
	 * List all pipelines in a project
	 *
	 * CRITICAL: This endpoint REQUIRES the projectId parameter.
	 * Throws ValidationError if projectId is missing or empty.
	 *
	 * The projectId maps to the internalID query parameter in the API.
	 * Without this parameter, the API returns 400 Bad Request.
	 *
	 * @param projectId - Project internal ID (required, e.g., "N1r8Do")
	 * @param options - Optional filters and token efficiency settings
	 * @returns Array of pipelines or count object if count option used
	 * @throws {ValidationError} If projectId is missing or empty
	 * @throws {ApiError} For HTTP errors (4xx, 5xx)
	 *
	 * @example
	 * ```typescript
	 * // List all pipelines in project
	 * const pipelines = await client.list('N1r8Do');
	 *
	 * // Get count only
	 * const { count } = await client.list('N1r8Do', { count: true });
	 *
	 * // Filter by status
	 * const active = await client.list('N1r8Do', { status: 'active' });
	 *
	 * // Limit and fields
	 * const recent = await client.list('N1r8Do', {
	 *   limit: 5,
	 *   fields: 'pipelineID,pipelineName,status'
	 * });
	 * ```
	 */
	async list(
		projectId: string,
		options?: PipelineListOptions
	): Promise<Pipeline[] | { count: number }> {
		// CRITICAL VALIDATION: projectId is required for this endpoint
		if (!projectId || projectId.trim().length === 0) {
			throw new ValidationError('projectId is required for listing pipelines', 'projectId', [
				'The API endpoint /api/pipeline requires internalID parameter',
				'Provide a valid project internal ID (e.g., "N1r8Do")'
			]);
		}

		// Fetch all projects to find the requested one
		const projects = await this.get<any[]>('/api/my/projects');
		const project = projects.find(
			(p) => String(p.id) === projectId.trim() || p.internalId === projectId.trim()
		);

		if (!project) {
			throw new ValidationError(`Project not found: ${projectId}`, 'projectId', [
				'The specified project does not exist or you do not have access to it',
				'Run "databasin projects list" to see available projects'
			]);
		}

		if (!project.institutionId) {
			throw new ValidationError('Project is missing institutionID', 'institutionId', [
				'The project does not have a valid institution ID'
			]);
		}

		// Fetch current user to get ownerID
		const user = await this.get<any>('/api/my/account');
		if (!user.id) {
			throw new ValidationError('User account is missing ID', 'userId', [
				'Cannot determine current user ID'
			]);
		}

		// Build query parameters (API requires ALL THREE)
		// CRITICAL: Use project.internalId (NOT the projectId parameter which could be numeric)
		const params: Record<string, string | number | boolean> = {
			internalID: project.internalId,
			institutionID: project.institutionId,
			ownerID: user.id
		};

		// Add optional filters to params
		if (options?.status) {
			params.status = options.status;
		}
		if (options?.enabled !== undefined) {
			params.enabled = options.enabled;
		}
		if (options?.sourceConnectorId) {
			params.sourceConnectorId = options.sourceConnectorId;
		}
		if (options?.targetConnectorId) {
			params.targetConnectorId = options.targetConnectorId;
		}
		if (options?.includeArtifacts !== undefined) {
			params.includeArtifacts = options.includeArtifacts;
		}

		// Merge params into options
		const requestOptions = {
			...options,
			params
		};

		return await this.get('/api/pipeline', requestOptions);
	}

	/**
	 * Get a specific pipeline by ID
	 *
	 * Retrieves full pipeline details including configuration and artifacts.
	 *
	 * **Note:** Uses `/api/pipeline/v2/:id` endpoint as `/api/pipeline/:id` doesn't exist.
	 *
	 * @param id - Pipeline ID (pipelineID)
	 * @param options - Optional request options
	 * @returns Pipeline object
	 * @throws {ApiError} For HTTP errors (404 if not found, 403 if no access)
	 *
	 * @example
	 * ```typescript
	 * const pipeline = await client.getById('123');
	 * console.log(`Pipeline: ${pipeline.pipelineName}`);
	 * console.log(`Status: ${pipeline.status}`);
	 * console.log(`Artifacts: ${pipeline.artifacts?.length || 0}`);
	 * ```
	 */
	async getById(id: string, options?: RequestOptions): Promise<Pipeline> {
		// Use /v2 endpoint - /api/pipeline/:id doesn't exist in backend
		return await this.get(`/api/pipeline/v2/${id}`, options);
	}

	/**
	 * Create a new pipeline with smart defaults and payload enrichment
	 *
	 * Creates a pipeline with automatic enrichment of all required fields.
	 * The CLI now provides the same intelligent defaults as the frontend wizard,
	 * allowing users to provide minimal configuration and have the rest auto-filled.
	 *
	 * Minimal required fields:
	 * - pipelineName: Pipeline name
	 * - sourceConnectorID: Source connector ID
	 * - targetConnectorID: Target connector ID
	 * - institutionID: Organization ID
	 * - internalID: Project internal ID
	 * - ownerID: User ID
	 *
	 * Optional fields (auto-enriched with smart defaults):
	 * - items: Artifacts (auto-enriched with type coercion and defaults)
	 * - jobDetails: Job configuration (auto-filled with defaults)
	 * - ingestionPattern: Auto-detected based on target connector type
	 * - targetCatalogName: Required for data warehouse mode (auto-detected)
	 * - targetSchemaName: Required for datalake mode (auto-detected)
	 * - sourceNamingConvention: Auto-set based on ingestion pattern
	 * - createCatalogs: Auto-set based on target connector type
	 *
	 * @param data - Pipeline configuration (minimal or complete)
	 * @param options - Request options
	 * @returns Created pipeline object with ID
	 * @throws {ValidationError} For missing required fields or invalid configuration
	 * @throws {ApiError} For HTTP errors (400 for validation, 500 for server errors)
	 *
	 * @example Minimal configuration
	 * ```typescript
	 * const pipeline = await client.create({
	 *   pipelineName: 'MySQL to Snowflake',
	 *   sourceConnectorID: '123',
	 *   targetConnectorID: '456',
	 *   institutionID: 1,
	 *   internalID: 'proj-abc',
	 *   ownerID: 42,
	 *   targetCatalogName: 'analytics'  // Required for data warehouse
	 * });
	 * ```
	 *
	 * @example With artifacts
	 * ```typescript
	 * const pipeline = await client.create({
	 *   pipelineName: 'MySQL to Snowflake',
	 *   sourceConnectorID: '123',
	 *   targetConnectorID: '456',
	 *   institutionID: 1,
	 *   internalID: 'proj-abc',
	 *   ownerID: 42,
	 *   targetCatalogName: 'analytics',
	 *   items: [
	 *     {
	 *       sourceDatabaseName: 'mydb',
	 *       sourceTableName: 'users',
	 *       targetDatabaseName: 'analytics',
	 *       targetSchemaName: 'public'
	 *     }
	 *   ]
	 * });
	 * ```
	 */
	async create(data: PipelineData, options?: RequestOptions): Promise<Pipeline> {
		// Validate minimum required fields
		if (!data.pipelineName || data.pipelineName.trim().length === 0) {
			throw new ValidationError('Pipeline name is required', 'pipelineName', [
				'Provide a non-empty pipelineName field'
			]);
		}

		if (!data.sourceConnectorID) {
			throw new ValidationError('Source connector ID is required', 'sourceConnectorID', [
				'Provide a valid sourceConnectorID'
			]);
		}

		if (!data.targetConnectorID) {
			throw new ValidationError('Target connector ID is required', 'targetConnectorID', [
				'Provide a valid targetConnectorID'
			]);
		}

		if (!data.institutionID) {
			throw new ValidationError('Institution ID is required', 'institutionID', [
				'Provide institutionID from your organization'
			]);
		}

		if (!data.internalID) {
			throw new ValidationError('Project internal ID is required', 'internalID', [
				'Provide internalID for the target project'
			]);
		}

		if (data.ownerID === undefined || data.ownerID === null) {
			throw new ValidationError('Owner ID is required', 'ownerID', [
				'Provide ownerID for pipeline ownership'
			]);
		}

		// Enrich payload with smart defaults
		const enrichedPayload = await this.enrichPipelinePayload(data);

		// Submit to API
		return await this.post<Pipeline>('/api/pipeline', enrichedPayload, options);
	}

	/**
	 * Update an existing pipeline
	 *
	 * Updates pipeline properties. Only provided fields are modified.
	 * Supports partial updates - omitted fields remain unchanged.
	 *
	 * @param id - Pipeline ID to update
	 * @param data - Pipeline data to update (partial)
	 * @param options - Optional request options
	 * @returns Updated pipeline object
	 * @throws {ApiError} For HTTP errors (404 if not found, 400 for validation)
	 *
	 * @example
	 * ```typescript
	 * // Update pipeline name and status
	 * const updated = await client.update('123', {
	 *   pipelineName: 'MySQL to Snowflake (Production)',
	 *   enabled: true
	 * });
	 *
	 * // Update configuration only
	 * const configured = await client.update('123', {
	 *   configuration: {
	 *     schedule: '0 3 * * *', // Change to 3 AM
	 *     batchSize: 5000
	 *   }
	 * });
	 * ```
	 */
	async update(id: string, data: PipelineData, options?: RequestOptions): Promise<Pipeline> {
		return await this.put<Pipeline>(`/api/pipeline/${id}`, data, options);
	}

	/**
	 * Delete a pipeline
	 *
	 * Permanently deletes a pipeline. This action cannot be undone.
	 * Associated artifacts and automation configurations may also be removed.
	 *
	 * @param id - Pipeline ID to delete
	 * @param options - Optional request options
	 * @returns Void (no response body on success)
	 * @throws {ApiError} For HTTP errors (404 if not found, 403 if no permission)
	 *
	 * @example
	 * ```typescript
	 * await client.deleteById('123');
	 * console.log('Pipeline deleted successfully');
	 * ```
	 */
	async deleteById(id: string, options?: RequestOptions): Promise<void> {
		await this.delete(`/api/pipeline/${id}`, options);
	}

	/**
	 * Execute a pipeline
	 *
	 * Triggers immediate execution of a pipeline.
	 * Returns execution status and job ID for tracking.
	 *
	 * The pipeline must be enabled and properly configured.
	 * Check the returned jobId to monitor execution progress.
	 *
	 * @param id - Pipeline ID to execute
	 * @param options - Optional request options
	 * @returns Execution result with status and job ID
	 * @throws {ApiError} For HTTP errors (404 if not found, 400 if invalid state)
	 *
	 * @example
	 * ```typescript
	 * const result = await client.run('123');
	 *
	 * if (result.status === 'running') {
	 *   console.log(`Pipeline started with job ID: ${result.jobId}`);
	 * } else {
	 *   console.log(`Pipeline status: ${result.status}`);
	 * }
	 * ```
	 *
	 * @example Error handling
	 * ```typescript
	 * try {
	 *   const result = await client.run('123');
	 *   console.log('Pipeline execution started');
	 * } catch (error) {
	 *   if (error instanceof ApiError && error.statusCode === 400) {
	 *     console.error('Pipeline cannot run - check configuration and status');
	 *   } else {
	 *     throw error;
	 *   }
	 * }
	 * ```
	 */
	async run(id: string, options?: RequestOptions): Promise<PipelineRunResponse> {
		// Fetch pipeline details to get required parameters
		const pipeline = await this.getById(id);
		if (!pipeline.institutionID) {
			throw new ValidationError('Pipeline is missing institutionID', 'institutionID', [
				'The pipeline does not have a valid institution ID'
			]);
		}
		if (!pipeline.internalID) {
			throw new ValidationError('Pipeline is missing internalID', 'internalID', [
				'The pipeline does not have a valid project ID'
			]);
		}
		if (!pipeline.ownerID) {
			throw new ValidationError('Pipeline is missing ownerID', 'ownerID', [
				'The pipeline does not have a valid owner ID'
			]);
		}

		// Build request body with required parameters
		const body = {
			pipelineID: Number(id),
			institutionID: pipeline.institutionID,
			internalID: pipeline.internalID,
			ownerID: pipeline.ownerID,
			jobName: pipeline.pipelineName || `Pipeline_${id}`,
			runType: 'manual'
		};

		return await this.post<PipelineRunResponse>('/api/pipeline/run', body, options);
	}

	/**
	 * Add an artifact to a pipeline
	 *
	 * Adds a new artifact (table or file) to a pipeline configuration.
	 * Artifacts define data sources or destinations for the pipeline.
	 *
	 * @param pipelineId - Pipeline ID to add artifact to
	 * @param artifactData - Artifact configuration (type, config)
	 * @param options - Optional request options
	 * @returns Created artifact object with ID
	 * @throws {ApiError} For HTTP errors (404 if pipeline not found, 400 for validation)
	 *
	 * @example
	 * ```typescript
	 * const artifact = await client.addArtifact('123', {
	 *   type: 'table',
	 *   config: {
	 *     tableName: 'customers',
	 *     schema: 'public',
	 *     mode: 'append'
	 *   }
	 * });
	 *
	 * console.log(`Created artifact ${artifact.id}`);
	 * ```
	 */
	async addArtifact(
		pipelineId: string,
		artifactData: Partial<PipelineArtifact>,
		options?: RequestOptions
	): Promise<PipelineArtifact> {
		return await this.post<PipelineArtifact>(
			`/api/pipeline/${pipelineId}/artifacts`,
			artifactData,
			options
		);
	}

	/**
	 * Remove an artifact from a pipeline
	 *
	 * Removes an artifact from a pipeline configuration.
	 * This does not delete the underlying data, only the artifact reference.
	 *
	 * @param pipelineId - Pipeline ID containing the artifact
	 * @param artifactId - Artifact ID to remove
	 * @param options - Optional request options
	 * @returns Void (no response body on success)
	 * @throws {ApiError} For HTTP errors (404 if not found, 403 if no permission)
	 *
	 * @example
	 * ```typescript
	 * await client.removeArtifact('123', 'artifact-456');
	 * console.log('Artifact removed successfully');
	 * ```
	 */
	async removeArtifact(
		pipelineId: string,
		artifactId: string,
		options?: RequestOptions
	): Promise<void> {
		await this.delete(`/api/pipeline/${pipelineId}/artifacts/${artifactId}`, options);
	}

	/**
	 * Get connector details with caching
	 *
	 * Fetches connector from API and caches the result to avoid duplicate calls
	 * within the same operation. The cache is cleared at the start/end of each
	 * create/update operation.
	 *
	 * This prevents the inefficiency of calling /api/connector/{id} multiple times
	 * for the same connector when we need different attributes (type, technology, status).
	 *
	 * @param connectorId - Connector ID to fetch
	 * @returns Connector object
	 * @throws {ApiError} If connector fetch fails
	 *
	 * @private
	 * @internal
	 */
	private async getConnector(connectorId: string): Promise<Connector> {
		// Return cached connector if available
		if (this.connectorCache.has(connectorId)) {
			return this.connectorCache.get(connectorId)!;
		}

		// Fetch from API and cache
		const connector = await this.get<Connector>(`/api/connector/${connectorId}`);
		this.connectorCache.set(connectorId, connector);
		return connector;
	}

	/**
	 * Get artifact type ID for a connector
	 *
	 * Fetches connector details and resolves the artifact type ID based on
	 * the connector's subtype. This is required for pipeline creation.
	 *
	 * Uses connector cache to avoid duplicate API calls.
	 *
	 * @param connectorId - Connector ID to lookup
	 * @returns Artifact type ID (1-5, or -1 for unknown)
	 * @throws {ApiError} If connector fetch fails
	 *
	 * @private
	 * @internal
	 */
	private async getArtifactType(connectorId: string): Promise<number> {
		// Fetch connector details (uses cache)
		const connector = await this.getConnector(connectorId);

		// Extract subtype and convert to artifact type ID
		if (!connector.connectorSubType) {
			throw new ValidationError(
				`Connector ${connectorId} is missing connectorSubType field`,
				'connectorSubType',
				['The connector must have a valid connectorSubType to determine artifact type']
			);
		}

		const artifactType = getArtifactTypeFromConnectorSubType(connector.connectorSubType);

		if (artifactType === -1) {
			throw new ValidationError(
				`Unknown connector subtype: ${connector.connectorSubType}`,
				'connectorSubType',
				[
					`Connector subtype "${connector.connectorSubType}" is not recognized`,
					'Supported types: postgres, mysql, snowflake, csv, salesforce, etc.'
				]
			);
		}

		return artifactType;
	}

	/**
	 * Get connector technology array for a connector
	 *
	 * Fetches connector details and returns the technology array required
	 * for pipeline creation. Based on frontend implementation at:
	 * PipelineCreationWizardViewModel.svelte.js:277-280
	 *
	 * Uses connector cache to avoid duplicate API calls.
	 *
	 * @param connectorId - Connector ID to lookup
	 * @returns Array containing connector subtype in lowercase
	 * @throws {ApiError} If connector fetch fails
	 *
	 * @private
	 * @internal
	 */
	private async getConnectorTechnology(connectorId: string): Promise<string[]> {
		// Fetch connector details (uses cache)
		const connector = await this.getConnector(connectorId);

		// Return subtype as array (lowercase)
		if (!connector.connectorSubType) {
			throw new ValidationError(
				`Connector ${connectorId} is missing connectorSubType field`,
				'connectorSubType',
				['The connector must have a valid connectorSubType']
			);
		}

		return [connector.connectorSubType.toLowerCase()];
	}

	/**
	 * Validate that a connector exists and is active
	 *
	 * Checks connector status before using it in pipeline operations.
	 * Throws ValidationError if connector is not found or inactive.
	 *
	 * Uses connector cache to avoid duplicate API calls.
	 *
	 * @param connectorId - Connector ID to validate
	 * @param role - Connector role in pipeline ('source' or 'target')
	 * @throws {ValidationError} If connector not found or inactive
	 * @throws {ApiError} If connector fetch fails
	 *
	 * @private
	 * @internal
	 */
	private async validateConnector(connectorId: string, role: 'source' | 'target'): Promise<void> {
		try {
			// Fetch connector (uses cache)
			const connector = await this.getConnector(connectorId);

			// Check if connector is active
			// API returns either connectorHealthStatus or isActive field
			const statusField = connector.connectorHealthStatus || connector.status;
			const isActiveField = connector.isActive;

			// Validate using either status field or isActive flag
			const isActive = statusField === 'active' || isActiveField === 1;

			if (!isActive) {
				throw new ValidationError(
					`${role} connector is not active (status: ${statusField}, isActive: ${isActiveField})`,
					`${role}ConnectorId`,
					[
						`The ${role} connector must be active to use in a pipeline`,
						`Current status: ${statusField || 'unknown'}`,
						`Please activate the connector before creating a pipeline`
					]
				);
			}
		} catch (error) {
			// Re-throw ValidationError as-is
			if (error instanceof ValidationError) {
				throw error;
			}

			// Convert 404 to ValidationError
			if (error instanceof ApiError && error.statusCode === 404) {
				throw new ValidationError(
					`${role} connector not found: ${connectorId}`,
					`${role}ConnectorId`,
					[
						`The specified ${role} connector does not exist`,
						`Verify the connector ID and try again`
					]
				);
			}

			// Re-throw other errors
			throw error;
		}
	}

	/**
	 * Enriches artifact items with required fields and connector-specific defaults
	 *
	 * Transforms raw artifact items from user input into fully-qualified artifact objects
	 * with all required fields, proper type coercion, and connector-specific defaults.
	 *
	 * Based on frontend implementation:
	 * @see PipelinesApiClient.js:92-158
	 * @see ArtifactWizardViewModelBase.svelte.js:593-607
	 *
	 * Key transformations:
	 * - Adds sourceConnectionID and targetConnectionID
	 * - Sets artifactType based on source connector
	 * - Sets sourceDatabaseName, targetDatabaseName, targetSchemaName on every item
	 * - Coerces boolean fields (autoExplode, detectDeletes, priority, replaceTable, containsHeader)
	 * - Coerces numeric fields (backloadNumDays, snapshotRetentionPeriod, columnHeaderLineNumber)
	 * - Adds CSV/file-specific defaults (delimiter, header settings)
	 *
	 * @param items - Raw artifact items from user
	 * @param sourceConnectorId - Source connector ID
	 * @param targetConnectorId - Target connector ID
	 * @param sourceCatalog - Source database/catalog name (set as sourceDatabaseName on items)
	 * @param targetCatalogName - Target catalog name (set as targetDatabaseName on items)
	 * @param targetSchemaName - Target schema name (set on items)
	 * @returns Enriched artifacts with all required fields
	 *
	 * @private
	 * @internal
	 */
	private async enrichArtifacts(
		items: any[],
		sourceConnectorId: string,
		targetConnectorId: string,
		sourceCatalog?: string,
		targetCatalogName?: string,
		targetSchemaName?: string
	): Promise<any[]> {
		if (!items || items.length === 0) {
			return [];
		}

		// Get artifact type once for all items (uses cache)
		const artifactType = await this.getArtifactType(sourceConnectorId);

		return items.map((item) => {
			// =================================================================
			// FIELD NAME MAPPING: CLI internal names → API expected names
			// =================================================================
			// CLI uses different field names internally for convenience.
			// This mapping transforms them to match the backend PipelinesArtifacts model.
			//
			// Mapping:
			//   sourceObjectName  → sourceTableName
			//   targetObjectName  → targetTableName
			//   sourceSchema      → sourceSchemaName
			//   columns           → sourceColumnNames (string → array)
			//   primaryKeys       → mergeColumns
			//   timestampColumn   → watermarkColumnName (string → array)
			//   incrementalColumn → (removed, watermarkColumnName is used)
			// =================================================================

			// Map sourceObjectName → sourceTableName
			const sourceTableName = item.sourceTableName || item.sourceObjectName;

			// Map targetObjectName → targetTableName
			const targetTableName = item.targetTableName || item.targetObjectName;

			// Map sourceSchema → sourceSchemaName
			const sourceSchemaName = item.sourceSchemaName || item.sourceSchema;

			// Map columns → sourceColumnNames (convert string to array if needed)
			let sourceColumnNames: string[] | null = null;
			if (item.sourceColumnNames) {
				sourceColumnNames = Array.isArray(item.sourceColumnNames)
					? item.sourceColumnNames
					: [item.sourceColumnNames];
			} else if (item.columns) {
				// Convert "*" or comma-separated string to array
				if (item.columns === '*') {
					sourceColumnNames = null; // API interprets null as all columns
				} else if (typeof item.columns === 'string') {
					sourceColumnNames = item.columns.split(',').map((c: string) => c.trim());
				} else {
					sourceColumnNames = item.columns;
				}
			}

			// Map primaryKeys → mergeColumns
			const mergeColumns = item.mergeColumns || item.primaryKeys || null;

			// Map timestampColumn/incrementalColumn → watermarkColumnName (as array)
			let watermarkColumnName: string[] | null = null;
			const watermarkSource = item.watermarkColumnName || item.timestampColumn || item.incrementalColumn;
			if (watermarkSource) {
				if (Array.isArray(watermarkSource)) {
					watermarkColumnName = watermarkSource;
				} else if (typeof watermarkSource === 'string') {
					watermarkColumnName = [watermarkSource];
				}
			}

			// Build enriched artifact with correct API field names
			const enriched: any = {
				// Core required fields with correct API names
				sourceTableName,
				targetTableName,
				sourceSchemaName,
				sourceColumnNames,
				mergeColumns,
				watermarkColumnName,
				ingestionType: item.ingestionType,

				// Connection IDs
				sourceConnectionID: Number(sourceConnectorId),
				targetConnectionID: Number(targetConnectorId),
				artifactType,

				// Boolean fields with proper coercion
				autoExplode: parseBool(item.autoExplode ?? false),
				detectDeletes: parseBool(item.detectDeletes ?? false),
				priority: parseBool(item.priority ?? false),
				replaceTable: parseBool(item.replaceTable ?? false),

				// Numeric fields
				backloadNumDays: parseIntSafe(item.backloadNumDays, 0),
				snapshotRetentionPeriod: parseIntSafe(item.snapshotRetentionPeriod, 3)
			};

			// CSV/File-specific enrichment (artifactType === 3)
			if (artifactType === ConnectorArtifactType.FileAPI || item.sourceFileFormat) {
				// containsHeader handling
				enriched.containsHeader = parseBool(item.containsHeader ?? true);

				// columnHeaderLineNumber handling
				if (item.columnHeaderLineNumber !== undefined && item.columnHeaderLineNumber !== null) {
					enriched.columnHeaderLineNumber = parseIntSafe(item.columnHeaderLineNumber, 1);
				} else {
					// Default based on containsHeader
					enriched.columnHeaderLineNumber = enriched.containsHeader ? 1 : 0;
				}

				// CSV-specific defaults
				if (item.sourceFileFormat === 'csv' || item.sourceFileFormat === 'txt') {
					if (!item.sourceFileDelimiter) {
						enriched.sourceFileDelimiter = ',';
					}
					// Ensure containsHeader default for CSV
					if (item.containsHeader === undefined) {
						enriched.containsHeader = true;
					}
					// Ensure columnHeaderLineNumber is set correctly for CSV
					if (item.columnHeaderLineNumber === undefined || item.columnHeaderLineNumber === null) {
						enriched.columnHeaderLineNumber = enriched.containsHeader ? 1 : 0;
					}
				}

				// File-specific fields
				if (item.sourceFileName) enriched.sourceFileName = item.sourceFileName;
				if (item.sourceFileFormat) enriched.sourceFileFormat = item.sourceFileFormat;
				if (item.sourceFileDelimiter) enriched.sourceFileDelimiter = item.sourceFileDelimiter;
			} else {
				// For non-file sources, use existing logic
				enriched.columnHeaderLineNumber = parseIntSafe(item.columnHeaderLineNumber, 0);
				enriched.containsHeader = parseBool(item.containsHeader ?? false);
			}

			// CRITICAL: Set database/schema names on EVERY item
			// Frontend sets these at ArtifactWizardViewModelBase.svelte.js:604-606:
			//   item.sourceDatabaseName = this.wizardState.selectedCatalog ?? '';
			//   item.targetDatabaseName = this.wizardState.payload.targetCatalogName ?? ...;
			//   item.targetSchemaName = apiResponseItem?.targetSchemaName ?? ...;
			//
			// Priority: use item-level value if provided, otherwise use pipeline-level value
			enriched.sourceDatabaseName = item.sourceDatabaseName || sourceCatalog || '';
			enriched.targetDatabaseName = item.targetDatabaseName || targetCatalogName || '';
			enriched.targetSchemaName = item.targetSchemaName || targetSchemaName || '';

			return enriched;
		});
	}

	/**
	 * Enriches pipeline payload with all required fields and smart defaults
	 *
	 * This is the orchestration method that coordinates all payload enrichment:
	 * - Validates connectors exist and are active
	 * - Auto-detects ingestion pattern based on target connector type
	 * - Enriches job details with defaults
	 * - Enriches artifacts with type coercion and defaults
	 * - Builds complete payload matching frontend wizard exactly
	 *
	 * Matches frontend behavior at:
	 * @see PipelineCreationWizardViewModel.svelte.js:274-291
	 * @see PipelinesApiClient.js:78-167
	 *
	 * CRITICAL: Uses connector cache to prevent duplicate API calls.
	 * Cache is cleared at start and end of operation.
	 *
	 * @param data - Minimal pipeline data from user
	 * @returns Fully enriched payload ready for API submission
	 * @throws {ValidationError} If required fields are missing or invalid
	 *
	 * @private
	 * @internal
	 */
	private async enrichPipelinePayload(data: PipelineData): Promise<any> {
		// Clear connector cache for this operation
		this.connectorCache.clear();

		try {
			// Validate connectors exist and are active (populates cache)
			await this.validateConnector(data.sourceConnectorID!, 'source');
			await this.validateConnector(data.targetConnectorID!, 'target');

			// Get connector metadata (uses cache)
			const connectorTechnology = await this.getConnectorTechnology(data.sourceConnectorID!);

			// Get target connector to determine ingestion pattern defaults (from cache)
			const targetConnector = this.connectorCache.get(data.targetConnectorID!);
			const targetSubType = targetConnector?.connectorSubType?.toLowerCase();

			// Auto-detect ingestion pattern based on target
			// Match frontend logic: databricks, snowflake, lakehouse → datalake mode
			let ingestionPattern = data.ingestionPattern || 'data warehouse';
			let sourceNamingConvention: boolean;
			let createCatalogs: boolean;

			// Auto-detect based on target connector type
			if (
				targetSubType === 'databricks' ||
				targetSubType === 'snowflake' ||
				targetSubType === 'lakehouse'
			) {
				// Default to datalake mode for these targets (unless user overrides)
				if (!data.ingestionPattern) {
					ingestionPattern = 'datalake';
				}
			}

			// Set sourceNamingConvention and createCatalogs based on final ingestion pattern
			if (ingestionPattern === 'datalake') {
				sourceNamingConvention = data.sourceNamingConvention ?? false;
				createCatalogs = data.createCatalogs ?? true;
			} else {
				sourceNamingConvention = data.sourceNamingConvention ?? true;
				createCatalogs = data.createCatalogs ?? false;
			}

			// Validate pattern-specific required fields
			if (ingestionPattern === 'datalake') {
				if (!data.targetSchemaName) {
					throw new ValidationError(
						'targetSchemaName is required for datalake ingestion pattern',
						'targetSchemaName',
						['Provide targetSchemaName when using datalake ingestion mode']
					);
				}
			} else if (ingestionPattern === 'data warehouse') {
				if (!data.targetCatalogName) {
					throw new ValidationError(
						'targetCatalogName is required for data warehouse ingestion pattern',
						'targetCatalogName',
						['Provide targetCatalogName when using data warehouse ingestion mode']
					);
				}
			}

			// Get current user email for job notifications (optional)
			let userEmail: string | undefined;
			try {
				const whoami = (await this.get('/api/my/account')) as any;
				userEmail = whoami?.email;
			} catch {
				// Ignore errors - email is optional
			}

			// Enrich job details with defaults
			const defaultJobDetails = this.getDefaultJobDetails(userEmail);
			const jobDetails = {
				...defaultJobDetails,
				...data.jobDetails,
				// CRITICAL: jobTimeout MUST be a string
				jobTimeout: ensureString(data.jobDetails?.jobTimeout || defaultJobDetails.jobTimeout)
			};

			// Enrich artifacts - passing pipeline-level database/schema values
			// These get set on every item to match frontend behavior
			const enrichedItems = await this.enrichArtifacts(
				data.items || [],
				data.sourceConnectorID!,
				data.targetConnectorID!,
				data.sourceCatalog,          // sourceDatabaseName on items
				data.targetCatalogName,      // targetDatabaseName on items
				data.targetSchemaName        // targetSchemaName on items
			);

			// Build complete payload matching frontend
			// NOTE: sourceConnectorID and targetConnectorID are NOT part of Pipeline model
			// They only exist at the artifact level (sourceConnectionID, targetConnectionID)
			const payload = {
				institutionID: data.institutionID,
				internalID: data.internalID,
				ownerID: data.ownerID,
				pipelineName: data.pipelineName,
				isPrivate: data.isPrivate ?? 0,
				sourceNamingConvention,
				ingestionPattern,
				createCatalogs,
				connectorTechnology,
				targetCatalogName: data.targetCatalogName || '',
				targetSchemaName: data.targetSchemaName || '',
				jobDetails,
				items: enrichedItems
			};

			// DEBUG: Log the actual payload being sent to API
			console.log('\n[DEBUG] Enriched payload being sent to API:');
			console.log(JSON.stringify(payload, null, 2));

			return payload;
		} finally {
			// Always clear cache after operation
			this.connectorCache.clear();
		}
	}

	/**
	 * Get default job details for pipeline creation
	 *
	 * Returns default job configuration matching the frontend wizard defaults.
	 * Based on: PipelineCreationWizardViewModel.svelte.js:175-182
	 *
	 * @param userEmail - Optional user email for notifications
	 * @returns Default job details object
	 *
	 * @private
	 * @internal
	 */
	private getDefaultJobDetails(userEmail?: string): JobDetails {
		return {
			tags: [],
			jobClusterSize: 'S',
			emailNotifications: userEmail ? [userEmail] : [],
			jobRunSchedule: '0 10 * * *', // 10 AM UTC daily
			jobRunTimeZone: 'UTC',
			jobTimeout: '43200' // 12 hours in seconds (MUST be string)
		};
	}
}

/**
 * Create a new Pipelines API client
 *
 * Factory function for creating configured client instances.
 * Recommended over direct constructor usage.
 *
 * @returns Configured PipelinesClient instance
 *
 * @example
 * ```typescript
 * import { createPipelinesClient } from './client/pipelines.ts';
 *
 * const client = createPipelinesClient();
 * const pipelines = await client.list('N1r8Do');
 * ```
 */
export function createPipelinesClient(): PipelinesClient {
	return new PipelinesClient();
}
